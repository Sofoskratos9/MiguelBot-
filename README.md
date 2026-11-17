# Preparación EXANI-II UAA 2026 — Miguel Neftalí

Plataforma interactiva de diagnóstico, herramientas de estudio y cuadernillo PDF descargable con pagos verificados para aspirantes a la Universidad Autónoma de Aguascalientes.

## Funcionalidades

- **Diagnóstico EXANI-II (30 reactivos)**: evaluación paso a paso mediante `/api/chat` (DeepSeek) en bloques de 5 reactivos con selector rápido `A / B / C` y progreso guardado localmente en el navegador.
- **Herramientas de estudio**:
  - Calculadora de puntaje en escala CENEVAL (`700–1300`) y semáforo por carrera UAA.
  - Entrenador interactivo de respiración `4-7-8` anti-ansiedad.
  - Práctica guiada de *Desarme Filosófico* para Comprensión Lectora.
- **Kit Estratégico EXANI-II UAA 2026 (PDF)**:
  - Muestra gratuita descargable en PDF (`2 páginas`).
  - Compra directa con **Stripe** (tarjeta / Apple Pay / Google Pay) o **PayPal**, verificación criptográfica en servidor (`/api/verify-payment`) y descarga automática e inmediata del cuadernillo completo en PDF.

## Ejecución local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea `.env.local` a partir de `.env.example` y agrega `DEEPSEEK_API_KEY`.
3. Inicia el entorno:
   ```bash
   npm run dev
   ```
   *(Para probar también los endpoints `/api/*` de pago en local, usa `vercel dev`.)*

## Activar evaluador, pagos reales y descarga directa en Vercel

En **Vercel → Project Settings → Environment Variables** configura:

- `DEEPSEEK_API_KEY`: clave secreta del servidor para el evaluador diagnóstico (nunca se expone en el navegador).
- `DOWNLOAD_TOKEN_SECRET`: cadena aleatoria segura (mínimo 32 caracteres) para firmar los tokens de descarga.
- `KIT_PRICE_MXN`: precio en pesos mexicanos (por defecto `299`).
- **Stripe**: `STRIPE_SECRET_KEY` (`sk_live_...` o `sk_test_...`).
- **PayPal**: `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` (opcional: `PAYPAL_SANDBOX=true` en modo pruebas).
- *(Opcional)* `KIT_ACCESS_CODES`: códigos separados por coma para entregas tras transferencia SPEI o presencial.
