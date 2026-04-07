import { useAppData } from "../../../lib/data/DataContext";
import { formatMoney } from "../../../lib/data/selectors";

export function LaborDailyTab() {
  const { dataset } = useAppData();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {dataset.dailySummaries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-white">
          No daily labor dataset yet
        </div>
      ) : (
        dataset.dailySummaries
          .slice(-12)
          .reverse()
          .map((day) => (
            <div key={day.dateKey} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{day.dateKey}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>Sales {formatMoney(day.sales)}</div>
                <div>Labor Hours {day.laborHours.toFixed(1)}</div>
                <div>Labor {day.laborPct.toFixed(1)}%</div>
              </div>
            </div>
          ))
      )}
    </div>
  );
}
