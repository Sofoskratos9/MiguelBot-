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
    sessionId?: string;
    paymentId?: string;
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

  if (body.provider === 'mercadopago') {
    const mpToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
    const paymentId = (body.paymentId || '').trim();
    if (!mpToken) {
      return res.status(503).json({ verified: false, error: 'Mercado Pago no está configurado.' });
    }
    if (!paymentId || !/^\d+$/.test(paymentId)) {
      return res.status(400).json({ verified: false, error: 'ID de pago de Mercado Pago inválido.' });
    }

    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: `Bearer ${mpToken}` },
        }
      );
      const data = (await response.json()) as { status?: string };
      if (!response.ok || data.status !== 'approved') {
        return res.status(402).json({
          verified: false,
          error: 'El pago aún no ha sido aprobado por Mercado Pago.',
        });
      }

      const token = createAccessToken(`mp:${paymentId}`);
      if (!token) {
        return res.status(503).json({ verified: false, error: 'Falta DOWNLOAD_TOKEN_SECRET en el servidor.' });
      }
      return res.status(200).json({ verified: true, token });
    } catch {
      return res.status(502).json({ verified: false, error: 'Error al verificar con Mercado Pago.' });
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
