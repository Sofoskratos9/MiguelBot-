import { isValidProductId, type ProductId } from './_catalog.js';
import {
  createAccessToken,
  parseJsonBody,
  timingSafeEquals,
  verifyAccessToken,
  type ApiRequest,
  type ApiResponse,
} from './_security.js';

const getPayPalBaseUrl = (): string => {
  return (process.env.PAYPAL_SANDBOX || '').trim().toLowerCase() === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
};

const getPayPalAccessToken = async (clientId: string, clientSecret: string): Promise<string> => {
  const auth = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = (await res.json()) as { access_token?: string };
  if (!res.ok || !data.access_token) {
    throw new Error('PayPal auth failed');
  }
  return data.access_token;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<{
    provider?: string;
    productId?: string;
    sessionId?: string;
    orderId?: string;
    accessCode?: string;
    token?: string;
    tokens?: string[];
  }>(req);

  // Batch verify stored tokens on mount
  if (Array.isArray(body.tokens)) {
    const unlockedSet = new Set<ProductId>();
    for (const rawTok of body.tokens.slice(0, 10)) {
      if (typeof rawTok !== 'string') continue;
      const check = verifyAccessToken(rawTok);
      if (check.valid && isValidProductId(check.productId)) {
        unlockedSet.add(check.productId);
      }
    }
    const unlockedProductIds = Array.from(unlockedSet);
    return res.status(200).json({ verified: unlockedProductIds.length > 0, unlockedProductIds });
  }

  if (body.token) {
    const check = verifyAccessToken(body.token);
    if (check.valid) {
      return res.status(200).json({
        verified: true,
        token: body.token,
        productId: isValidProductId(check.productId) ? check.productId : 'reactivos-pack',
      });
    }
    return res.status(401).json({ verified: false, error: 'Token de descarga inválido o expirado.' });
  }

  if (body.provider === 'stripe') {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    const sessionId = (body.sessionId || '').trim();
    if (!stripeKey) {
      return res.status(503).json({ verified: false, error: 'Stripe no está configurado.' });
    }
    if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return res.status(400).json({ verified: false, error: 'ID de sesión de Stripe inválido.' });
    }

    try {
      const response = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        {
          headers: { Authorization: `Bearer ${stripeKey}` },
        }
      );
      const data = (await response.json()) as {
        payment_status?: string;
        metadata?: { product_id?: string };
      };
      if (!response.ok || data.payment_status !== 'paid') {
        return res.status(402).json({
          verified: false,
          error: 'El pago aún no aparece confirmado en Stripe.',
        });
      }

      const paidProductId: ProductId = isValidProductId(data.metadata?.product_id)
        ? data.metadata.product_id
        : isValidProductId(body.productId)
          ? body.productId
          : 'reactivos-pack';

      const token = createAccessToken(`stripe:${sessionId}`, paidProductId);
      if (!token) {
        return res.status(503).json({ verified: false, error: 'Falta DOWNLOAD_TOKEN_SECRET en el servidor.' });
      }
      return res.status(200).json({ verified: true, token, productId: paidProductId });
    } catch {
      return res.status(502).json({ verified: false, error: 'Error al verificar con Stripe.' });
    }
  }

  if (body.provider === 'paypal') {
    const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
    const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
    const orderId = (body.orderId || '').trim();

    if (!clientId || !clientSecret) {
      return res.status(503).json({ verified: false, error: 'PayPal no está configurado.' });
    }
    if (!orderId || !/^[A-Z0-9]{10,36}$/i.test(orderId)) {
      return res.status(400).json({ verified: false, error: 'ID de orden de PayPal inválido.' });
    }

    try {
      const accessToken = await getPayPalAccessToken(clientId, clientSecret);
      const checkRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const checkData = (await checkRes.json()) as {
        status?: string;
        purchase_units?: Array<{ custom_id?: string }>;
      };

      let finalStatus = checkData.status;
      let orderProductId = checkData.purchase_units?.[0]?.custom_id;

      if (checkRes.ok && finalStatus !== 'COMPLETED') {
        const capRes = await fetch(
          `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'PayPal-Request-Id': `cap-${orderId}`,
            },
          }
        );
        const capData = (await capRes.json()) as {
          status?: string;
          purchase_units?: Array<{ custom_id?: string }>;
        };
        finalStatus = capData.status;
        orderProductId = orderProductId || capData.purchase_units?.[0]?.custom_id;
      }

      if (finalStatus !== 'COMPLETED') {
        return res.status(402).json({
          verified: false,
          error: 'El pago aún no aparece completado en PayPal.',
        });
      }

      const paidProductId: ProductId = isValidProductId(orderProductId)
        ? orderProductId
        : isValidProductId(body.productId)
          ? body.productId
          : 'reactivos-pack';

      const token = createAccessToken(`paypal:${orderId}`, paidProductId);
      if (!token) {
        return res.status(503).json({ verified: false, error: 'Falta DOWNLOAD_TOKEN_SECRET en el servidor.' });
      }
      return res.status(200).json({ verified: true, token, productId: paidProductId });
    } catch {
      return res.status(502).json({ verified: false, error: 'Error al verificar el pago con PayPal.' });
    }
  }

  if (body.provider === 'code') {
    const rawCodes = (process.env.KIT_ACCESS_CODES || '').trim();
    const candidate = (body.accessCode || '').trim();
    const requestedProduct: ProductId = isValidProductId(body.productId) ? body.productId : 'reactivos-pack';

    if (!rawCodes) {
      return res.status(503).json({
        verified: false,
        error: 'Los códigos de acceso no están habilitados en este servidor.',
      });
    }
    if (!candidate) {
      return res.status(400).json({ verified: false, error: 'Ingresa un código de acceso válido.' });
    }

    const validCodes = rawCodes
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const matched = validCodes.some((code) => timingSafeEquals(candidate.toUpperCase(), code.toUpperCase()));
    if (!matched) {
      return res.status(403).json({ verified: false, error: 'Código de acceso incorrecto.' });
    }

    const token = createAccessToken('access-code', requestedProduct);
    if (!token) {
      return res.status(503).json({ verified: false, error: 'Falta DOWNLOAD_TOKEN_SECRET en el servidor.' });
    }
    return res.status(200).json({ verified: true, token, productId: requestedProduct });
  }

  return res.status(400).json({ verified: false, error: 'Método de verificación no soportado.' });
}
