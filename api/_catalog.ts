import { getUaaCycleContext } from '../shared/examCycle.js';

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

export const getServerCatalog = (now: Date = new Date()): Record<ProductId, ProductSpec> => {
  const cycle = getUaaCycleContext(now);
  return {
    'neuro-kit': {
      id: 'neuro-kit',
      name: 'Kit de Neuro-Aprendizaje',
      badge: 'PDF + Audio WAV',
      tagline:
        'Guía visual extensa con diagramas ultradianos (90/20), 4 plantillas imprimibles Feynman/Repaso Espaciado, casos resueltos y audio binaural 40 Hz.',
      priceMxn: parsePrice(process.env.PRICE_NEURO_KIT_MXN, 99),
      compareAtMxn: 299,
      ctaLabel: 'Pagar con Stripe y Descargar',
      deliverables: [
        'PDF Cuaderno Visual + 4 Plantillas + Casos Resueltos (14 págs.)',
        'Audio Binaural 40 Hz Enfoque Profundo (.wav)',
        'Reproductor Binaural Integrado Sin Límite',
      ],
    },
    'reactivos-pack': {
      id: 'reactivos-pack',
      name: 'Banco de 50 Reactivos EXANI-II',
      badge: `Best Seller · Edición ${cycle.targetAdmissionYear}`,
      tagline: `50 preguntas originales estilo CENEVAL ${cycle.targetAdmissionYear} en formato examen imprimible + hoja óptica de burbujas + formulario maestro + solucionario completo.`,
      priceMxn: parsePrice(process.env.PRICE_REACTIVOS_PACK_MXN, 149),
      compareAtMxn: 499,
      ctaLabel: 'Comprar Pack con Stripe',
      featured: true,
      deliverables: [
        'PDF Examen 50 Reactivos + Hoja Burbujas + Formulario + Solucionario (25 págs.)',
        'Simulador Interactivo Completo (50 Preguntas por Área)',
        'Diagnóstico Personal Integrado en tu Cuadernillo',
      ],
    },
    'nsdr-protocol': {
      id: 'nsdr-protocol',
      name: 'Protocolo Anti-Ansiedad NSDR',
      badge: 'Audio WAV + Guía PDF',
      tagline:
        'Audio estéreo NSDR (Alpha 10 Hz → Theta 6 Hz) y manual visual con curva Yerkes-Dodson, 4 rescates en aula y tarjeta de bolsillo 60s.',
      priceMxn: parsePrice(process.env.PRICE_NSDR_PROTOCOL_MXN, 79),
      compareAtMxn: 199,
      ctaLabel: 'Obtener Audio y Guía',
      deliverables: [
        'Audio Estéreo NSDR Alpha → Theta (.wav)',
        'PDF Manual Clínico + Diagramas + Tarjeta de Bolsillo (10 págs.)',
        'Reproductor NSDR Guiado 10 Minutos en Navegador',
      ],
    },
  };
};

export const isValidProductId = (value: unknown): value is ProductId => {
  return value === 'neuro-kit' || value === 'reactivos-pack' || value === 'nsdr-protocol';
};
