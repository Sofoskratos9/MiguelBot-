import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Brain,
  Calculator,
  CheckCircle2,
  Compass,
  GraduationCap,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ExaniSimulator } from './ExaniSimulator';

interface CareerTarget {
  id: string;
  label: string;
  targetScore: number;
  note: string;
}

const UAA_CAREERS: CareerTarget[] = [
  { id: 'medicina', label: 'Médico Cirujano (Alta demanda)', targetScore: 1160, note: 'Competencia muy alta en UAA' },
  {
    id: 'estomatologia',
    label: 'Estomatología / Nutrición / Enfermería',
    targetScore: 1080,
    note: 'Demanda media-alta en Ciencias de la Salud',
  },
  {
    id: 'psicologia',
    label: 'Psicología / Derecho / Comunicación',
    targetScore: 1030,
    note: 'Demanda media-alta en Ciencias Sociales',
  },
  {
    id: 'ingenierias',
    label: 'Ingenierías / Arquitectura / Diseño',
    targetScore: 990,
    note: 'Mayor peso en Pensamiento Analítico',
  },
  {
    id: 'admin',
    label: 'Administración / Contaduría / Mercadotecnia',
    targetScore: 950,
    note: 'Puntaje competitivo promedio UAA',
  },
];

type BreathMode = '4-7-8' | 'box';
type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'hold2' | 'done';

const DURATIONS_478 = { inhale: 4, hold: 7, exhale: 8, hold2: 0 };
const DURATIONS_BOX = { inhale: 4, hold: 4, exhale: 4, hold2: 4 };

// Mini RIASEC vocational matcher adapted cleanly from conetica-educativa
type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

const RIASEC_MINI_QUESTIONS: Array<{ id: string; text: string; type: RiasecCode }> = [
  { id: 'r1', text: 'Disfruto construir, reparar o trabajar con sistemas técnicos/herramientas.', type: 'R' },
  { id: 'i1', text: 'Me apasiona analizar datos, resolver problemas científicos o médicos.', type: 'I' },
  { id: 'a1', text: 'Valoro la creatividad visual, el diseño, la escritura o la arquitectura.', type: 'A' },
  { id: 's1', text: 'Me motiva orientar, enseñar, cuidar o mejorar el bienestar de otras personas.', type: 'S' },
  { id: 'e1', text: 'Disfruto liderar equipos, emprender proyectos y persuadir con ideas.', type: 'E' },
  { id: 'c1', text: 'Soy metódico con números, organización financiera y estructuras claras.', type: 'C' },
];

const RIASEC_META: Record<RiasecCode, { name: string; careers: string }> = {
  R: { name: 'Realista', careers: 'Ingeniería Mecatrónica · Arquitectura · Biotecnología' },
  I: { name: 'Investigador', careers: 'Médico Cirujano · Desarrollo de Software · Ciencias' },
  A: { name: 'Artístico', careers: 'Diseño Gráfico · Arquitectura · Comunicación Audiovisual' },
  S: { name: 'Social', careers: 'Psicología · Enfermería · Nutrición · Docencia' },
  E: { name: 'Emprendedor', careers: 'Derecho · Mercadotecnia Digital · Comercio Internacional' },
  C: { name: 'Convencional', careers: 'Contaduría Pública · Administración · Finanzas' },
};

interface StudyToolsProps {
  hasReactivosPack?: boolean;
  onOpenPacks?: () => void;
}

