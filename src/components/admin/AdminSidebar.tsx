"use client";

import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  FolderTree,
  BarChart3,
  LifeBuoy,
  ScrollText,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/landing/Logo";
import { useAdminNav, type AdminPage } from "@/lib/admin-store";
import { cn } from "@/lib/utils";

type NavItem = {
  page: AdminPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: { text: string; color: string };
  /** unique key to dedupe items that point to the same page */
  key: string;
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
      { key: "users", page: "users", label: "Utilisateurs", icon: Users, badge: { text: "12", color: "#EF4444" } },
      { key: "subscriptions", page: "subscriptions", label: "Abonnements", icon: CreditCard },
      { key: "products", page: "categories", label: "Produits", icon: Package },
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
    title: "ANALYTIQUE",
    items: [
      { key: "stats", page: "stats", label: "Statistiques", icon: BarChart3 },
      { key: "logs", page: "support", label: "Logs & Audit", icon: ScrollText },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { key: "tickets", page: "support", label: "Tickets", icon: LifeBuoy, badge: { text: "5", color: "#EF4444" } },
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
  stats: "stats",
  support: "tickets",
  "ticket-detail": "tickets",
  settings: "settings",
};

export function AdminSidebar() {
  const { page, setPage } = useAdminNav();
  const activeKey = PAGE_TO_KEY[page];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-white/10 bg-gradient-to-b from-[#1E3A8A] to-[#1E40AF] lg:flex">
      {/* Logo */}
      <div className="flex h-[80px] items-center gap-2 border-b border-white/10 px-6">
        <Logo />
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
                      {item.badge && (
                        <span
                          className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                          style={{ backgroundColor: item.badge.color }}
                        >
                          {item.badge.text}
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

      {/* Admin profile */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] font-display text-sm font-bold text-white">
            AV
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[14px] font-semibold text-white">Admin VerifScan</p>
            <p className="truncate text-[12px] text-white/60">admin@verifscan.sn</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 px-2 text-[11px] text-white/60">
          <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
          SuperAdmin · 2FA actif
        </div>
      </div>
    </aside>
  );
}
