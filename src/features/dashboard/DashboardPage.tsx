import { useEffect, useMemo, useState } from "react";
import { loadLaborDataset, loadSalesDataset } from "../../lib/data/storage";
import type { LaborDataset, SalesDataset } from "../../types/data";

type LoadState = "loading" | "ready" | "empty" | "error";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DashboardPage() {
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

  const metrics = useMemo(() => {
    const totalSales =
      sales?.daily.reduce((sum, day) => sum + day.netSalesAmt, 0) ?? 0;

    const totalTransactions =
      sales?.daily.reduce((sum, day) => sum + day.transactionQty, 0) ?? 0;

    const totalGuests =
      sales?.daily.reduce((sum, day) => sum + day.guestCount, 0) ?? 0;

    const totalLaborHours =
      labor?.daily.reduce((sum, day) => sum + day.totalHours, 0) ?? 0;

    const totalLaborCost =
      labor?.daily.reduce((sum, day) => sum + day.totalCost, 0) ?? 0;

    const laborPct = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;

    return {
      totalSales,
      totalTransactions,
      totalGuests,
      totalLaborHours,
      totalLaborCost,
      laborPct,
      salesDays: sales?.meta.dayCount ?? 0,
      laborDays: labor?.meta.dayCount ?? 0,
    };
  }, [sales, labor]);

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
          This dashboard is now reading from the current clean sales and labor datasets.
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sales dataset</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Coverage</h3>
          <p className="mt-3 text-sm text-slate-300">
            Days loaded: {metrics.salesDays.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Files imported: {sales?.meta.fileCount ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Range: {sales?.meta.minDate ?? "—"} ? {sales?.meta.maxDate ?? "—"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor dataset</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Coverage</h3>
          <p className="mt-3 text-sm text-slate-300">
            Days loaded: {metrics.laborDays.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Files imported: {labor?.meta.fileCount ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Range: {labor?.meta.minDate ?? "—"} ? {labor?.meta.maxDate ?? "—"}
          </p>
        </div>
      </section>
    </div>
  );
}
