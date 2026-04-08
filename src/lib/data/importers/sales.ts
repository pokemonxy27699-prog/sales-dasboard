import * as XLSX from "xlsx";
import type { SalesDataset, SalesDailySummary, SalesHourlyRow } from "../../../types/data";

type CellValue = string | number | boolean | null | undefined;
type SheetRow = CellValue[];

function normalizeHeader(value: CellValue): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function toNumber(value: CellValue): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value ?? "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) return 0;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: CellValue): string {
  return String(value ?? "").trim();
}

function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateFromFileName(relativePath: string, fileName: string): string {
  const match =
    relativePath.match(/([A-Za-z]+ \d{1,2}, \d{4})\.(xls|xlsx)$/i) ||
    fileName.match(/([A-Za-z]+ \d{1,2}, \d{4})\.(xls|xlsx)$/i);

  if (!match) {
    throw new Error(`Could not read date from file name: ${relativePath || fileName}`);
  }

  const parsed = new Date(match[1]);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date in file name: ${match[1]}`);
  }

  return formatDateKey(parsed);
}

function parseExcelHour(value: CellValue): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && Number.isFinite(parsed.H)) {
      const hour = parsed.H;
      return hour >= 0 && hour <= 23 ? hour : null;
    }
  }

  const text = String(value).trim();
  if (!text) return null;

  // Handles:
  // 04/01/2026 13:00:00
  // 4/1/26 11:00
  // 11:00 AM
  // 13:00
  const match = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const meridiem = match[3]?.toUpperCase() ?? "";

  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;

  if (meridiem === "AM") {
    if (hour === 12) hour = 0;
  } else if (meridiem === "PM") {
    if (hour !== 12) hour += 12;
  }

  return hour >= 0 && hour <= 23 ? hour : null;
}

function findHeaderRowIndex(rows: SheetRow[]): number {
  for (let i = 0; i < rows.length; i += 1) {
    const normalized = rows[i].map(normalizeHeader);
    const hasStartHour = normalized.includes("starthour");
    const hasTransactions = normalized.includes("transactionqty");
    const hasNetSales = normalized.includes("netsalesamt");

    if (hasStartHour && hasTransactions && hasNetSales) {
      return i;
    }
  }

  return -1;
}

function buildHeaderMap(headerRow: SheetRow): Record<string, number> {
  const map: Record<string, number> = {};

  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });

  return map;
}

function getCell(row: SheetRow, map: Record<string, number>, keys: string[]): CellValue {
  for (const key of keys) {
    const index = map[key];
    if (index !== undefined) return row[index];
  }
  return "";
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

function sortByDateAndHour(a: SalesHourlyRow, b: SalesHourlyRow): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.hour - b.hour;
}

function sortByDate(a: SalesDailySummary, b: SalesDailySummary): number {
  return a.date.localeCompare(b.date);
}

export async function importSalesFolder(files: File[]): Promise<SalesDataset> {
  const salesFiles = files.filter((file) => /\.(xls|xlsx)$/i.test(file.name));

  if (salesFiles.length === 0) {
    throw new Error("No .xls or .xlsx files were found in the selected sales folder.");
  }

  const hourly: SalesHourlyRow[] = [];
  const dailyMap = new Map<string, SalesDailySummary>();
  const yearSet = new Set<number>();

  for (const file of salesFiles) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const dateKey = parseDateFromFileName(relativePath, file.name);
    yearSet.add(Number(dateKey.slice(0, 4)));

    const buffer = await fileToArrayBuffer(file);
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: false,
      raw: false,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) continue;

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as SheetRow[];

    const headerRowIndex = findHeaderRowIndex(rows);
    if (headerRowIndex === -1) continue;

    const headerMap = buildHeaderMap(rows[headerRowIndex]);

    for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
      const row = rows[i];
      const firstCellNormalized = normalizeHeader(row[0]);

      if (firstCellNormalized === "total") {
        break;
      }

      const hour = parseExcelHour(getCell(row, headerMap, ["starthour"]));
      if (hour === null) continue;

      const hourlyRow: SalesHourlyRow = {
        date: dateKey,
        hour,
        transactionQty: toNumber(getCell(row, headerMap, ["transactionqty"])),
        guestCount: toNumber(getCell(row, headerMap, ["guestcount"])),
        refundedQty: toNumber(getCell(row, headerMap, ["refundedqty"])),
        refundedAmt: toNumber(getCell(row, headerMap, ["refundedamt"])),
        itemSalesQty: toNumber(getCell(row, headerMap, ["itemsalesqty"])),
        netSalesAmt: toNumber(getCell(row, headerMap, ["netsalesamt"])),
        avgTicketTime: toText(getCell(row, headerMap, ["avgtickettime"])),
        avgKitchenTime: toText(getCell(row, headerMap, ["avgkitchentime"])),
        creditTips: toNumber(getCell(row, headerMap, ["credittips"])),
        sourceFileName: file.name,
        sourceRelativePath: relativePath,
      };

      hourly.push(hourlyRow);
    }
  }

  for (const row of hourly) {
    const existing = dailyMap.get(row.date);

    if (!existing) {
      dailyMap.set(row.date, {
        date: row.date,
        transactionQty: row.transactionQty,
        guestCount: row.guestCount,
        refundedQty: row.refundedQty,
        refundedAmt: row.refundedAmt,
        itemSalesQty: row.itemSalesQty,
        netSalesAmt: row.netSalesAmt,
        creditTips: row.creditTips,
        hoursLoaded: 1,
        sourceFileName: row.sourceFileName,
        sourceRelativePath: row.sourceRelativePath,
      });
      continue;
    }

    existing.transactionQty += row.transactionQty;
    existing.guestCount += row.guestCount;
    existing.refundedQty += row.refundedQty;
    existing.refundedAmt += row.refundedAmt;
    existing.itemSalesQty += row.itemSalesQty;
    existing.netSalesAmt += row.netSalesAmt;
    existing.creditTips += row.creditTips;
    existing.hoursLoaded += 1;
  }

  const daily = Array.from(dailyMap.values()).sort(sortByDate);
  hourly.sort(sortByDateAndHour);

  const minDate = daily.length > 0 ? daily[0].date : null;
  const maxDate = daily.length > 0 ? daily[daily.length - 1].date : null;

  return {
    kind: "sales",
    version: 1,
    daily,
    hourly,
    meta: {
      importedAt: new Date().toISOString(),
      fileCount: salesFiles.length,
      dayCount: daily.length,
      minDate,
      maxDate,
      years: Array.from(yearSet).sort((a, b) => a - b),
    },
  };
}