export const StudyTools: React.FC<StudyToolsProps> = ({ hasReactivosPack = false, onOpenPacks }) => {
  // 1. CENEVAL Calculator state
  const [careerId, setCareerId] = useState<string>('medicina');
  const [lectura, setLectura] = useState<number>(7);
  const [analitico, setAnalitico] = useState<number>(6);
  const [redaccion, setRedaccion] = useState<number>(7);

  // 2. Breathing Trainer state (4-7-8 or Tactical 4-4-4-4 Box)
  const [breathMode, setBreathMode] = useState<BreathMode>('4-7-8');
  const totalCycles = 4;
  const [breathState, setBreathState] = useState<{
    running: boolean;
    phase: BreathPhase;
    secondsLeft: number;
    cycle: number;
  }>({
    running: false,
    phase: 'idle',
    secondsLeft: 4,
    cycle: 1,
  });

  // 3. Desarme Filosófico mini-practice state
  const [selectedPracticeOpt, setSelectedPracticeOpt] = useState<string | null>(null);

  // 4. Mini RIASEC profile state
  const [riasecChecks, setRiasecChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!breathState.running || breathState.phase === 'idle' || breathState.phase === 'done') return;
    const durations = breathMode === '4-7-8' ? DURATIONS_478 : DURATIONS_BOX;

    const timer = window.setInterval(() => {
      setBreathState((prev) => {
        if (!prev.running || prev.phase === 'idle' || prev.phase === 'done') return prev;
        if (prev.secondsLeft > 1) {
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        }
        if (prev.phase === 'inhale') {
          return { ...prev, phase: 'hold', secondsLeft: durations.hold };
        }
        if (prev.phase === 'hold') {
          return { ...prev, phase: 'exhale', secondsLeft: durations.exhale };
        }
        if (prev.phase === 'exhale' && durations.hold2 > 0) {
          return { ...prev, phase: 'hold2', secondsLeft: durations.hold2 };
        }
        if (prev.cycle >= totalCycles) {
          return { ...prev, running: false, phase: 'done', secondsLeft: 0 };
        }
        return {
          ...prev,
          cycle: prev.cycle + 1,
          phase: 'inhale',
          secondsLeft: durations.inhale,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [breathState.running, breathState.phase, breathMode]);

  const startOrToggleBreath = () => {
    const durations = breathMode === '4-7-8' ? DURATIONS_478 : DURATIONS_BOX;
    setBreathState((prev) => {
      if (prev.phase === 'idle' || prev.phase === 'done') {
        return {
          running: true,
          phase: 'inhale',
          secondsLeft: durations.inhale,
          cycle: 1,
        };
      }
      return { ...prev, running: !prev.running };
    });
  };

  const resetBreath = (nextMode?: BreathMode) => {
    if (nextMode) setBreathMode(nextMode);
    setBreathState({
      running: false,
      phase: 'idle',
      secondsLeft: 4,
      cycle: 1,
    });
  };

  const { running: breathRunning, phase: breathPhase, secondsLeft, cycle } = breathState;

  const totalHits = lectura + analitico + redaccion;
  const accuracyPct = Math.round((totalHits / 30) * 100);
  const estimatedScore = 700 + Math.round((totalHits / 30) * 600);
  const selectedCareer = UAA_CAREERS.find((c) => c.id === careerId) || UAA_CAREERS[0];
  const scoreDiff = estimatedScore - selectedCareer.targetScore;

  const getModuleBadge = (hits: number) => {
    if (hits >= 8) return { label: 'Verde · Sólido', tone: 'green' as const };
    if (hits >= 6) return { label: 'Amarillo · Reforzar', tone: 'amber' as const };
    return { label: 'Rojo · Prioridad', tone: 'red' as const };
  };

  const lecturaStatus = getModuleBadge(lectura);
  const analiticoStatus = getModuleBadge(analitico);
  const redaccionStatus = getModuleBadge(redaccion);

  const phaseLabel =
    breathPhase === 'inhale'
      ? 'Inhala lento por nariz'
      : breathPhase === 'hold'
        ? 'Mantén el aire'
        : breathPhase === 'exhale'
          ? 'Exhala suave por boca'
          : breathPhase === 'hold2'
            ? 'Pausa pulmones vacíos'
            : breathPhase === 'done'
              ? 'Sistema regulado ✓'
              : 'Listo para iniciar';

  const selectedRiasecCodes = RIASEC_MINI_QUESTIONS.filter((q) => riasecChecks[q.id]).map((q) => q.type);

  return (
    <div className="tools-viewport">
      <div className="tools-header-block">
        <div className="section-eyebrow">NEFTALÍ · Pensamiento aplicado a la vida real — Práctica guiada y cálculo oficial · EXANI-II UAA</div>
        <h1 className="tools-h1">Calculadora, Simulador y Hábitos de Examen</h1>
        <p className="tools-sub">
          Proyecta tu puntaje en escala CENEVAL según tu carrera objetivo, entrena con reactivos reales comentados, regula la respiración antes del examen y revisa tu perfil RIASEC.
        </p>
        <figure className="neftali-fig" style={{ maxWidth: '220px' }}>
          <img
            src="/ilustraciones/planta.png"
            onError={(e) => { const fig = e.currentTarget.closest('figure'); if (fig) { (fig as HTMLElement).style.display = 'none'; } else { e.currentTarget.style.display = 'none'; } }}
            alt="Regando una plantita: tu preparación crece con constancia"
            loading="lazy"
          />
        </figure>
      </div>

      {/* Tool 1: CENEVAL Calculator & UAA Traffic Light */}
      <section className="tool-card" aria-labelledby="calc-heading">
        <div className="tool-card-head">
          <div className="tool-icon-badge">
            <Calculator size={18} />
          </div>
          <div>
            <h2 id="calc-heading" className="tool-card-title">
              Calculadora de Puntaje CENEVAL y Semáforo UAA
            </h2>
            <p className="tool-card-desc">
              Ajusta tus aciertos por módulo (0–10) para proyectar tu puntaje en escala oficial (700–1300) frente a tu carrera objetivo.
            </p>
          </div>
        </div>

        <div className="calc-grid">
          <div className="calc-controls">
            <label className="field-label" htmlFor="uaa-career-select">
              Carrera objetivo en la UAA
            </label>
            <select
              id="uaa-career-select"
              className="field-select"
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
            >
              {UAA_CAREERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} — Meta ref. {c.targetScore} pts
                </option>
              ))}
            </select>

            <div className="slider-group">
              <div className="slider-row">
                <span>Comprensión Lectora</span>
                <strong>{lectura} / 10</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={lectura}
                onChange={(e) => setLectura(Number(e.target.value))}
                aria-label="Aciertos en Comprensión Lectora"
              />
            </div>

            <div className="slider-group">
              <div className="slider-row">
                <span>Pensamiento Analítico-Matemático</span>
                <strong>{analitico} / 10</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={analitico}
                onChange={(e) => setAnalitico(Number(e.target.value))}
                aria-label="Aciertos en Pensamiento Analítico-Matemático"
              />
            </div>

            <div className="slider-group">
              <div className="slider-row">
                <span>Redacción Indirecta</span>
                <strong>{redaccion} / 10</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={redaccion}
                onChange={(e) => setRedaccion(Number(e.target.value))}
                aria-label="Aciertos en Redacción Indirecta"
              />
            </div>
          </div>

          <div className="calc-result-panel">
            <div className="score-callout">
              <span className="score-eyebrow">Puntaje estimado (escala CENEVAL)</span>
              <div className="score-value">{estimatedScore} pts</div>
              <div className="score-meta">
                {totalHits}/30 aciertos ({accuracyPct}%) · Meta {selectedCareer.targetScore} pts
              </div>
              <div className={`score-gap ${scoreDiff >= 0 ? 'is-ok' : 'is-warn'}`}>
                {scoreDiff >= 0
                  ? `+${scoreDiff} pts por encima de la referencia`
                  : `${Math.abs(scoreDiff)} pts por debajo de la referencia`}
              </div>
            </div>

            <div className="traffic-list">
              <div className="traffic-item">
                <span>Comprensión Lectora</span>
                <span className={`tone-pill tone-${lecturaStatus.tone}`}>{lecturaStatus.label}</span>
              </div>
              <div className="traffic-item">
                <span>Pensamiento Analítico</span>
                <span className={`tone-pill tone-${analiticoStatus.tone}`}>{analiticoStatus.label}</span>
              </div>
              <div className="traffic-item">
                <span>Redacción Indirecta</span>
                <span className={`tone-pill tone-${redaccionStatus.tone}`}>{redaccionStatus.label}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tool 2: Interactive EXANI-II Simulator (4 free or 50 unlocked) */}
      <section className="tool-card" aria-label="Simulador interactivo EXANI-II">
        <ExaniSimulator isUnlocked={hasReactivosPack} onUnlockRequest={onOpenPacks} />
      </section>

      {/* Tool 3 & 4 Two-Column Row */}
      <div className="tools-split">
        {/* Breathing Trainer */}
        <section className="tool-card" aria-labelledby="breath-heading">
          <div className="tool-card-head">
            <div className="tool-icon-badge is-emerald">
              <Activity size={18} />
            </div>
            <div>
              <h2 id="breath-heading" className="tool-card-title">
                Regulación Autonómica Pre-Examen
              </h2>
              <p className="tool-card-desc">
                Alterna entre protocolo 4-7-8 (calma profunda) o Respiración Táctica 4-4-4-4 (foco inmediato en examen).
              </p>
            </div>
          </div>

          <div className="breath-mode-switch">
            <button
              type="button"
              className={`sim-filter-pill ${breathMode === '4-7-8' ? 'is-active' : ''}`}
              onClick={() => resetBreath('4-7-8')}
            >
              Protocolo 4-7-8
            </button>
            <button
              type="button"
              className={`sim-filter-pill ${breathMode === 'box' ? 'is-active' : ''}`}
              onClick={() => resetBreath('box')}
            >
              Respiración Táctica 4-4-4-4
            </button>
          </div>

          <div className="breath-stage">
            <div className={`breath-ring phase-${breathPhase}`}>
              <div className="breath-seconds">
                {breathPhase === 'idle' ? (breathMode === '4-7-8' ? '4-7-8' : '4×4') : breathPhase === 'done' ? '✓' : `${secondsLeft}s`}
              </div>
              <div className="breath-phase-label">{phaseLabel}</div>
            </div>
            <div className="breath-cycle-text">
              Ciclo {cycle} de {totalCycles} ·{' '}
              {breathMode === '4-7-8' ? '4s inhala / 7s sostén / 8s exhala' : '4s inhala / 4s sostén / 4s exhala / 4s pausa'}
            </div>
            <div className="breath-actions">
              <button type="button" className="btn btn-gold" onClick={startOrToggleBreath}>
                {breathRunning ? <Pause size={15} /> : <Play size={15} />}
                {breathRunning ? 'Pausar' : breathPhase === 'idle' || breathPhase === 'done' ? 'Iniciar 4 ciclos' : 'Reanudar'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => resetBreath()}>
                <RotateCcw size={15} />
                Reiniciar
              </button>
            </div>
          </div>
        </section>

        {/* Desarme Filosófico Practice */}
        <section className="tool-card" aria-labelledby="desarme-heading">
          <div className="tool-card-head">
            <div className="tool-icon-badge">
              <BookOpenCheck size={18} />
            </div>
            <div>
              <h2 id="desarme-heading" className="tool-card-title">
                Práctica: Desarme Filosófico
              </h2>
              <p className="tool-card-desc">
                Aplica los pasos socráticos en un argumento real antes de elegir opción.
              </p>
            </div>
          </div>

          <blockquote className="md-quote" style={{ marginTop: 0 }}>
            &ldquo;Quien confunde rapidez lectora con comprensión suele memorizar ejemplos aislados, pero falla cuando el examen cambia el contexto del argumento.&rdquo;
          </blockquote>

          <div className="desarme-steps">
            <div>
              <strong>1. Tesis:</strong> Leer rápido no equivale a comprender la estructura lógica.
            </div>
            <div>
              <strong>2. Conector clave:</strong> &ldquo;pero&rdquo; marca el contraste entre memorización y transferencia.
            </div>
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 600, margin: '12px 0 8px', color: 'var(--text-primary)' }}>
            ¿Qué consecuencia práctica se desprende del fragmento?
          </div>

          <div className="practice-options">
            {[
              { id: 'A', text: 'A) Conviene leer cada texto lo más lento posible sin importar el tiempo.' },
              { id: 'B', text: 'B) Entrenar la estructura argumentativa permite resolver reactivos con contextos nuevos.' },
              { id: 'C', text: 'C) Memorizar ejemplos previos basta para aprobar Comprensión Lectora.' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`practice-opt-btn ${
                  selectedPracticeOpt === opt.id ? (opt.id === 'B' ? 'is-correct' : 'is-wrong') : ''
                }`}
                onClick={() => setSelectedPracticeOpt(opt.id)}
              >
                {opt.text}
              </button>
            ))}
          </div>

          {selectedPracticeOpt && (
            <div className={`practice-feedback ${selectedPracticeOpt === 'B' ? 'is-ok' : 'is-err'}`}>
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                {selectedPracticeOpt === 'B'
                  ? 'Correcto: el desarme filosófico entrena la estructura del argumento, no la memoria mecánica.'
                  : 'Revisa el conector "pero": el texto critica memorizar ejemplos aislados y señala la importancia de comprender el argumento.'}
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Tool 5: RIASEC Vocational Affinity & Evidence Strategies (from conetica-educativa) */}
      <div className="tools-split">
        <section className="tool-card" aria-labelledby="riasec-heading">
          <div className="tool-card-head">
            <div className="tool-icon-badge">
              <Compass size={18} />
            </div>
            <div>
              <h2 id="riasec-heading" className="tool-card-title">
                Orientador Vocacional Rápido (Modelo RIASEC)
              </h2>
              <p className="tool-card-desc">
                Marca las afirmaciones con las que te identificas para validar tu afinidad con carreras de la UAA.
              </p>
            </div>
          </div>

          <div className="riasec-list">
            {RIASEC_MINI_QUESTIONS.map((q) => {
              const checked = Boolean(riasecChecks[q.id]);
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`riasec-item ${checked ? 'is-checked' : ''}`}
                  onClick={() => setRiasecChecks((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                >
                  <span className="riasec-code">{q.type}</span>
                  <span>{q.text}</span>
                </button>
              );
            })}
          </div>

          {selectedRiasecCodes.length > 0 && (
            <div className="riasec-result">
              <div className="riasec-result-title">
                <GraduationCap size={14} />
                Carreras UAA sugeridas por tu perfil ({selectedRiasecCodes.join(' · ')}):
              </div>
              <div className="riasec-matches">
                {selectedRiasecCodes.map((code) => (
                  <div key={code} className="riasec-match-row">
                    <strong>{RIASEC_META[code].name}:</strong> {RIASEC_META[code].careers}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="tool-card" aria-labelledby="wellness-heading">
          <div className="tool-card-head">
            <div className="tool-icon-badge is-slate">
              <Brain size={18} />
            </div>
            <div>
              <h2 id="wellness-heading" className="tool-card-title">
                Protocolos Cognitivos de Estudio
              </h2>
              <p className="tool-card-desc">
                Principios prácticos de rendimiento aplicados en nuestros cuadernos descargables.
              </p>
            </div>
          </div>

          <div className="desarme-steps" style={{ marginTop: 0 }}>
            <div>
              <strong>Descarga Cognitiva (5 min):</strong> Vacía pendientes en papel antes de estudiar para liberar memoria de trabajo.
            </div>
            <div>
              <strong>Ciclos Ultradianos 90/20:</strong> 90 min de estudio activo sin teléfono + 20 min de recuperación real sin pantallas.
            </div>
            <div>
              <strong>Simulación de Condiciones:</strong> Resuelve bloques cronometrados a la misma hora matutina en que presentarás el EXANI-II.
            </div>
          </div>

          {onOpenPacks && (
            <div style={{ marginTop: '14px' }}>
              <button type="button" className="btn btn-gold" onClick={onOpenPacks} style={{ width: '100%' }}>
                Ver los 3 Cuadernos Descargables (PDF + WAV)
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
