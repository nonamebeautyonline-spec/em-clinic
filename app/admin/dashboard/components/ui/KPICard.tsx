import type { ReactNode } from "react";

export interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  color?: "blue" | "green" | "purple" | "orange" | "rose" | "sky";
}

const iconBgMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  purple: "bg-violet-50 text-violet-600",
  orange: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-500",
  sky: "bg-sky-50 text-sky-600",
};

export function KPICard({ title, value, subtitle, icon, color = "blue" }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:shadow-slate-100 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[13px] font-medium text-slate-400">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBgMap[color] || iconBgMap.blue}`}>
          {icon}
        </div>
      </div>
      <p className="text-[28px] font-bold text-slate-800 leading-none tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-400 mt-2">{subtitle}</p>
    </div>
  );
}
