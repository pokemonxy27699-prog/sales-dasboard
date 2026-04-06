import { useMemo, useState } from "react";
import { CalendarViewSwitcher } from "./CalendarViewSwitcher";
import { DayTopStrip } from "./day/DayTopStrip";
import { HourlyTimeline, type HourlyTimelineRow } from "./day/HourlyTimeline";
import { PeopleModal, type StaffPersonRow } from "./day/PeopleModal";
import { TransactionsModal, type TransactionTicketRow } from "./day/TransactionsModal";
import type { CalendarSelection, CalendarView } from "../../types/calendar";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type HourMetrics = {
  sales: number;
  transactions: number;
  people: number;
  avgTicket: number;
  laborPct: number;
  dollarsPerLaborHour: number;
  tag: "Peak Hour" | "Overstaffed" | "Understaffed" | "Low Traffic" | "Strong Efficiency";
  tone: "blue" | "red" | "yellow" | "green";
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, 0, 1);
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  return addDays(d, -d.getDay());
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatMonthLabel(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatHourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized} ${suffix}`;
}

function getMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function getYearMonths(date: Date) {
  return Array.from({ length: 12 }, (_, index) => new Date(date.getFullYear(), index, 1));
}

function getWeekDays(date: Date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
}

function formatMoneySmall(value: number) {
  return `$${value.toFixed(2)}`;
}

function getMonthSummary(date: Date) {
  const monthIndex = date.getMonth() + 1;
  return {
    sales: `$${(monthIndex * 18234).toLocaleString()}`,
    transactions: (monthIndex * 1432).toLocaleString(),
    labor: `${18 + monthIndex}%`,
  };
}

function getDaySummary(date: Date) {
  const day = date.getDate();
  return {
    sales: `$${(420 + day * 19).toLocaleString()}`,
    transactions: `${60 + day * 3}`,
    labor: `${16 + (day % 8)}%`,
    weather: day % 2 === 0 ? "Sunny" : "Cloudy",
  };
}

function getHourMetrics(date: Date, hour: number): HourMetrics {
  const day = date.getDate();
  const sales = 55 + day * 12 + hour * 18 + (hour >= 14 && hour <= 18 ? 95 : 0);
  const transactions = Math.max(2, Math.round(sales / 18));
  const people =
    hour < 11 ? 2 :
    hour < 14 ? 3 :
    hour < 19 ? 4 : 3;
  const avgTicket = sales / transactions;
  const laborPct =
    sales >= 280 ? 16 :
    sales >= 180 ? 20 :
    sales >= 120 ? 26 : 34;
  const dollarsPerLaborHour = sales / Math.max(1, people);

  let tag: HourMetrics["tag"] = "Low Traffic";
  let tone: HourMetrics["tone"] = "yellow";

  if (sales >= 320) {
    tag = "Peak Hour";
    tone = "blue";
  } else if (laborPct >= 30) {
    tag = "Overstaffed";
    tone = "red";
  } else if (people <= 2 && sales >= 170) {
    tag = "Understaffed";
    tone = "yellow";
  } else if (laborPct <= 18) {
    tag = "Strong Efficiency";
    tone = "green";
  }

  return {
    sales,
    transactions,
    people,
    avgTicket,
    laborPct,
    dollarsPerLaborHour,
    tag,
    tone,
  };
}

function getDayHours(date: Date) {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    ...getHourMetrics(date, hour),
  }));
}

function getHourTickets(hour: number): TransactionTicketRow[] {
  return Array.from({ length: 6 }, (_, index) => ({
    id: `T-${hour}${index + 1}42`,
    time: `${String(hour).padStart(2, "0")}:${String(index * 9).padStart(2, "0")}`,
    items: 1 + (index % 4),
    discount: index % 3 === 0 ? "$1.00" : "$0.00",
    total: formatMoneySmall(7.25 + index * 2.85),
  }));
}

function getHourStaff(hour: number): StaffPersonRow[] {
  const sets: Record<number, StaffPersonRow[]> = {
    10: [
      { name: "Ayesha", role: "Scooper", start: "10:00", end: "16:00", shiftHours: "6.0", coverage: "Opening coverage" },
      { name: "Omar", role: "Scooper", start: "10:30", end: "17:00", shiftHours: "6.5", coverage: "Counter support" },
    ],
    14: [
      { name: "Ayesha", role: "Scooper", start: "10:00", end: "16:00", shiftHours: "6.0", coverage: "Front line" },
      { name: "Omar", role: "Scooper", start: "10:30", end: "17:00", shiftHours: "6.5", coverage: "Front line" },
      { name: "Maya", role: "Scooper", start: "12:00", end: "20:00", shiftHours: "8.0", coverage: "Peak support" },
      { name: "Yusuf", role: "Lead", start: "13:00", end: "21:00", shiftHours: "8.0", coverage: "Shift coverage" },
    ],
    18: [
      { name: "Maya", role: "Scooper", start: "12:00", end: "20:00", shiftHours: "8.0", coverage: "Rush hour" },
      { name: "Yusuf", role: "Lead", start: "13:00", end: "21:00", shiftHours: "8.0", coverage: "Supervision" },
      { name: "Sara", role: "Scooper", start: "16:00", end: "22:00", shiftHours: "6.0", coverage: "Closing support" },
      { name: "Bilal", role: "Scooper", start: "17:00", end: "22:00", shiftHours: "5.0", coverage: "Counter support" },
    ],
  };

  return sets[hour] ?? [
    { name: "Ayesha", role: "Scooper", start: "10:00", end: "16:00", shiftHours: "6.0", coverage: "Floor coverage" },
    { name: "Omar", role: "Scooper", start: "10:30", end: "17:00", shiftHours: "6.5", coverage: "Floor coverage" },
    { name: "Maya", role: "Scooper", start: "12:00", end: "20:00", shiftHours: "8.0", coverage: "Peak support" },
  ];
}

export function CalendarPanel() {
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selection, setSelection] = useState<CalendarSelection>({
    selectedMonth: null,
    selectedDay: null,
    selectedHour: null,
  });
  const [transactionHour, setTransactionHour] = useState<number | null>(null);
  const [peopleHour, setPeopleHour] = useState<number | null>(null);
  const today = new Date();

  const monthGrid = useMemo(() => getMonthGrid(anchorDate), [anchorDate]);
  const yearMonths = useMemo(() => getYearMonths(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);
  const dayHours = useMemo(() => getDayHours(anchorDate), [anchorDate]);

  const dayTopCards = useMemo(() => {
    const totalSales = dayHours.reduce((sum, row) => sum + row.sales, 0);
    const totalTxn = dayHours.reduce((sum, row) => sum + row.transactions, 0);
    const avgLabor = dayHours.reduce((sum, row) => sum + row.laborPct, 0) / dayHours.length;
    const totalPeopleHours = dayHours.reduce((sum, row) => sum + row.people, 0);
    const weather = getDaySummary(anchorDate).weather;

    return [
      { label: "Total Sales", value: formatMoney(totalSales) },
      { label: "Transactions", value: totalTxn.toLocaleString() },
      { label: "Labor Hours", value: totalPeopleHours.toFixed(1) },
      { label: "Avg Labor %", value: `${avgLabor.toFixed(1)}%` },
      { label: "Weather", value: weather },
    ];
  }, [anchorDate, dayHours]);

  const hourlyRows = useMemo<HourlyTimelineRow[]>(() => {
    const maxSales = Math.max(...dayHours.map((row) => row.sales));

    return dayHours.map((row) => ({
      hour: row.hour,
      hourLabel: formatHourLabel(row.hour),
      salesBarWidth: `${Math.max(8, Math.round((row.sales / maxSales) * 100))}%`,
      salesText: formatMoney(row.sales),
      transactions: row.transactions,
      people: row.people,
      avgTicketText: formatMoneySmall(row.avgTicket),
      laborText: `${row.laborPct}% · ${formatMoneySmall(row.dollarsPerLaborHour)}`,
      tag: row.tag,
      tone: row.tone,
    }));
  }, [dayHours]);

  function goToday() {
    setAnchorDate(new Date());
  }

  function goPrev() {
    if (view === "day") setAnchorDate((current) => addDays(current, -1));
    if (view === "week") setAnchorDate((current) => addDays(current, -7));
    if (view === "month") setAnchorDate((current) => addMonths(current, -1));
    if (view === "year") setAnchorDate((current) => addYears(current, -1));
  }

  function goNext() {
    if (view === "day") setAnchorDate((current) => addDays(current, 1));
    if (view === "week") setAnchorDate((current) => addDays(current, 7));
    if (view === "month") setAnchorDate((current) => addMonths(current, 1));
    if (view === "year") setAnchorDate((current) => addYears(current, 1));
  }

  function jumpToView(nextView: CalendarView) {
    setView(nextView);
  }

  function selectMonth(monthDate: Date) {
    setSelection((current) => ({
      ...current,
      selectedMonth: monthDate,
      selectedHour: null,
    }));
  }

  function openMonth(monthDate: Date) {
    setAnchorDate(monthDate);
    setSelection((current) => ({
      ...current,
      selectedMonth: monthDate,
      selectedHour: null,
    }));
    setView("month");
  }

  function selectDay(dayDate: Date) {
    setSelection((current) => ({
      ...current,
      selectedDay: dayDate,
      selectedHour: null,
    }));
  }

  function openDay(dayDate: Date) {
    setAnchorDate(dayDate);
    setSelection((current) => ({
      ...current,
      selectedDay: dayDate,
      selectedHour: null,
    }));
    setView("day");
  }

  function selectHour(hour: number) {
    setSelection((current) => ({
      ...current,
      selectedDay: anchorDate,
      selectedHour: {
        dateKey: getDateKey(anchorDate),
        hour,
      },
    }));
  }

  function currentTitle() {
    if (view === "year") return String(anchorDate.getFullYear());
    if (view === "month") return formatMonthLabel(anchorDate);
    if (view === "week") return `${formatDateLabel(startOfWeek(anchorDate))} - ${formatDateLabel(endOfWeek(anchorDate))}`;
    return formatDateLabel(anchorDate);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">Calendar analytics</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{currentTitle()}</h2>
            </div>

            <div className="flex flex-col gap-3 2xl:items-end">
              <CalendarViewSwitcher view={view} onChange={jumpToView} />
              <div className="flex flex-wrap gap-2">
                <button onClick={goPrev} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">Prev</button>
                <button onClick={goToday} className="rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-2 text-sm text-cyan-100">Today</button>
                <button onClick={goNext} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">Next</button>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300">
            Double click drills down. In day view, use Txn and People buttons.
          </p>
        </div>
      </section>

      {view === "year" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {yearMonths.map((monthDate) => {
            const summary = getMonthSummary(monthDate);

            return (
              <button
                key={monthDate.toISOString()}
                onClick={() => selectMonth(monthDate)}
                onDoubleClick={() => openMonth(monthDate)}
                className="rounded-3xl border border-white/10 bg-white/5 p-4 text-left shadow-xl shadow-black/20 backdrop-blur transition hover:border-cyan-300/30 hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">{monthNames[monthDate.getMonth()]}</h3>
                  <span className="rounded-full border border-white/10 bg-slate-900/40 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                    Double click
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Sales</p>
                    <p className="mt-2 text-sm font-semibold text-white">{summary.sales}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Txn</p>
                    <p className="mt-2 text-sm font-semibold text-white">{summary.transactions}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Labor</p>
                    <p className="mt-2 text-sm font-semibold text-white">{summary.labor}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1">
                  {getMonthGrid(monthDate).slice(0, 35).map((date) => {
                    const inMonth = date.getMonth() === monthDate.getMonth();
                    const isToday = sameDay(date, today);

                    return (
                      <div
                        key={`${monthDate.toISOString()}-${date.toISOString()}`}
                        className={[
                          "flex h-8 items-center justify-center rounded-lg text-xs",
                          isToday
                            ? "bg-cyan-400/20 text-cyan-100"
                            : inMonth
                            ? "bg-slate-900/50 text-slate-200"
                            : "bg-slate-900/20 text-slate-500",
                        ].join(" ")}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur">
          <div className="mb-4 grid grid-cols-7 gap-3">
            {dayNames.map((day) => (
              <div
                key={day}
                className="rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {monthGrid.map((date) => {
              const inMonth = date.getMonth() === anchorDate.getMonth();
              const isToday = sameDay(date, today);
              const summary = getDaySummary(date);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => selectDay(date)}
                  onDoubleClick={() => openDay(date)}
                  className={[
                    "min-h-[125px] rounded-2xl border p-3 text-left transition",
                    isToday
                      ? "border-cyan-300/40 bg-cyan-400/10"
                      : "border-white/10 bg-slate-900/40 hover:bg-white/10",
                    inMonth ? "text-white" : "text-slate-500",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    {isToday ? (
                      <span className="rounded-full bg-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-200">
                        Today
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
                      Sales {summary.sales}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
                      Txn {summary.transactions}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
                      Labor {summary.labor}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-7">
          {weekDays.map((date) => {
            const isToday = sameDay(date, today);
            const summary = getDaySummary(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => selectDay(date)}
                onDoubleClick={() => openDay(date)}
                className={[
                  "rounded-3xl border p-4 text-left shadow-xl shadow-black/20 transition",
                  isToday
                    ? "border-cyan-300/40 bg-cyan-400/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
                ].join(" ")}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  {dayNames[date.getDay()]}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{date.getDate()}</h3>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3 text-slate-300">
                    Sales {summary.sales}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3 text-slate-300">
                    Txn {summary.transactions}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3 text-slate-300">
                    Labor {summary.labor}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "day" ? (
        <div className="space-y-4">
          <DayTopStrip cards={dayTopCards} />
          <HourlyTimeline
            dateLabel={formatDateLabel(anchorDate)}
            selectedHour={selection.selectedHour?.hour ?? null}
            rows={hourlyRows}
            onSelectHour={selectHour}
            onOpenTransactions={setTransactionHour}
            onOpenPeople={setPeopleHour}
          />
        </div>
      ) : null}

      {transactionHour !== null ? (
        <TransactionsModal
          title={`${formatHourLabel(transactionHour)} Transactions`}
          subtitle={formatDateLabel(anchorDate)}
          tickets={getHourTickets(transactionHour)}
          onClose={() => setTransactionHour(null)}
        />
      ) : null}

      {peopleHour !== null ? (
        <PeopleModal
          title={`${formatHourLabel(peopleHour)} Staffing`}
          subtitle={formatDateLabel(anchorDate)}
          staff={getHourStaff(peopleHour)}
          onClose={() => setPeopleHour(null)}
        />
      ) : null}
    </div>
  );
}
