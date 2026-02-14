"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ── 型定義 ──
interface PatientDetail {
  patient: { id: string; name: string; lstep_uid: string };
  latestOrder: {
    date: string; product: string; amount: string; payment: string;
    tracking: string; postal_code: string; address: string;
    phone: string; email: string; refund_status: string | null;
  } | null;
  orderHistory: { date: string; product: string; refund_status: string | null }[];
  reorders: { id: number; date: string; product: string; status: string }[];
  pendingBankTransfer: { product: string; date: string } | null;
  nextReservation: string | null;
  medicalInfo: {
    kana: string; gender: string; birthday: string;
    medicalHistory: string; glp1History: string;
    medicationHistory: string; allergies: string; prescriptionMenu: string;
  } | null;
}

interface MessageLog {
  id: number; content: string; status: string;
  message_type: string; sent_at: string;
}

interface PatientTag {
  tag_id: number;
  tag_definitions: { id: number; name: string; color: string };
}

interface TagDef { id: number; name: string; color: string; }

interface FieldValue {
  field_id: number; value: string;
  friend_field_definitions: { id: number; name: string };
}

interface FieldDef {
  id: number; name: string; field_type: string; options: string[] | null;
}

interface Template {
  id: number; name: string; content: string; message_type: string;
}

interface MarkDef {
  id: number;
  value: string;
  label: string;
  color: string;
}

const MARK_NONE: MarkDef = { id: 0, value: "none", label: "未対応", color: "#06B6D4" };

type UpperTab = "home" | "tags";
type LowerTab = "timeline" | "action" | "talk";
type TimelineFilter = "received" | "text" | "auto" | "sent" | "system";

const MSG_BATCH = 30;

