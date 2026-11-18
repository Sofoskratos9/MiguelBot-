import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calculator,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  FileText,
  GraduationCap,
  HelpCircle,
  KeyRound,
  MessageCircle,
  Menu,
  RotateCcw,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import './index.css';
import { MarkdownRenderer } from './src/MarkdownRenderer';
import { StudyTools } from './src/StudyTools';
import { StudyKitSection, TOKENS_STORAGE_KEY, type ProductId } from './src/StudyKitSection';
import { FREE_PREVIEW_QUESTIONS } from './src/exaniBank';
import { buildExaniSystemInstruction } from './api/_systemPrompt';
import { getUaaCycleContext } from './shared/examCycle';
import { EXAM_SOURCES_SNAPSHOT } from './shared/examSources';
import {
  STORAGE_KEY,
  SESSION_API_KEY_STORAGE,
  buildChatHistory,
  deriveDiagnosticProgress,
  downloadReportAsText,
  formatApiError,
  getContextualChips,
  isDiagnosticReport,
  loadStoredMessages,
  type DeepSeekChatMessage,
  type Message,
} from './src/diagnosticUtils';

type WorkspaceTab = 'landing' | 'diagnostic' | 'tools' | 'kit';

const getSessionApiKey = (): string => {
  try {
    return (sessionStorage.getItem(SESSION_API_KEY_STORAGE) || '').trim();
  } catch {
    return '';
  }
};

const consumeSseStream = async (
  stream: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void,
  signal?: { cancelled: boolean }
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done || signal?.cancelled) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? '';
        if (delta) onDelta(delta);
      } catch {
        // Ignore partial keepalive frames
      }
    }
  }
};

// --- Subcomponents ---

