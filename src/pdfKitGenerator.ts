import { jsPDF } from 'jspdf';
import { EXANI_50_BANK, type ExaniQuestion } from './exaniBank';

class EditorialPdfBuilder {
  private doc: jsPDF;
  private y = 26;
  private readonly margin = 18;
  private readonly pageWidth = 210;
  private readonly maxWidth = 174;
  private readonly bottomLimit = 274;

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  }

  private ensureSpace(neededMm: number) {
    if (this.y + neededMm > this.bottomLimit) {
      this.doc.addPage();
      this.y = 24;
    }
  }

  addCover(title: string, subtitle: string, badge: string) {
    // Obsidian Navy Header Band
    this.doc.setFillColor(6, 9, 19);
    this.doc.rect(0, 0, this.pageWidth, 66, 'F');

    // Champagne Gold Accent Line
    this.doc.setFillColor(212, 175, 55);
    this.doc.rect(0, 66, this.pageWidth, 2.5, 'F');

    this.doc.setTextColor(212, 175, 55);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.text(badge.toUpperCase(), this.margin, 19);

    this.doc.setTextColor(248, 250, 252);
    this.doc.setFontSize(21);
    const titleLines = this.doc.splitTextToSize(title, this.maxWidth) as string[];
    this.doc.text(titleLines, this.margin, 31);

    this.doc.setTextColor(190, 200, 218);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10.5);
    const subLines = this.doc.splitTextToSize(subtitle, this.maxWidth) as string[];
    this.doc.text(subLines, this.margin, 49);

    this.y = 82;
  }

  addSectionTitle(text: string) {
    this.ensureSpace(16);
    this.doc.setFillColor(243, 240, 229);
    this.doc.roundedRect(this.margin, this.y - 5, this.maxWidth, 10, 2, 2, 'F');
    this.doc.setTextColor(15, 23, 42);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text(text, this.margin + 3.5, this.y + 1.5);
    this.y += 12;
  }

  addParagraph(text: string, bold = false) {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(30, 41, 59);
    const lines = this.doc.splitTextToSize(text, this.maxWidth) as string[];
    const blockHeight = lines.length * 5.1 + 3;
    this.ensureSpace(blockHeight);
    this.doc.text(lines, this.margin, this.y);
    this.y += blockHeight;
  }

  addBullet(text: string) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.8);
    this.doc.setTextColor(51, 65, 85);
    const lines = this.doc.splitTextToSize(text, this.maxWidth - 6) as string[];
    const blockHeight = lines.length * 4.9 + 2;
    this.ensureSpace(blockHeight);
    this.doc.text('•', this.margin + 1, this.y);
    this.doc.text(lines, this.margin + 6, this.y);
    this.y += blockHeight;
  }

  addExaniQuestionCard(q: ExaniQuestion) {
    const letters = ['A', 'B', 'C', 'D'];
    const promptText = `${q.number}. [${q.difficulty}] ${q.question}`;
    const promptLines = this.doc.splitTextToSize(promptText, this.maxWidth - 4) as string[];
    const formattedOpts = q.options.map((opt, idx) => `${letters[idx] || '?'}) ${opt}`);
    const expText = `Clave ${letters[q.correctIndex] || 'A'}: ${q.explanation}`;
    const expLines = this.doc.splitTextToSize(expText, this.maxWidth - 6) as string[];

    let optsHeight = 0;
    for (const o of formattedOpts) {
      const oLines = this.doc.splitTextToSize(o, this.maxWidth - 8) as string[];
      optsHeight += oLines.length * 4.6;
    }

    const estimatedHeight = promptLines.length * 4.8 + optsHeight + expLines.length * 4.6 + 15;
    this.ensureSpace(estimatedHeight);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.8);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(promptLines, this.margin, this.y);
    this.y += promptLines.length * 4.8 + 1.5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.4);
    this.doc.setTextColor(51, 65, 85);
    for (const opt of formattedOpts) {
      const optLines = this.doc.splitTextToSize(opt, this.maxWidth - 8) as string[];
      this.doc.text(optLines, this.margin + 4, this.y);
      this.y += optLines.length * 4.6;
    }

    this.y += 1.5;
    this.doc.setFillColor(236, 253, 245);
    const boxH = expLines.length * 4.5 + 4;
    this.doc.roundedRect(this.margin, this.y - 3.3, this.maxWidth, boxH, 1.5, 1.5, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(6, 95, 70);
    this.doc.text(expLines, this.margin + 3, this.y);
    this.y += boxH + 4.5;
  }

  addPageBreak() {
    this.doc.addPage();
    this.y = 24;
  }

  finalizeAndSave(filename: string) {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      if (i > 1) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(8.2);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text('Miguel López · Estratega Educativo · Preparación EXANI-II UAA 2026', this.margin, 13);
        this.doc.setDrawColor(226, 232, 240);
        this.doc.line(this.margin, 15.5, this.pageWidth - this.margin, 15.5);
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`Página ${i} de ${pageCount}`, this.pageWidth - this.margin - 20, 287);
      this.doc.text('Material académico de uso personal para el aspirante', this.margin, 287);
    }
    this.doc.save(filename);
  }
}

