"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RepairPage() {
  const router = useRouter();
  const [nameKana, setNameKana] = useState("");
  const [sex, setSex] = useState("");
  const [birth, setBirth] = useState("");
  const [tel, setTel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!nameKana.trim()) { setError("フリガナを入力してください"); return; }
    if (!sex) { setError("性別を選択してください"); return; }
    if (!birth) { setError("生年月日を入力してください"); return; }
    if (!tel.trim()) { setError("電話番号を入力してください"); return; }

    // 電話番号のバリデーション
    const normalizedTel = tel.replace(/[-\s]/g, "");
    if (!/^0\d{9,10}$/.test(normalizedTel)) {
      setError("電話番号の形式が正しくありません（例: 09012345678）");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_kana: nameKana.trim(),
          sex,
          birth,
          tel: normalizedTel,
        }),
      });

      if (res.status === 401) {
        setError("ログイン情報が確認できませんでした。マイページからやり直してください。");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError("保存に失敗しました。もう一度お試しください。");
        return;
      }

      setDone(true);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3">
          <h1 className="text-lg font-semibold text-center">登録完了</h1>
        </header>
        <main className="flex-1 px-4 py-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-md w-full text-center space-y-4">
            <p className="text-2xl">✅</p>
            <p className="text-base font-semibold text-slate-800">
              個人情報の登録が完了しました
            </p>
            <p className="text-sm text-slate-500">
              ご協力ありがとうございます。
            </p>
            <button
              type="button"
              onClick={() => router.push("/mypage")}
              className="mt-4 w-full rounded-xl bg-pink-500 text-white py-3 text-base font-semibold hover:bg-pink-600 transition"
            >
              マイページに戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold text-center">個人情報の再登録</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-600 mb-4">
            システムの不具合により一部の個人情報が消失してしまいました。
            大変お手数ですが、以下の情報を再度ご入力ください。
          </p>

          {/* フリガナ */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              お名前（フリガナ）
            </label>
            <input
              type="text"
              placeholder="タナカ ハナコ"
              value={nameKana}
              onChange={(e) => setNameKana(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* 性別 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              性別
            </label>
            <div className="flex gap-3">
              {["女", "男"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={`flex-1 py-2.5 rounded-lg border text-base font-medium transition ${
                    sex === s
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white text-slate-700 border-slate-300 hover:border-pink-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 生年月日 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              生年月日
            </label>
            <input
              type="date"
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* 電話番号 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              電話番号
              <span className="block text-xs text-slate-500 font-normal mt-0.5">診療時におかけする電話番号となります。正確にご入力ください。</span>
            </label>
            <input
              type="tel"
              placeholder="09012345678"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl bg-pink-500 text-white py-3 text-base font-semibold shadow-sm hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "送信中..." : "登録する"}
        </button>
      </main>
    </div>
  );
}
