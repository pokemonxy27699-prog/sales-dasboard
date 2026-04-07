import type { AppDataset, DailySummary, HourlySummary, TicketSummary } from "../../types/data";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatMoneySmall(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${suffix}`;
}

export function getDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function findDailySummary(dataset: AppDataset, dateKey: string): DailySummary | null {
  return dataset.dailySummaries.find((item) => item.dateKey === dateKey) ?? null;
}

export function getHourlyRowsForDate(dataset: AppDataset, dateKey: string): HourlySummary[] {
  return dataset.hourlySummaries
    .filter((item) => item.dateKey === dateKey)
    .sort((a, b) => a.hour - b.hour);
}

export function getTicketsForHour(dataset: AppDataset, dateKey: string, hour: number): TicketSummary[] {
  return dataset.ticketSummaries
    .filter((item) => item.dateKey === dateKey && item.hour === hour)
    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
}

export function getDatasetHeadline(dataset: AppDataset) {
  const totalSales = dataset.dailySummaries.reduce((sum, item) => sum + item.sales, 0);
  const totalTransactions = dataset.dailySummaries.reduce((sum, item) => sum + item.transactions, 0);
  const totalLaborCost = dataset.dailySummaries.reduce((sum, item) => sum + item.laborCost, 0);
  const totalLaborHours = dataset.dailySummaries.reduce((sum, item) => sum + item.laborHours, 0);

  return {
    totalSales,
    totalTransactions,
    totalLaborCost,
    totalLaborHours,
    avgLaborPct: totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0,
  };
}

export function getCalendarMonthDays(dataset: AppDataset, year: number, monthIndex: number) {
  return dataset.dailySummaries.filter((item) => {
    const date = new Date(`${item.dateKey}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() === monthIndex;
  });
}

export function getCalendarDayView(dataset: AppDataset, date: Date) {
  const dateKey = getDateKey(date);
  const day = findDailySummary(dataset, dateKey);
  const hours = getHourlyRowsForDate(dataset, dateKey);
  const maxSales = Math.max(1, ...hours.map((row) => row.sales));

  return {
    dateKey,
    day,
    topCards: day
      ? [
          { label: "Total Sales", value: formatMoney(day.sales) },
          { label: "Transactions", value: day.transactions.toLocaleString() },
          { label: "Labor Hours", value: day.laborHours.toFixed(1) },
          { label: "Avg Labor %", value: `${day.laborPct.toFixed(1)}%` },
          { label: "Weather", value: day.weatherSummary ?? "—" },
        ]
      : [],
    rows: hours.map((row) => ({
      hour: row.hour,
      hourLabel: formatHourLabel(row.hour),
      salesBarWidth: `${Math.max(8, Math.round((row.sales / maxSales) * 100))}%`,
      salesText: formatMoney(row.sales),
      transactions: row.transactions,
      people: row.people,
      avgTicketText: formatMoneySmall(row.avgTicket),
      laborText: `${row.laborPct.toFixed(1)}% · ${formatMoneySmall(row.salesPerLaborHour)}`,
      tag: row.status,
      tone: (
        row.status === "Peak Hour"
          ? "blue"
          : row.status === "Overstaffed"
          ? "red"
          : row.status === "Strong Efficiency"
          ? "green"
          : "yellow"
      ) as "blue" | "red" | "yellow" | "green",
    })),
  };
}

