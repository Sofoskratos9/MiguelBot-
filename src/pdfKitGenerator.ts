import { jsPDF } from 'jspdf';

interface StudyQuestion {
  number: number;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

const LECTURA_QUESTIONS: StudyQuestion[] = [
  {
    number: 1,
    prompt:
      'En un ensayo sobre ética digital, el autor sostiene que "delegar el criterio moral a sistemas estadísticos no elimina el sesgo humano, solo lo vuelve invisible". ¿Cuál es la tesis principal?',
    options: [
      'A) Los algoritmos son más objetivos que cualquier persona.',
      'B) Automatizar decisiones traslada los prejuicios humanos a una capa menos visible.',
      'C) La tecnología debería prohibirse en áreas educativas.',
    ],
    answer: 'B',
    explanation:
      'Desarme filosófico: el conector de contraste ("no elimina..., solo lo vuelve invisible") indica que el sesgo persiste oculto bajo apariencia técnica.',
  },
  {
    number: 2,
    prompt:
      'Si un texto científico afirma que "la correlación entre horas de sueño y rendimiento académico es consistente, aunque otros hábitos alimenticios también intervienen", ¿qué se puede inferir válidamente?',
    options: [
      'A) Dormir más garantiza obtener el puntaje máximo sin estudiar.',
      'B) El sueño se asocia con el desempeño, pero no es la única variable explicativa.',
      'C) La alimentación anula por completo el efecto del descanso.',
    ],
    answer: 'B',
    explanation:
      'En el EXANI-II, las opciones con absolutos ("garantiza", "anula por completo") suelen ser distractores frente a afirmaciones matizadas.',
  },
  {
    number: 3,
    prompt:
      '¿Qué función cumple el primer párrafo cuando introduce una anécdota histórica sobre la imprenta antes de analizar la lectura digital contemporánea?',
    options: [
      'A) Establecer un paralelo histórico para contextualizar el cambio cultural.',
      'B) Contradecir los datos estadísticos presentados en la conclusión.',
      'C) Demostrar que los libros impresos desaparecerán en cinco años.',
    ],
    answer: 'A',
    explanation:
      'Los ejemplos históricos introductorios cumplen función de encuadre comparativo para facilitar la comprensión de un fenómeno actual.',
  },
  {
    number: 4,
    prompt:
      'En la oración: "Pese a la escasez de recursos hídricos, la comunidad agrícola implementó sistemas de goteo que duplicaron la eficiencia", el término "Pese a" introduce:',
    options: [
      'A) Una causa directa.',
      'B) Una concesión u obstáculo superado.',
      'C) Una secuencia cronológica.',
    ],
    answer: 'B',
    explanation:
      '"Pese a" y "aunque" son conectores concesivos: señalan una dificultad que no impide el resultado posterior.',
  },
  {
    number: 5,
    prompt:
      'Un editorial critica la memorización mecánica y propone preguntas socráticas en clase. ¿Cuál sería el título más preciso?',
    options: [
      'A) Historia de la filosofía griega antigua.',
      'B) Del dato memorizado al pensamiento crítico en el aula.',
      'C) Guía técnica para aprobar exámenes en un día.',
    ],
    answer: 'B',
    explanation:
      'El título correcto sintetiza el eje conceptual del texto (transición de memorización a pensamiento crítico) sin ser ni demasiado amplio ni ajeno.',
  },
];

const ANALITICO_QUESTIONS: StudyQuestion[] = [
  {
    number: 6,
    prompt:
      'Observa la sucesión: 4, 9, 19, 39, 79, ... ¿Cuál es el siguiente término?',
    options: ['A) 119', 'B) 159', 'C) 158'],
    answer: 'B',
    explanation:
      'Patrón: cada término se obtiene multiplicando el anterior por 2 y sumando 1 (4×2+1=9, 9×2+1=19, ..., 79×2+1=159).',
  },
  {
    number: 7,
    prompt:
      'En un grupo de 40 aspirantes a la UAA, 24 estudian Comprensión Lectora, 22 estudian Matemáticas y 10 estudian ambas materias. ¿Cuántos NO estudian ninguna de las dos?',
    options: ['A) 4', 'B) 6', 'C) 10'],
    answer: 'A',
    explanation:
      'Principio de inclusión-exclusión: |L ∪ M| = 24 + 22 - 10 = 36 estudiantes. Por tanto, 40 - 36 = 4 no estudian ninguna.',
  },
  {
    number: 8,
    prompt:
      'Si 3 docentes revisan 45 ensayos en 2 horas al mismo ritmo, ¿cuántos ensayos revisarán 4 docentes en 4 horas?',
    options: ['A) 90', 'B) 120', 'C) 100'],
    answer: 'B',
    explanation:
      'Cada docente revisa 45 / (3×2) = 7.5 ensayos por hora. En 4 horas, 4 docentes revisan 4 × 4 × 7.5 = 120 ensayos.',
  },
  {
    number: 9,
    prompt:
      'En una urna hay 5 fichas azules, 3 verdes y 2 blancas. Si se extrae una al azar, ¿cuál es la probabilidad de que NO sea verde?',
    options: ['A) 3/10', 'B) 7/10', 'C) 1/2'],
    answer: 'B',
    explanation:
      'Total = 10 fichas. No verdes = 5 azules + 2 blancas = 7. Probabilidad = 7/10 (70%).',
  },
  {
    number: 10,
    prompt:
      'El promedio de cuatro simulacros de Ana es 85. Si en el quinto simulacro obtiene 95, ¿cuál es su nuevo promedio?',
    options: ['A) 87', 'B) 88', 'C) 90'],
    answer: 'A',
    explanation:
      'Suma inicial = 4 × 85 = 340. Nueva suma = 340 + 95 = 435. Nuevo promedio = 435 / 5 = 87.',
  },
];

const REDACCION_QUESTIONS: StudyQuestion[] = [
  {
    number: 11,
    prompt: 'Elige la oración con concordancia gramatical correcta:',
    options: [
      'A) Hubieron muchos aspirantes en el auditorio central.',
      'B) Hubo muchos aspirantes en el auditorio central.',
      'C) Habían bastantes dudas antes de iniciar el registro.',
    ],
    answer: 'B',
    explanation:
      'El verbo "haber" con sentido existencial es impersonal y debe conjugarse siempre en tercera persona del singular ("hubo", "había").',
  },
  {
    number: 12,
    prompt: '¿Qué opción utiliza correctamente la tilde diacrítica?',
    options: [
      'A) Él entregó el cuadernillo, mas no alcanzó a revisar el último bloque.',
      'B) El entregó el cuadernillo, más no alcanzó a revisar el último bloque.',
      'C) Él entrego el cuadernillo, más no alcanzo a revisar el último bloque.',
    ],
    answer: 'A',
    explanation:
      '"Él" (pronombre) lleva tilde; "mas" sin tilde equivale a "pero" (conjunción adversativa), mientras que "más" indica cantidad.',
  },
  {
    number: 13,
    prompt: 'Selecciona el enunciado con puntuación correcta:',
    options: [
      'A) Sin embargo el tiempo límite, exige una lectura ágil.',
      'B) Sin embargo, el tiempo límite exige una lectura ágil.',
      'C) Sin embargo; el tiempo límite, exige una lectura ágil.',
    ],
    answer: 'B',
    explanation:
      'Los conectores discursivos al inicio de oración van seguidos de coma, y nunca debe separarse con coma el sujeto ("el tiempo límite") de su verbo ("exige").',
  },
  {
    number: 14,
    prompt: 'Identifica la oración libre de redundancia o pleonasmo:',
    options: [
      'A) Subió arriba del estrado para recibir su constancia.',
      'B) Volvió a reiterar las instrucciones del simulacro.',
      'C) Resumió los hallazgos principales en tres puntos.',
    ],
    answer: 'C',
    explanation:
      '"Subir arriba" y "volver a reiterar" son redundancias semánticas; la opción C es precisa y concisa.',
  },
  {
    number: 15,
    prompt: '¿Cuál conector establece adecuadamente una relación de consecuencia?',
    options: [
      'A) No obstante',
      'B) Por consiguiente',
      'C) En cambio',
    ],
    answer: 'B',
    explanation:
      '"Por consiguiente" introduce un efecto o conclusión lógica; "no obstante" y "en cambio" expresan contraste.',
  },
];

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
    // Deep Navy Top Band
    this.doc.setFillColor(15, 23, 42);
    this.doc.rect(0, 0, this.pageWidth, 64, 'F');

