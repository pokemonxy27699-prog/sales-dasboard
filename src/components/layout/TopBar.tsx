import type { NavKey } from "../../types/navigation";

type TopBarProps = {
  active: NavKey;
  dateFilter: {
    start: string | null;
    end: string | null;
  };
  setDateFilter: React.Dispatch<
    React.SetStateAction<{
      start: string | null;
      end: string | null;
    }>
  >;
};

const pageTitles: Record<NavKey, string> = {
  dashboard: "Dashboard",
  data: "Data Import",
  calendar: "Calendar Analytics",
  transactions: "Transactions",
  labor: "Labor",
  inventory: "Inventory",
  discounts: "Discounts",
  loyalty: "Loyalty",
  ai: "AI Analyst",
};

export function TopBar({ active, dateFilter, setDateFilter }: TopBarProps) {
  return (
    <header className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        {/* LEFT */}
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Frontend rebuild
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {pageTitles[active]}
          </h2>
        </div>

        {/* RIGHT */}
        <div className="flex flex-wrap items-center gap-2">

          {/* START DATE */}
          <input
            type="date"
            value={dateFilter.start ?? ""}
            onChange={(e) =>
              setDateFilter((prev) => ({
                ...prev,
                start: e.target.value || null,
              }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />

          {/* END DATE */}
          <input
            type="date"
            value={dateFilter.end ?? ""}
            onChange={(e) =>
              setDateFilter((prev) => ({
                ...prev,
                end: e.target.value || null,
              }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />

          {/* COMPARE (placeholder for now) */}
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            Compare
          </button>

        </div>
      </div>
    </header>
  );
}