export const generateSampleKitPdf = () => {
  const pdf = new EditorialPdfBuilder();
  pdf.addCover(
    'Muestra Gratuita · EXANI-II UAA 2026',
    'Extracto de metodología cognitiva, Desarme Filosófico y reactivos resueltos — Miguel López',
    'Muestra de Verificación Académica'
  );

  pdf.addSectionTitle('¿Qué incluyen las Herramientas de Alto Rendimiento?');
  pdf.addBullet('1. Kit de Neuro-Aprendizaje ($99 MXN): Plantillas ultradianas 90/20, Método Feynman, Repaso Espaciado y Audio Binaural 40 Hz (.wav).');
  pdf.addBullet('2. Banco de 50 Reactivos EXANI-II ($149 MXN): 50 preguntas reales estilo CENEVAL 2026 explicadas + Simulador Interactivo completo.');
  pdf.addBullet('3. Protocolo Anti-Ansiedad NSDR ($79 MXN): Audio de relajación Alpha-Theta (.wav) + Guía de Regulación Pre-Examen.');

  pdf.addSectionTitle('Muestra: Método de Desarme Filosófico (4 Pasos)');
  pdf.addParagraph(
    'Antes de leer las opciones en Comprensión Lectora, desarma el argumento en 60 segundos con estas cuatro preguntas:'
  );
  pdf.addBullet('1. Tesis central: ¿Qué postura principal defiende el autor?');
  pdf.addBullet('2. Supuestos implícitos: ¿Qué condición necesita para sostenerse?');
  pdf.addBullet('3. Conectores lógicos: Subraya "sin embargo", "pese a", "por lo tanto", pues revelan el giro del texto.');
  pdf.addBullet('4. Descarte por alcance: Elimina opciones con absolutos extremos ("siempre", "nunca", "todos").');

  pdf.addSectionTitle('2 Reactivos Reales de Muestra');
  pdf.addExaniQuestionCard(EXANI_50_BANK[0]);
  pdf.addExaniQuestionCard(EXANI_50_BANK[13]);

  pdf.finalizeAndSave('Muestra-Gratuita-EXANI-II-2026.pdf');
};

