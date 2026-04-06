import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/15 via-blue-400/10 to-transparent p-6 shadow-2xl shadow-black/20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Phase 1 dashboard
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Clean shell first. Data later.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This rebuild starts with layout, navigation, card system, and page structure.
            No parser logic. No fake business calculations. Just a strong frontend base.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Week to date sales" value="$0" subtext="Placeholder KPI card" />
        <StatCard label="Month to date sales" value="$0" subtext="Placeholder KPI card" />
        <StatCard label="Transactions" value="0" subtext="Placeholder KPI card" />
        <StatCard label="Labor %" value="0%" subtext="Placeholder KPI card" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard
            title="Executive Overview"
            subtitle="This area will hold weekly, monthly, and yearly comparison cards."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
                Sales comparison panel
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
                Transaction comparison panel
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
                Labor efficiency panel
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
                Weather and traffic panel
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Alerts"
          subtitle="This area will show staffing, discount, and anomaly alerts."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              No live alerts yet
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
              Frontend shell ready
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
