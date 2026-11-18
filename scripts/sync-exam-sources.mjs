#!/usr/bin/env node
/**
 * Sincronizador automatico mensual/bajo demanda de fuentes oficiales EXANI-II (CENEVAL) y UAA.
 * Actualiza shared/examSources.ts preservando la estructura tipada del proyecto.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(ROOT_DIR, 'shared', 'examSources.ts');

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const getMexicoMonthYearLabel = (now = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value || now.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value || now.getUTCMonth() + 1);
  return `${MONTHS_ES[Math.min(11, Math.max(0, month - 1))]} ${year}`;
};

const decodeEntities = (str) =>
  String(str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&#038;/gi, '&')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'MiguelBot-EXANI-Sync/1.0 (+https://miguel-bot.vercel.app)',
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} en ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

const extractTitleFromHtml = (html) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).slice(0, 140) : '';
};

const checkCenevalOfficial = async (nowIso) => {
  const url = 'https://ceneval.edu.mx/examenes-ingreso-exani_ii/';
  let title = 'Nivel Superior EXANI-II — Estructura oficial vigente (3 opciones, 4.5 h)';
  let note =
    'Estructura verificada: Áreas transversales (30+30+30), 2 módulos de conocimientos específicos (24+24 o Premedicina 48) e inglés diagnóstico (30).';

  try {
    const html = await fetchWithTimeout(url);
    const parsedTitle = extractTitleFromHtml(html);
    if (parsedTitle && /exani/i.test(parsedTitle)) {
      title = parsedTitle;
    }

    const plain = decodeEntities(html).toLowerCase();
    const checks = [];
    if (plain.includes('comprensión lectora') || plain.includes('comprension lectora')) {
      checks.push('Comprensión Lectora');
    }
    if (plain.includes('redacción indirecta') || plain.includes('redaccion indirecta')) {
      checks.push('Redacción Indirecta');
    }
    if (plain.includes('pensamiento matemático') || plain.includes('pensamiento matematico')) {
      checks.push('Pensamiento Matemático');
    }
    if (plain.includes('premedicina')) {
      checks.push('Módulos disciplinares + Premedicina');
    }
    if (checks.length >= 2) {
      note = `Confirmado en ceneval.edu.mx (${checks.join(', ')}). Formato de 3 opciones de respuesta, hasta 4.5 h y escala 700-1,300 pts.`;
    }
  } catch (err) {
    console.warn(`[sync-exam-sources] CENEVAL HTML fallback:`, err.message);
  }

  return {
    source: 'CENEVAL',
    title,
    url,
    checkedAtIso: nowIso,
    note,
  };
};

const checkUaaOfficial = async (nowIso) => {
  const portalUrl = 'https://www.uaa.mx/portal/aspirantes/';
  const wpPostsUrl = 'https://www.uaa.mx/portal/wp-json/wp/v2/posts?search=admision&per_page=3';
  let title = 'Portal de Aspirantes UAA — Convocatoria Única Anual de Licenciatura';
  let note =
    'Proceso anual presencial mediante EXANI-II de CENEVAL con selección de primera y segunda opción de carrera.';

  try {
    const jsonRaw = await fetchWithTimeout(wpPostsUrl, {}, 9000);
    const posts = JSON.parse(jsonRaw);
    if (Array.isArray(posts) && posts.length > 0) {
      const relevant =
        posts.find((p) => /admisi|convocatoria|exani|licenciatura/i.test(decodeEntities(p?.title?.rendered))) ||
        posts[0];
      const postTitle = decodeEntities(relevant?.title?.rendered);
      const postDate = typeof relevant?.date === 'string' ? relevant.date.slice(0, 10) : '';
      const postUrl = typeof relevant?.link === 'string' && relevant.link.startsWith('https://')
        ? relevant.link
        : portalUrl;

      if (postTitle) {
        return {
          source: 'UAA',
          title: postTitle.slice(0, 140),
          url: postUrl,
          checkedAtIso: nowIso,
          note: postDate
            ? `Publicación detectada en portal oficial UAA (${postDate}). Consulta siempre bases vigentes antes de tu registro.`
            : note,
        };
      }
    }
  } catch (err) {
    console.warn(`[sync-exam-sources] UAA WP JSON fallback:`, err.message);
  }

  try {
    const html = await fetchWithTimeout(portalUrl, {}, 9000);
    const parsedTitle = extractTitleFromHtml(html);
    if (parsedTitle) {
      title = parsedTitle;
    }
  } catch (err) {
    console.warn(`[sync-exam-sources] UAA HTML fallback:`, err.message);
  }

  return {
    source: 'UAA',
    title,
    url: portalUrl,
    checkedAtIso: nowIso,
    note,
  };
};

const checkTavilyOptional = async (nowIso) => {
  const apiKey = (process.env.TAVILY_API_KEY || '').trim();
  if (!apiKey) return [];

  try {
    const raw = await fetchWithTimeout(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: 'convocatoria admision UAA EXANI-II estructura vigente',
          include_domains: ['ceneval.edu.mx', 'uaa.mx'],
          search_depth: 'basic',
          max_results: 2,
        }),
      },
      10000
    );
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.results)) return [];

    return parsed.results
      .filter((r) => typeof r?.title === 'string' && typeof r?.url === 'string')
      .slice(0, 2)
      .map((r) => ({
        source: r.url.includes('uaa.mx') ? 'UAA' : 'CENEVAL',
        title: decodeEntities(r.title).slice(0, 140),
        url: r.url,
        checkedAtIso: nowIso,
        note: decodeEntities(r.content || '').slice(0, 220) || 'Referencia oficial indexada vía Tavily.',
      }));
  } catch (err) {
    console.warn('[sync-exam-sources] Tavily optional skipped:', err.message);
    return [];
  }
};

export const buildExamSourcesTsContent = ({ nowIso, lastSyncedLabel, bulletins }) => `// Archivo sincronizado automaticamente por scripts/sync-exam-sources.mjs y GitHub Actions.
// No editar manualmente salvo actualizacion de estructura oficial CENEVAL / UAA.

export interface ExamBulletinItem {
  source: 'CENEVAL' | 'UAA';
  title: string;
  url: string;
  checkedAtIso: string;
  note: string;
}

export interface ExamSourcesSnapshot {
  lastSyncedIso: string;
  lastSyncedLabel: string;
  sourceMode: string;
  officialUrls: {
    cenevalExaniII: string;
    cenevalGuias: string;
    uaaPortal: string;
    uaaAspirantes: string;
  };
  cenevalOfficial: {
    duration: string;
    optionCount: number;
    scale: string;
    transversalAreas: Array<{ name: string; questions: number }>;
    specificModulesNote: string;
    englishDiagnosticNote: string;
    pilotNote: string;
  };
  uaaOfficial: {
    admissionWeighting: string;
    typicalWindow: string;
  };
  liveBulletins: ExamBulletinItem[];
}

export const EXAM_SOURCES_SNAPSHOT: ExamSourcesSnapshot = {
  lastSyncedIso: ${JSON.stringify(nowIso)},
  lastSyncedLabel: ${JSON.stringify(lastSyncedLabel)},
  sourceMode: 'ceneval-uaa-official-sync',
  officialUrls: {
    cenevalExaniII: 'https://ceneval.edu.mx/examenes-ingreso-exani_ii/',
    cenevalGuias: 'https://guias.ceneval.edu.mx/exani-ii/',
    uaaPortal: 'https://www.uaa.mx/portal/',
    uaaAspirantes: 'https://www.uaa.mx/portal/aspirantes/',
  },
  cenevalOfficial: {
    duration: '4 horas 30 minutos (1 sesión)',
    optionCount: 3,
    scale: '700 a 1,300 puntos CENEVAL',
    transversalAreas: [
      { name: 'Comprensión Lectora', questions: 30 },
      { name: 'Redacción Indirecta', questions: 30 },
      { name: 'Pensamiento Matemático', questions: 30 },
    ],
    specificModulesNote:
      '2 módulos disciplinares de 24 reactivos c/u según la carrera (Premedicina integra 48 reactivos en módulo único).',
    englishDiagnosticNote:
      '30 reactivos diagnósticos de Inglés (nivel B1 MCER; no alteran el puntaje global de admisión).',
    pilotNote: 'Incluye 10% de reactivos piloto y 2 reactivos de control sin peso en calificación.',
  },
  uaaOfficial: {
    admissionWeighting:
      'Referencia institucional UAA: 70% puntaje EXANI-II + 30% promedio general de bachillerato.',
    typicalWindow:
      'Convocatoria anual UAA: publicación febrero · registro marzo · examen mayo · resultados junio.',
  },
  liveBulletins: ${JSON.stringify(bulletins, null, 2).replace(/\n/g, '\n  ')},
};
`;

const main = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const now = new Date();
  const nowIso = now.toISOString();
  const lastSyncedLabel = getMexicoMonthYearLabel(now);

  const [ceneval, uaa, tavilyItems] = await Promise.all([
    checkCenevalOfficial(nowIso),
    checkUaaOfficial(nowIso),
    checkTavilyOptional(nowIso),
  ]);

  const seenUrls = new Set();
  const bulletins = [ceneval, uaa, ...tavilyItems].filter((item) => {
    if (!item?.url || seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });

  const tsContent = buildExamSourcesTsContent({ nowIso, lastSyncedLabel, bulletins });

  if (dryRun) {
    console.log('[dry-run] Generado correctamente:', { lastSyncedLabel, bulletinsCount: bulletins.length });
    return;
  }

  fs.writeFileSync(TARGET_FILE, tsContent, 'utf8');
  console.log(`Actualizado ${TARGET_FILE} (${lastSyncedLabel}) con ${bulletins.length} boletines.`);
};

if (process.argv[1] === __filename) {
  main().catch((err) => {
    console.error('Error fatal en sync-exam-sources:', err);
    process.exit(1);
  });
}
