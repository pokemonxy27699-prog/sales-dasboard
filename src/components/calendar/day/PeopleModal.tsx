import { ModalShell } from "./ModalShell";

export type StaffPersonRow = {
  name: string;
  role: string;
  start: string;
  end: string;
  shiftHours: string;
  coverage: string;
};

type PeopleModalProps = {
  title: string;
  subtitle: string;
  staff: StaffPersonRow[];
  onClose: () => void;
};

export function PeopleModal({
  title,
  subtitle,
  staff,
  onClose,
}: PeopleModalProps) {
  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onClose}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">People on floor</p>
          <p className="mt-2 text-2xl font-semibold text-white">{staff.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Coverage</p>
          <p className="mt-2 text-2xl font-semibold text-white">Stable</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor note</p>
          <p className="mt-2 text-sm font-medium text-slate-200">Review overlap against sales</p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        <div>Name</div>
        <div>Role</div>
        <div>In</div>
        <div>Out</div>
        <div>Shift hrs</div>
        <div>Coverage</div>
      </div>

      <div className="mt-3 space-y-2">
        {staff.map((person) => (
          <div
            key={`${person.name}-${person.start}`}
            className="grid grid-cols-6 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
          >
            <div className="font-medium text-white">{person.name}</div>
            <div>{person.role}</div>
            <div>{person.start}</div>
            <div>{person.end}</div>
            <div>{person.shiftHours}</div>
            <div>{person.coverage}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
