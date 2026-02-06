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

interface PatientDetail {
  patient: { id: string; name: string; lstep_uid: string };
  latestOrder: {
    date: string;
    product: string;
    amount: string;
    payment: string;
    tracking: string;
    postal_code: string;
    address: string;
    phone: string;
    email: string;
    refund_status: string | null;
  } | null;
  orderHistory: { date: string; product: string; refund_status: string | null }[];
  reorders: { id: number; date: string; product: string; status: string }[];
  pendingBankTransfer: { product: string; date: string } | null;
  nextReservation: string | null;
  medicalInfo: {
    kana: string;
    gender: string;
    birthday: string;
    medicalHistory: string;
    glp1History: string;
    medicationHistory: string;
    allergies: string;
    prescriptionMenu: string;
  } | null;
}

const MARK_OPTIONS = [
  { value: "none", label: "なし", color: "transparent" },
  { value: "red", label: "要対応", color: "#EF4444" },
  { value: "yellow", label: "対応中", color: "#EAB308" },
  { value: "green", label: "対応済み", color: "#22C55E" },
  { value: "blue", label: "重要", color: "#3B82F6" },
  { value: "gray", label: "保留", color: "#6B7280" },
];

const PIN_STORAGE_KEY = "talk_pinned_patients";
const MAX_PINS = 15;

