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
    sessionId?: string;
    orderId?: string;
    accessCode?: string;
    token?: string;
  }>(req);

  if (body.token) {
    const check = verifyAccessToken(body.token);
    if (check.valid) {
      return res.status(200).json({ verified: true, token: body.token });
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
      const data = (await response.json()) as { payment_status?: string; status?: string };
      if (!response.ok || data.payment_status !== 'paid') {
        return res.status(402).json({
          verified: false,
          error: 'El pago aún no aparece confirmado en Stripe.',
        });
      }

      const token = createAccessToken(`stripe:${sessionId}`);
      if (!token) {
        return res.status(503).json({ verified: false, error: 'Falta DOWNLOAD_TOKEN_SECRET en el servidor.' });
      }
      return res.status(200).json({ verified: true, token });
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
      const checkData = (await checkRes.json()) as { status?: string };

      let finalStatus = checkData.status;
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
        const capData = (await capRes.json()) as { status?: string };
        finalStatus = capData.status;
      }

      if (finalStatus !== 'COMPLETED') {
        return res.status(402).json({
          verified: false,
          error: 'El pago aún no aparece completado en PayPal.',
        });
      }

      const token = createAccessToken(`paypal:${orderId}`);
      if (!token) {
        return res.status(503).json({ verified: false, error: 'Falta DOWNLOAD_TOKEN_SECRET en el servidor.' });
      }
      return res.status(200).json({ verified: true, token });
    } catch {
      return res.status(502).json({ verified: false, error: 'Error al verificar el pago con PayPal.' });
    }
  }

  if (body.provider === 'code') {
    const rawCodes = (process.env.KIT_ACCESS_CODES || '').trim();
    const candidate = (body.accessCode || '').trim();
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

    const token = createAccessToken('access-code');
    if (!token) {
      return res.status(503).json({ verified: false, error: 'Falta DOWNLOAD_TOKEN_SECRET en el servidor.' });
    }
    return res.status(200).json({ verified: true, token });
  }

  return res.status(400).json({ verified: false, error: 'Método de verificación no soportado.' });
}
