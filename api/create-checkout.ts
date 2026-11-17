import {
  getKitPriceMxn,
  getKitProductName,
  getSafeOrigin,
  parseJsonBody,
  type ApiRequest,
  type ApiResponse,
} from './_security.js';

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<{ provider?: string; email?: string }>(req);
  const provider = body.provider;
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (provider !== 'stripe' && provider !== 'mercadopago') {
    return res.status(400).json({ error: 'Proveedor de pago inválido.' });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'El correo electrónico ingresado no es válido.' });
  }

  let origin = '';
  try {
    origin = getSafeOrigin(req);
  } catch {
    return res.status(400).json({ error: 'No se pudo validar el dominio de retorno.' });
  }

  const priceMxn = getKitPriceMxn();
  const productName = getKitProductName();

  if (provider === 'stripe') {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeKey) {
      return res.status(503).json({ error: 'Stripe no está configurado en el servidor.' });
    }

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('payment_method_types[0]', 'card');
    params.set('success_url', `${origin}/?payment=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${origin}/?payment=cancelled`);
    if (email) {
      params.set('customer_email', email);
    }
    params.set('line_items[0][price_data][currency]', 'mxn');
    params.set('line_items[0][price_data][product_data][name]', productName);
    params.set(
      'line_items[0][price_data][product_data][description]',
      'Cuadernillo completo EXANI-II UAA 2026: 15 reactivos resueltos, método de Desarme Filosófico y Plan de 4 semanas. Descarga directa inmediata.'
    );
    params.set('line_items[0][price_data][unit_amount]', String(priceMxn * 100));
    params.set('line_items[0][quantity]', '1');

    try {
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = (await response.json()) as { url?: string; error?: { message?: string } };
      if (!response.ok || !data.url) {
        return res.status(502).json({
          error: data.error?.message || 'No se pudo iniciar la sesión de pago con Stripe.',
        });
      }

      return res.status(200).json({ url: data.url });
    } catch {
      return res.status(502).json({ error: 'Error de comunicación con Stripe.' });
    }
  }

  // Mercado Pago Checkout Pro
  const mpToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  if (!mpToken) {
    return res.status(503).json({ error: 'Mercado Pago no está configurado en el servidor.' });
  }

  try {
    const payload: Record<string, unknown> = {
      items: [
        {
          title: productName,
          description: 'Cuadernillo completo EXANI-II UAA 2026 con descarga inmediata.',
          quantity: 1,
          currency_id: 'MXN',
          unit_price: priceMxn,
        },
      ],
      external_reference: `kit-exani-${Date.now()}`,
      back_urls: {
        success: `${origin}/?payment=success&provider=mercadopago`,
        failure: `${origin}/?payment=cancelled`,
        pending: `${origin}/?payment=pending`,
      },
      auto_return: 'approved',
    };

    if (email) {
      payload.payer = { email };
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { init_point?: string; message?: string };
    if (!response.ok || !data.init_point) {
      return res.status(502).json({
        error: data.message || 'No se pudo iniciar el checkout con Mercado Pago.',
      });
    }

    return res.status(200).json({ url: data.init_point });
  } catch {
    return res.status(502).json({ error: 'Error de comunicación con Mercado Pago.' });
  }
}
