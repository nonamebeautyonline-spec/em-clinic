"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

type Step = "enterPhone" | "enterCode" | "done";

function MypageInitInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const lineUserIdFromQuery = searchParams.get("line_id") || "";
  const [lineUserId] = useState(lineUserIdFromQuery);

  const [step, setStep] = useState<Step>("enterPhone");
  const [tel, setTel] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) return "+81" + digits.slice(1);
    if (digits.startsWith("81")) return "+" + digits;
    if (digits.startsWith("+")) return digits;
    return "+81" + digits;
  };

  // =====================
  // SMS送信
  // =====================
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(tel);
    if (!/^\+81[0-9]{9,10}$/.test(normalized)) {
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
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "認証コードの送信中にエラーが発生しました。時間をおいて再度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // SMS検証 → PID紐付け
  // =====================
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
      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, code }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("verify/check failed:", res.status, text);
        throw new Error(
          "認証コードの確認に失敗しました。時間をおいて再度お試しください。"
        );
      }

      const data = await res.json();
      if (!data.valid) {
        setError("認証コードが正しくありません。もう一度お試しください。");
        setLoading(false);
        return;
      }

      const completeRes = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalized,
          lineUserId,
        }),
      });

      if (!completeRes.ok) {
        const text = await completeRes.text();
        console.error("register/complete failed:", completeRes.status, text);
        throw new Error(
          "マイページとの紐付けに失敗しました。時間をおいて再度お試しください。"
        );
      }

      const completeJson = await completeRes.json();
      if (!completeJson?.ok || !completeJson?.pid) {
        console.error("register/complete bad response:", completeJson);
        throw new Error(
          "マイページとの紐付けに失敗しました。時間をおいて再度お試しください。"
        );
      }

      setStep("done");
      router.push("/mypage");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "認証処理中にエラーが発生しました。時間をおいて再度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold mb-3">初回登録（電話番号認証）</h1>

      {error && (
        <p className="mb-4 text-sm text-red-500 whitespace-pre-line">{error}</p>
      )}

      {step === "enterPhone" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <input
            type="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="09012345678"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2"
          >
            {loading ? "送信中..." : "認証コードを送信"}
          </button>
        </form>
      )}

      {step === "enterCode" && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full border rounded px-3 py-2"
            placeholder="123456"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2"
          >
            {loading ? "認証中..." : "認証して進む"}
          </button>
        </form>
      )}

      {step === "done" && <p>認証が完了しました。移動します…</p>}
    </div>
  );
}

export default function MypageInit() {
  return (
    <Suspense fallback={<div>読み込み中…</div>}>
      <MypageInitInner />
    </Suspense>
  );
}
