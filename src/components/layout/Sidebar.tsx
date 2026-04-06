import type { NavKey } from "../../types/navigation";

type SidebarProps = {
  active: NavKey;
  onChange: (key: NavKey) => void;
};

const items: Array<{ key: NavKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "calendar", label: "Calendar Analytics" },
  { key: "transactions", label: "Transactions" },
  { key: "labor", label: "Labor" },
  { key: "inventory", label: "Inventory" },
  { key: "discounts", label: "Discounts" },
  { key: "loyalty", label: "Loyalty" },
  { key: "ai", label: "AI Analyst" },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-6 px-2">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Bruster&apos;s</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Operations Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Phase 1 shell
        </p>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = item.key === active;

          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={[
                "w-full rounded-2xl px-4 py-3 text-left text-sm transition",
                isActive
                  ? "bg-cyan-400/15 text-white ring-1 ring-cyan-300/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          Next
        </p>
        <p className="mt-2 text-sm text-amber-50/90">
          Add filters, drilldowns, and real data contracts.
        </p>
      </div>
    </aside>
  );
}
