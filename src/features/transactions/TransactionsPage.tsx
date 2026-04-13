import { useEffect, useMemo, useState } from "react";
import { loadSalesDataset } from "../../lib/data/storage";
import type { SalesDataset } from "../../types/data";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMoney0(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${suffix}`;
}

type DayMetric = {
  date: string;
  transactions: number;
  sales: number;
  guests: number;
  avgTicket: number;
};

type HourMetric = {
  hour: number;
  transactions: number;
  sales: number;
  guests: number;
  avgTicket: number;
};

function getDayTag(row: DayMetric, avgTicketBaseline: number, highTxnCutoff: number, lowTxnCutoff: number) {
  if (row.transactions >= highTxnCutoff) return "Peak";
  if (row.transactions <= lowTxnCutoff) return "Weak";
  if (row.avgTicket > avgTicketBaseline) return "High Ticket";
  return "Low Ticket";
}

function getTagTone(tag: string) {
  switch (tag) {
    case "Peak":
      return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
    case "Weak":
      return "border-rose-300/20 bg-rose-400/10 text-rose-100";
    case "High Ticket":
      return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100";
    default:
      return "border-amber-300/20 bg-amber-400/10 text-amber-100";
  }
}

export function TransactionsPage() {
  const [sales, setSales] = useState<SalesDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullDayRankings, setShowFullDayRankings] = useState(false);
  const [showFullHourlyTable, setShowFullHourlyTable] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const salesDataset = await loadSalesDataset();
        if (!active) return;
        setSales(salesDataset);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load transactions data.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  const dailyMetrics = useMemo<DayMetric[]>(() => {
    return [...(sales?.daily ?? [])]
      .map((row) => ({
        date: row.date,
        transactions: row.transactionQty,
        sales: row.netSalesAmt,
        guests: row.guestCount,
        avgTicket: row.transactionQty > 0 ? row.netSalesAmt / row.transactionQty : 0,
      }))
      .sort((a, b) => b.transactions - a.transactions);
  }, [sales]);

  const hourlyPattern = useMemo<HourMetric[]>(() => {
    const map = new Map<number, { transactions: number; sales: number; guests: number }>();

    for (const row of sales?.hourly ?? []) {
      const current = map.get(row.hour) ?? { transactions: 0, sales: 0, guests: 0 };
      current.transactions += row.transactionQty;
      current.sales += row.netSalesAmt;
      current.guests += row.guestCount;
      map.set(row.hour, current);
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, value]) => ({
        hour,
        transactions: value.transactions,
        sales: value.sales,
        guests: value.guests,
        avgTicket: value.transactions > 0 ? value.sales / value.transactions : 0,
      }));
  }, [sales]);

  const summary = useMemo(() => {
    const totalTransactions = dailyMetrics.reduce((sum, row) => sum + row.transactions, 0);
    const totalSales = dailyMetrics.reduce((sum, row) => sum + row.sales, 0);
    const totalGuests = dailyMetrics.reduce((sum, row) => sum + row.guests, 0);
    const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    const peakTxnHour =
      hourlyPattern.length > 0
        ? hourlyPattern.reduce((best, row) => (row.transactions > best.transactions ? row : best), hourlyPattern[0])
        : null;

    const peakSalesHour =
      hourlyPattern.length > 0
        ? hourlyPattern.reduce((best, row) => (row.sales > best.sales ? row : best), hourlyPattern[0])
        : null;

    const bestAvgTicketHour =
      hourlyPattern.filter((row) => row.transactions > 0).length > 0
        ? hourlyPattern
          .filter((row) => row.transactions > 0)
          .reduce((best, row) => (row.avgTicket > best.avgTicket ? row : best), hourlyPattern.filter((row) => row.transactions > 0)[0])
        : null;

    const weakestHour =
      hourlyPattern.filter((row) => row.transactions > 0).length > 0
        ? hourlyPattern
          .filter((row) => row.transactions > 0)
          .reduce((worst, row) => (row.transactions < worst.transactions ? row : worst), hourlyPattern.filter((row) => row.transactions > 0)[0])
        : null;

    const bestDay = dailyMetrics.length > 0 ? dailyMetrics[0] : null;

    return {
      totalTransactions,
      totalSales,
      totalGuests,
      avgTicket,
      dayCount: dailyMetrics.length,
      peakTxnHour,
      peakSalesHour,
      bestAvgTicketHour,
      weakestHour,
      bestDay,
    };
  }, [dailyMetrics, hourlyPattern]);

  const highTxnCutoff = useMemo(() => {
    if (dailyMetrics.length === 0) return 0;
    return dailyMetrics[Math.max(0, Math.floor(dailyMetrics.length * 0.1) - 1)]?.transactions ?? dailyMetrics[0].transactions;
  }, [dailyMetrics]);

  const lowTxnCutoff = useMemo(() => {
    if (dailyMetrics.length === 0) return 0;
    const asc = [...dailyMetrics].sort((a, b) => a.transactions - b.transactions);
    return asc[Math.max(0, Math.floor(asc.length * 0.1) - 1)]?.transactions ?? asc[0].transactions;
  }, [dailyMetrics]);

  const top5Days = useMemo(() => dailyMetrics.slice(0, 5), [dailyMetrics]);

  const bottom5Days = useMemo(() => {
    return [...dailyMetrics].sort((a, b) => a.transactions - b.transactions).slice(0, 5);
  }, [dailyMetrics]);

  const maxHourlyTransactions = useMemo(() => {
    return hourlyPattern.reduce((max, row) => Math.max(max, row.transactions), 0);
  }, [hourlyPattern]);

  if (isLoading) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">Loading transactions...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>;
  }

  if (!sales) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        No saved sales dataset found. Import sales first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/15 via-blue-400/10 to-transparent p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Transactions overview</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Decision-first transactions page</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Same data engine, better presentation for spotting peak traffic, weak days, and hourly demand.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Transactions</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.totalTransactions.toLocaleString()}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sales</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(summary.totalSales)}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Avg ticket</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(summary.avgTicket)}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Guests</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.totalGuests.toLocaleString()}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Peak hour</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {summary.peakTxnHour ? formatHour(summary.peakTxnHour.hour) : "�"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.peakTxnHour ? `${summary.peakTxnHour.transactions.toLocaleString()} txn` : "No data"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Best day</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {summary.bestDay ? summary.bestDay.date : "�"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.bestDay ? `${summary.bestDay.transactions} txn` : "No data"}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Top 5 days</h3>
            <span className="text-sm text-slate-400">Highest transactions</span>
          </div>

          <div className="mt-4 space-y-3">
            {top5Days.map((row) => {
              const tag = getDayTag(row, summary.avgTicket, highTxnCutoff, lowTxnCutoff);

              return (
                <div key={row.date} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{row.date}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {row.transactions} txn � {formatMoney0(row.sales)} � Avg {formatMoney(row.avgTicket)}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${getTagTone(tag)}`}>
                      {tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Bottom 5 days</h3>
            <span className="text-sm text-slate-400">Lowest transactions</span>
          </div>

          <div className="mt-4 space-y-3">
            {bottom5Days.map((row) => {
              const tag = getDayTag(row, summary.avgTicket, highTxnCutoff, lowTxnCutoff);

              return (
                <div key={row.date} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{row.date}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {row.transactions} txn � {formatMoney0(row.sales)} � Avg {formatMoney(row.avgTicket)}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${getTagTone(tag)}`}>
                      {tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Peak transaction hour</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {summary.peakTxnHour ? formatHour(summary.peakTxnHour.hour) : "�"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.peakTxnHour ? `${summary.peakTxnHour.transactions.toLocaleString()} transactions` : "No data"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Peak sales hour</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {summary.peakSalesHour ? formatHour(summary.peakSalesHour.hour) : "�"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.peakSalesHour ? formatMoney(summary.peakSalesHour.sales) : "No data"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Best avg-ticket hour</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {summary.bestAvgTicketHour ? formatHour(summary.bestAvgTicketHour.hour) : "�"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.bestAvgTicketHour ? formatMoney(summary.bestAvgTicketHour.avgTicket) : "No data"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Weakest hour</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {summary.weakestHour ? formatHour(summary.weakestHour.hour) : "�"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.weakestHour ? `${summary.weakestHour.transactions.toLocaleString()} transactions` : "No data"}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Hourly demand heat strip</h3>
          <span className="text-sm text-slate-400">Based on transactions by hour</span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {hourlyPattern.map((row) => {
            const widthPct = maxHourlyTransactions > 0 ? (row.transactions / maxHourlyTransactions) * 100 : 0;

            return (
              <div key={row.hour} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">{formatHour(row.hour)}</span>
                  <span className="text-xs text-slate-400">{row.transactions.toLocaleString()} txn</span>
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-cyan-400/80"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Sales {formatMoney0(row.sales)}</span>
                  <span>Avg {formatMoney(row.avgTicket)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">Detailed rankings</h3>
          <button
            onClick={() => setShowFullDayRankings((value) => !value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            {showFullDayRankings ? "Hide full day rankings" : "Show full day rankings"}
          </button>
        </div>

        {showFullDayRankings ? (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              {dailyMetrics.map((row) => (
                <div key={`best-${row.date}`} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-5">
                  <div className="text-white">{row.date}</div>
                  <div className="text-slate-200">Txn {row.transactions}</div>
                  <div className="text-slate-200">Sales {formatMoney(row.sales)}</div>
                  <div className="text-slate-200">Guests {row.guests}</div>
                  <div className="text-slate-200">Avg {formatMoney(row.avgTicket)}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[...dailyMetrics].sort((a, b) => a.transactions - b.transactions).map((row) => (
                <div key={`worst-${row.date}`} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-5">
                  <div className="text-white">{row.date}</div>
                  <div className="text-slate-200">Txn {row.transactions}</div>
                  <div className="text-slate-200">Sales {formatMoney(row.sales)}</div>
                  <div className="text-slate-200">Guests {row.guests}</div>
                  <div className="text-slate-200">Avg {formatMoney(row.avgTicket)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">Hourly detail table</h3>
          <button
            onClick={() => setShowFullHourlyTable((value) => !value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            {showFullHourlyTable ? "Hide hourly table" : "Show hourly table"}
          </button>
        </div>

        {showFullHourlyTable ? (
          <div className="mt-4 space-y-3">
            {hourlyPattern.map((row) => (
              <div key={row.hour} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:grid-cols-5">
                <div className="text-white">{formatHour(row.hour)}</div>
                <div className="text-slate-200">Txn {row.transactions.toLocaleString()}</div>
                <div className="text-slate-200">Sales {formatMoney(row.sales)}</div>
                <div className="text-slate-200">Guests {row.guests.toLocaleString()}</div>
                <div className="text-slate-200">Avg {formatMoney(row.avgTicket)}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
