import { isValidProductId, type ProductId } from './_catalog.js';
import {
  createAccessToken,
  parseJsonBody,
  timingSafeEquals,
  verifyAccessToken,
  type ApiRequest,
  type ApiResponse,
} from './_security.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<{
    provider?: string;
    productId?: string;
    sessionId?: string;
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
