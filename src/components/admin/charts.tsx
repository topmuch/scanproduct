"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function ChartTooltip({ active, payload, label, suffix = "", prefix = "" }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 shadow-lg">
      {label != null && <p className="mb-1 text-[12px] font-medium text-[#6B7280]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString("fr-FR") : p.value}{suffix}
          {p.payload?.growth != null && (
            <span className="text-[11px] text-[#10B981]">(+{p.payload.growth}%)</span>
          )}
        </p>
      ))}
    </div>
  );
}

type AreaTrendProps = {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
};

export function AreaTrend({ data, color = "#2563EB", height = 280 }: AreaTrendProps) {
  const id = `grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

type LineTrendProps = {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
};

export function LineTrend({ data, color = "#2563EB", height = 280 }: LineTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

type BarVProps = {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
};

export function BarV({ data, color = "#10B981", height = 280 }: BarVProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F9FAFB" }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type BarHProps = {
  data: { label: string; value: number; sub?: number }[];
  height?: number;
};

export function BarH({ data, height = 360 }: BarHProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "#374151", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F9FAFB" }} />
        <defs>
          <linearGradient id="barH-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <Bar dataKey="value" fill="url(#barH-grad)" radius={[0, 6, 6, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type DonutProps = {
  data: { name: string; value: number; color: string }[];
  centerLabel?: string;
  height?: number;
};

export function Donut({ data, centerLabel, height = 280 }: DonutProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={100}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          iconType="circle"
          formatter={(v) => <span className="text-[13px] text-[#374151]">{v}</span>}
        />
        {centerLabel && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-[#111827]">
            <tspan className="font-display text-[24px] font-bold">{centerLabel}</tspan>
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
