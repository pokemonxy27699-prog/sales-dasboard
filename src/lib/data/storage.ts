import type { LaborDataset, SalesDataset } from "../../types/data";

const DB_NAME = "brusters-dashboard-v3";
const DB_VERSION = 1;
const SALES_STORE = "sales-datasets";
const LABOR_STORE = "labor-datasets";
const SALES_KEY = "primary";
const LABOR_KEY = "primary";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SALES_STORE)) {
        db.createObjectStore(SALES_STORE);
      }

      if (!db.objectStoreNames.contains(LABOR_STORE)) {
        db.createObjectStore(LABOR_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function putRecord<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to save ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Save transaction aborted for ${storeName}`));
  });

  db.close();
}

async function getRecord<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDb();

  const result = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);

    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error(`Failed to load ${storeName}`));
  });

  db.close();
  return result;
}

async function deleteRecord(storeName: string, key: string): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to clear ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Clear transaction aborted for ${storeName}`));
  });

  db.close();
}

export function saveSalesDataset(dataset: SalesDataset): Promise<void> {
  return putRecord(SALES_STORE, SALES_KEY, dataset);
}

export function loadSalesDataset(): Promise<SalesDataset | null> {
  return getRecord<SalesDataset>(SALES_STORE, SALES_KEY);
}

export function clearSalesDataset(): Promise<void> {
  return deleteRecord(SALES_STORE, SALES_KEY);
}

export function saveLaborDataset(dataset: LaborDataset): Promise<void> {
  return putRecord(LABOR_STORE, LABOR_KEY, dataset);
}

export function loadLaborDataset(): Promise<LaborDataset | null> {
  return getRecord<LaborDataset>(LABOR_STORE, LABOR_KEY);
}

export function clearLaborDataset(): Promise<void> {
  return deleteRecord(LABOR_STORE, LABOR_KEY);
}
