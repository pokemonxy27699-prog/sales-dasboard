export type SalesHourlyRow = {
  date: string;
  hour: number;
  transactionQty: number;
  guestCount: number;
  refundedQty: number;
  refundedAmt: number;
  itemSalesQty: number;
  netSalesAmt: number;
  avgTicketTime: string;
  avgKitchenTime: string;
  creditTips: number;
  sourceFileName: string;
  sourceRelativePath: string;
};

export type SalesDailySummary = {
  date: string;
  transactionQty: number;
  guestCount: number;
  refundedQty: number;
  refundedAmt: number;
  itemSalesQty: number;
  netSalesAmt: number;
  creditTips: number;
  hoursLoaded: number;
  sourceFileName: string;
  sourceRelativePath: string;
};

export type SalesImportMeta = {
  importedAt: string;
  fileCount: number;
  dayCount: number;
  minDate: string | null;
  maxDate: string | null;
  years: number[];
};

export type SalesDataset = {
  kind: "sales";
  version: 1;
  daily: SalesDailySummary[];
  hourly: SalesHourlyRow[];
  meta: SalesImportMeta;
};


export type LaborDailySummary = {
  date: string;
  totalHours: number;
  totalCost: number;
  employeeCount: number;
  rowCount: number;
  sourceFileNames: string[];
};

export type LaborImportMeta = {
  importedAt: string;
  fileCount: number;
  dayCount: number;
  minDate: string | null;
  maxDate: string | null;
  years: number[];
};

export type LaborDataset = {
  kind: "labor";
  version: 1;
  daily: LaborDailySummary[];
  meta: LaborImportMeta;
};
