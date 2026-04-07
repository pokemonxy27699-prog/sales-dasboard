import { useEffect, useMemo, useState } from "react";
import {
  clearLaborDataset,
  clearSalesDataset,
  loadLaborDataset,
  loadSalesDataset,
  saveLaborDataset,
  saveSalesDataset,
} from "../../lib/data/storage";
import { importLaborFolder } from "../../lib/data/importers/labor";
import { importSalesFolder } from "../../lib/data/importers/sales";
import type { LaborDataset, SalesDataset } from "../../types/data";

type DirectoryInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory?: string;
  directory?: string;
};

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DataImportPage() {
  const [salesDataset, setSalesDataset] = useState<SalesDataset | null>(null);
  const [laborDataset, setLaborDataset] = useState<LaborDataset | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [salesStatus, setSalesStatus] = useState<string>("No sales folder imported yet.");
  const [laborStatus, setLaborStatus] = useState<string>("No labor folder imported yet.");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadExisting() {
      try {
        const [existingSales, existingLabor] = await Promise.all([loadSalesDataset(), loadLaborDataset()]);

        if (existingSales) {
          setSalesDataset(existingSales);
          setSalesStatus("Saved sales dataset loaded from this browser.");
        }

        if (existingLabor) {
          setLaborDataset(existingLabor);
          setLaborStatus("Saved labor dataset loaded from this browser.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load saved datasets.");
      }
    }

    void loadExisting();
  }, []);

  const salesTotals = useMemo(() => {
    if (!salesDataset) {
      return { sales: 0, transactions: 0, guests: 0, tips: 0 };
    }

    return salesDataset.daily.reduce(
      (acc, day) => {
        acc.sales += day.netSalesAmt;
        acc.transactions += day.transactionQty;
        acc.guests += day.guestCount;
        acc.tips += day.creditTips;
        return acc;
      },
      { sales: 0, transactions: 0, guests: 0, tips: 0 },
    );
  }, [salesDataset]);

  const laborTotals = useMemo(() => {
    if (!laborDataset) {
      return { hours: 0, cost: 0, employees: 0 };
    }

    const employeePeak = laborDataset.daily.reduce((max, day) => Math.max(max, day.employeeCount), 0);

    return laborDataset.daily.reduce(
      (acc, day) => {
        acc.hours += day.totalHours;
        acc.cost += day.totalCost;
        acc.employees = Math.max(acc.employees, employeePeak);
        return acc;
      },
      { hours: 0, cost: 0, employees: 0 },
    );
  }, [laborDataset]);

  async function handleSalesFolderChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setIsBusy(true);
    setError("");
    setSalesStatus("Reading sales folder...");

    try {
      const imported = await importSalesFolder(files);
      await saveSalesDataset(imported);
      setSalesDataset(imported);
      setSalesStatus("Sales folder imported and saved locally.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sales import failed.");
      setSalesStatus("Sales import failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLaborFolderChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setIsBusy(true);
    setError("");
    setLaborStatus("Reading labor folder...");

    try {
      const imported = await importLaborFolder(files);
      await saveLaborDataset(imported);
      setLaborDataset(imported);
      setLaborStatus("Labor folder imported and saved locally.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Labor import failed.");
      setLaborStatus("Labor import failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClearSales() {
    setIsBusy(true);
    setError("");
    try {
      await clearSalesDataset();
      setSalesDataset(null);
      setSalesStatus("Saved sales dataset cleared from this browser.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear saved sales dataset.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClearLabor() {
    setIsBusy(true);
    setError("");
    try {
      await clearLaborDataset();
      setLaborDataset(null);
      setLaborStatus("Saved labor dataset cleared from this browser.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear saved labor dataset.");
    } finally {
      setIsBusy(false);
    }
  }

  const salesFolderInputProps: DirectoryInputProps = {
    type: "file",
    multiple: true,
    onChange: handleSalesFolderChange,
    webkitdirectory: "",
    directory: "",
    accept: ".xls,.xlsx",
  };

  const laborFolderInputProps: DirectoryInputProps = {
    type: "file",
    multiple: true,
    onChange: handleLaborFolderChange,
    webkitdirectory: "",
    directory: "",
    accept: ".csv,.xls,.xlsx",
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/15 via-blue-400/10 to-transparent p-6 shadow-2xl shadow-black/20">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Data import</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Upload sales and labor folders</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sales and labor now use separate clean local datasets. Upload each top folder once and the app saves both in this browser.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sales folder import</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Upload sales folder</h3>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-cyan-400/20">
              {isBusy ? "Importing..." : "Upload Sales Folder"}
              <input {...salesFolderInputProps} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => void handleClearSales()}
              disabled={isBusy}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-900/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear Local Sales Data
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Status</p>
            <p className="mt-2">{salesStatus}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor folder import</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Upload labor folder</h3>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-400/20">
              {isBusy ? "Importing..." : "Upload Labor Folder"}
              <input {...laborFolderInputProps} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => void handleClearLabor()}
              disabled={isBusy}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-900/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear Local Labor Data
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Status</p>
            <p className="mt-2">{laborStatus}</p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sales dataset</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Current browser storage</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Coverage</span>
              <span className="text-white">{salesDataset ? `${formatDate(salesDataset.meta.minDate)} → ${formatDate(salesDataset.meta.maxDate)}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Years</span>
              <span className="text-white">{salesDataset ? salesDataset.meta.years.join(", ") : "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Files imported</span>
              <span className="text-white">{salesDataset ? salesDataset.meta.fileCount.toLocaleString() : "0"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Days loaded</span>
              <span className="text-white">{salesDataset ? salesDataset.meta.dayCount.toLocaleString() : "0"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Labor dataset</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Current browser storage</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Coverage</span>
              <span className="text-white">{laborDataset ? `${formatDate(laborDataset.meta.minDate)} → ${formatDate(laborDataset.meta.maxDate)}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Years</span>
              <span className="text-white">{laborDataset ? laborDataset.meta.years.join(", ") : "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Files imported</span>
              <span className="text-white">{laborDataset ? laborDataset.meta.fileCount.toLocaleString() : "0"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <span>Days loaded</span>
              <span className="text-white">{laborDataset ? laborDataset.meta.dayCount.toLocaleString() : "0"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Net Sales</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(salesTotals.sales)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{salesTotals.transactions.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor Hours</p>
          <p className="mt-2 text-2xl font-semibold text-white">{laborTotals.hours.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Labor Cost</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(laborTotals.cost)}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current clean state</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-300">
            Sales import is live and stored locally.
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-300">
            Labor import is back with a clean parser using hours × $18 loaded labor rate.
          </div>
        </div>
      </section>
    </div>
  );
}

