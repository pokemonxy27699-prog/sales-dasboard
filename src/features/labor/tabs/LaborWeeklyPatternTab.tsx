type WeekdayKey =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type WeeklyCell = {
  hour: number;
  sales: number;
  transactions: number;
  people: number;
  laborCost: number;
  laborPct: number;
  salesPerLaborHour: number;
  optimalPeople: number;
  variance: number;
  status: "Overstaffed" | "Efficient" | "Watch" | "Understaffed";
  recommendation: string;
};

type WeeklyRow = {
  day: WeekdayKey;
  totalSales: number;
  totalTransactions: number;
  avgLaborPct: number;
  peakHour: number;
  cells: WeeklyCell[];
};

const LABOR_RATE = 18;
const TARGET_SALES_PER_LABOR_HOUR = 90;

const dayOrder: WeekdayKey[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const baseSalesByHour = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  120, 165, 210, 255, 310, 360, 395, 380, 315, 235, 155, 0, 0,
];

const dayMultipliers: Record<WeekdayKey, number> = {
  Monday: 0.72,
  Tuesday: 0.70,
  Wednesday: 0.78,
  Thursday: 0.88,
  Friday: 1.08,
  Saturday: 1.28,
  Sunday: 1.00,
};

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatHourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${suffix}`;
}

function getStatusTone(status: WeeklyCell["status"]) {
  if (status === "Overstaffed") {
    return {
      card: "border-rose-300/20 bg-rose-400/10",
      badge: "border border-rose-300/25 bg-rose-400/15 text-rose-100",
      dot: "bg-rose-300",
    };
  }

  if (status === "Efficient") {
    return {
      card: "border-emerald-300/20 bg-emerald-400/10",
      badge: "border border-emerald-300/25 bg-emerald-400/15 text-emerald-100",
      dot: "bg-emerald-300",
    };
  }

  if (status === "Understaffed") {
    return {
      card: "border-amber-300/20 bg-amber-400/10",
      badge: "border border-amber-300/25 bg-amber-400/15 text-amber-100",
      dot: "bg-amber-300",
    };
  }

  return {
    card: "border-white/10 bg-white/5",
    badge: "border border-white/10 bg-white/5 text-slate-200",
    dot: "bg-slate-400",
  };
}

function buildPeople(day: WeekdayKey, hour: number) {
  if (hour < 11 || hour > 21) return 0;

  if (day === "Saturday") {
    if (hour <= 12) return 3;
    if (hour <= 18) return 5;
    return 4;
  }

  if (day === "Friday") {
    if (hour <= 12) return 3;
    if (hour <= 18) return 4;
    return 4;
  }

  if (day === "Sunday") {
    if (hour <= 12) return 3;
    if (hour <= 18) return 4;
    return 3;
  }

  if (hour <= 12) return 2;
  if (hour <= 18) return 3;
  return 3;
}

function buildWeeklyRows(): WeeklyRow[] {
  return dayOrder.map((day) => {
    const multiplier = dayMultipliers[day];

    const cells = baseSalesByHour.map((baseSales, hour) => {
      const sales = Math.round(baseSales * multiplier);
      const transactions = sales > 0 ? Math.max(1, Math.round(sales / 8.75)) : 0;
      const people = buildPeople(day, hour);
      const laborCost = people * LABOR_RATE;
      const laborPct = sales > 0 ? (laborCost / sales) * 100 : 0;
      const salesPerLaborHour = people > 0 ? sales / people : 0;
      const optimalPeople = sales > 0 ? Math.max(1, Math.ceil(sales / TARGET_SALES_PER_LABOR_HOUR)) : 0;
      const variance = people - optimalPeople;

      let status: WeeklyCell["status"] = "Watch";
      let recommendation = "Keep current staffing";

      if (sales === 0 && transactions === 0) {
        status = "Watch";
        recommendation = "Closed hour";
      } else if (people > optimalPeople) {
        status = "Overstaffed";
        recommendation = `Cut ${people - optimalPeople}`;
      } else if (people < optimalPeople) {
        status = "Understaffed";
        recommendation = `Add ${optimalPeople - people}`;
      } else if (laborPct <= 20) {
        status = "Efficient";
        recommendation = "Good fit";
      } else {
        status = "Watch";
        recommendation = "Monitor";
      }

      return {
        hour,
        sales,
        transactions,
        people,
        laborCost,
        laborPct,
        salesPerLaborHour,
        optimalPeople,
        variance,
        status,
        recommendation,
      };
    });

    const openCells = cells.filter((cell) => cell.transactions > 0);
    const totalSales = openCells.reduce((sum, cell) => sum + cell.sales, 0);
    const totalTransactions = openCells.reduce((sum, cell) => sum + cell.transactions, 0);
    const totalLaborCost = openCells.reduce((sum, cell) => sum + cell.laborCost, 0);
    const avgLaborPct = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;
    const peakCell = openCells.reduce(
      (best, current) => (current.sales > best.sales ? current : best),
      openCells[0]
    );

    return {
      day,
      totalSales,
      totalTransactions,
      avgLaborPct,
      peakHour: peakCell?.hour ?? 0,
      cells,
    };
  });
}

export function LaborWeeklyPatternTab() {
  const rows = buildWeeklyRows();

  const visibleHours = Array.from({ length: 24 }, (_, hour) => hour).filter((hour) =>
    rows.some((row) => row.cells[hour].transactions > 0)
  );

  const visibleCells = rows.flatMap((row) =>
    visibleHours.map((hour) => row.cells[hour]).filter((cell) => cell.transactions > 0)
  );

  const totalSales = visibleCells.reduce((sum, cell) => sum + cell.sales, 0);
  const totalLaborCost = visibleCells.reduce((sum, cell) => sum + cell.laborCost, 0);
  const avgLaborPct = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;
  const overstaffedCount = visibleCells.filter((cell) => cell.status === "Overstaffed").length;
  const understaffedCount = visibleCells.filter((cell) => cell.status === "Understaffed").length;
  const efficientCount = visibleCells.filter((cell) => cell.status === "Efficient").length;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Weekly labor pattern</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Weekday staffing pattern grid</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Only hours with activity are shown. This view is built for schedule decisions by weekday.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
            Optimal people target: ${TARGET_SALES_PER_LABOR_HOUR}/labor hour
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Weekly Sales</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(totalSales)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Avg Labor %</p>
          <p className="mt-2 text-2xl font-semibold text-white">{avgLaborPct.toFixed(1)}%</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Overstaffed Cells</p>
          <p className="mt-2 text-2xl font-semibold text-white">{overstaffedCount}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Understaffed Cells</p>
          <p className="mt-2 text-2xl font-semibold text-white">{understaffedCount}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Efficient Cells</p>
          <p className="mt-2 text-2xl font-semibold text-white">{efficientCount}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Pattern grid</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Mon–Sun by active hour</h3>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1500px] space-y-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `220px repeat(${visibleHours.length}, minmax(110px, 1fr))` }}
            >
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                Day
              </div>

              {visibleHours.map((hour) => (
                <div
                  key={hour}
                  className="rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300"
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {rows.map((row) => (
              <div
                key={row.day}
                className="grid gap-3"
                style={{ gridTemplateColumns: `220px repeat(${visibleHours.length}, minmax(110px, 1fr))` }}
              >
                <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-base font-semibold text-white">{row.day}</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-300">
                    <p>Sales {formatMoney(row.totalSales)}</p>
                    <p>Txn {row.totalTransactions}</p>
                    <p>Labor {row.avgLaborPct.toFixed(1)}%</p>
                    <p>Peak {formatHourLabel(row.peakHour)}</p>
                  </div>
                </div>

                {visibleHours.map((hour) => {
                  const cell = row.cells[hour];
                  const tone = getStatusTone(cell.status);

                  return (
                    <div
                      key={`${row.day}-${hour}`}
                      className={[
                        "min-h-[156px] rounded-3xl border p-3",
                        tone.card,
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{formatMoney(cell.sales)}</p>
                        <span className={["rounded-full px-2.5 py-1 text-[10px] font-medium", tone.badge].join(" ")}>
                          {cell.people}/{cell.optimalPeople}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                        <p>Txn {cell.transactions}</p>
                        <p>People {cell.people}</p>
                        <p>Labor {cell.laborPct.toFixed(0)}%</p>
                        <p>$ / Hr {formatMoney(cell.salesPerLaborHour)}</p>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <span className={["h-2.5 w-2.5 rounded-full", tone.dot].join(" ")} />
                        <p className="text-xs font-medium text-white">{cell.recommendation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rows.map((row) => {
          const overstaffed = row.cells.filter((cell) => cell.status === "Overstaffed" && cell.transactions > 0);
          const understaffed = row.cells.filter((cell) => cell.status === "Understaffed" && cell.transactions > 0);

          return (
            <div key={`${row.day}-summary`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{row.day}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Schedule signal</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
                  Peak {formatHourLabel(row.peakHour)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Overstaffed windows</p>
                  <p className="mt-2 text-sm text-slate-200">
                    {overstaffed.length > 0
                      ? overstaffed.slice(0, 4).map((cell) => formatHourLabel(cell.hour)).join(", ")
                      : "None"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Understaffed windows</p>
                  <p className="mt-2 text-sm text-slate-200">
                    {understaffed.length > 0
                      ? understaffed.slice(0, 4).map((cell) => formatHourLabel(cell.hour)).join(", ")
                      : "None"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
