"use client";

import { useState, useCallback } from "react";

interface RetrievedChunk {
  title: string;
  content: string;
  similarity: number;
}

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
  expires_at?: string;
  retrieved_example_ids?: number[];
  retrieved_chunks?: RetrievedChunk[];
  rewritten_query?: string;
}

interface AiReplyButtonProps {
  open: boolean;
  onClick: () => void;
}

/** AIボタン（メッセージバブルの右横に配置） */
export function AiReplyButton({ open, onClick }: AiReplyButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-[11px] font-bold flex-shrink-0 ${
        open
          ? "bg-purple-500 text-white shadow-md"
          : "bg-purple-100 text-purple-600 hover:bg-purple-200 hover:shadow-sm"
      }`}
      title="AI返信案を表示"
    >
      AI
    </button>
  );
}

interface AiReplyCardProps {
  patientId: string;
  draft: AiDraft | null;
  loading: boolean;
  generating: boolean;
  editedReply: string;
  setEditedReply: (v: string) => void;
  instruction: string;
  setInstruction: (v: string) => void;
  regenerating: boolean;
  sending: boolean;
  rejecting: boolean;
  done: "sent" | "rejected" | null;
  error: string;
  onSend: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onGenerate: () => void;
  onClose: () => void;
}

const categoryLabel: Record<string, string> = {
  operational: "フロー系",
  medical: "医療系",
  greeting: "挨拶",
  other: "その他",
};

/** AI返信カード（メッセージの下にインライン表示） */
export function AiReplyCard({
  draft, loading, generating, editedReply, setEditedReply,
  instruction, setInstruction, regenerating, sending, rejecting,
  done, error, onSend, onReject, onRegenerate, onGenerate, onClose,
}: AiReplyCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1.5 flex items-center justify-between">
        <span className="text-white text-[11px] font-bold flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
          AI返信案
        </span>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="p-2.5">
        {/* ローディング */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            <span className="ml-2 text-[11px] text-gray-500">取得中...</span>
          </div>
        )}

        {/* ドラフトなし / 生成中 */}
        {!loading && !draft && !done && (
          <div className="text-center py-3">
            {generating ? (
              <>
                <div className="flex items-center justify-center mb-1">
                  <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                </div>
                <div className="text-gray-500 text-[11px]">AI返信案を生成中...</div>
              </>
            ) : (
              <>
                <div className="text-gray-400 text-[11px]">AI返信案はまだ生成されていません</div>
                <button
                  onClick={onGenerate}
                  className="mt-2 text-[11px] bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  生成する
                </button>
              </>
            )}
            {error && (
              <div className="mt-1.5 text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded">{error}</div>
            )}
          </div>
        )}

        {/* 完了メッセージ */}
        {done && (
          <div className="flex items-center justify-center gap-2 py-3">
            {done === "sent" ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-green-600 text-[11px] font-medium">送信しました</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                <span className="text-gray-500 text-[11px] font-medium">却下しました</span>
              </>
            )}
          </div>
        )}

        {/* ドラフト表示 */}
        {!loading && draft && !done && (
          <>
            {/* カテゴリ・信頼度・有効期限 */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                {categoryLabel[draft.ai_category] || draft.ai_category}
              </span>
              <span className="text-[10px] text-gray-400">
                信頼度 {Math.round(draft.confidence * 100)}%
              </span>
              {draft.expires_at && (() => {
                const remaining = Math.max(0, Math.round((new Date(draft.expires_at).getTime() - Date.now()) / 60000));
                const hours = Math.floor(remaining / 60);
                const mins = remaining % 60;
                const isUrgent = remaining < 60;
                return (
                  <span className={`text-[10px] ${isUrgent ? "text-red-500" : "text-gray-400"}`}>
                    残り {hours > 0 ? `${hours}h` : ""}{mins}m
                  </span>
                );
              })()}
            </div>

            {/* 返信案（編集可能・自動リサイズ） */}
            <textarea
              value={editedReply}
              onChange={(e) => setEditedReply(e.target.value)}
              className="w-full text-[12px] leading-relaxed border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300 focus:border-purple-300 bg-gray-50"
              placeholder="AI返信案をここで編集できます"
              style={{ minHeight: "3rem", overflow: "hidden" }}
              ref={(el) => {
                if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
              }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = t.scrollHeight + "px";
              }}
            />

            {/* 修正指示入力 */}
            <div className="mt-1.5 flex gap-1.5">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing && instruction.trim()) {
                    e.preventDefault();
                    onRegenerate();
                  }
                }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
                placeholder="修正指示（例: もっと丁寧に）&#10;Shift+Enterで改行"
                rows={1}
                className="flex-1 text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300 resize-none"
                disabled={regenerating}
              />
              <button
                onClick={onRegenerate}
                disabled={!instruction.trim() || regenerating}
                className="text-[11px] bg-purple-50 text-purple-600 px-2 py-1.5 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
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
              <div className="mt-1.5 text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded">{error}</div>
            )}

            {/* 根拠セクション（折りたたみ式） */}
            <EvidenceSection draft={draft} />

            {/* アクションボタン */}
            <RejectWithConfirm
              sending={sending}
              rejecting={rejecting}
              editedReply={editedReply}
              draftReply={draft.draft_reply}
              onSend={onSend}
              onReject={onReject}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** 根拠表示セクション */
function EvidenceSection({ draft }: { draft: AiDraft }) {
  const [open, setOpen] = useState(false);
  const hasEvidence = (draft.retrieved_example_ids && draft.retrieved_example_ids.length > 0)
    || (draft.retrieved_chunks && draft.retrieved_chunks.length > 0)
    || draft.rewritten_query;

  if (!hasEvidence) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-gray-400 hover:text-purple-500 flex items-center gap-1 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        根拠を表示
        {draft.retrieved_example_ids && draft.retrieved_example_ids.length > 0 && (
          <span className="bg-gray-100 text-gray-500 px-1 rounded text-[9px]">
            例{draft.retrieved_example_ids.length}件
          </span>
        )}
        {draft.retrieved_chunks && draft.retrieved_chunks.length > 0 && (
          <span className="bg-gray-100 text-gray-500 px-1 rounded text-[9px]">
            KB{draft.retrieved_chunks.length}件
          </span>
        )}
      </button>
      {open && (
        <div className="mt-1 space-y-1.5 text-[10px] bg-gray-50 rounded-lg p-2 border border-gray-100">
          {/* リライトクエリ */}
          {draft.rewritten_query && (
            <div>
              <span className="text-gray-400 font-medium">検索クエリ:</span>
              <span className="ml-1 text-gray-600">{draft.rewritten_query}</span>
            </div>
          )}
          {/* 学習例ID */}
          {draft.retrieved_example_ids && draft.retrieved_example_ids.length > 0 && (
            <div>
              <span className="text-gray-400 font-medium">使用学習例:</span>
              <span className="ml-1 text-gray-600">
                {draft.retrieved_example_ids.map(id => `#${id}`).join(", ")}
              </span>
            </div>
          )}
          {/* KBチャンク */}
          {draft.retrieved_chunks && draft.retrieved_chunks.length > 0 && (
            <div>
              <span className="text-gray-400 font-medium block mb-0.5">KBチャンク:</span>
              {draft.retrieved_chunks.map((chunk, i) => (
                <div key={i} className="ml-2 flex items-start gap-1 text-gray-600">
                  <span className="text-purple-400 flex-shrink-0">•</span>
                  <span className="flex-1">
                    <span className="font-medium">{chunk.title}</span>
                    <span className="text-gray-400 ml-1">({Math.round(chunk.similarity * 100)}%)</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 却下確認付きアクションボタン */
function RejectWithConfirm({ sending, rejecting, editedReply, draftReply, onSend, onReject }: {
  sending: boolean; rejecting: boolean; editedReply: string; draftReply: string;
  onSend: () => void; onReject: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="mt-2 bg-red-50 rounded-lg p-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-red-600">この返信案を却下しますか？</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setConfirming(false); onReject(); }}
            disabled={rejecting}
            className="text-[11px] bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600 disabled:opacity-40"
          >
            {rejecting ? "..." : "却下する"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-[11px] text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={onSend}
        disabled={sending || !editedReply.trim()}
        className="flex-1 text-[11px] bg-[#00B900] text-white py-1.5 rounded-lg font-medium hover:bg-[#00a000] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
      >
        {sending ? (
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        )}
        {editedReply !== draftReply ? "修正して送信" : "このまま送信"}
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="text-[11px] text-gray-400 hover:text-red-500 py-1.5 px-2 rounded-lg hover:bg-red-50 transition-colors"
        title="却下"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}

// =============================================================
// コンテナフック（state管理を一箇所に集約）
// =============================================================

export function useAiReplyDraft(patientId: string) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [instruction, setInstruction] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [done, setDone] = useState<"sent" | "rejected" | null>(null);
  const [error, setError] = useState("");

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

  const toggle = useCallback(() => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    fetchDraft();
  }, [open, fetchDraft]);

  const send = async (onSent?: (replyText: string) => void) => {
    if (!draft) return;
    setSending(true);
    setError("");
    try {
      const replyText = editedReply || draft.draft_reply;
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
      onSent?.(replyText);
    } catch {
      setError("送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const reject = async () => {
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

  const regenerate = async () => {
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

  const generate = async () => {
    if (generating || draft) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/line/ai-reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, action: "generate" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失敗");

      if (json.action === "generating") {
        // 他プロセスが生成中 → 数秒後にポーリングで取得
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 5_000));
          const pollRes = await fetch(`/api/admin/line/ai-reply-draft?patient_id=${encodeURIComponent(patientId)}`);
          const pollJson = await pollRes.json();
          if (pollJson.draft) {
            setDraft(pollJson.draft);
            setEditedReply(pollJson.draft.draft_reply);
            return;
          }
        }
        throw new Error("生成がタイムアウトしました。再度お試しください。");
      }

      if (json.draft) {
        setDraft(json.draft);
        setEditedReply(json.draft.draft_reply);
      } else if (json.action === "already_exists") {
        // 既存ドラフトがレスポンスに含まれない場合はfetchし直す
        await fetchDraft();
      } else {
        // processAiReplyが分類で返信不要と判断した場合など
        setError(json.processLog?.find((l: string) => l.startsWith("skip:"))?.replace("skip: ", "") || "返信不要と判定されました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const close = () => setOpen(false);

  return {
    open, draft, loading, generating, editedReply, setEditedReply,
    instruction, setInstruction, regenerating, sending, rejecting,
    done, error, toggle, send, reject, regenerate, generate, close,
  };
}
