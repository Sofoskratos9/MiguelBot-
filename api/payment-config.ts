import { getKitPriceMxn, getKitProductName, type ApiRequest, type ApiResponse } from './_security.js';

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeEnabled = Boolean((process.env.STRIPE_SECRET_KEY || '').trim());
  const paypalEnabled = Boolean(
    (process.env.PAYPAL_CLIENT_ID || '').trim() && (process.env.PAYPAL_CLIENT_SECRET || '').trim()
  );
  const accessCodeEnabled = Boolean((process.env.KIT_ACCESS_CODES || '').trim());

  return res.status(200).json({
    stripeEnabled,
    paypalEnabled,
    accessCodeEnabled,
    priceMxn: getKitPriceMxn(),
    productName: getKitProductName(),
  });
}
