import { getServerCatalog, isValidProductId, type ProductId } from './_catalog.js';
import {
  getSafeOrigin,
  parseJsonBody,
  type ApiRequest,
  type ApiResponse,
} from './_security.js';

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || 'No se pudo autenticar con PayPal.');
  }
  return data.access_token;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<{ provider?: string; productId?: string; email?: string }>(req);
  const provider = body.provider;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const productId: ProductId = isValidProductId(body.productId) ? body.productId : 'reactivos-pack';

  if (provider !== 'stripe' && provider !== 'paypal') {
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

  const catalog = getServerCatalog();
  const product = catalog[productId];

  if (provider === 'stripe') {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeKey) {
      return res.status(503).json({ error: 'Stripe no está configurado en el servidor.' });
    }

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('payment_method_types[0]', 'card');
    params.set(
      'success_url',
      `${origin}/?payment=success&provider=stripe&product=${product.id}&session_id={CHECKOUT_SESSION_ID}`
    );
    params.set('cancel_url', `${origin}/?payment=cancelled&product=${product.id}`);
    params.set('metadata[product_id]', product.id);
    if (email) {
      params.set('customer_email', email);
    }
    params.set('line_items[0][price_data][currency]', 'mxn');
    params.set('line_items[0][price_data][product_data][name]', product.name);
    params.set('line_items[0][price_data][product_data][description]', product.tagline);
    params.set('line_items[0][price_data][unit_amount]', String(product.priceMxn * 100));
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

  // PayPal Orders v2 Checkout
  const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: 'PayPal no está configurado en el servidor.' });
  }

  try {
    const accessToken = await getPayPalAccessToken(clientId, clientSecret);
    const requestId =
      globalThis.crypto?.randomUUID?.() || `pp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: product.id,
            description: product.name.slice(0, 127),
            amount: {
              currency_code: 'MXN',
              value: product.priceMxn.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Miguel López · EXANI-II UAA',
              locale: 'es-MX',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: `${origin}/?payment=success&provider=paypal&product=${product.id}`,
              cancel_url: `${origin}/?payment=cancelled&product=${product.id}`,
            },
            ...(email ? { email_address: email } : {}),
          },
        },
      }),
    });

    const data = (await response.json()) as {
      links?: Array<{ rel?: string; href?: string }>;
      message?: string;
    };
    const approveUrl = data.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;

    if (!response.ok || !approveUrl) {
      return res.status(502).json({
        error: data.message || 'No se pudo iniciar el checkout con PayPal.',
      });
    }

    return res.status(200).json({ url: approveUrl });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Error de comunicación con PayPal.',
    });
  }
}
