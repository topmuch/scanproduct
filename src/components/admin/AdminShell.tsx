"use client";

import { useAdminNav } from "@/lib/admin-store";
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

export function AdminShell() {
  const { page } = useAdminNav();
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <AdminSidebar />
      <div className="lg:pl-[260px]">
        <AdminHeader />
        <main className="min-h-[calc(100vh-70px)]">{renderPage(page)}</main>
      </div>
    </div>
  );
}
