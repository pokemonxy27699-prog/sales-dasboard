import { useMemo, useState } from "react";
import { DayTopStrip } from "./day/DayTopStrip";
import { HourlyTimeline } from "./day/HourlyTimeline";
import { PeopleModal } from "./day/PeopleModal";
import { TransactionsModal } from "./day/TransactionsModal";
import type { CalendarSelection, CalendarView } from "../../types/calendar";
import { useAppData } from "../../lib/data/DataContext";
import {
  findDailySummary,
  formatHourLabel,
  formatMoney,
  formatMoneySmall,
  getCalendarDayView,
  getCalendarMonthDays,
  getDateKey,
  getTicketsForHour,
} from "../../lib/data/selectors";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
function formatDateLabel(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
function formatMonthLabel(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
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

export function CalendarPanel() {
  const { dataset } = useAppData();
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
  const dayView = useMemo(() => getCalendarDayView(dataset, anchorDate), [dataset, anchorDate]);

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
  function openDay(dayDate: Date) {
    setAnchorDate(dayDate);
    setSelection((current) => ({
      ...current,
      selectedDay: dayDate,
      selectedHour: null,
    }));
    setView("day");
  }

  const tickets = transactionHour === null ? [] : getTicketsForHour(dataset, dayView.dateKey, transactionHour);
  const staff = peopleHour === null
    ? []
    : dayView.rows
        .filter((row) => row.hour === peopleHour)
        .flatMap((row) =>
          Array.from({ length: row.people }, (_, index) => ({
            name: `Team ${index + 1}`,
            role: index === 0 ? "Lead" : "Scooper",
            start: row.hour <= 12 ? "11:00" : "13:00",
            end: row.hour >= 18 ? "22:00" : "17:00",
            shiftHours: row.hour >= 18 ? "5.0" : "6.0",
            coverage: row.tag,
          })),
        );

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Calendar analytics</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Sales, labor, and day drilldown</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Month and day views now read from the shared dataset selectors.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["year", "month", "week", "day"] as CalendarView[]).map((item) => (
              <button
                key={item}
                onClick={() => setView(item)}
                className={[
                  "rounded-2xl px-4 py-2 text-sm transition",
                  item === view
                    ? "bg-cyan-400/15 text-white ring-1 ring-cyan-300/30"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={goPrev} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            Prev
          </button>
          <button onClick={goToday} className="rounded-2xl bg-cyan-400/15 px-4 py-2 text-sm text-cyan-100 ring-1 ring-cyan-300/20">
            Today
          </button>
          <button onClick={goNext} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            Next
          </button>
          <div className="ml-auto rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm text-slate-300">
            {view === "month" ? formatMonthLabel(anchorDate) : formatDateLabel(anchorDate)}
          </div>
        </div>
      </section>

      {dataset.meta.mode === "empty" ? (
        <section className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-8 text-center">
          <p className="text-lg font-semibold text-white">No data imported yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Load the dev seed from Dashboard or import real files after parsers are wired.
          </p>
        </section>
      ) : null}

      {dataset.meta.mode !== "empty" && view === "month" ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.16em] text-slate-500">
            {dayNames.map((day) => <div key={day}>{day}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map((date) => {
              const day = findDailySummary(dataset, getDateKey(date));
              const isCurrentMonth = date.getMonth() === anchorDate.getMonth();
              const isToday = getDateKey(date) === getDateKey(today);

              return (
                <button
                  key={date.toISOString()}
                  onDoubleClick={() => openDay(date)}
                  className={[
                    "min-h-[122px] rounded-2xl border p-3 text-left transition",
                    isCurrentMonth ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02]",
                    isToday ? "ring-1 ring-cyan-300/30" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className={isCurrentMonth ? "text-sm font-medium text-white" : "text-sm text-slate-600"}>
                      {date.getDate()}
                    </span>
                    {day ? (
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                        live
                      </span>
                    ) : null}
                  </div>

                  {day ? (
                    <div className="mt-3 space-y-2 text-xs text-slate-300">
                      <div>Sales {formatMoney(day.sales)}</div>
                      <div>Txn {day.transactions}</div>
                      <div>Labor {day.laborPct.toFixed(1)}%</div>
                    </div>
                  ) : (
                    <div className="mt-6 text-xs text-slate-600">No saved day</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {dataset.meta.mode !== "empty" && view === "week" ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {weekDays.map((date) => {
            const day = findDailySummary(dataset, getDateKey(date));
            return (
              <button
                key={date.toISOString()}
                onDoubleClick={() => openDay(date)}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{dayNames[date.getDay()]}</p>
                <p className="mt-2 text-lg font-semibold text-white">{date.getDate()}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <div>Sales {day ? formatMoney(day.sales) : "—"}</div>
                  <div>Txn {day ? day.transactions.toLocaleString() : "—"}</div>
                  <div>Labor {day ? `${day.laborPct.toFixed(1)}%` : "—"}</div>
                </div>
              </button>
            );
          })}
        </section>
      ) : null}

      {dataset.meta.mode !== "empty" && view === "year" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {yearMonths.map((monthDate) => {
            const monthDays = getCalendarMonthDays(dataset, monthDate.getFullYear(), monthDate.getMonth());
            const sales = monthDays.reduce((sum, item) => sum + item.sales, 0);
            const transactions = monthDays.reduce((sum, item) => sum + item.transactions, 0);
            const laborPct = sales > 0 ? (monthDays.reduce((sum, item) => sum + item.laborCost, 0) / sales) * 100 : 0;

            return (
              <div key={monthDate.toISOString()} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{monthNames[monthDate.getMonth()]}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <div>Sales {formatMoney(sales)}</div>
                  <div>Txn {transactions.toLocaleString()}</div>
                  <div>Labor {laborPct.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {dataset.meta.mode !== "empty" && view === "day" ? (
        <div className="space-y-4">
          <DayTopStrip cards={dayView.topCards} />
          <HourlyTimeline
            dateLabel={formatDateLabel(anchorDate)}
            selectedHour={selection.selectedHour?.hour ?? null}
            rows={dayView.rows}
            onSelectHour={(hour) =>
              setSelection((current) => ({
                ...current,
                selectedHour: { dateKey: dayView.dateKey, hour },
              }))
            }
            onOpenTransactions={(hour) => setTransactionHour(hour)}
            onOpenPeople={(hour) => setPeopleHour(hour)}
          />
        </div>
      ) : null}

      {transactionHour !== null ? (
        <TransactionsModal
          title={`Transactions · ${formatHourLabel(transactionHour)}`}
          subtitle={formatDateLabel(anchorDate)}
          tickets={tickets.map((ticket) => ({
            id: ticket.id,
            time: ticket.timeLabel,
            items: ticket.items,
            discount: formatMoneySmall(ticket.discount),
            total: formatMoneySmall(ticket.total),
          }))}
          onClose={() => setTransactionHour(null)}
        />
      ) : null}

      {peopleHour !== null ? (
        <PeopleModal
          title={`People · ${formatHourLabel(peopleHour)}`}
          subtitle={formatDateLabel(anchorDate)}
          staff={staff}
          onClose={() => setPeopleHour(null)}
        />
      ) : null}
    </div>
  );
}
