// 旧URL互換: 設定ページの利用規約セクションへリダイレクト
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegalSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/settings?section=legal");
  }, [router]);
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
