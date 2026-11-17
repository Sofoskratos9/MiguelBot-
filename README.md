# Miguel López · Estratega Educativo · EXANI-II UAA 2026

Plataforma de diagnóstico adaptativo, laboratorio de alto rendimiento y packs descargables (PDF + Audio WAV + Simulador de 50 Reactivos) con pagos directos vía **Stripe** y **PayPal** para aspirantes a la Universidad Autónoma de Aguascalientes.

## Funcionalidades principales

- **Evaluador Diagnóstico EXANI-II (30 reactivos)**: evaluación adaptativa vía `/api/chat` (DeepSeek) en bloques de 5 reactivos con selector rápido `A / B / C` y persistencia local.
- **Laboratorio de Herramientas**:
  - Calculadora de puntaje CENEVAL (`700–1300`) y semáforo por carrera UAA.
  - Simulador Interactivo EXANI-II (4 reactivos muestra gratis + 50 reactivos completos al desbloquear el pack).
  - Entrenador de Regulación Autonómica (`4-7-8` y Respiración Táctica `4-4-4-4`).
  - Práctica guiada de *Desarme Filosófico* y Orientador Vocacional rápido (`RIASEC`).
- **3 Packs de Alto Rendimiento con descarga inmediata** *(Stripe & PayPal, sin redirecciones a chats externos)*:
  1. **Kit de Neuro-Aprendizaje** (`$99 MXN`): PDF Ultradiano/Feynman + Audio Binaural 40 Hz (`.wav`).
  2. **Banco de 50 Reactivos EXANI-II** (`$149 MXN`): PDF con 50 reactivos comentados + Simulador Interactivo completo.
  3. **Protocolo Anti-Ansiedad NSDR** (`$79 MXN`): Audio Alpha→Theta (`.wav`) + Guía PDF pre-examen.

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
   *(Para probar también `/api/create-checkout` y `/api/verify-payment` en local, usa `vercel dev`.)*

## Despliegue en Vercel

En **Vercel → Project Settings → Environment Variables** configura:

- `DEEPSEEK_API_KEY`: clave secreta del servidor para el evaluador diagnóstico.
- `DOWNLOAD_TOKEN_SECRET`: cadena aleatoria segura (mínimo 32 caracteres) para firmar los tokens HMAC por producto.
- **Stripe**: `STRIPE_SECRET_KEY` (`sk_live_...` o `sk_test_...`).
- **PayPal**: `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` (opcional: `PAYPAL_SANDBOX=true` en sandbox).
- *(Opcional)* `PRICE_NEURO_KIT_MXN=99`, `PRICE_REACTIVOS_PACK_MXN=149`, `PRICE_NSDR_PROTOCOL_MXN=79`, `KIT_ACCESS_CODES`.