export default function TalkPage() {
  // 左カラム
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

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
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [allFieldDefs, setAllFieldDefs] = useState<FieldDef[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [markNote, setMarkNote] = useState("");
  const [savingMark, setSavingMark] = useState(false);

  // ピン留めをlocalStorageから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      if (stored) setPinnedIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // ピン留め保存
  const savePins = (ids: string[]) => {
    setPinnedIds(ids);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(ids));
  };

  const togglePin = (patientId: string) => {
    if (pinnedIds.includes(patientId)) {
      savePins(pinnedIds.filter(id => id !== patientId));
    } else {
      if (pinnedIds.length >= MAX_PINS) return; // 上限15件
      savePins([...pinnedIds, patientId]);
    }
  };

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
    setPatientDetail(null);

    const [logRes, tagsRes, markRes, fieldsRes, detailRes] = await Promise.all([
      fetch(`/api/admin/messages/log?patient_id=${encodeURIComponent(friend.patient_id)}&limit=100`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/tags`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/mark`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/fields`, { credentials: "include" }),
      fetch(`/api/admin/patient-lookup?q=${encodeURIComponent(friend.patient_id)}&type=id`, { credentials: "include" }),
    ]);

    const [logData, tagsData, markData, fieldsData, detailData] = await Promise.all([
      logRes.json(), tagsRes.json(), markRes.json(), fieldsRes.json(), detailRes.json(),
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
    if (detailData.found) setPatientDetail(detailData);

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

  // 検索フィルタ（IDと氏名の別々検索）
  const filteredFriends = friends.filter(f => {
    if (searchId) {
      if (!f.patient_id.toLowerCase().includes(searchId.toLowerCase())) return false;
    }
    if (searchName) {
      const q = searchName.replace(/[\s　]/g, "").toLowerCase();
      const name = f.patient_name.replace(/[\s　]/g, "").toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  // ピン留め分離: ピン留め済み → 通常
  const pinnedFriends = filteredFriends.filter(f => pinnedIds.includes(f.patient_id));
  const unpinnedFriends = filteredFriends.filter(f => !pinnedIds.includes(f.patient_id));

  const getMarkColor = (mark: string) => MARK_OPTIONS.find(m => m.value === mark)?.color || "transparent";
  const getMarkLabel = (mark: string) => MARK_OPTIONS.find(m => m.value === mark)?.label || "なし";

  const assignedTagIds = patientTags.map(t => t.tag_id);
  const availableTags = allTags.filter(t => !assignedTagIds.includes(t.id));

  // 友達リスト行コンポーネント
  const FriendRow = ({ f, isPinned }: { f: Friend; isPinned: boolean }) => {
    const isSelected = selectedPatient?.patient_id === f.patient_id;
    const markColor = getMarkColor(f.mark);
    return (
      <div
        onClick={() => selectPatient(f)}
        className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-50 relative group ${
          isSelected ? "bg-[#00B900]/5 border-l-2 border-l-[#00B900]" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {/* アバター */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {f.patient_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-gray-900 truncate">{f.patient_name}</span>
              {f.mark && f.mark !== "none" && (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: markColor }} />
              )}
              {f.line_id ? (
                <span className="w-2 h-2 rounded-full bg-[#00B900] flex-shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
              )}
            </div>
            {/* 最終メッセージ */}
            {f.last_message ? (
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[11px] text-gray-400 truncate flex-1">{f.last_message}</p>
                {f.last_sent_at && (
                  <span className="text-[10px] text-gray-300 flex-shrink-0">{formatDateShort(f.last_sent_at)}</span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-gray-300 mt-0.5">メッセージなし</p>
            )}
          </div>
          {/* ピン留めボタン */}
          <button
            onClick={(e) => { e.stopPropagation(); togglePin(f.patient_id); }}
            className={`flex-shrink-0 p-1 rounded transition-all ${
              isPinned
                ? "text-amber-500 opacity-100"
                : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400"
            }`}
            title={isPinned ? "ピン解除" : (pinnedIds.length >= MAX_PINS ? "ピン留め上限(15件)" : "ピン留め")}
          >
            <svg className="w-3.5 h-3.5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex bg-white">
      {/* ========== 左カラム: 友達リスト ========== */}
      <div className="w-[280px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        {/* 検索バー - ID・氏名を別々に */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium">ID</span>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="患者IDで検索"
              className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900] focus:border-[#00B900] bg-gray-50"
            />
            {searchId && (
              <button onClick={() => setSearchId("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="氏名で検索"
              className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#00B900] focus:border-[#00B900] bg-gray-50"
            />
            {searchName && (
              <button onClick={() => setSearchName("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>{filteredFriends.length}件</span>
            {pinnedIds.length > 0 && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {pinnedIds.length}件ピン留め
              </span>
            )}
          </div>
        </div>

        {/* 友達一覧 */}
        <div className="flex-1 overflow-y-auto">
          {friendsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">該当する友達がいません</div>
          ) : (
            <>
              {/* ピン留め済み */}
              {pinnedFriends.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-amber-50/80 border-b border-amber-100">
                    <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      ピン留め
                    </span>
                  </div>
                  {pinnedFriends.map(f => (
                    <FriendRow key={f.patient_id} f={f} isPinned={true} />
                  ))}
                </div>
              )}
              {/* 通常リスト */}
              {unpinnedFriends.map(f => (
                <FriendRow key={f.patient_id} f={f} isPinned={false} />
              ))}
            </>
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
              {/* ピン留めトグル */}
              <button
                onClick={() => togglePin(selectedPatient.patient_id)}
                className={`p-1.5 rounded-lg transition-all ${
                  pinnedIds.includes(selectedPatient.patient_id)
                    ? "bg-white/20 text-amber-300"
                    : "hover:bg-white/10 text-white/60"
                }`}
                title={pinnedIds.includes(selectedPatient.patient_id) ? "ピン解除" : "ピン留め"}
              >
                <svg className="w-4 h-4" fill={pinnedIds.includes(selectedPatient.patient_id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              {!selectedPatient.line_id && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">LINE未連携</span>
              )}
            </div>

            {/* メッセージ一覧 - 斜めピンク背景 */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{
                background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 30%, #f48fb1 60%, #fce4ec 100%)",
              }}
            >
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
                            <span className="text-[10px] text-red-400 font-medium">送信失敗</span>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-600/60 text-white font-medium">
                              {m.message_type === "individual" ? "個別" : m.message_type === "broadcast" ? "一斉" : m.message_type}
                            </span>
                            <span className="text-[10px] text-pink-900/50">{formatTime(m.sent_at)}</span>
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
        <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {/* プロフィールヘッダー */}
          <div className="p-4 text-center border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xl font-bold mx-auto">
              {selectedPatient.patient_name.charAt(0)}
            </div>
            <h3 className="font-bold text-gray-900 mt-2 text-[15px]">{selectedPatient.patient_name}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">ID: {selectedPatient.patient_id}</p>
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

          {/* 個人情報 */}
          {patientDetail?.medicalInfo && (
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 mb-2 block">個人情報</span>
              <div className="space-y-1">
                {patientDetail.medicalInfo.kana && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-gray-500">カナ</span>
                    <span className="text-[11px] text-gray-900">{patientDetail.medicalInfo.kana}</span>
                  </div>
                )}
                {patientDetail.medicalInfo.gender && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-gray-500">性別</span>
                    <span className="text-[11px] text-gray-900">{patientDetail.medicalInfo.gender}</span>
                  </div>
                )}
                {patientDetail.medicalInfo.birthday && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-gray-500">生年月日</span>
                    <span className="text-[11px] text-gray-900">
                      {patientDetail.medicalInfo.birthday}
                      {(() => {
                        try {
                          const bd = new Date(patientDetail.medicalInfo.birthday);
                          const today = new Date();
                          let age = today.getFullYear() - bd.getFullYear();
                          if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
                          return `（${age}歳）`;
                        } catch { return ""; }
                      })()}
                    </span>
                  </div>
                )}
                {patientDetail.medicalInfo.prescriptionMenu && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-gray-500">処方メニュー</span>
                    <span className="text-[11px] text-gray-900 font-medium">{patientDetail.medicalInfo.prescriptionMenu}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 次回予約 */}
          {patientDetail?.nextReservation && (
            <div className="px-4 py-2.5 border-b border-gray-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-blue-600 font-semibold">次回予約</span>
                <span className="text-[12px] text-blue-800 font-medium">{patientDetail.nextReservation}</span>
              </div>
            </div>
          )}

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
              <div className="space-y-1">
                {allFieldDefs.map(fd => {
                  const val = patientFields.find(pf => pf.field_id === fd.id);
                  return (
                    <div key={fd.id} className="flex items-center justify-between py-0.5">
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

          {/* 問診事項 */}
          {patientDetail?.medicalInfo && (
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 mb-2 block">問診事項</span>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">既往歴</span>
                  <p className="text-[11px] text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 leading-relaxed">{patientDetail.medicalInfo.medicalHistory || "特記事項なし"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">GLP-1 使用歴</span>
                  <p className="text-[11px] text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 leading-relaxed">{patientDetail.medicalInfo.glp1History || "使用歴なし"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">内服歴</span>
                  <p className="text-[11px] text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 leading-relaxed">{patientDetail.medicalInfo.medicationHistory || "なし"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold">アレルギー</span>
                  <p className="text-[11px] text-gray-900 mt-0.5 bg-gray-50 rounded px-2 py-1.5 leading-relaxed">{patientDetail.medicalInfo.allergies || "アレルギーなし"}</p>
                </div>
              </div>
            </div>
          )}

          {/* 最新決済 */}
          {patientDetail?.latestOrder && (
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 mb-2 block">最新決済</span>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-gray-500">メニュー</span>
                  <span className="text-[11px] text-gray-900 font-medium">{patientDetail.latestOrder.product}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-gray-500">金額</span>
                  <span className="text-[11px] text-gray-900 font-medium">{patientDetail.latestOrder.amount}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-gray-500">決済方法</span>
                  <span className="text-[11px] text-gray-900 font-medium">{patientDetail.latestOrder.payment}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-gray-500">日時</span>
                  <span className="text-[11px] text-gray-900 font-medium">{patientDetail.latestOrder.date}</span>
                </div>
                {patientDetail.latestOrder.refund_status && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-gray-500">返金</span>
                    <span className="text-[11px] text-red-600 font-medium">{patientDetail.latestOrder.refund_status}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] text-gray-500">追跡番号</span>
                  <span className="text-[11px] text-gray-900 font-mono text-[10px]">{patientDetail.latestOrder.tracking}</span>
                </div>
              </div>
            </div>
          )}

          {/* 連絡先・住所 */}
          {patientDetail?.latestOrder && (patientDetail.latestOrder.phone || patientDetail.latestOrder.email || patientDetail.latestOrder.address) && (
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 mb-2 block">連絡先</span>
              <div className="space-y-1">
                {patientDetail.latestOrder.phone && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-gray-500">電話</span>
                    <span className="text-[11px] text-gray-900 font-mono">{patientDetail.latestOrder.phone}</span>
                  </div>
                )}
                {patientDetail.latestOrder.email && (
                  <div className="flex items-start justify-between py-0.5 gap-2">
                    <span className="text-[11px] text-gray-500 flex-shrink-0">メール</span>
                    <span className="text-[11px] text-gray-900 break-all text-right">{patientDetail.latestOrder.email}</span>
                  </div>
                )}
                {patientDetail.latestOrder.address && (
                  <div className="flex items-start justify-between py-0.5 gap-2">
                    <span className="text-[11px] text-gray-500 flex-shrink-0">住所</span>
                    <span className="text-[11px] text-gray-900 text-right leading-relaxed">
                      {patientDetail.latestOrder.postal_code && <span className="text-gray-400">{patientDetail.latestOrder.postal_code}<br/></span>}
                      {patientDetail.latestOrder.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 処方履歴 */}
          {patientDetail && patientDetail.orderHistory.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 mb-2 block">処方履歴</span>
              <div className="space-y-1">
                {patientDetail.orderHistory.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400">{o.date}</span>
                      <span className="text-[11px] text-gray-900">{o.product}</span>
                    </div>
                    {o.refund_status && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                        {o.refund_status === "refunded" ? "返金済" : o.refund_status === "pending" ? "返金申請中" : o.refund_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 銀行振込申請中 */}
          {patientDetail?.pendingBankTransfer && (
            <div className="px-4 py-2.5 border-b border-gray-100 bg-amber-50/50">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-medium">振込待ち</span>
                <span className="text-[11px] text-amber-800">{patientDetail.pendingBankTransfer.product}</span>
                <span className="text-[10px] text-amber-600 ml-auto">{patientDetail.pendingBankTransfer.date}</span>
              </div>
            </div>
          )}

          {/* 再処方 */}
          {patientDetail && patientDetail.reorders.length > 0 && (
            <div className="px-4 py-3">
              <span className="text-xs font-semibold text-gray-500 mb-2 block">再処方</span>
              <div className="space-y-1">
                {patientDetail.reorders.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400">{r.date}</span>
                      <span className="text-[11px] text-gray-900">{r.product}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      r.status === "承認済み" || r.status === "決済済み"
                        ? "bg-emerald-100 text-emerald-700"
                        : r.status === "却下" || r.status === "キャンセル"
                          ? "bg-red-100 text-red-600"
                          : "bg-blue-100 text-blue-700"
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
