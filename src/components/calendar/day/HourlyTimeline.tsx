export type HourlyTimelineTone = "blue" | "red" | "yellow" | "green";

export type HourlyTimelineRow = {
  hour: number;
  hourLabel: string;
  salesBarWidth: string;
  salesText: string;
  transactions: number;
  people: number;
  avgTicketText: string;
  laborText: string;
  tag: string;
  tone: HourlyTimelineTone;
};

type HourlyTimelineProps = {
  dateLabel: string;
  selectedHour: number | null;
  rows: HourlyTimelineRow[];
  onSelectHour: (hour: number) => void;
  onOpenTransactions: (hour: number) => void;
  onOpenPeople: (hour: number) => void;
};

function getToneClasses(tone: HourlyTimelineTone, selected: boolean) {
  const selectedClass = selected ? "ring-2 ring-white/20" : "";

  if (tone === "blue") {
    return `border-cyan-300/25 bg-cyan-400/10 ${selectedClass}`;
  }
  if (tone === "red") {
    return `border-rose-300/25 bg-rose-400/10 ${selectedClass}`;
  }
  if (tone === "green") {
    return `border-emerald-300/25 bg-emerald-400/10 ${selectedClass}`;
  }
  return `border-amber-300/20 bg-amber-400/10 ${selectedClass}`;
}

function getTagClasses(tone: HourlyTimelineTone) {
  if (tone === "blue") return "border-cyan-300/25 bg-cyan-400/15 text-cyan-100";
  if (tone === "red") return "border-rose-300/25 bg-rose-400/15 text-rose-100";
  if (tone === "green") return "border-emerald-300/25 bg-emerald-400/15 text-emerald-100";
  return "border-amber-300/20 bg-amber-400/15 text-amber-100";
}

export function HourlyTimeline({
  dateLabel,
  selectedHour,
  rows,
  onSelectHour,
  onOpenTransactions,
  onOpenPeople,
}: HourlyTimelineProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Day View</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{dateLabel}</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm text-slate-300">
          Click Txn or People
        </div>
      </div>

      <div className="mb-3 hidden grid-cols-[90px_minmax(0,1fr)_110px_110px_110px_110px_120px_120px] gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 xl:grid">
        <div>Hour</div>
        <div>Sales Intensity</div>
        <div>Sales</div>
        <div>Txn</div>
        <div>People</div>
        <div>Avg Ticket</div>
        <div>Labor %</div>
        <div>Status</div>
      </div>

      <div className="h-[70vh] space-y-3 overflow-y-auto pr-1">
        {rows.map((row) => {
          const isSelected = selectedHour === row.hour;

          return (
            <button
              key={row.hour}
              onClick={() => onSelectHour(row.hour)}
              className={[
                "w-full rounded-2xl border p-4 text-left transition",
                getToneClasses(row.tone, isSelected),
              ].join(" ")}
            >
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[90px_minmax(0,1fr)_110px_110px_110px_110px_120px_120px] xl:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Hour</p>
                  <p className="mt-1 text-lg font-semibold text-white">{row.hourLabel}</p>
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Sales vs Day Max</p>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-900/60">
                    <div
                      className={[
                        "h-full rounded-full",
                        row.tone === "blue"
                          ? "bg-cyan-300"
                          : row.tone === "red"
                          ? "bg-rose-300"
                          : row.tone === "green"
                          ? "bg-emerald-300"
                          : "bg-amber-300",
                      ].join(" ")}
                      style={{ width: row.salesBarWidth }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sales</p>
                  <p className="mt-1 text-sm font-semibold text-white">{row.salesText}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Txn</p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenTransactions(row.hour);
                    }}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-white/10"
                  >
                    {row.transactions} View
                  </button>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">People</p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenPeople(row.hour);
                    }}
                    className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-white/10"
                  >
                    {row.people} View
                  </button>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Avg Ticket</p>
                  <p className="mt-1 text-sm font-semibold text-white">{row.avgTicketText}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor %</p>
                  <p className="mt-1 text-sm font-semibold text-white">{row.laborText}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
                  <div className="mt-1">
                    <span
                      className={[
                        "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                        getTagClasses(row.tone),
                      ].join(" ")}
                    >
                      {row.tag}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
