// イベント通知設定ページ
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
        <h1 className="text-xl font-bold text-gray-900">イベント通知</h1>
        <p className="text-sm text-gray-500 mt-1">各イベントの通知ON/OFFとメッセージのカスタマイズ</p>
      </div>

      <FlexSection onToast={handleToast} />

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
