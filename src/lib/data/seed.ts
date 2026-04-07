import type { AppDataset, DailySummary, HourlySummary, LaborDay, LaborHour, TicketSummary } from "../../types/data";
import { DEFAULT_LABOR_RATE, withFreshMeta } from "./contracts";

function makeDateKey(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function buildHour(dateKey: string, hour: number, sales: number, people: number): HourlySummary {
  const transactions = sales > 0 ? Math.max(1, Math.round(sales / 9.25)) : 0;
  const laborHours = people;
  const laborCost = laborHours * DEFAULT_LABOR_RATE;
  const avgTicket = transactions > 0 ? sales / transactions : 0;
  const laborPct = sales > 0 ? (laborCost / sales) * 100 : 0;
  const salesPerLaborHour = laborHours > 0 ? sales / laborHours : 0;

  let status: HourlySummary["status"] = "Watch";
  if (sales >= 320) status = "Peak Hour";
  else if (laborPct >= 30) status = "Overstaffed";
  else if (people <= 2 && sales >= 170) status = "Understaffed";
  else if (laborPct <= 18 && sales > 0) status = "Strong Efficiency";
  else if (sales < 60) status = "Low Traffic";

  return {
    dateKey,
    hour,
    sales,
    transactions,
    people,
    laborHours,
    laborCost,
    laborPct,
    avgTicket,
    salesPerLaborHour,
    status,
  };
}

function buildDay(dateKey: string, weekdayBoost: number, weatherSummary: string) {
  const hourlySales = [0,0,0,0,0,0,0,0,0,0,0,110,155,210,255,320,375,410,390,300,215,135,0,0]
    .map((value) => Math.round(value * weekdayBoost));

  const hourlySummaries = hourlySales.map((sales, hour) => {
    let people = 0;
    if (sales > 0) {
      people = sales < 130 ? 2 : sales < 250 ? 3 : sales < 360 ? 4 : 5;
    }
    return buildHour(dateKey, hour, sales, people);
  });

  const sales = hourlySummaries.reduce((sum, row) => sum + row.sales, 0);
  const transactions = hourlySummaries.reduce((sum, row) => sum + row.transactions, 0);
  const laborHours = hourlySummaries.reduce((sum, row) => sum + row.laborHours, 0);
  const laborCost = hourlySummaries.reduce((sum, row) => sum + row.laborCost, 0);

  const dailySummary: DailySummary = {
    dateKey,
    sales,
    transactions,
    laborHours,
    laborCost,
    avgTicket: transactions > 0 ? sales / transactions : 0,
    laborPct: sales > 0 ? (laborCost / sales) * 100 : 0,
    weatherSummary,
  };

  const laborDay: LaborDay = {
    dateKey,
    totalHours: laborHours,
    totalCost: laborCost,
    scheduledPeople: Math.max(...hourlySummaries.map((row) => row.people)),
  };

  const laborHoursRows: LaborHour[] = hourlySummaries
    .filter((row) => row.people > 0)
    .map((row) => ({
      dateKey,
      hour: row.hour,
      people: row.people,
      laborHours: row.laborHours,
      laborCost: row.laborCost,
    }));

  const ticketSummaries: TicketSummary[] = hourlySummaries
    .filter((row) => row.transactions > 0)
    .flatMap((row) =>
      Array.from({ length: Math.min(row.transactions, 4) }, (_, index) => ({
        id: `${dateKey}-${row.hour}-${index + 1}`,
        dateKey,
        hour: row.hour,
        total: Number((row.avgTicket + index * 1.35).toFixed(2)),
        items: 1 + (index % 3),
        discount: index === 0 ? 1 : 0,
        timeLabel: `${String(row.hour).padStart(2, "0")}:${String(index * 10).padStart(2, "0")}`,
      })),
    );

  return { dailySummary, hourlySummaries, laborDay, laborHoursRows, ticketSummaries };
}

export function createSeedDataset(): AppDataset {
  const daySeeds = [
    buildDay(makeDateKey(2026, 4, 1), 0.88, "Cloudy"),
    buildDay(makeDateKey(2026, 4, 2), 0.94, "Sunny"),
    buildDay(makeDateKey(2026, 4, 3), 1.08, "Sunny"),
    buildDay(makeDateKey(2026, 4, 4), 1.24, "Warm"),
    buildDay(makeDateKey(2026, 4, 5), 1.02, "Breezy"),
    buildDay(makeDateKey(2026, 4, 6), 0.92, "Cloudy"),
  ];

  return withFreshMeta({
    meta: {
      version: 1,
      mode: "seed",
      lastUpdatedAt: new Date().toISOString(),
      sourceCount: 1,
      recordCount: 0,
    },
    sources: [
      {
        id: "seed-dev",
        kind: "sales",
        fileName: "seed-dev-dataset",
        fileSize: 0,
        importedAt: new Date().toISOString(),
        notes: "Controlled local seed for UI development only",
      },
    ],
    dailySummaries: daySeeds.map((item) => item.dailySummary),
    hourlySummaries: daySeeds.flatMap((item) => item.hourlySummaries),
    ticketSummaries: daySeeds.flatMap((item) => item.ticketSummaries),
    ticketItems: [],
    laborDays: daySeeds.map((item) => item.laborDay),
    laborHours: daySeeds.flatMap((item) => item.laborHoursRows),
    inventoryItems: [],
    recipes: [],
    supplierItems: [],
    discountSummaries: [],
    loyaltySurveyRows: [],
  });
}
