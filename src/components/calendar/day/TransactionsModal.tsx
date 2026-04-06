import { ModalShell } from "./ModalShell";

export type TransactionTicketRow = {
  id: string;
  time: string;
  items: number;
  discount: string;
  total: string;
};

type TransactionsModalProps = {
  title: string;
  subtitle: string;
  tickets: TransactionTicketRow[];
  onClose: () => void;
};

export function TransactionsModal({
  title,
  subtitle,
  tickets,
  onClose,
}: TransactionsModalProps) {
  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onClose}
    >
      <div className="grid grid-cols-5 gap-3 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        <div>Ticket</div>
        <div>Time</div>
        <div>Items</div>
        <div>Discount</div>
        <div>Total</div>
      </div>

      <div className="mt-3 space-y-2">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="grid grid-cols-5 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
          >
            <div className="font-medium text-white">{ticket.id}</div>
            <div>{ticket.time}</div>
            <div>{ticket.items}</div>
            <div>{ticket.discount}</div>
            <div className="font-semibold text-cyan-200">{ticket.total}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
