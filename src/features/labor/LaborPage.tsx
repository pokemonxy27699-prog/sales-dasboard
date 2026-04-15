import { useEffect, useMemo, useState } from "react";
import { loadLaborDataset, loadSalesDataset } from "../../lib/data/storage";
import { applyDateFilter } from "../../lib/dateFilter";
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

export function LaborPage({
  dateFilter,
}: {
  dateFilter: { start: string | null; end: string | null };
}) {
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

  // ?? FILTERED DATA
  const filteredSales = useMemo(() => {
    return sales
      ? { ...sales, daily: applyDateFilter(sales.daily, dateFilter) }
      : null;
  }, [sales, dateFilter]);

  const filteredLabor = useMemo(() => {
    return labor
      ? { ...labor, daily: applyDateFilter(labor.daily, dateFilter) }
      : null;
  }, [labor, dateFilter]);

  const rows = useMemo(() => buildRows(filteredSales, filteredLabor), [filteredSales, filteredLabor]);

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
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl text-white font-semibold">Labor (Filtered)</h2>
        <p className="text-sm text-slate-400 mt-2">
          Date range applied globally
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-slate-400">Labor hours</p>
          <p className="text-2xl text-white mt-2">{summary.totalHours.toFixed(1)}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-slate-400">Labor cost</p>
          <p className="text-2xl text-white mt-2">{formatMoney(summary.totalCost)}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-slate-400">Labor %</p>
          <p className="text-2xl text-white mt-2">{summary.avgLaborPct.toFixed(1)}%</p>
        </div>
      </section>
    </div>
  );
}

