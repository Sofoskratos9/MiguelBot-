// Archivo sincronizado automaticamente por scripts/sync-exam-sources.mjs y GitHub Actions.
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
  lastSyncedIso: '2026-11-18T04:30:00.000Z',
  lastSyncedLabel: 'Noviembre 2026',
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
  liveBulletins: [
    {
      source: 'CENEVAL',
      title: 'Nivel Superior EXANI-II — Estructura oficial vigente (3 opciones, 4.5 h)',
      url: 'https://ceneval.edu.mx/examenes-ingreso-exani_ii/',
      checkedAtIso: '2026-11-18T04:30:00.000Z',
      note: 'Estructura verificada: Áreas transversales (30+30+30), 2 módulos de conocimientos específicos (24+24 o Premedicina 48) e inglés diagnóstico (30).',
    },
    {
      source: 'UAA',
      title: 'Portal de Aspirantes UAA — Convocatoria Única Anual de Licenciatura',
      url: 'https://www.uaa.mx/portal/aspirantes/',
      checkedAtIso: '2026-11-18T04:30:00.000Z',
      note: 'Proceso anual presencial mediante EXANI-II de CENEVAL con selección de primera y segunda opción de carrera.',
    },
  ],
};
