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
    .replace(/[—–]/g, ' - ')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
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

  public addStepFlowDiagram(
    title: string,
    steps: Array<{ code: string; label: string; detail: string; accent: Rgb }>
  ) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.6);
    const colW = (this.maxWidth - 10 - (steps.length - 1) * 4) / steps.length;
    const wrappedDetails = steps.map(
      (s) => this.doc.splitTextToSize(cleanPdf(s.detail), colW - 4) as string[]
    );
    const maxDetailLines = Math.max(2, ...wrappedDetails.map((l) => l.length));
    const cardH = 24 + maxDetailLines * 3.8 + 4;

    this.ensureSpace(cardH + 5);
    const y0 = this.y;

    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(...C_BORDER);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, y0, this.maxWidth, cardH, 2.5, 2.5, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.1);
    this.doc.setTextColor(...C_SLATE_900);
    this.doc.text(cleanPdf(title), this.margin + 5, y0 + 6.5);

    const boxY = y0 + 10.5;
    const boxH = cardH - 14.5;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const bx = this.margin + 5 + i * (colW + 4);

      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(...s.accent);
      this.doc.setLineWidth(0.4);
      this.doc.roundedRect(bx, boxY, colW, boxH, 1.8, 1.8, 'FD');

      this.doc.setFillColor(...s.accent);
      this.doc.roundedRect(bx + 2, boxY + 2, 9, 5, 1, 1, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.2);
      this.doc.text(cleanPdf(s.code), bx + 4.3, boxY + 5.5);

      this.doc.setTextColor(...C_SLATE_900);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.2);
      this.doc.text(cleanPdf(s.label), bx + 2, boxY + 11.5);

      this.doc.setTextColor(...C_SLATE_700);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.6);
      this.doc.text(wrappedDetails[i], bx + 2, boxY + 16);

      if (i < steps.length - 1) {
        const ax1 = bx + colW + 0.6;
        const ax2 = bx + colW + 3.4;
        const ay = boxY + boxH / 2;
        this.doc.setDrawColor(...C_GOLD_DARK);
        this.doc.setLineWidth(0.5);
        this.doc.line(ax1, ay, ax2, ay);
      }
    }

    this.y = y0 + cardH + 5;
  }

  public addHorizontalBarsDiagram(
    title: string,
    items: Array<{ label: string; valueLabel: string; pct: number; color: Rgb }>
  ) {
    const rowH = 11.5;
    const cardH = 13 + items.length * rowH + 3;
    this.ensureSpace(cardH + 5);

    const y0 = this.y;
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(...C_BORDER);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, y0, this.maxWidth, cardH, 2.5, 2.5, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.2);
    this.doc.setTextColor(...C_SLATE_900);
    this.doc.text(cleanPdf(title), this.margin + 5, y0 + 7);

    const trackX = this.margin + 66;
    const trackW = 76;
    let ry = y0 + 14;

    for (const item of items) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.1);
      this.doc.setTextColor(...C_SLATE_700);
      this.doc.text(cleanPdf(item.label), this.margin + 5, ry + 3.8);

      // Background track
      this.doc.setFillColor(236, 240, 246);
      this.doc.roundedRect(trackX, ry, trackW, 5.2, 1.2, 1.2, 'F');

      // Filled bar
      const fillW = Math.max(4, Math.min(trackW, (trackW * item.pct) / 100));
      this.doc.setFillColor(...item.color);
      this.doc.roundedRect(trackX, ry, fillW, 5.2, 1.2, 1.2, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(...C_SLATE_900);
      this.doc.text(cleanPdf(item.valueLabel), trackX + trackW + 3, ry + 3.8);

      ry += rowH;
    }

    this.y = y0 + cardH + 5;
  }

  public addTwoColumnCompareCard(opts: {
    leftTitle: string;
    leftItems: string[];
    leftTone?: 'red' | 'slate' | 'gold' | 'blue';
    rightTitle: string;
    rightItems: string[];
    rightTone?: 'emerald' | 'blue' | 'violet';
  }) {
    const colW = (this.maxWidth - 4) / 2;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.3);

    const leftGroups = opts.leftItems.map(
      (txt) => this.doc.splitTextToSize(`- ${cleanPdf(txt)}`, colW - 9) as string[]
    );
    const rightGroups = opts.rightItems.map(
      (txt) => this.doc.splitTextToSize(`+ ${cleanPdf(txt)}`, colW - 9) as string[]
    );

    const leftH = leftGroups.reduce((a, g) => a + g.length * 4.1 + 1.8, 0);
    const rightH = rightGroups.reduce((a, g) => a + g.length * 4.1 + 1.8, 0);
    const boxH = 13 + Math.max(leftH, rightH) + 3;

    this.ensureSpace(boxH + 5);
    const y0 = this.y;

    const lBg: Rgb =
      opts.leftTone === 'gold'
        ? C_GOLD_PALE
        : opts.leftTone === 'blue'
          ? C_BLUE_BG
          : opts.leftTone === 'slate'
            ? [241, 245, 249]
            : [254, 242, 242];
    const lAccent: Rgb =
      opts.leftTone === 'gold'
        ? C_GOLD_DARK
        : opts.leftTone === 'blue'
          ? C_BLUE
          : opts.leftTone === 'slate'
            ? C_SLATE_500
            : [185, 28, 28];

    const rBg: Rgb =
      opts.rightTone === 'blue'
        ? C_BLUE_BG
        : opts.rightTone === 'violet'
          ? C_VIOLET_BG
          : C_EMERALD_BG;
    const rAccent: Rgb =
      opts.rightTone === 'blue'
        ? C_BLUE
        : opts.rightTone === 'violet'
          ? C_VIOLET
          : C_EMERALD;

    // Left panel
    this.doc.setFillColor(...lBg);
    this.doc.setDrawColor(...lAccent);
    this.doc.setLineWidth(0.35);
    this.doc.roundedRect(this.margin, y0, colW, boxH, 2, 2, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.8);
    this.doc.setTextColor(...lAccent);
    this.doc.text(cleanPdf(opts.leftTitle), this.margin + 4, y0 + 6.5);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.3);
    this.doc.setTextColor(...C_SLATE_700);
    let ly = y0 + 12.5;
    for (const grp of leftGroups) {
      this.doc.text(grp, this.margin + 4, ly);
      ly += grp.length * 4.1 + 1.8;
    }

    // Right panel
    const rx = this.margin + colW + 4;
    this.doc.setFillColor(...rBg);
    this.doc.setDrawColor(...rAccent);
    this.doc.roundedRect(rx, y0, colW, boxH, 2, 2, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.8);
    this.doc.setTextColor(...rAccent);
    this.doc.text(cleanPdf(opts.rightTitle), rx + 4, y0 + 6.5);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.3);
    this.doc.setTextColor(...C_SLATE_700);
    let ry = y0 + 12.5;
    for (const grp of rightGroups) {
      this.doc.text(grp, rx + 4, ry);
      ry += grp.length * 4.1 + 1.8;
    }

    this.y = y0 + boxH + 5;
  }

  public addBubbleSheet50() {
    const boxH = 122;
    this.ensureSpace(boxH + 4);
    const y0 = this.y;

    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(...C_OBSIDIAN);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(this.margin, y0, this.maxWidth, boxH, 2.5, 2.5, 'FD');

    // Header strip inside bubble sheet
    this.doc.setFillColor(...C_OBSIDIAN);
    this.doc.rect(this.margin, y0, this.maxWidth, 9, 'F');
    this.doc.setTextColor(...C_GOLD);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.text('HOJA OPTICA IMPRIMIBLE EXANI-II (RELLENA COMPLETAMENTE EL CIRCULO)', this.margin + 4, y0 + 6);

    const colW = (this.maxWidth - 8) / 5;
    const letters = ['A', 'B', 'C', 'D'];

    for (let col = 0; col < 5; col++) {
      const cx = this.margin + 4 + col * colW;
      // Column separator
      if (col > 0) {
        this.doc.setDrawColor(...C_BORDER);
        this.doc.setLineWidth(0.2);
        this.doc.line(cx - 1.5, y0 + 11, cx - 1.5, y0 + boxH - 4);
      }

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...C_SLATE_500);
      this.doc.text(`${col * 10 + 1}-${(col + 1) * 10}`, cx + 1, y0 + 15);

      for (let row = 0; row < 10; row++) {
        const qNum = col * 10 + row + 1;
        const ry = y0 + 23 + row * 9.5;

        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(8);
        this.doc.setTextColor(...C_SLATE_900);
        this.doc.text(String(qNum).padStart(2, '0'), cx + 1, ry + 1);

        for (let opt = 0; opt < 4; opt++) {
          const bx = cx + 9.5 + opt * 6.2;
          this.doc.setDrawColor(...C_SLATE_700);
          this.doc.setLineWidth(0.35);
          this.doc.circle(bx, ry - 0.1, 2.2, 'S');
          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(6.5);
          this.doc.setTextColor(...C_SLATE_500);
          this.doc.text(letters[opt], bx - 1.05, ry + 0.85);
        }
      }
    }

    this.y = y0 + boxH + 5;
  }

  public addPocketCardCutout(title: string, badge: string, steps: string[]) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.7);
    const wrapped = steps.map((s) => this.doc.splitTextToSize(cleanPdf(s), this.maxWidth - 16) as string[]);
    const linesH = wrapped.reduce((acc, g) => acc + g.length * 4.4 + 2, 0);
    const boxH = 22 + linesH + 5;

    this.ensureSpace(boxH + 4);
    const y0 = this.y;

    this.doc.setFillColor(...C_GOLD_PALE);
    this.doc.setDrawColor(...C_OBSIDIAN);
    this.doc.setLineWidth(0.6);
    this.doc.rect(this.margin, y0, this.maxWidth, boxH, 'FD');

    this.doc.setFillColor(...C_OBSIDIAN);
    this.doc.rect(this.margin, y0, this.maxWidth, 12, 'F');

    this.doc.setTextColor(...C_GOLD);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.text(cleanPdf(badge).toUpperCase(), this.margin + 4, y0 + 4.5);

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10.5);
    this.doc.text(cleanPdf(title), this.margin + 4, y0 + 9.8);

    let cy = y0 + 18;
    for (const grp of wrapped) {
      this.doc.setTextColor(...C_SLATE_900);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.7);
      this.doc.text(grp, this.margin + 6, cy);
      cy += grp.length * 4.4 + 2;
    }

    this.y = y0 + boxH + 5;
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
// 1. MUESTRA GRATUITA AMPLIADA (5 Paginas Visuales con Ejemplos Completos)
// =========================================================================
export const buildSampleKitPdf = (): jsPDF => {
  const pdf = new LuxuryEditorialPdf('MUESTRA GRATUITA EXANI-II UAA 2026');
  pdf.addLuxuryCover({
    badge: 'Muestra Gratuita Ampliada · Edicion 2026',
    title: 'Metodo de Alto Rendimiento EXANI-II UAA',
    subtitle: 'Comprueba la profundidad visual, ejemplos guiados paso a paso, anatomia de distractores y plantillas listas para imprimir.',
    edition: 'Mapa de esta Muestra Gratuita (5 Paginas)',
    accentColor: C_GOLD,
    tocItems: [
      { code: '01', title: 'Ecosistema de 3 Packs y Flujo de Puntaje +120 pts', detail: 'Como se combinan neuroaprendizaje, 50 reactivos y regulacion NSDR' },
      { code: '02', title: 'Desarme Filosofico con Ejemplo Completo Paso a Paso', detail: 'Analisis real de un parrafo EXANI-II y descarte de trampas A/B/C/D' },
      { code: '03', title: '3 Reactivos Resueltos (Lectura, Matematica y Analitico)', detail: 'Explicacion detallada de acierto y error comun en cada opcion' },
      { code: '04', title: 'Plantilla Imprimible Feynman + Plan de 7 Dias', detail: 'Herramienta inmediata para empezar tu preparacion hoy mismo' },
    ],
    footerNote: 'Descarga libre para evaluar nuestra metodologia antes de adquirir cualquier pack mediante pago directo con Stripe.',
  });

  // PAGE 2
  pdf.addPageBreak();
  pdf.addChapterBanner('Ecosistema Completo', 'Que Recibes al Instante en Cada Pack con Stripe', C_GOLD);
  pdf.addTable(
    ['Pack Disponible', 'Inversion', 'Entregables Reales y Extensos al Pagar'],
    [
      ['1. Kit de Neuro-Aprendizaje', '$99 MXN', 'Manual visual 14 pags + 4 plantillas imprimibles + Audio Binaural 40 Hz (.wav 180s)'],
      ['2. Banco 50 Reactivos EXANI-II', '$149 MXN', 'Cuadernillo 25 pags (examen limpio + burbujas + formulario + 50 soluciones) + Simulador'],
      ['3. Protocolo Anti-Ansiedad NSDR', '$79 MXN', 'Audio Alpha->Theta (.wav 240s) + Manual clinico 10 pags + Rescate 4 escenarios + Checklist'],
    ],
    [52, 26, 98]
  );

  pdf.addStepFlowDiagram('FLUJO INTEGRADOR: COMO SUBIR +120 PUNTOS CENEVAL EN 30 DIAS', [
    { code: 'P1', label: 'Enfoque 90/20', detail: 'Audio 40 Hz + ciclos ultradianos sin fatiga', accent: C_BLUE },
    { code: 'P2', label: 'Retencion Activa', detail: 'Feynman + repaso espaciado 1-3-7-14-30', accent: C_EMERALD },
    { code: 'P3', label: 'Simulacro Real', detail: 'Banco 50 reactivos + auditoria de trampas', accent: C_GOLD_DARK },
    { code: 'P4', label: 'Mente en Calma', detail: 'NSDR nocturno + respiracion 4x4 en aula', accent: C_VIOLET },
  ]);

  pdf.addHorizontalBarsDiagram('IMPACTO COMPROBADO EN RETENCION A 14 DIAS (ESTUDIO UAA)', [
    { label: 'Solo releer o subrayar', valueLabel: '18% retencion', pct: 18, color: [185, 28, 28] },
    { label: 'Resumen pasivo escrito', valueLabel: '29% retencion', pct: 29, color: C_SLATE_500 },
    { label: 'Metodo Feynman hablado', valueLabel: '74% retencion', pct: 74, color: C_BLUE },
    { label: 'Feynman + Repaso + Simulacro', valueLabel: '91% retencion', pct: 91, color: C_EMERALD },
  ]);

  // PAGE 3
  pdf.addPageBreak();
  pdf.addChapterBanner('Metodologia Nuclear', 'Desarme Filosofico con Ejemplo Completo Resuelto', C_BLUE);
  pdf.addParagraph(
    'El 68% de los errores en Comprension Lectora ocurre por responder por intuicion antes de mapear el argumento. Observa como funciona aplicado a un reactivo real:'
  );
  pdf.addCalloutBox(
    'Texto Modelo EXANI-II (Analizado Paso a Paso)',
    '"Aunque la digitalizacion de los museos democratizo el acceso visual a colecciones historicas, muchos visitantes reportan menor conexion emocional frente a una pantalla que ante la obra fisica. No se trata de rechazar el archivo digital, sino de reconocer que la presencia material aporta un contexto sensorial irreemplazable."',
    'blue'
  );
  pdf.addStepFlowDiagram('APLICACION DE LOS 4 PASOS EN 45 SEGUNDOS', [
    { code: '01', label: 'Tesis Central', detail: 'Digitalizar ayuda, pero no sustituye la experiencia fisica.', accent: C_GOLD_DARK },
    { code: '02', label: 'Giro ("Aunque")', detail: 'Reconoce beneficio digital, luego introduce limite.', accent: C_BLUE },
    { code: '03', label: 'Matiz ("No se trata")', detail: 'El autor NO pide cerrar ni prohibir lo digital.', accent: C_VIOLET },
    { code: '04', label: 'Descarte Extremos', detail: 'Elimina opciones con "destruye", "inutil" o "total".', accent: C_EMERALD },
  ]);

  pdf.addTwoColumnCompareCard({
    leftTitle: 'Por que fallan las Opciones Trampa',
    leftTone: 'red',
    leftItems: [
      'A) "La tecnologia arruino el arte": Falso extremo; el autor dice "no se trata de rechazar".',
      'C) "Nadie disfruta museos virtuales": Absolutismo ("nadie") no respaldado por "muchos".',
      'D) "Deben prohibirse las pantallas": Conclusion radical ajena al parrafo.',
    ],
    rightTitle: 'Por que la Opcion B es Correcta',
    rightTone: 'emerald',
    rightItems: [
      'B) "El acceso digital amplia la cobertura, pero la experiencia presencial conserva valor unico".',
      'Conserva ambos polos del argumento: ventaja digital + insustituibilidad fisica.',
      'Respeta el tono equilibrado y matizado propio del estilo CENEVAL.',
    ],
  });

  // PAGE 4
  pdf.addPageBreak();
  pdf.addChapterBanner('Muestra Practica', '3 Reactivos Reales Resueltos con Logica Completa', C_GOLD);
  pdf.addSolvedQuestionCard(EXANI_50_BANK[0]);
  pdf.addSolvedQuestionCard(EXANI_50_BANK[13]);
  pdf.addSolvedQuestionCard(EXANI_50_BANK[26]);
  pdf.addCalloutBox(
    'Nota Pedagogica: Que distingue al Pack 2 Completo',
    'En el Banco de 50 Reactivos recibes primero los 50 reactivos limpios (sin respuestas visibles) + hoja optica de burbujas A/B/C/D + clave rapida + el solucionario detallado de las 50 preguntas dividido por area.',
    'gold'
  );

  // PAGE 5
  pdf.addPageBreak();
  pdf.addChapterBanner('Herramienta Inmediata', 'Ficha Imprimible Feynman + Ruta de Arranque 7 Dias', C_EMERALD);
  pdf.addWorksheetBox(
    'Plantilla Feynman Express: Explica un tema que hoy te cueste trabajo',
    'Concepto elegido: _________________________  |  Fecha: ___/___/2026  |  Meta: Dominio sin apuntes',
    52,
    4
  );
  pdf.addTable(
    ['Dia', 'Actividad Sugerida (30 a 60 min)', 'Objetivo Medible'],
    [
      ['Dia 1', 'Realiza el diagnostico inicial y detecta tus 2 areas mas bajas', 'Mapa claro de prioridades'],
      ['Dia 2', 'Aplica 1 ciclo Ultradiano (45 min) en tu tema mas debil + Ficha Feynman', 'Cerrar laguna critica #1'],
      ['Dia 3-4', 'Resuelve bloque cronometrado de 25 reactivos (75 seg por pregunta)', 'Medir velocidad real'],
      ['Dia 5-6', 'Audita cada error en bitacora + Repaso espaciado Dia 1 y Dia 3', 'Eliminar distractores repetidos'],
      ['Dia 7', 'Simulacro completo + 10 min Protocolo NSDR antes y despues', 'Estabilidad cognitiva UAA'],
    ],
    [24, 96, 56]
  );

  pdf.finalizeHeadersAndFooters();
  return pdf.doc;
};

