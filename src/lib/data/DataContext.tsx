import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppDataset } from "../../types/data";
import { createEmptyDataset, mergeImportResults, withFreshMeta } from "./contracts";
import { createSeedDataset } from "./seed";
import { clearDataset, loadDataset, saveDataset } from "./storage";
import { importLaborFiles } from "./importers/labor";
import { importSalesFiles } from "./importers/sales";
import { importTransactionFiles } from "./importers/transactions";

type DataContextValue = {
  dataset: AppDataset;
  isReady: boolean;
  isBusy: boolean;
  error: string | null;
  loadDevSeed: () => Promise<void>;
  clearLocalData: () => Promise<void>;
  importSales: (files: File[]) => Promise<void>;
  importLabor: (files: File[]) => Promise<void>;
  importTransactions: (files: File[]) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<AppDataset>(createEmptyDataset());
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadDataset()
      .then((loaded) => {
        if (!active) return;
        setDataset(loaded);
        setIsReady(true);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Failed to load local dataset");
        setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  async function persist(nextDataset: AppDataset) {
    const fresh = withFreshMeta(nextDataset);
    await saveDataset(fresh);
    setDataset(fresh);
  }

  async function runImport(task: () => Promise<AppDataset>) {
    setIsBusy(true);
    setError(null);

    try {
      const next = await task();
      await persist(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed");
    } finally {
      setIsBusy(false);
    }
  }

  const value = useMemo<DataContextValue>(
    () => ({
      dataset,
      isReady,
      isBusy,
      error,
      loadDevSeed: async () => {
        await runImport(async () => createSeedDataset());
      },
      clearLocalData: async () => {
        setIsBusy(true);
        setError(null);

        try {
          await clearDataset();
          setDataset(createEmptyDataset());
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Failed to clear local dataset");
        } finally {
          setIsBusy(false);
        }
      },
      importSales: async (files: File[]) => {
        await runImport(async () => {
          const results = await importSalesFiles(files);
          return mergeImportResults(dataset, results);
        });
      },
      importLabor: async (files: File[]) => {
        await runImport(async () => {
          const results = await importLaborFiles(files);
          return mergeImportResults(dataset, results);
        });
      },
      importTransactions: async (files: File[]) => {
        await runImport(async () => {
          const results = await importTransactionFiles(files);
          return mergeImportResults(dataset, results);
        });
      },
    }),
    [dataset, error, isBusy, isReady],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData() {
  const value = useContext(DataContext);

  if (!value) {
    throw new Error("useAppData must be used inside DataProvider");
  }

  return value;
}
