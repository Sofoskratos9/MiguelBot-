import { jsPDF } from 'jspdf';
import { EXANI_50_BANK, type ExaniArea, type ExaniQuestion } from './exaniBank';

type Rgb = [number, number, number];

const C_OBSIDIAN: Rgb = [6, 9, 19];
const C_NAVY: Rgb = [15, 22, 41];
const C_GOLD: Rgb = [212, 175, 55];
const C_GOLD_DARK: Rgb = [154, 120, 22];
const C_GOLD_PALE: Rgb = [252, 248, 236];
const C_SLATE_900: Rgb = [15, 23, 42];
const C_SLATE_700: Rgb = [51, 65, 85];
const C_SLATE_500: Rgb = [100, 116, 139];
const C_BORDER: Rgb = [220, 226, 235];
const C_EMERALD: Rgb = [6, 95, 70];
const C_EMERALD_BG: Rgb = [236, 253, 245];
const C_BLUE: Rgb = [30, 64, 175];
const C_BLUE_BG: Rgb = [239, 246, 255];
const C_VIOLET: Rgb = [91, 33, 182];
const C_VIOLET_BG: Rgb = [245, 243, 255];
const C_IVORY: Rgb = [250, 250, 248];

/**
 * Ensures every glyph is cleanly supported by Helvetica WinAnsiEncoding in jsPDF
 * so no broken boxes or corrupted characters ever appear.
 */
