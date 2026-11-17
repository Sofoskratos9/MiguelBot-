import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  KeyRound,
  Lock,
  ShieldCheck,
  Unlock,
} from 'lucide-react';

const UNLOCK_TOKEN_KEY = 'miguelbot_kit_unlock_token';

interface PaymentConfig {
  stripeEnabled: boolean;
  mercadoPagoEnabled: boolean;
  accessCodeEnabled: boolean;
  priceMxn: number;
  productName: string;
}

interface StudyKitSectionProps {
  latestReportText: string | null;
}

export const StudyKitSection: React.FC<StudyKitSectionProps> = ({ latestReportText }) => {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [unlockToken, setUnlockToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(UNLOCK_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<'stripe' | 'mercadopago' | 'code' | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const latestReportRef = useRef<string | null>(latestReportText);
  latestReportRef.current = latestReportText;

  const triggerFullPdfDownload = async () => {
    const { generateFullKitPdf } = await import('./pdfKitGenerator');
    generateFullKitPdf(latestReportRef.current);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsChecking(true);

      // 1. Load enabled payment methods from server
      try {
        const res = await fetch('/api/payment-config');
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          if (!cancelled) setBackendAvailable(false);
        } else {
          const data = (await res.json()) as PaymentConfig;
          if (!cancelled) {
            setBackendAvailable(true);
            setConfig(data);
          }
        }
      } catch {
        if (!cancelled) setBackendAvailable(false);
      }

      // 2. Check URL redirect parameters after Stripe / Mercado Pago checkout
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const provider = params.get('provider');
      const sessionId = params.get('session_id');
      const paymentId = params.get('payment_id') || params.get('collection_id');

      if (paymentStatus === 'cancelled') {
        if (!cancelled) {
          setStatusMessage({
            type: 'info',
            text: 'El pago fue cancelado. No se realizó ningún cargo.',
          });
        }
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentStatus === 'pending') {
        if (!cancelled) {
          setStatusMessage({
            type: 'info',
            text: 'Tu pago está en proceso de confirmación. En cuanto se acredite podrás descargar tu PDF.',
          });
        }
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentStatus === 'success' && (provider === 'stripe' || provider === 'mercadopago')) {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, sessionId, paymentId }),
          });
          const verifyData = (await verifyRes.json()) as { verified?: boolean; token?: string; error?: string };
          if (verifyRes.ok && verifyData.verified && verifyData.token) {
            localStorage.setItem(UNLOCK_TOKEN_KEY, verifyData.token);
            if (!cancelled) {
              setUnlockToken(verifyData.token);
              setIsUnlocked(true);
              setStatusMessage({
                type: 'ok',
                text: 'Pago confirmado. Tu descarga automática ha iniciado; también puedes volver a descargarlo cuando quieras.',
              });
              await triggerFullPdfDownload();
            }
          } else if (!cancelled) {
            setStatusMessage({
              type: 'err',
              text: verifyData.error || 'No se pudo confirmar el pago automáticamente.',
            });
          }
        } catch {
          if (!cancelled) {
            setStatusMessage({
              type: 'err',
              text: 'Error de red al verificar tu pago con el servidor.',
            });
          }
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
          if (!cancelled) setIsChecking(false);
        }
        return;
      }

      // 3. Re-verify existing unlock token on server
      if (unlockToken) {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: unlockToken }),
          });
          const contentType = verifyRes.headers.get('content-type') || '';
          if (verifyRes.ok && contentType.includes('application/json')) {
            const verifyData = (await verifyRes.json()) as { verified?: boolean };
            if (!cancelled && verifyData.verified) {
              setIsUnlocked(true);
            }
          } else if (verifyRes.status === 401) {
            localStorage.removeItem(UNLOCK_TOKEN_KEY);
            if (!cancelled) {
              setUnlockToken(null);
              setIsUnlocked(false);
            }
          }
        } catch {
          // Keep current state if offline
        }
      }

      if (!cancelled) setIsChecking(false);
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [unlockToken]);

  const handleCheckout = async (provider: 'stripe' | 'mercadopago') => {
    setCheckoutLoading(provider);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, email: buyerEmail.trim() || undefined }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setStatusMessage({
          type: 'err',
          text: data.error || 'No se pudo abrir la pasarela de pago.',
        });
        return;
      }
      window.location.assign(data.url);
    } catch {
      setStatusMessage({
        type: 'err',
        text: 'No se pudo conectar con el servidor de pagos.',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleVerifyAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = accessCode.trim();
    if (!cleaned) return;

    setCheckoutLoading('code');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'code', accessCode: cleaned }),
      });
      const data = (await res.json()) as { verified?: boolean; token?: string; error?: string };
      if (!res.ok || !data.verified || !data.token) {
        setStatusMessage({
          type: 'err',
          text: data.error || 'Código de acceso inválido.',
        });
        return;
      }
      localStorage.setItem(UNLOCK_TOKEN_KEY, data.token);
      setUnlockToken(data.token);
      setIsUnlocked(true);
      setAccessCode('');
      setStatusMessage({
        type: 'ok',
        text: 'Código verificado. Descarga automática iniciada.',
      });
      await triggerFullPdfDownload();
    } catch {
      setStatusMessage({
        type: 'err',
        text: 'Error al validar el código con el servidor.',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const anyPaymentMethodEnabled = Boolean(
    config && (config.stripeEnabled || config.mercadoPagoEnabled || config.accessCodeEnabled)
  );

  return (
    <div className="tools-viewport">
      <div className="tools-header-block">
        <h1 className="tools-h1">Kit Estratégico EXANI-II UAA 2026 (Descarga Directa)</h1>
        <p className="tools-sub">
          Compra y descarga inmediata en PDF sin enviar mensajes ni esperar confirmaciones manuales. Descarga primero la muestra gratuita para comprobar su contenido.
        </p>
      </div>

      <section className="tool-card">
        <div className="kit-layout">
          <div className="kit-contents">
            <div className="kit-eyebrow">Contenido incluido en el PDF Completo</div>
            <h2 className="tool-card-title" style={{ fontSize: '20px', marginBottom: '12px' }}>
              {config?.productName || 'Kit Estratégico EXANI-II UAA 2026 (PDF Completo)'}
            </h2>

            <ul className="kit-checklist">
              <li>
                <CheckCircle2 size={16} />
                <span>
                  <strong>Módulo 1 · Desarme Filosófico:</strong> guía paso a paso + 5 reactivos de Comprensión Lectora explicados.
                </span>
              </li>
              <li>
                <CheckCircle2 size={16} />
                <span>
                  <strong>Módulo 2 · Analítico-Matemático:</strong> estrategias de descarte, conjuntos y sucesiones + 5 reactivos resueltos.
                </span>
              </li>
              <li>
                <CheckCircle2 size={16} />
                <span>
                  <strong>Módulo 3 · Redacción Indirecta:</strong> reglas clave CENEVAL + 5 reactivos comentados.
                </span>
              </li>
              <li>
                <CheckCircle2 size={16} />
                <span>
                  <strong>Módulo 4 · Plan 4 Semanas y Bitácora:</strong> cronograma de estudio, protocolo 4-7-8 y registro de simulacros.
                </span>
              </li>
              {latestReportText && (
                <li>
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>Tu diagnóstico integrado:</strong> incluye automáticamente tus resultados de esta sesión dentro del PDF.
                  </span>
                </li>
              )}
            </ul>

            <div style={{ marginTop: '18px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  const { generateSampleKitPdf } = await import('./pdfKitGenerator');
                  generateSampleKitPdf();
                }}
              >
                <FileText size={15} />
                Descargar Muestra Gratuita (PDF · 2 págs.)
              </button>
            </div>
          </div>

          <div className="kit-checkout-box">
            {isUnlocked ? (
              <div className="kit-unlocked-state">
                <div className="kit-status-badge is-unlocked">
                  <Unlock size={15} />
                  Pago Verificado
                </div>
                <div className="kit-price-title" style={{ marginTop: '10px' }}>
                  Tu Kit Completo está desbloqueado
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '6px 0 16px' }}>
                  Tu pago fue verificado directamente en el servidor. Haz clic abajo si deseas volver a descargar tu cuadernillo en PDF.
                </p>
                <button
                  type="button"
                  className="btn btn-emerald"
                  style={{ width: '100%' }}
                  onClick={triggerFullPdfDownload}
                >
                  <Download size={16} />
                  Descargar Kit Completo (PDF)
                </button>
              </div>
            ) : (
              <div>
                <div className="kit-status-badge">
                  <Lock size={15} />
                  Compra directa y descarga automática
                </div>

                <div className="kit-price-row">
                  <span className="kit-price">${config?.priceMxn ?? 299} MXN</span>
                  <span className="kit-price-note">Pago único · Descarga inmediata</span>
                </div>

                {isChecking ? (
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                    Verificando pasarela de pagos...
                  </p>
                ) : !backendAvailable ? (
                  <div className="kit-notice-box">
                    <strong>Servidor de pagos inactivo en esta vista previa local:</strong> al desplegar en Vercel (o correr <code>vercel dev</code>) con tus llaves de Stripe o Mercado Pago, el botón de pago abrirá el checkout oficial y descargará el PDF automáticamente al regresar.
                  </div>
                ) : !anyPaymentMethodEnabled ? (
                  <div className="kit-notice-box">
                    <strong>Pasarela lista para activar:</strong> agrega <code>STRIPE_SECRET_KEY</code> o <code>MERCADOPAGO_ACCESS_TOKEN</code> (y <code>DOWNLOAD_TOKEN_SECRET</code>) en Vercel para habilitar el cobro directo con tarjeta y la descarga automática.
                  </div>
                ) : (
                  <div className="kit-pay-buttons">
                    {(config?.stripeEnabled || config?.mercadoPagoEnabled) && (
                      <div style={{ marginBottom: '4px' }}>
                        <label htmlFor="buyer-receipt-email" className="field-label">
                          Correo para tu recibo de pago (opcional)
                        </label>
                        <input
                          id="buyer-receipt-email"
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="tu-correo@ejemplo.com"
                          className="field-input"
                        />
                      </div>
                    )}

                    {config?.stripeEnabled && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={checkoutLoading !== null}
                        onClick={() => handleCheckout('stripe')}
                      >
                        <CreditCard size={16} />
                        {checkoutLoading === 'stripe' ? 'Abriendo Stripe...' : 'Comprar con Tarjeta (Stripe)'}
                      </button>
                    )}

                    {config?.mercadoPagoEnabled && (
                      <button
                        type="button"
                        className="btn btn-emerald"
                        style={{ width: '100%' }}
                        disabled={checkoutLoading !== null}
                        onClick={() => handleCheckout('mercadopago')}
                      >
                        <CreditCard size={16} />
                        {checkoutLoading === 'mercadopago' ? 'Abriendo Mercado Pago...' : 'Comprar con Mercado Pago'}
                      </button>
                    )}

                    {config?.accessCodeEnabled && (
                      <form onSubmit={handleVerifyAccessCode} className="access-code-form">
                        <label htmlFor="kit-access-code" className="field-label" style={{ marginBottom: '4px' }}>
                          ¿Tienes un código de descarga?
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            id="kit-access-code"
                            type="text"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="Ingresa tu código"
                            className="field-input"
                          />
                          <button
                            type="submit"
                            className="btn btn-secondary"
                            disabled={!accessCode.trim() || checkoutLoading !== null}
                          >
                            <KeyRound size={15} />
                            Canjear
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {statusMessage && (
              <div className={`kit-feedback is-${statusMessage.type}`}>
                {statusMessage.text}
              </div>
            )}

            <div className="privacy-note" style={{ marginTop: '14px' }}>
              <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                <strong>Pago verificado y descarga directa:</strong> al completar tu pago en Stripe o Mercado Pago regresas automáticamente aquí y tu PDF se descarga al instante.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
