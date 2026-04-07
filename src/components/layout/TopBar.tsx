import type { NavKey } from "../../types/navigation";

type TopBarProps = {
  active: NavKey;
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

export function TopBar({ active }: TopBarProps) {
  return (
    <header className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Frontend rebuild</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {pageTitles[active]}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            Date Filter
          </button>
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            Compare
          </button>
          <button className="rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-100">
            Upload Data
          </button>
        </div>
      </div>
    </header>
  );
}
