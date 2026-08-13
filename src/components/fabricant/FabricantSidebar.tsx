"use client";

import {
  Home,
  Package,
  Tag,
  QrCode,
  BarChart3,
  Gem,
  CreditCard,
  Settings,
  LogOut,
  ChevronUp,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useFabricantNav, type FabricantPage } from "@/lib/fabricant-store";
import { MARQUE } from "@/lib/fabricant-data";
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
      { key: "produits", page: "produits", label: "Produits", icon: Package, badge: { text: "24", color: "#EF4444" } },
      { key: "lots", page: "lots", label: "Lots", icon: Tag, badge: { text: "87", color: "#EF4444" } },
      { key: "qr-codes", page: "qr-codes", label: "QR Codes", icon: QrCode, badge: { text: "1250", color: "#EF4444" } },
    ],
  },
  {
    title: "ANALYTIQUE",
    items: [
      { key: "statistiques", page: "statistiques", label: "Statistiques", icon: BarChart3 },
      { key: "score", page: "score", label: "Score Transparence", icon: Gem, badge: { text: "95/100", color: "#8B5CF6" } },
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
  statistiques: "statistiques",
  score: "score",
  abonnement: "abonnement",
  parametres: "parametres",
};

export function FabricantSidebar() {
  const { page, setPage, mobileSidebarOpen, setMobileSidebarOpen } = useFabricantNav();
  const activeKey = PAGE_TO_KEY[page];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-[70px] items-center gap-2 border-b border-[#F3F4F6] px-6">
        <Logo />
        <span className="ml-1 rounded-md bg-[#F3E8FF] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#8B5CF6]">
          Fabricant
        </span>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-6 pb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-[#9CA3AF]">
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
                          ? "bg-[#DBEAFE] text-[#2563EB]"
                          : "text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-[#2563EB]" />
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
      <div className="border-t border-[#F3F4F6] p-4">
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#F9FAFB]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] font-display text-sm font-bold text-white">
            {MARQUE.logo}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[14px] font-semibold text-[#111827]">{MARQUE.nom}</p>
            <span className="inline-flex items-center gap-1 text-[12px]">
              <span className="rounded bg-[#D1FAE5] px-1.5 py-0.5 text-[10px] font-bold text-[#065F46]">
                {MARQUE.plan}
              </span>
            </span>
          </div>
          <ChevronUp className="h-4 w-4 text-[#9CA3AF]" />
        </div>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#6B7280] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444]"
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-[#E5E7EB] bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-[#E5E7EB] bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
