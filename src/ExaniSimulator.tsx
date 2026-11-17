import React, { useMemo, useState } from 'react';
import { CheckCircle2, Filter, Lock, RotateCcw, Sparkles, Trophy, XCircle } from 'lucide-react';
import { EXANI_50_BANK, FREE_PREVIEW_QUESTIONS, type ExaniArea, type ExaniQuestion } from './exaniBank';

interface ExaniSimulatorProps {
  isUnlocked: boolean;
  onUnlockRequest?: () => void;
}

const AREAS: Array<'Todas' | ExaniArea> = [
  'Todas',
  'Comprensión Lectora',
  'Pensamiento Matemático',
  'Pensamiento Analítico',
  'Estructura de la Lengua',
];

export const ExaniSimulator: React.FC<ExaniSimulatorProps> = ({ isUnlocked, onUnlockRequest }) => {
  const [selectedArea, setSelectedArea] = useState<'Todas' | ExaniArea>('Todas');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const pool: ExaniQuestion[] = useMemo(() => {
    const base = isUnlocked ? EXANI_50_BANK : FREE_PREVIEW_QUESTIONS;
    if (selectedArea === 'Todas') return base;
    return base.filter((q) => q.area === selectedArea);
  }, [isUnlocked, selectedArea]);

  const safeIndex = Math.min(currentIndex, Math.max(0, pool.length - 1));
  const activeQ = pool[safeIndex];

  const answeredCount = pool.filter((q) => typeof answers[q.id] === 'number').length;
  const correctCount = pool.filter((q) => answers[q.id] === q.correctIndex).length;
  const scorePct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const projectedCeneval = 700 + Math.round(((answeredCount > 0 ? correctCount / answeredCount : 0)) * 600);

  const handleSelectOption = (qId: string, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleAreaChange = (area: 'Todas' | ExaniArea) => {
    setSelectedArea(area);
    setCurrentIndex(0);
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentIndex(0);
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="sim-shell">
      <div className="sim-header">
        <div>
          <div className="sim-eyebrow">
            {isUnlocked ? 'Simulador Completo Desbloqueado · 50 Reactivos' : 'Simulador Muestra Gratuita · 4 Reactivos'}
          </div>
          <h3 className="sim-title">Entrenamiento Interactivo EXANI-II 2026</h3>
        </div>

        <div className="sim-stats-row">
          <div className="sim-stat-chip">
            <span>Progreso</span>
            <strong>
              {answeredCount}/{pool.length}
            </strong>
          </div>
          <div className="sim-stat-chip is-gold">
            <span>Aciertos</span>
            <strong>
              {correctCount}/{answeredCount || 0} ({scorePct}%)
            </strong>
          </div>
          {answeredCount > 0 && (
            <div className="sim-stat-chip is-emerald">
              <Trophy size={13} />
              <span>~{projectedCeneval} pts</span>
            </div>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset} title="Reiniciar respuestas">
            <RotateCcw size={13} />
            Reiniciar
          </button>
        </div>
      </div>

      {isUnlocked && (
        <div className="sim-area-filters" role="tablist" aria-label="Filtrar por área del EXANI-II">
          <Filter size={14} style={{ color: 'var(--gold-400)', flexShrink: 0 }} />
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              role="tab"
              aria-selected={selectedArea === area}
              className={`sim-filter-pill ${selectedArea === area ? 'is-active' : ''}`}
              onClick={() => handleAreaChange(area)}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      {activeQ ? (
        <div className="sim-card">
          <div className="sim-q-meta">
            <span className="sim-area-badge">{activeQ.area}</span>
            <span className="sim-diff-badge">
              Reactivo {safeIndex + 1} de {pool.length} · Nivel {activeQ.difficulty}
            </span>
          </div>

          <p className="sim-question-text">{activeQ.question}</p>

          <div className="sim-options">
            {activeQ.options.map((opt, idx) => {
              const userPick = answers[activeQ.id];
              const isPicked = userPick === idx;
              const isAnswered = typeof userPick === 'number';
              const isCorrectOpt = idx === activeQ.correctIndex;

              let stateClass = '';
              if (isAnswered) {
                if (isCorrectOpt) stateClass = 'is-correct';
                else if (isPicked) stateClass = 'is-wrong';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  className={`practice-opt-btn ${stateClass}`}
                  onClick={() => handleSelectOption(activeQ.id, idx)}
                >
                  <span className="sim-opt-letter">{letters[idx]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {typeof answers[activeQ.id] === 'number' && (
            <div
              className={`practice-feedback ${
                answers[activeQ.id] === activeQ.correctIndex ? 'is-ok' : 'is-err'
              }`}
            >
              {answers[activeQ.id] === activeQ.correctIndex ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <XCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <strong>
                  {answers[activeQ.id] === activeQ.correctIndex
                    ? '¡Respuesta correcta!'
                    : `Respuesta correcta: ${letters[activeQ.correctIndex]}.`}
                </strong>{' '}
                {activeQ.explanation}
              </div>
            </div>
          )}

          <div className="sim-nav-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={safeIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              Anterior
            </button>

            <div className="sim-dots" aria-label="Navegación rápida de reactivos">
              {pool.slice(0, 15).map((q, idx) => {
                const ans = answers[q.id];
                const dotState =
                  typeof ans !== 'number'
                    ? ''
                    : ans === q.correctIndex
                      ? 'is-ok'
                      : 'is-err';
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`sim-dot ${idx === safeIndex ? 'is-current' : ''} ${dotState}`}
                    onClick={() => setCurrentIndex(idx)}
                    title={`Reactivo ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
              {pool.length > 15 && <span className="sim-more-hint">+{pool.length - 15}</span>}
            </div>

            <button
              type="button"
              className="btn btn-gold btn-sm"
              disabled={safeIndex >= pool.length - 1}
              onClick={() => setCurrentIndex((i) => Math.min(pool.length - 1, i + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      {!isUnlocked && onUnlockRequest && (
        <div className="sim-upsell-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={16} style={{ color: 'var(--gold-400)', flexShrink: 0 }} />
            <span>
              Estás probando 4 reactivos de muestra. Desbloquea los <strong>50 reactivos comentados + PDF</strong> al instante con Stripe o PayPal.
            </span>
          </div>
          <button type="button" className="btn btn-gold btn-sm" onClick={onUnlockRequest}>
            <Sparkles size={14} />
            Desbloquear 50 Reactivos ($149 MXN)
          </button>
        </div>
      )}
    </div>
  );
};
