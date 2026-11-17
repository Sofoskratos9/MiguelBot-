import React, { useState, useEffect } from 'react';
import { Activity, BookOpenCheck, Calculator, CheckCircle2, Pause, Play, RotateCcw } from 'lucide-react';

interface CareerTarget {
  id: string;
  label: string;
  targetScore: number;
  note: string;
}

const UAA_CAREERS: CareerTarget[] = [
  { id: 'medicina', label: 'Médico Cirujano (Alta demanda)', targetScore: 1160, note: 'Competencia muy alta en UAA' },
  { id: 'estomatologia', label: 'Estomatología / Nutrición / Enfermería', targetScore: 1080, note: 'Demanda media-alta en Ciencias de la Salud' },
  { id: 'psicologia', label: 'Psicología / Derecho / Comunicación', targetScore: 1030, note: 'Demanda media-alta en Ciencias Sociales' },
  { id: 'ingenierias', label: 'Ingenierías / Arquitectura / Diseño', targetScore: 990, note: 'Mayor peso en Pensamiento Analítico' },
  { id: 'admin', label: 'Administración / Contaduría / Mercadotecnia', targetScore: 950, note: 'Puntaje competitivo promedio UAA' },
];

type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'done';

const PHASE_DURATIONS: Record<'inhale' | 'hold' | 'exhale', number> = {
  inhale: 4,
  hold: 7,
  exhale: 8,
};

export const StudyTools: React.FC = () => {
  // 1. CENEVAL Calculator state
  const [careerId, setCareerId] = useState<string>('medicina');
  const [lectura, setLectura] = useState<number>(7);
  const [analitico, setAnalitico] = useState<number>(6);
  const [redaccion, setRedaccion] = useState<number>(7);

  // 2. 4-7-8 Breathing Trainer state
  const totalCycles = 4;
  const [breathState, setBreathState] = useState<{
    running: boolean;
    phase: BreathPhase;
    secondsLeft: number;
    cycle: number;
  }>({
    running: false,
    phase: 'idle',
    secondsLeft: PHASE_DURATIONS.inhale,
    cycle: 1,
  });

  // 3. Desarme Filosófico mini-practice state
  const [selectedPracticeOpt, setSelectedPracticeOpt] = useState<string | null>(null);

  useEffect(() => {
    if (!breathState.running || breathState.phase === 'idle' || breathState.phase === 'done') return;

    const timer = window.setInterval(() => {
      setBreathState((prev) => {
        if (!prev.running || prev.phase === 'idle' || prev.phase === 'done') return prev;
        if (prev.secondsLeft > 1) {
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        }
        if (prev.phase === 'inhale') {
          return { ...prev, phase: 'hold', secondsLeft: PHASE_DURATIONS.hold };
        }
        if (prev.phase === 'hold') {
          return { ...prev, phase: 'exhale', secondsLeft: PHASE_DURATIONS.exhale };
        }
        if (prev.cycle >= totalCycles) {
          return { ...prev, running: false, phase: 'done', secondsLeft: 0 };
        }
        return {
          ...prev,
          cycle: prev.cycle + 1,
          phase: 'inhale',
          secondsLeft: PHASE_DURATIONS.inhale,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [breathState.running, breathState.phase]);

  const startOrToggleBreath = () => {
    setBreathState((prev) => {
      if (prev.phase === 'idle' || prev.phase === 'done') {
        return {
          running: true,
          phase: 'inhale',
          secondsLeft: PHASE_DURATIONS.inhale,
          cycle: 1,
        };
      }
      return { ...prev, running: !prev.running };
    });
  };

  const resetBreath = () => {
    setBreathState({
      running: false,
      phase: 'idle',
      secondsLeft: PHASE_DURATIONS.inhale,
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
      ? 'Inhala por la nariz'
      : breathPhase === 'hold'
        ? 'Mantén el aire'
        : breathPhase === 'exhale'
          ? 'Exhala lento por la boca'
          : breathPhase === 'done'
            ? 'Sesión completada'
            : 'Listo para iniciar';

  return (
    <div className="tools-viewport">
      <div className="tools-header-block">
        <h1 className="tools-h1">Herramientas de Preparación EXANI-II</h1>
        <p className="tools-sub">
          Recursos reales de cálculo, regulación cognitiva y lectura crítica para respaldar tu preparación rumbo a la UAA 2026.
        </p>
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
              Ajusta tus aciertos por módulo (0–10) para estimar tu puntaje en escala real (700–1300) frente a la carrera objetivo.
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

      {/* Tool 2 & 3 Two-Column Row */}
      <div className="tools-split">
        {/* Tool 2: 4-7-8 Breathing Trainer */}
        <section className="tool-card" aria-labelledby="breath-heading">
          <div className="tool-card-head">
            <div className="tool-icon-badge is-emerald">
              <Activity size={18} />
            </div>
            <div>
              <h2 id="breath-heading" className="tool-card-title">
                Entrenador Anti-Ansiedad 4-7-8
              </h2>
              <p className="tool-card-desc">
                Úsalo 90 segundos antes de un simulacro para reducir activación por estrés y recuperar foco.
              </p>
            </div>
          </div>

          <div className="breath-stage">
            <div className={`breath-ring phase-${breathPhase}`}>
              <div className="breath-seconds">{breathPhase === 'idle' ? '4-7-8' : breathPhase === 'done' ? '✓' : `${secondsLeft}s`}</div>
              <div className="breath-phase-label">{phaseLabel}</div>
            </div>
            <div className="breath-cycle-text">
              Ciclo {cycle} de {totalCycles} · Protocolo 4s inhala / 7s sostén / 8s exhala
            </div>
            <div className="breath-actions">
              <button type="button" className="btn btn-primary" onClick={startOrToggleBreath}>
                {breathRunning ? <Pause size={15} /> : <Play size={15} />}
                {breathRunning ? 'Pausar' : breathPhase === 'idle' || breathPhase === 'done' ? 'Iniciar 4 ciclos' : 'Reanudar'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetBreath}>
                <RotateCcw size={15} />
                Reiniciar
              </button>
            </div>
          </div>
        </section>

        {/* Tool 3: Desarme Filosófico Interactive Practice */}
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
                Aplica los 4 pasos socráticos en un reactivo real antes de elegir opción.
              </p>
            </div>
          </div>

          <blockquote className="md-quote" style={{ marginTop: 0 }}>
            "Quien confunde rapidez lectora con comprensión suele memorizar ejemplos aislados, pero falla cuando el examen cambia el contexto del argumento."
          </blockquote>

          <div className="desarme-steps">
            <div><strong>1. Tesis:</strong> Leer rápido no equivale a comprender la estructura lógica.</div>
            <div><strong>2. Conector clave:</strong> "pero" marca el contraste entre memorización y transferencia.</div>
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 600, margin: '12px 0 8px', color: 'var(--navy-900)' }}>
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
                className={`practice-opt-btn ${selectedPracticeOpt === opt.id ? (opt.id === 'B' ? 'is-correct' : 'is-wrong') : ''}`}
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
    </div>
  );
};
