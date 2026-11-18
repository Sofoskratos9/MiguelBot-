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
      'Guía visual extensa con diagramas ultradianos (90/20), plantillas imprimibles Feynman/Repaso Espaciado y audio binaural 40 Hz.',
    priceMxn: parsePrice(process.env.PRICE_NEURO_KIT_MXN, 99),
    compareAtMxn: 299,
    ctaLabel: 'Pagar con Stripe y Descargar',
    deliverables: [
      'PDF Cuaderno Visual + Plantillas Imprimibles (8 págs.)',
      'Audio Binaural 40 Hz Enfoque Profundo (.wav)',
      'Reproductor Binaural Integrado Sin Límite',
    ],
  },
  'reactivos-pack': {
    id: 'reactivos-pack',
    name: 'Banco de 50 Reactivos EXANI-II',
    badge: 'Best Seller · Edición 2026',
    tagline:
      '50 preguntas originales estilo CENEVAL 2026 en formato examen imprimible + solucionario completo paso a paso + simulador interactivo.',
    priceMxn: parsePrice(process.env.PRICE_REACTIVOS_PACK_MXN, 149),
    compareAtMxn: 499,
    ctaLabel: 'Comprar Pack con Stripe',
    featured: true,
    deliverables: [
      'PDF Examen 50 Reactivos + Tabla Clave + Solucionario (20 págs.)',
      'Simulador Interactivo Completo (50 Preguntas por Área)',
      'Diagnóstico Personal Integrado en tu Cuadernillo',
    ],
  },
  'nsdr-protocol': {
    id: 'nsdr-protocol',
    name: 'Protocolo Anti-Ansiedad NSDR',
    badge: 'Audio WAV + Guía PDF',
    tagline:
      'Audio estéreo NSDR (Alpha 10 Hz → Theta 6 Hz) y guía clínica visual de regulación vagal 4-7-8 / 4-4-4-4 y checklist pre-examen UAA.',
    priceMxn: parsePrice(process.env.PRICE_NSDR_PROTOCOL_MXN, 79),
    compareAtMxn: 199,
    ctaLabel: 'Obtener Audio y Guía',
    deliverables: [
      'Audio Estéreo NSDR Alpha → Theta (.wav)',
      'PDF Guía Clínica Pre-Examen + Diagramas (5 págs.)',
      'Reproductor NSDR Guiado 10 Minutos en Navegador',
    ],
  },
});

export const isValidProductId = (value: unknown): value is ProductId => {
  return value === 'neuro-kit' || value === 'reactivos-pack' || value === 'nsdr-protocol';
};
