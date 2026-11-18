import { getUaaCycleContext } from '../shared/examCycle.js';
import { EXAM_SOURCES_SNAPSHOT } from '../shared/examSources.js';
import { getHeader, parseJsonBody, type ApiRequest, type ApiResponse } from './_security.js';
import { buildExaniSystemInstruction } from './_systemPrompt.js';

interface IncomingMessage {
  role?: string;
  content?: string;
}

const liveSearchCache = new Map<string, { expiresAt: number; text: string }>();

const fetchLiveOfficialContext = async (latestUserText: string): Promise<string> => {
  const tavilyKey = (process.env.TAVILY_API_KEY || '').trim();
  if (!tavilyKey || !latestUserText) return '';

  const needsOfficialLookup =
    /(convocatoria|fecha|examen|temario|gu[ií]a|ceneval|uaa|202\d|cambio|puntaje|m[oó]dulo|premedicina|requisito|registro)/i.test(
      latestUserText
    );
  if (!needsOfficialLookup) return '';

  const cacheKey = latestUserText.toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
  const cached = liveSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.text;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const cycle = getUaaCycleContext();
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `${latestUserText.slice(0, 160)} EXANI-II UAA ${cycle.targetAdmissionYear}`,
        include_domains: ['ceneval.edu.mx', 'uaa.mx'],
        search_depth: 'basic',
        max_results: 3,
      }),
    });
    if (!res.ok) return '';
    const json = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const items = Array.isArray(json.results) ? json.results.slice(0, 3) : [];
    const formatted = items
      .map((r) => `- ${r.title || 'Fuente oficial'} (${r.url || ''}): ${(r.content || '').slice(0, 260)}`)
      .join('\n');
    liveSearchCache.set(cacheKey, {
      expiresAt: Date.now() + 6 * 60 * 60 * 1000,
      text: formatted,
    });
    return formatted;
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
};

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
    const cycle = getUaaCycleContext();
    return res.status(200).json({
      configured: Boolean(getServerDeepSeekKey()),
      model: getDeepSeekModel(),
      liveSearchEnabled: Boolean((process.env.TAVILY_API_KEY || '').trim()),
      examCycle: cycle.editionLabel,
      lastSyncedLabel: EXAM_SOURCES_SNAPSHOT.lastSyncedLabel,
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

  const lastUserMsg = [...sanitizedMessages].reverse().find((m) => m.role === 'user')?.content || '';
  const liveOfficialContext = await fetchLiveOfficialContext(lastUserMsg);
  const systemInstruction = buildExaniSystemInstruction(new Date(), liveOfficialContext);

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getDeepSeekModel(),
        messages: [{ role: 'system', content: systemInstruction }, ...sanitizedMessages],
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
