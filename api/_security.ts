import crypto from 'node:crypto';

export interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  writeHead?: (statusCode: number, headers?: Record<string, string>) => void;
  write?: (chunk: string | Uint8Array) => boolean;
  end?: (chunk?: string | Uint8Array) => void;
  flushHeaders?: () => void;
}

export const getHeader = (req: ApiRequest, name: string): string => {
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
};

export const parseJsonBody = <T extends Record<string, unknown>>(req: ApiRequest): T => {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  if (typeof req.body === 'object') {
    return req.body as T;
  }
  return {} as T;
};

export const getSafeOrigin = (req: ApiRequest): string => {
  const configured = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (configured && /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?$/.test(configured)) {
    return configured.replace(/\/$/, '');
  }

  const host = getHeader(req, 'x-forwarded-host') || getHeader(req, 'host');
  const proto = getHeader(req, 'x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

  if (!host || !/^[a-zA-Z0-9.-]+(:\d+)?$/.test(host)) {
    throw new Error('Invalid host header');
  }
  const safeProto = proto === 'http' ? 'http' : 'https';
  return `${safeProto}://${host}`;
};

export const getKitPriceMxn = (): number => {
  const raw = Number(process.env.KIT_PRICE_MXN || 299);
  if (!Number.isFinite(raw) || raw < 10) return 299;
  return Math.round(raw);
};

export const getKitProductName = (): string => {
  return (process.env.KIT_PRODUCT_NAME || 'Kit Estratégico EXANI-II UAA 2026 (PDF Completo)').trim();
};

const getSigningSecret = (): string | null => {
  const explicit = (process.env.DOWNLOAD_TOKEN_SECRET || '').trim();
  if (explicit) return explicit;

  const fallback = (
    process.env.STRIPE_SECRET_KEY ||
    process.env.PAYPAL_CLIENT_SECRET ||
    process.env.KIT_ACCESS_CODES ||
    ''
  ).trim();

  if (!fallback) return null;
  return crypto.createHash('sha256').update(`exani-kit-signing:${fallback}`).digest('hex');
};

export const timingSafeEquals = (a: string, b: string): boolean => {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

export const createAccessToken = (subject: string, ttlDays = 30): string | null => {
  const secret = getSigningSecret();
  if (!secret) return null;

  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ sub: subject, exp }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};

export const verifyAccessToken = (token: string): { valid: boolean; subject?: string } => {
  const secret = getSigningSecret();
  if (!secret || !token || !token.includes('.')) {
    return { valid: false };
  }

  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { valid: false };

  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!timingSafeEquals(sig, expectedSig)) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) {
      return { valid: false };
    }
    return { valid: true, subject: parsed.sub };
  } catch {
    return { valid: false };
  }
};
