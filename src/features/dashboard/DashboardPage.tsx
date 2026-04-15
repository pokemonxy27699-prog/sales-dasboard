import { useEffect, useMemo, useState } from "react";
import { loadLaborDataset, loadSalesDataset } from "../../lib/data/storage";
import { applyDateFilter } from "../../lib/dateFilter";
import type { LaborDataset, SalesDataset } from "../../types/data";

type LoadState = "loading" | "ready" | "empty" | "error";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DashboardPage({
  dateFilter,
}: {
  dateFilter: { start: string | null; end: string | null };
}) {
  const [sales, setSales] = useState<SalesDataset | null>(null);
  const [labor, setLabor] = useState<LaborDataset | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");

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

        if (!salesDataset && !laborDataset) {
          setState("empty");
          return;
        }

        setState("ready");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        setState("error");
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  // ?? FILTERED DATA
  const filteredSales = useMemo(() => {
    return sales
      ? {
          ...sales,
          daily: applyDateFilter(sales.daily, dateFilter),
        }
      : null;
  }, [sales, dateFilter]);

  const filteredLabor = useMemo(() => {
    return labor
      ? {
          ...labor,
          daily: applyDateFilter(labor.daily, dateFilter),
        }
      : null;
  }, [labor, dateFilter]);

  const metrics = useMemo(() => {
    const totalSales =
      filteredSales?.daily.reduce((sum, day) => sum + day.netSalesAmt, 0) ?? 0;

    const totalTransactions =
      filteredSales?.daily.reduce((sum, day) => sum + day.transactionQty, 0) ?? 0;

    const totalGuests =
      filteredSales?.daily.reduce((sum, day) => sum + day.guestCount, 0) ?? 0;

    const totalLaborHours =
      filteredLabor?.daily.reduce((sum, day) => sum + day.totalHours, 0) ?? 0;

    const totalLaborCost =
      filteredLabor?.daily.reduce((sum, day) => sum + day.totalCost, 0) ?? 0;

    const laborPct = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;

    return {
      totalSales,
      totalTransactions,
      totalGuests,
      totalLaborHours,
      totalLaborCost,
      laborPct,
      salesDays: filteredSales?.daily.length ?? 0,
      laborDays: filteredLabor?.daily.length ?? 0,
    };
  }, [filteredSales, filteredLabor]);

  if (state === "loading") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        Loading dashboard...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
        {error || "Dashboard failed to load."}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="mt-3 text-slate-300">
          No saved sales or labor data found yet. Go to Data Import and upload your folders first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/15 via-blue-400/10 to-transparent p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
          Dashboard
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Live imported data
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Filtered by selected date range.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Net sales</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(metrics.totalSales)}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Transactions</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.totalTransactions.toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Guests</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.totalGuests.toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor hours</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.totalLaborHours.toFixed(1)}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor cost</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {formatMoney(metrics.totalLaborCost)}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor %</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.laborPct.toFixed(1)}%
          </p>
        </div>
      </section>
    </div>
  );
}