const cleanPdf = (raw: string): string =>
  raw
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/✓/g, '[OK]')
    .replace(/∪/g, 'U')
    .replace(/∩/g, ' interseccion ')
    .replace(/√/g, 'raiz')
    .replace(/¬/g, 'NO ')
    .replace(/•/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

class LuxuryEditorialPdf {
  public readonly doc: jsPDF;
  public y = 26;
  public readonly margin = 17;
  public readonly pageWidth = 210;
  public readonly maxWidth = 176;
  public readonly bottomLimit = 274;
  private runningHeaderTitle = '';

  constructor(runningHeaderTitle: string) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.runningHeaderTitle = cleanPdf(runningHeaderTitle);
  }

  public ensureSpace(neededMm: number) {
    if (this.y + neededMm > this.bottomLimit) {
      this.doc.addPage();
      this.y = 24;
    }
  }

  public addPageBreak() {
    this.doc.addPage();
    this.y = 24;
  }

  public addLuxuryCover(opts: {
    badge: string;
    title: string;
    subtitle: string;
    edition: string;
    accentColor: Rgb;
    tocItems: Array<{ code: string; title: string; detail: string }>;
    footerNote: string;
  }) {
    // Full Ivory Background
    this.doc.setFillColor(...C_IVORY);
    this.doc.rect(0, 0, this.pageWidth, 297, 'F');

    // Deep Obsidian Hero Block
    this.doc.setFillColor(...C_OBSIDIAN);
    this.doc.rect(0, 0, this.pageWidth, 118, 'F');

    // Subtle geometric accent rings on top right
    this.doc.setDrawColor(35, 48, 82);
    this.doc.setLineWidth(0.4);
    this.doc.circle(185, 22, 34, 'S');
    this.doc.circle(185, 22, 52, 'S');
    this.doc.setDrawColor(...C_GOLD);
    this.doc.setLineWidth(0.3);
    this.doc.circle(185, 22, 20, 'S');

    // Champagne Gold bottom trim on hero
    this.doc.setFillColor(...opts.accentColor);
    this.doc.rect(0, 118, this.pageWidth, 2.5, 'F');

    // Monogram M box
    this.doc.setDrawColor(...C_GOLD);
    this.doc.setLineWidth(0.6);
    this.doc.setFillColor(...C_NAVY);
    this.doc.roundedRect(this.margin, 16, 12, 12, 2, 2, 'FD');
    this.doc.setTextColor(...C_GOLD);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(15);
    this.doc.text('M', this.margin + 3.8, 24.3);

    // Author Identity next to monogram
    this.doc.setTextColor(248, 250, 252);
    this.doc.setFontSize(10.5);
    this.doc.text('MIGUEL LOPEZ', this.margin + 16, 20.5);
    this.doc.setTextColor(...C_GOLD);
    this.doc.setFontSize(7.8);
    this.doc.text('ESTRATEGA EDUCATIVO  |  METODO UAA 2026', this.margin + 16, 25.5);

    // Pill Badge
    const cleanBadge = cleanPdf(opts.badge).toUpperCase();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    const badgeW = Math.min(115, this.doc.getTextWidth(cleanBadge) + 10);
    this.doc.setFillColor(...opts.accentColor);
    this.doc.roundedRect(this.margin, 38, badgeW, 7, 1.5, 1.5, 'F');
    this.doc.setTextColor(...C_OBSIDIAN);
    this.doc.text(cleanBadge, this.margin + 4, 42.8);

    // Cover Title
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(24);
    const titleLines = this.doc.splitTextToSize(cleanPdf(opts.title), this.maxWidth - 10) as string[];
    this.doc.text(titleLines, this.margin, 57);

    // Subtitle
    const subY = 57 + titleLines.length * 9.5 + 3;
    this.doc.setTextColor(203, 213, 225);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10.8);
    const subLines = this.doc.splitTextToSize(cleanPdf(opts.subtitle), this.maxWidth - 10) as string[];
    this.doc.text(subLines, this.margin, subY);

    // Structured Contents Card on lower cover
    this.y = 132;
    this.doc.setTextColor(...C_GOLD_DARK);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.text(cleanPdf(opts.edition).toUpperCase(), this.margin, this.y);
    this.y += 6;

    this.doc.setDrawColor(...C_BORDER);
    this.doc.setFillColor(255, 255, 255);
    const cardHeight = 14 + opts.tocItems.length * 16;
    this.doc.roundedRect(this.margin, this.y, this.maxWidth, cardHeight, 3, 3, 'FD');

    let itemY = this.y + 10;
    for (let idx = 0; idx < opts.tocItems.length; idx++) {
      const item = opts.tocItems[idx];
      // Code pill
      this.doc.setFillColor(...C_OBSIDIAN);
      this.doc.roundedRect(this.margin + 6, itemY - 4.5, 13, 7, 1.5, 1.5, 'F');
      this.doc.setTextColor(...C_GOLD);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.5);
      this.doc.text(cleanPdf(item.code), this.margin + 9.2, itemY + 0.3);

      // Item Title + Detail
      this.doc.setTextColor(...C_SLATE_900);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10.5);
      this.doc.text(cleanPdf(item.title), this.margin + 23, itemY - 0.5);

      this.doc.setTextColor(...C_SLATE_500);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.8);
      this.doc.text(cleanPdf(item.detail), this.margin + 23, itemY + 4.8);

      if (idx < opts.tocItems.length - 1) {
        this.doc.setDrawColor(238, 242, 247);
        this.doc.line(this.margin + 6, itemY + 9, this.margin + this.maxWidth - 6, itemY + 9);
      }
      itemY += 16;
    }

    // Bottom Credibility Box
    const noteY = 258;
    this.doc.setFillColor(...C_GOLD_PALE);
    this.doc.setDrawColor(...C_GOLD);
    this.doc.roundedRect(this.margin, noteY, this.maxWidth, 18, 2, 2, 'FD');
    this.doc.setTextColor(...C_SLATE_900);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.8);
    const fLines = this.doc.splitTextToSize(cleanPdf(opts.footerNote), this.maxWidth - 10) as string[];
    this.doc.text(fLines, this.margin + 5, noteY + 6.5);
  }

  public addChapterBanner(eyebrow: string, title: string, accent: Rgb = C_GOLD) {
    this.ensureSpace(22);
    const safeAccent: Rgb =
      accent[0] === C_OBSIDIAN[0] && accent[1] === C_OBSIDIAN[1] && accent[2] === C_OBSIDIAN[2]
        ? C_GOLD
        : accent;
    this.doc.setFillColor(...C_OBSIDIAN);
    this.doc.roundedRect(this.margin, this.y, this.maxWidth, 17, 2.5, 2.5, 'F');
    this.doc.setFillColor(...safeAccent);
    this.doc.rect(this.margin, this.y, 3.2, 17, 'F');

    this.doc.setTextColor(...safeAccent);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.8);
    this.doc.text(cleanPdf(eyebrow).toUpperCase(), this.margin + 7, this.y + 5.8);

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(12.5);
    this.doc.text(cleanPdf(title), this.margin + 7, this.y + 12.6);
    this.y += 23;
  }

  public addSubheading(title: string) {
    if (this.y > 26) {
      this.y += 2;
    }
    this.ensureSpace(12);
    this.doc.setTextColor(...C_SLATE_900);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text(cleanPdf(title), this.margin, this.y);
    this.doc.setDrawColor(...C_GOLD);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.y + 1.8, this.margin + 32, this.y + 1.8);
    this.y += 7;
  }

  public addParagraph(text: string, bold = false) {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(9.8);
    this.doc.setTextColor(...C_SLATE_700);
    const lines = this.doc.splitTextToSize(cleanPdf(text), this.maxWidth) as string[];
    const blockH = lines.length * 4.9 + 2.5;
    this.ensureSpace(blockH);
    this.doc.text(lines, this.margin, this.y);
    this.y += blockH;
  }

  public addCalloutBox(title: string, body: string, tone: 'gold' | 'emerald' | 'blue' | 'violet' = 'gold') {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.2);
    const cleanBodyLines = this.doc.splitTextToSize(cleanPdf(body), this.maxWidth - 13) as string[];
    const boxH = 10 + cleanBodyLines.length * 4.7 + 4;
    this.ensureSpace(boxH + 4);

    const bg =
      tone === 'emerald'
        ? C_EMERALD_BG
        : tone === 'blue'
          ? C_BLUE_BG
          : tone === 'violet'
            ? C_VIOLET_BG
            : C_GOLD_PALE;
    const stripe =
      tone === 'emerald'
        ? C_EMERALD
        : tone === 'blue'
          ? C_BLUE
          : tone === 'violet'
            ? C_VIOLET
            : C_GOLD_DARK;

    this.doc.setFillColor(...bg);
    this.doc.roundedRect(this.margin, this.y, this.maxWidth, boxH, 2, 2, 'F');
    this.doc.setFillColor(...stripe);
    this.doc.rect(this.margin, this.y, 2.6, boxH, 'F');

    this.doc.setTextColor(...stripe);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.6);
    this.doc.text(cleanPdf(title), this.margin + 6.5, this.y + 6.2);

    this.doc.setTextColor(...C_SLATE_700);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.2);
    this.doc.text(cleanBodyLines, this.margin + 6.5, this.y + 11.6);

    this.y += boxH + 5;
  }

  public addBullet(text: string, withCheckbox = false) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...C_SLATE_700);
    const lines = this.doc.splitTextToSize(cleanPdf(text), this.maxWidth - 9) as string[];
    const h = lines.length * 4.7 + 2.2;
    this.ensureSpace(h);

    if (withCheckbox) {
      this.doc.setDrawColor(...C_GOLD_DARK);
      this.doc.setLineWidth(0.35);
      this.doc.rect(this.margin + 1, this.y - 3.1, 3.4, 3.4, 'S');
    } else {
      this.doc.setFillColor(...C_GOLD);
      this.doc.circle(this.margin + 2.4, this.y - 1.2, 0.9, 'F');
    }

    this.doc.text(lines, this.margin + 7.5, this.y);
    this.y += h;
  }

  public addTable(
    headers: string[],
    rows: string[][],
    colWidths: number[],
    checkboxMode: boolean | number = false
  ) {
    const headerH = 8.5;
    this.ensureSpace(headerH + 14);

    // Header Row
    this.doc.setFillColor(...C_OBSIDIAN);
    this.doc.rect(this.margin, this.y, this.maxWidth, headerH, 'F');
    this.doc.setTextColor(...C_GOLD);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.3);

    let cx = this.margin;
    for (let c = 0; c < headers.length; c++) {
      this.doc.text(cleanPdf(headers[c]), cx + 2.5, this.y + 5.7);
      cx += colWidths[c];
    }
    this.y += headerH;

    // Data Rows
    const checkboxStartCol =
      typeof checkboxMode === 'number'
        ? checkboxMode
        : checkboxMode === true
          ? headers.length - 1
          : -1;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const cellLines = row.map((cell, idx) => {
        this.doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
        this.doc.setFontSize(8.6);
        return this.doc.splitTextToSize(cleanPdf(cell), Math.max(12, colWidths[idx] - 5)) as string[];
      });
      const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
      const rowH = maxLines * 4.4 + 4.5;

      this.ensureSpace(rowH);

      if (r % 2 === 1) {
        this.doc.setFillColor(246, 248, 252);
        this.doc.rect(this.margin, this.y, this.maxWidth, rowH, 'F');
      }
      this.doc.setDrawColor(...C_BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.rect(this.margin, this.y, this.maxWidth, rowH, 'S');

      cx = this.margin;
      for (let c = 0; c < row.length; c++) {
        const isFirst = c === 0;
        this.doc.setFont('helvetica', isFirst ? 'bold' : 'normal');
        this.doc.setFontSize(8.6);
        this.doc.setTextColor(...(isFirst ? C_SLATE_900 : C_SLATE_700));
        this.doc.text(cellLines[c], cx + 2.5, this.y + 5.2);

        if (checkboxStartCol >= 0 && c >= checkboxStartCol && !row[c].trim()) {
          this.doc.setDrawColor(...C_GOLD_DARK);
          this.doc.rect(cx + colWidths[c] / 2 - 2, this.y + rowH / 2 - 2, 4, 4, 'S');
        }
        cx += colWidths[c];
      }
      this.y += rowH;
    }
    this.y += 5;
  }

  public addWorksheetBox(title: string, prompt: string, heightMm: number, linesCount = 4) {
    this.ensureSpace(heightMm + 6);
    this.doc.setDrawColor(...C_BORDER);
    this.doc.setFillColor(255, 255, 255);
    this.doc.roundedRect(this.margin, this.y, this.maxWidth, heightMm, 2, 2, 'FD');

    this.doc.setTextColor(...C_SLATE_900);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.text(cleanPdf(title), this.margin + 4, this.y + 6);

    this.doc.setTextColor(...C_SLATE_500);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.4);
    this.doc.text(cleanPdf(prompt), this.margin + 4, this.y + 10.8);

    const startLineY = this.y + 16;
    const step = (heightMm - 19) / Math.max(1, linesCount);
    this.doc.setDrawColor(230, 234, 240);
    this.doc.setLineWidth(0.25);
    for (let i = 0; i < linesCount; i++) {
      const ly = startLineY + i * step;
      this.doc.line(this.margin + 4, ly, this.margin + this.maxWidth - 4, ly);
    }

    this.y += heightMm + 5;
  }

  /**
   * Exam question card WITHOUT answer revealed (clean simulation booklet).
   */
  public addCleanExamQuestion(q: ExaniQuestion) {
    const letters = ['A', 'B', 'C', 'D'];
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    const promptLines = this.doc.splitTextToSize(
      cleanPdf(`${q.number}. ${q.question}`),
      this.maxWidth - 8
    ) as string[];

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.1);
    const formattedOpts = q.options.map((opt, idx) => `${letters[idx] || '?'}) ${cleanPdf(opt)}`);
    const optLineGroups = formattedOpts.map(
      (o) => this.doc.splitTextToSize(o, this.maxWidth - 14) as string[]
    );
    const optsH = optLineGroups.reduce((acc, g) => acc + g.length * 4.5, 0);
    const totalH = promptLines.length * 4.7 + optsH + 10;

    this.ensureSpace(totalH);

    // Subtle left indicator bar
    this.doc.setFillColor(...C_BORDER);
    this.doc.rect(this.margin, this.y - 3, 1.2, totalH - 4, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...C_SLATE_900);
    this.doc.text(promptLines, this.margin + 4, this.y);
    this.y += promptLines.length * 4.7 + 1.5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.1);
    this.doc.setTextColor(...C_SLATE_700);
    for (const lines of optLineGroups) {
      this.doc.text(lines, this.margin + 8, this.y);
      this.y += lines.length * 4.5;
    }

    this.y += 4.5;
  }

  /**
   * Solved explanation card with answer badge and pedagogical breakdown.
   */
  public addSolvedQuestionCard(q: ExaniQuestion) {
    const letters = ['A', 'B', 'C', 'D'];
    const ansLetter = letters[q.correctIndex] || 'A';
    const ansText = cleanPdf(q.options[q.correctIndex] || '');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    const titleLines = this.doc.splitTextToSize(
      cleanPdf(`Reactivo ${q.number} [${q.area} - Nivel ${q.difficulty}]: ${q.question}`),
      this.maxWidth - 10
    ) as string[];

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.7);
    const expLines = this.doc.splitTextToSize(
      cleanPdf(`Respuesta correcta ${ansLetter}) ${ansText}  |  Explicacion: ${q.explanation}`),
      this.maxWidth - 11
    ) as string[];

    const cardH = titleLines.length * 4.4 + expLines.length * 4.4 + 11;
    this.ensureSpace(cardH + 4);

    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(...C_BORDER);
    this.doc.roundedRect(this.margin, this.y, this.maxWidth, cardH, 2, 2, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...C_SLATE_900);
    this.doc.text(titleLines, this.margin + 4, this.y + 5.5);

    const expY = this.y + 5.5 + titleLines.length * 4.4 + 1.5;
    const expBoxH = expLines.length * 4.4 + 3.5;
    this.doc.setFillColor(...C_EMERALD_BG);
    this.doc.roundedRect(this.margin + 3, expY - 3, this.maxWidth - 6, expBoxH, 1.5, 1.5, 'F');
    this.doc.setTextColor(...C_EMERALD);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.7);
    this.doc.text(expLines, this.margin + 5.5, expY + 0.8);

    this.y += cardH + 4;
  }

  public finalizeHeadersAndFooters() {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      if (i > 1) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(7.8);
        this.doc.setTextColor(...C_GOLD_DARK);
        this.doc.text(this.runningHeaderTitle, this.margin, 12.5);

        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...C_SLATE_500);
        this.doc.text('Miguel Lopez - Estratega Educativo UAA 2026', this.pageWidth - this.margin - 62, 12.5);

        this.doc.setDrawColor(...C_GOLD);
        this.doc.setLineWidth(0.35);
        this.doc.line(this.margin, 14.8, this.pageWidth - this.margin, 14.8);
      }

      this.doc.setDrawColor(...C_BORDER);
      this.doc.setLineWidth(0.25);
      this.doc.line(this.margin, 281, this.pageWidth - this.margin, 281);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(...C_SLATE_500);
      this.doc.text('Material academico exclusivo para preparacion EXANI-II UAA', this.margin, 286);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`Pagina ${i} de ${pageCount}`, this.pageWidth - this.margin - 21, 286);
    }
  }
}

