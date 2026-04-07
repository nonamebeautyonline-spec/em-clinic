import type { SSEStatus } from "../../types";

interface SSEStatusIndicatorProps {
  status: SSEStatus;
}

export function SSEStatusIndicator({ status }: SSEStatusIndicatorProps) {
  const config = {
    connected: {
      dotClass: "bg-emerald-400",
      label: "リアルタイム",
      containerClass: "text-emerald-700 bg-emerald-50",
    },
    connecting: {
      dotClass: "bg-claude-coral animate-pulse",
      label: "再接続中...",
      containerClass: "text-claude-coral bg-claude-sand",
    },
    disconnected: {
      dotClass: "bg-claude-stone",
      label: "オフライン",
      containerClass: "text-claude-stone bg-claude-sand",
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
