// 予約・発送通知設定ページ（設定画面のLINE通知セクションを独立化）
"use client";

import { useState } from "react";
import FlexSection from "@/app/admin/settings/_components/FlexSection";

export default function NotificationSettingsPage() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const handleToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">予約・発送通知</h1>
        <p className="text-sm text-gray-500 mt-1">予約確定・変更・キャンセル時、発送完了時にLINEで送信するFLEXメッセージの設定</p>
      </div>

      <FlexSection onToast={handleToast} />

      {/* トースト通知 */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
