"use client";

import {
  LayoutDashboard,
  Users,
  CreditCard,
  FolderTree,
  Newspaper,
  QrCode,
  BarChart3,
  LifeBuoy,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/landing/Logo";
import { useAdminNav, type AdminPage } from "@/lib/admin-store";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import type { AdminData } from "@/lib/admin-server-data";
import { cn } from "@/lib/utils";

type NavItem = {
  page: AdminPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** unique key to dedupe items that point to the same page */
  key: string;
  /** optional badge color (defaults to #EF4444) */
  badgeColor?: string;
  /** returns the badge text from current admin data; undefined hides the badge */
  badgeFromData?: (data: AdminData) => string | undefined;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "PRINCIPAL",
    items: [
      { key: "dashboard", page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      {
        key: "users",
        page: "users",
        label: "Utilisateurs",
        icon: Users,
        badgeColor: "#EF4444",
        badgeFromData: (d) => (d.users.length > 0 ? String(d.users.length) : undefined),
      },
      { key: "subscriptions", page: "subscriptions", label: "Abonnements", icon: CreditCard },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { key: "categories", page: "categories", label: "Catégories", icon: FolderTree },
      { key: "settings", page: "settings", label: "Paramètres", icon: Settings },
    ],
  },
  {
    title: "CONTENU",
    items: [
      { key: "blog", page: "blog", label: "Blog", icon: Newspaper },
      { key: "batches", page: "batches", label: "QR Artisans", icon: QrCode },
    ],
  },
  {
    title: "ANALYTIQUE",
    items: [
      { key: "stats", page: "stats", label: "Statistiques", icon: BarChart3 },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      {
        key: "tickets",
        page: "support",
        label: "Tickets",
        icon: LifeBuoy,
        badgeColor: "#EF4444",
        badgeFromData: (d) => {
          const openCount = d.tickets.filter((t) => t.status !== "Résolu").length;
          return openCount > 0 ? String(openCount) : undefined;
        },
      },
    ],
  },
];

// Map page -> the nav key that should be highlighted
const PAGE_TO_KEY: Record<AdminPage, string> = {
  dashboard: "dashboard",
  users: "users",
  "user-detail": "users",
  subscriptions: "subscriptions",
  plans: "subscriptions",
  categories: "categories",
  blog: "blog",
  batches: "batches",
  stats: "stats",
  support: "tickets",
  "ticket-detail": "tickets",
  settings: "settings",
};

export function AdminSidebar() {
  const { page, setPage } = useAdminNav();
  const data = useAdminData();
  const activeKey = PAGE_TO_KEY[page];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-white/10 bg-gradient-to-b from-[#0D3068] to-[#0A2B5F] lg:flex">
      {/* Logo */}
      <div className="flex h-[80px] items-center gap-2 border-b border-white/10 px-5">
        {/* Pastille blanche : le logo couleur reste lisible sur fond sombre */}
        <span className="inline-flex shrink-0 items-center rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
          <Logo size="sm" />
        </span>
        <span className="ml-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-6 pb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-white/60">
              {section.title}
            </p>
            <ul className="space-y-0.5 px-3">
              {section.items.map((item) => {
                const isActive = activeKey === item.key;
                const badgeText = item.badgeFromData?.(data);
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setPage(item.page)}
                      className={cn(
                        "group relative flex h-11 w-full items-center gap-3 rounded-lg px-4 text-[14px] font-medium transition-colors",
                        isActive
                          ? "bg-white/15 font-semibold text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-white" />
                      )}
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {badgeText && (
                        <span
                          className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                          style={{ backgroundColor: item.badgeColor ?? "#EF4444" }}
                        >
                          {badgeText}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Déconnexion (sans infos de compte affichées) */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
