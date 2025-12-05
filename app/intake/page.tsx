// app/intake/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IntakePage() {
  const router = useRouter();

  useEffect(() => {
    // TODO: 実際の問診ページ実装
    // 今はダミーとして 1秒後に /reserve に飛ばすサンプル
    const timer = setTimeout(() => {
      router.push("/reserve");
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-600">
        問診ページの実装予定です（ここから予約画面へ遷移）。
      </p>
    </div>
  );
}