// =========================================================================
// 2. PACK 1: KIT DE NEURO-APRENDIZAJE ($99 MXN) -> 14 Paginas Detalladas
// =========================================================================
export const buildNeuroKitPdf = (): jsPDF => {
  const pdf = new LuxuryEditorialPdf('PACK 01 - KIT DE NEURO-APRENDIZAJE 2026');
  pdf.addLuxuryCover({
    badge: 'Pack 01 · Manual 14 Pags + 4 Plantillas + Audio 40 Hz',
    title: 'Kit de Neuro-Aprendizaje EXANI-II 2026',
    subtitle: 'Sistema completo de Ciclos Ultradianos 90/20, Curva del Olvido, Metodo Feynman con ejemplos resueltos, Desarme Filosófico, Rutas 30/15/7 dias y Protocolo 40 Hz.',
    edition: 'Mapa Completo del Manual (14 Paginas)',
    accentColor: [96, 165, 250],
    tocItems: [
      { code: '01', title: 'Ciclos Ultradianos 90/20 + Ejemplo de Sesion Matematica', detail: 'Diagrama temporal 110m, neuroquimica del foco y bloqueo paso a paso' },
      { code: '02', title: 'Curva del Olvido 1-3-7-14-30 y Metodo Feynman Resuelto', detail: 'Grafica de retencion + ejemplo completo de Regla de Tres Inversa' },
      { code: '03', title: 'Desarme Filosofico, Matriz Eisenhower y Rutas 30/15/7 Dias', detail: 'Ejemplo real de lectura anotada y cronogramas listos segun tu tiempo' },
      { code: '04', title: '4 Plantillas Imprimibles + Guia Neuroacustica 40 Hz y Sueno', detail: 'Feynman, Tracker 14-30 dias, Planificador Semanal y Bitacora de Errores' },
    ],
    footerNote: 'Combina este manual de 14 paginas con el archivo Audio-Binaural-40Hz-Enfoque-MiguelLopez.wav usando audifonos estereo a volumen moderado (30-45%).',
  });

  // PAGE 2: MODULO 01 - ULTRADIAN CYCLES + WORKED SESSION EXAMPLE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 01', 'Arquitectura de Ciclos Ultradianos (90 / 20) y Quimica del Foco', [96, 165, 250]);
  pdf.addParagraph(
    'Tu corteza prefrontal funciona en ciclos biologicos cercanos a 90 minutos. Forzar sesiones continuas de 3 o 4 horas mirando el telefono cada 8 minutos destruye la acetilcolina (el neurotransmisor que marca que debe recordar el cerebro) y multiplica los errores por descuido.'
  );

  pdf.ensureSpace(54);
  const diagY = pdf.y + 3;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(pdf.margin, diagY, pdf.maxWidth, 44, 2.5, 2.5, 'FD');

  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(9.4);
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
    pdf.doc.setFontSize(7.5);
    pdf.doc.text(seg.label, curX + 1, barY + 17.5);
    curX += seg.w;
  }

  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(8.1);
  pdf.doc.setTextColor(...C_SLATE_500);
  pdf.doc.text('Regla de oro: En los ultimos 20 min evita redes sociales (sobrecarga de dopamina); camina, hidrata y mira a lo lejos.', barX, barY + 25);
  pdf.y = diagY + 50;

  pdf.addSubheading('Ejemplo Real Cronometrado: Sesion de Pensamiento Matematico (Porcentajes y Ecuaciones)');
  pdf.addTable(
    ['Tramo', 'Accion Exacta del Aspirante UAA', 'Por que Funciona Neurobiologicamente'],
    [
      ['Min 00-05', 'Descarga cognitiva en papel + celular en modo avion + Play Audio 40 Hz.', 'Libera memoria de trabajo de pendientes externos.'],
      ['Min 05-45', 'Resuelve 15 reactivos de porcentajes SIN ver respuestas ni apuntes.', 'La friccion activa noradrenalina y plasticidad sinaptica.'],
      ['Min 45-75', 'Califica, detecta 4 errores, lee explicacion y anota la trampa en Bitacora.', 'Corregir el error inmediatamente despues fija el circuito correcto.'],
      ['Min 75-90', 'Cierra el cuaderno y explica en voz alta las 3 formulas usadas hoy.', 'Consolida recuperacion activa sin ilusion de competencia.'],
      ['Min 90-110', 'Levanta, camina 10 min, toma agua, respira hondo (cero TikTok/Reels).', 'Permite al hipocampo transferir lo aprendido mientras descansas.'],
    ],
    [24, 82, 70]
  );

  // PAGE 3: MODULO 02 - FORGETTING CURVE + WORKED SPACED REPETITION EXAMPLE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 02', 'Curva del Olvido vs. Repaso Espaciado (1 - 3 - 7 - 14 - 30)', C_EMERALD);
  pdf.addParagraph(
    'Sin repaso estructurado, el cerebro descarta hasta el 70% de un tema estudiado en 48 horas. En cambio, cada micro-sesion de recuperacion activa (autoevaluacion sin ver apuntes) aplana la curva y eleva la retencion por encima del 85% rumbo al examen UAA.'
  );

  pdf.ensureSpace(66);
  const chY = pdf.y + 2;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(pdf.margin, chY, pdf.maxWidth, 58, 2.5, 2.5, 'FD');

  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(9.1);
  pdf.doc.setTextColor(...C_SLATE_900);
  pdf.doc.text('RETENCION DE MEMORIA A 14 DIAS: ESTUDIO PASIVO VS. REPASO ESPACIADO', pdf.margin + 5, chY + 7);

  const axX = pdf.margin + 18;
  const axY = chY + 13;
  const axW = 148;
  const axH = 33;

  pdf.doc.setDrawColor(...C_SLATE_500);
  pdf.doc.setLineWidth(0.4);
  pdf.doc.line(axX, axY, axX, axY + axH);
  pdf.doc.line(axX, axY + axH, axX + axW, axY + axH);

  pdf.doc.setFontSize(7.5);
  pdf.doc.setTextColor(...C_SLATE_500);
  pdf.doc.text('100%', axX - 11, axY + 3);
  pdf.doc.text('50%', axX - 9, axY + axH / 2 + 1);
  pdf.doc.text('Dia 0', axX - 2, axY + axH + 5);
  pdf.doc.text('Dia 1', axX + 26, axY + axH + 5);
  pdf.doc.text('Dia 3', axX + 56, axY + axH + 5);
  pdf.doc.text('Dia 7', axX + 94, axY + axH + 5);
  pdf.doc.text('Dia 14', axX + 136, axY + axH + 5);

  pdf.doc.setDrawColor(220, 38, 38);
  pdf.doc.setLineWidth(0.75);
  pdf.doc.line(axX, axY + 2, axX + 28, axY + 18);
  pdf.doc.line(axX + 28, axY + 18, axX + 60, axY + 27);
  pdf.doc.line(axX + 60, axY + 27, axX + axW, axY + 31);

  pdf.doc.setDrawColor(...C_EMERALD);
  pdf.doc.setLineWidth(0.95);
  const pts: Array<[number, number]> = [
    [axX, axY + 2],
    [axX + 28, axY + 12.5],
    [axX + 29, axY + 3],
    [axX + 58, axY + 10.5],
    [axX + 59, axY + 3],
    [axX + 96, axY + 8.5],
    [axX + 97, axY + 2.5],
    [axX + axW, axY + 5.5],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    pdf.doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  }
  pdf.doc.setFillColor(...C_GOLD);
  for (const idx of [2, 4, 6]) {
    pdf.doc.circle(pts[idx][0], pts[idx][1], 1.5, 'F');
  }

  pdf.doc.setFontSize(7.8);
  pdf.doc.setTextColor(...C_EMERALD);
  pdf.doc.text('Linea Verde: Repaso activo (Dias 1, 3, 7, 14) -> >85% retencion', axX + 2, chY + 55);
  pdf.doc.setTextColor(185, 28, 28);
  pdf.doc.text('Linea Roja: Releer sin autoevaluarse -> <25%', axX + 92, chY + 55);
  pdf.y = chY + 63;

  pdf.addSubheading('Ejemplo Practico: Como Aplicar el Ciclo 1-3-7-14 al Tema "Ecuaciones Cuadraticas"');
  pdf.addTable(
    ['Intervalo', 'Tiempo', 'Que Haces Concretamente (Sin Hacer Trampa)'],
    [
      ['Dia 0 (Base)', '60 min', 'Entiendes factorizacion + formula general y resuelves 8 reactivos cronometrados.'],
      ['Dia 1 (+24h)', '8 min', 'En hoja en blanco escribes x = (-b +- raiz(b^2 - 4ac)) / 2a de memoria y haces 2 ejercicios.'],
      ['Dia 3 (+72h)', '10 min', 'Resuelves solo el reactivo que fallaste el Dia 0 y explicas en voz alta por que cambio de signo.'],
      ['Dia 7 y Dia 14', '12 min', 'Mezclas 3 reactivos de ecuaciones con 3 de porcentajes bajo limite de 75 seg cada uno.'],
      ['Dia 30 (Pre-UAA)', '10 min', 'Escaneo final de tu Bitacora: verificas si el tema paso de Semaforo Rojo a Verde.'],
    ],
    [30, 20, 126]
  );

  // PAGE 4: MODULO 03 - FEYNMAN METHOD DEEP DIVE + FULL WORKED EXAMPLE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 03', 'Metodo Feynman Profundo (Con Ejemplo Completo Resuelto)', C_GOLD);
  pdf.addParagraph(
    'El fisico Richard Feynman demostro que la comprension real se mide por tu capacidad de explicar una idea compleja en lenguaje cotidiano y sin leer definiciones. Si necesitas usar palabras rebuscadas para esconder una duda, todavia no dominas el concepto.'
  );
  pdf.addStepFlowDiagram('LOS 4 PASOS DEL METODO FEYNMAN EN ACCION', [
    { code: 'P1', label: 'Elige el Concepto', detail: 'Anota un tema puntual de tu semaforo rojo EXANI.', accent: C_GOLD_DARK },
    { code: 'P2', label: 'Explica Simple', detail: 'Redactalo como para un nino de 12 anos sin jerga.', accent: C_BLUE },
    { code: 'P3', label: 'Detecta Lagunas', detail: 'Subraya donde dudaste y vuelve justo a esa parte.', accent: [185, 28, 28] },
    { code: 'P4', label: 'Analogia + Prueba', detail: 'Crea imagen mental y valida con 3 reactivos.', accent: C_EMERALD },
  ]);

  pdf.addCalloutBox(
    'Ejemplo Completo Aplicado: "Regla de Tres Directa vs. Regla de Tres Inversa"',
    '1) Tema: Distinguir proporcionalidad directa de inversa.\n2) Explicacion sencilla: En la directa, si compro el doble de boletos pago el doble de dinero (ambas suben juntas -> multiplico cruzado). En la inversa, si contrato al doble de albaniles para la misma barda, se tardan la mitad del tiempo (una sube y otra baja -> multiplico horizontal).\n3) Laguna detectada: Me equivoque al plantear problemas de "llaves de agua que llenan un tinaco": creia que mas llaves = mas tiempo, cuando mas llaves = MENOS tiempo (inversa).\n4) Analogia final: "Mas manos repartiendo el mismo trabajo = termino mas rapido (multiplico en linea recta: A x B / C)."',
    'emerald'
  );

  pdf.addTwoColumnCompareCard({
    leftTitle: 'Ficha Feynman Debil (Ilusion de Estudio)',
    leftTone: 'red',
    leftItems: [
      'Copia literal la definicion de Wikipedia: "Una magnitud es inversamente proporcional...".',
      'No identifica en que tipo de problemas se confunde.',
      'No incluye ningun ejercicio de verificacion posterior.',
    ],
    rightTitle: 'Ficha Feynman Nivel UAA (Alta Retencion)',
    rightTone: 'emerald',
    rightItems: [
      'Usa una historia cotidiana (albaniles, llaves, velocidad de coche).',
      'Captura exactamente el paso donde dudaste ("multiplicar en linea").',
      'Se valida resolviendo 3 reactivos nuevos en menos de 4 minutos.',
    ],
  });

  // PAGE 5: MODULO 04 - DESARME FILOSOFICO + WORKED READING EXAMPLE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 04', 'Desarme Filosofico para Comprension Lectora (Ejemplo Guiado)', C_BLUE);
  pdf.addParagraph(
    'En Comprension Lectora EXANI-II casi nunca te preguntan datos memoristicos: te evaluan si puedes rastrear la postura del autor, sus conectores de giro y descartar distractores extremos.'
  );
  pdf.addCalloutBox(
    'Texto Real de Practica (Como Anotarlo en 35 Segundos)',
    '"[Tesis]: La inteligencia artificial agiliza la deteccion temprana en radiografias clinicas; [CONECTOR DE GIRO: SIN EMBARGO], delegar el diagnostico final sin supervision medica multiplica errores en casos atipicos. [Conclusion]: Por lo tanto, el algoritmo funciona mejor como copiloto diagnostico y no como reemplazo del criterio humano."',
    'blue'
  );
  pdf.addTable(
    ['Paso del Desarme', 'Que Detectamos en el Fragmento', 'Como Elimina Distractores'],
    [
      ['1. Tesis Central', 'La IA ayuda en velocidad, pero falla sola en casos atipicos.', 'Descarta opciones que digan "la IA es inutil" o "la IA es perfecta".'],
      ['2. Conector de Giro', '"Sin embargo" introduce la limitacion critica tras el elogio.', 'Lo que va DESPUES del "sin embargo" suele ser la idea que pregunta CENEVAL.'],
      ['3. Supuesto Implicito', 'Los casos clinicos reales tienen excepciones que requieren juicio humano.', 'Te ayuda a responder preguntas de "Se infiere que...".'],
      ['4. Descarte Extremos', 'El autor dice "como copiloto", no "prohibir tecnologia".', 'Elimina cualquier opcion con "siempre", "nunca", "obsoleto" o "prohibicion".'],
    ],
    [34, 68, 74]
  );
  pdf.addCalloutBox(
    'Regla de Oro en Conectores EXANI-II',
    'Cuando leas: "no obstante", "pese a", "aunque", "sin embargo" -> subraya fuerte la oracion siguiente. Cuando leas: "en consecuencia", "por ende", "por lo tanto" -> ahi esta la conclusion oficial del autor.',
    'gold'
  );

  // PAGE 6: MODULO 05 - EISENHOWER MATRIX + TRAFFIC LIGHT + REAL STUDENT CASE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 05', 'Matriz Eisenhower 2x2 y Sistema Semaforo (Con Caso Real UAA)', C_GOLD);
  pdf.addParagraph(
    'El mayor enemigo del aspirante no es la falta de horas, sino gastar energia en estudio comodo (repasar temas donde ya tienes 90%) mientras dejas tus areas en semaforo rojo intactas.'
  );

  pdf.ensureSpace(98);
  const mx = pdf.margin;
  const my = pdf.y + 2;
  const qw = 86;
  const qh = 44;
  const quadrants: Array<{ x: number; y: number; bg: Rgb; accent: Rgb; title: string; body: string }> = [
    {
      x: mx,
      y: my,
      bg: [254, 242, 242],
      accent: [185, 28, 28],
      title: 'C1 · URGENTE + IMPORTANTE (75% TIEMPO)',
      body: '- Subareas de tu diagnostico en Semaforo Rojo (<60%).\n- Simulacros cronometrados con hoja de burbujas.\n- Auditoria obligatoria de bitacora de errores.',
    },
    {
      x: mx + qw + 4,
      y: my,
      bg: C_EMERALD_BG,
      accent: C_EMERALD,
      title: 'C2 · IMPORTANTE + NO URGENTE (20% TIEMPO)',
      body: '- Repaso espaciado Dias 1, 3, 7, 14, 30.\n- Lectura critica con Desarme Filosofico.\n- Sueno 7.5-8h y protocolo NSDR pre-examen.',
    },
    {
      x: mx,
      y: my + qh + 4,
      bg: C_GOLD_PALE,
      accent: C_GOLD_DARK,
      title: 'C3 · URGENTE + NO IMPORTANTE (REDUCIR)',
      body: '- Chats de grupo preguntando "que viene en el examen".\n- Pasar apuntes a limpio con plumones sin resolver reactivos.\n- Responder notificaciones en bloque 90/20.',
    },
    {
      x: mx + qw + 4,
      y: my + qh + 4,
      bg: [241, 245, 249],
      accent: C_SLATE_500,
      title: 'C4 · NI URGENTE NI IMPORTANTE (ELIMINAR)',
      body: '- Scroll infinito en descansos de 20 minutos.\n- Releer resumenes pasivos a medianoche.\n- Material viejo ajeno al temario EXANI-II CENEVAL.',
    },
  ];

  for (const q of quadrants) {
    pdf.doc.setFillColor(...q.bg);
    pdf.doc.setDrawColor(...q.accent);
    pdf.doc.setLineWidth(0.4);
    pdf.doc.roundedRect(q.x, q.y, qw, qh, 2, 2, 'FD');

    pdf.doc.setTextColor(...q.accent);
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.setFontSize(8);
    pdf.doc.text(cleanPdf(q.title), q.x + 4, q.y + 6.5);

    pdf.doc.setTextColor(...C_SLATE_700);
    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setFontSize(8.1);
    const qLines = pdf.doc.splitTextToSize(cleanPdf(q.body), qw - 8) as string[];
    pdf.doc.text(qLines, q.x + 4, q.y + 13);
  }
  pdf.y = my + qh * 2 + 10;

  pdf.addSubheading('Ejemplo Real: Distribucion Semanal de Aspirante a Medicina UAA (14 Horas/Semana)');
  pdf.addTable(
    ['Color Semaforo en Diagnostico', 'Area Ejemplo', 'Tiempo Asignado', 'Accion Semanal'],
    [
      ['ROJO (<60% aciertos)', 'Pensamiento Matematico (5/13)', '9.5 horas (68%)', '6 bloques 90/20 de practica cronometrada + Feynman'],
      ['AMARILLO (60-79% aciertos)', 'Pensamiento Analitico (9/12)', '3.0 horas (22%)', '2 bloques de sucesiones y silogismos + bitacora'],
      ['VERDE (>=80% aciertos)', 'Comprension Lectora (11/13)', '1.5 horas (10%)', 'Solo mantenimiento con repaso espaciado y 1 simulacro'],
    ],
    [42, 44, 30, 60]
  );

  // PAGE 7: MODULO 06 - STUDY RETENTION BARS + BITACORA ARCHITECTURE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 06', 'Arquitectura Anti-Distracciones y Bitacora Inteligente de Errores', C_EMERALD);
  pdf.addParagraph(
    'Un estudiante promedio resuelve 100 ejercicios, ve su calificacion (65%), cierra el cuaderno y pasa al siguiente tema. Un estudiante estrategico convierte cada error en una regla anti-trampa que nunca vuelve a repetir.'
  );
  pdf.addHorizontalBarsDiagram('EFICACIA COMPARADA DE METODOS DE PREPARACION (RETENCION + VELOCIDAD)', [
    { label: 'Releer guia subrayada', valueLabel: '18% eficacia', pct: 18, color: [185, 28, 28] },
    { label: 'Ver videos sin pausar', valueLabel: '24% eficacia', pct: 24, color: [217, 119, 6] },
    { label: 'Flashcards de memoria', valueLabel: '69% eficacia', pct: 69, color: C_BLUE },
    { label: 'Metodo Feynman hablado', valueLabel: '78% eficacia', pct: 78, color: C_VIOLET },
    { label: 'Simulacro + Bitacora Errores', valueLabel: '92% eficacia', pct: 92, color: C_EMERALD },
  ]);

  pdf.addSubheading('Ejemplo de Como Llenar tu Bitacora de Errores (Modelo Real)');
  pdf.addTable(
    ['Reactivo / Tema', 'Que Respondi vs Correcta', 'Por que Cai en la Trampa', 'Regla de Oro Anti-Error'],
    [
      ['#15 Interes / Descuento', 'Respondi 10% neto -> Correcta 10% menos (90)', 'Sume +10% y reste -10% sobre base distinta.', 'Siempre calcula el segundo % sobre el nuevo monto.'],
      ['#29 Silogismos Logicos', 'Conclui "Algunos B son C" -> Era invalido', 'Asumi equivalencia que no decian premisas.', 'Dibuja circulos de Venn antes de descartar.'],
      ['#42 Acento Diacritico', 'Puse "te" con tilde en pronombre', 'Confundi "te" bebida con "te" pronombre.', 'Tilde en "te" SOLO cuando puedas cambiarlo por "cafe".'],
    ],
    [34, 46, 48, 48]
  );

  pdf.addCalloutBox(
    'Protocolo Anti-Celular de 3 Barreras',
    '1) Deja el telefono en otra habitacion o en mochila cerrada durante los 90 min. 2) Cierra todas las pestanas de redes sociales en tu computadora. 3) Usa una alarma de cocina o cronometro dedicado para no mirar la pantalla del celular.',
    'gold'
  );

  // PAGE 8: MODULO 07 - 3 ACTION PLANS (30 DAYS, 15 DAYS, 7 DAYS)
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 07', '3 Rutas Exactas Segun Cuantos Dias Te Faltan para el Examen UAA', C_VIOLET);
  pdf.addParagraph('Elige tu escenario actual y sigue el esquema diario sin improvisar:');
  pdf.addTable(
    ['Escenario', 'Carga Diaria Sugerida', 'Distribucion Semanal Optima'],
    [
      ['Ruta 30 Dias (Ideal)', '2 ciclos 90/20 diarios (3h)', 'Sem 1-2: Cerrar temas Rojos con Feynman. Sem 3: Banco 50 reactivos + Bitacora. Sem 4: 2 simulacros completos + NSDR.'],
      ['Ruta 15 Dias (Intensiva)', '2-3 ciclos 90/20 diarios (4h)', 'Dias 1-5: Matematicas + Analitico intensivos. Dias 6-10: Lectura + Lengua + 50 reactivos. Dias 11-15: Auditoria de errores + sueno 8h.'],
      ['Ruta 7 Dias (Rescate)', '2 ciclos focalizados (3h max)', 'CERO temas gigantes nuevos de baja probabilidad. 80% en tus errores frecuentes de porcentaje, regla de tres, conectores y acentuacion + NSDR diario.'],
    ],
    [36, 42, 98]
  );

  pdf.addTwoColumnCompareCard({
    leftTitle: 'Lo que Destruye tu Ultima Semana',
    leftTone: 'red',
    leftItems: [
      'Desvelarte estudiando de 11 PM a 3 AM (destruye memoria consolidada).',
      'Hacer 3 simulacros el mismo dia sin revisar ninguno.',
      'Tomar bebidas energeticas en exceso antes de dormir.',
    ],
    rightTitle: 'Lo que Asegura tu Mejor Puntaje',
    rightTone: 'emerald',
    rightItems: [
      'Repasar tu Bitacora de Errores 25 minutos al dia.',
      'Mantener horario fijo de sueno 7.5 a 8 horas toda la semana.',
      'Escuchar el audio NSDR la noche previa y respirar 4x4 en aula.',
    ],
  });

  // PAGE 9: PRINTABLE 01 - FEYNMAN WORKSHEET
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 01', 'Hoja de Trabajo: Metodo Feynman en 4 Pasos', C_GOLD);
  pdf.addParagraph('Imprime esta hoja (o duplica su estructura en tu libreta) cada vez que detectes un tema en Semaforo Rojo.');
  pdf.addWorksheetBox('1. Concepto EXANI-II a dominar', 'Ejemplo: Regla de tres inversa / Silogismos / Ecuaciones cuadraticas / Acento diacritico', 24, 1);
  pdf.addWorksheetBox('2. Explicacion sencilla (como para un alumno de 12 anos, CERO apuntes)', 'Escribe con palabras cotidianas e incluye un ejemplo numerico o de la vida diaria:', 52, 5);
  pdf.addWorksheetBox('3. Donde me trabe o dude al explicarlo? (Laguna real detectada)', 'Anota exactamente el paso, signo o regla que olvidaste y su correccion:', 40, 3);
  pdf.addWorksheetBox('4. Analogia final + Verificacion en 3 reactivos nuevos', 'Mi analogia visual + Resultado tras repasar fuente (___ / 3 aciertos en ___ min):', 36, 3);

  // PAGE 10: PRINTABLE 02 - BRAIN DUMP + SPACED TRACKER (D1, D3, D7, D14, D30)
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 02', 'Descarga Cognitiva y Tracker de Repaso (D1 - D30)', C_EMERALD);
  pdf.addWorksheetBox(
    'Descarga Cognitiva Pre-Estudio (3-5 minutos antes de iniciar tu bloque 90/20)',
    'Vacia aqui pendientes, mensajes por responder o ideas sueltas para dejar la mente libre:',
    38,
    3
  );
  pdf.addSubheading('Bitacora Oficial de Repaso Espaciado EXANI-II');
  pdf.addTable(
    ['Tema o Subarea Fallada', 'Area', 'D1', 'D3', 'D7', 'D14', 'D30'],
    [
      ['Ejemplo: Porcentajes sucesivos', 'Matem.', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
    ],
    [76, 40, 12, 12, 12, 12, 12],
    2
  );

  // PAGE 11: PRINTABLE 03 - WEEKLY ULTRADIAN PLANNER
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 03', 'Planificador Semanal Ultradiano (UAA 2026)', C_BLUE);
  pdf.addParagraph('Asigna tus bloques en tus horas pico de energia. Marca la casilla solo al completar los 90 min sin celular + 20 min de descanso real.');
  pdf.addTable(
    ['Dia', 'Bloque 1 (Prioridad Semaforo Rojo)', 'Bloque 2 (Practica / Repaso Espaciado)', 'Hecho'],
    [
      ['Lunes', '', '', ''],
      ['Martes', '', '', ''],
      ['Miercoles', '', '', ''],
      ['Jueves', '', '', ''],
      ['Viernes', '', '', ''],
      ['Sabado', 'Simulacro cronometrado (50 reactivos)', 'Auditoria completa en Bitacora de Errores', ''],
      ['Domingo', 'Descanso cognitivo + Audio NSDR 10 min', 'Lectura ligera de reglas y formulas', ''],
    ],
    [24, 68, 68, 16],
    true
  );
  pdf.addWorksheetBox(
    'Meta Cuantitativa de Esta Semana (Ej: Subir Matematicas de 6/13 a 10/13)',
    'Compromiso semanal firmado + Premio saludable al cumplir 5 de 7 dias:',
    34,
    2
  );

  // PAGE 12: PRINTABLE 04 - MASTER ERROR AUDIT LOG
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 04', 'Bitacora Maestra de Errores y Trampas EXANI-II', C_GOLD);
  pdf.addParagraph('Esta hoja vale oro: repasa solo esta pagina 15 minutos antes de cada nuevo simulacro para no volver a caer en los mismos distractores.');
  pdf.addTable(
    ['# / Tema', 'Area', 'Por que Elegi el Distractor?', 'Regla de Oro para No Volver a Fallar', 'Ok'],
    [
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
    ],
    [28, 24, 52, 58, 14],
    true
  );

  // PAGE 13: MODULO 08 - 40 HZ AUDIO + SLEEP CONSOLIDATION
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 08', 'Protocolo Neuroacustico 40 Hz (.wav) e Higiene del Sueno', C_VIOLET);
  pdf.addParagraph(
    'Junto con este manual descargaste el archivo Audio-Binaural-40Hz-Enfoque-MiguelLopez.wav (180 segundos en bucle o reproduccion continua desde la plataforma).'
  );
  pdf.addBullet('Principio fisico: El oido izquierdo recibe 200 Hz y el derecho 240 Hz; tu tallo cerebral procesa la diferencia (40 Hz Gamma), estado vinculado con atencion sostenida y union de informacion en memoria de trabajo.');
  pdf.addBullet('Audifonos estereo obligatorios (L/R bien colocados) a volumen bajo-moderado (30% a 45%). No debe distraerte.');
  pdf.addBullet('Cuando usarlo: Los primeros 25 a 45 minutos del bloque Ultradiano mientras lees textos densos o resuelves matematicas.');
  pdf.addBullet('Cuando NO usarlo: Nunca en los 90 minutos previos a dormir (activa alerta) ni al conducir/operar maquinaria.');

  pdf.addTwoColumnCompareCard({
    leftTitle: 'Dia: Audio 40 Hz (Modo Enfoque Gamma)',
    leftTone: 'blue',
    leftItems: [
      'Aumenta claridad durante lectura critica y calculo.',
      'Ideal entre 8:00 AM y 7:00 PM en ciclos 90/20.',
      'Acompanar siempre de objetivo unico escrito.',
    ],
    rightTitle: 'Noche: Sueno 7.5-8h (Consolidacion REM)',
    rightTone: 'violet',
    rightItems: [
      'El hipocampo fija lo estudiado mientras duermes profundo.',
      'Estudiar 1h menos para dormir 7.5h RINDE MAS que desvelarse.',
      'Cierra pantallas 45 min antes de dormir o usa Audio NSDR.',
    ],
  });

  // PAGE 14: CLOSING ACTION CHECKLIST
  pdf.addPageBreak();
  pdf.addChapterBanner('Cierre Accionable', 'Checklist de Arranque Inmediato (Primeros 7 Dias)', C_EMERALD);
  pdf.addParagraph('Marca cada paso conforme lo completes durante tu primera semana aplicando el Kit de Neuro-Aprendizaje:');
  pdf.addBullet('Imprimir (o preparar en libreta) las Plantillas 01, 02, 03 y 04 de este manual.', true);
  pdf.addBullet('Configurar espacio de estudio libre de celular y preparar audifonos estereo para el audio 40 Hz.', true);
  pdf.addBullet('Completar mi primer Ciclo Ultradiano real de 90 min + 20 min de descanso sin pantallas.', true);
  pdf.addBullet('Redactar al menos 3 Fichas Feynman de mis temas mas dificiles sin copiar definiciones.', true);
  pdf.addBullet('Registrar al menos 5 errores reales en la Bitacora Maestra con su Regla de Oro anti-trampa.', true);
  pdf.addBullet('Ejecutar mis primeros repasos espaciados de Dia 1 y Dia 3 sin ver apuntes.', true);
  pdf.addBullet('Dormir minimo 7.5 horas al menos 5 de los 7 dias de esta semana.', true);

  pdf.addCalloutBox(
    'Mensaje Final de Miguel Lopez',
    'La diferencia entre un aspirante agotado y un admitido en la UAA no esta en estudiar 10 horas diarias sin rumbo, sino en proteger tu atencion, corregir con precision tus errores y repetir con inteligencia. Ahora pasa a la accion hoy mismo.',
    'gold'
  );

  pdf.finalizeHeadersAndFooters();
  return pdf.doc;
};

