import type { ToastNotification } from "../../types";
import { getTimeAgo } from "./getTimeAgo";

interface ToastProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const iconConfig = {
    reservation: {
      bg: "bg-claude-sand",
      color: "text-claude-terracotta",
      path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    payment: {
      bg: "bg-claude-sand",
      color: "text-emerald-600",
      path: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    },
    patient: {
      bg: "bg-claude-sand",
      color: "text-claude-charcoal",
      path: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    },
  };

  const { bg, color, path } = iconConfig[toast.type];
  const timeAgo = getTimeAgo(toast.timestamp);

  return (
    <div className="bg-claude-ivory rounded-2xl shadow-whisper border border-claude-border-cream p-4 animate-slide-in-right min-w-[280px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4.5 w-4.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={path} />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-claude-charcoal">{toast.title}</p>
            <p className="text-[12px] text-claude-olive mt-0.5">{toast.message}</p>
            <p className="text-[11px] text-claude-stone mt-1">{timeAgo}</p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-claude-stone hover:text-claude-charcoal transition-colors text-lg leading-none"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
}
