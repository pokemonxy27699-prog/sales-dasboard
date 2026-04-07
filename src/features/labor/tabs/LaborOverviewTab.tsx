import { useAppData } from "../../../lib/data/DataContext";
import { formatMoney, getDatasetHeadline } from "../../../lib/data/selectors";

export function LaborOverviewTab() {
  const { dataset } = useAppData();
  const headline = getDatasetHeadline(dataset);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor Hours</p>
        <p className="mt-2 text-2xl font-semibold text-white">{headline.totalLaborHours.toFixed(1)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor Cost</p>
        <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(headline.totalLaborCost)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sales</p>
        <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(headline.totalSales)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Avg Labor %</p>
        <p className="mt-2 text-2xl font-semibold text-white">{headline.avgLaborPct.toFixed(1)}%</p>
      </div>
    </div>
  );
}
