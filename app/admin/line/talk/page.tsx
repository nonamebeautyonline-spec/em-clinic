"use client";

import { useState } from "react";

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

  const handleSearch = async () => {
    if (!patientId.trim()) return;
    setLoading(true);
    setSearched(true);

    // 患者情報取得
    const lookupRes = await fetch(`/api/admin/patient-lookup?q=${encodeURIComponent(patientId)}&type=id`, {
      credentials: "include",
    });
    const lookupData = await lookupRes.json();
    if (lookupData.found) {
      setPatientName(lookupData.patient.name);
    }

    // メッセージ履歴取得
    const logRes = await fetch(`/api/admin/messages/log?patient_id=${encodeURIComponent(patientId)}&limit=100`, {
      credentials: "include",
    });
    const logData = await logRes.json();
    if (logData.messages) setMessages(logData.messages.reverse());

    setLoading(false);
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
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">個別トーク</h1>

      {/* 患者検索 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="患者IDを入力"
            className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !patientId.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            検索
          </button>
        </div>
        {patientName && (
          <p className="mt-2 text-sm font-medium">{patientName}</p>
        )}
      </div>

      {/* トーク画面 */}
      {searched && (
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* メッセージ一覧 */}
          <div className="h-96 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {loading ? (
              <div className="text-center text-gray-400 py-12">読み込み中...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 py-12">メッセージ履歴がありません</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="bg-green-500 text-white rounded-lg px-4 py-2 text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">{formatTime(m.sent_at)}</span>
                      <span className={`text-[10px] ${m.status === "sent" ? "text-green-500" : m.status === "failed" ? "text-red-500" : "text-gray-400"}`}>
                        {m.status === "sent" ? "送信済" : m.status === "failed" ? "失敗" : m.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 入力欄 */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力（Enterで送信）"
                className="flex-1 px-3 py-2 border rounded text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm self-end"
              >
                {sending ? "..." : "送信"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