// =========================================================================
// 1. MUESTRA GRATUITA (3-4 Paginas Visuales)
// =========================================================================
export const buildSampleKitPdf = (): jsPDF => {
  const pdf = new LuxuryEditorialPdf('MUESTRA GRATUITA EXANI-II UAA 2026');
  pdf.addLuxuryCover({
    badge: 'Muestra Gratuita de Verificacion',
    title: 'Metodo de Alto Rendimiento EXANI-II UAA',
    subtitle: 'Comprueba la calidad editorial de nuestros cuadernillos: Desarme Filosofico, reactivos comentados y guia tecnica.',
    edition: 'Contenido de esta muestra gratuita',
    accentColor: C_GOLD,
    tocItems: [
      { code: '01', title: 'Comparativa de los 3 Packs Descargables', detail: 'Detalle exacto de PDFs, audio WAV y simulador interactivo' },
      { code: '02', title: 'Metodo de Desarme Filosofico (4 Pasos)', detail: 'Tecnica socratica para Comprension Lectora EXANI-II' },
      { code: '03', title: '3 Reactivos Modelo Resueltos y Ficha Feynman', detail: 'Ejemplos reales de lectura, matematicas y pensamiento analitico' },
    ],
    footerNote: 'Descarga libre para evaluar nuestra metodologia antes de adquirir cualquier pack mediante pago verificado con Stripe.',
  });

  pdf.addPageBreak();
  pdf.addChapterBanner('Ecosistema Completo', 'Que incluyen los 3 Packs Descargables', C_GOLD);
  pdf.addTable(
    ['Pack Disponible', 'Precio', 'Entregables Reales al Pagar con Stripe'],
    [
      ['Kit de Neuro-Aprendizaje', '$99 MXN', 'Cuaderno PDF 8 pags + Plantillas imprimibles + Audio Binaural 40 Hz (.wav)'],
      ['Banco 50 Reactivos EXANI-II', '$149 MXN', 'PDF Examen 50 preguntas + Clave + Solucionario (20 pags) + Simulador 50 preguntas'],
      ['Protocolo Anti-Ansiedad NSDR', '$79 MXN', 'Audio Estereo Alpha->Theta (.wav) + Guia Clinica 5 pags + Checklist 72h UAA'],
    ],
    [52, 26, 98]
  );

  pdf.addChapterBanner('Metodologia Nuclear', 'Desarme Filosofico en 4 Pasos (Comprension Lectora)', C_BLUE);
  pdf.addParagraph(
    'El 68% de los errores en Comprension Lectora no ocurren por falta de vocabulario, sino por responder desde suposiciones previas antes de detectar la estructura logica del autor. Aplica esta secuencia de 60 segundos:'
  );
  pdf.addCalloutBox('Paso 1 - Tesis Central', 'Resume en 8 palabras cual es la afirmacion principal que defiende o cuestiona el parrafo.', 'gold');
  pdf.addCalloutBox('Paso 2 - Conectores de Giro', 'Subraya "sin embargo", "pese a", "por lo tanto" o "no obstante": ahi cambia o concluye el argumento.', 'blue');
  pdf.addCalloutBox('Paso 3 - Supuestos Implicitos', 'Preguntate que necesita dar por cierto el autor para que su conclusion tenga sentido.', 'violet');
  pdf.addCalloutBox('Paso 4 - Descarte de Extremos', 'Desconfia de opciones absolutas ("siempre", "nunca", "todos") cuando el texto original presenta matices.', 'emerald');

  pdf.addPageBreak();
  pdf.addChapterBanner('Muestra Practica', '3 Reactivos Reales Estilo EXANI-II UAA 2026', C_GOLD);
  pdf.addSolvedQuestionCard(EXANI_50_BANK[0]);
  pdf.addSolvedQuestionCard(EXANI_50_BANK[13]);
  pdf.addSolvedQuestionCard(EXANI_50_BANK[26]);

  pdf.addSubheading('Plantilla de Muestra: Ficha Rapida Feynman');
  pdf.addWorksheetBox(
    'Explica un tema dificil con tus propias palabras (sin ver apuntes)',
    'Tema elegido: ___________________________  |  Fecha: ___/___/2026',
    44,
    3
  );

  pdf.finalizeHeadersAndFooters();
  return pdf.doc;
};

