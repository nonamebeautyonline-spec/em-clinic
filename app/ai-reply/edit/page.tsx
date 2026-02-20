"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

interface DraftData {
  id: number;
  patientId: string;
  patientName: string;
  originalMessage: string;
  draftReply: string;
  status: string;
  category: string;
  confidence: number;
}

type PageState = "loading" | "idle" | "regenerating" | "regenerated" | "sending" | "rejecting" | "done" | "error";

function EditContent() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("id") || "";
  const sig = searchParams.get("sig") || "";
  const exp = searchParams.get("exp") || "";

  const [state, setState] = useState<PageState>("loading");
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [instruction, setInstruction] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  // ドラフト情報を取得
  useEffect(() => {
    if (!draftId || !sig || !exp) {
      setErrorMsg("URLが不正です");
      setState("error");
      return;
    }
    fetch(`/api/ai-reply/${draftId}?sig=${sig}&exp=${exp}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "取得に失敗しました");
        }
        return res.json();
      })
      .then((data: DraftData) => {
        if (data.status !== "pending") {
          setDoneMsg("このドラフトは既に処理済みです");
          setState("done");
          return;
        }
        setDraft(data);
        setState("idle");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setState("error");
      });
  }, [draftId, sig, exp]);

  // 再生成
  const handleRegenerate = useCallback(async () => {
    if (!instruction.trim()) return;
    setState("regenerating");
    try {
      const res = await fetch(`/api/ai-reply/${draftId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: instruction.trim(), sig, exp: Number(exp) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "再生成に失敗しました");
      }
      const { newReply } = await res.json();
      setDraft((prev) => prev ? { ...prev, draftReply: newReply } : prev);
      setInstruction("");
      setState("regenerated");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "再生成に失敗しました");
      setState("idle");
    }
  }, [draftId, sig, exp, instruction]);

  // 送信
  const handleSend = useCallback(async () => {
    setState("sending");
    try {
      const res = await fetch(`/api/ai-reply/${draftId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sig, exp: Number(exp) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "送信に失敗しました");
      }
      setDoneMsg("送信しました");
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "送信に失敗しました");
      setState("regenerated");
    }
  }, [draftId, sig, exp]);

  // 却下
  const handleReject = useCallback(async () => {
    setState("rejecting");
    try {
      const res = await fetch(`/api/ai-reply/${draftId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sig, exp: Number(exp) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "却下に失敗しました");
      }
      setDoneMsg("却下しました");
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "却下に失敗しました");
      setState("regenerated");
    }
  }, [draftId, sig, exp]);

  // 再修正（regenerated → idle に戻す）
  const handleRetry = useCallback(() => {
    setState("idle");
  }, []);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow p-6 mx-4 max-w-md w-full text-center">
          <p className="text-red-600 font-bold mb-2">エラー</p>
          <p className="text-gray-600">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow p-6 mx-4 max-w-md w-full text-center">
          <p className="text-green-600 font-bold text-lg mb-2">{doneMsg}</p>
          <p className="text-gray-500 text-sm">このページを閉じてください</p>
        </div>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* ヘッダー */}
      <div className="bg-purple-600 text-white px-4 py-3">
        <h1 className="text-lg font-bold">AI返信の修正</h1>
        <p className="text-sm opacity-80">{draft.patientName} ({draft.patientId})</p>
      </div>

      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto">
        {/* 患者メッセージ */}
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 font-bold mb-1">患者メッセージ</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{draft.originalMessage}</p>
        </div>

        {/* 現在のAI返信案 */}
        <div className={`rounded-lg shadow p-4 ${state === "regenerated" ? "bg-purple-50 border-2 border-purple-300" : "bg-white"}`}>
          <p className="text-xs font-bold mb-1" style={{ color: "#7C3AED" }}>
            {state === "regenerated" ? "再生成されたAI返信案" : "AI返信案"}
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{draft.draftReply}</p>
        </div>

        {/* 再生成後: 送信・却下・再修正 */}
        {state === "regenerated" && (
          <div className="space-y-2">
            <button
              onClick={handleSend}
              className="w-full py-3 rounded-lg text-white font-bold text-sm"
              style={{ backgroundColor: "#7C3AED" }}
            >
              この内容で送信する
            </button>
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-lg text-white font-bold text-sm bg-blue-600"
            >
              再修正する
            </button>
            <button
              onClick={handleReject}
              className="w-full py-3 rounded-lg border border-gray-300 text-gray-600 font-bold text-sm bg-white"
            >
              却下
            </button>
          </div>
        )}

        {/* 修正指示入力 */}
        {(state === "idle" || state === "regenerating") && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 font-bold mb-2">修正指示</p>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="例: もっと丁寧に / 価格も伝えて / 予約方法を具体的に"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
              rows={3}
              disabled={state === "regenerating"}
            />
            <button
              onClick={handleRegenerate}
              disabled={state === "regenerating" || !instruction.trim()}
              className="w-full mt-3 py-3 rounded-lg text-white font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: "#2563EB" }}
            >
              {state === "regenerating" ? "再生成中..." : "この指示でAIに再生成させる"}
            </button>
          </div>
        )}

        {/* 送信中 */}
        {(state === "sending" || state === "rejecting") && (
          <div className="text-center py-4">
            <p className="text-gray-500">{state === "sending" ? "送信中..." : "処理中..."}</p>
          </div>
        )}

        {/* エラー表示（一時的） */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiReplyEditPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    }>
      <EditContent />
    </Suspense>
  );
}
