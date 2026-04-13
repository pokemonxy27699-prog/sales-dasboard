import { useEffect, useMemo, useState } from "react";
import { loadLaborDataset, loadSalesDataset } from "../../lib/data/storage";
import type { LaborDataset, SalesDataset, SalesHourlyRow } from "../../types/data";

type CalendarView = "year" | "month" | "week" | "day";

type DayRow = {
  date: string;
  sales: number;
  transactions: number;
  guests: number;
  laborHours: number;
  laborCost: number;
  laborPct: number;
};

type RangeSummary = {
  totalSales: number;
  totalTransactions: number;
  avgLaborPct: number;
  daysLoaded: number;
};

function formatMoney0(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatMoney2(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, 0, 1);
}

function startOfWeekMonday(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function endOfWeekMonday(date: Date) {
  return addDays(startOfWeekMonday(date), 6);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getMonthWeeks(date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeekMonday(monthStart);
  const weeks: Date[][] = [];

  let cursor = new Date(gridStart);

  while (cursor <= monthEnd || cursor.getDay() !== 1) {
    const week: Date[] = [];

    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }

    const intersectsMonth = week.some(
      (day) => day.getMonth() === date.getMonth() && day.getFullYear() === date.getFullYear(),
    );

    if (intersectsMonth) {
      weeks.push(week);
    }

    if (cursor > monthEnd && cursor.getDay() === 1) {
      break;
    }
  }

  return weeks;
}

function getWeekDays(date: Date) {
  const start = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getYearMonths(date: Date) {
  return Array.from({ length: 12 }, (_, index) => new Date(date.getFullYear(), index, 1));
}

function buildDayRows(sales: SalesDataset | null, labor: LaborDataset | null): DayRow[] {
  const salesMap = new Map((sales?.daily ?? []).map((row) => [row.date, row]));
  const laborMap = new Map((labor?.daily ?? []).map((row) => [row.date, row]));
  const allDates = Array.from(
    new Set([
      ...(sales?.daily ?? []).map((row) => row.date),
      ...(labor?.daily ?? []).map((row) => row.date),
    ]),
  ).sort();

  return allDates.map((date) => {
    const salesRow = salesMap.get(date);
    const laborRow = laborMap.get(date);
    const salesValue = salesRow?.netSalesAmt ?? 0;
    const laborCost = laborRow?.totalCost ?? 0;

    return {
      date,
      sales: salesValue,
      transactions: salesRow?.transactionQty ?? 0,
      guests: salesRow?.guestCount ?? 0,
      laborHours: laborRow?.totalHours ?? 0,
      laborCost,
      laborPct: salesValue > 0 ? (laborCost / salesValue) * 100 : 0,
    };
  });
}

function summarizeRows(rows: DayRow[]): RangeSummary {
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalTransactions = rows.reduce((sum, row) => sum + row.transactions, 0);
  const totalLaborCost = rows.reduce((sum, row) => sum + row.laborCost, 0);

  return {
    totalSales,
    totalTransactions,
    avgLaborPct: totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0,
    daysLoaded: rows.length,
  };
}

function getDayTone(laborPct: number) {
  if (laborPct >= 35) return "border-rose-300/25 bg-rose-400/10";
  if (laborPct >= 28) return "border-amber-300/25 bg-amber-400/10";
  if (laborPct > 0 && laborPct <= 20) return "border-emerald-300/25 bg-emerald-400/10";
  return "border-white/10 bg-white/5";
}

function getWeekTag(laborPct: number, sales: number) {
  if (sales <= 0) return "No data";
  if (laborPct >= 35) return "High labor";
  if (laborPct >= 29) return "Watch";
  if (laborPct <= 20) return "Efficient";
  return "Strong";
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatHourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${suffix}`;
}

export function CalendarPage() {
  const [sales, setSales] = useState<SalesDataset | null>(null);
  const [labor, setLabor] = useState<LaborDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const [salesDataset, laborDataset] = await Promise.all([
          loadSalesDataset(),
          loadLaborDataset(),
        ]);

        if (!active) return;
        setSales(salesDataset);
        setLabor(laborDataset);

        const minDate = salesDataset?.meta.minDate ?? laborDataset?.meta.minDate;
        if (minDate) {
          setAnchorDate(parseDateKey(minDate));
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load calendar analytics.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  const dayRows = useMemo(() => buildDayRows(sales, labor), [sales, labor]);
  const dayMap = useMemo(() => new Map(dayRows.map((row) => [row.date, row])), [dayRows]);

  const scopedRows = useMemo(() => {
    if (view === "year") {
      return dayRows.filter((row) => {
        const d = parseDateKey(row.date);
        return d.getFullYear() === anchorDate.getFullYear();
      });
    }

    if (view === "month") {
      return dayRows.filter((row) => {
        const d = parseDateKey(row.date);
        return d.getFullYear() === anchorDate.getFullYear() && d.getMonth() === anchorDate.getMonth();
      });
    }

    if (view === "week") {
      const start = startOfWeekMonday(anchorDate);
      const end = endOfWeekMonday(anchorDate);
      return dayRows.filter((row) => {
        const d = parseDateKey(row.date);
        return d >= start && d <= end;
      });
    }

    const key = formatDateKey(anchorDate);
    return dayRows.filter((row) => row.date === key);
  }, [anchorDate, dayRows, view]);

  const summary = useMemo(() => summarizeRows(scopedRows), [scopedRows]);
  const monthWeeks = useMemo(() => getMonthWeeks(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);
  const yearMonths = useMemo(() => getYearMonths(anchorDate), [anchorDate]);

  const selectedDateKey = formatDateKey(anchorDate);
  const selectedDay =
    dayMap.get(selectedDateKey) ?? {
      date: selectedDateKey,
      sales: 0,
      transactions: 0,
      guests: 0,
      laborHours: 0,
      laborCost: 0,
      laborPct: 0,
    };

  const selectedHourlyRows = useMemo(() => {
    return [...(sales?.hourly ?? [])]
      .filter((row) => row.date === selectedDateKey)
      .sort((a, b) => a.hour - b.hour);
  }, [sales, selectedDateKey]);

  function goPrev() {
    if (view === "day") setAnchorDate((current) => addDays(current, -1));
    else if (view === "week") setAnchorDate((current) => addDays(current, -7));
    else if (view === "month") setAnchorDate((current) => addMonths(current, -1));
    else setAnchorDate((current) => addYears(current, -1));
  }

  function goNext() {
    if (view === "day") setAnchorDate((current) => addDays(current, 1));
    else if (view === "week") setAnchorDate((current) => addDays(current, 7));
    else if (view === "month") setAnchorDate((current) => addMonths(current, 1));
    else setAnchorDate((current) => addYears(current, 1));
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  if (isLoading) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">Loading calendar...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>;
  }

  if (!sales && !labor) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        No saved data found. Import sales and labor first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/15 via-blue-400/10 to-transparent p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Calendar analytics</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Sales + labor by date</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              KPI cards now scope to the visible year, month, week, or day.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["year", "month", "week", "day"] as CalendarView[]).map((item) => {
              const active = item === view;
              return (
                <button
                  key={item}
                  onClick={() => setView(item)}
                  className={[
                    "rounded-2xl px-4 py-2 text-sm capitalize transition",
                    active
                      ? "bg-cyan-400/15 text-white ring-1 ring-cyan-300/30"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={goPrev} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            Prev
          </button>
          <button onClick={goToday} className="rounded-2xl bg-cyan-400/15 px-4 py-2 text-sm text-cyan-100 ring-1 ring-cyan-300/20">
            Today
          </button>
          <button onClick={goNext} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            Next
          </button>

          <div className="ml-auto rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm text-slate-300">
            {view === "year"
              ? String(anchorDate.getFullYear())
              : view === "month"
                ? formatMonthYear(anchorDate)
                : view === "week"
                  ? `${formatFullDate(startOfWeekMonday(anchorDate))} ? ${formatFullDate(endOfWeekMonday(anchorDate))}`
                  : formatFullDate(anchorDate)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total sales</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatMoney0(summary.totalSales)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Transactions</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.totalTransactions.toLocaleString()}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Average labor %</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.avgLaborPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Days loaded</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.daysLoaded.toLocaleString()}</p>
        </div>
      </section>

      {view === "month" ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 grid grid-cols-[repeat(7,minmax(0,1fr))_220px] gap-2 text-center text-xs uppercase tracking-[0.16em] text-slate-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day}>{day}</div>
            ))}
            <div>Week summary</div>
          </div>

          <div className="space-y-2">
            {monthWeeks.map((week, index) => {
              const weekRows = week
                .map((day) => dayMap.get(formatDateKey(day)))
                .filter((row): row is DayRow => Boolean(row));

              const weekSales = weekRows.reduce((sum, row) => sum + row.sales, 0);
              const weekTransactions = weekRows.reduce((sum, row) => sum + row.transactions, 0);
              const weekLaborHours = weekRows.reduce((sum, row) => sum + row.laborHours, 0);
              const weekLaborCost = weekRows.reduce((sum, row) => sum + row.laborCost, 0);
              const weekLaborPct = weekSales > 0 ? (weekLaborCost / weekSales) * 100 : 0;

              return (
                <div key={index} className="grid grid-cols-[repeat(7,minmax(0,1fr))_220px] gap-2">
                  {week.map((date) => {
                    const dateKey = formatDateKey(date);
                    const row = dayMap.get(dateKey);
                    const inCurrentMonth =
                      date.getMonth() === anchorDate.getMonth() &&
                      date.getFullYear() === anchorDate.getFullYear();
                    const selected = dateKey === selectedDateKey;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          setAnchorDate(date);
                          setView("day");
                        }}
                        className={[
                          "min-h-[108px] rounded-2xl border p-3 text-left transition",
                          row ? getDayTone(row.laborPct) : "border-white/10 bg-white/5",
                          !inCurrentMonth ? "opacity-30" : "",
                          selected ? "ring-1 ring-cyan-300/30" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{date.getDate()}</span>
                          {row ? (
                            <span className="text-[10px] uppercase tracking-[0.14em] text-cyan-100">live</span>
                          ) : null}
                        </div>

                        {row ? (
                          <div className="mt-3 space-y-1 text-xs text-slate-200">
                            <div>Sales {formatMoney0(row.sales)}</div>
                            <div>Txn {row.transactions}</div>
                            <div>Labor {row.laborPct.toFixed(1)}%</div>
                          </div>
                        ) : (
                          <div className="mt-5 text-xs text-slate-600">No data</div>
                        )}
                      </button>
                    );
                  })}

                  <div
                    className={[
                      "rounded-2xl border p-3",
                      getDayTone(weekLaborPct),
                    ].join(" ")}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Week {index + 1}</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-100">
                      <div>Sales {formatMoney0(weekSales)}</div>
                      <div>Txn {weekTransactions.toLocaleString()}</div>
                      <div>Hours {weekLaborHours.toFixed(1)}</div>
                      <div>Labor {weekLaborPct.toFixed(1)}%</div>
                    </div>
                    <div className="mt-3">
                      <span className="inline-flex rounded-full border border-white/10 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
                        {getWeekTag(weekLaborPct, weekSales)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "week" ? (
        <div className="space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {weekDays.map((date) => {
              const row = dayMap.get(formatDateKey(date));

              return (
                <button
                  key={formatDateKey(date)}
                  onClick={() => {
                    setAnchorDate(date);
                    setView("day");
                  }}
                  className={[
                    "rounded-2xl border p-4 text-left",
                    row ? getDayTone(row.laborPct) : "border-white/10 bg-white/5",
                  ].join(" ")}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{date.getDate()}</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <div>Sales {row ? formatMoney0(row.sales) : "�"}</div>
                    <div>Txn {row ? row.transactions.toLocaleString() : "�"}</div>
                    <div>Labor {row ? `${row.laborPct.toFixed(1)}%` : "�"}</div>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Week sales</p>
              <p className="mt-3 text-3xl font-semibold text-white">{formatMoney0(summary.totalSales)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Week transactions</p>
              <p className="mt-3 text-3xl font-semibold text-white">{summary.totalTransactions.toLocaleString()}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Week labor %</p>
              <p className="mt-3 text-3xl font-semibold text-white">{summary.avgLaborPct.toFixed(1)}%</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Week days loaded</p>
              <p className="mt-3 text-3xl font-semibold text-white">{summary.daysLoaded.toLocaleString()}</p>
            </div>
          </section>
        </div>
      ) : null}

      {view === "year" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {yearMonths.map((monthDate) => {
            const monthRows = dayRows.filter((row) => {
              const d = parseDateKey(row.date);
              return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
            });

            const monthSummary = summarizeRows(monthRows);

            return (
              <button
                key={monthDate.toISOString()}
                onClick={() => {
                  setAnchorDate(monthDate);
                  setView("month");
                }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {monthDate.toLocaleDateString(undefined, { month: "long" })}
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <div>Sales {formatMoney0(monthSummary.totalSales)}</div>
                  <div>Txn {monthSummary.totalTransactions.toLocaleString()}</div>
                  <div>Labor {monthSummary.avgLaborPct.toFixed(1)}%</div>
                  <div>Days {monthSummary.daysLoaded.toLocaleString()}</div>
                </div>
              </button>
            );
          })}
        </section>
      ) : null}

      {view === "day" ? (
        <div className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Selected day</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{formatFullDate(anchorDate)}</h3>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                Labor % {selectedDay.laborPct.toFixed(1)}%
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sales</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatMoney0(selectedDay.sales)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Transactions</p>
                <p className="mt-2 text-2xl font-semibold text-white">{selectedDay.transactions.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Guests</p>
                <p className="mt-2 text-2xl font-semibold text-white">{selectedDay.guests.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor hours</p>
                <p className="mt-2 text-2xl font-semibold text-white">{selectedDay.laborHours.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor cost</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatMoney2(selectedDay.laborCost)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Hourly sales timeline</h3>
              <span className="text-sm text-slate-400">Hours now use corrected AM/PM parsing</span>
            </div>

            {selectedHourlyRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-slate-300">
                No hourly sales rows found for this date.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedHourlyRows.map((row: SalesHourlyRow) => (
                  <div
                    key={`${row.date}-${row.hour}`}
                    className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-5"
                  >
                    <div className="text-white">{formatHourLabel(row.hour)}</div>
                    <div className="text-slate-200">Sales {formatMoney2(row.netSalesAmt)}</div>
                    <div className="text-slate-200">Txn {row.transactionQty}</div>
                    <div className="text-slate-200">Guests {row.guestCount}</div>
                    <div className="text-slate-200">Tips {formatMoney2(row.creditTips)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
