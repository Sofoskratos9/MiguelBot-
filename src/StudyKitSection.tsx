import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Headphones,
  KeyRound,
  Lock,
  Play,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  Unlock,
  Volume2,
  X,
} from 'lucide-react';
import { LiveBinauralPlayer, type AudioSessionKind } from './audioGenerator';
import { ExaniSimulator } from './ExaniSimulator';

export type ProductId = 'neuro-kit' | 'reactivos-pack' | 'nsdr-protocol';

export interface ProductSpec {
  id: ProductId;
  name: string;
  badge: string;
  tagline: string;
  priceMxn: number;
  compareAtMxn: number;
  ctaLabel: string;
  featured?: boolean;
  deliverables: string[];
}

interface PaymentConfigResponse {
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  accessCodeEnabled: boolean;
  products: ProductSpec[];
}

const DEFAULT_PRODUCTS: ProductSpec[] = [
  {
    id: 'neuro-kit',
    name: 'Kit de Neuro-Aprendizaje',
    badge: 'PDF + Audio WAV',
    tagline:
      'Plantillas de estudio basadas en ciclos ultradianos (90/20), método Feynman y audio binaural 40 Hz para enfoque profundo.',
    priceMxn: 99,
    compareAtMxn: 299,
    ctaLabel: 'Comprar y Descargar',
    deliverables: ['PDF Plantillas Ultradianas y Repaso Espaciado', 'Audio Binaural 40 Hz Enfoque (.wav)'],
  },
  {
    id: 'reactivos-pack',
    name: 'Banco de 50 Reactivos EXANI-II',
    badge: 'Best Seller · Edición 2026',
    tagline:
      '50 preguntas originales de alta exigencia basadas en el temario oficial CENEVAL 2026 con simulacro interactivo y soluciones comentadas.',
    priceMxn: 149,
    compareAtMxn: 499,
    ctaLabel: 'Comprar y Descargar Pack',
    featured: true,
    deliverables: [
      'PDF 50 Reactivos EXANI-II + Clave Explicada',
      'Simulador Interactivo Completo Desbloqueado',
    ],
  },
  {
    id: 'nsdr-protocol',
    name: 'Protocolo Anti-Ansiedad NSDR',
    badge: 'Audio + Guía PDF',
    tagline:
      'Sesión sonora de 10 min basada en NSDR (Alpha → Theta) y respiración táctica 4-7-8 para reducir el estrés antes del examen.',
    priceMxn: 79,
    compareAtMxn: 199,
    ctaLabel: 'Obtener Audio y Guía',
    deliverables: ['Audio Protocolo NSDR Relajación (.wav)', 'PDF Rutina Pre-Examen 10 Minutos'],
  },
];

export const TOKENS_STORAGE_KEY = 'miguelbot_kit_tokens_v2';

type TokenMap = Partial<Record<ProductId, string>>;

const loadStoredTokens = (): TokenMap => {
  try {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: TokenMap = {};
    for (const id of ['neuro-kit', 'reactivos-pack', 'nsdr-protocol'] as const) {
      if (typeof parsed[id] === 'string' && parsed[id]) {
        clean[id] = parsed[id] as string;
      }
    }
    return clean;
  } catch {
    return {};
  }
};

const saveStoredTokens = (tokens: TokenMap) => {
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore storage quota errors
  }
};

interface StudyKitSectionProps {
  latestReportText: string | null;
  onUnlockedProductsChange?: (ids: ProductId[]) => void;
}

