"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">アカウント設定</h1>
        <p className="text-slate-600 text-sm mt-1">管理者アカウントとシステム設定</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-slate-600">アカウント設定がここに表示されます</p>
      </div>
    </div>
  );
}
