export interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  retryText?: string;
}

export interface DeepSeekChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type DiagnosticStage = 'intro' | 'onboarding' | 'quiz' | 'completed';

export interface DiagnosticProgress {
  stage: DiagnosticStage;
  answeredCount: number;
  activeBlock: number[];
  latestReportText: string | null;
}

export const STORAGE_KEY = 'miguelbot_chat_session_v2';
export const SESSION_API_KEY_STORAGE = 'miguelbot_session_deepseek_key';

export const formatApiError = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  const lower = msg.toLowerCase();

  if (
    lower.includes('402') ||
    lower.includes('insufficient balance') ||
    lower.includes('saldo suficiente')
  ) {
    return 'La cuenta de DeepSeek no tiene saldo suficiente. Verifica tu balance o clave API.';
  }
  if (
    lower.includes('api_key') ||
    lower.includes('api key') ||
    lower.includes('authentication') ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized')
  ) {
    return 'La clave API de DeepSeek no es válida o no tiene permisos. Verifica DEEPSEEK_API_KEY e intenta de nuevo.';
  }
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return 'Se alcanzó el límite temporal de solicitudes de DeepSeek. Espera unos segundos e intenta de nuevo.';
  }
  if (lower.includes('404') || lower.includes('not found') || lower.includes('model')) {
    return 'El modelo configurado en DEEPSEEK_MODEL no está disponible actualmente.';
  }
  if (msg.trim() && msg.length < 180 && !lower.includes('failed to fetch')) {
    return msg;
  }
  return 'Hubo un error de conexión con el evaluador académico. Por favor intenta de nuevo.';
};

export const buildChatHistory = (messages: Message[]): DeepSeekChatMessage[] => {
  const validMessages = messages.filter(
    (m) =>
      !m.isError &&
      (m.role === 'user' || m.role === 'model') &&
      typeof m.text === 'string' &&
      m.text.trim() !== ''
  );

  if (validMessages.length === 0) return [];

  const history: DeepSeekChatMessage[] = [];
  if (validMessages[0].role === 'model') {
    history.push({ role: 'user', content: 'Hola' });
  }

  for (const msg of validMessages) {
    const apiRole: 'user' | 'assistant' = msg.role === 'user' ? 'user' : 'assistant';
    const last = history[history.length - 1];
    if (last && last.role === apiRole) {
      last.content = `${last.content}\n\n${msg.text}`.trim();
    } else {
      history.push({ role: apiRole, content: msg.text });
    }
  }

  return history;
};

export const loadStoredMessages = (): Message[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Message =>
        Boolean(m) &&
        (m.role === 'user' || m.role === 'model') &&
        typeof m.text === 'string' &&
        m.text.trim() !== '' &&
        !m.isError
    );
  } catch (e) {
    console.error('Error parsing stored history', e);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

export const isDiagnosticReport = (text: string): boolean => {
  if (!text || text.length < 220) return false;
  const lower = text.toLowerCase();
  const signals = [
    'calificación global',
    'puntaje estimado',
    'semáforo',
    'debilidades principales',
    'consejos pedagógicos',
    'mini-diagnóstico exani-ii',
  ];
  const matches = signals.filter((s) => lower.includes(s)).length;
  return matches >= 2;
};

export const detectActiveQuestionBlock = (text: string): number[] => {
  if (!text || isDiagnosticReport(text)) return [];

  const hasChoiceOptions =
    /(?:^|\n)\s*(?:\*\*)?[ABC][).:\]]/m.test(text) ||
    /\bA[).]|\bB[).]|\bC[).]/g.test(text);

  if (!hasChoiceOptions) return [];

  const foundNumbers = new Set<number>();
  const lineMatches = text.matchAll(/(?:^|\n)\s*(?:\*\*)?(?:Reactivo\s+|Pregunta\s+)?(\d{1,2})[.):\-\s]/gim);
  for (const match of lineMatches) {
    const num = Number(match[1]);
    if (num >= 1 && num <= 30) {
      foundNumbers.add(num);
    }
  }

  if (foundNumbers.size === 0) return [];

  const sorted = Array.from(foundNumbers).sort((a, b) => a - b);
  // Filter to contiguous 5-item block if extra numbers from reading text slipped in
  const maxNum = sorted[sorted.length - 1];
  const blockEnd = Math.ceil(maxNum / 5) * 5;
  const blockStart = Math.max(1, blockEnd - 4);
  const inBlock = sorted.filter((n) => n >= blockStart && n <= blockEnd);

  if (inBlock.length >= 2) {
    return inBlock;
  }

  return sorted.slice(-5);
};

