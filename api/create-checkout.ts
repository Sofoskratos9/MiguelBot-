import { getServerCatalog, isValidProductId, type ProductId } from './_catalog.js';
import {
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

  const body = parseJsonBody<{ provider?: string; productId?: string; email?: string }>(req);
  const provider = body.provider || 'stripe';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const productId: ProductId = isValidProductId(body.productId) ? body.productId : 'reactivos-pack';

  if (provider !== 'stripe') {
    return res.status(400).json({ error: 'Solo se admiten pagos mediante Stripe.' });
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

  const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!stripeKey) {
    return res.status(503).json({ error: 'Stripe no está configurado en el servidor.' });
  }

  const catalog = getServerCatalog();
  const product = catalog[productId];

  const params = new URLSearchParams();
  params.set('mode', 'payment');
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