export const generateNeuroKitPdf = () => {
  const pdf = new EditorialPdfBuilder();
  pdf.addCover(
    'Kit de Neuro-Aprendizaje 2026',
    'Ciclos Ultradianos 90/20, Recuperación Activa, Método Feynman y Guía de Audio 40 Hz — Miguel López',
    'Pack Digital Verificado · PDF + Audio'
  );

  pdf.addSectionTitle('1. Arquitectura de Ciclos Ultradianos (90 / 20)');
  pdf.addParagraph(
    'El cerebro humano sostiene alerta ejecutiva máxima durante bloques de aproximadamente 90 minutos seguidos de 20 minutos de recuperación sin pantallas. Estudiar 4 horas seguidas sin pausa desploma la retención de memoria de trabajo.'
  );
  pdf.addBullet('Minutos 0 a 5 (Encuadre): Cierra notificaciones, define 1 solo objetivo medible y escucha el audio binaural 40 Hz.');
  pdf.addBullet('Minutos 5 a 80 (Foco Profundo): Alterna 40 minutos de resolución activa de reactivos y 40 minutos de análisis de errores.');
  pdf.addBullet('Minutos 80 a 90 (Consolidación): Cierra el cuaderno y explica en voz alta 3 ideas aprendidas sin mirar tus notas.');
  pdf.addBullet('Minutos 90 a 110 (Descanso Real): Camina, hidrátate y evita redes sociales (scroll) para no saturar dopamina.');

  pdf.addSectionTitle('2. Método Feynman en 4 Pasos para Temas Difíciles');
  pdf.addBullet('Paso 1 — Elige un concepto específico (ej. Regla de tres inversa o Modos discursivos).');
  pdf.addBullet('Paso 2 — Explícalo por escrito como si se lo enseñaras a un estudiante de secundaria, sin tecnicismos vacíos.');
  pdf.addBullet('Paso 3 — Detecta exactamente dónde dudaste o te trabaste: ahí está tu laguna real de conocimiento.');
  pdf.addBullet('Paso 4 — Vuelve a la fuente, simplifica la analogía y resuelve 3 reactivos de ese tema inmediatamente.');

  pdf.addSectionTitle('3. Protocolo de Repaso Espaciado (1 - 3 - 7 - 14 Días)');
  pdf.addParagraph(
    'Para vencer la curva del olvido antes del examen EXANI-II, registra cada tema fallado en esta bitácora y repásalo únicamente mediante autoevaluación en los intervalos clave:'
  );
  pdf.addBullet('Tema 1: _________________________ | Día 1 [ ] · Día 3 [ ] · Día 7 [ ] · Día 14 [ ]');
  pdf.addBullet('Tema 2: _________________________ | Día 1 [ ] · Día 3 [ ] · Día 7 [ ] · Día 14 [ ]');
  pdf.addBullet('Tema 3: _________________________ | Día 1 [ ] · Día 3 [ ] · Día 7 [ ] · Día 14 [ ]');
  pdf.addBullet('Tema 4: _________________________ | Día 1 [ ] · Día 3 [ ] · Día 7 [ ] · Día 14 [ ]');

  pdf.addPageBreak();
  pdf.addSectionTitle('4. Descarga Cognitiva (Brain Dump) & Matriz Eisenhower');
  pdf.addParagraph(
    'Antes de estudiar, vacía tu memoria de trabajo durante 5 minutos anotando todo pendiente académico o personal y clasifícalo:'
  );
  pdf.addBullet('Cuadrante 1 (Importante + Urgente): Simulacros cronometrados y áreas en Semáforo Rojo.');
  pdf.addBullet('Cuadrante 2 (Importante + No Urgente): Repaso espaciado, Desarme Filosófico y sueño de 7.5–8 horas.');
  pdf.addBullet('Cuadrante 3 (Urgente + No Importante): Notificaciones o favores menores que interrumpen tu bloque.');
  pdf.addBullet('Cuadrante 4 (Ni Importante ni Urgente): Eliminar durante la fase intensiva pre-examen.');

  pdf.addSectionTitle('5. Uso Óptimo de la Pista Binaural 40 Hz (.wav)');
  pdf.addBullet('Utiliza audífonos estéreo (izquierdo/derecho) a volumen bajo-medio (30%–45%).');
  pdf.addBullet('El diferencial de 40 Hz (200 Hz oído izquierdo / 240 Hz oído derecho) acompaña sesiones de lectura analítica y matemáticas.');
  pdf.addBullet('No la uses al conducir ni si experimentas fatiga auditiva; combínala con bloques de 45–90 minutos.');

  pdf.finalizeAndSave('Kit-Neuro-Aprendizaje-2026-MiguelLopez.pdf');
};

