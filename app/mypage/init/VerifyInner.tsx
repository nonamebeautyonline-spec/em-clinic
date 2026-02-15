// app/mypage/init/VerifyInner.tsx
"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "enterPhone" | "enterCode";

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "+81" + digits.slice(1);
  if (digits.startsWith("81")) return "+" + digits;
  if (digits.startsWith("+")) return digits;
  return "+81" + digits;
}

function Inner() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("enterPhone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    setError(null);

    const normalized = normalizePhone(phone);
    if (!normalized.match(/^\+81[0-9]{9,10}$/)) {
      setError("日本の携帯電話番号をハイフンなしで入力してください。");
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
        const body = await res.json().catch(() => null);
        console.error("verify/send failed:", res.status, body);
        throw new Error(body?.error || "認証コードの送信に失敗しました。時間をおいて再度お試しください。");
      }

      const data = await res.json();
      if (data.status !== "pending") {
        throw new Error("認証コードの送信に失敗しました。時間をおいて再度お試しください。");
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

    const normalized = normalizePhone(phone);

    setVerifying(true);
    try {
      // 1) verify/check
      const checkRes = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, code }),
      });

      if (!checkRes.ok) {
        const text = await checkRes.text();
        console.error("verify/check failed:", checkRes.status, text);
        throw new Error("認証コードの確認に失敗しました。時間をおいて再度お試しください。");
      }

      const checkJson = await checkRes.json();
      if (!checkJson.valid) {
        setError("認証コードが正しくありません。もう一度お試しください。");
        return;
      }

      // 2) register/complete
      const completeRes = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });

      // HTTPエラー
      if (!completeRes.ok) {
        const text = await completeRes.text();
        console.error("register/complete HTTP failed:", completeRes.status, text);
        throw new Error("マイページとの紐付けに失敗しました。時間をおいて再度お試しください。");
      }

      const completeJson = await completeRes.json().catch(() => ({} as any));

      // アプリケーションエラー（200でもok:false）
      if (!completeJson?.ok) {
        if (completeJson?.error === "not_found") {
          throw new Error(
            "患者情報の紐付けに失敗しました。\nお手数ですが、LINEメッセージより直接お問い合わせください。"
          );
        }
        throw new Error("マイページとの紐付けに失敗しました。時間をおいて再度お試しください。");
      }

      // pid cookie がセットされたはずなので /mypage へ
      router.push("/mypage");
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
    <div className="min-h-screen bg-[#FFF8FB]">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/company-name-v2.png"
              alt="clinic logo"
              width={150}
              height={40}
              className="object-contain"
            />
          </div>
          <Link href="/mypage" className="text-[12px] text-slate-500 hover:text-slate-700">
            マイページへ戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-8 pb-10">
        <h1 className="text-xl font-semibold text-slate-900">初回登録（電話番号認証）</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          LINEログイン連携ありがとうございます。
          <br />
          SMSで届く認証コードでご本人確認を行います。
          <br />
          ご本人確認のため、携帯電話番号をご入力ください。
        </p>

        <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-500">
          <div className={`h-1 flex-1 rounded-full ${step !== "enterPhone" ? "bg-pink-500" : "bg-pink-200"}`} />
          <div className={`h-1 flex-1 rounded-full ${step === "enterCode" ? "bg-pink-500" : "bg-pink-100"}`} />
          <div className="h-1 flex-1 rounded-full bg-pink-100" />
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[11px] text-red-700 whitespace-pre-line">{error}</p>
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
              <div className="mt-1 font-mono text-sm text-slate-900">{phone}</div>
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

            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={verifying}
              className="mt-2 w-full rounded-full bg-pink-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {verifying ? "認証中..." : "この番号を認証してマイページに進む"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function VerifyInner() {
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
