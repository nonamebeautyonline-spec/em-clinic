"use client";

import { type IntakeRow, pick } from "./types";

type CallFormConfirmModalProps = {
  target: IntakeRow;
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
};

export function CallFormConfirmModal({
  target,
  sending,
  onSend,
  onCancel,
}: CallFormConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-[90vw] p-6 space-y-4">
        <h3 className="text-sm font-semibold">LINE通話フォーム送信確認</h3>
        <p className="text-xs text-slate-600">
          <span className="font-semibold">
            {pick(target, ["name", "氏名", "お名前"])}
          </span>{" "}
          さんにLINE通話フォームを送信します。
          患者がタップすると通話が開始されます。
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="px-4 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-700 disabled:opacity-60"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="px-4 py-1.5 rounded-full bg-teal-500 text-[11px] text-white disabled:opacity-60"
          >
            {sending ? "送信中…" : "送信する"}
          </button>
        </div>
      </div>
    </div>
  );
}