export default function FriendDetailPage() {
  const params = useParams();
  const patientId = params.id as string;

  // データ
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [patientTags, setPatientTags] = useState<PatientTag[]>([]);
  const [patientMark, setPatientMark] = useState("none");
  const [patientFields, setPatientFields] = useState<FieldValue[]>([]);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [allFieldDefs, setAllFieldDefs] = useState<FieldDef[]>([]);
  const [allMarks, setAllMarks] = useState<MarkDef[]>([]);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // UI
  const [upperTab, setUpperTab] = useState<UpperTab>("home");
  const [lowerTab, setLowerTab] = useState<LowerTab>("timeline");
  const [showMarkDropdown, setShowMarkDropdown] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [savingMark, setSavingMark] = useState(false);
  const [memo, setMemo] = useState("");
  const [editingMemo, setEditingMemo] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);

  // タイムラインフィルター
  const [timelineFilters, setTimelineFilters] = useState<Set<TimelineFilter>>(
    new Set(["received", "text", "auto", "sent", "system"])
  );

  // 右カラム表示設定
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});

  // クイック返信
  const [quickMessage, setQuickMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const quickInputRef = useRef<HTMLTextAreaElement>(null);

  // ── データ取得 ──
  const fetchAll = useCallback(async () => {
    const [detailRes, tagsRes, markRes, fieldsRes, logRes, allTagsRes, fieldDefsRes, marksRes] = await Promise.all([
      fetch(`/api/admin/patient-lookup?q=${encodeURIComponent(patientId)}&type=id`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/tags`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/mark`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/fields`, { credentials: "include" }),
      fetch(`/api/admin/messages/log?patient_id=${encodeURIComponent(patientId)}&limit=${MSG_BATCH}`, { credentials: "include" }),
      fetch("/api/admin/tags", { credentials: "include" }),
      fetch("/api/admin/friend-fields", { credentials: "include" }),
      fetch("/api/admin/line/marks", { credentials: "include" }),
    ]);

    const [detailData, tagsData, markData, fieldsData, logData, allTagsData, fieldDefsData, marksData] = await Promise.all([
      detailRes.json(), tagsRes.json(), markRes.json(), fieldsRes.json(),
      logRes.json(), allTagsRes.json(), fieldDefsRes.json(), marksRes.json(),
    ]);

    if (detailData.found) setDetail(detailData);
    if (tagsData.tags) setPatientTags(tagsData.tags);
    if (markData.mark) {
      setPatientMark(markData.mark.mark || "none");
      setMemo(markData.mark.note || "");
    }
    if (fieldsData.fields) setPatientFields(fieldsData.fields);
    if (logData.messages) {
      setMessages(logData.messages);
      setHasMoreMessages(logData.messages.length === MSG_BATCH);
    }
    if (allTagsData.tags) setAllTags(allTagsData.tags);
    if (fieldDefsData.fields) setAllFieldDefs(fieldDefsData.fields);
    if (marksData.marks) setAllMarks(marksData.marks);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    fetchAll();
    // 右カラム表示設定を取得
    fetch("/api/admin/line/column-settings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.sections) setVisibleSections(d.sections); })
      .catch(() => {});
  }, [fetchAll]);

  // セクション表示判定（デフォルトON）
  const isSectionVisible = (key: string) => visibleSections[key] !== false;

  // ── 過去メッセージ読み込み ──
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    const res = await fetch(
      `/api/admin/messages/log?patient_id=${encodeURIComponent(patientId)}&limit=${MSG_BATCH}&offset=${messages.length}`,
      { credentials: "include" }
    );
    const data = await res.json();
    if (data.messages?.length > 0) {
      setMessages(prev => [...prev, ...data.messages]);
      setHasMoreMessages(data.messages.length === MSG_BATCH);
    } else {
      setHasMoreMessages(false);
    }
    setLoadingMore(false);
  };

  // ── 対応マーク更新 ──
  const handleMarkChange = async (newMark: string) => {
    if (savingMark) return;
    setSavingMark(true);
    setPatientMark(newMark);
    setShowMarkDropdown(false);
    await fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/mark`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mark: newMark, note: memo }),
    });
    setSavingMark(false);
  };

  // ── 個別メモ保存 ──
  const handleSaveMemo = async () => {
    setSavingMemo(true);
    await fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/mark`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mark: patientMark, note: memo }),
    });
    setSavingMemo(false);
    setEditingMemo(false);
  };

  // ── タグ操作 ──
  const handleAddTag = async (tagId: number) => {
    await fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ tag_id: tagId }),
    });
    const res = await fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/tags`, { credentials: "include" });
    const data = await res.json();
    if (data.tags) setPatientTags(data.tags);
    setShowTagPicker(false);
  };

  const handleRemoveTag = async (tagId: number) => {
    await fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/tags?tag_id=${tagId}`, {
      method: "DELETE", credentials: "include",
    });
    setPatientTags(prev => prev.filter(t => t.tag_id !== tagId));
  };

  // ── クイック返信 ──
  const handleQuickSend = async () => {
    if (!quickMessage.trim() || sending) return;
    setSending(true);
    const res = await fetch("/api/admin/line/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ patient_id: patientId, message: quickMessage }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessages(prev => [{
        id: Date.now(), content: quickMessage, status: "sent",
        message_type: "individual", sent_at: new Date().toISOString(),
      }, ...prev]);
      setQuickMessage("");
    } else {
      alert(data.error || "送信に失敗しました");
    }
    setSending(false);
  };

  // ── テンプレート送信 ──
  const openTemplatePicker = async () => {
    setShowTemplatePicker(true);
    setTemplateSearch("");
    if (templates.length === 0) {
      const res = await fetch("/api/admin/line/templates", { credentials: "include" });
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    }
  };

  const sendTemplate = async (tpl: Template) => {
    if (sending) return;
    setShowTemplatePicker(false);
    setSending(true);
    const res = await fetch("/api/admin/line/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ patient_id: patientId, message: tpl.content }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessages(prev => [{
        id: Date.now(), content: tpl.content, status: "sent",
        message_type: "individual", sent_at: new Date().toISOString(),
      }, ...prev]);
    }
    setSending(false);
  };

  // ── ユーティリティ ──
  const currentMark = allMarks.find(m => m.value === patientMark) || MARK_NONE;
  const assignedTagIds = patientTags.map(t => t.tag_id);
  const availableTags = allTags.filter(t => !assignedTagIds.includes(t.id));

  const calcAge = (birthday: string) => {
    try {
      const bd = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - bd.getFullYear();
      if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
      return age;
    } catch { return null; }
  };

  const formatDateTime = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  const getMessageTypeBadge = (msg: MessageLog) => {
    if (msg.message_type === "scenario" || msg.content.startsWith("[シナリオ")) return { label: "シナリオ", bg: "bg-green-100", text: "text-green-700" };
    if (msg.message_type === "auto" || msg.content.includes("自動応答")) return { label: "自動", bg: "bg-green-100", text: "text-green-700" };
    if (msg.message_type === "broadcast") return { label: "一斉", bg: "bg-blue-100", text: "text-blue-700" };
    return null;
  };

  const toggleTimelineFilter = (f: TimelineFilter) => {
    setTimelineFilters(prev => {
      const next = new Set(prev);
      if (next.has(f)) { if (next.size > 1) next.delete(f); }
      else next.add(f);
      return next;
    });
  };

  const SectionLabel = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{children}</span>
        <div className="flex-1 h-px bg-gray-100 min-w-[20px]" />
      </div>
      {action}
    </div>
  );

  const InfoRow = ({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs text-gray-800 ${mono ? "font-mono" : ""}`}>{children}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50/50">
        <div className="text-center">
          <p className="text-gray-500 text-sm">患者が見つかりませんでした</p>
          <Link href="/admin/line/talk" className="text-sm text-[#06C755] hover:underline mt-2 inline-block">個別トークに戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ===== ヘッダー ===== */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0">
              {detail.patient.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {detail.patient.name}
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{detail.patient.id}</p>
              <div className="flex items-center gap-2 mt-1">
                {detail.patient.lstep_uid ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#06C755] bg-[#06C755]/5 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06C755]" />LINE連携済み
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />未連携
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/admin/line/talk`}
                className="px-4 py-2 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-medium hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                個別トーク
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== メインコンテンツ ===== */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* 上部タブ */}
        <div className="flex border-b border-gray-200 mb-6">
          {([
            { key: "home" as UpperTab, label: "ホーム" },
            { key: "tags" as UpperTab, label: "タグ" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setUpperTab(tab.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                upperTab === tab.key ? "text-[#06C755]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
              {upperTab === tab.key && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#06C755] rounded-full" />}
            </button>
          ))}
        </div>

        {/* ===== ホームタブ ===== */}
        {upperTab === "home" && (
          <div className="grid grid-cols-[1fr_1fr] gap-6">
            {/* 左列 */}
            <div className="space-y-5">
              {/* 基本 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">基本</h3>

                {/* 対応マーク */}
                {isSectionVisible("mark") && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500">対応マーク</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowMarkDropdown(!showMarkDropdown)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        currentMark.value === "none"
                          ? "bg-gray-100 text-gray-500"
                          : "text-white shadow-sm"
                      }`}
                      style={currentMark.value !== "none" ? { backgroundColor: currentMark.color } : undefined}
                    >
                      {currentMark.label}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showMarkDropdown && (
                      <div className="absolute z-20 top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-36">
                        {allMarks.map(m => (
                          <button
                            key={m.value}
                            onClick={() => handleMarkChange(m.value)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-xs ${patientMark === m.value ? "bg-gray-50 font-semibold" : "text-gray-600"}`}
                          >
                            {m.value !== "none" ? (
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                            ) : (
                              <span className="w-3 h-3 rounded-full border-2 border-gray-200" />
                            )}
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* 個人情報 */}
                {isSectionVisible("personal") && detail.medicalInfo && (
                  <>
                    {detail.medicalInfo.kana && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-500">本名（カナ）</span>
                        <span className="text-xs text-gray-800">{detail.medicalInfo.kana}</span>
                      </div>
                    )}
                    {detail.medicalInfo.gender && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-500">性別</span>
                        <span className="text-xs text-gray-800">{detail.medicalInfo.gender}</span>
                      </div>
                    )}
                    {detail.medicalInfo.birthday && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-500">生年月日</span>
                        <span className="text-xs text-gray-800">
                          {detail.medicalInfo.birthday}
                          {(() => { const a = calcAge(detail.medicalInfo.birthday); return a !== null ? `（${a}歳）` : ""; })()}
                        </span>
                      </div>
                    )}
                    {detail.medicalInfo.prescriptionMenu && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-500">処方メニュー</span>
                        <span className="text-xs text-gray-800">{detail.medicalInfo.prescriptionMenu}</span>
                      </div>
                    )}
                  </>
                )}

                {/* 個別メモ */}
                <div className="py-2 border-b border-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">個別メモ</span>
                    <button
                      onClick={() => { if (editingMemo) handleSaveMemo(); else setEditingMemo(true); }}
                      className="text-[10px] text-[#06C755] hover:text-[#05a648] font-medium"
                    >
                      {editingMemo ? (savingMemo ? "保存中..." : "保存") : "編集"}
                    </button>
                  </div>
                  {editingMemo ? (
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-none"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 min-h-[32px]">
                      {memo || <span className="text-gray-300">未登録</span>}
                    </p>
                  )}
                </div>

                {/* 次回予約 */}
                {isSectionVisible("reservation") && detail.nextReservation && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-500">次回予約</span>
                    <span className="text-xs text-blue-600 font-medium">{detail.nextReservation}</span>
                  </div>
                )}
              </div>

              {/* 問診内容 */}
              {isSectionVisible("medical") && detail.medicalInfo && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">問診内容</h3>
                  <div className="space-y-3">
                    {[
                      { label: "既往歴", value: detail.medicalInfo.medicalHistory },
                      { label: "GLP-1 使用歴", value: detail.medicalInfo.glp1History },
                      { label: "内服歴", value: detail.medicalInfo.medicationHistory },
                      { label: "アレルギー", value: detail.medicalInfo.allergies },
                    ].map(item => (
                      <div key={item.label}>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.label}</span>
                        <p className="text-xs text-gray-700 mt-1 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                          {item.value || "特記事項なし"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 右列 */}
            <div className="space-y-5">
              {/* 決済情報 */}
              {isSectionVisible("latestOrder") && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">決済情報</h3>
                {detail.latestOrder ? (
                  <div>
                    <InfoRow label="メニュー">{detail.latestOrder.product}</InfoRow>
                    <InfoRow label="金額">{detail.latestOrder.amount}</InfoRow>
                    <InfoRow label="決済方法">{detail.latestOrder.payment}</InfoRow>
                    <InfoRow label="日時">{detail.latestOrder.date}</InfoRow>
                    {detail.latestOrder.refund_status && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-400">返金</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">{detail.latestOrder.refund_status}</span>
                      </div>
                    )}
                    <InfoRow label="追跡番号" mono>{detail.latestOrder.tracking && detail.latestOrder.tracking !== "-" ? (
                      <a href={`https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${detail.latestOrder.tracking.replace(/-/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{detail.latestOrder.tracking}</a>
                    ) : "—"}</InfoRow>
                    {detail.latestOrder.phone && <InfoRow label="電話" mono>{detail.latestOrder.phone}</InfoRow>}
                    {detail.latestOrder.email && (
                      <div className="flex items-start justify-between py-1 gap-2">
                        <span className="text-xs text-gray-400 flex-shrink-0">メール</span>
                        <span className="text-xs text-gray-800 break-all text-right">{detail.latestOrder.email}</span>
                      </div>
                    )}
                    {detail.latestOrder.address && (
                      <div className="flex items-start justify-between py-1 gap-2">
                        <span className="text-xs text-gray-400 flex-shrink-0">住所</span>
                        <span className="text-xs text-gray-800 text-right leading-relaxed">
                          {detail.latestOrder.postal_code && <span className="text-gray-400 text-[10px]">{detail.latestOrder.postal_code}<br /></span>}
                          {detail.latestOrder.address}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300">決済情報なし</p>
                )}

                {/* 銀行振込待ち */}
                {isSectionVisible("bankTransfer") && detail.pendingBankTransfer && (
                  <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-bold">振込待ち</span>
                      <span className="text-xs text-amber-800">{detail.pendingBankTransfer.product}</span>
                      <span className="text-[10px] text-amber-500 ml-auto">{detail.pendingBankTransfer.date}</span>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 処方歴 */}
              {isSectionVisible("orderHistory") && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">処方歴</h3>
                {detail.orderHistory.length > 0 ? (
                  <div className="space-y-1">
                    {detail.orderHistory.map((o, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-mono">{o.date}</span>
                          <span className="text-xs text-gray-700">{o.product}</span>
                        </div>
                        {o.refund_status && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium">
                            {o.refund_status === "refunded" ? "返金済" : o.refund_status === "pending" ? "返金中" : o.refund_status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300">処方歴なし</p>
                )}

                {/* 再処方 */}
                {isSectionVisible("reorders") && detail.reorders.length > 0 && (
                  <div className="mt-4">
                    <SectionLabel>再処方</SectionLabel>
                    {detail.reorders.map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-mono">{r.date}</span>
                          <span className="text-xs text-gray-700">{r.product}</span>
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
              )}

              {/* 友だち情報 */}
              {isSectionVisible("friendFields") && allFieldDefs.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">友だち情報</h3>
                  {allFieldDefs.map(fd => {
                    const val = patientFields.find(pf => pf.field_id === fd.id);
                    return <InfoRow key={fd.id} label={fd.name}>{val?.value || <span className="text-gray-200">—</span>}</InfoRow>;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== タグタブ ===== */}
        {upperTab === "tags" && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">付きタグ</h3>
                <button
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-lg text-xs font-medium hover:from-[#05b34d] hover:to-[#049a42] shadow-sm transition-all flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  タグを追加
                </button>
              </div>

              {/* タグ追加ピッカー */}
              {showTagPicker && (
                <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {availableTags.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400">追加できるタグはありません</div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                      {availableTags.map(t => (
                        <button key={t.id} onClick={() => handleAddTag(t.id)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-sm text-gray-700">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 付きタグ一覧 */}
              {patientTags.length === 0 ? (
                <p className="text-xs text-gray-300">タグがついていません</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {patientTags.map(t => (
                    <span key={t.tag_id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white font-medium group" style={{ backgroundColor: t.tag_definitions.color }}>
                      {t.tag_definitions.name}
                      <button onClick={() => handleRemoveTag(t.tag_id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-white/20 rounded-full p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== クイック返信 ===== */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="grid grid-cols-2 gap-6">
              {/* クイック返信 */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2">クイック返信</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickSend}
                    disabled={sending || !quickMessage.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-lg text-xs font-medium disabled:opacity-40 shadow-sm transition-all flex-shrink-0"
                  >
                    個別返信
                  </button>
                  <input
                    type="text"
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="テキストを入力"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleQuickSend(); }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 transition-colors">
                    拡大して入力
                  </button>
                  <button
                    onClick={handleQuickSend}
                    disabled={sending || !quickMessage.trim()}
                    className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 transition-colors disabled:opacity-40"
                  >
                    送信
                  </button>
                </div>
              </div>

              {/* テンプレート送信 */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2">テンプレート送信</h4>
                <div className="flex gap-2">
                  <button
                    onClick={openTemplatePicker}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 text-left hover:bg-gray-50 transition-colors"
                  >
                    テンプレート名を入力
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={openTemplatePicker}
                    className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 transition-colors"
                  >
                    コピーして編集
                  </button>
                  <button
                    onClick={openTemplatePicker}
                    className="text-[10px] text-[#06C755] hover:text-[#05a648] border border-[#06C755] rounded px-2 py-1 transition-colors font-medium"
                  >
                    送信
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 下部タブ */}
          <div className="flex border-b border-gray-200 mb-0">
            {([
              { key: "timeline" as LowerTab, label: "タイムライン" },
              { key: "action" as LowerTab, label: "アクション" },
              { key: "talk" as LowerTab, label: "個別トーク" },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setLowerTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                  lowerTab === tab.key ? "text-[#06C755]" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
                {lowerTab === tab.key && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#06C755] rounded-full" />}
              </button>
            ))}
          </div>

          {/* ===== タイムライン ===== */}
          {lowerTab === "timeline" && (
            <div className="bg-white rounded-b-2xl border border-t-0 border-gray-100 shadow-sm">
              {/* フィルター */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {([
                    { key: "sent" as TimelineFilter, label: "送信" },
                    { key: "auto" as TimelineFilter, label: "自動応答" },
                    { key: "system" as TimelineFilter, label: "システム通知" },
                  ]).map(f => (
                    <label key={f.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={timelineFilters.has(f.key)}
                        onChange={() => toggleTimelineFilter(f.key)}
                        className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500/30"
                      />
                      <span className="text-xs text-gray-600">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* メッセージ一覧 */}
              <div className="divide-y divide-gray-50">
                {/* テーブルヘッダー */}
                <div className="grid grid-cols-[1fr_180px] gap-4 px-5 py-2.5 bg-gray-50/50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  <div>最新のメッセージ</div>
                  <div className="text-right">送信日時</div>
                </div>

                {messages.length === 0 ? (
                  <div className="px-5 py-12 text-center text-xs text-gray-300">メッセージ履歴がありません</div>
                ) : (
                  messages.map(msg => {
                    const badge = getMessageTypeBadge(msg);
                    return (
                      <div key={msg.id} className="grid grid-cols-[1fr_180px] gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors items-start">
                        <div>
                          {badge && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold mr-2 ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          )}
                          <span className="text-xs text-gray-700 leading-relaxed">
                            {msg.content.length > 120 ? msg.content.substring(0, 120) + "..." : msg.content}
                          </span>
                          {msg.status === "failed" && (
                            <span className="ml-2 text-[9px] text-red-400 font-medium">送信失敗</span>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-gray-400 font-mono">
                          {formatDateTime(msg.sent_at)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* さらに過去 */}
              {hasMoreMessages && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <button
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                    className="text-xs text-[#06C755] hover:text-[#05a648] font-medium flex items-center gap-1 transition-colors"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
                        読み込み中...
                      </span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        さらに過去
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===== アクション ===== */}
          {lowerTab === "action" && (
            <div className="bg-white rounded-b-2xl border border-t-0 border-gray-100 shadow-sm p-8">
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">アクション履歴はまだありません</p>
              </div>
            </div>
          )}

          {/* ===== 個別トーク ===== */}
          {lowerTab === "talk" && (
            <div className="bg-white rounded-b-2xl border border-t-0 border-gray-100 shadow-sm">
              {/* 直近のメッセージ */}
              <div className="p-5">
                <h4 className="text-xs font-bold text-gray-500 mb-3">直近のメッセージ</h4>
                {messages.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-6">メッセージなし</p>
                ) : (
                  <div className="space-y-2">
                    {messages.slice(0, 10).map(msg => (
                      <div key={msg.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-relaxed truncate">
                            {msg.content}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                          {formatDateTime(msg.sent_at).substring(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== テンプレート選択モーダル ===== */}
      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTemplatePicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: "70vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-sm">テンプレート送信</h2>
              <button onClick={() => setShowTemplatePicker(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="テンプレートを検索"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-50">
              {templates.filter(t => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.content.toLowerCase().includes(templateSearch.toLowerCase())).map(t => (
                <button
                  key={t.id}
                  onClick={() => sendTemplate(t)}
                  disabled={sending}
                  className="w-full text-left px-5 py-3 hover:bg-green-50/50 transition-colors group disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-gray-800 group-hover:text-[#06C755]">{t.name}</span>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{t.content}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
