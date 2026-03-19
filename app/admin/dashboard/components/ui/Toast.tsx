import type { ToastNotification } from "../../types";
import { getTimeAgo } from "./getTimeAgo";

interface ToastProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const iconMap = {
    reservation: "\u{1F4C5}",
    payment: "\u{1F4B3}",
    patient: "\u{1F464}",
  };

  const borderColorMap = {
    reservation: "border-l-purple-500",
    payment: "border-l-blue-500",
    patient: "border-l-green-500",
  };

  const timeAgo = getTimeAgo(toast.timestamp);

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-slate-200 border-l-4 ${borderColorMap[toast.type]} p-4 animate-slide-in-right min-w-[280px]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">{iconMap[toast.type]}</span>
          <div>
            <div className="text-sm font-semibold text-slate-900">{toast.title}</div>
            <div className="text-xs text-slate-600 mt-0.5">{toast.message}</div>
            <div className="text-xs text-slate-400 mt-1">{timeAgo}</div>
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
}
