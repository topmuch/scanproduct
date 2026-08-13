"use client";

import {
  Users,
  CreditCard,
  TrendingUp,
  LifeBuoy,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
} from "lucide-react";
import { useAdminNav } from "@/lib/admin-store";
import {
  formatFCFA,
  GLOBAL_KPI,
  SIGNUPS_DATA,
  PLAN_DISTRIBUTION,
  TOP_MAKERS,
  REVENUE_DATA,
  ACTIVITY_LOGS,
  type ActivityLog,
} from "@/lib/admin-data";
import { CountUp } from "@/components/landing/CountUp";
import { PageContainer, Card, CardHeader, Badge, Button } from "@/components/admin/ui";
import { AreaTrend, Donut, BarH, BarV } from "@/components/admin/charts";

/* ---------- KPI cards ---------- */

type KpiCardProps = {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: React.ReactNode;
  trend: string;
  trendPositive: boolean;
  subtext: string;
};

function KpiCard({ icon, iconBg, title, value, trend, trendPositive, subtext }: KpiCardProps) {
  const TrendIcon = trendPositive ? ArrowUpRight : ArrowDownRight;
  const trendColor = trendPositive ? "#10B981" : "#EF4444";
  return (
    <Card className="group p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2563EB]/5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">
          {title}
        </p>
      </div>

      <div className="mt-4 text-[32px] font-bold leading-tight text-[#111827]">
        {value}
      </div>

      <div className="mt-2 flex items-center gap-1 text-[13px] font-semibold" style={{ color: trendColor }}>
        <TrendIcon className="h-4 w-4" />
        <span>{trend}</span>
      </div>

      <p className="mt-2 text-[13px] text-[#6B7280]">{subtext}</p>
    </Card>
  );
}

/* ---------- Activity table ---------- */

const ACTIVITY_BADGE_COLOR: Record<
  ActivityLog["type"],
  "green" | "blue" | "yellow" | "red" | "gray"
> = {
  Inscription: "green",
  Paiement: "blue",
  Support: "yellow",
  Alerte: "red",
  Système: "gray",
};

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function ActivityAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] text-[13px] font-bold text-white">
        {initial}
      </div>
      <span className="whitespace-nowrap text-[13px] font-medium text-[#374151]">
        {name}
      </span>
    </div>
  );
}

/* ---------- Page ---------- */

export function DashboardPage() {
  const setPage = useAdminNav((s) => s.setPage);
  const recentLogs = ACTIVITY_LOGS.slice(0, 8);

  const signupsChartData = SIGNUPS_DATA.map((d) => ({ label: d.month, value: d.value }));
  const planTotal = PLAN_DISTRIBUTION.reduce((sum, d) => sum + d.value, 0);
  const topMakersChartData = TOP_MAKERS.map((d) => ({
    label: truncate(d.name, 22),
    value: d.scans,
  }));
  const revenueChartData = REVENUE_DATA.map((d) => ({
    label: d.month,
    value: Math.round(d.value / 1000),
  }));

  return (
    <PageContainer>
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Users className="h-6 w-6 text-[#2563EB]" />}
          iconBg="#EFF6FF"
          title="Total Fabricants"
          value={<CountUp end={GLOBAL_KPI.totalMakers} />}
          trend="+12 ce mois"
          trendPositive
          subtext={`${GLOBAL_KPI.activeMakers} actifs · ${GLOBAL_KPI.inactiveMakers} inactifs`}
        />
        <KpiCard
          icon={<CreditCard className="h-6 w-6 text-[#10B981]" />}
          iconBg="#F0FDF4"
          title="Revenus MRR"
          value={<CountUp end={GLOBAL_KPI.mrr} suffix=" FCFA" />}
          trend="+8.5% vs mois dernier"
          trendPositive
          subtext="180 Pro · 65 Starter · 3 Enterprise"
        />
        <KpiCard
          icon={<TrendingUp className="h-6 w-6 text-[#F59E0B]" />}
          iconBg="#FFFBEB"
          title="Scans Totaux"
          value={<CountUp end={GLOBAL_KPI.totalScans} />}
          trend="+23% cette semaine"
          trendPositive
          subtext={`Moyenne : ${formatFCFA(GLOBAL_KPI.scansAvgPerDay)} scans/jour`}
        />
        <KpiCard
          icon={<LifeBuoy className="h-6 w-6 text-[#EF4444]" />}
          iconBg="#FEE2E2"
          title="Tickets Ouverts"
          value={<CountUp end={GLOBAL_KPI.openTickets} />}
          trend="-3 vs hier"
          trendPositive={false}
          subtext={`${GLOBAL_KPI.urgentTickets} urgents · ${GLOBAL_KPI.normalTickets} normaux`}
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Nouveaux fabricants" subtitle="12 derniers mois" />
          <div className="p-5">
            <AreaTrend data={signupsChartData} color="#2563EB" height={300} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Répartition des plans" />
          <div className="p-5">
            <Donut data={PLAN_DISTRIBUTION} centerLabel={String(planTotal)} height={300} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top fabricants" subtitle="Par nombre de scans" />
          <div className="p-5">
            <BarH data={topMakersChartData} height={380} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenus" subtitle="12 derniers mois (FCFA, milliers)" />
          <div className="p-5">
            <BarV data={revenueChartData} color="#10B981" height={300} />
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-6">
        <CardHeader
          title="Activité récente"
          action={
            <Button variant="ghost" size="sm" onClick={() => setPage("support")}>
              Voir tout
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-[#F3F4F6] text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Utilisateur</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr
                  key={log.id}
                  className="h-16 border-b border-[#F3F4F6] transition-colors last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-[13px] text-[#6B7280]">
                    {log.timestamp}
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={ACTIVITY_BADGE_COLOR[log.type]}>{log.type}</Badge>
                  </td>
                  <td className="px-5 py-3 text-[13px] font-medium text-[#111827]">
                    {log.description}
                  </td>
                  <td className="px-5 py-3">
                    <ActivityAvatar name={log.user} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2563EB] hover:underline"
                      onClick={() => setPage("support")}
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#F3F4F6] px-5 py-3">
          <p className="text-[13px] text-[#6B7280]">Affichage 1-8 sur 162</p>
          <Button variant="outline" size="sm">
            Suivant
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}

export default DashboardPage;