    this.doc.setFillColor(16, 185, 129);
    this.doc.rect(0, 64, this.pageWidth, 2.5, 'F');

    this.doc.setTextColor(167, 243, 208);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.text(badge.toUpperCase(), this.margin, 20);

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(22);
    const titleLines = this.doc.splitTextToSize(title, this.maxWidth);
    this.doc.text(titleLines, this.margin, 32);

    this.doc.setTextColor(203, 213, 225);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    const subLines = this.doc.splitTextToSize(subtitle, this.maxWidth);
    this.doc.text(subLines, this.margin, 49);

    this.y = 80;
  }

  addSectionTitle(text: string) {
    this.ensureSpace(16);
    this.doc.setFillColor(239, 246, 255);
    this.doc.roundedRect(this.margin, this.y - 5, this.maxWidth, 10, 2, 2, 'F');
    this.doc.setTextColor(30, 58, 138);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12.5);
    this.doc.text(text, this.margin + 3, this.y + 1.5);
    this.y += 12;
  }

  addParagraph(text: string, bold = false) {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(10.2);
    this.doc.setTextColor(30, 41, 59);
    const lines = this.doc.splitTextToSize(text, this.maxWidth) as string[];
    const blockHeight = lines.length * 5.2 + 3;
    this.ensureSpace(blockHeight);
    this.doc.text(lines, this.margin, this.y);
    this.y += blockHeight;
  }

  addBullet(text: string) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(51, 65, 85);
    const lines = this.doc.splitTextToSize(text, this.maxWidth - 6) as string[];
    const blockHeight = lines.length * 5 + 2;
    this.ensureSpace(blockHeight);
    this.doc.text('•', this.margin + 1, this.y);
    this.doc.text(lines, this.margin + 6, this.y);
    this.y += blockHeight;
  }

  addQuestionCard(q: StudyQuestion) {
    const promptLines = this.doc.splitTextToSize(`${q.number}. ${q.prompt}`, this.maxWidth - 6) as string[];
    const expLines = this.doc.splitTextToSize(`Respuesta ${q.answer}: ${q.explanation}`, this.maxWidth - 6) as string[];
    const estimatedHeight = promptLines.length * 5 + q.options.length * 5 + expLines.length * 4.8 + 14;
    this.ensureSpace(estimatedHeight);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(promptLines, this.margin, this.y);
    this.y += promptLines.length * 5 + 1.5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(51, 65, 85);
    for (const opt of q.options) {
      const optLines = this.doc.splitTextToSize(opt, this.maxWidth - 8) as string[];
      this.doc.text(optLines, this.margin + 4, this.y);
      this.y += optLines.length * 4.8;
    }

    this.y += 1.5;
    this.doc.setFillColor(236, 253, 245);
    const boxH = expLines.length * 4.7 + 4;
    this.doc.roundedRect(this.margin, this.y - 3.5, this.maxWidth, boxH, 1.5, 1.5, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.2);
    this.doc.setTextColor(6, 95, 70);
    this.doc.text(expLines, this.margin + 3, this.y);
    this.y += boxH + 4;
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
        this.doc.setFontSize(8.5);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text('Método Miguel Neftalí · Preparación EXANI-II UAA 2026', this.margin, 13);
        this.doc.setDrawColor(226, 232, 240);
        this.doc.line(this.margin, 15.5, this.pageWidth - this.margin, 15.5);
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.5);
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
    'Muestra Gratuita · Kit EXANI-II UAA 2026',
    'Extracto oficial de metodología, Desarme Filosófico y reactivos resueltos — Por Miguel Neftalí',
    'Muestra de Verificación Académica'
  );

  pdf.addSectionTitle('¿Qué incluye el Kit Completo descargable?');
  pdf.addBullet('Módulo 1: Método de Desarme Filosófico para Comprensión Lectora + 5 reactivos resueltos.');
  pdf.addBullet('Módulo 2: Pensamiento Analítico-Matemático paso a paso + 5 reactivos comentados.');
  pdf.addBullet('Módulo 3: Reglas de oro de Redacción Indirecta CENEVAL + 5 reactivos modelo.');
  pdf.addBullet('Módulo 4: Protocolo Anti-Ansiedad 4-7-8 y Plan Intensivo de 4 Semanas con registro de simulacros.');

  pdf.addSectionTitle('Muestra: Método de Desarme Filosófico (4 Pasos)');
  pdf.addParagraph(
    'Antes de leer las opciones A, B o C en Comprensión Lectora, desarma cualquier texto en 60 segundos aplicando estas cuatro preguntas:'
  );
  pdf.addBullet('1. Tesis central: ¿Qué postura o afirmación principal defiende el autor?');
  pdf.addBullet('2. Supuestos implícitos: ¿Qué da por hecho sin decirlo explícitamente?');
  pdf.addBullet('3. Conectores lógicos: Subraya "sin embargo", "por lo tanto", "pese a", porque revelan la estructura real.');
  pdf.addBullet('4. Descarte por alcance: Elimina opciones con absolutos extremos ("siempre", "nunca", "todos") cuando el texto es matizado.');

  pdf.addSectionTitle('2 Reactivos Modelo de Muestra');
  pdf.addQuestionCard(LECTURA_QUESTIONS[0]);
  pdf.addQuestionCard(ANALITICO_QUESTIONS[0]);

  pdf.finalizeAndSave('Muestra-Kit-EXANI-II-UAA-2026.pdf');
};

