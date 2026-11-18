export interface UaaCycleContext {
  isoDate: string;
  currentYear: number;
  currentYearShort: string;
  monthNumber: number;
  dayNumber: number;
  monthName: string;
  monthTitle: string;
  editionMonthYear: string;
  targetAdmissionYear: number;
  editionLabel: string;
  shortCycleTag: string;
  uaaPhaseLabel: string;
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const capitalize = (text: string): string =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

export const getMexicoCityDateParts = (now: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value || now.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value || now.getUTCMonth() + 1);
  const day = Number(parts.find((p) => p.type === 'day')?.value || now.getUTCDate());
  return { year, month, day };
};

export const getUaaCycleContext = (now: Date = new Date()): UaaCycleContext => {
  const { year, month, day } = getMexicoCityDateParts(now);
  const safeMonth = Math.min(12, Math.max(1, month));
  const monthName = MONTHS_ES[safeMonth - 1];
  const monthTitle = capitalize(monthName);

  // El examen principal anual de la UAA se aplica entre mayo y junio.
  // De agosto a diciembre los aspirantes ya preparan la convocatoria del año siguiente.
  const targetAdmissionYear = safeMonth >= 8 ? year + 1 : year;

  let uaaPhaseLabel: string;
  if (safeMonth >= 2 && safeMonth <= 3) {
    uaaPhaseLabel = `Ventana de Convocatoria y Prerregistro UAA ${targetAdmissionYear}`;
  } else if (safeMonth >= 4 && safeMonth <= 5) {
    uaaPhaseLabel = `Recta Final Pre-Examen EXANI-II UAA ${targetAdmissionYear}`;
  } else if (safeMonth >= 6 && safeMonth <= 7) {
    uaaPhaseLabel = `Publicación de Resultados UAA ${targetAdmissionYear} y Diagnóstico Temprano`;
  } else {
    uaaPhaseLabel = `Preparación Anticipada Rumbo a Admisión UAA ${targetAdmissionYear}`;
  }

  const mm = String(safeMonth).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return {
    isoDate: `${year}-${mm}-${dd}`,
    currentYear: year,
    currentYearShort: String(year).slice(-2),
    monthNumber: safeMonth,
    dayNumber: day,
    monthName,
    monthTitle,
    editionMonthYear: `${monthTitle} ${year}`,
    targetAdmissionYear,
    editionLabel: `Edición ${monthTitle} ${year} · Admisión UAA ${targetAdmissionYear}`,
    shortCycleTag: `UAA ${targetAdmissionYear}`,
    uaaPhaseLabel,
  };
};
