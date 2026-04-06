import type { CalendarView } from "../../types/calendar";

type CalendarViewSwitcherProps = {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
};

const views: CalendarView[] = ["year", "month", "week", "day"];

export function CalendarViewSwitcher({ view, onChange }: CalendarViewSwitcherProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {views.map((item) => {
        const active = item === view;

        return (
          <button
            key={item}
            onClick={() => onChange(item)}
            className={[
              "rounded-2xl px-4 py-2 text-sm capitalize transition",
              active
                ? "bg-cyan-400/15 text-white ring-1 ring-cyan-300/30"
                : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
