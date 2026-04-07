import type { AppDataset } from "../../types/data";

type ImportStatusCardProps = {
  dataset: AppDataset;
  isBusy: boolean;
  error: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not saved yet";
  return new Date(value).toLocaleString();
}

export function ImportStatusCard({ dataset, isBusy, error }: ImportStatusCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">
          Mode: {dataset.meta.mode}
        </span>
        <span className="text-sm text-slate-400">
          Records: {dataset.meta.recordCount.toLocaleString()}
        </span>
        <span className="text-sm text-slate-400">
          Sources: {dataset.meta.sourceCount.toLocaleString()}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last saved</p>
          <p className="mt-2 text-sm text-white">{formatDateTime(dataset.meta.lastUpdatedAt)}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Storage</p>
          <p className="mt-2 text-sm text-white">IndexedDB main dataset</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</p>
          <p className="mt-2 text-sm text-white">{isBusy ? "Working..." : "Idle"}</p>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {dataset.sources.length > 0 ? (
        <div className="mt-3 space-y-2">
          {dataset.sources.slice(-5).reverse().map((source) => (
            <div
              key={source.id}
              className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
            >
              <span className="font-medium text-white">{source.kind}</span>
              {" · "}
              {source.fileName}
              {source.notes ? <span className="text-slate-500"> · {source.notes}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
