"use client";

import React, { Suspense, useState, useEffect } from "react";
import useSWR from "swr";
import Image from "next/image";
import { useRouter } from "next/navigation";

// SWRProviderのスコープ外（患者向けページ）なのでfetcherを明示指定
const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

function Inner() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // テナント設定（色味・ロゴ・クリニック名）
  const { data: mpSettings } = useSWR<{
    config?: { colors?: { primary?: string; pageBg?: string }; content?: { clinicName?: string; logoUrl?: string } };
  }>("/api/mypage/settings", swrFetcher);
  const primary = mpSettings?.config?.colors?.primary || "#ec4899";
  const pageBg = mpSettings?.config?.colors?.pageBg || "#f0f0f0";
  const clinicName = mpSettings?.config?.content?.clinicName || "";
  const logoUrl = mpSettings?.config?.content?.logoUrl || "";

  // 初回登録済みチェック + LINE認証確認（SWR）
  const { data: checkData, isLoading: checking } = useSWR<{
    needsLineLogin?: boolean;
    registered?: boolean;
    verifyComplete?: boolean;
  }>("/api/register/check", swrFetcher);

  useEffect(() => {
    if (checkData?.needsLineLogin) {
      window.location.href = "/api/line/login?returnUrl=/register";
    }
  }, [checkData]);

  const regStatus: "none" | "needsVerify" | "complete" = checkData?.registered
    ? checkData.verifyComplete
      ? "complete"
      : "needsVerify"
    : "none";

  // フォーム入力（姓名分割）
  const [sei, setSei] = useState("");
  const [mei, setMei] = useState("");
  const [seiKana, setSeiKana] = useState("");
  const [meiKana, setMeiKana] = useState("");
  const [sex, setSex] = useState("");
  const [birthYear, setBirthYear] = useState("1990");
  const [birthMonth, setBirthMonth] = useState("01");
  const [birthDay, setBirthDay] = useState("01");

  const birthday = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;

  // バリデーション
  const validate = (): string | null => {
    if (!sei.trim()) return "姓を入力してください。";
    if (!mei.trim()) return "名を入力してください。";
    if (!seiKana.trim()) return "セイ(カナ)を入力してください。";
    if (!meiKana.trim()) return "メイ(カナ)を入力してください。";
    const kana = `${seiKana.trim()}${meiKana.trim()}`;
    if (!/^[ァ-ヶー]+$/.test(kana)) return "カナはカタカナで入力してください。";
    if (!sex) return "性別を選択してください。";
    const y = Number(birthYear), m = Number(birthMonth), d = Number(birthDay);
    if (!y || !m || !d || y < 1900 || y > new Date().getFullYear() || m < 1 || m > 12 || d < 1 || d > 31) {
      return "正しい生年月日を入力してください。";
    }
    return null;
  };

  // 送信 → 個人情報保存 → マイページへ遷移
  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/register/personal-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${sei.trim()} ${mei.trim()}`,
          name_kana: `${seiKana.trim()} ${meiKana.trim()}`,
          sex,
          birthday,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "登録に失敗しました。");
      }

      setDone(true);
      // window.locationでフルページナビゲーション（router.pushと違いフルリロード）
      // fetchレスポンスのSet-CookieがブラウザのCookie jarに反映済みの状態で
      // 新しいHTTPリクエストが飛ぶため、SSR側で確実にCookieを取得できる
      setTimeout(() => { window.location.href = "/mypage"; }, 1500);
    } catch (e) {
      setError((e as Error)?.message || "エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: pageBg }}>
        <p className="text-sm text-slate-500">読み込み中…</p>
      </div>
    );
  }

  if (regStatus === "needsVerify") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: pageBg }}>
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
            {logoUrl ? <img src={logoUrl} alt={clinicName || "clinic logo"} className="h-10 object-contain" /> : clinicName ? <span className="text-base font-bold text-slate-800">{clinicName}</span> : <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />}
            <span className="text-[10px] text-slate-400">個人情報フォーム</span>
          </div>
        </header>
        <main className="mx-auto max-w-lg pb-10">
          <div className="bg-white mt-2 px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">個人情報は入力済みです</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              電話番号の認証がまだ完了していません。
              <br />
              引き続き、電話番号認証にお進みください。
            </p>
            <button
              type="button"
              onClick={() => router.push("/mypage/init")}
              className="mt-6 px-8 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all"
              style={{ backgroundColor: primary }}
            >
              電話番号認証へ進む
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (regStatus === "complete") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: pageBg }}>
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
            {logoUrl ? <img src={logoUrl} alt={clinicName || "clinic logo"} className="h-10 object-contain" /> : clinicName ? <span className="text-base font-bold text-slate-800">{clinicName}</span> : <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />}
            <span className="text-[10px] text-slate-400">個人情報フォーム</span>
          </div>
        </header>
        <main className="mx-auto max-w-lg pb-10">
          <div className="bg-white mt-2 px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">既に登録済みです</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              個人情報フォームは既に提出されています。
              <br />
              マイページからご利用ください。
            </p>
            <button
              type="button"
              onClick={() => router.push("/mypage")}
              className="mt-6 px-8 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all"
              style={{ backgroundColor: primary }}
            >
              マイページへ
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: pageBg }}>
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
            {logoUrl ? <img src={logoUrl} alt={clinicName || "clinic logo"} className="h-10 object-contain" /> : clinicName ? <span className="text-base font-bold text-slate-800">{clinicName}</span> : <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />}
            <span className="text-[10px] text-slate-400">個人情報フォーム</span>
          </div>
        </header>
        <main className="mx-auto max-w-lg pb-10">
          <div className="bg-white mt-2 px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">個人情報を保存しました</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              自動でマイページに移動します。
            </p>
            <button
              type="button"
              onClick={() => router.push("/mypage")}
              className="mt-6 px-8 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all"
              style={{ backgroundColor: primary }}
            >
              マイページへ進む
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
          {logoUrl ? <img src={logoUrl} alt={clinicName || "clinic logo"} className="h-10 object-contain" /> : clinicName ? <span className="text-base font-bold text-slate-800">{clinicName}</span> : <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />}
          <span className="text-[10px] text-slate-400">個人情報フォーム</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg pb-10">
        {/* タイトル */}
        <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">個人情報フォーム</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            マイページ作成のためのフォームとなります。
            <br />
            不明な点や気になることがあればお気軽にLINEにてメッセージを送ってください。
          </p>

          {/* プログレスバー */}
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full w-1/3" style={{ backgroundColor: primary }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span className="font-medium" style={{ color: primary }}>1. 個人情報入力</span>
            <span>2. 電話番号認証</span>
            <span>3. 完了</span>
          </div>
        </div>

        {/* エラー */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-700 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* 入力フォーム */}
        <div className="bg-white mt-2 px-6 py-6 space-y-6">
          {/* 氏名（姓・名） */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1.5">
              氏名
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">必須</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sei}
                onChange={(e) => setSei(e.target.value)}
                placeholder="姓（例：山田）"
                className="flex-1 min-w-0 px-3 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400 transition-all"
              />
              <input
                type="text"
                value={mei}
                onChange={(e) => setMei(e.target.value)}
                placeholder="名（例：太郎）"
                className="flex-1 min-w-0 px-3 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400 transition-all"
              />
            </div>
          </div>

          {/* 氏名カナ（セイ・メイ） */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1.5">
              氏名(カナ)
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">必須</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seiKana}
                onChange={(e) => setSeiKana(e.target.value)}
                placeholder="セイ（例：ヤマダ）"
                className={`flex-1 min-w-0 px-3 py-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition-all ${seiKana && !/^[ァ-ヶー]*$/.test(seiKana) ? "border-red-400 focus:ring-red-400/30" : "border-slate-300 focus:ring-pink-400/30 focus:border-pink-400"}`}
              />
              <input
                type="text"
                value={meiKana}
                onChange={(e) => setMeiKana(e.target.value)}
                placeholder="メイ（例：タロウ）"
                className={`flex-1 min-w-0 px-3 py-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition-all ${meiKana && !/^[ァ-ヶー]*$/.test(meiKana) ? "border-red-400 focus:ring-red-400/30" : "border-slate-300 focus:ring-pink-400/30 focus:border-pink-400"}`}
              />
            </div>
            {(seiKana && !/^[ァ-ヶー]*$/.test(seiKana)) || (meiKana && !/^[ァ-ヶー]*$/.test(meiKana)) ? (
              <p className="mt-1 text-[10px] text-red-500 font-semibold">※ カタカナのみで入力してください（漢字・ひらがな不可）</p>
            ) : null}
          </div>

          {/* 性別 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
              性別
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">必須</span>
            </label>
            <div className="space-y-2">
              {["男", "女"].map((option) => (
                <label
                  key={option}
                  onClick={() => setSex(option)}
                  className={`flex items-center gap-3 cursor-pointer px-4 py-2.5 rounded-lg border transition-all ${
                    sex === option
                      ? "border-pink-400 bg-pink-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    sex === option ? "border-pink-500" : "border-slate-300"
                  }`}>
                    {sex === option && <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />}
                  </div>
                  <span className="text-sm text-slate-800">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 生年月日 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1.5">
              生年月日
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">必須</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">例: 1990 年 01 月 01 日</p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-20 px-3 py-3 border border-slate-300 rounded-lg text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400"
              />
              <span className="text-sm text-slate-600">年</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-14 px-3 py-3 border border-slate-300 rounded-lg text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400"
              />
              <span className="text-sm text-slate-600">月</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-14 px-3 py-3 border border-slate-300 rounded-lg text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400"
              />
              <span className="text-sm text-slate-600">日</span>
            </div>
          </div>

          {/* 送信ボタン */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 rounded-xl text-white text-base font-semibold shadow-lg disabled:opacity-60 transition-all"
            style={{ backgroundColor: primary }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </span>
            ) : "送信"}
          </button>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            送信後、マイページに進みます。
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">読み込み中…</p>
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
