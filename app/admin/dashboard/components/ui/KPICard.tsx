import type { ReactNode } from "react";

export interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  color?: "blue" | "green" | "purple" | "orange" | "rose" | "sky";
}

const iconBgMap: Record<string, string> = {
  blue: "bg-claude-sand text-claude-charcoal",
  green: "bg-claude-sand text-claude-charcoal",
  purple: "bg-claude-sand text-claude-charcoal",
  orange: "bg-claude-sand text-claude-terracotta",
  rose: "bg-claude-sand text-claude-coral",
  sky: "bg-claude-sand text-claude-charcoal",
};

export function KPICard({ title, value, subtitle, icon, color = "blue" }: KPICardProps) {
  return (
    <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-5 shadow-ring-warm hover:shadow-whisper transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[13px] font-medium text-claude-stone">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBgMap[color] || iconBgMap.blue}`}>
          {icon}
        </div>
      </div>
      <p className="text-[28px] font-heading text-claude-near-black leading-none tracking-tight">{value}</p>
      <p className="text-[11px] text-claude-stone mt-2">{subtitle}</p>
    </div>
  );
}