export const generateFullKitPdf = (diagnosticReportText?: string | null) => {
  const pdf = new EditorialPdfBuilder();
  pdf.addCover(
    'Kit Estratégico EXANI-II UAA 2026',
    'Cuadernillo completo de estudio, banco de reactivos explicados y plan de 4 semanas — Miguel Neftalí',
    'Edición Completa Verificada'
  );

  pdf.addSectionTitle('Cómo aprovechar este cuadernillo');
  pdf.addParagraph(
    'Este material fue diseñado específicamente para aspirantes a licenciaturas de la Universidad Autónoma de Aguascalientes (UAA). Trabaja cada módulo resolviendo primero los reactivos sin mirar la explicación verde y registra tus tiempos en la tabla final.'
  );

  if (diagnosticReportText && diagnosticReportText.trim()) {
    pdf.addSectionTitle('Tu Diagnóstico Personalizado Registrado');
    const cleanReport = diagnosticReportText
      .replace(/\*\*/g, '')
      .replace(/^#{1,4}\s*/gm, '')
      .trim();
    const paragraphs = cleanReport.split('\n').filter((line) => line.trim() !== '');
    for (const p of paragraphs.slice(0, 18)) {
      pdf.addParagraph(p.trim());
    }
  }

  pdf.addPageBreak();
  pdf.addSectionTitle('Módulo 1 · Comprensión Lectora: Desarme Filosófico');
  pdf.addParagraph(
    'En el EXANI-II la mayoría de errores en lectura no ocurren por falta de vocabulario, sino por responder desde opiniones previas en lugar de seguir la lógica interna del texto.'
  );
  pdf.addBullet('Paso 1 (Tesis): Resume en 8 palabras qué sostiene el texto.');
  pdf.addBullet('Paso 2 (Supuestos): Identifica qué condición previa necesita el argumento para ser válido.');
  pdf.addBullet('Paso 3 (Conectores): Marca los giros argumentativos ("no obstante", "en cambio", "por ende").');
  pdf.addBullet('Paso 4 (Descarte): Desconfía de opciones que exageran o generalizan más allá del pasaje.');
  for (const q of LECTURA_QUESTIONS) {
    pdf.addQuestionCard(q);
  }

  pdf.addPageBreak();
  pdf.addSectionTitle('Módulo 2 · Pensamiento Analítico-Matemático');
  pdf.addParagraph(
    'No necesitas cálculo avanzado: el EXANI-II evalúa razonamiento proporcional, conjuntos, sucesiones, lectura de tablas y probabilidad básica bajo presión de tiempo.'
  );
  pdf.addBullet('Estrategia 1: Convierte porcentajes y razones a fracciones simples o múltiplos de 10.');
  pdf.addBullet('Estrategia 2: En conjuntos de dos grupos, usa siempre |A ∪ B| = |A| + |B| - |A ∩ B|.');
  pdf.addBullet('Estrategia 3: En sucesiones, verifica primero diferencias entre términos y luego razones ×2, ×3.');
  for (const q of ANALITICO_QUESTIONS) {
    pdf.addQuestionCard(q);
  }

  pdf.addPageBreak();
  pdf.addSectionTitle('Módulo 3 · Redacción Indirecta de Alto Puntaje');
  pdf.addParagraph(
    'Las preguntas de redacción indirecta premian la precisión gramatical y la economía del lenguaje. Revisa siempre estos cuatro puntos antes de marcar tu respuesta:'
  );
  pdf.addBullet('Concordancia impersonal: "Hubo muchos alumnos" (correcto) vs "Hubieron" (incorrecto).');
  pdf.addBullet('Tilde diacrítica: él/el, tú/tu, mí/mi, sí/si, más/mas (pero), aún (todavía)/aun (incluso).');
  pdf.addBullet('Puntuación: Nunca separes sujeto y verbo con una sola coma.');
  pdf.addBullet('Cohesión: Distingue conectores de causa ("puesto que"), contraste ("sin embargo") y consecuencia ("por lo tanto").');
  for (const q of REDACCION_QUESTIONS) {
    pdf.addQuestionCard(q);
  }

  pdf.addPageBreak();
  pdf.addSectionTitle('Módulo 4 · Protocolo Anti-Ansiedad 4-7-8 y Plan de 4 Semanas');
  pdf.addParagraph(
    'Antes de iniciar cada bloque de examen real o simulacro, realiza 4 ciclos de respiración 4-7-8 (inhala 4 s, sostén 7 s, exhala lento 8 s) para estabilizar la atención ejecutiva.'
  );
  pdf.addBullet('Semana 1 (Base y Diagnóstico): 25 min/día de Desarme Filosófico + repaso de fracciones, razones y concordancia.');
  pdf.addBullet('Semana 2 (Velocidad y Precisión): Bloques cronometrados de 15 reactivos en 18 minutos; bitácora de errores.');
  pdf.addBullet('Semana 3 (Simulacros Parciales): 2 simulacros de 60 reactivos con protocolo 4-7-8 previo.');
  pdf.addBullet('Semana 4 (Cierre Estratégico): 1 simulacro completo en horario real de examen + repaso exclusivo de errores recurrentes.');

  pdf.addSectionTitle('Bitácora de Simulacros (Meta UAA)');
  pdf.addBullet('Simulacro 1 — Fecha: ____/____/2026 | Lectura: ___/10 | Analítico: ___/10 | Redacción: ___/10 | Puntaje CENEVAL: ______');
  pdf.addBullet('Simulacro 2 — Fecha: ____/____/2026 | Lectura: ___/10 | Analítico: ___/10 | Redacción: ___/10 | Puntaje CENEVAL: ______');
  pdf.addBullet('Simulacro 3 — Fecha: ____/____/2026 | Lectura: ___/10 | Analítico: ___/10 | Redacción: ___/10 | Puntaje CENEVAL: ______');
  pdf.addBullet('Simulacro 4 — Fecha: ____/____/2026 | Lectura: ___/10 | Analítico: ___/10 | Redacción: ___/10 | Puntaje CENEVAL: ______');

  pdf.finalizeAndSave('Kit-Estrategico-EXANI-II-UAA-2026.pdf');
};
