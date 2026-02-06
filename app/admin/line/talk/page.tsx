"use client";

import { useState, useRef, useEffect } from "react";

interface MessageLog {
  id: number;
  content: string;
  status: string;
  message_type: string;
  sent_at: string;
}

export default function TalkPage() {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasLine, setHasLine] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSearch = async () => {
    if (!patientId.trim()) return;
    setLoading(true);
    setSearched(true);

    const lookupRes = await fetch(`/api/admin/patient-lookup?q=${encodeURIComponent(patientId)}&type=id`, { credentials: "include" });
    const lookupData = await lookupRes.json();
    if (lookupData.found) {
      setPatientName(lookupData.patient.name);
      setHasLine(!!lookupData.patient.lstep_uid);
    }

    const logRes = await fetch(`/api/admin/messages/log?patient_id=${encodeURIComponent(patientId)}&limit=100`, { credentials: "include" });
    const logData = await logRes.json();
    if (logData.messages) setMessages(logData.messages.reverse());

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !patientId.trim()) return;
    setSending(true);

    const res = await fetch("/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ patient_id: patientId, message: newMessage }),
    });

    const data = await res.json();
    if (data.ok) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: newMessage,
        status: "sent",
        message_type: "individual",
        sent_at: new Date().toISOString(),
      }]);
      setNewMessage("");
    } else {
      alert(data.error || "送信失敗");
    }
    setSending(false);
  };

  const formatTime = (s: string) => {
    const d = new Date(s);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDateSeparator = (s: string) => {
    const d = new Date(s);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "今日";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "昨日";
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const shouldShowDate = (i: number) => {
    if (i === 0) return true;
    const prev = new Date(messages[i - 1].sent_at).toDateString();
    const curr = new Date(messages[i].sent_at).toDateString();
    return prev !== curr;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* ヘッダー - LINE風 */}
      <div className="bg-[#00B900] text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 5.92 2 10.66c0 2.72 1.46 5.14 3.74 6.7-.13.47-.84 2.94-.87 3.16 0 0-.02.13.05.18.07.06.16.03.16.03.24-.03 2.73-1.8 3.76-2.53.7.1 1.42.16 2.16.16 5.52 0 10-3.92 10-8.7C22 5.92 17.52 2 12 2z"/>
            </svg>
            {searched && patientName ? (
              <div>
                <h1 className="font-bold text-lg leading-tight">{patientName}</h1>
                <span className="text-green-200 text-xs">{patientId}</span>
              </div>
            ) : (
              <h1 className="font-bold text-lg">個別トーク</h1>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* 患者検索バー */}
        {!searched && (
          <div className="p-6 flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm space-y-4">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-[#00B900]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-10 h-10 text-[#00B900]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 5.92 2 10.66c0 2.72 1.46 5.14 3.74 6.7-.13.47-.84 2.94-.87 3.16 0 0-.02.13.05.18.07.06.16.03.16.03.24-.03 2.73-1.8 3.76-2.53.7.1 1.42.16 2.16.16 5.52 0 10-3.92 10-8.7C22 5.92 17.52 2 12 2z"/>
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-700">患者を検索してトークを開始</h2>
                <p className="text-sm text-gray-400 mt-1">患者IDを入力してください</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="患者ID"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/40 focus:border-[#00B900] bg-white shadow-sm"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !patientId.trim()}
                  className="px-6 py-3 bg-[#00B900] text-white rounded-xl text-sm font-medium hover:bg-[#009900] disabled:opacity-40 shadow-sm transition-colors"
                >
                  検索
                </button>
              </div>
            </div>
          </div>
        )}

        {/* トーク画面 */}
        {searched && (
          <>
            {/* メッセージ一覧 - LINE風背景 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#7494C0]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236B8AB5' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 text-gray-500 text-sm shadow">読み込み中...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 text-gray-500 text-sm shadow">まだメッセージはありません</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div key={m.id}>
                      {/* 日付セパレータ */}
                      {shouldShowDate(i) && (
                        <div className="flex justify-center my-3">
                          <span className="bg-black/20 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">
                            {formatDateSeparator(m.sent_at)}
                          </span>
                        </div>
                      )}
                      {/* メッセージバブル - 送信（右側・緑） */}
                      <div className="flex justify-end items-end gap-1">
                        <div className="flex flex-col items-end gap-0.5">
                          {m.status === "failed" && (
                            <span className="text-[10px] text-red-300 font-medium">送信失敗</span>
                          )}
                          <span className="text-[10px] text-white/70">{formatTime(m.sent_at)}</span>
                        </div>
                        <div className="max-w-[75%] relative">
                          <div className="bg-[#8CE62C] text-gray-900 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm">
                            {m.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 入力エリア - LINE風 */}
            <div className="bg-white border-t border-gray-200 px-3 py-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力"
                    rows={1}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-full text-sm resize-none focus:outline-none focus:border-[#00B900] bg-gray-50"
                    style={{ maxHeight: "100px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 100) + "px";
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="w-10 h-10 bg-[#00B900] text-white rounded-full flex items-center justify-center hover:bg-[#009900] disabled:opacity-30 transition-colors flex-shrink-0 shadow-sm"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
              {!hasLine && searched && (
                <p className="text-[11px] text-amber-500 mt-1 ml-2">この患者はLINE未連携のため送信できない場合があります</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