export const deriveDiagnosticProgress = (messages: Message[]): DiagnosticProgress => {
  const valid = messages.filter((m) => !m.isError && m.text.trim() !== '');
  if (valid.length === 0) {
    return {
      stage: 'intro',
      answeredCount: 0,
      activeBlock: [],
      latestReportText: null,
    };
  }

  const answeredSet = new Set<number>();
  let seenQuizBlock = false;
  for (const msg of valid) {
    if (msg.role === 'model' && detectActiveQuestionBlock(msg.text).length > 0) {
      seenQuizBlock = true;
    } else if (msg.role === 'user' && seenQuizBlock) {
      const answerMatches = msg.text.matchAll(/\b([1-9]|[12]\d|30)\s*[-:. )]?\s*([ABC])\b/gi);
      for (const m of answerMatches) {
        const qNum = Number(m[1]);
        if (qNum >= 1 && qNum <= 30) {
          answeredSet.add(qNum);
        }
      }
    }
  }

  let latestReportText: string | null = null;
  for (let i = valid.length - 1; i >= 0; i--) {
    if (valid[i].role === 'model' && isDiagnosticReport(valid[i].text)) {
      latestReportText = valid[i].text;
      break;
    }
  }

  let activeBlock: number[] = [];
  const lastValidMsg = valid[valid.length - 1];
  if (lastValidMsg?.role === 'model' && !latestReportText) {
    activeBlock = detectActiveQuestionBlock(lastValidMsg.text);
  }

  // If the user already answered all questions of activeBlock and we're waiting or past them
  const answeredCount = latestReportText ? 30 : Math.min(30, answeredSet.size);

  let stage: DiagnosticStage = 'onboarding';
  if (latestReportText) {
    stage = 'completed';
  } else if (answeredSet.size > 0 || activeBlock.length > 0) {
    stage = 'quiz';
  } else if (valid.length <= 1) {
    stage = 'intro';
  }

  return {
    stage,
    answeredCount,
    activeBlock,
    latestReportText,
  };
};

export const getContextualChips = (
  messages: Message[],
  progress: DiagnosticProgress
): string[] => {
  if (progress.activeBlock.length > 0) return [];
  const lastModel = [...messages].reverse().find((m) => m.role === 'model' && !m.isError);
  if (!lastModel) return [];

  const lower = lastModel.text.toLowerCase();

  if (progress.stage === 'completed') {
    return ['¿Cómo mejoro mi módulo más bajo?', '¿Cuánto tiempo estudiar por día?'];
  }
  if (lower.includes('¿listo?') || (lower.includes('empecemos') && messages.length <= 2)) {
    return ['¡Sí, listo!', 'Empecemos'];
  }
  if (lower.includes('qué material') || lower.includes('prepararse')) {
    return ['Solo guía CENEVAL gratis', 'Curso de preparación', 'Ninguno todavía'];
  }
  if (lower.includes('carrera')) {
    return ['Medicina', 'Psicología', 'Derecho', 'Ingeniería'];
  }
  return [];
};

export const downloadReportAsText = (reportText: string) => {
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Diagnostico-EXANI-II-MiguelBot.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
