import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { EXANI_SYSTEM_INSTRUCTION } from './api/_systemPrompt'

const deepSeekDevMiddleware = (env: Record<string, string>): Plugin => ({
  name: 'deepseek-dev-api',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res, next) => {
      const serverKey = (env.DEEPSEEK_API_KEY || '').trim()
      const model = (env.DEEPSEEK_MODEL || 'deepseek-chat').trim() || 'deepseek-chat'

      if (req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ configured: Boolean(serverKey), model }))
        return
      }

      if (req.method !== 'POST') {
        next()
        return
      }

      const headerKey = typeof req.headers['x-deepseek-key'] === 'string' ? req.headers['x-deepseek-key'].trim() : ''
      const apiKey = serverKey || headerKey
      if (!apiKey) {
        res.statusCode = 503
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Configura DEEPSEEK_API_KEY en .env.local o Vercel.' }))
        return
      }

      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }

      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
          messages?: Array<{ role?: string; content?: string }>
        }
        const cleanMessages = (Array.isArray(parsed.messages) ? parsed.messages : [])
          .filter(
            (m): m is { role: 'user' | 'assistant'; content: string } =>
              Boolean(m) && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== ''
          )
          .slice(-80)

        const upstream = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: EXANI_SYSTEM_INSTRUCTION }, ...cleanMessages],
            stream: true,
            temperature: 0.7,
          }),
        })

        if (!upstream.ok || !upstream.body) {
          res.statusCode = upstream.status || 502
          res.setHeader('Content-Type', 'application/json')
          res.end(await upstream.text())
          return
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        })

        const reader = upstream.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) res.write(decoder.decode(value, { stream: true }))
        }
        const tail = decoder.decode()
        if (tail) res.write(tail)
        res.end()
      } catch (err) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Error conectando con DeepSeek' }))
      }
    })
  },
})

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), deepSeekDevMiddleware(env)],
  }
})