// =========================================================================
// 2. PACK 1: KIT DE NEURO-APRENDIZAJE ($99 MXN) -> ~9 Paginas Ricas
// =========================================================================
export const buildNeuroKitPdf = (): jsPDF => {
  const pdf = new LuxuryEditorialPdf('PACK 01 - KIT DE NEURO-APRENDIZAJE 2026');
  pdf.addLuxuryCover({
    badge: 'Pack 01 · PDF + Audio Binaural 40 Hz',
    title: 'Kit de Neuro-Aprendizaje EXANI-II 2026',
    subtitle: 'Arquitectura de Ciclos Ultradianos 90/20, Curva del Olvido, Matriz Eisenhower, Plantillas Imprimibles y Protocolo 40 Hz.',
    edition: 'Mapa del Cuaderno de Trabajo',
    accentColor: [96, 165, 250],
    tocItems: [
      { code: '01', title: 'Ciclos Ultradianos 90/20 (Diagrama de Flujo)', detail: 'Como estructurar bloques de maximo enfoque sin fatiga prefrontal' },
      { code: '02', title: 'Curva del Olvido vs. Repaso Espaciado', detail: 'Grafica de retencion 1-3-7-14 dias y metodo de recuperacion activa' },
      { code: '03', title: 'Matriz Eisenhower 2x2 para Aspirantes UAA', detail: 'Priorizacion tactica de temarios segun tiempo restante al examen' },
      { code: '04', title: 'Plantillas Imprimibles y Guia Audio 40 Hz', detail: 'Planificador semanal, Hoja Feynman, Brain Dump y calibracion binaural' },
    ],
    footerNote: 'Combina este cuadernillo con el Audio Binaural 40 Hz (.wav) incluido en tu descarga usando audifonos estereo a volumen bajo-medio.',
  });

  // PAGE 2: Ultradian Cycles + Vector Timeline Diagram
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 01', 'Arquitectura de Ciclos Ultradianos (90 / 20)', [96, 165, 250]);
  pdf.addParagraph(
    'Tu corteza prefrontal consume glucosa y neurotransmisores atencionales en ciclos biologicos cercanos a 90 minutos. Forzar sesiones continuas de 3 o 4 horas sin recuperacion real desploma la precision de lectura y multiplica los errores por descuido.'
  );

  // Draw Vector Ultradian Timeline Diagram
  pdf.ensureSpace(54);
  const diagY = pdf.y + 4;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(pdf.margin, diagY, pdf.maxWidth, 44, 2.5, 2.5, 'FD');

  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(9.5);
  pdf.doc.setTextColor(...C_SLATE_900);
  pdf.doc.text('DIAGRAMA TEMPORAL DE UN BLOQUE ULTRADIANO OPTIMO (110 MINUTOS TOTALES)', pdf.margin + 5, diagY + 7);

  const barX = pdf.margin + 5;
  const barY = diagY + 13;
  const segments: Array<{ w: number; color: Rgb; label: string; time: string }> = [
    { w: 16, color: C_GOLD, label: 'Encuadre', time: '0-5m' },
    { w: 62, color: C_OBSIDIAN, label: 'Practica Activa EXANI', time: '5-45m' },
    { w: 46, color: C_BLUE, label: 'Analisis Errores', time: '45-80m' },
    { w: 16, color: C_EMERALD, label: 'Sintesis', time: '80-90m' },
    { w: 26, color: [100, 116, 139], label: 'Descanso Real', time: '90-110m' },
  ];

  let curX = barX;
  for (const seg of segments) {
    pdf.doc.setFillColor(...seg.color);
    pdf.doc.rect(curX, barY, seg.w, 12, 'F');
    pdf.doc.setTextColor(...(seg.color === C_GOLD ? C_OBSIDIAN : ([255, 255, 255] as Rgb)));
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.setFontSize(7.4);
    pdf.doc.text(seg.time, curX + 2, barY + 7.5);

    pdf.doc.setTextColor(...C_SLATE_700);
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.setFontSize(7.6);
    pdf.doc.text(seg.label, curX + 1, barY + 17.5);
    curX += seg.w;
  }

  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(8.2);
  pdf.doc.setTextColor(...C_SLATE_500);
  pdf.doc.text('Regla de oro: Durante los 20 minutos finales NO revises redes sociales (evita saturar dopamina). Camina e hidratate.', barX, barY + 25);
  pdf.y = diagY + 50;

  pdf.addCalloutBox(
    'Fases del Ciclo 90/20',
    'Min 0-5: Descarga Cognitiva y audio 40 Hz. Min 5-45: Resolver reactivos cronometrados sin mirar clave. Min 45-80: Auditar cada error en bitacora. Min 80-90: Explicar 3 ideas clave en voz alta sin apuntes.',
    'blue'
  );

  // PAGE 3: Forgetting Curve Visual Chart + Spaced Repetition
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 02', 'Curva del Olvido vs. Repaso Espaciado (1-3-7-14)', C_EMERALD);
  pdf.addParagraph(
    'Sin repaso estructurado, el cerebro descarta hasta el 70% de un tema estudiado en 48 horas. En cambio, cada sesion breve de recuperacion activa (autoevaluacion sin ver apuntes) aplana la curva y fija el conocimiento hasta el dia del examen.'
  );

  // Vector Chart: Forgetting Curve vs Spaced Repetition
  pdf.ensureSpace(68);
  const chY = pdf.y + 2;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(pdf.margin, chY, pdf.maxWidth, 60, 2.5, 2.5, 'FD');

  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(9.2);
  pdf.doc.setTextColor(...C_SLATE_900);
  pdf.doc.text('RETENCION DE MEMORIA A 14 DIAS: ESTUDIO PASIVO VS. REPASO ESPACIADO', pdf.margin + 5, chY + 7);

  const axX = pdf.margin + 18;
  const axY = chY + 14;
  const axW = 148;
  const axH = 34;

  // Axes
  pdf.doc.setDrawColor(...C_SLATE_500);
  pdf.doc.setLineWidth(0.4);
  pdf.doc.line(axX, axY, axX, axY + axH);
  pdf.doc.line(axX, axY + axH, axX + axW, axY + axH);

  // Axis labels
  pdf.doc.setFontSize(7.5);
  pdf.doc.setTextColor(...C_SLATE_500);
  pdf.doc.text('100%', axX - 11, axY + 3);
  pdf.doc.text('50%', axX - 9, axY + axH / 2 + 1);
  pdf.doc.text('Dia 0', axX - 2, axY + axH + 5);
  pdf.doc.text('Dia 1', axX + 26, axY + axH + 5);
  pdf.doc.text('Dia 3', axX + 56, axY + axH + 5);
  pdf.doc.text('Dia 7', axX + 94, axY + axH + 5);
  pdf.doc.text('Dia 14', axX + 136, axY + axH + 5);

  // Red dashed passive decay line
  pdf.doc.setDrawColor(220, 38, 38);
  pdf.doc.setLineWidth(0.7);
  pdf.doc.line(axX, axY + 2, axX + 28, axY + 18);
  pdf.doc.line(axX + 28, axY + 18, axX + 60, axY + 27);
  pdf.doc.line(axX + 60, axY + 27, axX + axW, axY + 32);

  // Emerald spaced repetition sawtooth reinforcement
  pdf.doc.setDrawColor(...C_EMERALD);
  pdf.doc.setLineWidth(0.9);
  const pts: Array<[number, number]> = [
    [axX, axY + 2],
    [axX + 28, axY + 13],
    [axX + 29, axY + 3],
    [axX + 58, axY + 11],
    [axX + 59, axY + 3],
    [axX + 96, axY + 9],
    [axX + 97, axY + 2.5],
    [axX + axW, axY + 6],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    pdf.doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  }
  // Gold nodes
  pdf.doc.setFillColor(...C_GOLD);
  for (const idx of [2, 4, 6]) {
    pdf.doc.circle(pts[idx][0], pts[idx][1], 1.5, 'F');
  }

  // Legend
  pdf.doc.setFontSize(7.8);
  pdf.doc.setTextColor(...C_EMERALD);
  pdf.doc.text('Linea Verde: Repaso activo (Dias 1, 3, 7, 14) -> >85% retencion', axX + 2, chY + 56.5);
  pdf.doc.setTextColor(185, 28, 28);
  pdf.doc.text('Linea Roja: Releer sin autoevaluarse -> <25%', axX + 92, chY + 56.5);
  pdf.y = chY + 66;

  pdf.addTable(
    ['Intervalo', 'Duracion', 'Accion Exacta de Recuperacion Activa'],
    [
      ['Dia 0 (Estudio)', '45-90 min', 'Comprender tema + resolver 5 a 10 reactivos EXANI-II + anotar errores'],
      ['Dia 1 (Primer repaso)', '10 min', 'Sin ver apuntes: escribe en una hoja los 3 conceptos clave y resuelve 2 reactivos'],
      ['Dia 3 (Consolidacion)', '12 min', 'Aplica el Metodo Feynman en voz alta enfocandote solo en donde dudaste'],
      ['Dia 7 y Dia 14', '15 min', 'Mini-bloque cronometrado de 5 reactivos mixtos nivel Intermedio/Avanzado'],
    ],
    [38, 24, 114]
  );

  // PAGE 4: Eisenhower 2x2 Matrix Vector Grid
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 03', 'Matriz de Prioridades Eisenhower para el EXANI-II', C_GOLD);
  pdf.addParagraph(
    'El mayor enemigo del aspirante no es la falta de horas, sino gastar energia en "estudio comodo" (subrayar temas que ya dominas) mientras pospones tus debilidades en semaforo rojo.'
  );

  pdf.ensureSpace(105);
  const mx = pdf.margin;
  const my = pdf.y + 2;
  const qw = 86;
  const qh = 46;
  const quadrants: Array<{ x: number; y: number; bg: Rgb; accent: Rgb; title: string; body: string }> = [
    {
      x: mx,
      y: my,
      bg: [254, 242, 242],
      accent: [185, 28, 28],
      title: 'C1 · URGENTE + IMPORTANTE (HACER HOY)',
      body: '- Temas de tu diagnostico en Semaforo Rojo.\n- Simulacros cronometrados completos.\n- Revision obligatoria de bitacora de errores.',
    },
    {
      x: mx + qw + 4,
      y: my,
      bg: C_EMERALD_BG,
      accent: C_EMERALD,
      title: 'C2 · IMPORTANTE + NO URGENTE (PLANIFICAR)',
      body: '- Repaso espaciado Dias 1, 3, 7, 14.\n- Entrenamiento de Desarme Filosofico.\n- Sueno 7.5-8h y protocolo NSDR pre-examen.',
    },
    {
      x: mx,
      y: my + qh + 4,
      bg: C_GOLD_PALE,
      accent: C_GOLD_DARK,
      title: 'C3 · URGENTE + NO IMPORTANTE (REDUCIR)',
      body: '- Mensajes y notificaciones durante tu ciclo 90/20.\n- Apuntes esteticos repetidos sin resolver reactivos.\n- Debates de grupos de estudio sin temario.',
    },
    {
      x: mx + qw + 4,
      y: my + qh + 4,
      bg: [241, 245, 249],
      accent: C_SLATE_500,
      title: 'C4 · NI URGENTE NI IMPORTANTE (ELIMINAR)',
      body: '- Scroll infinito entre descansos de 20 minutos.\n- Releer resumenes pasivos antes de dormir.\n- Guias no alineadas al temario oficial CENEVAL.',
    },
  ];

  for (const q of quadrants) {
    pdf.doc.setFillColor(...q.bg);
    pdf.doc.setDrawColor(...q.accent);
    pdf.doc.setLineWidth(0.4);
    pdf.doc.roundedRect(q.x, q.y, qw, qh, 2, 2, 'FD');

    pdf.doc.setTextColor(...q.accent);
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.setFontSize(8.2);
    pdf.doc.text(q.title, q.x + 4, q.y + 7);

    pdf.doc.setTextColor(...C_SLATE_700);
    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setFontSize(8.3);
    const qLines = pdf.doc.splitTextToSize(q.body, qw - 8) as string[];
    pdf.doc.text(qLines, q.x + 4, q.y + 14);
  }
  pdf.y = my + qh * 2 + 12;

  pdf.addCalloutBox(
    'Regla 80/20 del Metodo Miguel Lopez',
    'Dedica el 75% de tu semana exclusivamente a C1 (errores y areas en rojo) y C2 (repaso espaciado y simulacros). Un bloque de 90 minutos en C1 vale mas que 5 horas copiando apuntes bonitos.',
    'gold'
  );

  // PAGE 5: Printable Feynman Worksheet
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 01', 'Hoja de Trabajo: Metodo Feynman en 4 Pasos', C_GOLD);
  pdf.addParagraph('Imprime esta hoja o replicala en tu cuaderno cada vez que un tema de Matematicas, Analitico o Lengua te cueste trabajo.');
  pdf.addWorksheetBox('1. Concepto EXANI-II a dominar', 'Ejemplo: Regla de tres inversa / Silogismos / Acento diacritico', 24, 1);
  pdf.addWorksheetBox('2. Explicacion sencilla (como para un alumno de 12 anos)', 'Escribe sin jerga tecnica y usa un ejemplo cotidiano propio:', 52, 5);
  pdf.addWorksheetBox('3. Donde me trabe o dude al explicarlo? (Laguna real)', 'Anota exactamente el paso o regla que no pudiste deducir sin mirar la guia:', 40, 3);
  pdf.addWorksheetBox('4. Analogia final + Verificacion en 3 reactivos', 'Mi analogia simple + aciertos logrados tras repasar la fuente (___ / 3):', 36, 3);

  // PAGE 6: Brain Dump + Spaced Repetition Tracker
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 02', 'Descarga Cognitiva y Tracker de Repaso (14 Dias)', C_EMERALD);
  pdf.addWorksheetBox(
    'Descarga Cognitiva Pre-Estudio (5 minutos antes de tu bloque 90/20)',
    'Vacia aqui pendientes, preocupaciones o tareas sueltas para liberar memoria de trabajo:',
    44,
    4
  );
  pdf.addSubheading('Bitacora Oficial de Repaso Espaciado EXANI-II');
  pdf.addTable(
    ['Tema o Subarea Fallada', 'Area', 'D1', 'D3', 'D7', 'D14'],
    [
      ['', 'Matematico / Lectora', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
    ],
    [82, 46, 12, 12, 12, 12],
    2
  );

  // PAGE 7: Weekly Ultradian Planner
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 03', 'Planificador Semanal Ultradiano (UAA 2026)', C_BLUE);
  pdf.addParagraph('Asigna tus bloques en las horas del dia donde tu nivel de alerta sea mas alto. Marca cada casilla al completar los 90 min + 20 min de recuperacion.');
  pdf.addTable(
    ['Dia', 'Bloque 1 (90/20 Prioridad Roja)', 'Bloque 2 (90/20 Practica/Simulacro)', 'Listo'],
    [
      ['Lunes', '', '', ''],
      ['Martes', '', '', ''],
      ['Miercoles', '', '', ''],
      ['Jueves', '', '', ''],
      ['Viernes', '', '', ''],
      ['Sabado', 'Simulacro parcial cronometrado + Auditoria', 'Repaso espaciado de errores de la semana', ''],
      ['Domingo', 'Descanso cognitivo + Audio NSDR 10 min', 'Lectura ligera / preparacion de semana', ''],
    ],
    [24, 68, 68, 16],
    true
  );

  // PAGE 8: Binaural 40 Hz Audio Guide
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 04', 'Protocolo Neuroacustico: Audio Binaural 40 Hz (.wav)', C_VIOLET);
  pdf.addParagraph(
    'Junto con este PDF descargaste el archivo Audio-Binaural-40Hz-Enfoque-MiguelLopez.wav (y tienes el reproductor continuo integrado dentro de tu panel de Packs).'
  );
  pdf.addBullet('Principio fisico: El oido izquierdo recibe una portadora pura de 200 Hz y el derecho 240 Hz; la diferencia de 40 Hz corresponde a la banda Gamma asociada a atencion sostenida y memoria de trabajo.');
  pdf.addBullet('Uso obligatorio de audifonos estereo (izquierdo/derecho) para que se produzca el batido binaural en el tallo cerebral.');
  pdf.addBullet('Volumen recomendado: Bajo a moderado (30% a 45%). La pista debe percibirse como un fondo ambiental suave, nunca invasivo.');
  pdf.addBullet('Momento ideal: Activala los primeros 25 a 45 minutos del Ciclo Ultradiano durante lectura critica o resolucion matematica.');
  pdf.addBullet('Precaucion: No la utilices al conducir, operar maquinaria ni si presentas sensibilidad auditiva o antecedentes de epilepsia fotosensible/acustica.');
  pdf.addCalloutBox(
    'Secuencia Recomendada Antes de Encender el Audio',
    '1) Telefono en modo avion o fuera de vista. 2) Botella de agua en escritorio. 3) Objetivo unico escrito en tu Descarga Cognitiva (ej. "Resolver Reactivos 14 al 26 sin calculadora"). 4) Presiona Play 40 Hz y arranca cronometro de 45 min.',
    'violet'
  );

  pdf.finalizeHeadersAndFooters();
  return pdf.doc;
};

// =========================================================================
// 3. PACK 2: BANCO DE 50 REACTIVOS EXANI-II ($149 MXN) -> ~21+ Paginas
// =========================================================================
export const buildReactivos50Pdf = (diagnosticReportText?: string | null): jsPDF => {
  const pdf = new LuxuryEditorialPdf('PACK 02 - BANCO DE 50 REACTIVOS EXANI-II 2026');
  pdf.addLuxuryCover({
    badge: 'Best Seller · Edicion Predictiva 2026',
    title: 'Banco de 50 Reactivos EXANI-II UAA',
    subtitle: 'Cuadernillo completo en formato examen limpio, tabla de clave rapida 1-50, solucionario comentado y conversion CENEVAL.',
    edition: 'Estructura del Cuadernillo',
    accentColor: C_GOLD,
    tocItems: [
      { code: '01', title: 'Mapa de Examen, Tiempos y Escala CENEVAL', detail: 'Distribucion oficial de las 4 areas troncales y metas de ingreso UAA' },
      { code: '02', title: 'Parte I: Simulacro Limpio (Reactivos 1 al 50)', detail: 'Formato examen sin respuestas visibles para resolver en 65 minutos' },
      { code: '03', title: 'Parte II: Tabla Clave Rapida (1-50) y Burbujas', detail: 'Autoevaluacion inmediata y calculo exacto de puntaje 700-1300' },
      { code: '04', title: 'Parte III: Solucionario Comentado Completo', detail: 'Explicacion paso a paso y logica de descarte para los 50 reactivos' },
    ],
    footerNote: 'Recomendacion: Resuelve primero la Parte I completa con cronometro de 65 minutos antes de consultar las Partes II y III.',
  });

  // PAGE 2: Blueprint & Strategy + Diagnostic Report if present
  pdf.addPageBreak();
  pdf.addChapterBanner('Guia Tactica', 'Distribucion de Areas, Meta UAA y Escala CENEVAL', C_GOLD);
  pdf.addTable(
    ['Area Troncal EXANI-II', 'Reactivos', 'Tiempo Meta', 'Enfoque Evaluado'],
    [
      ['1. Comprension Lectora', '1 al 13 (13)', '18 min', 'Tesis, inferencias, conectores, tono e intencion comunicativa'],
      ['2. Pensamiento Matematico', '14 al 26 (13)', '20 min', 'Porcentajes, conjuntos, ecuaciones, geometria y probabilidad'],
      ['3. Pensamiento Analitico', '27 al 38 (12)', '15 min', 'Sucesiones, silogismos, analogias y logica espacial/deductiva'],
      ['4. Estructura de la Lengua', '39 al 50 (12)', '12 min', 'Concordancia, acento diacritico, puntuacion, vicios y cohesion'],
    ],
    [52, 27, 23, 74]
  );

  pdf.addTable(
    ['Aciertos / 50', 'Porcentaje', 'Puntaje CENEVAL Est.', 'Carreras Referencia UAA'],
    [
      ['44 - 50', '88% - 100%', '1,228 - 1,300 pts', 'Zona competitiva Medico Cirujano (Top Tier)'],
      ['38 - 43', '76% - 86%', '1,156 - 1,216 pts', 'Medico Cirujano / Estomatologia / Salud'],
      ['30 - 37', '60% - 74%', '1,060 - 1,144 pts', 'Psicologia / Derecho / Ingenierias / Arquitectura'],
      ['22 - 29', '44% - 58%', '964 - 1,048 pts', 'Administracion / Contaduria / Zona de refuerzo'],
    ],
    [28, 28, 44, 76]
  );

  if (diagnosticReportText && diagnosticReportText.trim()) {
    pdf.addSubheading('Tu Diagnostico Personal Integrado de Esta Sesion');
    const cleanRep = diagnosticReportText
      .replace(/\*\*/g, '')
      .replace(/^#{1,4}\s*/gm, '')
      .trim();
    const lines = cleanRep.split('\n').filter((l) => l.trim() !== '').slice(0, 12);
    pdf.addCalloutBox('Resumen Evaluado en Plataforma', lines.join('\n'), 'emerald');
  }

  // PART I: CLEAN 50-QUESTION EXAM BOOKLET (NO SPOILERS)
  const areas: ExaniArea[] = [
    'Comprensión Lectora',
    'Pensamiento Matemático',
    'Pensamiento Analítico',
    'Estructura de la Lengua',
  ];

  for (const area of areas) {
    pdf.addPageBreak();
    const items = EXANI_50_BANK.filter((q) => q.area === area);
    pdf.addChapterBanner('Parte I · Cuadernillo de Examen', `${area} (${items.length} Reactivos)`, C_OBSIDIAN);
    for (const q of items) {
      pdf.addCleanExamQuestion(q);
    }
  }

  // PART II: QUICK ANSWER KEY GRID (1-50)
  pdf.addPageBreak();
  pdf.addChapterBanner('Parte II · Autoevaluacion', 'Tabla Clave Rapida (Reactivos 1 al 50)', C_GOLD);
  pdf.addParagraph('Califica tus 50 respuestas en segundos antes de estudiar las explicaciones detalladas. Formula rapida de puntaje aproximado: 700 + (Tus Aciertos x 12).');

  const letters = ['A', 'B', 'C', 'D'];
  const keyRows: string[][] = [];
  for (let rowIdx = 0; rowIdx < 10; rowIdx++) {
    const cells: string[] = [];
    for (let colIdx = 0; colIdx < 5; colIdx++) {
      const qIdx = colIdx * 10 + rowIdx;
      const q = EXANI_50_BANK[qIdx];
      if (q) {
        cells.push(`${String(q.number).padStart(2, '0')} -> ${letters[q.correctIndex]} (${q.difficulty[0]})`);
      } else {
        cells.push('');
      }
    }
    keyRows.push(cells);
  }
  pdf.addTable(
    ['Bloque 1-10', 'Bloque 11-20', 'Bloque 21-30', 'Bloque 31-40', 'Bloque 41-50'],
    keyRows,
    [35.2, 35.2, 35.2, 35.2, 35.2]
  );

  // PART III: COMPLETE 50 EXPLAINED SOLUTIONS
  for (const area of areas) {
    pdf.addPageBreak();
    const items = EXANI_50_BANK.filter((q) => q.area === area);
    pdf.addChapterBanner('Parte III · Solucionario Comentado', `Explicaciones Paso a Paso: ${area}`, C_EMERALD);
    for (const q of items) {
      pdf.addSolvedQuestionCard(q);
    }
  }

  // FINAL PAGE: Drill Log & Error Diagnosis
  pdf.addPageBreak();
  pdf.addChapterBanner('Cierre Estrategico', 'Bitacora de Simulacros UAA 2026', C_GOLD);
  pdf.addTable(
    ['Intento', 'Fecha', 'Lectura /13', 'Matem. /13', 'Analit. /12', 'Lengua /12', 'CENEVAL Est.'],
    [
      ['Simulacro 1', '___/___/26', '', '', '', '', ''],
      ['Simulacro 2', '___/___/26', '', '', '', '', ''],
      ['Simulacro 3', '___/___/26', '', '', '', '', ''],
    ],
    [28, 25, 24, 24, 24, 24, 27]
  );
  pdf.addWorksheetBox(
    'Auditoria de Errores Recurrentes (Los 5 temas que debo corregir esta semana)',
    'Escribe numero de reactivo fallado y la regla exacta para no volver a caer en el mismo distractor:',
    68,
    5
  );

  pdf.finalizeHeadersAndFooters();
  return pdf.doc;
};

// =========================================================================
// 4. PACK 3: PROTOCOLO ANTI-ANSIEDAD NSDR ($79 MXN) -> ~7-8 Paginas Ricas
// =========================================================================
export const buildNsdrProtocolPdf = (): jsPDF => {
  const pdf = new LuxuryEditorialPdf('PACK 03 - PROTOCOLO ANTI-ANSIEDAD NSDR 2026');
  pdf.addLuxuryCover({
    badge: 'Pack 03 · Audio WAV Alpha->Theta + Guia Clinica',
    title: 'Protocolo Anti-Ansiedad NSDR Pre-Examen',
    subtitle: 'Regulacion vagal rapida en 10 minutos, diagramas de respiracion tactica y plan de emergencia contra bloqueo mental en el aula.',
    edition: 'Contenido de esta Guia Clinica',
    accentColor: [167, 139, 250],
    tocItems: [
      { code: '01', title: 'Neurofisiologia del Bloqueo y Freno Vagal', detail: 'Por que ocurre la mente en blanco y como revertir cortisol en 10 min' },
      { code: '02', title: 'Secuencia NSDR 10 Minutos (Audio Alpha -> Theta)', detail: 'Cronograma minuto a minuto para sincronizar con tu archivo .wav' },
      { code: '03', title: 'Diagramas Tacticos: Respiracion 4-7-8 y Caja 4-4-4-4', detail: 'Protocolos visuales para antes de dormir y en pleno examen' },
      { code: '04', title: 'Checklist 72 Horas y Rescate en Aula EXANI-II', detail: 'Logistica UAA, nutricion estable y regla de los 75 segundos' },
    ],
    footerNote: 'Escucha el audio Protocolo-NSDR-AntiAnsiedad-MiguelLopez.wav la noche previa y 30 minutos antes de salir rumbo al examen.',
  });

  // PAGE 2: Neurobiology + 10-minute timeline
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 01', 'Cortisol vs. Freno Vagal: Por que Ocurre el Bloqueo', C_VIOLET);
  pdf.addParagraph(
    'Cuando percibes el examen como amenaza, el sistema simpatico libera adrenalina y cortisol, secuestrando recursos de la corteza prefrontal (encargada del razonamiento matematico y la comprension lectora). El protocolo NSDR (Non-Sleep Deep Rest) combinado con exhalaciones mas largas que la inhalacion activa el nervio vago y restaura la lucidez cognitiva sin somnolencia.'
  );

  pdf.addTable(
    ['Estado Autonomico', 'Senales Fisicas', 'Efecto en el EXANI-II', 'Intervencion Correctiva'],
    [
      ['Alerta Optima (Zona Verde)', 'Pulso estable, respiracion nasal fluida', 'Lectura rapida, descarte preciso', 'Mantener ritmo 75s por reactivo'],
      ['Sobreactivacion (Zona Roja)', 'Taquicardia, lectura repetida sin entender', 'Mente en blanco, error impulsivo', 'Pausa 45s + 3 ciclos Caja 4-4-4-4'],
      ['Agotamiento Nocturno', 'Insomnio pre-examen por rumiacion mental', 'Lentitud operativa al dia siguiente', 'Audio NSDR Alpha->Theta 10 min'],
    ],
    [40, 44, 44, 48]
  );

  pdf.addChapterBanner('Modulo 02', 'Cronograma del Protocolo NSDR (Sincronizado con Audio .wav)', C_VIOLET);
  pdf.addTable(
    ['Minuto', 'Fase del Protocolo', 'Instruccion Exacta'],
    [
      ['0:00 - 2:00', 'Aterrizaje Sensorial', 'Audifonos estereo colocados, espalda apoyada, ojos cerrados y mandibula suelta.'],
      ['2:00 - 5:00', 'Freno Vagal 4-7-8', '4 ciclos lentos: inhala 4s nariz, sosten 7s, exhala muy suave 8s por boca.'],
      ['5:00 - 8:30', 'Escaneo Corporal', 'Recorre frente -> hombros -> manos -> abdomen soltando peso al ritmo Alpha->Theta.'],
      ['8:30 - 10:00', 'Retorno Limpio', '2 inhalaciones energizantes, abre los ojos y evita mirar redes sociales o mensajes.'],
    ],
    [28, 42, 106]
  );

  // PAGE 3: Visual Breathing Diagrams (4-7-8 & Tactical 4x4 Box)
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 03', 'Diagramas Visuales de Respiracion Tactica', C_EMERALD);
  pdf.addParagraph('Dos herramientas complementarias: usa 4-7-8 la noche anterior o 30 minutos antes del examen; usa la Caja 4-4-4-4 de forma silenciosa sentado en tu pupitre si sientes ansiedad en el examen.');

  pdf.ensureSpace(92);
  const by = pdf.y + 4;
  // Left Panel: 4-7-8 Circular Phase Diagram
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(pdf.margin, by, 85, 84, 2.5, 2.5, 'FD');
  pdf.doc.setTextColor(...C_VIOLET);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(9.5);
  pdf.doc.text('PROTOCOLO 4-7-8 (CALMA PROFUNDA)', pdf.margin + 6, by + 8);

  const cx = pdf.margin + 42.5;
  const cy = by + 40;
  pdf.doc.setDrawColor(...C_VIOLET);
  pdf.doc.setLineWidth(1.2);
  pdf.doc.circle(cx, cy, 20, 'S');
  pdf.doc.setFillColor(...C_VIOLET_BG);
  pdf.doc.circle(cx, cy, 14, 'F');
  pdf.doc.setTextColor(...C_SLATE_900);
  pdf.doc.setFontSize(12);
  pdf.doc.text('4-7-8', cx - 5.5, cy + 1.5);

  pdf.doc.setFontSize(8);
  pdf.doc.setTextColor(...C_SLATE_700);
  pdf.doc.text('1) Inhala nariz: 4s', pdf.margin + 6, by + 67);
  pdf.doc.text('2) Sosten aire: 7s', pdf.margin + 6, by + 72.5);
  pdf.doc.text('3) Exhala lento boca: 8s (x4 ciclos)', pdf.margin + 6, by + 78);

  // Right Panel: 4-4-4-4 Tactical Box Breathing Diagram
  const rx = pdf.margin + 91;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(rx, by, 85, 84, 2.5, 2.5, 'FD');
  pdf.doc.setTextColor(...C_EMERALD);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(9.5);
  pdf.doc.text('CAJA TACTICA 4-4-4-4 (EN AULA)', rx + 6, by + 8);

  const bx = rx + 26;
  const bty = by + 24;
  const bSize = 32;
  pdf.doc.setDrawColor(...C_EMERALD);
  pdf.doc.setLineWidth(1.2);
  pdf.doc.rect(bx, bty, bSize, bSize, 'S');

  pdf.doc.setFontSize(7.8);
  pdf.doc.setTextColor(...C_SLATE_900);
  pdf.doc.text('Inhala 4s ->', bx + 5, bty - 2.5);
  pdf.doc.text('Sosten 4s', bx + bSize + 2, bty + bSize / 2);
  pdf.doc.text('<- Exhala 4s', bx + 5, bty + bSize + 5);
  pdf.doc.text('Pausa 4s', rx + 8, bty + bSize / 2);
  pdf.doc.setFontSize(11);
  pdf.doc.setTextColor(...C_EMERALD);
  pdf.doc.text('4x4', bx + 11.5, bty + 17.5);

  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(8);
  pdf.doc.setTextColor(...C_SLATE_700);
  pdf.doc.text('Total: 64 segundos silenciosos en examen', rx + 6, by + 78);
  pdf.y = by + 90;

  // PAGE 4: Classroom Rescue & Checklist
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 04', 'Rescate en Aula y Checklist Logistico UAA (72 Horas)', C_GOLD);
  pdf.addCalloutBox(
    'Protocolo si te quedas "En Blanco" durante el examen',
    '1) Suelta el lapiz 45 segundos y mira un punto fijo neutro. 2) Aplica 3 ciclos silenciosos 4-4-4-4. 3) Si el reactivo actual lleva >75 segundos, marcalo en el margen y salta al siguiente reactivo facil para recuperar momentum dopaminergico.',
    'gold'
  );

  pdf.addSubheading('Checklist Logistico Pre-Examen UAA (Marca cada casilla)');
  pdf.addBullet('72 horas antes: Verificar sede exacta UAA, aula, hora de cita y ruta de traslado con 30 min de colchon.', true);
  pdf.addBullet('48 horas antes: Realizar ultimo simulacro parcial a la misma hora matutina del examen real.', true);
  pdf.addBullet('24 horas antes: Cerrar estudio nuevo a las 19:30 hrs; preparar identificacion oficial vigente, pase de ingreso impreso, lapices No. 2 o 2 1/2, goma blanca y sacapuntas.', true);
  pdf.addBullet('Noche previa: Escuchar Audio NSDR (10 min) con luces bajas y celular fuera de la cama.', true);
  pdf.addBullet('Manana del examen: Desayuno estable (proteina + carbohidrato complejo; evita azucares simples que provocan bajon de glucosa a mitad del bloque matematico).', true);

  // PAGE 5: 7-Day Pre-Exam Regulation Log
  pdf.addPageBreak();
  pdf.addChapterBanner('Bitacora Practica', 'Registro de Regulacion Pre-Simulacro (7 Sesiones)', C_VIOLET);
  pdf.addParagraph('Mide tu nivel de ansiedad percibida (escala 1 al 10) antes y despues de escuchar el audio NSDR previo a tus simulacros:');
  pdf.addTable(
    ['Sesion / Fecha', 'Ans. Antes (1-10)', 'Protocolo Aplicado', 'Ans. Despues (1-10)', 'Puntaje'],
    [
      ['Sesion 1: ___/___', '', 'Audio NSDR + 4-7-8', '', ''],
      ['Sesion 2: ___/___', '', 'Audio NSDR + 4-7-8', '', ''],
      ['Sesion 3: ___/___', '', 'Audio NSDR + Caja 4-4-4-4', '', ''],
      ['Sesion 4: ___/___', '', 'Audio NSDR + 4-7-8', '', ''],
      ['Sesion 5: ___/___', '', 'Audio NSDR + Caja 4-4-4-4', '', ''],
      ['Sesion 6: ___/___', '', 'Audio NSDR + 4-7-8', '', ''],
      ['Sesion 7: ___/___', '', 'NSDR Completo (10 min)', '', ''],
      ['Dia Examen UAA', '', 'NSDR Manana + Caja en Aula', '', 'Meta UAA!'],
    ],
    [32, 34, 48, 36, 26]
  );
  pdf.addCalloutBox(
    'Meta de Calibracion Autonomica',
    'Al completar 5 a 7 sesiones previas asociando el tono Alpha->Theta con tu respiracion 4-7-8, tu sistema nervioso condiciona la respuesta de calma: en el aula real bastaran 3 respiraciones en Caja 4-4-4-4 para recuperar foco en menos de 60 segundos.',
    'violet'
  );

  pdf.finalizeHeadersAndFooters();
  return pdf.doc;
};

// Export browser save helpers
export const generateSampleKitPdf = () => {
  buildSampleKitPdf().save('Muestra-Gratuita-EXANI-II-2026.pdf');
};

export const generateNeuroKitPdf = () => {
  buildNeuroKitPdf().save('Kit-Neuro-Aprendizaje-2026-MiguelLopez.pdf');
};

export const generateReactivos50Pdf = (diagnosticReportText?: string | null) => {
  buildReactivos50Pdf(diagnosticReportText).save('Banco-50-Reactivos-EXANI-II-2026.pdf');
};

export const generateNsdrProtocolPdf = () => {
  buildNsdrProtocolPdf().save('Protocolo-Anti-Ansiedad-NSDR-2026.pdf');
};

export const generateFullKitPdf = generateReactivos50Pdf;
