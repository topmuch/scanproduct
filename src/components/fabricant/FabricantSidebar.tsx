"use client";

import {
  Home,
  Package,
  Tag,
  QrCode,
  Layers,
  BarChart3,
  Bell,
  Gem,
  CreditCard,
  Settings,
  LogOut,
  ChevronUp,
  Sparkles,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/landing/Logo";
import { useFabricantNav, type FabricantPage } from "@/lib/fabricant-store";
import { useFabricantData } from "./FabricantDataProvider";
import { cn } from "@/lib/utils";

type NavItem = {
  page: FabricantPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: { text: string; color: string };
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
      { key: "accueil", page: "accueil", label: "Accueil", icon: Home },
      // Dynamic counts are injected at render time below — these `badge`
      // values are overwritten via the `<SidebarNav />` helper.
      { key: "produits", page: "produits", label: "Produits", icon: Package, badge: { text: "0", color: "#EF4444" } },
      { key: "lots", page: "lots", label: "Lots", icon: Tag, badge: { text: "0", color: "#EF4444" } },
      { key: "qr-codes", page: "qr-codes", label: "QR Codes", icon: QrCode, badge: { text: "0", color: "#EF4444" } },
      { key: "qr-masse", page: "qr-masse", label: "Génération en masse", icon: Layers },
    ],
  },
  {
    title: "ANALYTIQUE",
    items: [
      { key: "statistiques", page: "statistiques", label: "Statistiques", icon: BarChart3 },
      { key: "notifications", page: "notifications", label: "Notifications", icon: Bell },
      { key: "score", page: "score", label: "Score Transparence", icon: Gem, badge: { text: "0/100", color: "#8B5CF6" } },
    ],
  },
  {
    title: "COMPTE",
    items: [
      { key: "abonnement", page: "abonnement", label: "Abonnement", icon: CreditCard },
      { key: "parametres", page: "parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

const PAGE_TO_KEY: Record<FabricantPage, string> = {
  accueil: "accueil",
  produits: "produits",
  "produit-detail": "produits",
  lots: "lots",
  "lot-detail": "lots",
  "qr-codes": "qr-codes",
  "qr-masse": "qr-masse",
  statistiques: "statistiques",
  notifications: "notifications",
  score: "score",
  abonnement: "abonnement",
  parametres: "parametres",
};

export function FabricantSidebar() {
  const { page, setPage, mobileSidebarOpen, setMobileSidebarOpen } = useFabricantNav();
  const { data } = useFabricantData();
  const activeKey = PAGE_TO_KEY[page];

  // Compute real badge counts from the dashboard data.
  const badgesByPage: Record<string, string> = {
    produits: String(data.products.length),
    lots: String(data.lots.length),
    "qr-codes": String(data.qrCodes.length),
    score: `${data.score.global}/100`,
  };

  // Avatar logo fallback: if the computed initials are empty (edge case where
  // neither name nor companyName is set), fall back to the first letter of the
  // company name, then to "F" (Fabricant). Prevents layout breaks when
  // data.profile.logo is an empty string.
  const logoInitial =
    data.profile.logo?.trim() ||
    data.profile.companyName?.charAt(0)?.toUpperCase() ||
    "F";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-[80px] items-center gap-2 border-b border-white/10 px-6">
        <Logo />
        <span className="ml-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Fabricant
        </span>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-6 pb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-white/60">
              {section.title}
            </p>
            <ul className="space-y-0.5 px-3">
              {section.items.map((item) => {
                const isActive = activeKey === item.key;
                const dynamicText = badgesByPage[item.key];
                const badge = dynamicText
                  ? { text: dynamicText, color: item.badge?.color ?? "#EF4444" }
                  : item.badge;
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
                      {badge && (
                        <span
                          className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                          style={{ backgroundColor: badge.color }}
                        >
                          {badge.text}
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

      {/* Upgrade CTA */}
      <div className="px-4 pb-3">
        <div className="rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] p-4 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <p className="text-[13px] font-semibold">Passez à Business</p>
          </div>
          <p className="mt-1 text-[12px] text-white/90">
            QR codes illimités, API, marketplace B2B.
          </p>
          <button
            type="button"
            onClick={() => setPage("abonnement")}
            className="mt-3 w-full rounded-lg bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-[#F59E0B] transition-colors hover:bg-white"
          >
            Upgrade
          </button>
        </div>
      </div>

      {/* Profile */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] font-display text-sm font-bold text-white">
            {logoInitial}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[14px] font-semibold text-white">{data.profile.companyName}</p>
            <span className="inline-flex items-center gap-1 text-[12px]">
              <span className="rounded bg-[#D1FAE5] px-1.5 py-0.5 text-[10px] font-bold text-[#065F46]">
                {data.profile.plan}
              </span>
            </span>
          </div>
          <ChevronUp className="h-4 w-4 text-white/60" />
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-white/10 bg-gradient-to-b from-[#1E3A8A] to-[#1E40AF] lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-white/10 bg-gradient-to-b from-[#1E3A8A] to-[#1E40AF]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
