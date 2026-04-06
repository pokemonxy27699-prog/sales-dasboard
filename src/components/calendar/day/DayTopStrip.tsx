type DayTopStripCard = {
  label: string;
  value: string;
};

type DayTopStripProps = {
  cards: DayTopStripCard[];
};

export function DayTopStrip({ cards }: DayTopStripProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
          <p className="mt-2 text-xl font-semibold text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
