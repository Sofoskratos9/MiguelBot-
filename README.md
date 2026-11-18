# Miguel López · Estratega Educativo · EXANI-II UAA 2026

Plataforma de diagnóstico adaptativo, laboratorio de alto rendimiento y packs descargables (PDF editoriales + Audio WAV + Simulador de 50 Reactivos) con pagos directos y descarga automática vía **Stripe** para aspirantes a la Universidad Autónoma de Aguascalientes.

## Funcionalidades principales

- **Evaluador Diagnóstico EXANI-II (30 reactivos)**: evaluación adaptativa vía `/api/chat` (DeepSeek) en bloques de 5 reactivos con selector rápido `A / B / C` y persistencia local.
- **Laboratorio de Herramientas**:
  - Calculadora de puntaje CENEVAL (`700–1300`) y semáforo por carrera UAA.
  - Simulador Interactivo EXANI-II (4 reactivos muestra gratis + 50 reactivos completos al desbloquear el pack).
  - Entrenador de Regulación Autonómica (`4-7-8` y Respiración Táctica `4-4-4-4`).
  - Práctica guiada de *Desarme Filosófico* y Orientador Vocacional rápido (`RIASEC`).
- **3 Packs de Alto Rendimiento con descarga inmediata vía Stripe**:
  1. **Kit de Neuro-Aprendizaje** (`$99 MXN`): Cuaderno visual + plantillas imprimibles Feynman/Ultradiano en PDF + Audio Binaural 40 Hz (`.wav`) + reproductor en línea.
  2. **Banco de 50 Reactivos EXANI-II** (`$149 MXN`): Cuadernillo formato examen (50 reactivos) + tabla clave + solucionario completo en PDF + Simulador Interactivo completo.
  3. **Protocolo Anti-Ansiedad NSDR** (`$79 MXN`): Audio estéreo Alpha→Theta (`.wav`) + Guía clínica visual pre-examen en PDF + reproductor guiado.

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

## Despliegue en Vercel

En **Vercel → Project Settings → Environment Variables** configura:

- `DEEPSEEK_API_KEY`: clave secreta del servidor para el evaluador diagnóstico.
- `DOWNLOAD_TOKEN_SECRET`: cadena aleatoria segura (mínimo 32 caracteres) para firmar los tokens HMAC por producto.
- `STRIPE_SECRET_KEY`: clave secreta de Stripe (`sk_live_...` o `sk_test_...`).
- *(Opcional)* `PRICE_NEURO_KIT_MXN=99`, `PRICE_REACTIVOS_PACK_MXN=149`, `PRICE_NSDR_PROTOCOL_MXN=79`, `KIT_ACCESS_CODES`.
