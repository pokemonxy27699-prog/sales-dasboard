import { useMemo } from "react";
import { useAppData } from "../../../lib/data/DataContext";
import { formatHourLabel, formatMoney, getWeeklyLaborPattern } from "../../../lib/data/selectors";

function getStatusTone(status: "Overstaffed" | "Efficient" | "Watch" | "Understaffed") {
  if (status === "Overstaffed") {
    return {
      card: "border-rose-300/20 bg-rose-400/10",
      badge: "border border-rose-300/25 bg-rose-400/15 text-rose-100",
    };
  }
  if (status === "Efficient") {
    return {
      card: "border-emerald-300/20 bg-emerald-400/10",
      badge: "border border-emerald-300/25 bg-emerald-400/15 text-emerald-100",
    };
  }
  if (status === "Understaffed") {
    return {
      card: "border-amber-300/20 bg-amber-400/10",
      badge: "border border-amber-300/25 bg-amber-400/15 text-amber-100",
    };
  }
  return {
    card: "border-white/10 bg-white/5",
    badge: "border border-white/10 bg-white/5 text-slate-200",
  };
}

export function LaborWeeklyPatternTab() {
  const { dataset } = useAppData();
  const pattern = useMemo(() => getWeeklyLaborPattern(dataset), [dataset]);

  if (pattern.rows.every((row) => row.cells.length === 0)) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-white">
        No weekly labor pattern dataset yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Weekly labor pattern</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Weekday staffing pattern grid</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Only active hours are shown. This now reads the shared selector layer.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
            Dataset mode: {dataset.meta.mode}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Weekly Sales</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(pattern.summary.totalSales)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Avg Labor %</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pattern.summary.avgLaborPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Overstaffed Cells</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pattern.summary.overstaffedCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Understaffed Cells</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pattern.summary.understaffedCount}</p>
        </div>
      </section>

      <div className="space-y-4">
        {pattern.rows.map((row) => (
          <section key={row.day} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">{row.day}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Sales {formatMoney(row.totalSales)} · Txn {row.totalTransactions.toLocaleString()} · Avg labor {row.avgLaborPct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm text-slate-300">
                Peak hour {row.peakHour === null ? "—" : formatHourLabel(row.peakHour)}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {row.cells.map((cell) => {
                const tone = getStatusTone(cell.status);

                return (
                  <div key={`${row.day}-${cell.hour}`} className={["rounded-2xl border p-4", tone.card].join(" ")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{formatHourLabel(cell.hour)}</p>
                        <p className="mt-1 text-xs text-slate-300">Sales {formatMoney(cell.sales)}</p>
                      </div>
                      <span className={["inline-flex rounded-full px-3 py-1 text-[11px] font-medium", tone.badge].join(" ")}>
                        {cell.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200">
                      <div>Txn {cell.transactions}</div>
                      <div>People {cell.people}</div>
                      <div>Labor {cell.laborPct.toFixed(1)}%</div>
                      <div>$ / Hr {formatMoney(cell.salesPerLaborHour)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
