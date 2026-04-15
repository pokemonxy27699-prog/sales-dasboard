import { useMemo, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { DataImportPage } from "./features/data-import/DataImportPage";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { LaborPage } from "./features/labor/LaborPage";
import { InventoryPage } from "./features/inventory/InventoryPage";
import { DiscountsPage } from "./features/discounts/DiscountsPage";
import { LoyaltyPage } from "./features/loyalty/LoyaltyPage";
import { AiPage } from "./features/ai/AiPage";
import type { NavKey } from "./types/navigation";

function App() {
  const [activePage, setActivePage] = useState<NavKey>("dashboard");
  const [dateFilter, setDateFilter] = useState<{
    start: string | null;
    end: string | null;
  }>({
    start: null,
    end: null,
  });

  const page = useMemo(() => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage dateFilter={dateFilter} />;
      case "data":
        return <DataImportPage />;
      case "calendar":
        return <CalendarPage dateFilter={dateFilter} />;
      case "transactions":
        return <TransactionsPage dateFilter={dateFilter} />;
      case "labor":
        return <LaborPage dateFilter={dateFilter} />;
      case "inventory":
        return <InventoryPage />;
      case "discounts":
        return <DiscountsPage />;
      case "loyalty":
        return <LoyaltyPage />;
      case "ai":
        return <AiPage />;
      default:
        return <DashboardPage dateFilter={dateFilter} />;
    }
  }, [activePage, dateFilter]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:h-[calc(100vh-2rem)]">
          <Sidebar active={activePage} onChange={setActivePage} />
        </div>

        <main className="min-w-0 space-y-4">
          <TopBar
            active={activePage}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
          {page}
        </main>
      </div>
    </div>
  );
}

export default App;