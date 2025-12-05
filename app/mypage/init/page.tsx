// app/mypage/init/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MypageInit() {
  const router = useRouter();
  const [birth, setBirth] = useState(""); // "1990-01-01" 形式
  const [tel, setTel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/link-patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birth, tel }),
    });

    if (res.ok) {
      router.push("/mypage"); // 紐付け成功後のマイページ
    } else {
      const data = await res.json().catch(() => ({}));
      setError(
        data.message || "照合に失敗しました。入力内容をご確認ください。"
      );
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold mb-4">初回登録（本人確認）</h1>
      <p className="text-sm text-gray-600 mb-4">
        問診フォームで入力いただいた「生年月日」と「電話番号」を入力してください。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">生年月日</label>
          <input
            type="date"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">
            電話番号（ハイフンなし）
          </label>
          <input
            type="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded py-2 text-sm disabled:opacity-60"
        >
          {loading ? "照合中..." : "マイページに進む"}
        </button>
      </form>
    </div>
  );
}
