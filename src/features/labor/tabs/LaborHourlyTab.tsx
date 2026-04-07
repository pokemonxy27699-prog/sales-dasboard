import { useMemo } from "react";
import { useAppData } from "../../../lib/data/DataContext";
import { formatHourLabel, formatMoney, formatMoneySmall, getHourlyLaborAnalysis } from "../../../lib/data/selectors";

function getStatusTone(status: "Overstaffed" | "Efficient" | "Watch" | "Understaffed") {
  if (status === "Overstaffed") {
    return {
      row: "border-rose-300/20 bg-rose-400/10",
      badge: "border border-rose-300/25 bg-rose-400/15 text-rose-100",
    };
  }
  if (status === "Efficient") {
    return {
      row: "border-emerald-300/20 bg-emerald-400/10",
      badge: "border border-emerald-300/25 bg-emerald-400/15 text-emerald-100",
    };
  }
  if (status === "Understaffed") {
    return {
      row: "border-amber-300/20 bg-amber-400/10",
      badge: "border border-amber-300/25 bg-amber-400/15 text-amber-100",
    };
  }
  return {
    row: "border-white/10 bg-white/5",
    badge: "border border-white/10 bg-white/5 text-slate-200",
  };
}

export function LaborHourlyTab() {
  const { dataset } = useAppData();
  const { rows, summary, avgLaborPct } = useMemo(() => getHourlyLaborAnalysis(dataset), [dataset]);

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-white">
        No hourly labor dataset yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Hourly labor analysis</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Staffing vs sales by hour</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              This view now reads the shared dataset instead of local mock generation.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
            Current mode: {dataset.meta.mode}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sales</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(summary.sales)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.transactions.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor Hours</p>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.laborHours.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor Cost</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(summary.laborCost)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Avg Labor %</p>
          <p className="mt-2 text-2xl font-semibold text-white">{avgLaborPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Overstaffed Hours</p>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.overstaffedHours}</p>
        </div>
      </section>

      <section className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="overflow-x-auto">
          <div className="min-w-[1040px]">
            <div className="mb-3 hidden grid-cols-[110px_100px_80px_80px_100px_90px_120px_110px_minmax(180px,1fr)] gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 xl:grid">
              <div>Hour</div>
              <div>Sales</div>
              <div>Txn</div>
              <div>People</div>
              <div>Labor $</div>
              <div>Labor %</div>
              <div>$ / Labor Hr</div>
              <div>Status</div>
              <div>Recommendation</div>
            </div>

            <div className="space-y-3">
              {rows.map((row) => {
                const tone = getStatusTone(row.status);

                return (
                  <div
                    key={row.hour}
                    className={["grid gap-3 rounded-2xl border p-4 xl:grid-cols-[110px_100px_80px_80px_100px_90px_120px_110px_minmax(180px,1fr)] xl:items-center", tone.row].join(" ")}
                  >
                    <div className="text-white">{formatHourLabel(row.hour)}</div>
                    <div className="font-semibold text-white">{formatMoney(row.sales)}</div>
                    <div className="text-slate-200">{row.transactions}</div>
                    <div className="text-slate-200">{row.people}</div>
                    <div className="text-slate-200">{formatMoney(row.laborCost)}</div>
                    <div className="text-slate-200">{row.laborPct.toFixed(1)}%</div>
                    <div className="text-slate-200">{formatMoneySmall(row.salesPerLaborHour)}</div>
                    <div>
                      <span className={["inline-flex rounded-full px-3 py-1 text-xs font-medium", tone.badge].join(" ")}>
                        {row.status}
                      </span>
                    </div>
                    <div className="text-slate-200">{row.recommendation}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
