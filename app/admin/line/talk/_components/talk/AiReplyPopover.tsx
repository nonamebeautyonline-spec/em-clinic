"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AiDraft {
  id: number;
  patient_id: string;
  line_uid: string;
  original_message: string;
  draft_reply: string;
  status: string;
  ai_category: string;
  confidence: number;
  model_used: string;
  created_at: string;
}

interface AiReplyPopoverProps {
  patientId: string;
  /** 既に返信済み（outgoingが最後）なら非表示 */
  hasUnrepliedIncoming: boolean;
  /** 送信完了時にメッセージ一覧をリフレッシュ */
  onSent?: () => void;
}

export default function AiReplyPopover({ patientId, hasUnrepliedIncoming, onSent }: AiReplyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [instruction, setInstruction] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [done, setDone] = useState<"sent" | "rejected" | null>(null);
  const [error, setError] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ドラフト取得
  const fetchDraft = useCallback(async () => {
    setLoading(true);
    setError("");
    setDone(null);
    try {
      const res = await fetch(`/api/admin/line/ai-reply-draft?patient_id=${encodeURIComponent(patientId)}`);
      const json = await res.json();
      if (json.draft) {
        setDraft(json.draft);
        setEditedReply(json.draft.draft_reply);
      } else {
        setDraft(null);
      }
    } catch {
      setError("ドラフト取得失敗");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // ボタンクリック時
  const handleOpen = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    fetchDraft();
  }, [open, fetchDraft]);

  // 送信
  const handleSend = async () => {
    if (!draft) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/line/ai-reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: draft.id,
          action: "send",
          modified_reply: editedReply !== draft.draft_reply ? editedReply : undefined,
        }),
      });
      if (!res.ok) throw new Error("送信失敗");
      setDone("sent");
      onSent?.();
    } catch {
      setError("送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  // 却下
  const handleReject = async () => {
    if (!draft) return;
    setRejecting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/line/ai-reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: draft.id, action: "reject" }),
      });
      if (!res.ok) throw new Error("却下失敗");
      setDone("rejected");
    } catch {
      setError("却下に失敗しました");
    } finally {
      setRejecting(false);
    }
  };

  // 再生成
  const handleRegenerate = async () => {
    if (!draft || !instruction.trim()) return;
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/line/ai-reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: draft.id, action: "regenerate", instruction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "再生成失敗");
      if (json.newReply) {
        setEditedReply(json.newReply);
        setDraft({ ...draft, draft_reply: json.newReply });
        setInstruction("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "再生成に失敗しました");
    } finally {
      setRegenerating(false);
    }
  };

  // 未返信メッセージがない場合は非表示
  if (!hasUnrepliedIncoming) return null;

  const categoryLabel: Record<string, string> = {
    operational: "フロー系",
    medical: "医療系",
    greeting: "挨拶",
    other: "その他",
  };

  return (
    <div className="relative inline-flex" ref={popoverRef}>
      {/* AIボタン */}
      <button
        onClick={handleOpen}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-[11px] font-bold ${
          open
            ? "bg-purple-500 text-white shadow-md"
            : "bg-purple-100 text-purple-600 hover:bg-purple-200 hover:shadow-sm"
        }`}
        title="AI返信案を表示"
      >
        AI
      </button>

      {/* ポップオーバー */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[340px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-2 flex items-center justify-between">
            <span className="text-white text-xs font-bold flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
              AI返信案
            </span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-3">
            {/* ローディング */}
            {loading && (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                <span className="ml-2 text-xs text-gray-500">取得中...</span>
              </div>
            )}

            {/* ドラフトなし */}
            {!loading && !draft && !done && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-xs">AI返信案はまだ生成されていません</div>
                <div className="text-gray-300 text-[10px] mt-1">メッセージ受信後しばらくお待ちください</div>
              </div>
            )}

            {/* 完了メッセージ */}
            {done && (
              <div className="text-center py-4">
                {done === "sent" ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="text-green-600 text-xs font-medium">送信しました</div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <div className="text-gray-500 text-xs font-medium">却下しました</div>
                  </>
                )}
              </div>
            )}

            {/* ドラフト表示 */}
            {!loading && draft && !done && (
              <>
                {/* カテゴリ・信頼度 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                    {categoryLabel[draft.ai_category] || draft.ai_category}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    信頼度 {Math.round(draft.confidence * 100)}%
                  </span>
                </div>

                {/* 返信案（編集可能） */}
                <textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  rows={4}
                  className="w-full text-[12px] leading-relaxed border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300 focus:border-purple-300 bg-gray-50"
                  placeholder="AI返信案をここで編集できます"
                />

                {/* 修正指示入力 */}
                <div className="mt-2 flex gap-1.5">
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !(e.nativeEvent as KeyboardEvent).isComposing && instruction.trim()) {
                        e.preventDefault();
                        handleRegenerate();
                      }
                    }}
                    placeholder="修正指示（例: もっと丁寧に）"
                    className="flex-1 text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300"
                    disabled={regenerating}
                  />
                  <button
                    onClick={handleRegenerate}
                    disabled={!instruction.trim() || regenerating}
                    className="text-[11px] bg-purple-50 text-purple-600 px-2.5 py-1.5 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
                  >
                    {regenerating ? (
                      <div className="w-3 h-3 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    再生成
                  </button>
                </div>

                {/* エラー */}
                {error && (
                  <div className="mt-2 text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded">{error}</div>
                )}

                {/* アクションボタン */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleSend}
                    disabled={sending || !editedReply.trim()}
                    className="flex-1 text-[11px] bg-[#00B900] text-white py-2 rounded-lg font-medium hover:bg-[#00a000] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {sending ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    )}
                    {editedReply !== draft.draft_reply ? "修正して送信" : "このまま送信"}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejecting}
                    className="text-[11px] text-gray-400 hover:text-red-500 py-2 px-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    title="この返信案を却下"
                  >
                    {rejecting ? (
                      <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