export function getWeeklyLaborPattern(dataset: AppDataset) {
  const weekdayMap = new Map<string, HourlySummary[]>();

  for (const row of dataset.hourlySummaries) {
    const date = new Date(`${row.dateKey}T00:00:00`);
    const weekday = WEEKDAY_NAMES[date.getDay()];
    const current = weekdayMap.get(weekday) ?? [];
    current.push(row);
    weekdayMap.set(weekday, current);
  }

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const rows = dayOrder.map((day) => {
    const cells = (weekdayMap.get(day) ?? []).filter((item) => item.sales > 0).sort((a, b) => a.hour - b.hour);
    const totalSales = cells.reduce((sum, item) => sum + item.sales, 0);
    const totalTransactions = cells.reduce((sum, item) => sum + item.transactions, 0);
    const totalLaborCost = cells.reduce((sum, item) => sum + item.laborCost, 0);
    const avgLaborPct = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;
    const peakHour = cells.reduce((best, item) => (item.sales > best.sales ? item : best), cells[0] ?? null);

    return {
      day,
      totalSales,
      totalTransactions,
      avgLaborPct,
      peakHour: peakHour?.hour ?? null,
      cells: cells.map((item) => ({
        hour: item.hour,
        sales: item.sales,
        transactions: item.transactions,
        people: item.people,
        laborCost: item.laborCost,
        laborPct: item.laborPct,
        salesPerLaborHour: item.salesPerLaborHour,
        status: (
          item.status === "Strong Efficiency"
            ? "Efficient"
            : item.status === "Peak Hour" || item.status === "Low Traffic"
            ? "Watch"
            : item.status
        ) as "Overstaffed" | "Efficient" | "Watch" | "Understaffed",
      })),
    };
  });

  const allCells = rows.flatMap((row) => row.cells);

  return {
    rows,
    summary: {
      totalSales: allCells.reduce((sum, cell) => sum + cell.sales, 0),
      avgLaborPct:
        allCells.reduce((sum, cell) => sum + cell.sales, 0) > 0
          ? (allCells.reduce((sum, cell) => sum + cell.laborCost, 0) /
              allCells.reduce((sum, cell) => sum + cell.sales, 0)) *
            100
          : 0,
      overstaffedCount: allCells.filter((cell) => cell.status === "Overstaffed").length,
      understaffedCount: allCells.filter((cell) => cell.status === "Understaffed").length,
      efficientCount: allCells.filter((cell) => cell.status === "Efficient").length,
    },
  };
}

export function getHourlyLaborAnalysis(dataset: AppDataset) {
  const byHour = new Map<number, HourlySummary[]>();

  for (const row of dataset.hourlySummaries) {
    if (row.sales <= 0) continue;
    const current = byHour.get(row.hour) ?? [];
    current.push(row);
    byHour.set(row.hour, current);
  }

  const rows = Array.from(byHour.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, items]) => {
      const sales = items.reduce((sum, item) => sum + item.sales, 0);
      const transactions = items.reduce((sum, item) => sum + item.transactions, 0);
      const laborHours = items.reduce((sum, item) => sum + item.laborHours, 0);
      const laborCost = items.reduce((sum, item) => sum + item.laborCost, 0);
      const people = items.length > 0 ? Math.round(items.reduce((sum, item) => sum + item.people, 0) / items.length) : 0;
      const laborPct = sales > 0 ? (laborCost / sales) * 100 : 0;
      const avgTicket = transactions > 0 ? sales / transactions : 0;
      const salesPerLaborHour = laborHours > 0 ? sales / laborHours : 0;

      let status: "Overstaffed" | "Efficient" | "Watch" | "Understaffed" = "Watch";
      let recommendation = "Monitor";
      if (laborPct > 30) {
        status = "Overstaffed";
        recommendation = "Check if 1 person can be cut";
      } else if (laborPct < 18) {
        status = "Efficient";
        recommendation = "Good fit";
      } else if (people <= 2 && sales >= 170) {
        status = "Understaffed";
        recommendation = "Add support";
      }

      return {
        hour,
        sales,
        transactions,
        people,
        laborHours,
        laborCost,
        laborPct,
        salesPerLaborHour,
        avgTicket,
        status,
        recommendation,
      };
    });

  const summary = rows.reduce(
    (acc, row) => {
      acc.sales += row.sales;
      acc.transactions += row.transactions;
      acc.laborHours += row.laborHours;
      acc.laborCost += row.laborCost;
      if (row.status === "Overstaffed") acc.overstaffedHours += 1;
      if (row.status === "Efficient") acc.efficientHours += 1;
      if (row.status === "Understaffed") acc.understaffedHours += 1;
      return acc;
    },
    {
      sales: 0,
      transactions: 0,
      laborHours: 0,
      laborCost: 0,
      overstaffedHours: 0,
      efficientHours: 0,
      understaffedHours: 0,
    },
  );

  return {
    rows,
    summary,
    avgLaborPct: summary.sales > 0 ? (summary.laborCost / summary.sales) * 100 : 0,
  };
}
