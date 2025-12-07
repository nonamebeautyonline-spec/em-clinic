// app/mypage/init/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Step = "enterPhone" | "enterCode" | "done";

export default function MypageInit() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // LINEログイン連携済みで、クエリに line_id がついてくる想定
  const lineUserIdFromQuery = searchParams.get("line_id") || "";
  const [lineUserId] = useState(lineUserIdFromQuery); // 必要ならあとで cookie などに差し替え

  const [step, setStep] = useState<Step>("enterPhone");
  const [tel, setTel] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // phone → +81 形式に変換
  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) return "+81" + digits.slice(1);
    if (digits.startsWith("81")) return "+" + digits;
    if (digits.startsWith("+")) return digits;
    return "+81" + digits;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(tel);
    if (!normalized.match(/^\+81[0-9]{9,10}$/)) {
      setError("日本の携帯電話番号をハイフンなしで入力してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "認証コードの送信に失敗しました。");
      }

      const data = await res.json();
      if (data.status !== "pending") {
        throw new Error("認証コードの送信に失敗しました。");
      }

      setStep("enterCode");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "認証コードの送信中にエラーが発生しました。時間をおいて再度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code) {
      setError("SMSで届いた認証コードを入力してください。");
      return;
    }

    const normalized = normalizePhone(tel);
    setLoading(true);

    try {
      // 1) Twilio Verify でコードチェック
      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, code }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "認証コードの確認に失敗しました。");
      }

      const data = await res.json();
      if (!data.valid) {
        setError("認証コードが正しくありません。もう一度お試しください。");
        setLoading(false);
        return;
      }

      // 2) 認証OKなら phone + lineUserId で PID 紐付け
      const completeRes = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalized,
          lineUserId, // ← LINE ID もここで渡す
        }),
      });

      if (!completeRes.ok) {
        const text = await completeRes.text();
        throw new Error(text || "マイページとの紐付けに失敗しました。");
      }

      // const { pid } = await completeRes.json(); // 必要なら使う
      setStep("done");
      // すぐマイページへ飛ばす
      router.push("/mypage");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "認証処理中にエラーが発生しました。時間をおいて再度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold mb-3">初回登録（電話番号認証）</h1>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        LINEログイン連携ありがとうございます。
        <br />
        はじめに、SMSで届く認証コードでご本人確認を行います。
        問診フォームで入力いただいた電話番号と同じ番号をご入力ください。
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-500 whitespace-pre-line">{error}</p>
      )}

      {step === "enterPhone" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">電話番号（ハイフンなし）</label>
            <input
              type="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="例）09012345678"
              required
            />
          </div>
          <p className="text-xs text-gray-400">
            ※ 認証目的でのみ利用し、許可なく他の目的には使用しません。
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2 text-sm disabled:opacity-60"
          >
            {loading ? "認証コード送信中..." : "認証コードを送信する"}
          </button>
        </form>
      )}

      {step === "enterCode" && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="text-xs text-gray-600">
            次の番号に認証コードを送信しました：
            <div className="mt-1 font-mono text-sm text-gray-900">{tel}</div>
          </div>
          <div>
            <label className="block text-sm mb-1">認証コード</label>
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="w-full border rounded px-3 py-2 text-sm tracking-[0.25em]"
              placeholder="123456"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2 text-sm disabled:opacity-60"
          >
            {loading ? "認証中..." : "この番号を認証してマイページに進む"}
          </button>
        </form>
      )}

      {step === "done" && (
        <p className="mt-4 text-sm text-gray-700">
          認証が完了しました。マイページに移動します…
        </p>
      )}
    </div>
  );
}
