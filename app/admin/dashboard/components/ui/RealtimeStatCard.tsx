import type { ReactNode } from "react";

interface RealtimeStatCardProps {
  label: string;
  value: number;
  unit: string;
  subText?: string;
  icon: ReactNode;
  color: "emerald" | "blue" | "violet" | "rose";
  connected: boolean;
}

export function RealtimeStatCard({ label, value, unit, subText, icon, color, connected }: RealtimeStatCardProps) {
  const colorMap = {
    emerald: {
      iconBg: "bg-claude-sand text-claude-charcoal",
      pulse: "bg-emerald-500",
      accent: "text-emerald-600",
    },
    blue: {
      iconBg: "bg-claude-sand text-claude-charcoal",
      pulse: "bg-claude-terracotta",
      accent: "text-claude-terracotta",
    },
    violet: {
      iconBg: "bg-claude-sand text-claude-charcoal",
      pulse: "bg-claude-coral",
      accent: "text-claude-coral",
    },
    rose: {
      iconBg: "bg-claude-sand text-claude-charcoal",
      pulse: "bg-red-500",
      accent: "text-red-500",
    },
  };
  const c = colorMap[color];

  return (
    <div className="relative bg-claude-ivory border border-claude-border-cream rounded-2xl p-4 flex items-center gap-4 shadow-ring-warm hover:shadow-whisper transition-all duration-200">
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
        <p className="text-[11px] font-medium text-claude-stone">{label}</p>
        <p className="text-2xl font-bold text-claude-near-black">
          {value.toLocaleString()}
          <span className="text-sm font-normal text-claude-stone ml-1">{unit}</span>
        </p>
        {subText && (
          <p className="text-[11px] text-claude-stone mt-0.5">{subText}</p>
        )}
      </div>
    </div>
  );
}
