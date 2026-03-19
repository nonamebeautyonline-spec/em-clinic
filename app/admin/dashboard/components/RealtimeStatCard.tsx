import type { ReactNode } from "react";

interface RealtimeStatCardProps {
  label: string;
  value: number;
  unit: string;
  subText?: string;
  icon: ReactNode;
  color: "emerald" | "blue" | "violet";
  connected: boolean;
}

export function RealtimeStatCard({ label, value, unit, subText, icon, color, connected }: RealtimeStatCardProps) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-600",
      value: "text-emerald-700",
      pulse: "bg-emerald-500",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-100 text-blue-600",
      value: "text-blue-700",
      pulse: "bg-blue-500",
    },
    violet: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      iconBg: "bg-violet-100 text-violet-600",
      value: "text-violet-700",
      pulse: "bg-violet-500",
    },
  };
  const c = colorMap[color];

  return (
    <div className={`relative ${c.bg} border ${c.border} rounded-xl p-4 flex items-center gap-4 transition-all`}>
      {/* SSEライブインジケーター */}
      {connected && (
        <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.pulse} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.pulse}`} />
        </span>
      )}
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${c.iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className={`text-2xl font-bold ${c.value}`}>
          {value.toLocaleString()}
          <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
        </div>
        {subText && (
          <div className="text-[11px] text-slate-400 mt-0.5">{subText}</div>
        )}
      </div>
    </div>
  );
}