const MessageBubble: React.FC<{
  message: Message;
  isStreamingBubble?: boolean;
  onRetry?: (retryText: string) => void;
  onOpenKit?: () => void;
  isLoading: boolean;
}> = ({ message, isStreamingBubble, onRetry, onOpenKit, isLoading }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const isReport = !isUser && !message.isError && isDiagnosticReport(message.text);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable
    }
  };

  return (
    <div className={`msg-row ${isUser ? 'is-user' : 'is-model'}`}>
      {!isUser && (
        <div className="msg-avatar" aria-hidden="true">
          <GraduationCap size={16} />
        </div>
      )}

      <div className={`msg-bubble ${message.isError ? 'is-error' : ''} ${isReport ? 'is-report' : ''}`}>
        <MarkdownRenderer text={message.text} isUser={isUser && !message.isError} />
        {isStreamingBubble && <span className="stream-cursor" aria-hidden="true" />}

        {!isUser && !message.isError && !isStreamingBubble && (message.text.length > 120 || isReport) && (
          <div className="msg-actions">
            {isReport && onOpenKit && (
              <button type="button" className="msg-action-btn is-primary" onClick={onOpenKit}>
                <FileText size={13} />
                Descargar Pack 50 Reactivos
              </button>
            )}
            {isReport && (
              <a
                href="https://wa.me/524494959259?text=Hola%20Miguel%2C%20termin%C3%A9%20mi%20diagn%C3%B3stico%20EXANI-II%20y%20quiero%20informaci%C3%B3n%20de%20la%20Mentor%C3%ADa%20EXANI-UAA"
                target="_blank"
                rel="noreferrer"
                className="msg-action-btn is-primary"
              >
                <MessageCircle size={13} />
                Mentoría EXANI-UAA · 4 sesiones · $1,600
              </a>
            )}
            <button type="button" className="msg-action-btn" onClick={handleCopy}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado' : isReport ? 'Copiar Diagnóstico' : 'Copiar'}
            </button>
            {isReport && (
              <button
                type="button"
                className="msg-action-btn"
                onClick={() => downloadReportAsText(message.text)}
              >
                <Download size={13} />
                Descargar .txt
              </button>
            )}
          </div>
        )}

        {message.isError && message.retryText && onRetry && (
          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-danger-soft"
              disabled={isLoading}
              onClick={() => onRetry(message.retryText!)}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              <RotateCcw size={13} />
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const HelpModal: React.FC<{
  onClose: () => void;
  onReset: () => void;
  hasManualSessionKey: boolean;
  onClearSessionKey: () => void;
}> = ({ onClose, onReset, hasManualSessionKey, onClearSessionKey }) => {
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 id="help-modal-title" className="modal-title-serif" style={{ margin: 0, fontSize: '20px' }}>
            Guía de Uso y Privacidad
          </h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar ayuda">
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.55, marginTop: 0 }}>
          Plataforma NEFTALÍ de diagnóstico y preparación EXANI-II {getUaaCycleContext().shortCycleTag} — Miguel Neftalí López, Lic. en Filosofía (cédula profesional 15424282). Pensamiento aplicado a la vida real.
        </p>
        <figure className="neftali-fig" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            className="neftali-motif"
            src="/ilustraciones/brujula.png"
            onError={(e) => { const fig = e.currentTarget.closest('figure'); if (fig) { (fig as HTMLElement).style.display = 'none'; } else { e.currentTarget.style.display = 'none'; } }}
            alt="Brújula: orientación para tu camino a la UAA"
            loading="lazy"
          />
          <figcaption className="neftali-fig-cap">
            Orientación: cada paso del diagnóstico te acerca a tu carrera.
          </figcaption>
        </figure>
        <ul style={{ paddingLeft: '18px', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Diagnóstico (30 reactivos):</strong> Responde las 4 preguntas iniciales y resuelve 6 bloques de 5 reactivos usando los botones rápidos A/B/C.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Laboratorio de Herramientas:</strong> Calculadora CENEVAL 700–1300, Simulador EXANI-II, Entrenador 4-7-8 / 4-4-4-4 y Orientador RIASEC.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Packs con Descarga Inmediata:</strong> Paga de forma segura con Stripe y descarga al instante tus cuadernos PDF y audios WAV sin salir de la plataforma.
          </li>
          <li>
            <strong>Actualización continua ({EXAM_SOURCES_SNAPSHOT.lastSyncedLabel}):</strong> Estructura alineada con CENEVAL ({EXAM_SOURCES_SNAPSHOT.cenevalOfficial.duration}) y fechas del ciclo {getUaaCycleContext().shortCycleTag}.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Contacto:</strong> ¿Dudas o acompañamiento 1 a 1? Escríbele a Miguel por{' '}
            <a href="https://wa.me/524494959259" target="_blank" rel="noreferrer">
              WhatsApp
            </a>{' '}
            (Mentoría EXANI-UAA: 4 sesiones, 10 lugares, $1,600 MXN).
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Aviso de privacidad:</strong> Lee cómo tratamos tus datos personales en el{' '}
            <a href="/aviso-de-privacidad.html" target="_blank" rel="noreferrer">
              aviso de privacidad
            </a>
            .
          </li>
          <li>
            <strong>Consultoría filosófica NEFTALÍ:</strong> Sesión de 60 min, $400 MXN IVA incluido, pago anticipado y cancelación gratuita con 24 h de aviso. Sin cargo si en los primeros 15 min se decide derivar. No es terapia.{' '}
            <a href="https://cal.com/miguel-neftali-lopez-wnkrwr/consultoria" target="_blank" rel="noreferrer">
              Agenda tu sesión
            </a>
            .
          </li>
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button type="button" className="btn btn-gold" onClick={onClose}>
            Continuar
          </button>

          {!confirmingReset ? (
            <button type="button" className="btn btn-danger-soft" onClick={() => setConfirmingReset(true)}>
              <Trash2 size={15} />
              Reiniciar y borrar progreso local
            </button>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--red-wash)',
                border: '1px solid #e7b5ac',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: '#8f2d1e', marginBottom: '10px', fontWeight: 600 }}>
                ¿Borrar el avance del diagnóstico guardado en este navegador?
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px' }}
                  onClick={() => setConfirmingReset(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, padding: '8px', background: '#b24432', color: '#fff' }}
                  onClick={onReset}
                >
                  Sí, borrar
                </button>
              </div>
            </div>
          )}

          {hasManualSessionKey && (
            <button type="button" className="btn btn-secondary" onClick={onClearSessionKey}>
              <KeyRound size={15} />
              Cambiar clave de sesión DeepSeek
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Editorial Landing Showcase View (Papel Marfil + Tinta UAA + Latón) ---

const LandingView: React.FC<{
  onStartDiagnostic: () => void;
  onOpenTools: () => void;
  onOpenPacks: (productId?: ProductId) => void;
}> = ({ onStartDiagnostic, onOpenTools, onOpenPacks }) => {
  const cycle = getUaaCycleContext();
  const [sampleTab, setSampleTab] = useState<'lectura' | 'mate'>('lectura');
  const [pickedOption, setPickedOption] = useState<number | null>(null);

  const sampleQuestion = sampleTab === 'lectura' ? FREE_PREVIEW_QUESTIONS[0] : FREE_PREVIEW_QUESTIONS[1];
  const letters = ['A', 'B', 'C', 'D'];

  const handleSwitchSample = (nextTab: 'lectura' | 'mate') => {
    setSampleTab(nextTab);
    setPickedOption(null);
  };

  return (
    <div className="landing-viewport">
      {/* Asymmetric Editorial Hero + Live Specimen Card */}
      <section className="editorial-hero" aria-label="Introducción y prueba interactiva">
        <div>
          <div className="hero-dateline">
            NEFTALÍ · Pensamiento aplicado a la vida real — Ciclo {cycle.shortCycleTag}
          </div>

          <h1 className="hero-title">
            Prepara tu EXANI-II con <em>criterio real</em>, no memorizando guías a ciegas.
          </h1>

          <p className="hero-desc">
            Detecta en 10 minutos qué áreas suman o restan puntos para tu carrera ({cycle.uaaPhaseLabel}), practica con reactivos comentados y descarga cuadernos imprimibles con audio para estudiar sin distracciones.
          </p>

          <div className="hero-actions">
            <button type="button" className="btn btn-gold hero-cta" onClick={onStartDiagnostic}>
              Comenzar Diagnóstico Gratuito
              <ArrowRight size={16} />
            </button>
            <button type="button" className="btn btn-secondary hero-cta" onClick={onOpenTools}>
              <Calculator size={16} />
              Calculadora y Simulador
            </button>
          </div>

          <div className="hero-subactions">
            <button
              type="button"
              className="btn-link-inline"
              onClick={async () => {
                const { generateSampleKitPdf } = await import('./src/pdfKitGenerator');
                generateSampleKitPdf();
              }}
            >
              <Download size={14} />
              Descargar muestra gratis (PDF, 5 págs.)
            </button>
          </div>

          <div className="hero-proof-line">
            <span className="hero-proof-item">
              <CheckCircle2 size={14} />
              <strong>30 reactivos</strong> por área
            </span>
            <span className="hero-proof-item">
              <CheckCircle2 size={14} />
              <strong>700–1300 pts</strong> escala CENEVAL
            </span>
            <span className="hero-proof-item">
              <CheckCircle2 size={14} />
              <strong>Guardado local</strong> en tu dispositivo
            </span>
          </div>
        </div>

        {/* Interactive Live Specimen Card */}
        <div className="hero-specimen-wrap">
          <figure className="neftali-fig">
            <img
              src="/ilustraciones/heroe-decision.png"
              onError={(e) => { const fig = e.currentTarget.closest('figure'); if (fig) { (fig as HTMLElement).style.display = 'none'; } else { e.currentTarget.style.display = 'none'; } }}
              alt="Miguel Neftalí pensando ante un camino que se bifurca: decidir con criterio"
              loading="eager"
            />
          </figure>
          <div className="hero-specimen-card" role="region" aria-label="Prueba rápida de reactivo EXANI-II">
            <div className="specimen-top">
              <span className="specimen-label">Prueba 1 reactivo ahora</span>
              <div className="specimen-switch" role="tablist" aria-label="Área de muestra">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sampleTab === 'lectura'}
                  className={`specimen-switch-btn ${sampleTab === 'lectura' ? 'is-active' : ''}`}
                  onClick={() => handleSwitchSample('lectura')}
                >
                  Lectura
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sampleTab === 'mate'}
                  className={`specimen-switch-btn ${sampleTab === 'mate' ? 'is-active' : ''}`}
                  onClick={() => handleSwitchSample('mate')}
                >
                  Matemático
                </button>
              </div>
            </div>

            <p className="specimen-q">{sampleQuestion.question}</p>

            <div className="sim-options">
              {sampleQuestion.options.map((opt, idx) => {
                const isAnswered = pickedOption !== null;
                const isPicked = pickedOption === idx;
                const isCorrect = idx === sampleQuestion.correctIndex;
                let cls = '';
                if (isAnswered) {
                  if (isCorrect) cls = 'is-correct';
                  else if (isPicked) cls = 'is-wrong';
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`practice-opt-btn ${cls}`}
                    onClick={() => setPickedOption(idx)}
                  >
                    <span className="sim-opt-letter">{letters[idx]}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {pickedOption !== null && (
              <div
                className={`practice-feedback ${
                  pickedOption === sampleQuestion.correctIndex ? 'is-ok' : 'is-err'
                }`}
              >
                {pickedOption === sampleQuestion.correctIndex ? (
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <XCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <span>
                  <strong>
                    {pickedOption === sampleQuestion.correctIndex
                      ? 'Correcto.'
                      : `La correcta es ${letters[sampleQuestion.correctIndex]}.`}
                  </strong>{' '}
                  {sampleQuestion.explanation}
                </span>
              </div>
            )}

            <div className="specimen-footer-row">
              <span>{sampleQuestion.area} · Nivel {sampleQuestion.difficulty}</span>
              <button type="button" className="btn-link-inline" onClick={onOpenTools}>
                Probar los 4 reactivos gratis
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 3-Chapter Study Flow */}
      <section className="journey-strip" aria-label="Cómo usar la plataforma paso a paso">
        <button type="button" className="journey-chapter" onClick={onStartDiagnostic}>
          <span className="journey-num">PASO 01 · 10 MINUTOS</span>
          <h2 className="journey-title">Diagnóstico adaptativo</h2>
          <p className="journey-copy">
            Responde 4 datos sobre tu carrera en la UAA y resuelve 30 reactivos por bloques con semáforo de aciertos y plan semanal.
          </p>
          <span className="journey-cta">
            Abrir diagnóstico
            <ArrowRight size={14} />
          </span>
        </button>

        <button type="button" className="journey-chapter" onClick={onOpenTools}>
          <span className="journey-num">PASO 02 · PRÁCTICA LIBRE</span>
          <h2 className="journey-title">Calculadora y simulador</h2>
          <p className="journey-copy">
            Ajusta tus aciertos frente al puntaje de Medicina, Estomatología o Ingenierías, entrena respiración 4-7-8 y orientador RIASEC.
          </p>
          <span className="journey-cta">
            Explorar herramientas
            <ArrowRight size={14} />
          </span>
        </button>

        <button type="button" className="journey-chapter" onClick={() => onOpenPacks()}>
          <span className="journey-num">PASO 03 · MATERIAL DE MESA</span>
          <h2 className="journey-title">Cuadernos PDF y audio .wav</h2>
          <p className="journey-copy">
            Descarga guías imprimibles de 10 a 25 páginas con solucionarios comentados, hoja de burbujas y audio binaural sin suscripciones.
          </p>
          <span className="journey-cta">
            Ver cuadernos y precios
            <ArrowRight size={14} />
          </span>
        </button>
      </section>

      {/* Featured Editorial Folio Showcase of the 3 Packs */}
      <section className="landing-packs-preview" aria-labelledby="landing-packs-heading">
        <div className="section-header-editorial">
          <div>
            <div className="section-eyebrow">Materiales de Estudio · Edición {cycle.targetAdmissionYear}</div>
            <h2 id="landing-packs-heading" className="packs-h1" style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', marginBottom: 0 }}>
              Cuadernos y Guías de Descarga Directa
            </h2>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenPacks()}>
            Ir a tienda y muestras de audio
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="packs-grid">
          <article className="pack-card is-neuro" onClick={() => onOpenPacks('neuro-kit')} style={{ cursor: 'pointer' }}>
            <div className="pack-folio-band">
              <div className="pack-folio-top">
                <span className="pack-catalog-code">CUADERNO 01</span>
                <span className="pack-badge">PDF + Audio WAV</span>
              </div>
              <div className="pack-folio-spec">
                <div className="pack-folio-meta">
                  14 páginas imprimibles
                  <span>Ciclos 90/20 + Audio 40 Hz</span>
                </div>
                <div className="pack-folio-emblem" aria-hidden="true">
                  <Brain size={20} strokeWidth={1.7} />
                </div>
              </div>
            </div>
            <div className="pack-body">
              <h3 className="pack-title">Kit de Neuro-Aprendizaje</h3>
              <p className="pack-tagline">
                Plantillas listas para imprimir basadas en bloques ultradianos (90/20), método Feynman paso a paso y pista binaural de enfoque.
              </p>
              <div className="pack-footer">
                <div className="pack-price-line">
                  <span className="pack-price">$99 MXN</span>
                  <span className="pack-compare">$299</span>
                </div>
                <button type="button" className="btn btn-obsidian" style={{ width: '100%' }}>
                  Ver detalle y muestras
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </article>

          <article className="pack-card is-featured" onClick={() => onOpenPacks('reactivos-pack')} style={{ cursor: 'pointer' }}>
            <div className="pack-folio-band">
              <div className="pack-folio-top">
                <span className="pack-catalog-code">CUADERNO 02</span>
                <span className="pack-badge">PDF + Simulador · {cycle.targetAdmissionYear}</span>
              </div>
              <div className="pack-folio-spec">
                <div className="pack-folio-meta">
                  25 páginas + Simulador
                  <span>50 reactivos + Hoja de burbujas</span>
                </div>
                <div className="pack-folio-emblem" aria-hidden="true">
                  <FileText size={20} strokeWidth={1.7} />
                </div>
              </div>
            </div>
            <div className="pack-body">
              <h3 className="pack-title">Banco de 50 Reactivos EXANI-II</h3>
              <p className="pack-tagline">
                Examen simulacro completo alineado al temario CENEVAL {cycle.targetAdmissionYear}, hoja óptica imprimible, formulario y soluciones explicadas.
              </p>
              <div className="pack-footer">
                <div className="pack-price-line">
                  <span className="pack-price">$149 MXN</span>
                  <span className="pack-compare">$499</span>
                </div>
                <button type="button" className="btn btn-gold" style={{ width: '100%' }}>
                  Ver pack y simulador
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </article>

          <article className="pack-card is-nsdr" onClick={() => onOpenPacks('nsdr-protocol')} style={{ cursor: 'pointer' }}>
            <div className="pack-folio-band">
              <div className="pack-folio-top">
                <span className="pack-catalog-code">CUADERNO 03</span>
                <span className="pack-badge">Audio + Guía PDF</span>
              </div>
              <div className="pack-folio-spec">
                <div className="pack-folio-meta">
                  10 páginas + Audio 10 min
                  <span>Respiración guiada + Tarjeta</span>
                </div>
                <div className="pack-folio-emblem" aria-hidden="true">
                  <Shield size={20} strokeWidth={1.7} />
                </div>
              </div>
            </div>
            <div className="pack-body">
              <h3 className="pack-title">Guía para llegar con calma al examen</h3>
              <p className="pack-tagline">
                Audio de calma y manual práctico con respiración guiada para llegar tranquilo al examen, junto con tarjeta de bolsillo de 60 segundos.
              </p>
              <div className="pack-footer">
                <div className="pack-price-line">
                  <span className="pack-price">$79 MXN</span>
                  <span className="pack-compare">$199</span>
                </div>
                <button type="button" className="btn btn-obsidian" style={{ width: '100%' }}>
                  Escuchar muestra y abrir
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [sessionApiKey, setSessionApiKey] = useState<string>(() => getSessionApiKey());
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'unconfigured' | 'no-backend'>('checking');
  const [manualKeyInput, setManualKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('payment')) return 'kit';
    const tabParam = params.get('tab');
    if (tabParam === 'landing' || tabParam === 'diagnostic' || tabParam === 'tools' || tabParam === 'kit') {
      return tabParam;
    }
    return loadStoredMessages().length > 0 ? 'diagnostic' : 'landing';
  });
  const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages());
  const [hasStarted, setHasStarted] = useState<boolean>(() => loadStoredMessages().length > 0);
  const [inputText, setInputText] = useState('');
  const [quickAnswers, setQuickAnswers] = useState<Record<number, 'A' | 'B' | 'C'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCopied, setSidebarCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unlockedProducts, setUnlockedProducts] = useState<ProductId[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const confettiFiredRef = useRef<boolean>(false);
  const activeStreamSignalRef = useRef<{ cancelled: boolean } | null>(null);

  const progress = useMemo(() => deriveDiagnosticProgress(messages), [messages]);
  const contextualChips = useMemo(() => getContextualChips(messages, progress), [messages, progress]);
  const hasEvaluatorAccess = serverStatus === 'ready' || Boolean(sessionApiKey);
  const hasReactivosPack = unlockedProducts.includes('reactivos-pack');

  // Check DeepSeek config + verify any saved product tokens on mount
  useEffect(() => {
    const cycle = getUaaCycleContext();
    document.title = `Miguel Neftalí López · NEFTALÍ · EXANI-II ${cycle.shortCycleTag}`;
    let cancelled = false;

    const checkConfig = async () => {
      try {
        const res = await fetch('/api/chat');
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          if (!cancelled) setServerStatus('no-backend');
          return;
        }
        const data = (await res.json()) as { configured?: boolean };
        if (!cancelled) {
          setServerStatus(data.configured ? 'ready' : 'unconfigured');
          if (data.configured) setErrorMsg(null);
        }
      } catch {
        if (!cancelled) setServerStatus('no-backend');
      }
    };

    const verifySavedPurchases = async () => {
      try {
        const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const tokenList = Object.values(parsed).filter((v): v is string => typeof v === 'string' && v.length > 0);
        if (tokenList.length === 0) return;

        const res = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: tokenList }),
        });
        if (res.ok) {
          const data = (await res.json()) as { unlockedProductIds?: ProductId[] };
          if (!cancelled && Array.isArray(data.unlockedProductIds)) {
            setUnlockedProducts(data.unlockedProductIds);
          }
        }
      } catch {
        // Ignore offline/invalid token cache
      }
    };

    checkConfig();
    verifySavedPurchases();

    const stored = loadStoredMessages();
    if (stored.length > 0 && deriveDiagnosticProgress(stored).stage === 'completed') {
      confettiFiredRef.current = true;
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const streamModelResponse = useCallback(
    async (conversationHistory: Message[], retryPayload: string) => {
      if (activeStreamSignalRef.current) {
        activeStreamSignalRef.current.cancelled = true;
      }
      const signal = { cancelled: false };
      activeStreamSignalRef.current = signal;

      setIsLoading(true);
      setIsStreaming(false);

      const apiMessages: DeepSeekChatMessage[] = buildChatHistory(conversationHistory);

      try {
        let response: Response;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (serverStatus !== 'ready' && sessionApiKey) {
          headers['x-deepseek-key'] = sessionApiKey;
        }

        if (serverStatus === 'no-backend' && sessionApiKey) {
          response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [{ role: 'system', content: buildExaniSystemInstruction() }, ...apiMessages],
              stream: true,
              temperature: 0.7,
            }),
          });
        } else {
          response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({ messages: apiMessages }),
          });
        }

        if (!response.ok) {
          let serverError = `HTTP ${response.status}`;
          try {
            const errBody = (await response.json()) as { error?: string | { message?: string } };
            if (typeof errBody.error === 'string') {
              serverError = errBody.error;
            } else if (errBody.error?.message) {
              serverError = `${response.status}: ${errBody.error.message}`;
            }
          } catch {
            // Keep HTTP status fallback
          }
          throw new Error(serverError);
        }

        let accumulated = '';
        let createdBubble = false;

        const appendDelta = (part: string) => {
          if (signal.cancelled || !part) return;
          accumulated += part;
          if (!createdBubble) {
            createdBubble = true;
            setIsStreaming(true);
            setMessages((prev) => [...prev.filter((m) => !m.isError), { role: 'model', text: accumulated }]);
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === 'model' && !updated[lastIdx].isError) {
                updated[lastIdx] = { role: 'model', text: accumulated };
              }
              return updated;
            });
          }
        };

        const contentType = response.headers.get('content-type') || '';
        if (response.body && contentType.includes('text/event-stream')) {
          await consumeSseStream(response.body, appendDelta, signal);
        } else if (contentType.includes('application/json')) {
          const json = (await response.json()) as {
            rawSse?: string;
            choices?: Array<{ message?: { content?: string } }>;
          };
          const direct = json.choices?.[0]?.message?.content;
          if (direct) {
            appendDelta(direct);
          } else if (json.rawSse) {
            for (const line of json.rawSse.split('\n')) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith('data:')) continue;
              const payload = trimmedLine.slice(5).trim();
              if (payload === '[DONE]') break;
              try {
                const parsed = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) appendDelta(delta);
              } catch {
                // Ignore malformed SSE frames
              }
            }
          }
        }

        if (signal.cancelled) return;

        if (!accumulated.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'model',
              text: 'No se recibió respuesta del evaluador. Intenta de nuevo.',
              isError: true,
              retryText: retryPayload,
            },
          ]);
        }
      } catch (error) {
        if (signal.cancelled) return;
        console.error('DeepSeek streaming error:', error);
        setMessages((prev) => [
          ...prev.filter((m) => !(m.role === 'model' && m.text.trim() === '')),
          {
            role: 'model',
            text: formatApiError(error),
            isError: true,
            retryText: retryPayload,
          },
        ]);
      } finally {
        if (!signal.cancelled) {
          setIsStreaming(false);
          setIsLoading(false);
        }
      }
    },
    [serverStatus, sessionApiKey]
  );

  // Persist valid messages once generation finishes
  useEffect(() => {
    if (isLoading || isStreaming) return;
    const persistable = messages.filter((m) => !m.isError && m.text.trim() !== '');
    if (persistable.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [messages, isLoading, isStreaming]);

  // Fire subtle confetti when diagnostic report finishes
  useEffect(() => {
    if (!isLoading && !isStreaming && progress.stage === 'completed' && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 65,
        spread: 62,
        origin: { y: 0.72 },
        colors: ['#C96F4A', '#14532D', '#2E6B45', '#D9A441'],
      });
    }
  }, [isLoading, isStreaming, progress.stage]);

  const activeBlockKey = progress.activeBlock.join(',');
  useEffect(() => {
    setQuickAnswers({});
  }, [activeBlockKey]);

  useEffect(() => {
    if (activeTab === 'diagnostic') {
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth', block: 'end' });
    }
  }, [messages, isLoading, isStreaming, activeTab]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const navigateToTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startDiagnostic = async () => {
    navigateToTab('diagnostic');
    if (!hasEvaluatorAccess || isLoading) return;
    setHasStarted(true);
    await streamModelResponse([{ role: 'user', text: 'Hola' }], '__INIT__');
  };

  const sendUserMessage = async (textToSend: string, options?: { skipAddingUserBubble?: boolean }) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading || !hasEvaluatorAccess) return;

    setHasStarted(true);
    setQuickAnswers({});

    const cleanedBase = messages.filter((m) => !m.isError);
    const nextConversation: Message[] = options?.skipAddingUserBubble
      ? cleanedBase
      : [...cleanedBase, { role: 'user', text: trimmed }];

    setMessages(nextConversation);
    await streamModelResponse(nextConversation, trimmed);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    await sendUserMessage(text);
  };

  const handleSelectQuickOption = (qNum: number, option: 'A' | 'B' | 'C') => {
    const next = { ...quickAnswers, [qNum]: option };
    setQuickAnswers(next);

    const formatted = progress.activeBlock
      .filter((n) => next[n])
      .map((n) => `${n}-${next[n]}`)
      .join(', ');
    setInputText(formatted);
  };

  const handleRetry = async (retryText: string) => {
    if (isLoading) return;
    if (retryText === '__INIT__') {
      setMessages([]);
      await streamModelResponse([{ role: 'user', text: 'Hola' }], '__INIT__');
      return;
    }
    await sendUserMessage(retryText, { skipAddingUserBubble: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = async () => {
    if (activeStreamSignalRef.current) {
      activeStreamSignalRef.current.cancelled = true;
    }
    localStorage.removeItem(STORAGE_KEY);
    confettiFiredRef.current = false;
    setShowHelp(false);
    setDrawerOpen(false);
    setMessages([]);
    setInputText('');
    setQuickAnswers({});
    setHasStarted(false);
  };

  const handleSaveManualKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualKeyInput.trim();
    if (!cleaned) return;
    try {
      sessionStorage.setItem(SESSION_API_KEY_STORAGE, cleaned);
    } catch {
      // Ignore storage errors
    }
    setManualKeyInput('');
    setErrorMsg(null);
    setSessionApiKey(cleaned);
  };

  const handleClearSessionKey = () => {
    try {
      sessionStorage.removeItem(SESSION_API_KEY_STORAGE);
    } catch {
      // Ignore storage errors
    }
    localStorage.removeItem(STORAGE_KEY);
    setShowHelp(false);
    setDrawerOpen(false);
    setMessages([]);
    setHasStarted(false);
    setSessionApiKey('');
  };

  const handleSidebarCopyReport = async () => {
    if (!progress.latestReportText) return;
    try {
      await navigator.clipboard.writeText(progress.latestReportText);
      setSidebarCopied(true);
      setTimeout(() => setSidebarCopied(false), 2000);
    } catch {
      // Ignore clipboard unavailability
    }
  };

  const progressPercent =
    progress.stage === 'completed'
      ? 100
      : progress.stage === 'quiz'
        ? Math.max(12, Math.round((progress.answeredCount / 30) * 100))
        : progress.stage === 'onboarding'
          ? 8
          : 0;

  const canSend = !isLoading && inputText.trim().length > 0;
  const selectedInBlock = progress.activeBlock.filter((n) => quickAnswers[n]).length;

  return (
    <div className="platform-frame">
      {/* Top Editorial Navbar */}
      <header className="top-navbar">
        <div className="top-navbar-inner">
          <div className="nav-brand-left">
            {activeTab === 'diagnostic' && (
              <button
                type="button"
                className="icon-btn mobile-menu-btn"
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir progreso del diagnóstico"
              >
                <Menu size={18} />
              </button>
            )}

            <button
              type="button"
              className="brand-logo-btn"
              onClick={() => navigateToTab('landing')}
              aria-label="Ir al inicio"
            >
              <div className="monogram-box">N</div>
              <div className="monogram-text">
                <span className="monogram-name">NEFTALÍ</span>
                <span className="monogram-role">Miguel Neftalí López · EXANI-II UAA</span>
              </div>
            </button>
          </div>

          <nav className="top-nav-links" aria-label="Navegación principal">
            <button
              type="button"
              className={`top-nav-link ${activeTab === 'landing' ? 'is-active' : ''}`}
              onClick={() => navigateToTab('landing')}
            >
              Inicio
            </button>
            <button
              type="button"
              className={`top-nav-link ${activeTab === 'diagnostic' ? 'is-active' : ''}`}
              onClick={() => navigateToTab('diagnostic')}
            >
              Diagnóstico
            </button>
            <button
              type="button"
              className={`top-nav-link ${activeTab === 'tools' ? 'is-active' : ''}`}
              onClick={() => navigateToTab('tools')}
            >
              Herramientas
            </button>
            <button
              type="button"
              className={`top-nav-link ${activeTab === 'kit' ? 'is-active' : ''}`}
              onClick={() => navigateToTab('kit')}
            >
              Cuadernos
              {unlockedProducts.length > 0 && <span className="nav-dot-unlocked" title="Tienes cuadernos desbloqueados" />}
            </button>
          </nav>

          <div className="top-nav-right">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowHelp(true)}
              aria-label="Ayuda y privacidad"
              title="Guía y privacidad"
            >
              <HelpCircle size={18} />
            </button>
            <button
              type="button"
              className="btn btn-gold btn-nav-cta"
              onClick={() => {
                navigateToTab('diagnostic');
                if (!hasStarted && hasEvaluatorAccess && !isLoading) {
                  void startDiagnostic();
                }
              }}
            >
              Iniciar diagnóstico
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'landing' ? (
        <LandingView
          onStartDiagnostic={() => {
            navigateToTab('diagnostic');
            if (!hasStarted && hasEvaluatorAccess && !isLoading) {
              void startDiagnostic();
            }
          }}
          onOpenTools={() => navigateToTab('tools')}
          onOpenPacks={() => navigateToTab('kit')}
        />
      ) : activeTab === 'tools' ? (
        <StudyTools hasReactivosPack={hasReactivosPack} onOpenPacks={() => navigateToTab('kit')} />
      ) : activeTab === 'kit' ? (
        <StudyKitSection
          latestReportText={progress.latestReportText}
          onUnlockedProductsChange={setUnlockedProducts}
        />
      ) : (
        <div className="app-shell">
          {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

          {/* Left Context & Progress Sidebar */}
          <aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Progreso del diagnóstico">
            <div>
              <div className="sidebar-label">Avance Diagnóstico EXANI-II</div>
              <div className="progress-panel">
                <div className="progress-header">
                  <span className="progress-title">Reactivos resueltos</span>
                  <span className="progress-count">{progress.answeredCount} / 30</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className="stage-list">
                  <div
                    className={`stage-item ${
                      progress.stage === 'quiz' || progress.stage === 'completed'
                        ? 'is-done'
                        : progress.stage === 'onboarding'
                          ? 'is-active'
                          : ''
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    <span>1. Perfil del aspirante</span>
                  </div>
                  <div
                    className={`stage-item ${
                      progress.stage === 'completed' ? 'is-done' : progress.stage === 'quiz' ? 'is-active' : ''
                    }`}
                  >
                    <BookOpen size={15} />
                    <span>2. Cuestionario (30 reactivos)</span>
                  </div>
                  <div className={`stage-item ${progress.stage === 'completed' ? 'is-done' : ''}`}>
                    <Compass size={15} />
                    <span>3. Diagnóstico &amp; Plan UAA</span>
                  </div>
                </div>

                <div className="module-pills">
                  <div
                    className={`module-pill ${
                      progress.answeredCount >= 10 || progress.stage === 'completed'
                        ? 'is-done'
                        : progress.stage === 'quiz' && progress.answeredCount < 10
                          ? 'is-active'
                          : ''
                    }`}
                  >
                    <strong>Lectura</strong>
                    <span>1–10</span>
                  </div>
                  <div
                    className={`module-pill ${
                      progress.answeredCount >= 20 || progress.stage === 'completed'
                        ? 'is-done'
                        : progress.answeredCount >= 10 && progress.answeredCount < 20
                          ? 'is-active'
                          : ''
                    }`}
                  >
                    <strong>Analítico</strong>
                    <span>11–20</span>
                  </div>
                  <div
                    className={`module-pill ${
                      progress.stage === 'completed'
                        ? 'is-done'
                        : progress.answeredCount >= 20 && progress.answeredCount < 30
                          ? 'is-active'
                          : ''
                    }`}
                  >
                    <strong>Redacción</strong>
                    <span>21–30</span>
                  </div>
                </div>
              </div>
            </div>

            <figure className="neftali-fig" style={{ marginTop: '16px' }}>
              <img
                src="/ilustraciones/farol.png"
                onError={(e) => { const fig = e.currentTarget.closest('figure'); if (fig) { (fig as HTMLElement).style.display = 'none'; } else { e.currentTarget.style.display = 'none'; } }}
                alt="Farol en un sendero: claridad paso a paso en tu diagnóstico"
                loading="lazy"
              />
              <figcaption className="neftali-fig-cap">El camino se ve paso a paso.</figcaption>
            </figure>

            <div>
              <div className="sidebar-actions">
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => {
                    navigateToTab('kit');
                    setDrawerOpen(false);
                  }}
                >
                  <FileText size={15} />
                  Cuadernos PDF &amp; Audio WAV
                </button>

                <a
                  className="btn btn-gold"
                  href="https://wa.me/524494959259?text=Hola%20Miguel%2C%20quiero%20informaci%C3%B3n%20de%20la%20Mentor%C3%ADa%20EXANI-UAA"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={15} />
                  Mentoría EXANI-UAA · 4 sesiones · $1,600
                </a>
                <a className="btn btn-secondary" href="https://wa.me/524494959259" target="_blank" rel="noreferrer">
                  <MessageCircle size={15} />
                  Escríbeme por WhatsApp
                </a>

                {progress.latestReportText && (
                  <>
                    <button type="button" className="btn btn-emerald" onClick={handleSidebarCopyReport}>
                      {sidebarCopied ? <Check size={15} /> : <Copy size={15} />}
                      {sidebarCopied ? 'Reporte Copiado' : 'Copiar Diagnóstico'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => downloadReportAsText(progress.latestReportText!)}
                    >
                      <Download size={15} />
                      Descargar Resumen (.txt)
                    </button>
                  </>
                )}

                {hasStarted && (
                  <button
                    type="button"
                    className="btn btn-danger-soft"
                    onClick={() => {
                      setDrawerOpen(false);
                      setShowHelp(true);
                    }}
                  >
                    <RotateCcw size={15} />
                    Reiniciar Diagnóstico
                  </button>
                )}
              </div>

              <div className="privacy-note" style={{ marginTop: '14px' }}>
                <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--gold-400)' }} />
                <span>
                  <strong>Privacidad local:</strong> Tus respuestas se guardan solo en tu dispositivo.
                </span>
              </div>
            </div>
          </aside>

          {/* Chat Evaluation Viewport */}
          <main className="chat-main">
            {(!hasEvaluatorAccess && serverStatus !== 'checking') || errorMsg ? (
              <div className="messages-viewport">
                <div className="setup-card" style={{ margin: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div className="monogram-box">
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <h1 className="modal-title-serif" style={{ margin: 0, fontSize: '21px' }}>
                        Activar Evaluador Diagnóstico
                      </h1>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Herramientas, Simulador y Cuadernos están activos sin configuración adicional.
                      </p>
                    </div>
                  </div>

                  <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    {errorMsg ||
                      'Configura la variable DEEPSEEK_API_KEY en el servidor (Vercel Environment Variables o .env.local) para habilitar el cuestionario adaptativo de 30 reactivos.'}
                  </p>

                  <form onSubmit={handleSaveManualKey} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label htmlFor="manual-api-key" className="field-label">
                      O ingresa una clave de DeepSeek temporal para esta sesión:
                    </label>
                    <input
                      id="manual-api-key"
                      type="password"
                      value={manualKeyInput}
                      onChange={(e) => setManualKeyInput(e.target.value)}
                      placeholder="sk-..."
                      className="field-input"
                    />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="submit" className="btn btn-gold" disabled={!manualKeyInput.trim()}>
                        Activar Evaluador
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => navigateToTab('tools')}>
                        <Compass size={15} />
                        Ir a Herramientas
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <>
                <div className="messages-viewport">
                  {!hasStarted && messages.length === 0 ? (
                    <section className="welcome-card" aria-label="Bienvenida al diagnóstico">
                      <figure className="neftali-fig" style={{ maxWidth: '320px' }}>
                        <img
                          src="/ilustraciones/libro-pregunta.png"
                          onError={(e) => { const fig = e.currentTarget.closest('figure'); if (fig) { (fig as HTMLElement).style.display = 'none'; } else { e.currentTarget.style.display = 'none'; } }}
                          alt="Libro abierto y nube de pensamiento: examina tus ideas antes de responder"
                          loading="lazy"
                        />
                      </figure>
                      <div className="welcome-eyebrow">NEFTALÍ · Evaluación inicial · EXANI-II {getUaaCycleContext().shortCycleTag}</div>
                      <h1 className="welcome-h1">Descubre tu puntaje estimado EXANI-II en 10 minutos</h1>
                      <p className="welcome-desc">
                        Evaluación guiada con el método de Miguel Neftalí López. Resuelve 30 reactivos clave paso a paso y combina tu reporte con nuestro simulador de 50 reactivos y cuadernos descargables.
                      </p>

                      <div className="welcome-cta-row">
                        <button type="button" className="btn btn-gold" onClick={startDiagnostic} disabled={isLoading}>
                          Comenzar Diagnóstico Gratis
                          <ArrowRight size={16} />
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigateToTab('kit')}>
                          <FileText size={15} />
                          Ver Cuadernos Descargables
                        </button>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '14px' }}>
                        Al comenzar aceptas el{' '}
                        <a href="/aviso-de-privacidad.html" target="_blank" rel="noreferrer">
                          aviso de privacidad
                        </a>
                        . Tus respuestas se guardan solo en tu dispositivo. Si tienes menos de 18 años, haz el diagnóstico con el conocimiento de tu padre, madre o tutor.
                      </p>
                    </section>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <MessageBubble
                          key={idx}
                          message={msg}
                          isStreamingBubble={isStreaming && idx === messages.length - 1 && msg.role === 'model' && !msg.isError}
                          onRetry={handleRetry}
                          onOpenKit={() => setActiveTab('kit')}
                          isLoading={isLoading}
                        />
                      ))}

                      {isLoading && !isStreaming && (
                        <div className="msg-row is-model">
                          <div className="msg-avatar" aria-hidden="true">
                            <GraduationCap size={16} />
                          </div>
                          <div className="msg-bubble">
                            <div className="typing-dots" aria-label="Preparando respuesta">
                              <span className="typing-dot" />
                              <span className="typing-dot" />
                              <span className="typing-dot" />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Interactive Composer Dock */}
                <div className="composer-dock">
                  {!isLoading && progress.activeBlock.length > 0 && (
                    <div className="quick-answer-bar" aria-label="Selector rápido de respuestas">
                      <div className="quick-answer-top">
                        <span className="quick-answer-title">
                          <CheckCircle2 size={14} />
                          Respuestas rápidas ({selectedInBlock}/{progress.activeBlock.length}):
                        </span>
                        {selectedInBlock > 0 && (
                          <button
                            type="button"
                            className="btn btn-emerald btn-sm"
                            onClick={handleSend}
                          >
                            Enviar bloque ({selectedInBlock}/{progress.activeBlock.length})
                          </button>
                        )}
                      </div>

                      <div className="quick-answer-grid">
                        {progress.activeBlock.map((qNum) => (
                          <div key={qNum} className="q-selector-item">
                            <span className="q-num">{qNum}</span>
                            {(['A', 'B', 'C'] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                className={`option-pill ${quickAnswers[qNum] === opt ? 'is-selected' : ''}`}
                                onClick={() => handleSelectQuickOption(qNum, opt)}
                                aria-pressed={quickAnswers[qNum] === opt}
                                aria-label={`Pregunta ${qNum} opción ${opt}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isLoading && hasStarted && contextualChips.length > 0 && (
                    <div className="quick-chips" aria-label="Sugerencias rápidas">
                      {contextualChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          className="chip-btn"
                          onClick={() => sendUserMessage(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="composer-row">
                    <div className="composer-input-wrap">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        className="composer-textarea"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          progress.activeBlock.length > 0
                            ? 'Selecciona arriba o escribe (ej: 1-A, 2-B, 3-C...)'
                            : 'Escribe tu respuesta aquí...'
                        }
                        disabled={isLoading}
                        aria-label="Escribe tu respuesta"
                      />
                    </div>

                    <button
                      type="button"
                      className="send-btn"
                      onClick={handleSend}
                      disabled={!canSend}
                      aria-label="Enviar mensaje"
                      title="Enviar"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      )}

      {/* NEFTALÍ · Consultoría filosófica 1 a 1 */}
      <section className="neftali-band" aria-label="Consultoría filosófica NEFTALÍ">
        <div className="neftali-band-media">
          <div>
            <div className="section-eyebrow">NEFTALÍ · Pensamiento aplicado a la vida real</div>
        <h2>¿Y si lo que tienes que decidir no es el examen?</h2>
        <p>
          Sesión de consultoría filosófica 1 a 1 de 60 minutos, en Aguascalientes u online: $400 MXN IVA incluido,
          pago anticipado y cancelación gratuita con 24 h de aviso. Sin cargo si en los primeros 15 minutos se decide
          derivar. Cinco diálogos: decisión, vocación, culpa, muerte y fe. No es terapia. Lic. en Filosofía, cédula
          profesional 15424282.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <a
            className="btn btn-gold"
            href="https://cal.com/miguel-neftali-lopez-wnkrwr/consultoria"
            target="_blank"
            rel="noreferrer"
          >
            Agenda tu sesión · $400
            <ArrowRight size={14} />
          </a>
          <a className="btn btn-secondary" href="https://wa.me/524494959259" target="_blank" rel="noreferrer">
            <MessageCircle size={15} />
            Pregunta por WhatsApp
          </a>
        </div>
          </div>
          <figure className="neftali-fig" style={{ maxWidth: '320px', margin: 0, flexShrink: 0 }}>
            <img
              src="/ilustraciones/conversacion.png"
              onError={(e) => { const fig = e.currentTarget.closest('figure'); if (fig) { (fig as HTMLElement).style.display = 'none'; } else { e.currentTarget.style.display = 'none'; } }}
              alt="Dos personas conversando con tazas: una sesión de consultoría filosófica 1 a 1"
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      <footer className="neftali-footer">
        NEFTALÍ · Pensamiento aplicado a la vida real — Miguel Neftalí López, Lic. en Filosofía, cédula profesional
        15424282 ·{' '}
        <a href="/aviso-de-privacidad.html" target="_blank" rel="noreferrer">
          Aviso de privacidad
        </a>{' '}
        ·{' '}
        <a href="https://wa.me/524494959259" target="_blank" rel="noreferrer">
          WhatsApp
        </a>{' '}
        ·{' '}
        <a href="https://cal.com/miguel-neftali-lopez-wnkrwr/consultoria" target="_blank" rel="noreferrer">
          Agenda tu sesión
        </a>
      </footer>

      {showHelp && (
        <HelpModal
          onClose={() => setShowHelp(false)}
          onReset={resetChat}
          hasManualSessionKey={serverStatus !== 'ready' && Boolean(sessionApiKey)}
          onClearSessionKey={handleClearSessionKey}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);