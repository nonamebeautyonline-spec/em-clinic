// app/register/phone/page.tsx
"use client";

import React, { useState } from "react";

type Step = "enterPhone" | "enterCode" | "success";

export default function PhoneRegisterPage() {
  const [step, setStep] = useState<Step>("enterPhone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pid, setPid] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日本の電話番号を簡易的に E.164 (+81) に変換
  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) {
      return "+81" + digits.slice(1);
    }
    if (digits.startsWith("81")) {
      return "+" + digits;
    }
    if (digits.startsWith("+")) return digits;
    return "+81" + digits; // ざっくり
  };

const handleSendCode = async () => {
  setError(null);

  const normalized = normalizePhone(phone);
  if (!normalized.match(/^\+81[0-9]{9,10}$/)) {
    setError("日本の電話番号を正しく入力してください。");
    return;
  }

  setSending(true);
  try {
    const res = await fetch("/api/verify/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("verify/send failed:", res.status, text);
      throw new Error(
        "認証コードの送信に失敗しました。時間をおいて再度お試しください。"
      );
    }

    const data = await res.json();
    if (data.status !== "pending") {
      throw new Error(
        "認証コードの送信に失敗しました。時間をおいて再度お試しください。"
      );
    }

    setStep("enterCode");
  } catch (e: any) {
    console.error(e);
    setError(
      e?.message ||
        "認証コードの送信中にエラーが発生しました。時間をおいて再度お試しください。"
    );
  } finally {
    setSending(false);
  }
};


  const handleVerifyCode = async () => {
    setError(null);

    if (!code || code.length < 4) {
      setError("SMSで届いた認証コードを入力してください。");
      return;
    }

    setVerifying(true);
    try {
      const normalized = normalizePhone(phone);

      // 1) Twilio Verify でコード検証
      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, code }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("API failed:", text); // ログだけ
console.error("verify/check failed:", res.status, text);
throw new Error("認証コードの確認に失敗しました。時間をおいて再度お試しください。");

      }

      const data = await res.json();
      if (!data.valid) {
        setError("認証コードが正しくありません。もう一度お試しください。");
        setVerifying(false);
        return;
      }

      // 2) 認証OKなら、問診マスターと紐付けて PID を取得
      const linkRes = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });

      if (!linkRes.ok) {
        const text = await linkRes.text();
        throw new Error(text || "患者情報の登録・取得に失敗しました。");
      }

      const linkData: { pid: string } = await linkRes.json();
      setPid(linkData.pid);
      // TODO: ここで PID を cookie / localStorage に保存したり、
      //       そのままマイページにリダイレクトしてもOK
      // e.g. router.push(`/mypage?pid=${linkData.pid}`);
      setStep("success");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "認証処理中にエラーが発生しました。時間をおいて再度お試しください。"
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-4 pt-8 pb-10">
        <h1 className="text-xl font-semibold text-slate-900">
          初回登録（電話番号認証）
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          はじめてご利用の方は、SMSで届く認証コードで本人確認を行います。
          <br />
          同じ電話番号で過去に診察・問診がお済みの場合は、
          認証後に自動的に診療情報と紐付けされます。
        </p>

        {/* ステップ表示 */}
        <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-500">
          <div
            className={`h-1 flex-1 rounded-full ${
              step !== "enterPhone" ? "bg-pink-500" : "bg-pink-200"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step === "enterCode" || step === "success"
                ? "bg-pink-500"
                : "bg-pink-100"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step === "success" ? "bg-pink-500" : "bg-pink-100"
            }`}
          />
        </div>

        {/* エラー */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[11px] text-red-700 whitespace-pre-line">
              {error}
            </p>
          </div>
        )}

        {step === "enterPhone" && (
          <div className="mt-6 space-y-4">
            <label className="block text-xs font-medium text-slate-700">
              携帯電話番号
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-400"
                placeholder="例）09012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              ※ ハイフンなしの数字のみで入力してください。
              <br />
              ※ 認証のためにのみ利用し、許可なく他の目的では使用しません。
            </p>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="mt-2 w-full rounded-full bg-pink-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? "認証コードを送信中..." : "認証コードを送信する"}
            </button>
          </div>
        )}

        {step === "enterCode" && (
          <div className="mt-6 space-y-4">
            <div className="text-xs text-slate-600">
              <div>次の番号に認証コードを送信しました：</div>
              <div className="mt-1 font-mono text-sm text-slate-900">
                {phone}
              </div>
            </div>

            <label className="block text-xs font-medium text-slate-700">
              認証コード（SMSで届いた数字）
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-400 tracking-[0.25em]"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setStep("enterPhone")}
                className="underline underline-offset-2"
              >
                電話番号を修正する
              </button>
              {/* 再送ボタンをあとで実装しても良い */}
            </div>

            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={verifying}
              className="mt-2 w-full rounded-full bg-pink-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {verifying ? "認証中..." : "この番号を認証する"}
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-900">
                電話番号の認証が完了しました。
              </p>
              <p className="mt-2 text-[11px] text-emerald-900 leading-relaxed">
                問診データと診療情報の紐付けが完了しました。
                {pid && (
                  <>
                    <br />
                    患者ID（内部管理用）：{" "}
                    <span className="font-mono text-[11px]">{pid}</span>
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              className="w-full rounded-full bg-pink-500 py-2 text-sm font-semibold text-white"
              onClick={() => {
                // TODO: マイページTOPなどに遷移
                // router.push("/mypage");
                window.location.href = "/mypage";
              }}
            >
              マイページに進む
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
