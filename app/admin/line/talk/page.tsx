"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Friend {
  patient_id: string;
  patient_name: string;
  line_id: string | null;
  mark: string;
  tags: { id: number; name: string; color: string }[];
  fields: Record<string, string>;
  last_message?: string | null;
  last_sent_at?: string | null;
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
  { value: "none", label: "なし", color: "transparent", icon: "○" },
  { value: "red", label: "要対応", color: "#EF4444", icon: "●" },
  { value: "yellow", label: "対応中", color: "#EAB308", icon: "●" },
  { value: "green", label: "対応済み", color: "#22C55E", icon: "●" },
  { value: "blue", label: "重要", color: "#3B82F6", icon: "●" },
  { value: "gray", label: "保留", color: "#6B7280", icon: "●" },
];

const PIN_STORAGE_KEY = "talk_pinned_patients";
const MAX_PINS = 15;
const DISPLAY_BATCH = 50;

export default function TalkPage() {
  // 左カラム
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(DISPLAY_BATCH);
  const listRef = useRef<HTMLDivElement>(null);

  // 中央カラム
  const [selectedPatient, setSelectedPatient] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 右カラム
  const [patientTags, setPatientTags] = useState<PatientTag[]>([]);
  const [patientMark, setPatientMark] = useState("none");
  const [patientFields, setPatientFields] = useState<FieldValue[]>([]);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [allFieldDefs, setAllFieldDefs] = useState<FieldDef[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMarkDropdown, setShowMarkDropdown] = useState(false);
  const [markNote, setMarkNote] = useState("");
  const [savingMark, setSavingMark] = useState(false);

  // ピン留め
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      if (stored) setPinnedIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const savePins = (ids: string[]) => {
    setPinnedIds(ids);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(ids));
  };

  const togglePin = (patientId: string) => {
    if (pinnedIds.includes(patientId)) {
      savePins(pinnedIds.filter(id => id !== patientId));
    } else {
      if (pinnedIds.length >= MAX_PINS) return;
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

    Promise.all([
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/friend-fields", { credentials: "include" }).then(r => r.json()),
    ]).then(([tagsData, fieldsData]) => {
      if (tagsData.tags) setAllTags(tagsData.tags);
      if (fieldsData.fields) setAllFieldDefs(fieldsData.fields);
    });
  }, []);

  // 左カラム無限スクロール
  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setDisplayCount(prev => prev + DISPLAY_BATCH);
    }
  }, []);

  // 検索変更時にdisplayCountリセット
  useEffect(() => {
    setDisplayCount(DISPLAY_BATCH);
  }, [searchId, searchName]);

  // 患者選択
  const selectPatient = useCallback(async (friend: Friend) => {
    setSelectedPatient(friend);
    setMessagesLoading(true);
    setShowTagPicker(false);
    setShowMarkDropdown(false);
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
        id: Date.now(), content: newMessage, status: "sent",
        message_type: "individual", sent_at: new Date().toISOString(),
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
    setShowMarkDropdown(false);
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/mark`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mark: newMark, note: markNote }),
    });
    setSavingMark(false);
  };

  // タグ
  const handleAddTag = async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ tag_id: tagId }),
    });
    const res = await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, { credentials: "include" });
    const data = await res.json();
    if (data.tags) setPatientTags(data.tags);
    setShowTagPicker(false);
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags?tag_id=${tagId}`, {
      method: "DELETE", credentials: "include",
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
  const calcAge = (birthday: string) => {
    try {
      const bd = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - bd.getFullYear();
      if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
      return age;
    } catch { return null; }
  };

  // 検索フィルタ
  const filteredFriends = friends.filter(f => {
    if (searchId && !f.patient_id.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (searchName) {
      const q = searchName.replace(/[\s　]/g, "").toLowerCase();
      const name = f.patient_name.replace(/[\s　]/g, "").toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const pinnedFriends = filteredFriends.filter(f => pinnedIds.includes(f.patient_id));
  const unpinnedFriends = filteredFriends.filter(f => !pinnedIds.includes(f.patient_id));
  const visibleUnpinned = unpinnedFriends.slice(0, displayCount);
  const hasMore = unpinnedFriends.length > displayCount;

  const getMarkColor = (mark: string) => MARK_OPTIONS.find(m => m.value === mark)?.color || "transparent";
  const getMarkLabel = (mark: string) => MARK_OPTIONS.find(m => m.value === mark)?.label || "なし";
  const currentMark = MARK_OPTIONS.find(m => m.value === patientMark) || MARK_OPTIONS[0];

  const assignedTagIds = patientTags.map(t => t.tag_id);
  const availableTags = allTags.filter(t => !assignedTagIds.includes(t.id));

  // セクションラベル
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );

  // 情報行
  const InfoRow = ({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={`text-[11px] text-gray-800 ${mono ? "font-mono" : ""}`}>{children}</span>
    </div>
  );

  return (
    <div className="h-full flex bg-[#f8f9fb]">
      {/* ========== 左カラム ========== */}
      <div className="w-[280px] flex-shrink-0 border-r border-gray-200/80 flex flex-col bg-white">
        {/* 検索 */}
        <div className="p-3 border-b border-gray-100 space-y-1.5">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold tracking-wider">ID</span>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="患者IDで検索"
              className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
            />
            {searchId && (
              <button onClick={() => setSearchId("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="氏名で検索"
              className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
            />
            {searchName && (
              <button onClick={() => setSearchName("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-0.5">
            <span>{filteredFriends.length}件</span>
            {pinnedIds.length > 0 && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                {pinnedIds.length}
              </span>
            )}
          </div>
        </div>

        {/* 友達一覧 */}
        <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto">
          {friendsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-xs">該当なし</div>
          ) : (
            <>
              {pinnedFriends.length > 0 && (
                <>
                  <div className="px-3 py-1 bg-amber-50/60 border-b border-amber-100/50">
                    <span className="text-[9px] font-bold text-amber-500 tracking-wider uppercase flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      PIN
                    </span>
                  </div>
                  {pinnedFriends.map(f => (
                    <FriendItem key={f.patient_id} f={f} isPinned={true}
                      isSelected={selectedPatient?.patient_id === f.patient_id}
                      onSelect={selectPatient} onTogglePin={togglePin}
                      getMarkColor={getMarkColor} formatDateShort={formatDateShort}
                      canPin={pinnedIds.length < MAX_PINS}
                    />
                  ))}
                </>
              )}
              {visibleUnpinned.map(f => (
                <FriendItem key={f.patient_id} f={f} isPinned={false}
                  isSelected={selectedPatient?.patient_id === f.patient_id}
                  onSelect={selectPatient} onTogglePin={togglePin}
                  getMarkColor={getMarkColor} formatDateShort={formatDateShort}
                  canPin={pinnedIds.length < MAX_PINS}
                />
              ))}
              {hasMore && (
                <div className="px-3 py-3 text-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + DISPLAY_BATCH)}
                    className="text-[11px] text-[#00B900] hover:text-[#009900] font-medium transition-colors"
                  >
                    さらに{Math.min(DISPLAY_BATCH, unpinnedFriends.length - displayCount)}件を表示
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========== 中央カラム ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedPatient ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00B900]/10 to-[#00B900]/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#00B900]/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 5.92 2 10.66c0 2.72 1.46 5.14 3.74 6.7-.13.47-.84 2.94-.87 3.16 0 0-.02.13.05.18.07.06.16.03.16.03.24-.03 2.73-1.8 3.76-2.53.7.1 1.42.16 2.16.16 5.52 0 10-3.92 10-8.7C22 5.92 17.52 2 12 2z"/>
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-500">個別トーク</h2>
              <p className="text-xs text-gray-400 mt-1">左のリストから患者を選択</p>
            </div>
          </div>
        ) : (
          <>
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-[#00B900] to-[#00a000] text-white px-4 py-2.5 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm font-bold flex-shrink-0">
                {selectedPatient.patient_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-[15px] leading-tight truncate">{selectedPatient.patient_name}</h2>
                <span className="text-green-200/80 text-[11px] font-mono">{selectedPatient.patient_id}</span>
              </div>
              <button
                onClick={() => togglePin(selectedPatient.patient_id)}
                className={`p-1.5 rounded-lg transition-all ${pinnedIds.includes(selectedPatient.patient_id) ? "bg-white/20 text-amber-300" : "hover:bg-white/10 text-white/40"}`}
              >
                <svg className="w-4 h-4" fill={pinnedIds.includes(selectedPatient.patient_id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              {!selectedPatient.line_id && (
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-white/80">未連携</span>
              )}
            </div>

            {/* メッセージ */}
            <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 25%, #f48fb1 50%, #f8bbd0 75%, #fce4ec 100%)" }}>
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white/90 backdrop-blur rounded-2xl px-5 py-2.5 text-gray-400 text-xs shadow-lg">読み込み中...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white/90 backdrop-blur rounded-2xl px-5 py-2.5 text-gray-400 text-xs shadow-lg">メッセージなし</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div key={m.id}>
                      {shouldShowDate(i) && (
                        <div className="flex justify-center my-3">
                          <span className="bg-black/15 text-white text-[10px] px-3 py-0.5 rounded-full backdrop-blur-sm font-medium">{formatDate(m.sent_at)}</span>
                        </div>
                      )}
                      <div className="flex justify-end items-end gap-1.5">
                        <div className="flex flex-col items-end gap-0.5">
                          {m.status === "failed" && <span className="text-[9px] text-red-400 font-medium">失敗</span>}
                          <span className="text-[9px] text-pink-800/40">{formatTime(m.sent_at)}</span>
                        </div>
                        <div className="max-w-[70%]">
                          <div className="bg-[#8CE62C] text-gray-900 rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm">{m.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 入力 */}
            <div className="bg-white border-t border-gray-100 px-3 py-2">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力"
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
                  style={{ maxHeight: "100px" }}
                  onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 100) + "px"; }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#00B900] to-[#00a000] text-white rounded-xl text-sm font-medium hover:shadow-md disabled:opacity-30 transition-all flex-shrink-0 flex items-center gap-1.5"
                >
                  {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )}
                  送信
                </button>
              </div>
              <div className="text-[9px] text-gray-300 mt-1 text-right">Shift+Enter で改行</div>
            </div>
          </>
        )}
      </div>

      {/* ========== 右カラム ========== */}
      {selectedPatient && (
        <div className="w-[320px] flex-shrink-0 border-l border-gray-200/80 bg-white flex flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* プロフィール */}
            <div className="px-4 pt-5 pb-4 text-center border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-sm">
                {selectedPatient.patient_name.charAt(0)}
              </div>
              <h3 className="font-bold text-gray-900 mt-2.5 text-[15px]">{selectedPatient.patient_name}</h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{selectedPatient.patient_id}</p>
              {selectedPatient.line_id ? (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-[#00B900] bg-[#00B900]/5 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B900]" />連携済み
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />未連携
                </span>
              )}
            </div>

            {/* 個人情報 */}
            {patientDetail?.medicalInfo && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>個人情報</SectionLabel>
                {patientDetail.medicalInfo.kana && <InfoRow label="カナ">{patientDetail.medicalInfo.kana}</InfoRow>}
                {patientDetail.medicalInfo.gender && <InfoRow label="性別">{patientDetail.medicalInfo.gender}</InfoRow>}
                {patientDetail.medicalInfo.birthday && (
                  <InfoRow label="生年月日">
                    {patientDetail.medicalInfo.birthday}
                    {(() => { const a = calcAge(patientDetail.medicalInfo.birthday); return a !== null ? `（${a}歳）` : ""; })()}
                  </InfoRow>
                )}
                {patientDetail.medicalInfo.prescriptionMenu && <InfoRow label="処方メニュー">{patientDetail.medicalInfo.prescriptionMenu}</InfoRow>}
              </div>
            )}

            {/* 次回予約 */}
            {patientDetail?.nextReservation && (
              <div className="px-4 py-2 border-b border-gray-100 bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-500 font-bold tracking-wider uppercase">予約</span>
                  <span className="text-[12px] text-blue-700 font-semibold">{patientDetail.nextReservation}</span>
                </div>
              </div>
            )}

            {/* 対応マーク - ドロップダウン */}
            <div className="px-4 py-3 border-b border-gray-100">
              <SectionLabel>対応マーク</SectionLabel>
              <div className="relative">
                <button
                  onClick={() => setShowMarkDropdown(!showMarkDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
                >
                  <div className="flex items-center gap-2">
                    {currentMark.value !== "none" && (
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: currentMark.color }} />
                    )}
                    <span className={`text-[12px] ${currentMark.value === "none" ? "text-gray-400" : "text-gray-800 font-medium"}`}>
                      {currentMark.label}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showMarkDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMarkDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {MARK_OPTIONS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => handleMarkChange(m.value)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-[12px] ${patientMark === m.value ? "bg-gray-50 font-semibold" : "text-gray-600"}`}
                      >
                        {m.value !== "none" ? (
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                        ) : (
                          <span className="w-3 h-3 rounded-full border-2 border-gray-200" />
                        )}
                        {m.label}
                        {patientMark === m.value && <svg className="w-3.5 h-3.5 ml-auto text-[#00B900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* タグ */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <SectionLabel>タグ</SectionLabel>
                <button
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className="text-[10px] text-[#00B900] hover:text-[#009900] font-semibold flex items-center gap-0.5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  追加
                </button>
              </div>
              {showTagPicker && (
                <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {availableTags.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-gray-400">追加できるタグなし</div>
                  ) : (
                    <div className="max-h-28 overflow-y-auto">
                      {availableTags.map(t => (
                        <button key={t.id} onClick={() => handleAddTag(t.id)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-xs text-gray-700">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {patientTags.length === 0 ? (
                <p className="text-[10px] text-gray-300">タグなし</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {patientTags.map(t => (
                    <span key={t.tag_id} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] text-white group cursor-default" style={{ backgroundColor: t.tag_definitions.color }}>
                      {t.tag_definitions.name}
                      <button onClick={() => handleRemoveTag(t.tag_id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 友だち情報 */}
            {allFieldDefs.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>友だち情報</SectionLabel>
                {allFieldDefs.map(fd => {
                  const val = patientFields.find(pf => pf.field_id === fd.id);
                  return <InfoRow key={fd.id} label={fd.name}>{val?.value || <span className="text-gray-200">—</span>}</InfoRow>;
                })}
              </div>
            )}

            {/* 問診事項 */}
            {patientDetail?.medicalInfo && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>問診事項</SectionLabel>
                <div className="space-y-2">
                  {[
                    { label: "既往歴", value: patientDetail.medicalInfo.medicalHistory || "特記事項なし" },
                    { label: "GLP-1 使用歴", value: patientDetail.medicalInfo.glp1History || "使用歴なし" },
                    { label: "内服歴", value: patientDetail.medicalInfo.medicationHistory || "なし" },
                    { label: "アレルギー", value: patientDetail.medicalInfo.allergies || "アレルギーなし" },
                  ].map((item) => (
                    <div key={item.label}>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{item.label}</span>
                      <p className="text-[11px] text-gray-700 mt-0.5 bg-gray-50/80 rounded-md px-2 py-1 leading-relaxed">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最新決済（配送情報含む） */}
            {patientDetail?.latestOrder && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>最新決済</SectionLabel>
                <InfoRow label="メニュー">{patientDetail.latestOrder.product}</InfoRow>
                <InfoRow label="金額">{patientDetail.latestOrder.amount}</InfoRow>
                <InfoRow label="決済方法">{patientDetail.latestOrder.payment}</InfoRow>
                <InfoRow label="日時">{patientDetail.latestOrder.date}</InfoRow>
                {patientDetail.latestOrder.refund_status && (
                  <div className="flex items-center justify-between py-[3px]">
                    <span className="text-[11px] text-gray-400">返金</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">{patientDetail.latestOrder.refund_status}</span>
                  </div>
                )}
                <InfoRow label="追跡番号" mono>{patientDetail.latestOrder.tracking}</InfoRow>
                {patientDetail.latestOrder.phone && <InfoRow label="電話" mono>{patientDetail.latestOrder.phone}</InfoRow>}
                {patientDetail.latestOrder.email && (
                  <div className="flex items-start justify-between py-[3px] gap-2">
                    <span className="text-[11px] text-gray-400 flex-shrink-0">メール</span>
                    <span className="text-[11px] text-gray-800 break-all text-right">{patientDetail.latestOrder.email}</span>
                  </div>
                )}
                {patientDetail.latestOrder.address && (
                  <div className="flex items-start justify-between py-[3px] gap-2">
                    <span className="text-[11px] text-gray-400 flex-shrink-0">住所</span>
                    <span className="text-[11px] text-gray-800 text-right leading-relaxed">
                      {patientDetail.latestOrder.postal_code && <span className="text-gray-400 text-[10px]">{patientDetail.latestOrder.postal_code}<br /></span>}
                      {patientDetail.latestOrder.address}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 処方履歴 */}
            {patientDetail && patientDetail.orderHistory.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>処方履歴</SectionLabel>
                {patientDetail.orderHistory.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-[3px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-300 font-mono">{o.date}</span>
                      <span className="text-[11px] text-gray-700">{o.product}</span>
                    </div>
                    {o.refund_status && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium">
                        {o.refund_status === "refunded" ? "返金済" : o.refund_status === "pending" ? "返金中" : o.refund_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 銀行振込待ち */}
            {patientDetail?.pendingBankTransfer && (
              <div className="px-4 py-2 border-b border-gray-100 bg-amber-50/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">振込待ち</span>
                  <span className="text-[11px] text-amber-800">{patientDetail.pendingBankTransfer.product}</span>
                  <span className="text-[10px] text-amber-500 ml-auto">{patientDetail.pendingBankTransfer.date}</span>
                </div>
              </div>
            )}

            {/* 再処方 */}
            {patientDetail && patientDetail.reorders.length > 0 && (
              <div className="px-4 py-3">
                <SectionLabel>再処方</SectionLabel>
                {patientDetail.reorders.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-[3px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-300 font-mono">{r.date}</span>
                      <span className="text-[11px] text-gray-700">{r.product}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      r.status === "承認済み" || r.status === "決済済み" ? "bg-emerald-50 text-emerald-600"
                        : r.status === "却下" || r.status === "キャンセル" ? "bg-red-50 text-red-500"
                          : "bg-blue-50 text-blue-600"
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 友達リストアイテム（メモ化のためコンポーネント分離）
function FriendItem({ f, isPinned, isSelected, onSelect, onTogglePin, getMarkColor, formatDateShort, canPin }: {
  f: Friend; isPinned: boolean; isSelected: boolean;
  onSelect: (f: Friend) => void; onTogglePin: (id: string) => void;
  getMarkColor: (mark: string) => string; formatDateShort: (s: string) => string;
  canPin: boolean;
}) {
  const markColor = getMarkColor(f.mark);
  return (
    <div
      onClick={() => onSelect(f)}
      className={`px-3 py-2.5 cursor-pointer transition-all hover:bg-gray-50/80 border-b border-gray-50 group ${
        isSelected ? "bg-[#00B900]/[0.04] border-l-[3px] border-l-[#00B900]" : "border-l-[3px] border-l-transparent"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
          {f.patient_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-medium text-gray-800 truncate">{f.patient_name}</span>
            {f.mark && f.mark !== "none" && (
              <span className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: markColor }} />
            )}
            {f.line_id ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B900] flex-shrink-0" />
            ) : null}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-[10px] text-gray-400 truncate flex-1">
              {f.last_message || "メッセージなし"}
            </p>
            {f.last_sent_at && (
              <span className="text-[9px] text-gray-300 flex-shrink-0">{formatDateShort(f.last_sent_at)}</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(f.patient_id); }}
          className={`flex-shrink-0 p-0.5 rounded transition-all ${
            isPinned ? "text-amber-400" : "text-gray-200 opacity-0 group-hover:opacity-100 hover:text-amber-300"
          }`}
        >
          <svg className="w-3 h-3" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
