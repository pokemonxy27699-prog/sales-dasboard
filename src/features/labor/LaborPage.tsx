import { useState } from "react";
import { LaborOverviewTab } from "./tabs/LaborOverviewTab";
import { LaborDailyTab } from "./tabs/LaborDailyTab";
import { LaborHourlyTab } from "./tabs/LaborHourlyTab";
import { LaborShiftsTab } from "./tabs/LaborShiftsTab";
import { LaborRecommendationsTab } from "./tabs/LaborRecommendationsTab";
import { LaborWeeklyPatternTab } from "./tabs/LaborWeeklyPatternTab";

type TabKey =
  | "overview"
  | "daily"
  | "weekly"
  | "hourly"
  | "shifts"
  | "recommendations";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "daily", label: "Daily Pattern" },
  { key: "weekly", label: "Weekly Pattern" },
  { key: "hourly", label: "Hourly" },
  { key: "shifts", label: "Shifts" },
  { key: "recommendations", label: "Recommendations" },
];

export function LaborPage() {
  const [active, setActive] = useState<TabKey>("weekly");

  function renderTab() {
    switch (active) {
      case "overview":
        return <LaborOverviewTab />;
      case "daily":
        return <LaborDailyTab />;
      case "weekly":
        return <LaborWeeklyPatternTab />;
      case "hourly":
        return <LaborHourlyTab />;
      case "shifts":
        return <LaborShiftsTab />;
      case "recommendations":
        return <LaborRecommendationsTab />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-2xl font-semibold text-white">Labor Analytics</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const activeTab = tab.key === active;

            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={[
                  "rounded-2xl px-4 py-2 text-sm transition",
                  activeTab
                    ? "bg-cyan-400/15 text-white ring-1 ring-cyan-300/30"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {renderTab()}
    </div>
  );
}
