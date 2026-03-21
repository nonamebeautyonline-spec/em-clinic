"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OverridesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/schedule/monthly");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500">スケジュール設定に移動中...</p>
      </div>
    </div>
  );
}
