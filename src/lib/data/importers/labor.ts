import * as XLSX from "xlsx";
import type { LaborDataset, LaborDailySummary } from "../../../types/data";

type CellValue = string | number | boolean | null | undefined;
type SheetRow = CellValue[];

type ParsedLaborRow = {
  date: string;
  employeeKey: string;
  hours: number;
  sourceFileName: string;
};

function normalizeHeader(value: CellValue): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function toNumber(value: CellValue): number {
  const cleaned = String(value ?? "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/[^0-9.\-]/g, "")
    .trim();

  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateFromUnknown(value: CellValue): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKey(parsed);
  }

  const match = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;

  const fallback = new Date(year, month - 1, day);
  return Number.isNaN(fallback.getTime()) ? null : formatDateKey(fallback);
}

function parseDateFromFileName(relativePath: string, fileName: string): string | null {
  const source = relativePath || fileName;

  const namedDate = source.match(/([A-Za-z]+ \d{1,2}, \d{4})/i);
  if (namedDate) {
    const parsed = new Date(namedDate[1]);
    if (!Number.isNaN(parsed.getTime())) return formatDateKey(parsed);
  }

  const numericDate = source.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (numericDate) {
    const month = Number(numericDate[1]);
    const day = Number(numericDate[2]);
    let year = Number(numericDate[3]);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return formatDateKey(parsed);
  }

  return null;
}

function findHeaderRowIndex(rows: SheetRow[]): number {
  const dateKeys = ["date", "workdate", "businessdate", "day", "shiftdate", "timein"];
  const hourKeys = ["hours", "totalhours", "regularhours", "othours", "overtimehours", "hrs", "paidhours"];

  for (let i = 0; i < rows.length; i += 1) {
    const normalized = rows[i].map(normalizeHeader);
    const hasDate = normalized.some((cell) => dateKeys.includes(cell));
    const hasHours = normalized.some((cell) => hourKeys.includes(cell));

    if (hasDate && hasHours) return i;
  }

  return -1;
}

function buildHeaderMap(headerRow: SheetRow): Record<string, number> {
  const map: Record<string, number> = {};

  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key && map[key] === undefined) map[key] = index;
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

function getHours(row: SheetRow, map: Record<string, number>): number {
  const direct = toNumber(getCell(row, map, ["paidhours", "totalhours", "hours", "hrs"]));
  if (direct > 0) return direct;

  const regular = toNumber(getCell(row, map, ["regularhours", "reghours", "regularhrs"]));
  const overtime = toNumber(getCell(row, map, ["othours", "overtimehours", "overtimehrs"]));
  const doubletime = toNumber(getCell(row, map, ["doubletimehours", "dthours"]));
  return regular + overtime + doubletime;
}

function getEmployeeKey(row: SheetRow, map: Record<string, number>, fallbackIndex: number): string {
  const name = String(
    getCell(row, map, [
      "employee",
      "employeename",
      "teammember",
      "staff",
      "name",
      "fullname",
      "employeeid",
      "id",
    ]) ?? ""
  ).trim();

  return name || `row-${fallbackIndex}`;
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

function sortByDate(a: LaborDailySummary, b: LaborDailySummary): number {
  return a.date.localeCompare(b.date);
}

export async function importLaborFolder(files: File[], loadedHourlyRate = 18): Promise<LaborDataset> {
  const laborFiles = files.filter((file) => /\.(csv|xls|xlsx)$/i.test(file.name));

  if (laborFiles.length === 0) {
    throw new Error("No .csv, .xls, or .xlsx files were found in the selected labor folder.");
  }

  const parsedRows: ParsedLaborRow[] = [];
  const yearSet = new Set<number>();

  for (const file of laborFiles) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const fallbackDate = parseDateFromFileName(relativePath, file.name);

    const workbook = XLSX.read(await fileToArrayBuffer(file), {
      type: "array",
      cellDates: true,
      raw: false,
    });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

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
        const hours = getHours(row, headerMap);

        if (hours < 2 || hours > 16) continue;

        const date =
          parseDateFromUnknown(getCell(row, headerMap, ["date", "workdate", "businessdate", "day", "shiftdate", "timein"])) ??
          fallbackDate;

        if (!date) continue;

        yearSet.add(Number(date.slice(0, 4)));
        parsedRows.push({
          date,
          employeeKey: getEmployeeKey(row, headerMap, i),
          hours,
          sourceFileName: file.name,
        });
      }
    }
  }

  if (parsedRows.length === 0) {
    throw new Error("Labor files were found, but no labor rows with dates and hours could be parsed.");
  }

  const employeeDayMap = new Map<string, ParsedLaborRow>();

  for (const row of parsedRows) {
    const key = `${row.date}__${row.employeeKey}`;
    const existing = employeeDayMap.get(key);

    if (!existing || row.hours > existing.hours) {
      employeeDayMap.set(key, row);
    }
  }

  const dedupedRows = Array.from(employeeDayMap.values());

  const dailyMap = new Map<string, LaborDailySummary>();

  for (const row of dedupedRows) {
    const existing = dailyMap.get(row.date);

    if (!existing) {
      dailyMap.set(row.date, {
        date: row.date,
        totalHours: row.hours,
        totalCost: row.hours * loadedHourlyRate,
        employeeCount: 1,
        rowCount: 1,
        sourceFileNames: [row.sourceFileName],
      });
      continue;
    }

    existing.totalHours += row.hours;
    existing.totalCost += row.hours * loadedHourlyRate;
    existing.rowCount += 1;

    if (!existing.sourceFileNames.includes(row.sourceFileName)) {
      existing.sourceFileNames.push(row.sourceFileName);
    }
  }

  for (const [date, summary] of dailyMap) {
    const employeeSet = new Set(dedupedRows.filter((row) => row.date === date).map((row) => row.employeeKey));
    summary.employeeCount = employeeSet.size;
  }

  const daily = Array.from(dailyMap.values()).sort(sortByDate);
  console.log("LABOR DEBUG TOTAL HOURS", daily.reduce((sum, d) => sum + d.totalHours, 0));

  const minDate = daily.length > 0 ? daily[0].date : null;
  const maxDate = daily.length > 0 ? daily[daily.length - 1].date : null;

  return {
    kind: "labor",
    version: 1,
    daily,
    meta: {
      importedAt: new Date().toISOString(),
      fileCount: laborFiles.length,
      dayCount: daily.length,
      minDate,
      maxDate,
      years: Array.from(yearSet).sort((a, b) => a - b),
    },
  };
}