// =========================================================================
// 3. PACK 2: BANCO DE 50 REACTIVOS EXANI-II ($149 MXN) -> ~28 Paginas
// =========================================================================
export const buildReactivos50Pdf = (diagnosticReportText?: string | null): jsPDF => {
  const pdf = new LuxuryEditorialPdf('PACK 02 - BANCO DE 50 REACTIVOS EXANI-II 2026');
  pdf.addLuxuryCover({
    badge: 'Best Seller · Edicion Predictiva Ampliada 2026',
    title: 'Banco de 50 Reactivos EXANI-II UAA',
    subtitle: 'Manual estrategico con grafica de metas UAA, formulario completo de 4 areas, cuadernillo limpio sin respuestas, hoja optica de burbujas 1-50 y solucionario comentado.',
    edition: 'Estructura Completa del Cuadernillo',
    accentColor: C_GOLD,
    tocItems: [
      { code: '01', title: 'Mapa CENEVAL, Grafica de Metas UAA y Formulario Maestro', detail: 'Puntajes por carrera, regla 45-75-15, traps comunes y acordeon de 4 areas' },
      { code: '02', title: 'Parte I: Simulacro Limpio (Reactivos 1 al 50)', detail: 'Cuadernillo formato examen sin respuestas visibles para resolver en 65 min' },
      { code: '03', title: 'Parte II: Hoja Optica de Burbujas (A/B/C/D) y Clave Rapida', detail: 'Hoja imprimible 1-50 + autodiagnostico por area + formula CENEVAL' },
      { code: '04', title: 'Parte III: Solucionario Comentado Completo + Bitacora UAA', detail: 'Explicacion paso a paso de los 50 reactivos y plan segun tu semaforo' },
    ],
    footerNote: 'Recomendacion: Imprime la Hoja Optica de Burbujas (Parte II) y resuelve la Parte I completa en 65 minutos antes de ver las respuestas.',
  });

  // PAGE 2: BLUEPRINT, HORIZONTAL SCORE CHART + OPTIONAL DIAGNOSTIC REPORT
  pdf.addPageBreak();
  pdf.addChapterBanner('Guia Tactica 01', 'Distribucion Oficial y Grafica de Metas UAA (Escala CENEVAL)', C_GOLD);
  pdf.addTable(
    ['Area Troncal EXANI-II', 'Reactivos', 'Tiempo Meta', 'Enfoque Principal Evaluado'],
    [
      ['1. Comprension Lectora', '1 al 13 (13)', '18 min', 'Tesis, inferencias, conectores logicos, tono y proposito'],
      ['2. Pensamiento Matematico', '14 al 26 (13)', '20 min', 'Porcentajes, conjuntos, ecuaciones, geometria y probabilidad'],
      ['3. Pensamiento Analitico', '27 al 38 (12)', '15 min', 'Sucesiones numericas, silogismos, analogias y rotacion espacial'],
      ['4. Estructura de la Lengua', '39 al 50 (12)', '12 min', 'Concordancia, acento diacritico, puntuacion, vicios y cohesion'],
    ],
    [52, 27, 23, 74]
  );

  pdf.addHorizontalBarsDiagram('METAS REFERENCIALES CENEVAL (ESCALA 700 - 1,300 PTS) POR ZONA DE CARRERA', [
    { label: 'Medicina / Alta Demanda', valueLabel: '44-50 aciertos (1,228+)', pct: 95, color: C_EMERALD },
    { label: 'Estomatologia / Salud', valueLabel: '38-43 aciertos (1,156+)', pct: 82, color: C_BLUE },
    { label: 'Derecho / Psicologia / Ing.', valueLabel: '30-37 aciertos (1,060+)', pct: 68, color: C_GOLD_DARK },
    { label: 'Zona de Refuerzo Urgente', valueLabel: '22-29 aciertos (<1,050)', pct: 48, color: [185, 28, 28] },
  ]);

  if (diagnosticReportText && diagnosticReportText.trim()) {
    pdf.addSubheading('Tu Diagnostico Personal Integrado de Esta Sesion');
    const cleanRep = diagnosticReportText
      .replace(/\*\*/g, '')
      .replace(/^#{1,4}\s*/gm, '')
      .trim();
    const lines = cleanRep.split('\n').filter((l) => l.trim() !== '').slice(0, 10);
    pdf.addCalloutBox('Resumen Evaluado en Plataforma', lines.join('\n'), 'emerald');
  } else {
    pdf.addCalloutBox(
      'Formula Rapida de Conversion CENEVAL (Sobre 50 Reactivos)',
      'Puntaje Estimado = 700 + (Tus Aciertos x 12). Ejemplo: si logras 40 aciertos de 50 -> 700 + (40 x 12) = 1,180 puntos estimados. Tu meta de entrenamiento debe superar +4 aciertos por encima del corte historico de tu carrera.',
      'gold'
    );
  }

  // PAGE 3: SPEED STRATEGY (45-75-15), TRAPS + 2 WORKED DISCARD EXAMPLES
  pdf.addPageBreak();
  pdf.addChapterBanner('Guia Tactica 02', 'Regla 45-75-15, Anatomia de Trampas y Ejemplos de Descarte', C_BLUE);
  pdf.addStepFlowDiagram('GESTION DE TIEMPO POR REACTIVO: REGLA 45 - 75 - 15', [
    { code: '45s', label: 'Lectura Rapida', detail: 'Entiende que preguntan y descarta 2 absurdas.', accent: C_EMERALD },
    { code: '75s', label: 'Limite Maximo', detail: 'Si llegas a 75s sin salida, marca (*) y salta ya.', accent: C_GOLD_DARK },
    { code: '15s', label: 'Segunda Vuelta', detail: 'Vuelve al final solo a los (*) con mente fresca.', accent: C_BLUE },
    { code: '100%', label: 'Cero Blancos', detail: 'Nunca dejes burbujas vacias en examen real.', accent: C_VIOLET },
  ]);

  pdf.addTwoColumnCompareCard({
    leftTitle: '4 Trampas Clasicas de Distractores EXANI-II',
    leftTone: 'red',
    leftItems: [
      'Resultado Intermedio: aparece en la opcion el paso 1 de la ecuacion antes de terminar.',
      'Absolutismo Verbal: opciones con "siempre", "nunca", "todos" en textos con matiz.',
      'Signo Invertido: cambiar + por - al despejar parentesis.',
      'Base Equivocada: sumar +20% y restar -20% pensando que queda en 100%.',
    ],
    rightTitle: 'Como Resolver por Descarte Logico (2 Ejemplos)',
    rightTone: 'emerald',
    rightItems: [
      'Matem. Ejemplo: "Un precio de $800 sube 25% y luego baja 20%". Sube a $1,000; 20% de $1,000 es $200 -> vuelve a $800! Error comun: restar 20% de $800.',
      'Lectura Ejemplo: Ante "No es que falten recursos, sino planeacion", descarta de inmediato cualquier opcion que culpe a la "falta de dinero".',
      'Siempre valida tu resultado sustituyendolo en la pregunta original.',
    ],
  });

  pdf.addCalloutBox(
    'Consejo de Oro Antes de Arrancar la Parte I',
    'El examen no premia resolver primero el reactivo mas dificil por orgullo: cada reactivo facil de 25 segundos vale exactamente los mismos puntos que uno algebraico de 3 minutos. Asegura primero todos los faciles.',
    'gold'
  );

  // PAGE 4: MASTER FORMULA & CHEAT SHEET ACROSS ALL 4 AREAS
  pdf.addPageBreak();
  pdf.addChapterBanner('Acordeon Maestro', 'Formulario y Reglas Clave de las 4 Areas EXANI-II', C_EMERALD);
  pdf.addTable(
    ['Area EXANI-II', 'Formulas y Reglas Imprescindibles para Memorizar (Sin Consultar en Simulacro)'],
    [
      [
        'Pensamiento Matematico',
        '- Porcentaje directo: Aumento +p% = x(1 + p/100); Descuento -p% = x(1 - p/100).\n- Regla 3 directa: cruzada (mas -> mas). Regla 3 inversa: horizontal (mas -> menos).\n- Pendiente recta: m = (y2 - y1)/(x2 - x1) | Pitagoras: c^2 = a^2 + b^2 (triadas: 3-4-5, 5-12-13).\n- Area triangulo: (bh)/2 | Circulo: pi*r^2 | Probabilidad clasica: casos favorables / totales.\n- Media = suma/n | Mediana = dato central ordenado | Moda = valor mas repetido.',
      ],
      [
        'Pensamiento Analitico',
        '- Sucesiones: revisa 1) diferencia fija (+k), 2) razon (xk), 3) doble salto (n alternados) o 4) 2do nivel.\n- Silogismos: "Todo A es B" NO implica "Todo B es A". Dibuja circulos de inclusion antes de concluir.\n- Analogias: formula una oracion puente exacta ("A es herramienta para B") y aplicala a las 4 opciones.',
      ],
      [
        'Comprension Lectora',
        '- Conectores de contraste ("sin embargo", "no obstante", "aunque") marcan el giro central.\n- Conectores causales ("debido a", "puesto que") introducen evidencia o argumento.\n- Tono del autor: distingue si es objetivo/informativo, critico, ironico o exhortativo.',
      ],
      [
        'Estructura de la Lengua',
        '- Diacriticos clave: tu/el/mi (pronombre llevan tilde) vs tu/el/mi (posesivo/articulo sin tilde).\n- mas (cantidad) vs mas (pero) | aun (todavia) vs aun (incluso) | se (saber/ser) vs se (pronombre).\n- Concordancia: el verbo siempre concuerda en numero con el nucleo del sujeto ("El grupo de alumnos LLEGO").\n- Vicios a evitar: dequeismo ("pienso de que"), pleonasmo ("salir afuera"), anfibologia (doble sentido).',
      ],
    ],
    [40, 136]
  );

  // PART I: CLEAN 50-QUESTION EXAM BOOKLET (NO SPOILERS)
  const areas: ExaniArea[] = [
    'Comprensión Lectora',
    'Pensamiento Matemático',
    'Pensamiento Analítico',
    'Estructura de la Lengua',
  ];

  const areaIntroTip: Record<ExaniArea, string> = {
    'Comprensión Lectora': 'Meta sugerida: 18 min (aprox. 80 seg/reactivo). Lee la pregunta antes del fragmento para saber que buscar.',
    'Pensamiento Matemático': 'Meta sugerida: 20 min. Escribe tus operaciones en margen; cuida signos y descuentos sucesivos.',
    'Pensamiento Analítico': 'Meta sugerida: 15 min. En sucesiones revisa saltos alternados; en silogismos dibuja diagramas simples.',
    'Estructura de la Lengua': 'Meta sugerida: 12 min. Lee en voz mental para detectar discordancias de numero, genero o puntuacion.',
  };

  for (const area of areas) {
    pdf.addPageBreak();
    const items = EXANI_50_BANK.filter((q) => q.area === area);
    pdf.addChapterBanner('Parte I · Cuadernillo de Examen Limpio', `${area} (${items.length} Reactivos)`, C_GOLD);
    pdf.addCalloutBox(`Estrategia de Seccion - ${area}`, areaIntroTip[area], 'blue');
    for (const q of items) {
      pdf.addCleanExamQuestion(q);
    }
  }

  // PART II-A: PRINTABLE BUBBLE SHEET (1-50)
  pdf.addPageBreak();
  pdf.addChapterBanner('Parte II · Hoja de Respuestas', 'Hoja Optica de Burbujas Imprimible (Reactivos 1 al 50)', C_GOLD);
  pdf.addParagraph(
    'Instrucciones de simulacro real: Utiliza lapiz del numero 2 o 2 1/2. Marca el tiempo exacto de inicio y fin antes de verificar la clave en la siguiente pagina.'
  );
  pdf.addWorksheetBox('Datos del Simulacro (Llena antes de empezar)', 'Nombre: _________________________  |  Hora Inicio: _____  |  Hora Fin: _____  |  Meta: ___ / 50', 22, 0);
  pdf.addBubbleSheet50();
  pdf.addCalloutBox(
    'Autochequeo Post-Simulacro',
    'Antes de ver la tabla clave de la pagina siguiente, encierra en un circulo en tu hoja los numeros donde adivinaste por falta de tiempo: esos temas tambien cuentan como prioridad de repaso aunque los aciertes por suerte.',
    'gold'
  );

  // PART II-B: QUICK ANSWER KEY GRID (1-50) + SELF-DIAGNOSIS TABLE
  pdf.addPageBreak();
  pdf.addChapterBanner('Parte II · Autoevaluacion Inmediata', 'Tabla Clave Rapida (1 - 50) y Semaforo por Area', C_GOLD);
  pdf.addParagraph('Califica tus 50 respuestas en segundos antes de estudiar el solucionario completo paso a paso.');

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

  pdf.addSubheading('Calcula Tu Semaforo por Area Troncal');
  pdf.addTable(
    ['Area Evaluada', 'Tus Aciertos', 'Rojo (<60%)', 'Amarillo (60-79%)', 'Verde (>=80%)'],
    [
      ['1. Comprension Lectora (1-13)', '____ / 13', '0 a 7 aciertos', '8 a 10 aciertos', '11 a 13 aciertos'],
      ['2. Pensamiento Matematico (14-26)', '____ / 13', '0 a 7 aciertos', '8 a 10 aciertos', '11 a 13 aciertos'],
      ['3. Pensamiento Analitico (27-38)', '____ / 12', '0 a 6 aciertos', '7 a 9 aciertos', '10 a 12 aciertos'],
      ['4. Estructura de la Lengua (39-50)', '____ / 12', '0 a 6 aciertos', '7 a 9 aciertos', '10 a 12 aciertos'],
    ],
    [54, 24, 32, 33, 33]
  );

  // PART III: COMPLETE 50 EXPLAINED SOLUTIONS
  const areaReviewTips: Record<ExaniArea, string> = {
    'Comprensión Lectora': 'Revisa en cada fallo si elegiste una opcion extrema o si ignoraste un conector de contraste ("sin embargo", "no obstante").',
    'Pensamiento Matemático': 'Verifica si tu error fue de planteamiento (traducir enunciado) o de aritmetica rapida (signos/porcentajes).',
    'Pensamiento Analítico': 'En patrones numericos comprueba siempre diferencias consecutivas o series intercaladas en pares/impares.',
    'Estructura de la Lengua': 'Anota en tu bitacora cada par diacritico o vicio sintactico nuevo para repasarlo en Dia 1 y Dia 3.',
  };

  for (const area of areas) {
    pdf.addPageBreak();
    const items = EXANI_50_BANK.filter((q) => q.area === area);
    pdf.addChapterBanner('Parte III · Solucionario Comentado', `Explicaciones Paso a Paso: ${area}`, C_EMERALD);
    pdf.addCalloutBox(`Como Auditar Tus Errores en ${area}`, areaReviewTips[area], 'emerald');
    for (const q of items) {
      pdf.addSolvedQuestionCard(q);
    }
  }

  // FINAL CLOSING: 4-DRILL LOG + SCORE-BASED ACTION PLAN + 8-ROW ERROR AUDIT
  pdf.addPageBreak();
  pdf.addChapterBanner('Cierre Estrategico', 'Bitacora de Simulacros UAA y Plan Segun Tu Semaforo', C_GOLD);
  pdf.addTable(
    ['Intento', 'Fecha', 'Lectura /13', 'Matem. /13', 'Analit. /12', 'Lengua /12', 'CENEVAL Est.'],
    [
      ['Simulacro 1', '___/___/26', '', '', '', '', ''],
      ['Simulacro 2', '___/___/26', '', '', '', '', ''],
      ['Simulacro 3', '___/___/26', '', '', '', '', ''],
      ['Simulacro 4', '___/___/26', '', '', '', '', ''],
    ],
    [28, 25, 24, 24, 24, 24, 27]
  );

  pdf.addSubheading('Que Hacer Despues de Calificar (Plan Exacto por Resultado)');
  pdf.addTable(
    ['Tu Puntaje Total', 'Diagnostico', 'Siguiente Paso Inmediato'],
    [
      ['< 30 / 50 (<1,060)', 'Base en construccion', 'Pausa nuevos examenes por 5 dias. Usa Metodo Feynman + Formulario Maestro sobre tus 2 areas Rojas.'],
      ['30 - 38 / 50 (1,060-1,160)', 'Nivel competitivo', 'Ataca los 8 reactivos mas tardados en ciclos 90/20 + aplica Regla 45-75-15 para ganar 10 min extra.'],
      ['39 - 50 / 50 (1,168+)', 'Zona Top UAA', 'Manten precision con repaso espaciado y enfocate en control emocional NSDR para no regalar errores.'],
    ],
    [38, 36, 102]
  );

  pdf.addWorksheetBox(
    'Auditoria de Errores Recurrentes (Los 6 distractores donde NO volvere a caer)',
    'Anota: # Reactivo  |  Tema  |  Regla exacta que garantiza responder bien la proxima vez:',
    68,
    5
  );

  pdf.finalizeHeadersAndFooters();
  return pdf.doc;
};

// =========================================================================
// 4. PACK 3: PROTOCOLO ANTI-ANSIEDAD NSDR ($79 MXN) -> 10 Paginas Clinicas
// =========================================================================
export const buildNsdrProtocolPdf = (): jsPDF => {
  const pdf = new LuxuryEditorialPdf('PACK 03 - PROTOCOLO ANTI-ANSIEDAD NSDR 2026');
  pdf.addLuxuryCover({
    badge: 'Pack 03 · Audio WAV Alpha->Theta + Manual Clinico 10 Pags',
    title: 'Protocolo Anti-Ansiedad NSDR Pre-Examen',
    subtitle: 'Regulacion vagal rapida en 10 minutos, curva Yerkes-Dodson, 3 diagramas de respiracion tactica, 4 rescates reales en aula, nutricion 72h y tarjeta de bolsillo.',
    edition: 'Contenido Completo del Manual Clinico (10 Paginas)',
    accentColor: [167, 139, 250],
    tocItems: [
      { code: '01', title: 'Neurofisiologia del Bloqueo y Curva Yerkes-Dodson', detail: 'Por que ocurre la mente en blanco y como volver a la zona optima de flujo' },
      { code: '02', title: 'Guion NSDR Paso a Paso + Caso Despertar a las 3:00 AM', detail: 'Sincronizado con audio .wav Alpha->Theta + texto de escaneo corporal' },
      { code: '03', title: '3 Respiraciones Tacticas + 4 Rescates Reales en Aula', detail: 'Diagramas 4-7-8, Caja 4-4-4-4 y Suspiro Fisiologico Doble ante crisis' },
      { code: '04', title: 'Nutricion 72h UAA, Reencuadre Cognitivo y Tarjeta Recortable', detail: 'Desayuno estable, checklist imprimible, bitacora 7 sesiones y tarjeta 60s' },
    ],
    footerNote: 'Escucha Protocolo-NSDR-AntiAnsiedad-MiguelLopez.wav la noche anterior y 30 minutos antes de salir rumbo al examen UAA.',
  });

  // PAGE 2: MODULO 01 - YERKES-DODSON CURVE + AUTONOMIC TABLE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 01', 'Cortisol vs. Freno Vagal: La Ciencia de la Mente en Blanco', C_VIOLET);
  pdf.addParagraph(
    'Cuando tu cerebro interpreta el examen EXANI-II como amenaza de supervivencia, la amigdala libera adrenalina y cortisol. Eso estrecha el flujo sanguineo hacia la corteza prefrontal (la zona encargada de algebra y comprension lectora), produciendo el famoso bloqueo o "mente en blanco".'
  );

  // Vector Yerkes-Dodson Inverted-U Curve
  pdf.ensureSpace(64);
  const ykY = pdf.y + 2;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(pdf.margin, ykY, pdf.maxWidth, 56, 2.5, 2.5, 'FD');

  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(9);
  pdf.doc.setTextColor(...C_SLATE_900);
  pdf.doc.text('CURVA YERKES-DODSON: ACTIVACION EMOCIONAL VS. RENDIMIENTO EN EL EXANI-II', pdf.margin + 5, ykY + 7);

  const ux = pdf.margin + 18;
  const uy = ykY + 13;
  const uw = 148;
  const uh = 30;
  pdf.doc.setDrawColor(...C_SLATE_500);
  pdf.doc.setLineWidth(0.35);
  pdf.doc.line(ux, uy, ux, uy + uh);
  pdf.doc.line(ux, uy + uh, ux + uw, uy + uh);

  // Shaded sweet spot band
  pdf.doc.setFillColor(...C_EMERALD_BG);
  pdf.doc.rect(ux + 46, uy + 2, 56, uh - 2, 'F');

  // Inverted U curve polyline
  pdf.doc.setDrawColor(...C_VIOLET);
  pdf.doc.setLineWidth(1.1);
  const curvePts: Array<[number, number]> = [
    [ux + 4, uy + 27],
    [ux + 25, uy + 17],
    [ux + 50, uy + 6],
    [ux + 74, uy + 3],
    [ux + 98, uy + 6],
    [ux + 123, uy + 18],
    [ux + 144, uy + 28],
  ];
  for (let i = 0; i < curvePts.length - 1; i++) {
    pdf.doc.line(curvePts[i][0], curvePts[i][1], curvePts[i + 1][0], curvePts[i + 1][1]);
  }
  pdf.doc.setFillColor(...C_EMERALD);
  pdf.doc.circle(ux + 74, uy + 3, 1.8, 'F');

  pdf.doc.setFontSize(7.6);
  pdf.doc.setTextColor(...C_SLATE_500);
  pdf.doc.text('Baja alerta (Sueno)', ux + 4, uy + uh + 5);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setTextColor(...C_EMERALD);
  pdf.doc.text('ZONA OPTIMA DE FLUJO UAA', ux + 54, uy + uh + 5);
  pdf.doc.setTextColor(185, 28, 28);
  pdf.doc.text('Panico / Mente en blanco', ux + 112, uy + uh + 5);
  pdf.y = ykY + 61;

  pdf.addTable(
    ['Estado Autonomico', 'Senales Fisicas Claras', 'Efecto en Examen', 'Intervencion Inmediata'],
    [
      ['Alerta Optima (Verde)', 'Respiracion nasal lenta, manos tibias', 'Lectura agil, calculo exacto', 'Mantener ritmo 45-75-15 sin acelerar'],
      ['Sobreactivacion (Roja)', 'Taquicardia, sudor, leer 3x sin entender', 'Error impulsivo o bloqueo', '2 Suspiros Fisiologicos + Caja 4-4-4-4'],
      ['Insomnio Pre-Examen', 'Rumiacion mental ("y si no entro?")', 'Fatiga en ultima hora UAA', 'Audio NSDR 10 min en cama sin pantalla'],
    ],
    [38, 46, 42, 50]
  );

  // PAGE 3: MODULO 02 - NSDR TIMELINE + FULL BODY SCAN SCRIPT + 3AM CASE
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 02', 'Guion Completo NSDR (Sincronizado con Audio .wav 10 Min)', C_VIOLET);
  pdf.addTable(
    ['Minuto', 'Fase del Audio', 'Instruccion Exacta para tu Cuerpo y Mente'],
    [
      ['0:00 - 2:00', 'Aterrizaje Sensorial', 'Acuestate o sientate con espalda apoyada. Audifonos puestos, ojos cerrados, mandibula separada.'],
      ['2:00 - 4:30', 'Freno Vagal 4-7-8', '4 ciclos guiados: inhala 4s por nariz, reten 7s suave, exhala muy lento en 8s desinflando abdomen.'],
      ['4:30 - 8:30', 'Escaneo Descendente', 'Lleva la atencion como un foco calido desde coronilla -> cejas -> hombros -> manos -> piernas.'],
      ['8:30 - 10:00', 'Retorno Lucido', '3 respiraciones normales profundas, mueve dedos, abre ojos sin mirar el celular durante 5 min.'],
    ],
    [28, 40, 108]
  );

  pdf.addCalloutBox(
    'Guion Textual Completo (Por si Necesitas Practicarlo Sin Audifonos)',
    '"Nota el peso de tu cabeza contra el respaldo o la almohada. Al exhalar, deja caer los hombros 2 centimetros lejos de las orejas. Relaja la lengua en el paladar y el entrecejo. Recorre mentalmente frente, mejillas, cuello, pecho, estomago, muslos y plantas de los pies diciendo en silencio: suelto tension aqui. No necesitas dormirte; solo descansar profundamente despierto."',
    'violet'
  );

  pdf.addCalloutBox(
    'Caso Real Resuelto: Que Hacer Si Te Despiertas a las 3:00 AM Antes del Examen',
    'ERROR FATAL: Mirar la hora en el celular y calcular "solo me quedan 3 horas para dormir" (dispara adrenalina).\nSOLUCION NSDR: NO enciendas el telefono ni prendas luces fuertes. Da vuelta al reloj, haz 3 Suspiros Fisiologicos Dobles y recorre el Escaneo Descendente 4-7-8. Incluso el descanso NSDR sin sueno profundo recupera hasta el 70% de tu funcion prefrontal.',
    'emerald'
  );

  // PAGE 4: MODULO 03 - 3 TACTICAL BREATHING DIAGRAMS
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 03', '3 Herramientas Visuales de Respiracion Tactica', C_EMERALD);
  pdf.addParagraph('Cada tecnica tiene un uso especifico. Entrenalas al menos 4 dias antes del examen para que en el aula funcionen de manera automatica:');

  pdf.ensureSpace(78);
  const by = pdf.y + 2;
  // Panel 1: 4-7-8
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(pdf.margin, by, 56, 72, 2.5, 2.5, 'FD');
  pdf.doc.setTextColor(...C_VIOLET);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(8.5);
  pdf.doc.text('1. PROTOCOLO 4-7-8', pdf.margin + 4, by + 7);
  pdf.doc.setDrawColor(...C_VIOLET);
  pdf.doc.setLineWidth(1.1);
  pdf.doc.circle(pdf.margin + 28, by + 29, 13, 'S');
  pdf.doc.setFillColor(...C_VIOLET_BG);
  pdf.doc.circle(pdf.margin + 28, by + 29, 9, 'F');
  pdf.doc.setTextColor(...C_SLATE_900);
  pdf.doc.setFontSize(9.5);
  pdf.doc.text('4-7-8', pdf.margin + 23.5, by + 30.2);
  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(7.5);
  pdf.doc.setTextColor(...C_SLATE_700);
  pdf.doc.text('Inhala 4s | Sosten 7s', pdf.margin + 4, by + 51);
  pdf.doc.text('Exhala lento 8s (x4)', pdf.margin + 4, by + 56);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setTextColor(...C_VIOLET);
  pdf.doc.text('Uso: Noche previa', pdf.margin + 4, by + 65);

  // Panel 2: Box 4-4-4-4
  const px2 = pdf.margin + 60;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(px2, by, 56, 72, 2.5, 2.5, 'FD');
  pdf.doc.setTextColor(...C_EMERALD);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(8.5);
  pdf.doc.text('2. CAJA TACTICA 4x4', px2 + 4, by + 7);
  pdf.doc.setDrawColor(...C_EMERALD);
  pdf.doc.setLineWidth(1.1);
  pdf.doc.rect(px2 + 16, by + 18, 24, 22, 'S');
  pdf.doc.setFontSize(9.5);
  pdf.doc.text('4x4', px2 + 24.5, by + 30.2);
  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(7.5);
  pdf.doc.setTextColor(...C_SLATE_700);
  pdf.doc.text('Inhala 4s / Sosten 4s', px2 + 4, by + 51);
  pdf.doc.text('Exhala 4s / Pausa 4s', px2 + 4, by + 56);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setTextColor(...C_EMERALD);
  pdf.doc.text('Uso: En pleno examen', px2 + 4, by + 65);

  // Panel 3: Double Physiological Sigh
  const px3 = pdf.margin + 120;
  pdf.doc.setFillColor(255, 255, 255);
  pdf.doc.setDrawColor(...C_BORDER);
  pdf.doc.roundedRect(px3, by, 56, 72, 2.5, 2.5, 'FD');
  pdf.doc.setTextColor(...C_BLUE);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setFontSize(8.5);
  pdf.doc.text('3. SUSPIRO DOBLE', px3 + 4, by + 7);
  pdf.doc.setFillColor(...C_BLUE_BG);
  pdf.doc.roundedRect(px3 + 7, by + 18, 42, 22, 2, 2, 'F');
  pdf.doc.setTextColor(...C_BLUE);
  pdf.doc.setFontSize(8.2);
  pdf.doc.text('2 Inh. + 1 Exh. Larga', px3 + 11, by + 30.2);
  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(7.5);
  pdf.doc.setTextColor(...C_SLATE_700);
  pdf.doc.text('Inhala nariz + mini sorbo', px3 + 4, by + 51);
  pdf.doc.text('Exhala suave por boca', px3 + 4, by + 56);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setTextColor(...C_BLUE);
  pdf.doc.text('Uso: Panico en 30 seg', px3 + 4, by + 65);
  pdf.y = by + 78;

  pdf.addCalloutBox(
    'Por que el Suspiro Fisiologico Doble Detiene el Panico en 30 Segundos',
    'Descubierto en neurobiologia de Stanford: la segunda micro-inhalacion reabre los alveolos pulmonares colapsados, expulsando CO2 rapido en la exhalacion larga y enviando una senal directa al corazon para frenar las pulsaciones de inmediato.',
    'blue'
  );

  // PAGE 5: MODULO 04 - 4 CLASSROOM RESCUE SCENARIOS
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 04', 'Manual de Rescate en el Aula: 4 Crisis Reales Resueltas', C_GOLD);
  pdf.addParagraph('Si ocurre cualquiera de estas situaciones dentro del salon UAA, aplica el protocolo exacto sin improvisar:');
  pdf.addTable(
    ['Crisis en Pleno Examen', 'Que NO Debes Hacer', 'Protocolo Exacto de Rescate (60-75 seg)'],
    [
      [
        '1. Mente en blanco en matematicas (#14)',
        'Quedarte mirando el mismo numero 4 minutos frustrandote.',
        'Suelta lapiz, haz 2 Suspiros Dobles mirando el escritorio, marca (*) en margen y salta a una pregunta mas accesible para recuperar confianza.',
      ],
      [
        '2. Lees el parrafo 3 veces sin entender nada',
        'Seguir forzando los ojos desde la primera palabra.',
        'Cierra ojos 15s, haz 1 ciclo Caja 4x4, lee PRIMERO la pregunta para darle un objetivo concreto al cerebro y luego busca la idea.',
      ],
      [
        '3. Quedan 15 min y te faltan 14 reactivos',
        'Acelerar sin leer opciones y llenar al azar por miedo.',
        'Activa modo cirujano: 45s maximo por pregunta. Descarta 2 opciones absurdas, elige la mas coherente/matizada y avanza sin dudar.',
      ],
      [
        '4. El de al lado entrega y se sale antes',
        'Pensar "todos son mas listos que yo" y apurarte.',
        'El tiempo no da puntos extra. Muchas entregas tempranas son rendicion o prisa descuidada. Tu examen es solo tu contra el cronometro.',
      ],
    ],
    [40, 44, 92]
  );

  // PAGE 6: MODULO 05 - 72H NUTRITION, HYDRATION & CAFFEINE PROTOCOL
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 05', 'Protocolo 72h Pre-UAA: Nutricion Glucemica, Agua y Cafeina', C_EMERALD);
  pdf.addParagraph(
    'El cerebro consume ~20% de toda tu energia corporal. Un desayuno con exceso de azucar o cafe en ayunas provoca un pico energetico seguido de hipoglucemia reactiva justo a mitad de Pensamiento Matematico (fatiga, temblor y confusion mental).'
  );
  pdf.addTwoColumnCompareCard({
    leftTitle: 'Desayuno de Riesgo (Provoca Bajon a las 2h)',
    leftTone: 'red',
    leftItems: [
      'Pan dulce, cereal azucarado o jugo embotellado en ayunas.',
      'Cafe doble muy cargado si no acostumbras tomarlo.',
      'Llegar sin desayunar "por los nervios" (baja memoria).',
    ],
    rightTitle: 'Desayuno Cognitivo Estable UAA (Ejemplos)',
    rightTone: 'emerald',
    rightItems: [
      '2 huevos revueltos/tortilla o queso panela + 1 tortilla o pan integral + 1/2 aguacate.',
      'Yogur griego natural sin azucar + nueces/almendras + avena cocida.',
      'Hidratacion: 350 ml agua antes de salir; sorbos pequenos en aula.',
    ],
  });

  pdf.addTable(
    ['Ventana de Tiempo', 'Protocolo de Sueno, Estudio y Estimulantes'],
    [
      ['72h antes (Jueves)', 'Ultimo repaso fuerte de Bitacora de Errores. Cero cafeina despues de las 14:00 hrs.'],
      ['48h antes (Viernes)', 'Haz un mini-simulacro matutino a la misma hora de tu cita UAA para sincronizar reloj biologico.'],
      ['24h antes (Sabado)', 'Cierra guias a las 19:00 hrs! Prepara mochila, pase, ID y lapices. Audio NSDR 10 min antes de dormir.'],
      ['Dia del Examen', 'Despierta 2.5h antes, desayuno estable, cero redes sociales en la fila y Audio NSDR o 4x4 en camino.'],
    ],
    [42, 134]
  );

  // PAGE 7: MODULO 06 - COGNITIVE REPROGRAMMING
  pdf.addPageBreak();
  pdf.addChapterBanner('Modulo 06', 'Reprogramacion Cognitiva (Desarme de Pensamientos Catastroficos)', C_VIOLET);
  pdf.addParagraph('La ansiedad crece cuando confundimos una preocupacion con un hecho futuro inevitable. Usa esta tabla para responder con evidencia cada pensamiento intrusivo:');
  pdf.addTable(
    ['Pensamiento Intrusivo Común', 'Distorsion Cognitiva', 'Reencuadre Basado en Evidencia (Repetir y Actuar)'],
    [
      ['"Si fallo una pregunta ya reprobe el examen"', 'Catastrofismo todo-o-nada', 'Puedo fallar incluso 8 a 10 reactivos y seguir dentro del rango top UAA. Avanzo al siguiente.'],
      ['"Soy malo en matematicas desde siempre"', 'Etiqueta fija', 'No soy malo; simplemente tenia 4 temas sin Metodo Feynman. Cada error corregido suma puntos.'],
      ['"Todos en el salon saben mas que yo"', 'Lectura de mente', 'La mayoria siente exactamente los mismos nervios. Mi estrategia 45-75-15 y calma son mi ventaja.'],
      ['"Me late fuerte el corazon, algo anda mal"', 'Interpretacion de amenaza', 'Es adrenalina normal de alerta. 2 Suspiros Dobles la canalizan en energia enfocada en 30 seg.'],
    ],
    [48, 38, 90]
  );

  // PAGE 8: PRINTABLE 01 - 72H UAA CHECKLIST
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 01', 'Checklist Logistico y Mental 72 Horas UAA', C_GOLD);
  pdf.addParagraph('Marca cada casilla con anticipacion para eliminar imprevistos logisticos (la principal fuente evitable de panico el dia del examen):');
  pdf.addBullet('Documentos: Pase de ingreso impreso sin dobleces + Identificacion oficial vigente (INE / Pasaporte / Credencial escolar aceptada UAA).', true);
  pdf.addBullet('Material permitido: 2 o 3 lapices No. 2 o 2 1/2 con punta lista, goma blanca suave de migajon y sacapuntas limpio.', true);
  pdf.addBullet('Logistica: Sede UAA, edificio, numero de aula y ruta comprobada con 35 minutos de colchon ante trafico.', true);
  pdf.addBullet('Vestimenta en capas: Sudadera/chamarra comoda (muchas aulas UAA tienen aire acondicionado frio o calor).', true);
  pdf.addBullet('Noche previa: Mochila lista a las 20:00 hrs; telefono en silencio; Audio NSDR 10 minutos con luces bajas.', true);
  pdf.addBullet('Manana del examen: Desayuno proteina + grasa saludable; botella de agua; cero conversaciones ansiosas en la entrada.', true);
  pdf.addWorksheetBox(
    'Datos Logisticos Exactos de Mi Examen UAA 2026',
    'Campus / Edificio / Aula: ______________________ | Hora cita: _____ | Salir de casa a las: _____',
    34,
    2
  );

  // PAGE 9: PRINTABLE 02 - 7-SESSION PRE-SIMULACRO LOG
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 02', 'Bitacora de Regulacion Pre-Simulacro (7 Sesiones + Dia UAA)', C_VIOLET);
  pdf.addParagraph('Registra tu ansiedad percibida (1 = calma total, 10 = bloqueo) antes y despues de usar el Protocolo NSDR:');
  pdf.addTable(
    ['Sesion / Fecha', 'Ans. Antes (1-10)', 'Protocolo Aplicado', 'Ans. Despues (1-10)', 'Puntaje'],
    [
      ['Sesion 1: ___/___', '', 'Audio NSDR + 4-7-8', '', ''],
      ['Sesion 2: ___/___', '', 'Audio NSDR + 4-7-8', '', ''],
      ['Sesion 3: ___/___', '', 'Audio NSDR + Caja 4-4-4-4', '', ''],
      ['Sesion 4: ___/___', '', 'Audio NSDR + Suspiro Doble', '', ''],
      ['Sesion 5: ___/___', '', 'Audio NSDR + Caja 4-4-4-4', '', ''],
      ['Sesion 6: ___/___', '', 'Audio NSDR + 4-7-8', '', ''],
      ['Sesion 7: ___/___', '', 'NSDR Completo (10 min)', '', ''],
      ['Dia Examen UAA', '', 'NSDR Manana + Caja en Aula', '', 'Meta UAA!'],
    ],
    [32, 34, 48, 36, 26]
  );
  pdf.addWorksheetBox(
    'Nota de Calibracion Personal',
    'Que tecnica me funciono mas rapido (4-7-8, Caja 4x4 o Suspiro Doble) y que ajuste hare el dia del examen:',
    36,
    2
  );

  // PAGE 10: PRINTABLE 03 - POCKET RESCUE CARD (CUTOUT)
  pdf.addPageBreak();
  pdf.addChapterBanner('Plantilla Imprimible 03', 'Tarjeta de Bolsillo "Protocolo de Emergencia 60 Segundos"', C_GOLD);
  pdf.addParagraph('Recorta o fotografia esta tarjeta para repasarla justo antes de entrar al aula UAA (recuerda guardar tu telefono antes de ingresar):');
  pdf.addPocketCardCutout(
    'TARJETA DE RESCATE UAA 2026 - MIGUEL LOPEZ',
    'Protocolo Silencioso en Pupitre (60 Segundos)',
    [
      '1. DETENTE Y SUELTA EL LAPIZ (5 seg): Separa mandibula, baja los hombros y mira un punto fijo del escritorio.',
      '2. RESET PULMONAR (20 seg): Realiza 2 Suspiros Fisiologicos Dobles (inhala nariz + mini sorbo extra -> exhala largo y lento por boca).',
      '3. ESTABILIZA RITMO (25 seg): 2 ciclos silenciosos de Caja 4x4 (Inhala 4s / Sosten 4s / Exhala 4s / Pausa 4s).',
      '4. REGLA 75 SEGUNDOS (10 seg): Si el reactivo actual sigue trabado, marcalo (*) en margen y avanza a uno facil para recuperar ritmo.',
      'AFIRMACION FINAL: "Cada acierto cuenta igual; controlo mi respiracion, controlo mi tiempo y ejecuto mi plan."',
    ]
  );
  pdf.addCalloutBox(
    'Cierre de Confianza',
    'Tu mente en calma recupera informacion mucho mas rapido que una mente tensa. Confia en tus horas de preparacion, aplica tu respiracion tactica desde el primer minuto y da tu mejor rendimiento en la UAA.',
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

