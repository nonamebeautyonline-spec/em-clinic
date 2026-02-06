"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Friend {
  patient_id: string;
  patient_name: string;
  line_id: string | null;
  mark: string;
  tags: { id: number; name: string; color: string }[];
  fields: Record<string, string>;
  last_message?: string;
  last_sent_at?: string;
}

interface MessageLog {
  id: number;
  content: string;
  status: string;
  message_type: string;
  sent_at: string;
}

interface TagDef {
  id: number;
  name: string;
  color: string;
}

interface PatientTag {
  tag_id: number;
  tag_definitions: { id: number; name: string; color: string };
}

interface FieldValue {
  field_id: number;
  value: string;
  friend_field_definitions: { id: number; name: string };
}

interface FieldDef {
  id: number;
  name: string;
  field_type: string;
  options: string[] | null;
}

const MARK_OPTIONS = [
  { value: "none", label: "なし", color: "transparent" },
  { value: "red", label: "要対応", color: "#EF4444" },
  { value: "yellow", label: "対応中", color: "#EAB308" },
  { value: "green", label: "対応済み", color: "#22C55E" },
  { value: "blue", label: "重要", color: "#3B82F6" },
  { value: "gray", label: "保留", color: "#6B7280" },
];

export default function TalkPage() {
  // 左カラム
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHasReply, setFilterHasReply] = useState(false);

  // 中央カラム - 選択中の患者
  const [selectedPatient, setSelectedPatient] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 右カラム - 顧客情報
  const [patientTags, setPatientTags] = useState<PatientTag[]>([]);
  const [patientMark, setPatientMark] = useState("none");
  const [patientFields, setPatientFields] = useState<FieldValue[]>([]);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [allFieldDefs, setAllFieldDefs] = useState<FieldDef[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [markNote, setMarkNote] = useState("");
  const [savingMark, setSavingMark] = useState(false);

  // 友達一覧を取得
  useEffect(() => {
    const fetchFriends = async () => {
      const res = await fetch("/api/admin/line/friends-list", { credentials: "include" });
      const data = await res.json();
      if (data.patients) setFriends(data.patients);
      setFriendsLoading(false);
    };
    fetchFriends();

    // タグ定義・フィールド定義を取得
    Promise.all([
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/friend-fields", { credentials: "include" }).then(r => r.json()),
    ]).then(([tagsData, fieldsData]) => {
      if (tagsData.tags) setAllTags(tagsData.tags);
      if (fieldsData.fields) setAllFieldDefs(fieldsData.fields);
    });
  }, []);

  // 患者選択時にメッセージ・詳細情報を取得
  const selectPatient = useCallback(async (friend: Friend) => {
    setSelectedPatient(friend);
    setMessagesLoading(true);
    setShowTagPicker(false);

    const [logRes, tagsRes, markRes, fieldsRes] = await Promise.all([
      fetch(`/api/admin/messages/log?patient_id=${encodeURIComponent(friend.patient_id)}&limit=100`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/tags`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/mark`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/fields`, { credentials: "include" }),
    ]);

    const [logData, tagsData, markData, fieldsData] = await Promise.all([
      logRes.json(), tagsRes.json(), markRes.json(), fieldsRes.json(),
    ]);

    if (logData.messages) setMessages(logData.messages.reverse());
    if (tagsData.tags) setPatientTags(tagsData.tags);
    if (markData.mark) {
      setPatientMark(markData.mark.mark || "none");
      setMarkNote(markData.mark.note || "");
    } else {
      setPatientMark("none");
      setMarkNote("");
    }
    if (fieldsData.fields) setPatientFields(fieldsData.fields);

    setMessagesLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // メッセージ送信
  const handleSend = async () => {
    if (!newMessage.trim() || sending || !selectedPatient) return;
    setSending(true);

    const res = await fetch("/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ patient_id: selectedPatient.patient_id, message: newMessage }),
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
    }
    setSending(false);
  };

  // 対応マーク更新
  const handleMarkChange = async (newMark: string) => {
    if (!selectedPatient || savingMark) return;
    setSavingMark(true);
    setPatientMark(newMark);
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/mark`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mark: newMark, note: markNote }),
    });
    setSavingMark(false);
  };

  // タグ追加
  const handleAddTag = async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tag_id: tagId }),
    });
    const res = await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, { credentials: "include" });
    const data = await res.json();
    if (data.tags) setPatientTags(data.tags);
    setShowTagPicker(false);
  };

  // タグ削除
  const handleRemoveTag = async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags?tag_id=${tagId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setPatientTags(prev => prev.filter(t => t.tag_id !== tagId));
  };

  // ユーティリティ
  const formatTime = (s: string) => {
    const d = new Date(s);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "今日";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "昨日";
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatDateShort = (s: string) => {
    const d = new Date(s);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(s);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "昨日";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const shouldShowDate = (i: number) => {
    if (i === 0) return true;
    return new Date(messages[i - 1].sent_at).toDateString() !== new Date(messages[i].sent_at).toDateString();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // 検索フィルタ
  const filteredFriends = friends.filter(f => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.patient_name.toLowerCase().includes(q) && !f.patient_id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const getMarkColor = (mark: string) => MARK_OPTIONS.find(m => m.value === mark)?.color || "transparent";
  const getMarkLabel = (mark: string) => MARK_OPTIONS.find(m => m.value === mark)?.label || "なし";

  const assignedTagIds = patientTags.map(t => t.tag_id);
  const availableTags = allTags.filter(t => !assignedTagIds.includes(t.id));

  return (
    <div className="h-full flex bg-white">
      {/* ========== 左カラム: 友達リスト ========== */}
      <div className="w-[300px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        {/* 検索バー */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前・IDで検索"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00B900] focus:border-[#00B900] bg-gray-50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
            <span>{filteredFriends.length}件表示中</span>
            <button className="flex items-center gap-1 text-gray-400 hover:text-[#00B900] transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              絞り込み
            </button>
          </div>
        </div>

        {/* 友達一覧 - テーブル形式 */}
        <div className="flex-1 overflow-y-auto">
          {friendsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">該当する友達がいません</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">PID</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">氏名</th>
                  <th className="px-1 py-2 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFriends.map((f) => {
                  const isSelected = selectedPatient?.patient_id === f.patient_id;
                  const markColor = getMarkColor(f.mark);
                  return (
                    <tr
                      key={f.patient_id}
                      onClick={() => selectPatient(f)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${
                        isSelected ? "bg-[#00B900]/5 border-l-2 border-l-[#00B900]" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] font-mono text-gray-500">{f.patient_id}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-gray-900 truncate">{f.patient_name}</span>
                          {f.mark && f.mark !== "none" && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: markColor }} />
                          )}
                        </div>
                        {f.tags.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5 flex-wrap">
                            {f.tags.slice(0, 2).map(t => (
                              <span key={t.id} className="text-[8px] px-1 py-0 rounded text-white leading-relaxed" style={{ backgroundColor: t.color }}>
                                {t.name}
                              </span>
                            ))}
                            {f.tags.length > 2 && <span className="text-[8px] text-gray-400">+{f.tags.length - 2}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-2.5">
                        {f.line_id ? (
                          <span className="w-2 h-2 rounded-full bg-[#00B900] block" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-gray-200 block" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========== 中央カラム: トーク ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedPatient ? (
          /* 未選択状態 */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#00B900]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#00B900]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 5.92 2 10.66c0 2.72 1.46 5.14 3.74 6.7-.13.47-.84 2.94-.87 3.16 0 0-.02.13.05.18.07.06.16.03.16.03.24-.03 2.73-1.8 3.76-2.53.7.1 1.42.16 2.16.16 5.52 0 10-3.92 10-8.7C22 5.92 17.52 2 12 2z"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-600">個別トーク</h2>
              <p className="text-sm text-gray-400 mt-1">左のリストから患者を選択してください</p>
            </div>
          </div>
        ) : (
          <>
            {/* チャットヘッダー */}
            <div className="bg-[#00B900] text-white px-4 py-2.5 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {selectedPatient.patient_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-[15px] leading-tight truncate">{selectedPatient.patient_name}</h2>
                <span className="text-green-200 text-[11px]">{selectedPatient.patient_id}</span>
              </div>
              {!selectedPatient.line_id && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">LINE未連携</span>
              )}
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#7494C0]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236B8AB5' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
              {messagesLoading ? (
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
                      {shouldShowDate(i) && (
                        <div className="flex justify-center my-3">
                          <span className="bg-black/20 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">
                            {formatDate(m.sent_at)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-end items-end gap-1.5">
                        <div className="flex flex-col items-end gap-0.5">
                          {m.status === "failed" && (
                            <span className="text-[10px] text-red-300 font-medium">送信失敗</span>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/80 text-white font-medium">
                              {m.message_type === "individual" ? "個別" : m.message_type === "broadcast" ? "一斉" : m.message_type}
                            </span>
                            <span className="text-[10px] text-white/70">{formatTime(m.sent_at)}</span>
                          </div>
                        </div>
                        <div className="max-w-[70%]">
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

            {/* 入力エリア */}
            <div className="bg-white border-t border-gray-200 px-3 py-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力してください"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#00B900] focus:border-[#00B900] bg-gray-50"
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
                  className="px-4 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] disabled:opacity-30 transition-colors flex-shrink-0 flex items-center gap-1.5"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  送信
                </button>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 text-right">Shift + Enter で改行</div>
            </div>
          </>
        )}
      </div>

      {/* ========== 右カラム: 顧客情報 ========== */}
      {selectedPatient && (
        <div className="w-[300px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {/* プロフィールヘッダー */}
          <div className="p-4 text-center border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-2xl font-bold mx-auto">
              {selectedPatient.patient_name.charAt(0)}
            </div>
            <h3 className="font-bold text-gray-900 mt-2 text-[15px]">{selectedPatient.patient_name}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">ID: {selectedPatient.patient_id}</p>
            {selectedPatient.line_id ? (
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#00B900]" />
                <span className="text-[11px] text-[#00B900]">LINE連携済み</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-[11px] text-gray-400">LINE未連携</span>
              </div>
            )}
          </div>

          {/* 対応マーク */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">対応マーク</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MARK_OPTIONS.filter(m => m.value !== "none").map(m => (
                <button
                  key={m.value}
                  onClick={() => handleMarkChange(m.value)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] border transition-all ${
                    patientMark === m.value
                      ? "border-gray-300 bg-gray-50 font-semibold"
                      : "border-transparent hover:bg-gray-50 text-gray-500"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  {m.label}
                </button>
              ))}
              {patientMark !== "none" && (
                <button
                  onClick={() => handleMarkChange("none")}
                  className="flex items-center justify-center px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:bg-gray-50 border border-transparent"
                >
                  解除
                </button>
              )}
            </div>
          </div>

          {/* タグ */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">タグ</span>
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="text-[11px] text-[#00B900] hover:text-[#009900] font-medium flex items-center gap-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </button>
            </div>

            {/* タグピッカー */}
            {showTagPicker && (
              <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                {availableTags.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-gray-400">追加できるタグがありません</div>
                ) : (
                  <div className="max-h-32 overflow-y-auto">
                    {availableTags.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleAddTag(t.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-xs text-gray-700">{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 付与済みタグ */}
            {patientTags.length === 0 ? (
              <p className="text-[11px] text-gray-400">タグなし</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {patientTags.map(t => (
                  <span
                    key={t.tag_id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-white group"
                    style={{ backgroundColor: t.tag_definitions.color }}
                  >
                    {t.tag_definitions.name}
                    <button
                      onClick={() => handleRemoveTag(t.tag_id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded-full"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 友だち情報 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">友だち情報</span>
            </div>
            {allFieldDefs.length === 0 ? (
              <p className="text-[11px] text-gray-400">フィールド未設定</p>
            ) : (
              <div className="space-y-1.5">
                {allFieldDefs.map(fd => {
                  const val = patientFields.find(pf => pf.field_id === fd.id);
                  return (
                    <div key={fd.id} className="flex items-center justify-between py-1">
                      <span className="text-[11px] text-gray-500">{fd.name}</span>
                      <span className="text-[11px] text-gray-900 font-medium">
                        {val?.value || <span className="text-gray-300">—</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 患者基本情報 */}
          <div className="px-4 py-3">
            <span className="text-xs font-semibold text-gray-500 mb-2 block">患者情報</span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between py-1">
                <span className="text-[11px] text-gray-500">患者ID</span>
                <span className="text-[11px] text-gray-900 font-mono">{selectedPatient.patient_id}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[11px] text-gray-500">LINE UID</span>
                <span className="text-[11px] text-gray-900 font-mono truncate max-w-[150px]">
                  {selectedPatient.line_id || <span className="text-gray-300">—</span>}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
