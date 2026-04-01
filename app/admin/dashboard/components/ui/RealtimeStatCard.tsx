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
      iconBg: "bg-emerald-50 text-emerald-600",
      pulse: "bg-emerald-500",
      accent: "text-emerald-600",
    },
    blue: {
      iconBg: "bg-blue-50 text-blue-600",
      pulse: "bg-blue-500",
      accent: "text-blue-600",
    },
    violet: {
      iconBg: "bg-violet-50 text-violet-600",
      pulse: "bg-violet-500",
      accent: "text-violet-600",
    },
  };
  const c = colorMap[color];

  return (
    <div className="relative bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md hover:shadow-slate-100 transition-all duration-200">
      {connected && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.pulse} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${c.pulse}`} />
        </span>
      )}
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-800">
          {value.toLocaleString()}
          <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
        </p>
        {subText && (
          <p className="text-[11px] text-slate-400 mt-0.5">{subText}</p>
        )}
      </div>
    </div>
  );
}
