import { useEffect, useMemo, useState } from "react";
import { loadLaborDataset, loadSalesDataset } from "../../lib/data/storage";
import type { LaborDataset, SalesDataset } from "../../types/data";

type LaborView = "overview" | "daily" | "weekly";

type DayRow = {
  date: string;
  sales: number;
  transactions: number;
  laborHours: number;
  laborCost: number;
  laborPct: number;
  salesPerLaborHour: number;
  employeeCount: number;
};

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getWeekday(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function buildRows(sales: SalesDataset | null, labor: LaborDataset | null): DayRow[] {
  const salesMap = new Map((sales?.daily ?? []).map((row) => [row.date, row]));
  const rows = (labor?.daily ?? []).map((laborRow) => {
    const salesRow = salesMap.get(laborRow.date);
    const salesValue = salesRow?.netSalesAmt ?? 0;

    return {
      date: laborRow.date,
      sales: salesValue,
      transactions: salesRow?.transactionQty ?? 0,
      laborHours: laborRow.totalHours,
      laborCost: laborRow.totalCost,
      laborPct: salesValue > 0 ? (laborRow.totalCost / salesValue) * 100 : 0,
      salesPerLaborHour: laborRow.totalHours > 0 ? salesValue / laborRow.totalHours : 0,
      employeeCount: laborRow.employeeCount,
    };
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function LaborPage() {
  const [sales, setSales] = useState<SalesDataset | null>(null);
  const [labor, setLabor] = useState<LaborDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<LaborView>("overview");

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
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load labor analytics.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => buildRows(sales, labor), [sales, labor]);

  const summary = useMemo(() => {
    const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
    const totalTransactions = rows.reduce((sum, row) => sum + row.transactions, 0);
    const totalHours = rows.reduce((sum, row) => sum + row.laborHours, 0);
    const totalCost = rows.reduce((sum, row) => sum + row.laborCost, 0);
    const avgLaborPct = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;
    const avgSalesPerLaborHour = totalHours > 0 ? totalSales / totalHours : 0;
    const peakEmployees = rows.reduce((max, row) => Math.max(max, row.employeeCount), 0);

    return {
      totalSales,
      totalTransactions,
      totalHours,
      totalCost,
      avgLaborPct,
      avgSalesPerLaborHour,
      peakEmployees,
      days: rows.length,
    };
  }, [rows]);

  const worstLaborDays = useMemo(() => {
    return [...rows]
      .filter((row) => row.sales > 0)
      .sort((a, b) => b.laborPct - a.laborPct)
      .slice(0, 15);
  }, [rows]);

  const bestEfficiencyDays = useMemo(() => {
    return [...rows]
      .filter((row) => row.laborHours > 0)
      .sort((a, b) => b.salesPerLaborHour - a.salesPerLaborHour)
      .slice(0, 15);
  }, [rows]);

  const weekdayPattern = useMemo(() => {
    const map = new Map<string, { days: number; sales: number; cost: number; hours: number; transactions: number }>();

    for (const row of rows) {
      const weekday = getWeekday(row.date);
      const current = map.get(weekday) ?? { days: 0, sales: 0, cost: 0, hours: 0, transactions: 0 };
      current.days += 1;
      current.sales += row.sales;
      current.cost += row.laborCost;
      current.hours += row.laborHours;
      current.transactions += row.transactions;
      map.set(weekday, current);
    }

    const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    return order.map((weekday) => {
      const value = map.get(weekday) ?? { days: 0, sales: 0, cost: 0, hours: 0, transactions: 0 };
      return {
        weekday,
        days: value.days,
        avgSales: value.days > 0 ? value.sales / value.days : 0,
        avgTransactions: value.days > 0 ? value.transactions / value.days : 0,
        avgHours: value.days > 0 ? value.hours / value.days : 0,
        avgLaborPct: value.sales > 0 ? (value.cost / value.sales) * 100 : 0,
        avgSalesPerLaborHour: value.hours > 0 ? value.sales / value.hours : 0,
      };
    });
  }, [rows]);

  const latestRows = useMemo(() => {
    return [...rows].reverse().slice(0, 20);
  }, [rows]);

  if (isLoading) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">Loading labor...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>;
  }

  if (!labor) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        No saved labor dataset found. Import labor first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/15 via-blue-400/10 to-transparent p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Labor</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Labor analytics</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This page now runs on the current labor dataset plus matched sales by date.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["overview", "daily", "weekly"] as LaborView[]).map((item) => {
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
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor hours</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.totalHours.toFixed(1)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor cost</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(summary.totalCost)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sales matched</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(summary.totalSales)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Avg labor %</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.avgLaborPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">$ / labor hour</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(summary.avgSalesPerLaborHour)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Peak employees</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.peakEmployees}</p>
        </div>
      </section>

      {view === "overview" ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-semibold text-white">Worst labor % days</h3>
            <div className="mt-4 space-y-3">
              {worstLaborDays.map((row) => (
                <div key={row.date} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-6">
                  <div className="text-white">{row.date}</div>
                  <div className="text-slate-200">Sales {formatMoney(row.sales)}</div>
                  <div className="text-slate-200">Hours {row.laborHours.toFixed(1)}</div>
                  <div className="text-slate-200">Cost {formatMoney(row.laborCost)}</div>
                  <div className="text-slate-200">Txn {row.transactions}</div>
                  <div className="text-slate-200">{row.laborPct.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-semibold text-white">Best sales per labor hour</h3>
            <div className="mt-4 space-y-3">
              {bestEfficiencyDays.map((row) => (
                <div key={row.date} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-6">
                  <div className="text-white">{row.date}</div>
                  <div className="text-slate-200">Sales {formatMoney(row.sales)}</div>
                  <div className="text-slate-200">Hours {row.laborHours.toFixed(1)}</div>
                  <div className="text-slate-200">Cost {formatMoney(row.laborCost)}</div>
                  <div className="text-slate-200">Txn {row.transactions}</div>
                  <div className="text-slate-200">{formatMoney(row.salesPerLaborHour)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {view === "daily" ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-xl font-semibold text-white">Latest labor days</h3>
          <div className="mt-4 space-y-3">
            {latestRows.map((row) => (
              <div key={row.date} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-7">
                <div className="text-white">{row.date}</div>
                <div className="text-slate-200">Sales {formatMoney(row.sales)}</div>
                <div className="text-slate-200">Txn {row.transactions}</div>
                <div className="text-slate-200">Hours {row.laborHours.toFixed(1)}</div>
                <div className="text-slate-200">Cost {formatMoney(row.laborCost)}</div>
                <div className="text-slate-200">Emp {row.employeeCount}</div>
                <div className="text-slate-200">{row.laborPct.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {view === "weekly" ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-xl font-semibold text-white">Weekday pattern</h3>
          <div className="mt-4 space-y-3">
            {weekdayPattern.map((row) => (
              <div key={row.weekday} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-6">
                <div className="text-white">{row.weekday}</div>
                <div className="text-slate-200">Avg sales {formatMoney(row.avgSales)}</div>
                <div className="text-slate-200">Avg txn {row.avgTransactions.toFixed(1)}</div>
                <div className="text-slate-200">Avg hours {row.avgHours.toFixed(1)}</div>
                <div className="text-slate-200">Labor {row.avgLaborPct.toFixed(1)}%</div>
                <div className="text-slate-200">$ / Hr {formatMoney(row.avgSalesPerLaborHour)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
        Current labor import is daily-level only. Hourly staffing and shift overlap views will need hourly or shift-level labor data in the importer.
      </section>
    </div>
  );
}
