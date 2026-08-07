import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { BadRequestError } from "../../common/errors/AppError.js";
import { REPORT_REGISTRY, type ExportColumn, type ReportFilters } from "./export.registry.js";

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/** Formats a single cell value for display — Prisma Decimals, Dates, null all need normalizing. */
function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

/**
 * Flattens whatever a report function returned into a uniform list of rows
 * + columns for the three renderers below. Summary reports (a single
 * object like Sales Summary) become one "Metric / Value" row per field —
 * see ReportDefinition.isSummary in export.registry.ts.
 */
function toRows(data: unknown, isSummary: boolean, columns: ExportColumn[]): { columns: ExportColumn[]; rows: Record<string, unknown>[] } {
  if (isSummary) {
    const obj = data as Record<string, unknown>;
    return {
      columns: [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
      rows: columns.map((col) => ({ metric: col.label, value: formatCell(obj[col.key]) })),
    };
  }

  const list = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  return { columns, rows: list };
}

function renderCsv(columns: ExportColumn[], rows: Record<string, unknown>[]): Buffer {
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = [columns.map((c) => escape(c.label)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(formatCell(row[c.key]))).join(","));
  }
  return Buffer.from(lines.join("\n"), "utf-8");
}

async function renderExcel(title: string, columns: ExportColumn[], rows: Record<string, unknown>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31)); // Excel sheet names cap at 31 chars

  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: Math.max(c.label.length + 4, 14) }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(columns.reduce<Record<string, string>>((acc, c) => ({ ...acc, [c.key]: formatCell(row[c.key]) }), {}));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Simple hand-rolled table layout — pdfkit has no built-in table support.
 * Columns are laid out at fixed widths across the page, wrapping to a new
 * page when a row would run past the bottom margin.
 */
async function renderPdf(title: string, columns: ExportColumn[], rows: Record<string, unknown>[]): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / columns.length;
  const rowHeight = 20;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  doc.fontSize(16).text(title, { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(9);

  function drawRow(values: string[], y: number, bold: boolean) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    values.forEach((value, i) => {
      doc.text(value, doc.page.margins.left + i * colWidth, y, { width: colWidth - 6, ellipsis: true });
    });
  }

  let y = doc.y;
  drawRow(columns.map((c) => c.label), y, true);
  y += rowHeight;
  doc
    .moveTo(doc.page.margins.left, y - 4)
    .lineTo(doc.page.width - doc.page.margins.right, y - 4)
    .strokeColor("#cccccc")
    .stroke();

  for (const row of rows) {
    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
      drawRow(columns.map((c) => c.label), y, true);
      y += rowHeight;
    }
    drawRow(
      columns.map((c) => formatCell(row[c.key])),
      y,
      false,
    );
    y += rowHeight;
  }

  if (rows.length === 0) {
    doc.font("Helvetica").text("No data for the selected range.", doc.page.margins.left, y);
  }

  doc.end();
  return done;
}

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

/** POST /api/v1/export/report (API Spec Chapter 51.1). */
export async function exportReport(
  reportType: string,
  format: "csv" | "excel" | "pdf",
  filters: ReportFilters,
): Promise<ExportResult> {
  const definition = REPORT_REGISTRY[reportType];
  if (!definition) {
    throw new BadRequestError(
      `Unknown reportType "${reportType}". Valid values: ${Object.keys(REPORT_REGISTRY).join(", ")}.`,
    );
  }

  const data = await definition.fetch(filters);
  const { columns, rows } = toRows(data, definition.isSummary, definition.columns);

  const datePart = new Date().toISOString().slice(0, 10);
  const baseFilename = `${reportType.replace("/", "-")}-${datePart}`;

  if (format === "csv") {
    return { buffer: renderCsv(columns, rows), filename: `${baseFilename}.csv`, contentType: CONTENT_TYPES.csv! };
  }
  if (format === "excel") {
    return {
      buffer: await renderExcel(definition.title, columns, rows),
      filename: `${baseFilename}.xlsx`,
      contentType: CONTENT_TYPES.excel!,
    };
  }
  return {
    buffer: await renderPdf(definition.title, columns, rows),
    filename: `${baseFilename}.pdf`,
    contentType: CONTENT_TYPES.pdf!,
  };
}
