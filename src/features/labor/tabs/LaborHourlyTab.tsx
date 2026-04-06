import { useMemo } from "react";

type HourRow = {
  hour: number;
  sales: number;
  transactions: number;
  people: number;
  laborHours: number;
  laborCost: number;
  laborPct: number;
  salesPerLaborHour: number;
  avgTicket: number;
  status: "Overstaffed" | "Efficient" | "Watch" | "Understaffed";
  recommendation: string;
};

const LABOR_RATE = 18;

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatMoneySmall(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${suffix}`;
}

function getStatusTone(status: HourRow["status"]): {
  row: string;
  badge: string;
} {
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

function buildMockHourlyRows(): HourRow[] {
  const hourlySales = [
    22, 18, 16, 14, 14, 18, 24, 34, 52, 78, 118, 165, 210, 248, 296, 338, 382,
    425, 404, 318, 236, 164, 96, 48,
  ];

  return hourlySales.map((sales, hour) => {
    const transactions = Math.max(1, Math.round(sales / 8.75));

    let people = 2;
    if (hour >= 11 && hour < 14) people = 3;
    if (hour >= 14 && hour < 19) people = 4;
    if (hour >= 19 && hour < 22) people = 3;
    if (hour <= 8) people = 2;
    if (hour >= 22) people = 2;

    const laborHours = people;
    const laborCost = laborHours * LABOR_RATE;
    const laborPct = sales > 0 ? (laborCost / sales) * 100 : 0;
    const salesPerLaborHour = laborHours > 0 ? sales / laborHours : 0;
    const avgTicket = sales / transactions;

    let status: HourRow["status"] = "Watch";
    let recommendation = "Keep current staffing";

    if (laborPct > 30) {
      status = "Overstaffed";
      recommendation =
        sales < 120
          ? "Cut 1 person if service stays stable"
          : "Watch closely before cutting";
    } else if (laborPct < 18) {
      status = "Efficient";
      recommendation = "Strong staffing efficiency";
    } else if (people <= 2 && sales >= 170) {
      status = "Understaffed";
      recommendation = "Add support for service speed";
    } else {
      status = "Watch";
      recommendation = "Monitor sales and queue pressure";
    }

    return {
      hour,
      sales,
      transactions,
      people,
      laborHours,
      laborCost,
      laborPct,
      salesPerLaborHour,
      avgTicket,
      status,
      recommendation,
    };
  });
}

export function LaborHourlyTab() {
  const { rows, summary, avgLaborPct, worstHours, peakHours } = useMemo(() => {
    const rows = buildMockHourlyRows();

    const summary = rows.reduce(
      (acc, row) => {
        acc.sales += row.sales;
        acc.transactions += row.transactions;
        acc.laborHours += row.laborHours;
        acc.laborCost += row.laborCost;
        if (row.status === "Overstaffed") acc.overstaffedHours += 1;
        if (row.status === "Efficient") acc.efficientHours += 1;
        if (row.status === "Understaffed") acc.understaffedHours += 1;
        return acc;
      },
      {
        sales: 0,
        transactions: 0,
        laborHours: 0,
        laborCost: 0,
        overstaffedHours: 0,
        efficientHours: 0,
        understaffedHours: 0,
      }
    );

    const avgLaborPct =
      summary.sales > 0 ? (summary.laborCost / summary.sales) * 100 : 0;
    const worstHours = rows.filter((row) => row.status === "Overstaffed");
    const peakHours = rows.filter((row) => row.sales >= 300);

    return { rows, summary, avgLaborPct, worstHours, peakHours };
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">
              Hourly labor analysis
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Staffing vs sales by hour
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              This view highlights overstaffed and understaffed hours using
              labor % and sales per labor hour.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
            Current mode: mock analytics
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Sales
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatMoney(summary.sales)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Transactions
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {summary.transactions.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Labor Hours
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {summary.laborHours.toFixed(1)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Labor Cost
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatMoney(summary.laborCost)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Avg Labor %
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {avgLaborPct.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Overstaffed Hours
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {summary.overstaffedHours}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Hourly table
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Hour-by-hour decisions
              </h3>
            </div>
          </div>

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
                      className={["rounded-2xl border p-4", tone.row].join(" ")}
                    >
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[110px_100px_80px_80px_100px_90px_120px_110px_minmax(180px,1fr)] xl:items-center">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Hour
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatHourLabel(row.hour)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Sales
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatMoney(row.sales)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Txn
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {row.transactions}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            People
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {row.people}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Labor $
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatMoneySmall(row.laborCost)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Labor %
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {row.laborPct.toFixed(1)}%
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            $ / Labor Hr
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {formatMoneySmall(row.salesPerLaborHour)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Status
                          </p>
                          <div className="mt-1">
                            <span
                              className={[
                                "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                                tone.badge,
                              ].join(" ")}
                            >
                              {row.status}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="mt-1 break-words text-sm font-medium leading-5 text-slate-200">
                            {row.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Overstaffed focus
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Worst staffing windows
            </h3>

            <div className="mt-4 space-y-3">
              {worstHours.length > 0 ? (
                worstHours.map((row) => (
                  <div
                    key={row.hour}
                    className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {formatHourLabel(row.hour)}
                      </p>
                      <span className="shrink-0 rounded-full border border-rose-300/25 bg-rose-400/15 px-3 py-1 text-xs font-medium text-rose-100">
                        {row.laborPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-sm">
                      <p className="break-words text-slate-200">
                        Sales {formatMoney(row.sales)} · {row.people} people
                      </p>
                      <p className="break-words font-medium leading-5 text-white">
                        {row.recommendation}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  No overstaffed hours detected.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Peak coverage
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Peak sales hours
            </h3>

            <div className="mt-4 space-y-3">
              {peakHours.length > 0 ? (
                peakHours.map((row) => (
                  <div
                    key={row.hour}
                    className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {formatHourLabel(row.hour)}
                      </p>
                      <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/15 px-3 py-1 text-xs font-medium text-cyan-100">
                        {formatMoney(row.sales)}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm leading-5 text-slate-200">
                      {row.people} people · {row.transactions} transactions ·
                      labor {row.laborPct.toFixed(1)}%
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  No peak hours detected.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Quick logic
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Current thresholds
            </h3>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>Overstaffed: labor % greater than 30%</p>
              <p>Efficient: labor % below 18%</p>
              <p>Understaffed: 2 or fewer people with strong sales pressure</p>
              <p>Rate used: ${LABOR_RATE} per labor hour</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}