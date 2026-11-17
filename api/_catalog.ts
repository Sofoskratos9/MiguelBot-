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

const parsePrice = (envVal: string | undefined, fallback: number): number => {
  const n = Number(envVal);
  if (!Number.isFinite(n) || n < 10) return fallback;
  return Math.round(n);
};

export const getServerCatalog = (): Record<ProductId, ProductSpec> => ({
  'neuro-kit': {
    id: 'neuro-kit',
    name: 'Kit de Neuro-Aprendizaje',
    badge: 'PDF + Audio WAV',
    tagline:
      'Plantillas de estudio basadas en ciclos ultradianos (90/20), método Feynman y audio binaural 40 Hz para enfoque profundo.',
    priceMxn: parsePrice(process.env.PRICE_NEURO_KIT_MXN, 99),
    compareAtMxn: 299,
    ctaLabel: 'Comprar y Descargar',
    deliverables: ['PDF Plantillas Ultradianas y Repaso Espaciado', 'Audio Binaural 40 Hz Enfoque (.wav)'],
  },
  'reactivos-pack': {
    id: 'reactivos-pack',
    name: 'Banco de 50 Reactivos EXANI-II',
    badge: 'Best Seller · Edición 2026',
    tagline:
      '50 preguntas originales de alta exigencia basadas en el temario oficial CENEVAL 2026 con simulacro interactivo y soluciones comentadas.',
    priceMxn: parsePrice(process.env.PRICE_REACTIVOS_PACK_MXN, 149),
    compareAtMxn: 499,
    ctaLabel: 'Comprar y Descargar Pack',
    featured: true,
    deliverables: [
      'PDF 50 Reactivos EXANI-II + Clave Explicada',
      'Simulador Interactivo Completo Desbloqueado',
    ],
  },
  'nsdr-protocol': {
    id: 'nsdr-protocol',
    name: 'Protocolo Anti-Ansiedad NSDR',
    badge: 'Audio + Guía PDF',
    tagline:
      'Sesión sonora de 10 min basada en NSDR (Alpha → Theta) y respiración táctica 4-7-8 para reducir el estrés antes del examen.',
    priceMxn: parsePrice(process.env.PRICE_NSDR_PROTOCOL_MXN, 79),
    compareAtMxn: 199,
    ctaLabel: 'Obtener Audio y Guía',
    deliverables: ['Audio Protocolo NSDR Relajación (.wav)', 'PDF Rutina Pre-Examen 10 Minutos'],
  },
});

export const isValidProductId = (value: unknown): value is ProductId => {
  return value === 'neuro-kit' || value === 'reactivos-pack' || value === 'nsdr-protocol';
};
