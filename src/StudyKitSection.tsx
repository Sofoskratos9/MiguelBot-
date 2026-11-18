import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  BookOpen,
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
  Square,
  Unlock,
  Volume2,
  X,
} from 'lucide-react';
import { LiveBinauralPlayer, type AudioSessionKind } from './audioGenerator';
import { ExaniSimulator } from './ExaniSimulator';
import { getUaaCycleContext } from '../shared/examCycle';
import { EXAM_SOURCES_SNAPSHOT } from '../shared/examSources';

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
  accessCodeEnabled: boolean;
  products: ProductSpec[];
  examCycle?: {
    editionMonthYear: string;
    targetAdmissionYear: number;
    editionLabel: string;
    uaaPhaseLabel: string;
  };
  examSources?: {
    lastSyncedIso: string;
    lastSyncedLabel: string;
  };
}

const initialCycle = getUaaCycleContext();

const DEFAULT_PRODUCTS: ProductSpec[] = [
  {
    id: 'neuro-kit',
    name: 'Kit de Neuro-Aprendizaje',
    badge: 'PDF + Audio WAV',
    tagline:
      'Guía visual extensa con diagramas ultradianos (90/20), 4 plantillas imprimibles Feynman/Repaso Espaciado, casos resueltos y audio binaural 40 Hz.',
    priceMxn: 99,
    compareAtMxn: 299,
    ctaLabel: 'Pagar con Stripe y Descargar',
    deliverables: [
      'PDF Cuaderno Visual + 4 Plantillas + Casos Resueltos (14 págs.)',
      'Audio Binaural 40 Hz Enfoque Profundo (.wav)',
      'Reproductor Binaural Integrado Sin Límite',
    ],
  },
  {
    id: 'reactivos-pack',
    name: 'Banco de 50 Reactivos EXANI-II',
    badge: `Edición ${initialCycle.targetAdmissionYear}`,
    tagline: `50 preguntas originales estilo CENEVAL ${initialCycle.targetAdmissionYear} en formato examen imprimible + hoja óptica de burbujas + formulario maestro + solucionario completo.`,
    priceMxn: 149,
    compareAtMxn: 499,
    ctaLabel: 'Comprar Pack con Stripe',
    featured: true,
    deliverables: [
      'PDF Examen 50 Reactivos + Hoja Burbujas + Formulario + Solucionario (25 págs.)',
      'Simulador Interactivo Completo (50 Preguntas por Área)',
      'Diagnóstico Personal Integrado en tu Cuadernillo',
    ],
  },
  {
    id: 'nsdr-protocol',
    name: 'Guía para llegar con calma al examen',
    badge: 'Audio WAV + Guía PDF',
    tagline:
      'Audio de calma y manual práctico con respiración guiada, 4 rescates en aula y tarjeta de bolsillo de 60 segundos para el día del examen.',
    priceMxn: 79,
    compareAtMxn: 199,
    ctaLabel: 'Obtener Audio y Guía',
    deliverables: [
      'Audio de calma guiado (.wav)',
      'PDF Manual Práctico + Diagramas + Tarjeta de Bolsillo (10 págs.)',
      'Reproductor de audio guiado de 10 minutos en el navegador',
    ],
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
  const [checkoutLoading, setCheckoutLoading] = useState<'stripe' | 'code' | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [recentPurchaseId, setRecentPurchaseId] = useState<ProductId | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showSimulatorModal, setShowSimulatorModal] = useState<boolean>(false);

  const [playingAudio, setPlayingAudio] = useState<{
    kind: AudioSessionKind;
    isPreview: boolean;
    secondsElapsed: number;
  } | null>(null);

  const playerRef = useRef<LiveBinauralPlayer | null>(null);
  const handledRedirectRef = useRef<boolean>(false);
  const latestReportRef = useRef<string | null>(latestReportText);
  latestReportRef.current = latestReportText;

  const products = config?.products?.length ? config.products : DEFAULT_PRODUCTS;

  const syncUnlocked = (ids: ProductId[]) => {
    const unique = Array.from(new Set(ids));
    setUnlockedIds(unique);
    onUnlockedProductsChange?.(unique);
  };

  useEffect(() => {
    return () => {
      playerRef.current?.stop();
    };
  }, []);

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
          if (asset === 'all') {
            await new Promise((r) => setTimeout(r, 600));
          }
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
          if (asset === 'all') {
            await new Promise((r) => setTimeout(r, 600));
          }
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

      // 1. Load catalog & Stripe availability from server
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

      // 2. Check Stripe redirect parameters
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const provider = params.get('provider');
      const paramProduct = params.get('product') as ProductId | null;
      const sessionId = params.get('session_id');

      if (!handledRedirectRef.current && paymentStatus === 'cancelled') {
        handledRedirectRef.current = true;
        if (!cancelled) {
          setStatusMessage({
            type: 'info',
            text: 'El pago en Stripe fue cancelado. No se realizó ningún cargo.',
          });
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else if (
        !handledRedirectRef.current &&
        paymentStatus === 'success' &&
        provider === 'stripe' &&
        sessionId
      ) {
        handledRedirectRef.current = true;
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'stripe',
              productId: paramProduct || undefined,
              sessionId,
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
              setRecentPurchaseId(verifyData.productId);
              setStatusMessage({
                type: 'ok',
                text: 'Pago confirmado con Stripe. Tus descargas iniciaron automáticamente; también tienes los botones directos abajo.',
              });
              confetti({
                particleCount: 70,
                spread: 65,
                origin: { y: 0.65 },
                colors: ['#C96F4A', '#14532D', '#2E6B45', '#D9A441'],
              });
              window.history.replaceState({}, '', window.location.pathname);
              await triggerProductDeliverable(verifyData.productId, 'all');
            }
          } else if (!cancelled) {
            setStatusMessage({
              type: 'err',
              text: verifyData.error || 'No se pudo confirmar automáticamente tu pago con Stripe.',
            });
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch {
          if (!cancelled) {
            setStatusMessage({
              type: 'err',
              text: 'Error de red al verificar tu pago con el servidor.',
            });
          }
        } finally {
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
          // Keep current state if offline
        }
      }

      if (!cancelled) setIsChecking(false);
    };

    bootstrap();
  }, []);

  const handleStripeCheckout = async () => {
    if (!selectedProduct) return;
    setCheckoutLoading('stripe');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'stripe',
          productId: selectedProduct.id,
          email: buyerEmail.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setStatusMessage({
          type: 'err',
          text: data.error || 'No se pudo iniciar la sesión de pago en Stripe.',
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
      setRecentPurchaseId(unlockedPid);

      setAccessCode('');
      setSelectedProduct(null);
      setStatusMessage({
        type: 'ok',
        text: `Acceso verificado para ${selectedProduct.name}. Tus descargas iniciaron automáticamente.`,
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

  const anyPaymentMethodEnabled = Boolean(config && (config.stripeEnabled || config.accessCodeEnabled));
  const recentProduct = recentPurchaseId ? products.find((p) => p.id === recentPurchaseId) : null;

  const getFolioMeta = (id: ProductId) => {
    if (id === 'neuro-kit') {
      return {
        code: 'CUADERNO 01',
        pages: '14 páginas imprimibles',
        format: 'Ciclos 90/20 + Audio 40 Hz (.wav)',
        icon: <Brain size={20} strokeWidth={1.7} />,
      };
    }
    if (id === 'reactivos-pack') {
      return {
        code: 'CUADERNO 02',
        pages: '25 páginas + Simulador web',
        format: '50 reactivos + Hoja óptica + Soluciones',
        icon: <FileText size={20} strokeWidth={1.7} />,
      };
    }
    return {
      code: 'CUADERNO 03',
      pages: '10 páginas + Audio 10 min',
      format: 'Respiración guiada + Tarjeta bolsillo',
      icon: <Shield size={20} strokeWidth={1.7} />,
    };
  };

  return (
    <div className="tools-viewport">
      <div className="packs-hero-header">
        <div className="section-eyebrow">
          Pago único con Stripe · Descarga directa · {initialCycle.editionLabel} (Fuentes: {EXAM_SOURCES_SNAPSHOT.lastSyncedLabel})
        </div>
        <h1 className="packs-h1">Cuadernos de Estudio y Audio WAV</h1>
        <p className="packs-sub">
          Material editorial listo para imprimir, pistas estéreo .wav sin compresión y simulador de 50 reactivos. Escucha las muestras o descarga la guía gratuita antes de decidir.
        </p>
        <figure className="neftali-fig" style={{ maxWidth: '320px', margin: '0 auto 20px' }}>
          <img
            src="/ilustraciones/puerta.png"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            alt="Puerta entreabierta: elige por dónde seguir tu preparación"
            loading="lazy"
          />
        </figure>

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
              ? `Detener muestra (${15 - playingAudio.secondsElapsed}s)`
              : 'Escuchar muestra de calma (15 s)'}
          </button>
        </div>
      </div>

      {/* Confirmed Post-Payment Instant Download Dock */}
      {recentProduct && (
        <div className="confirmed-download-dock" role="region" aria-label="Centro de descargas desbloqueadas">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <CheckCircle2 size={22} style={{ color: 'var(--emerald-500)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--emerald-500)', textTransform: 'uppercase' }}>
                Pago Confirmado · Acceso Permanente en este Navegador
              </div>
              <h2 className="modal-title-serif" style={{ fontSize: '20px', margin: '2px 0 0' }}>
                {recentProduct.name} — Listo para descargar
              </h2>
            </div>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            Si tu navegador bloqueó alguna descarga automática múltiple, haz clic directamente en cada archivo abajo:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-gold"
              disabled={Boolean(downloadingId)}
              onClick={() => triggerProductDeliverable(recentProduct.id, 'pdf')}
            >
              <Download size={15} />
              Descargar Cuaderno PDF Completo
            </button>
            {(recentProduct.id === 'neuro-kit' || recentProduct.id === 'nsdr-protocol') && (
              <button
                type="button"
                className="btn btn-emerald"
                disabled={Boolean(downloadingId)}
                onClick={() => triggerProductDeliverable(recentProduct.id, 'audio')}
              >
                <Download size={15} />
                Descargar Audio Estéreo (.wav)
              </button>
            )}
            {recentProduct.id === 'reactivos-pack' && (
              <button type="button" className="btn btn-emerald" onClick={() => setShowSimulatorModal(true)}>
                <BookOpen size={15} />
                Abrir Simulador de 50 Preguntas
              </button>
            )}
          </div>
        </div>
      )}

      {statusMessage && (
        <div className={`kit-feedback is-${statusMessage.type}`} style={{ maxWidth: '780px', margin: '0 auto 22px' }}>
          {statusMessage.text}
        </div>
      )}

      {/* 3-Card Editorial Folio Grid */}
      <div className="packs-grid">
        {products.map((product) => {
          const isUnlocked = unlockedIds.includes(product.id);
          const folio = getFolioMeta(product.id);
          const themeClass =
            product.id === 'neuro-kit'
              ? 'is-neuro'
              : product.id === 'reactivos-pack'
                ? 'is-featured'
                : 'is-nsdr';

          return (
            <article key={product.id} className={`pack-card ${themeClass} ${isUnlocked ? 'is-unlocked' : ''}`}>
              <div className="pack-folio-band">
                <div className="pack-folio-top">
                  <span className="pack-catalog-code">{folio.code}</span>
                  <span className="pack-badge">{isUnlocked ? '✓ Desbloqueado' : product.badge}</span>
                </div>
                <div className="pack-folio-spec">
                  <div className="pack-folio-meta">
                    {folio.pages}
                    <span>{folio.format}</span>
                  </div>
                  <div className="pack-folio-emblem" aria-hidden="true">
                    {folio.icon}
                  </div>
                </div>
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
                    <BookOpen size={13} />
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
                            Descargar Cuaderno PDF (14 págs.)
                          </button>
                          <div className="pack-dual-row">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={Boolean(downloadingId)}
                              onClick={() => triggerProductDeliverable('neuro-kit', 'audio')}
                            >
                              <Download size={14} />
                              Audio 40Hz .wav
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
                            Descargar Pack 50 Reactivos (25 págs.)
                          </button>
                          <button
                            type="button"
                            className="btn btn-emerald"
                            style={{ width: '100%' }}
                            onClick={() => setShowSimulatorModal(true)}
                          >
                            <BookOpen size={15} />
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
                            Descargar audio (.wav)
                          </button>
                          <div className="pack-dual-row">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={Boolean(downloadingId)}
                              onClick={() => triggerProductDeliverable('nsdr-protocol', 'pdf')}
                            >
                              <FileText size={14} />
                              Guía PDF (10 págs.)
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
                                : 'Reproducir audio de calma'}
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
                      <ArrowRight size={14} />
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
        <img
          className="neftali-motif-sm"
          src="/ilustraciones/balanza.png"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          alt="Balanza: pesa lo que de verdad importa antes de decidir"
          loading="lazy"
        />
        <span>
          <strong>Checkout oficial con Stripe + Descarga Directa:</strong> Paga de forma encriptada con tarjeta, Apple Pay o Google Pay; al confirmar regresas automáticamente aquí para descargar tu PDF y Audio WAV al instante. Lee nuestro <a href="/aviso-de-privacidad.html" target="_blank" rel="noreferrer">aviso de privacidad</a> y, si quieres acompañamiento 1 a 1, la Mentoría EXANI-UAA (4 sesiones, 10 lugares, $1,600 MXN) se acuerda por <a href="https://wa.me/524494550463" target="_blank" rel="noreferrer">WhatsApp</a>.
        </span>
      </div>

      {/* Stripe-Only Checkout Modal */}
      {selectedProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
          <div className="modal-card modal-checkout">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div className="kit-status-badge" style={{ marginBottom: '8px' }}>
                  <Lock size={13} />
                  Pago Seguro con Stripe · Descarga Inmediata
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
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Verificando conexión con Stripe...</p>
            ) : !backendAvailable ? (
              <div className="kit-notice-box">
                <strong>Vista previa local sin servidor de pagos:</strong> en producción con <code>STRIPE_SECRET_KEY</code>, este botón abrirá Stripe Checkout y descargará tus archivos automáticamente al volver.
              </div>
            ) : !anyPaymentMethodEnabled ? (
              <div className="kit-notice-box">
                <strong>Stripe pendiente de configurar:</strong> agrega <code>STRIPE_SECRET_KEY</code> en Vercel Environment Variables para habilitar los cobros directos.
              </div>
            ) : (
              <div className="kit-pay-buttons">
                {config?.stripeEnabled && (
                  <>
                    <div>
                      <label htmlFor="buyer-receipt-email" className="field-label">
                        Correo para tu recibo de Stripe (opcional)
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

                    <button
                      type="button"
                      className="btn btn-gold"
                      style={{ width: '100%' }}
                      disabled={checkoutLoading !== null}
                      onClick={handleStripeCheckout}
                    >
                      <CreditCard size={16} />
                      {checkoutLoading === 'stripe'
                        ? 'Abriendo Stripe Checkout...'
                        : `Pagar $${selectedProduct.priceMxn} MXN con Stripe`}
                    </button>
                  </>
                )}

                {config?.accessCodeEnabled && (
                  <form onSubmit={handleVerifyAccessCode} className="access-code-form">
                    <label htmlFor="kit-access-code" className="field-label" style={{ marginBottom: '4px' }}>
                      ¿Tienes un código de acceso?
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

      {/* Full 50-Question Simulator Modal */}
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
