import type { ImportParseResult } from "../../../types/data";
import { makeImportSource } from "../contracts";

export async function importTransactionFiles(files: File[]): Promise<ImportParseResult[]> {
  return files.map((file) => ({
    kind: "transactions",
    source: makeImportSource("transactions", file, "Importer shell only. Transaction parser not wired yet."),
    ticketSummaries: [],
    ticketItems: [],
  }));
}