export const generateReactivos50Pdf = (diagnosticReportText?: string | null) => {
  const pdf = new EditorialPdfBuilder();
  pdf.addCover(
    'Banco de 50 Reactivos EXANI-II 2026',
    '50 preguntas tipo CENEVAL UAA con clave comentada y estrategia de descarte — Miguel López',
    'Best Seller · Edición Predictiva 2026'
  );

  pdf.addSectionTitle('Instrucciones de Simulacro Cronometrado');
  pdf.addParagraph(
    'Este banco reúne 50 reactivos distribuidos en las 4 áreas troncales del EXANI-II: Comprensión Lectora (1–13), Pensamiento Matemático (14–26), Pensamiento Analítico (27–38) y Estructura de la Lengua (39–50). Resuelve cada sección sin mirar el recuadro verde inferior y mide tu tiempo meta (65 minutos para los 50 reactivos).'
  );

  if (diagnosticReportText && diagnosticReportText.trim()) {
    pdf.addSectionTitle('Tu Diagnóstico Personalizado Integrado');
    const cleanReport = diagnosticReportText
      .replace(/\*\*/g, '')
      .replace(/^#{1,4}\s*/gm, '')
      .trim();
    const paragraphs = cleanReport.split('\n').filter((line) => line.trim() !== '');
    for (const p of paragraphs.slice(0, 14)) {
      pdf.addParagraph(p.trim());
    }
  }

  const areas = [
    'Comprensión Lectora',
    'Pensamiento Matemático',
    'Pensamiento Analítico',
    'Estructura de la Lengua',
  ] as const;

  for (const area of areas) {
    pdf.addPageBreak();
    const areaQuestions = EXANI_50_BANK.filter((q) => q.area === area);
    pdf.addSectionTitle(`Área · ${area} (${areaQuestions.length} Reactivos)`);
    for (const q of areaQuestions) {
      pdf.addExaniQuestionCard(q);
    }
  }

  pdf.addPageBreak();
  pdf.addSectionTitle('Bitácora de Simulacros UAA 2026');
  pdf.addBullet('Intento 1 — Fecha: ____/____/2026 | Aciertos: ___/50 | Estimado CENEVAL: ______ pts');
  pdf.addBullet('Intento 2 — Fecha: ____/____/2026 | Aciertos: ___/50 | Estimado CENEVAL: ______ pts');
  pdf.addBullet('Áreas prioritarias detectadas para reforzar esta semana: ________________________________________');

  pdf.finalizeAndSave('Banco-50-Reactivos-EXANI-II-2026.pdf');
};

export const generateNsdrProtocolPdf = () => {
  const pdf = new EditorialPdfBuilder();
  pdf.addCover(
    'Protocolo Anti-Ansiedad NSDR',
    'Regulación fisiológica pre-examen, secuencia Alpha-Theta, respiración táctica y checklist UAA — Miguel López',
    'Guía Clínica de Alto Rendimiento'
  );

  pdf.addSectionTitle('1. ¿Por qué ocurre el bloqueo mental en el examen?');
  pdf.addParagraph(
    'Bajo estrés agudo, la hiperactivación simpática (cortisol y adrenalina) reduce el acceso fluido a la corteza prefrontal, generando "mente en blanco" aunque hayas estudiado durante semanas. El protocolo NSDR (Non-Sleep Deep Rest) y la exhalación prolongada activan el freno vagal parasimpático en menos de 10 minutos.'
  );

  pdf.addSectionTitle('2. Secuencia de 10 Minutos con Audio NSDR (.wav)');
  pdf.addBullet('Minutos 0–2 (Aterrizaje): Recuéstate o siéntate con espalda apoyada, ojos cerrados y audífonos estéreo.');
  pdf.addBullet('Minutos 2–5 (Respiración 4-7-8): Inhala 4 s por nariz, sostén 7 s y exhala suave 8 s por boca durante 4 ciclos.');
  pdf.addBullet('Minutos 5–8 (Escaneo corporal): Recorre mentalmente frente, mandíbula, hombros, manos y abdomen soltando tensión.');
  pdf.addBullet('Minutos 8–10 (Reactivación limpia): Realiza dos respiraciones profundas y abre los ojos sin revisar redes sociales.');

  pdf.addSectionTitle('3. Respiración Táctica de Emergencia en Aula (4-4-4-4)');
  pdf.addParagraph(
    'Si sientes taquicardia frente a un reactivo difícil durante el EXANI-II, suelta el lápiz 45 segundos y aplica 3 ciclos silenciosos:'
  );
  pdf.addBullet('Inhala en 4 segundos → Sostén 4 segundos → Exhala en 4 segundos → Pausa con pulmones vacíos 4 segundos.');

  pdf.addSectionTitle('4. Checklist Logístico Pre-Examen UAA');
  pdf.addBullet('Noche previa: Prepara identificación oficial vigente, pase de ingreso impreso, lápices 2 o 2½, goma y sacapuntas.');
  pdf.addBullet('Evita estudiar material nuevo después de las 20:00 hrs del día anterior; prioriza 7.5–8 horas de descanso.');
  pdf.addBullet('Desayuno estable: Proteína + carbohidrato complejo (evita picos de azúcar simple antes de entrar al aula).');
  pdf.addBullet('Estrategia de primera vuelta: Si un reactivo toma más de 75 segundos, márcalo, avanza y regresa al final.');

  pdf.finalizeAndSave('Protocolo-Anti-Ansiedad-NSDR-2026.pdf');
};

export const generateFullKitPdf = generateReactivos50Pdf;
