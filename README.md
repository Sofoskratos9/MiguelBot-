# Miguel Neftalí López · NEFTALÍ · EXANI-II UAA

Plataforma NEFTALÍ de diagnóstico adaptativo, laboratorio de preparación y packs descargables (PDF editoriales + Audio WAV + Simulador de 50 Reactivos) con pagos directos y descarga automática vía **Stripe**, actualización automática por ciclo mensual/anual y sincronización con fuentes oficiales de **CENEVAL** y **UAA**.

## Funcionalidades principales

- **Evaluador Diagnóstico EXANI-II (30 reactivos)**: evaluación adaptativa vía `/api/chat` (DeepSeek) en bloques de 5 reactivos con selector rápido `A / B / C`, contexto automático de fecha/ciclo (`shared/examCycle.ts`) y estructura oficial vigente (`shared/examSources.ts`).
- **Actualización Automática Mensual y Anual**:
  - Cambio automático de mes, año y ciclo de admisión UAA en zona horaria `America/Mexico_City` (PDFs, catálogo, simulador e interfaz web).
  - Workflow programado en GitHub Actions (`.github/workflows/sync-exam-sources.yml`) que ejecuta `scripts/sync-exam-sources.mjs` el día 1 de cada mes para consultar `ceneval.edu.mx` y `uaa.mx` y actualizar `shared/examSources.ts`.
- **Laboratorio de Herramientas**:
  - Calculadora de puntaje CENEVAL (`700–1300`) y semáforo por carrera UAA.
  - Simulador Interactivo EXANI-II (4 reactivos muestra gratis + 50 reactivos completos al desbloquear el pack).
  - Entrenador de Regulación Autonómica (`4-7-8` y Respiración Táctica `4-4-4-4`).
  - Práctica guiada de *Desarme Filosófico* y Orientador Vocacional rápido (`RIASEC`).
- **3 packs con descarga inmediata vía Stripe**:
  1. **Kit de Neuro-Aprendizaje** (`$99 MXN`): Cuaderno visual + 4 plantillas imprimibles + casos resueltos en PDF (`14 págs.`) + Audio Binaural 40 Hz (`.wav`) + reproductor en línea.
  2. **Banco de 50 Reactivos EXANI-II** (`$149 MXN`): Cuadernillo formato examen + hoja óptica de burbujas + formulario maestro + solucionario completo en PDF (`25 págs.`) + Simulador Interactivo completo.
  3. **Guía para llegar con calma al examen** (`$79 MXN`): Audio de calma guiado (`.wav`) + Manual práctico con respiración guiada y tarjeta recortable de bolsillo en PDF (`10 págs.`) + reproductor guiado.

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
4. Para sincronizar manualmente las fuentes oficiales de CENEVAL y UAA:
   ```bash
   node scripts/sync-exam-sources.mjs
   ```

## Despliegue en Vercel

En **Vercel → Project Settings → Environment Variables** configura:

- `DEEPSEEK_API_KEY`: clave secreta del servidor para el evaluador diagnóstico.
- `DOWNLOAD_TOKEN_SECRET`: cadena aleatoria segura (mínimo 32 caracteres) para firmar los tokens HMAC por producto.
- `STRIPE_SECRET_KEY`: clave secreta de Stripe (`sk_live_...` o `sk_test_...`).
- *(Opcional)* `TAVILY_API_KEY`: habilita consultas en vivo filtradas a `ceneval.edu.mx` y `uaa.mx` cuando el aspirante pregunta por convocatorias o fechas recientes.
- *(Opcional)* `PRICE_NEURO_KIT_MXN=99`, `PRICE_REACTIVOS_PACK_MXN=149`, `PRICE_NSDR_PROTOCOL_MXN=79`, `KIT_ACCESS_CODES`.
