import type { SSEStatus } from "../../types";

interface SSEStatusIndicatorProps {
  status: SSEStatus;
}

export function SSEStatusIndicator({ status }: SSEStatusIndicatorProps) {
  const config = {
    connected: {
      dotClass: "bg-green-500",
      label: "リアルタイム",
      containerClass: "bg-green-50 text-green-700 border-green-200",
    },
    connecting: {
      dotClass: "bg-yellow-500 animate-pulse",
      label: "再接続中...",
      containerClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    disconnected: {
      dotClass: "bg-slate-400",
      label: "オフライン",
      containerClass: "bg-slate-50 text-slate-500 border-slate-200",
    },
  };

  const { dotClass, label, containerClass } = config[status];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${containerClass}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      {label}
    </div>
  );
}
