import type { SSEStatus } from "../../types";

interface SSEStatusIndicatorProps {
  status: SSEStatus;
}

export function SSEStatusIndicator({ status }: SSEStatusIndicatorProps) {
  const config = {
    connected: {
      dotClass: "bg-emerald-400",
      label: "リアルタイム",
      containerClass: "text-emerald-600 bg-emerald-50",
    },
    connecting: {
      dotClass: "bg-amber-400 animate-pulse",
      label: "再接続中...",
      containerClass: "text-amber-600 bg-amber-50",
    },
    disconnected: {
      dotClass: "bg-slate-300",
      label: "オフライン",
      containerClass: "text-slate-400 bg-slate-50",
    },
  };

  const { dotClass, label, containerClass } = config[status];

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${containerClass}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
    </div>
  );
}
