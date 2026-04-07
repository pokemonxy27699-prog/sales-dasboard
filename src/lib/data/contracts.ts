import type { AppDataset, DatasetMeta, ImportKind, ImportParseResult } from "../../types/data";

export const DATASET_VERSION = 1;
export const DATASET_DB_NAME = "brusters-dashboard";
export const DATASET_STORE_NAME = "dataset";
export const DATASET_RECORD_KEY = "main";
export const DEFAULT_LABOR_RATE = 18;

export function createEmptyMeta(): DatasetMeta {
  return {
    version: DATASET_VERSION,
    mode: "empty",
    lastUpdatedAt: null,
    sourceCount: 0,
    recordCount: 0,
  };
}

export function createEmptyDataset(): AppDataset {
  return {
    meta: createEmptyMeta(),
    sources: [],
    dailySummaries: [],
    hourlySummaries: [],
    ticketSummaries: [],
    ticketItems: [],
    laborDays: [],
    laborHours: [],
    inventoryItems: [],
    recipes: [],
    supplierItems: [],
    discountSummaries: [],
    loyaltySurveyRows: [],
  };
}

export function countDatasetRecords(dataset: AppDataset): number {
  return (
    dataset.dailySummaries.length +
    dataset.hourlySummaries.length +
    dataset.ticketSummaries.length +
    dataset.ticketItems.length +
    dataset.laborDays.length +
    dataset.laborHours.length +
    dataset.inventoryItems.length +
    dataset.recipes.length +
    dataset.supplierItems.length +
    dataset.discountSummaries.length +
    dataset.loyaltySurveyRows.length
  );
}

export function withFreshMeta(dataset: AppDataset): AppDataset {
  return {
    ...dataset,
    meta: {
      ...dataset.meta,
      version: DATASET_VERSION,
      sourceCount: dataset.sources.length,
      recordCount: countDatasetRecords(dataset),
      lastUpdatedAt: new Date().toISOString(),
      mode:
        countDatasetRecords(dataset) === 0
          ? "empty"
          : dataset.meta.mode === "empty"
          ? "imported"
          : dataset.meta.mode,
    },
  };
}

export function mergeImportResults(
  current: AppDataset,
  results: ImportParseResult[],
  nextMode: AppDataset["meta"]["mode"] = "imported",
): AppDataset {
  const merged: AppDataset = {
    ...current,
    meta: {
      ...current.meta,
      mode: nextMode,
    },
    sources: [...current.sources],
    dailySummaries: [...current.dailySummaries],
    hourlySummaries: [...current.hourlySummaries],
    ticketSummaries: [...current.ticketSummaries],
    ticketItems: [...current.ticketItems],
    laborDays: [...current.laborDays],
    laborHours: [...current.laborHours],
  };

  for (const result of results) {
    merged.sources.push(result.source);
    if (result.dailySummaries?.length) merged.dailySummaries.push(...result.dailySummaries);
    if (result.hourlySummaries?.length) merged.hourlySummaries.push(...result.hourlySummaries);
    if (result.ticketSummaries?.length) merged.ticketSummaries.push(...result.ticketSummaries);
    if (result.ticketItems?.length) merged.ticketItems.push(...result.ticketItems);
    if (result.laborDays?.length) merged.laborDays.push(...result.laborDays);
    if (result.laborHours?.length) merged.laborHours.push(...result.laborHours);
  }

  return withFreshMeta(merged);
}

export function makeImportSource(kind: ImportKind, file: File, notes?: string) {
  return {
    id: `${kind}-${file.name}-${file.lastModified}-${file.size}`,
    kind,
    fileName: file.name,
    fileSize: file.size,
    importedAt: new Date().toISOString(),
    notes,
  };
}
