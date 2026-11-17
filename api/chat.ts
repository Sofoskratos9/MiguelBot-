import { getHeader, parseJsonBody, type ApiRequest, type ApiResponse } from './_security.js';
import { EXANI_SYSTEM_INSTRUCTION } from './_systemPrompt.js';

interface IncomingMessage {
  role?: string;
  content?: string;
}

const getServerDeepSeekKey = (): string => {
  return (process.env.DEEPSEEK_API_KEY || '').trim();
};

const getDeepSeekModel = (): string => {
  return (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim() || 'deepseek-chat';
};

const mapUpstreamError = (status: number): string => {
  if (status === 401 || status === 403) {
    return 'La clave API de DeepSeek no es válida o fue revocada. Verifica DEEPSEEK_API_KEY.';
  }
  if (status === 402) {
    return 'La cuenta de DeepSeek no tiene saldo suficiente para completar la solicitud.';
  }
  if (status === 429) {
    return 'Se alcanzó el límite temporal de solicitudes en DeepSeek. Espera unos segundos e intenta de nuevo.';
  }
  if (status === 404) {
    return 'El modelo configurado en DEEPSEEK_MODEL no está disponible.';
  }
  return 'Hubo un error al conectar con el evaluador de DeepSeek. Intenta de nuevo.';
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(getServerDeepSeekKey()),
      model: getDeepSeekModel(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serverKey = getServerDeepSeekKey();
  const sessionKey = getHeader(req, 'x-deepseek-key').trim();
  const apiKey = serverKey || sessionKey;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Falta configurar DEEPSEEK_API_KEY en el servidor (Vercel Environment Variables o .env.local).',
    });
  }

  const body = parseJsonBody<{ messages?: IncomingMessage[] }>(req);
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];

  const sanitizedMessages = rawMessages
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        Boolean(m) &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
    )
    .slice(-80)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 12000),
    }));

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({ error: 'Debes enviar al menos un mensaje válido.' });
  }

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getDeepSeekModel(),
        messages: [{ role: 'system', content: EXANI_SYSTEM_INSTRUCTION }, ...sanitizedMessages],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!upstream.ok) {
      let detail = '';
      try {
        const errJson = (await upstream.json()) as { error?: { message?: string } };
        detail = errJson.error?.message ? ` (${errJson.error.message})` : '';
      } catch {
        // Ignore parse failures
      }
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({
        error: `${mapUpstreamError(upstream.status)}${upstream.status >= 500 ? '' : detail}`,
      });
    }

    if (!upstream.body) {
      return res.status(502).json({ error: 'DeepSeek no devolvió cuerpo de respuesta.' });
    }

    if (res.writeHead && res.write && res.end) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.byteLength > 0) {
            res.write(decoder.decode(value, { stream: true }));
          }
        }
        const tail = decoder.decode();
        if (tail) res.write(tail);
      } finally {
        res.end();
      }
      return;
    }

    const fullText = await upstream.text();
    return res.status(200).json({ rawSse: fullText });
  } catch (error) {
    console.error('DeepSeek proxy error:', error);
    return res.status(502).json({
      error: 'No se pudo establecer conexión con DeepSeek. Intenta nuevamente.',
    });
  }
}
