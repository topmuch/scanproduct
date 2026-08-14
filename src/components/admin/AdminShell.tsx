"use client";

import { useAdminNav } from "@/lib/admin-store";
import { AdminDataProvider, type useAdminData as _UseAdminData } from "./AdminDataProvider";
import type { AdminData } from "@/lib/admin-server-data";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { PlansConfigPage } from "./pages/PlansConfigPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { StatsPage } from "./pages/StatsPage";
import { SupportPage } from "./pages/SupportPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { SettingsPage } from "./pages/SettingsPage";

// `useAdminData` is exported from AdminDataProvider for pages that need it.
// We reference it here only to keep the import tree-shakeable; the symbol
// is consumed by the individual page components.
void _UseAdminData;

function renderPage(page: string) {
  switch (page) {
    case "dashboard":
      return <DashboardPage />;
    case "users":
    case "user-detail":
      return page === "user-detail" ? <UserDetailPage /> : <UsersPage />;
    case "subscriptions":
      return <SubscriptionsPage />;
    case "plans":
      return <PlansConfigPage />;
    case "categories":
      return <CategoriesPage />;
    case "stats":
      return <StatsPage />;
    case "support":
    case "ticket-detail":
      return page === "ticket-detail" ? <TicketDetailPage /> : <SupportPage />;
    case "settings":
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

export function AdminShell({ initialData }: { initialData: AdminData }) {
  const { page } = useAdminNav();
  return (
    <AdminDataProvider initialData={initialData}>
      <div className="min-h-screen bg-[#F9FAFB]">
        <AdminSidebar />
        <div className="lg:pl-[260px]">
          <AdminHeader />
          <main className="min-h-[calc(100vh-70px)]">{renderPage(page)}</main>
        </div>
      </div>
    </AdminDataProvider>
  );
}
