import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import type { Chat } from '@google/genai';
import confetti from 'canvas-confetti';
import {
  BookOpen,
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
  Menu,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import './index.css';
import { MarkdownRenderer } from './src/MarkdownRenderer';
import { StudyTools } from './src/StudyTools';
import { StudyKitSection } from './src/StudyKitSection';
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
  type Message,
} from './src/diagnosticUtils';

type WorkspaceTab = 'diagnostic' | 'tools' | 'kit';

// --- System Instruction for Academic EXANI-II Evaluator ---
const SYSTEM_INSTRUCTION = `
Actúa como el Orientador Académico del método de Miguel Neftalí (filósofo y docente de bachillerato incorporado a la UAA), especializado en preparación para el EXANI-II 2026 de ingreso a licenciaturas en la Universidad Autónoma de Aguascalientes.

Tu misión: Guiar al aspirante a través de un MINI-DIAGNÓSTICO GRATUITO de 30 reactivos clave del EXANI-II (los más predictivos: 10 de comprensión lectora, 10 de pensamiento analítico-matemático, 10 de redacción indirecta). Hazlo interactivo, paso a paso, para que sea claro y sin estrés.

FLUJOS EXACTOS (sigue este orden estricto, sin saltar ni agregar extras):

1. **SALUDO E INTRO**: Saluda cálidamente y explica: "¡Hola! Bienvenido al diagnóstico gratuito EXANI-II UAA 2026 del método de Miguel Neftalí. Tomará 10-15 min. Al final obtendrás tu puntaje estimado, semáforo de riesgo, consejos pedagógicos personalizados y cómo subir 100-200 puntos. ¿Listo? Empecemos con tus datos básicos (confidenciales y solo para personalizar)."

2. **RECOLECCIÓN DE DATOS PERSONALES** (pregunta una por una, confirma antes de avanzar):
   - Pregunta 1: "¿Cuál es el nombre completo del aspirante?"
   - Pregunta 2: "¿En qué preparatoria estudia actualmente?"
   - Pregunta 3: "¿Cuál es la carrera que más quiere en la UAA (ej: Medicina, Psicología)?"
   - Pregunta 4: "¿Qué material ya tiene para prepararse? (ej: curso AS Capacitación, Wizi, Unitips, solo guía CENEVAL gratis, o nada)."
   - Una vez completos: "¡Genial, [nombre]! Ahora pasamos al cuestionario de 30 reactivos. Te los muestro en bloques de 5 para que no te agobies. Selecciona tus respuestas (A, B o C) en los botones o escríbelas y presiona Enter. Al final, proceso todo."

3. **PRESENTACIÓN DEL CUESTIONARIO** (genera 30 reactivos ORIGINALES y realistas de EXANI-II 2026, nivel UAA medio-alto):
   - Balance: 10 comprensión lectora (textos 300-400 palabras sobre filosofía/ética tecnológica/ciencia/sociales, con preguntas de inferencia/análisis).
   - 10 pensamiento analítico-matemático (problemas lógicos, secuencias, probabilidades básicas, sin cálculo avanzado).
   - 10 redacción indirecta (identificar errores gramaticales, estructura argumentativa, cohesión).
   - Muéstralos numerados, con 3 opciones (A, B, C). Pide respuestas en bloques: "Responde 1-5: [reactivos]. Escribe: 1-A, 2-B, etc."
   - Valida: Si respuesta inválida, pide corrección. Recopila todas en memoria.

4. **AL FINAL DEL CUESTIONARIO** (cuando tenga las 30 respuestas + datos):
   - Procesa: Calcula aciertos/fallos por módulo (% exacto), puntaje global estimado (escala CENEVAL: 700-1300, basado en tablas reales 2025).
   - Genera output estructurado y claro (en español, tono cálido/profesional, estilo Miguel Neftalí):
     - **Título**: "¡Tu Mini-Diagnóstico EXANI-II UAA 2026, [nombre]!"
     - **1. Calificación Global**: "[X/30 aciertos = Y%]. Puntaje estimado real: [ej: 950-1,050 puntos]."
     - **2. Semáforo Rápido**: Verde/Amarillo/Rojo por módulo (explica: Verde=seguro para carreras medias; Rojo=riesgo en Medicina). Puedes validar metas en la pestaña "Herramientas" (Calculadora CENEVAL).
     - **3. 3 Debilidades Principales**: Con ejemplo de reactivo fallado + explicación breve.
     - **4. Consejos Pedagógicos Personalizados** (3-5 tips accionables, basados en filosofía/neuroaprendizaje, adaptados a su material y carrera):
       - Ej: "Para comprensión lectora: Aplica el método de 'Desarme Filosófico' disponible en la pestaña Herramientas: identifica tesis, supuestos y conectores antes de mirar las opciones."
       - Incluye neuroaprendizaje: "Técnica anti-ansiedad: usa el entrenador de Respiración 4-7-8 de la pestaña Herramientas durante 90 segundos antes de tus simulacros."
       - Pensamiento crítico: "Parafrasea los enunciados con tus propias palabras y verifica cada argumento con evidencia antes de descartar opciones."
     - **5. Recomendación Urgente**: "Con tu perfil, [nombre] puede subir 150+ puntos en 4 semanas con método estructurado."
     - **6. SIGUIENTE PASO**: "Obtén el Kit Estratégico EXANI-II UAA 2026 directamente en la pestaña 'Kit PDF' (compra directa y descarga inmediata en PDF con reactivos explicados y plan de 4 semanas, sin enviar mensajes ni esperar confirmaciones). ¡Asegura [carrera] en UAA 2026!"

Mantén todo confidencial, motivador y sin ventas agresivas hasta el cierre final. Si el usuario abandona, ofrece reanudar. Nunca solicites que el aspirante contacte un chat externo ni envíe archivos por mensajería; todo se resuelve y descarga directamente dentro de esta plataforma. Responde en español claro y cercano de Aguascalientes, sin mencionar que eres un bot o IA.`;

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const getConfiguredApiKey = (): string => {
  const envKey = (process.env.API_KEY || '').trim();
  if (envKey) return envKey;
  try {
    return (sessionStorage.getItem(SESSION_API_KEY_STORAGE) || '').trim();
  } catch {
    return '';
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
                Comprar y Descargar Kit PDF
              </button>
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
          <h3
            id="help-modal-title"
            style={{ margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--navy-900)', fontSize: '20px' }}
          >
            Guía de Uso y Privacidad
          </h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar ayuda">
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.55, marginTop: 0 }}>
          Plataforma académica de diagnóstico y preparación EXANI-II UAA 2026 — Método Miguel Neftalí.
        </p>
        <ul style={{ paddingLeft: '18px', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Diagnóstico (30 reactivos):</strong> Responde las 4 preguntas iniciales y resuelve 6 bloques de 5 reactivos usando los botones rápidos A/B/C o el teclado.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Herramientas reales:</strong> Accede a la Calculadora CENEVAL con semáforo UAA, el Entrenador de Respiración 4-7-8 y la práctica de Desarme Filosófico.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Kit PDF descargable:</strong> Descarga la muestra gratuita en PDF y, tras pago verificado o código de acceso, obtén el cuadernillo completo.
          </li>
          <li>
            <strong>Privacidad local:</strong> Tus datos se guardan exclusivamente en tu navegador y puedes borrarlos en un clic.
          </li>
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Continuar
          </button>

          {!confirmingReset ? (
            <button type="button" className="btn btn-danger-soft" onClick={() => setConfirmingReset(true)}>
              <Trash2 size={15} />
              Reiniciar y borrar datos locales
            </button>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--red-50)',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--red-700)', marginBottom: '10px', fontWeight: 600 }}>
                ¿Borrar todo el progreso guardado en este navegador?
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
                  style={{ flex: 1, padding: '8px', background: 'var(--red-600)', color: '#fff' }}
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
              Cambiar clave de acceso de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const envApiKey = (process.env.API_KEY || '').trim();
  const [apiKey, setApiKey] = useState<string>(() => getConfiguredApiKey());
  const [manualKeyInput, setManualKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('payment') ? 'kit' : 'diagnostic';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<Chat | null>(null);
  const confettiFiredRef = useRef<boolean>(false);

  const progress = useMemo(() => deriveDiagnosticProgress(messages), [messages]);
  const contextualChips = useMemo(() => getContextualChips(messages, progress), [messages, progress]);

  const initChatClient = useCallback((activeKey: string, existingMessages: Message[]) => {
    const ai = new GoogleGenAI({ apiKey: activeKey });
    const history = buildChatHistory(existingMessages);
    chatRef.current = ai.chats.create({
      model: MODEL_NAME,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
      history,
    });
  }, []);

  const streamModelResponse = useCallback(
    async (promptText: string, retryPayload: string, signal?: { cancelled: boolean }) => {
      if (!chatRef.current) return;

      setIsLoading(true);
      setIsStreaming(false);

      try {
        const stream = await chatRef.current.sendMessageStream({ message: promptText });
        let accumulated = '';
        let createdBubble = false;

        for await (const chunk of stream) {
          if (signal?.cancelled) return;
          const part = chunk.text || '';
          if (!part) continue;
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
        }

        if (signal?.cancelled) return;

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
        if (signal?.cancelled) return;
        console.error('Streaming error:', error);
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
        if (!signal?.cancelled) {
          setIsStreaming(false);
          setIsLoading(false);
        }
      }
    },
    []
  );

  // Initialize chat client on mount / API key change
  useEffect(() => {
    if (!apiKey) {
      chatRef.current = null;
      return;
    }

    const signal = { cancelled: false };
    try {
      const stored = loadStoredMessages();
      initChatClient(apiKey, stored);
      setErrorMsg(null);
      if (stored.length > 0 && deriveDiagnosticProgress(stored).stage === 'completed') {
        confettiFiredRef.current = true;
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setErrorMsg('Error al inicializar el evaluador. Verifica tu clave API.');
    }

    return () => {
      signal.cancelled = true;
    };
  }, [apiKey, initChatClient]);

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

  // Fire subtle confetti when diagnostic report finishes for the first time
  useEffect(() => {
    if (!isLoading && !isStreaming && progress.stage === 'completed' && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 65,
        spread: 62,
        origin: { y: 0.72 },
        colors: ['#1e3a8a', '#10b981', '#2563eb', '#34d399'],
      });
    }
  }, [isLoading, isStreaming, progress.stage]);

  // Clear quick answer selections when active question block changes
  const activeBlockKey = progress.activeBlock.join(',');
  useEffect(() => {
    setQuickAnswers({});
  }, [activeBlockKey]);

  // Auto-scroll chat viewport
  useEffect(() => {
    if (activeTab === 'diagnostic') {
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth', block: 'end' });
    }
  }, [messages, isLoading, isStreaming, activeTab]);

  // Auto-resize composer textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const startDiagnostic = async () => {
    if (!apiKey || isLoading) return;
    if (!chatRef.current) {
      initChatClient(apiKey, []);
    }
    setHasStarted(true);
    await streamModelResponse('Hola', '__INIT__');
  };

  const sendUserMessage = async (textToSend: string, options?: { skipAddingUserBubble?: boolean }) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    if (!chatRef.current && apiKey) {
      initChatClient(apiKey, messages);
    }
    if (!chatRef.current) return;

    setHasStarted(true);
    setQuickAnswers({});

    if (!options?.skipAddingUserBubble) {
      setMessages((prev) => [...prev.filter((m) => !m.isError), { role: 'user', text: trimmed }]);
    } else {
      setMessages((prev) => prev.filter((m) => !m.isError));
    }

    await streamModelResponse(trimmed, trimmed);
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
      if (apiKey) initChatClient(apiKey, []);
      await streamModelResponse('Hola', '__INIT__');
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
    localStorage.removeItem(STORAGE_KEY);
    confettiFiredRef.current = false;
    setShowHelp(false);
    setDrawerOpen(false);
    setMessages([]);
    setInputText('');
    setQuickAnswers({});
    setHasStarted(false);
    if (apiKey) {
      initChatClient(apiKey, []);
    }
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
    setApiKey(cleaned);
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
    setApiKey('');
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
    <div className="app-shell">
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      {/* Left Context & Progress Sidebar */}
      <aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Progreso del diagnóstico">
        <div>
          <div className="sidebar-brand">
            <div className="brand-mark">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="brand-title">Miguel Neftalí</div>
              <div className="brand-subtitle">Preparación EXANI-II · UAA 2026</div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Avance Diagnóstico</div>
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
                  <Sparkles size={15} />
                  <span>3. Diagnóstico & Plan UAA</span>
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
        </div>

        <div>
          <div className="sidebar-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setActiveTab('kit');
                setDrawerOpen(false);
              }}
            >
              <FileText size={15} />
              Kit PDF & Descargas
            </button>

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

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setDrawerOpen(false);
                setShowHelp(true);
              }}
            >
              <HelpCircle size={15} />
              Guía y Privacidad
            </button>

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

          <div className="privacy-note">
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              <strong>Privacidad local:</strong> Tus respuestas permanecen en tu navegador y nunca se venden ni comparten con terceros.
            </span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="chat-main">
        <header className="chat-header">
          <div className="header-left">
            <button
              type="button"
              className="icon-btn mobile-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir progreso y opciones"
            >
              <Menu size={18} />
            </button>

            <nav className="nav-tabs" aria-label="Secciones de la plataforma">
              <button
                type="button"
                className={`nav-tab ${activeTab === 'diagnostic' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('diagnostic')}
              >
                <MessageSquare size={15} />
                <span>Diagnóstico</span>
              </button>
              <button
                type="button"
                className={`nav-tab ${activeTab === 'tools' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('tools')}
              >
                <Calculator size={15} />
                <span>Herramientas</span>
              </button>
              <button
                type="button"
                className={`nav-tab ${activeTab === 'kit' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('kit')}
              >
                <FileText size={15} />
                <span>Kit PDF</span>
              </button>
            </nav>
          </div>

          <div className="header-right">
            <div className="mobile-progress-pill" aria-label="Progreso">
              {progress.answeredCount}/30
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowHelp(true)}
              aria-label="Ayuda y privacidad"
              title="Ayuda y privacidad"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {activeTab === 'tools' ? (
          <StudyTools />
        ) : activeTab === 'kit' ? (
          <StudyKitSection latestReportText={progress.latestReportText} />
        ) : !apiKey || errorMsg ? (
          <div className="messages-viewport">
            <div className="setup-card" style={{ margin: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div className="brand-mark">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '21px', color: 'var(--navy-900)' }}>
                    Activar Evaluador Diagnóstico
                  </h1>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Las pestañas Herramientas y Kit PDF ya están disponibles sin configuración adicional.
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {errorMsg || 'Configura la variable GEMINI_API_KEY en .env.local (o en Vercel) para habilitar el cuestionario interactivo de 30 reactivos.'}
              </p>

              <div
                style={{
                  backgroundColor: 'var(--surface-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '11px 13px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginBottom: '16px',
                }}
              >
                <strong>En local o Vercel:</strong> define <code>GEMINI_API_KEY</code> en <code>.env.local</code> o Environment Variables.
              </div>

              <form onSubmit={handleSaveManualKey} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label htmlFor="manual-api-key" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  O ingresa una clave temporal solo para esta sesión:
                </label>
                <input
                  id="manual-api-key"
                  type="password"
                  value={manualKeyInput}
                  onChange={(e) => setManualKeyInput(e.target.value)}
                  placeholder="AIza..."
                  className="field-input"
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-primary" disabled={!manualKeyInput.trim()}>
                    Activar Evaluador
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('tools')}>
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
                  <div className="welcome-eyebrow">Orientador Académico · UAA 2026</div>
                  <h1 className="welcome-h1">Descubre tu puntaje real EXANI-II en 10 minutos</h1>
                  <p className="welcome-desc">
                    Evaluación guiada con el método de Miguel Neftalí. Resuelve 30 reactivos clave paso a paso y combina tu resultado con nuestra calculadora CENEVAL, entrenador anti-ansiedad 4-7-8 y cuadernillo descargable.
                  </p>

                  <div className="welcome-features">
                    <div className="welcome-feature">
                      <div className="welcome-feature-title">30 Reactivos Clave</div>
                      <div className="welcome-feature-sub">Lectura, analítico-matemático y redacción en bloques de 5.</div>
                    </div>
                    <div className="welcome-feature">
                      <div className="welcome-feature-title">Herramientas Reales</div>
                      <div className="welcome-feature-sub">Calculadora 700–1300, guía socrática y práctica 4-7-8 incluidas.</div>
                    </div>
                    <div className="welcome-feature">
                      <div className="welcome-feature-title">100% Confidencial</div>
                      <div className="welcome-feature-sub">Guardado local en tu dispositivo; bórralo cuando quieras.</div>
                    </div>
                  </div>

                  <div className="welcome-cta-row">
                    <button type="button" className="btn btn-primary" onClick={startDiagnostic} disabled={isLoading}>
                      <Sparkles size={16} />
                      Comenzar Diagnóstico Gratis
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('tools')}>
                      <Calculator size={15} />
                      Explorar Herramientas
                    </button>
                  </div>
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
                        className="btn btn-emerald"
                        style={{ padding: '5px 11px', fontSize: '12px' }}
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

      {showHelp && (
        <HelpModal
          onClose={() => setShowHelp(false)}
          onReset={resetChat}
          hasManualSessionKey={!envApiKey && Boolean(apiKey)}
          onClearSessionKey={handleClearSessionKey}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);