import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = (
    env.API_KEY ||
    env.GEMINI_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    env.VITE_API_KEY ||
    ''
  ).trim()
  const model = (env.GEMINI_MODEL || env.VITE_GEMINI_MODEL || 'gemini-3.8-flash').trim()

  return {
    plugins: [react()],
    define: {
      // Ensure defined values are always valid JSON strings (never undefined)
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_MODEL': JSON.stringify(model),
    },
  }
})