export const StudyKitSection: React.FC<StudyKitSectionProps> = ({
  latestReportText,
  onUnlockedProductsChange,
}) => {
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [unlockedIds, setUnlockedIds] = useState<ProductId[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const [selectedProduct, setSelectedProduct] = useState<ProductSpec | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<'stripe' | 'paypal' | 'code' | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showSimulatorModal, setShowSimulatorModal] = useState<boolean>(false);

  // Live audio player state (15s preview or unlimited unlocked session)
  const [playingAudio, setPlayingAudio] = useState<{
    kind: AudioSessionKind;
    isPreview: boolean;
    secondsElapsed: number;
  } | null>(null);

  const playerRef = useRef<LiveBinauralPlayer | null>(null);
  const latestReportRef = useRef<string | null>(latestReportText);
  latestReportRef.current = latestReportText;

  const products = config?.products?.length ? config.products : DEFAULT_PRODUCTS;

  const syncUnlocked = (ids: ProductId[]) => {
    const unique = Array.from(new Set(ids));
    setUnlockedIds(unique);
    onUnlockedProductsChange?.(unique);
  };

  // Cleanup live Web Audio player on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  // Audio playback timer (auto-stop preview at 15s)
  useEffect(() => {
    if (!playingAudio) return;
    const interval = window.setInterval(() => {
      setPlayingAudio((prev) => {
        if (!prev) return null;
        const nextSec = prev.secondsElapsed + 1;
        if (prev.isPreview && nextSec >= 15) {
          playerRef.current?.stop();
          return null;
        }
        return { ...prev, secondsElapsed: nextSec };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [playingAudio]);

  const toggleLiveAudio = (kind: AudioSessionKind, isPreview: boolean) => {
    if (playingAudio && playingAudio.kind === kind) {
      playerRef.current?.stop();
      setPlayingAudio(null);
      return;
    }
    if (!playerRef.current) {
      playerRef.current = new LiveBinauralPlayer();
    }
    playerRef.current.start(kind, 0.28);
    setPlayingAudio({ kind, isPreview, secondsElapsed: 0 });
  };

  const triggerProductDeliverable = async (
    productId: ProductId,
    asset: 'all' | 'pdf' | 'audio' = 'all'
  ) => {
    setDownloadingId(`${productId}:${asset}`);
    try {
      if (productId === 'neuro-kit') {
        if (asset === 'all' || asset === 'pdf') {
          const { generateNeuroKitPdf } = await import('./pdfKitGenerator');
          generateNeuroKitPdf();
        }
        if (asset === 'all' || asset === 'audio') {
          const { downloadNeuroAudioWav } = await import('./audioGenerator');
          downloadNeuroAudioWav();
        }
      } else if (productId === 'reactivos-pack') {
        const { generateReactivos50Pdf } = await import('./pdfKitGenerator');
        generateReactivos50Pdf(latestReportRef.current);
      } else if (productId === 'nsdr-protocol') {
        if (asset === 'all' || asset === 'pdf') {
          const { generateNsdrProtocolPdf } = await import('./pdfKitGenerator');
          generateNsdrProtocolPdf();
        }
        if (asset === 'all' || asset === 'audio') {
          const { downloadNsdrAudioWav } = await import('./audioGenerator');
          downloadNsdrAudioWav();
        }
      }
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsChecking(true);

      // 1. Load catalog & enabled payment gateways from server
      try {
        const res = await fetch('/api/payment-config');
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          if (!cancelled) setBackendAvailable(false);
        } else {
          const data = (await res.json()) as PaymentConfigResponse;
          if (!cancelled) {
            setBackendAvailable(true);
            setConfig(data);
          }
        }
      } catch {
        if (!cancelled) setBackendAvailable(false);
      }

      const storedMap = loadStoredTokens();

      // 2. Check Stripe / PayPal redirect parameters
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const provider = params.get('provider');
      const paramProduct = params.get('product') as ProductId | null;
      const sessionId = params.get('session_id');
      const paypalOrderId = params.get('token');

      if (paymentStatus === 'cancelled') {
        if (!cancelled) {
          setStatusMessage({
            type: 'info',
            text: 'El pago fue cancelado en la pasarela. No se realizó ningún cargo.',
          });
        }
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentStatus === 'success' && (provider === 'stripe' || provider === 'paypal')) {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              productId: paramProduct || undefined,
              sessionId,
              orderId: paypalOrderId,
            }),
          });
          const verifyData = (await verifyRes.json()) as {
            verified?: boolean;
            token?: string;
            productId?: ProductId;
            error?: string;
          };

          if (verifyRes.ok && verifyData.verified && verifyData.token && verifyData.productId) {
            const nextMap: TokenMap = { ...storedMap, [verifyData.productId]: verifyData.token };
            saveStoredTokens(nextMap);

            if (!cancelled) {
              const allIds = Object.keys(nextMap) as ProductId[];
              syncUnlocked(allIds);
              setStatusMessage({
                type: 'ok',
                text: 'Pago verificado correctamente. Tu descarga directa ha iniciado de inmediato.',
              });
              await triggerProductDeliverable(verifyData.productId, 'all');
            }
          } else if (!cancelled) {
            setStatusMessage({
              type: 'err',
              text: verifyData.error || 'No se pudo confirmar automáticamente tu pago.',
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

      // 3. Batch re-verify stored tokens on mount
      const tokenList = Object.values(storedMap).filter((t): t is string => Boolean(t));
      if (tokenList.length > 0) {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens: tokenList }),
          });
          const contentType = verifyRes.headers.get('content-type') || '';
          if (verifyRes.ok && contentType.includes('application/json')) {
            const verifyData = (await verifyRes.json()) as { unlockedProductIds?: ProductId[] };
            if (!cancelled && Array.isArray(verifyData.unlockedProductIds)) {
              syncUnlocked(verifyData.unlockedProductIds);
            }
          }
        } catch {
          // Offline fallback: keep local list inactive until verified
        }
      }

      if (!cancelled) setIsChecking(false);
    };

    bootstrap();
  }, []);

  const handleCheckout = async (provider: 'stripe' | 'paypal') => {
    if (!selectedProduct) return;
    setCheckoutLoading(provider);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          productId: selectedProduct.id,
          email: buyerEmail.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setStatusMessage({
          type: 'err',
          text: data.error || 'No se pudo iniciar la sesión de pago.',
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
    if (!selectedProduct) return;
    const cleaned = accessCode.trim();
    if (!cleaned) return;

    setCheckoutLoading('code');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'code',
          productId: selectedProduct.id,
          accessCode: cleaned,
        }),
      });
      const data = (await res.json()) as {
        verified?: boolean;
        token?: string;
        productId?: ProductId;
        error?: string;
      };
      if (!res.ok || !data.verified || !data.token) {
        setStatusMessage({
          type: 'err',
          text: data.error || 'Código de acceso inválido.',
        });
        return;
      }

      const unlockedPid = data.productId || selectedProduct.id;
      const nextMap: TokenMap = { ...loadStoredTokens(), [unlockedPid]: data.token };
      saveStoredTokens(nextMap);
      syncUnlocked(Object.keys(nextMap) as ProductId[]);

      setAccessCode('');
      setSelectedProduct(null);
      setStatusMessage({
        type: 'ok',
        text: `Acceso verificado para ${selectedProduct.name}. Tu descarga automática ha iniciado.`,
      });
      await triggerProductDeliverable(unlockedPid, 'all');
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
    config && (config.stripeEnabled || config.paypalEnabled || config.accessCodeEnabled)
  );

  const renderCardIcon = (id: ProductId) => {
    if (id === 'neuro-kit') return <Brain size={44} strokeWidth={1.6} />;
    if (id === 'reactivos-pack') return <FileText size={44} strokeWidth={1.6} />;
    return <Shield size={44} strokeWidth={1.6} />;
  };

  return (
    <div className="tools-viewport">
      {/* Editorial Header matching reference screenshot */}
      <div className="packs-hero-header">
        <div className="section-eyebrow">Descarga Inmediata Verificada · Stripe &amp; PayPal</div>
        <h1 className="packs-h1">Herramientas de Alto Rendimiento</h1>
        <p className="packs-sub">
          Tecnología educativa de bajo costo y alto impacto. Compra segura y descarga directa al instante en tu navegador, sin esperas ni intermediarios.
        </p>

        <div className="packs-verify-strip">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const { generateSampleKitPdf } = await import('./pdfKitGenerator');
              generateSampleKitPdf();
            }}
          >
            <FileText size={14} />
            Descargar Muestra Gratuita (PDF)
          </button>

          <button
            type="button"
            className={`btn btn-sm ${playingAudio?.kind === 'neuro-focus' && playingAudio.isPreview ? 'btn-gold' : 'btn-secondary'}`}
            onClick={() => toggleLiveAudio('neuro-focus', true)}
          >
            {playingAudio?.kind === 'neuro-focus' && playingAudio.isPreview ? <Square size={13} /> : <Volume2 size={14} />}
            {playingAudio?.kind === 'neuro-focus' && playingAudio.isPreview
              ? `Detener Muestra 40Hz (${15 - playingAudio.secondsElapsed}s)`
              : 'Escuchar Muestra Audio 40 Hz (15s)'}
          </button>

          <button
            type="button"
            className={`btn btn-sm ${playingAudio?.kind === 'nsdr-calm' && playingAudio.isPreview ? 'btn-gold' : 'btn-secondary'}`}
            onClick={() => toggleLiveAudio('nsdr-calm', true)}
          >
            {playingAudio?.kind === 'nsdr-calm' && playingAudio.isPreview ? <Square size={13} /> : <Headphones size={14} />}
            {playingAudio?.kind === 'nsdr-calm' && playingAudio.isPreview
              ? `Detener Muestra NSDR (${15 - playingAudio.secondsElapsed}s)`
              : 'Escuchar Muestra NSDR (15s)'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`kit-feedback is-${statusMessage.type}`} style={{ maxWidth: '760px', margin: '0 auto 20px' }}>
          {statusMessage.text}
        </div>
      )}

      {/* 3-Card Premium Showcase Grid */}
      <div className="packs-grid">
        {products.map((product) => {
          const isUnlocked = unlockedIds.includes(product.id);
          const themeClass =
            product.id === 'neuro-kit'
              ? 'is-neuro'
              : product.id === 'reactivos-pack'
                ? 'is-featured'
                : 'is-nsdr';

          return (
            <article key={product.id} className={`pack-card ${themeClass} ${isUnlocked ? 'is-unlocked' : ''}`}>
              <div className="pack-visual-band">
                <span className="pack-badge">{isUnlocked ? '✓ Desbloqueado' : product.badge}</span>
                <div className="pack-icon-wrap">{renderCardIcon(product.id)}</div>
              </div>

              <div className="pack-body">
                <h2 className="pack-title">{product.name}</h2>
                <p className="pack-tagline">{product.tagline}</p>

                <ul className="pack-deliverables">
                  {product.deliverables.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={14} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {product.id === 'reactivos-pack' && latestReportText && (
                  <div className="pack-diagnostic-note">
                    <Sparkles size={13} />
                    <span>Incluye tu reporte diagnóstico actual dentro del PDF.</span>
                  </div>
                )}

                <div className="pack-footer">
                  <div className="pack-price-line">
                    <span className="pack-price">${product.priceMxn} MXN</span>
                    <span className="pack-compare">${product.compareAtMxn}</span>
                  </div>

                  {isUnlocked ? (
                    <div className="pack-unlocked-actions">
                      {product.id === 'neuro-kit' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-emerald"
                            style={{ width: '100%' }}
                            disabled={Boolean(downloadingId)}
                            onClick={() => triggerProductDeliverable('neuro-kit', 'pdf')}
                          >
                            <Download size={15} />
                            Descargar Guía PDF
                          </button>
                          <div className="pack-dual-row">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={Boolean(downloadingId)}
                              onClick={() => triggerProductDeliverable('neuro-kit', 'audio')}
                            >
                              <Download size={14} />
                              Audio .wav
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => toggleLiveAudio('neuro-focus', false)}
                            >
                              {playingAudio?.kind === 'neuro-focus' && !playingAudio.isPreview ? (
                                <Square size={13} />
                              ) : (
                                <Play size={13} />
                              )}
                              {playingAudio?.kind === 'neuro-focus' && !playingAudio.isPreview
                                ? 'Detener'
                                : 'Reproducir 40Hz'}
                            </button>
                          </div>
                        </>
                      )}

                      {product.id === 'reactivos-pack' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-gold"
                            style={{ width: '100%' }}
                            disabled={Boolean(downloadingId)}
                            onClick={() => triggerProductDeliverable('reactivos-pack', 'pdf')}
                          >
                            <Download size={15} />
                            Descargar 50 Reactivos (PDF)
                          </button>
                          <button
                            type="button"
                            className="btn btn-emerald"
                            style={{ width: '100%' }}
                            onClick={() => setShowSimulatorModal(true)}
                          >
                            <Sparkles size={15} />
                            Abrir Simulador (50 Preguntas)
                          </button>
                        </>
                      )}

                      {product.id === 'nsdr-protocol' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-emerald"
                            style={{ width: '100%' }}
                            disabled={Boolean(downloadingId)}
                            onClick={() => triggerProductDeliverable('nsdr-protocol', 'audio')}
                          >
                            <Download size={15} />
                            Descargar Audio NSDR (.wav)
                          </button>
                          <div className="pack-dual-row">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={Boolean(downloadingId)}
                              onClick={() => triggerProductDeliverable('nsdr-protocol', 'pdf')}
                            >
                              <FileText size={14} />
                              Guía PDF
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => toggleLiveAudio('nsdr-calm', false)}
                            >
                              {playingAudio?.kind === 'nsdr-calm' && !playingAudio.isPreview ? (
                                <Square size={13} />
                              ) : (
                                <Play size={13} />
                              )}
                              {playingAudio?.kind === 'nsdr-calm' && !playingAudio.isPreview
                                ? 'Detener'
                                : 'Reproducir NSDR'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`btn ${product.featured ? 'btn-gold' : 'btn-obsidian'}`}
                      style={{ width: '100%' }}
                      onClick={() => {
                        setStatusMessage(null);
                        setSelectedProduct(product);
                      }}
                    >
                      {product.ctaLabel}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Trust Bar */}
      <div className="privacy-note packs-trust-footer">
        <ShieldCheck size={18} style={{ color: 'var(--gold-400)', flexShrink: 0 }} />
        <span>
          <strong>Pago seguro con Stripe y PayPal + Descarga Automática:</strong> Al completar tu compra regresas directo aquí y tu PDF / Audio WAV se descarga al instante sin redirigir a chats externos.
        </span>
      </div>

      {/* Checkout Modal for Selected Product */}
      {selectedProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
          <div className="modal-card modal-checkout">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div className="kit-status-badge" style={{ marginBottom: '8px' }}>
                  <Lock size={13} />
                  Checkout Seguro · Descarga Inmediata
                </div>
                <h2 id="checkout-modal-title" className="modal-title-serif">
                  {selectedProduct.name}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedProduct(null)}
                aria-label="Cerrar checkout"
              >
                <X size={18} />
              </button>
            </div>

            <div className="checkout-price-banner">
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pago único · Acceso instantáneo</div>
                <div className="pack-price" style={{ fontSize: '26px' }}>
                  ${selectedProduct.priceMxn} MXN{' '}
                  <span className="pack-compare" style={{ fontSize: '14px' }}>
                    ${selectedProduct.compareAtMxn}
                  </span>
                </div>
              </div>
              <Unlock size={22} style={{ color: 'var(--gold-400)' }} />
            </div>

            <ul className="pack-deliverables" style={{ marginBottom: '16px' }}>
              {selectedProduct.deliverables.map((d) => (
                <li key={d}>
                  <CheckCircle2 size={14} />
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            {isChecking ? (
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Verificando pasarela de pagos...</p>
            ) : !backendAvailable ? (
              <div className="kit-notice-box">
                <strong>Vista previa local sin servidor de pagos:</strong> Al desplegar en Vercel con tus claves de <code>STRIPE_SECRET_KEY</code> o <code>PAYPAL_CLIENT_ID</code> / <code>PAYPAL_CLIENT_SECRET</code>, este modal abrirá el pago real y descargará el archivo automáticamente al regresar.
              </div>
            ) : !anyPaymentMethodEnabled ? (
              <div className="kit-notice-box">
                <strong>Configuración pendiente en el servidor:</strong> Agrega <code>STRIPE_SECRET_KEY</code> o <code>PAYPAL_CLIENT_ID</code> + <code>PAYPAL_CLIENT_SECRET</code> y <code>DOWNLOAD_TOKEN_SECRET</code> en las variables de entorno de Vercel para habilitar el cobro directo.
              </div>
            ) : (
              <div className="kit-pay-buttons">
                {(config?.stripeEnabled || config?.paypalEnabled) && (
                  <div>
                    <label htmlFor="buyer-receipt-email" className="field-label">
                      Correo para tu recibo (opcional)
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
                    className="btn btn-gold"
                    style={{ width: '100%' }}
                    disabled={checkoutLoading !== null}
                    onClick={() => handleCheckout('stripe')}
                  >
                    <CreditCard size={16} />
                    {checkoutLoading === 'stripe'
                      ? 'Conectando con Stripe...'
                      : `Pagar $${selectedProduct.priceMxn} MXN con Tarjeta / Apple Pay (Stripe)`}
                  </button>
                )}

                {config?.paypalEnabled && (
                  <button
                    type="button"
                    className="btn btn-paypal"
                    style={{ width: '100%' }}
                    disabled={checkoutLoading !== null}
                    onClick={() => handleCheckout('paypal')}
                  >
                    <CreditCard size={16} />
                    {checkoutLoading === 'paypal'
                      ? 'Conectando con PayPal...'
                      : `Pagar $${selectedProduct.priceMxn} MXN con PayPal`}
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

            {statusMessage && statusMessage.type === 'err' && (
              <div className="kit-feedback is-err" style={{ marginTop: '12px' }}>
                {statusMessage.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full 50-Question Simulator Modal (Unlocked by reactivos-pack) */}
      {showSimulatorModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Simulador EXANI-II 50 Reactivos">
          <div className="modal-card modal-simulator">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowSimulatorModal(false)}
                aria-label="Cerrar simulador"
              >
                <X size={18} />
              </button>
            </div>
            <ExaniSimulator isUnlocked={unlockedIds.includes('reactivos-pack')} />
          </div>
        </div>
      )}
    </div>
  );
};
