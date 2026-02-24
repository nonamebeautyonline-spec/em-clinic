"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import { formatFullDateTimeJST, calcAge, formatDateJST } from "@/lib/patient-utils";
import type { SoapNote, NoteFormat } from "@/lib/soap-parser";
import { emptySoapNote, noteToSoap, soapToNote, soapToText, parseJsonToSoap, SOAP_LABELS } from "@/lib/soap-parser";
import { KarteNoteEditor } from "@/components/karte/KarteNoteEditor";

const KarteImageSection = lazy(() => import("@/components/KarteImageSection"));

// === 型定義 ===
type Candidate = {
  patientId: string;
  name: string;
  phone: string;
  sex: string;
  birth: string;
  lastSubmittedAt: string;
  intakeCount: number;
};

type Patient = {
  id: string;
  name: string;
  kana: string;
  phone: string;
  sex: string;
  birth: string;
  lineId: string | null;
};

type IntakeItem = {
  id: number;
  submittedAt: string;
  reservedDate: string;
  reservedTime: string;
  status: string | null;
  prescriptionMenu: string;
  note: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answers: Record<string, any>;
  locked_at?: string | null;
  locked_by?: string | null;
};

type HistoryItem = {
  id: string;
  paidAt: string;
  productName: string;
  productCode: string;
  amount: number;
  paymentMethod: string;
  trackingNumber: string;
  shippingDate: string;
  refundStatus: string | null;
};

type ReorderItem = {
  id: number;
  productName: string;
  productCode: string;
  status: string;
  rawStatus: string;
  note: string;
  createdAt: string;
  approvedAt: string | null;
};

type KarteTemplate = {
  id: string | number;
  name: string;
  category: string;
  body: string;
  sort_order: number;
};

type ReservationItem = {
  id: string | number;
  reserve_id: string;
  patient_id: string;
  patient_name: string;
  patient_kana?: string;
  patient_sex?: string;
  patient_birthday?: string;
  reserved_date: string;
  reserved_time: string;
  status: string;
  phone?: string;
  prescription_menu: string;
  call_status?: string;
  intake_status?: string | null;
  note?: string;
  created_at?: string;
};

/** 診察ステータスを判定（intake_status が OK/NG なら call_status より優先） */
function getExamStatus(item: ReservationItem): { label: string; color: string } {
  // Dr が診察済（OK/NG）にした場合は最優先
  if (item.intake_status === "OK") {
    return { label: "診察済", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (item.intake_status === "NG") {
    return { label: "NG", color: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  // 診察前で不通の場合のみ不通表示
  if (item.call_status === "不通" || item.call_status === "no_answer" || item.call_status === "no_answer_sent" || item.call_status === "unreachable") {
    return { label: "不通", color: "bg-gray-100 text-gray-600 border-gray-300" };
  }
  return { label: "診察前", color: "bg-amber-50 text-amber-700 border-amber-200" };
}

type ViewMode = "today" | "new" | "search";

// === ユーティリティ ===
function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function fmtBirth(s: string | null): string {
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return s;
  }
}

function formatTel(tel: string) {
  if (!tel) return "-";
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return tel;
}

const SEARCH_MODES = [
  { key: "name", label: "氏名", placeholder: "氏名で検索（例：山田）" },
  { key: "pid", label: "PID", placeholder: "患者IDで検索（例：2026010）" },
] as const;

// === メインコンポーネント ===
export default function KartePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("today");

  // --- 本日の予約モード ---
  const [todayItems, setTodayItems] = useState<ReservationItem[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

  // --- 新規予約モード ---
  const [newItems, setNewItems] = useState<ReservationItem[]>([]);
  const [newLoading, setNewLoading] = useState(true);

  // --- 検索モード ---
  const [searchMode, setSearchMode] = useState<string>("name");
  const [searchQ, setSearchQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchErr, setSearchErr] = useState("");

  // --- 患者詳細（共通） ---
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [intakes, setIntakes] = useState<IntakeItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reorders, setReorders] = useState<ReorderItem[]>([]);
  const [activeTab, setActiveTab] = useState<"intake" | "history" | "reorder">("intake");
  const [expandedIntake, setExpandedIntake] = useState<number | null>(null);

  // --- カルテ編集 ---
  const [editingIntakeId, setEditingIntakeId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // SOAP構造化入力
  const [editSoap, setEditSoap] = useState<SoapNote>(emptySoapNote());
  const [editNoteFormat, setEditNoteFormat] = useState<NoteFormat>("plain");

  /** noteの内容からSOAP/plainを自動判定 */
  const detectNoteFormat = (note: string | null | undefined): NoteFormat => {
    if (!note) return "plain";
    try {
      const parsed = JSON.parse(note);
      if (parsed && typeof parsed === "object" && ("s" in parsed || "o" in parsed || "a" in parsed || "p" in parsed)) {
        return "soap";
      }
    } catch { /* plainテキスト */ }
    return "plain";
  };

  // --- テンプレート ---
  const [templates, setTemplates] = useState<KarteTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // --- LINE通話フォーム ---
  const [callFormSending, setCallFormSending] = useState(false);
  const [callFormSentPatients, setCallFormSentPatients] = useState<Set<string>>(new Set());
  const [lineCallEnabled, setLineCallEnabled] = useState(true);

  // === 本日の予約データ取得（reservations APIから直接） ===
  const fetchTodayData = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations?date=${getTodayJST()}`);
      const json = await res.json();
      setTodayItems(json.reservations || []);
    } catch (e) {
      console.error("本日予約取得エラー:", e);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "today") {
      fetchTodayData();
    }
  }, [viewMode, fetchTodayData]);

  // 診察モード取得（LINE通話フォームボタン表示制御）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings?category=consultation", { credentials: "include" });
        const data = await res.json();
        const t = data.settings?.type || "online_all";
        setLineCallEnabled(t !== "online_phone" && t !== "in_person");
      } catch {}
    })();
  }, []);

  // === 新規予約データ取得（本日作成された予約） ===
  const fetchNewData = useCallback(async () => {
    setNewLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations?created_date=${getTodayJST()}`);
      const json = await res.json();
      setNewItems(json.reservations || []);
    } catch (e) {
      console.error("新規予約取得エラー:", e);
    } finally {
      setNewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "new") {
      fetchNewData();
    }
  }, [viewMode, fetchNewData]);

  // === 検索モード ===
  const canSearch = useMemo(() => searchQ.trim().length >= 1, [searchQ]);

  useEffect(() => {
    if (viewMode !== "search") return;
    if (!canSearch) { setCandidates([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      setSearchErr("");
      try {
        const res = await fetch(`/api/admin/kartesearch?q=${encodeURIComponent(searchQ.trim())}&type=${searchMode}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "検索失敗");
        setCandidates(data.candidates || []);
      } catch (e: unknown) {
        setCandidates([]);
        setSearchErr(e instanceof Error ? e.message : String(e));
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, canSearch, searchMode, viewMode]);

  // === 患者バンドル取得 ===
  const loadBundle = useCallback(async (patientId: string) => {
    setSelectedPatientId(patientId);
    setBundleLoading(true);
    setSearchErr("");
    setPatient(null);
    setIntakes([]);
    setHistory([]);
    setReorders([]);
    setActiveTab("intake");
    setExpandedIntake(null);
    setEditingIntakeId(null);

    try {
      const res = await fetch(`/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "取得失敗");
      setPatient(data.patient ?? null);
      setIntakes(data.intakes ?? []);
      setHistory(data.history ?? []);
      setReorders(data.reorders ?? []);
    } catch (e: unknown) {
      setSearchErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBundleLoading(false);
    }
  }, []);

  // === テンプレート取得 ===
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/karte-templates");
        const data = await res.json();
        if (data.ok) setTemplates(data.templates || []);
      } catch {
        // フォールバックのデフォルトテンプレートはAPI側で返される
      }
    })();
  }, []);

  // === カルテ編集 ===
  const startEdit = (intake: IntakeItem) => {
    setEditingIntakeId(intake.id);
    const fmt = detectNoteFormat(intake.note);
    setEditNoteFormat(fmt);
    setEditSoap(noteToSoap(intake.note, fmt));
  };

  const cancelEdit = () => {
    setEditingIntakeId(null);
    setEditSoap(emptySoapNote());
    setEditNoteFormat("plain");
    setShowTemplates(false);
  };

  const saveNote = async () => {
    if (!editingIntakeId) return;
    setEditSaving(true);
    const noteToSave = soapToNote(editSoap, editNoteFormat);
    try {
      const res = await fetch("/api/admin/karte-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeId: editingIntakeId,
          note: noteToSave,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "保存失敗");
      // ローカル更新
      setIntakes(prev => prev.map(it =>
        it.id === editingIntakeId ? { ...it, note: noteToSave } : it
      ));
      setEditingIntakeId(null);
      setEditSoap(emptySoapNote());
      setEditNoteFormat("plain");
      setShowTemplates(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setEditSaving(false);
    }
  };

  const insertTemplate = (tmpl: KarteTemplate) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    const text = tmpl.body.replace(/\{\{date\}\}/g, dateStr);
    // テンプレートはSOAPのS（フリーモード時もS）に追記
    const current = editSoap.s || "";
    const trimmed = current.trimEnd();
    setEditSoap({ ...editSoap, s: trimmed ? `${trimmed}\n${text}` : text });
    setShowTemplates(false);
  };

  // === ロック操作 ===
  const toggleLock = async (intakeId: number, currentlyLocked: boolean) => {
    const action = currentlyLocked ? "unlock" : "lock";
    const confirmMsg = currentlyLocked ? "ロックを解除しますか？" : "このカルテをロックしますか？ロック後は編集できなくなります。";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/karte-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId, action }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "操作失敗");
      // ローカル更新
      setIntakes(prev => prev.map(it =>
        it.id === intakeId
          ? { ...it, locked_at: data.locked ? new Date().toISOString() : null, locked_by: data.locked ? "admin" : null }
          : it
      ));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "操作に失敗しました");
    }
  };

  // === 詳細を閉じる ===
  const closeDetail = () => {
    setSelectedPatientId(null);
    setPatient(null);
    setIntakes([]);
    setHistory([]);
    setReorders([]);
    setEditingIntakeId(null);
    setShowTemplates(false);
  };


  // === LINE通話フォーム送信 ===
  const handleSendCallFormKarte = async () => {
    if (!patient || callFormSending) return;
    if (!confirm(`${patient.name} さんにLINE通話フォームを送信しますか？`)) return;
    setCallFormSending(true);
    try {
      const res = await fetch("/api/doctor/send-call-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientId: patient.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "送信に失敗しました");
        return;
      }
      setCallFormSentPatients((prev) => new Set(prev).add(patient.id));
      alert("通話フォームを送信しました");
    } catch {
      alert("送信に失敗しました");
    } finally {
      setCallFormSending(false);
    }
  };

  const currentSearchMode = SEARCH_MODES.find(m => m.key === searchMode) || SEARCH_MODES[0];

  // テンプレートをカテゴリ別にグルーピング
  const templatesByCategory = useMemo(() => {
    const map: Record<string, KarteTemplate[]> = {};
    for (const t of templates) {
      const cat = t.category || "general";
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    }
    return map;
  }, [templates]);

  const categoryLabels: Record<string, string> = {
    general: "一般",
    glp1: "GLP-1",
    measurement: "計測",
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-5 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">カルテ</h1>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => { setViewMode("today"); closeDetail(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "today" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                本日の予約
              </button>
              <button
                onClick={() => { setViewMode("new"); closeDetail(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                新規予約
              </button>
              <button
                onClick={() => { setViewMode("search"); closeDetail(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                検索
              </button>
            </div>
          </div>

          {/* 本日の予約モード: 日付表示 */}
          {viewMode === "today" && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-gray-600">{getTodayJST()} の予約患者</span>
              <span className="text-xs text-gray-400">({todayItems.length}件)</span>
              <button
                onClick={() => fetchTodayData()}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                更新
              </button>
            </div>
          )}

          {/* 新規予約モード: 日付表示 */}
          {viewMode === "new" && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-gray-600">{getTodayJST()} に入った予約</span>
              <span className="text-xs text-gray-400">({newItems.length}件)</span>
              <button
                onClick={() => fetchNewData()}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                更新
              </button>
            </div>
          )}

          {/* 検索モード: モード切替 + 検索入力 */}
          {viewMode === "search" && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                {SEARCH_MODES.map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setSearchMode(m.key); setSearchQ(""); setCandidates([]); closeDetail(); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      searchMode === m.key
                        ? "bg-red-600 text-white"
                        : "bg-white text-gray-500 border border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-xl">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder={currentSearchMode.placeholder}
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                  />
                </div>
                <button
                  onClick={() => { setSearchQ(""); setCandidates([]); closeDetail(); }}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  クリア
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{searchLoading ? "検索中..." : `候補: ${candidates.length}件`}</span>
                {searchErr && <span className="text-rose-500">{searchErr}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-5 space-y-5">
        {/* === 本日の予約モード: テーブル === */}
        {viewMode === "today" && !selectedPatientId && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">予約時間</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">氏名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">性別</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">生年月日</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">処方メニュー</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">ステータス</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">メモ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todayLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          読み込み中...
                        </div>
                      </td>
                    </tr>
                  ) : todayItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        本日の予約はありません
                      </td>
                    </tr>
                  ) : (
                    todayItems.map((item) => {
                      const examStatus = getExamStatus(item);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => loadBundle(item.patient_id)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap text-xs">
                            {item.reserved_time || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                            {item.patient_name || "-"}
                            {item.patient_kana && (
                              <span className="text-xs text-gray-400 ml-1">（{item.patient_kana}）</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                            {item.patient_sex || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                            {item.patient_birthday ? fmtBirth(item.patient_birthday) : "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                            {item.prescription_menu || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${examStatus.color}`}>
                              {examStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.note ? (
                              <span className="text-xs text-amber-600">あり</span>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === 新規予約モード: テーブル === */}
        {viewMode === "new" && !selectedPatientId && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">氏名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">性別</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">予約日</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">予約時間</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">処方メニュー</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        予約取得日時
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {newLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          読み込み中...
                        </div>
                      </td>
                    </tr>
                  ) : newItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        本日入った予約はありません
                      </td>
                    </tr>
                  ) : (
                    newItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => loadBundle(item.patient_id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                          {item.patient_name || "-"}
                          {item.patient_kana && (
                            <span className="text-xs text-gray-400 ml-1">（{item.patient_kana}）</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {item.patient_sex || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {item.reserved_date || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {item.reserved_time || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {item.prescription_menu || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {item.created_at ? formatFullDateTimeJST(item.created_at) : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === 検索モード: 候補一覧 === */}
        {viewMode === "search" && candidates.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">検索結果</span>
            </div>
            <div className="divide-y divide-gray-100">
              {candidates.map((c) => {
                const isActive = selectedPatientId === c.patientId;
                const age = calcAge(c.birth);
                return (
                  <div
                    key={c.patientId}
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-red-50 border-l-[3px] border-l-red-600"
                        : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                    }`}
                    onClick={() => loadBundle(c.patientId)}
                  >
                    <span className={`font-semibold text-sm min-w-[6rem] ${isActive ? "text-red-700" : "text-gray-800"}`}>
                      {c.name}
                    </span>
                    {c.sex ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium min-w-[3rem] text-center border ${
                        c.sex === "男性" || c.sex === "male"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-pink-50 text-pink-700 border-pink-200"
                      }`}>{c.sex}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-300 text-[11px] min-w-[3rem] text-center">-</span>
                    )}
                    <span className="text-xs text-gray-500 min-w-[10rem]">
                      {fmtBirth(c.birth)}
                      {age !== null && <span className="ml-1 text-gray-400">({age}歳)</span>}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{c.patientId}</span>
                    <span className="ml-auto flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-400">問診{c.intakeCount}件</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === 患者詳細パネル（一覧・検索共通） === */}
        {selectedPatientId && (
          <div>
            {/* 戻るボタン */}
            <button
              onClick={closeDetail}
              className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {viewMode === "search" ? "検索結果に戻る" : viewMode === "new" ? "新規予約に戻る" : "本日の予約に戻る"}
            </button>

            <div className="flex flex-col lg:flex-row gap-5">
              {/* 左: 患者サマリ + 画像 */}
              <div className="lg:w-72 flex-shrink-0">
                <div className="bg-white rounded-lg border border-gray-200 sticky top-4">
                  {bundleLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  ) : patient ? (
                    <>
                      <div className="bg-red-600 px-5 py-4 rounded-t-lg">
                        <h2 className="text-lg font-bold text-white">{patient.name}</h2>
                        {patient.kana && <p className="text-xs text-red-200 mt-0.5">{patient.kana}</p>}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {patient.sex && (
                            <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[11px] font-medium">{patient.sex}</span>
                          )}
                          {calcAge(patient.birth) !== null && (
                            <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[11px] font-medium">{calcAge(patient.birth)}歳</span>
                          )}
                          {patient.lineId && (
                            <span className="px-2 py-0.5 rounded bg-green-400/30 text-green-100 text-[11px] font-medium">LINE連携</span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-10 text-xs">PID</span>
                            <span className="font-mono text-gray-700">{patient.id}</span>
                          </div>
                          {patient.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-10 text-xs">TEL</span>
                              <span className="text-gray-700">{formatTel(patient.phone)}</span>
                            </div>
                          )}
                          {patient.birth && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-10 text-xs">生年</span>
                              <span className="text-gray-700">{fmtBirth(patient.birth)}</span>
                            </div>
                          )}
                        </div>
                        {/* LINE通話フォーム送信 */}
                        {lineCallEnabled && patient.lineId && (
                          <button
                            type="button"
                            disabled={callFormSending || callFormSentPatients.has(patient.id)}
                            onClick={handleSendCallFormKarte}
                            className={`block w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              callFormSentPatients.has(patient.id)
                                ? "bg-gray-300 text-white cursor-default"
                                : "bg-teal-500 text-white hover:bg-teal-600"
                            }`}
                          >
                            {callFormSending ? "送信中..." : callFormSentPatients.has(patient.id) ? "通話フォーム送信済み" : "LINE通話フォーム送信"}
                          </button>
                        )}
                        <Link
                          href={`/admin/patients/${encodeURIComponent(patient.id)}`}
                          className="block w-full text-center px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          患者詳細
                        </Link>
                        {/* 経過写真 */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <Suspense fallback={<div className="text-[10px] text-gray-400 py-2">画像読み込み中...</div>}>
                            <KarteImageSection patientId={patient.id} />
                          </Suspense>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">データなし</p>
                  )}
                </div>
              </div>

              {/* 右: タブコンテンツ */}
              <div className="flex-1 min-w-0">
                {/* タブ */}
                <div className="flex items-center gap-0 border-b border-gray-200 bg-white rounded-t-lg">
                  {[
                    { key: "intake" as const, label: "問診・カルテ", count: intakes.length },
                    { key: "history" as const, label: "購入履歴", count: history.length },
                    { key: "reorder" as const, label: "再処方", count: reorders.length },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveTab(tab.key); setEditingIntakeId(null); setShowTemplates(false); }}
                      className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? "border-red-600 text-red-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                        activeTab === tab.key ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                      }`}>{tab.count}</span>
                    </button>
                  ))}
                </div>

                {bundleLoading ? (
                  <div className="bg-white rounded-b-lg border-x border-b border-gray-200 p-8 flex items-center justify-center">
                    <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : (
                  <div className="bg-white rounded-b-lg border-x border-b border-gray-200">
                    {/* 問診・カルテタブ */}
                    {activeTab === "intake" && (
                      <div className="divide-y divide-gray-100">
                        {intakes.length === 0 ? (
                          <div className="p-8 text-center text-sm text-gray-400">問診データなし</div>
                        ) : intakes.map((it) => {
                          const isOpen = expandedIntake === it.id;
                          const answers = it.answers || {};
                          const isEditing = editingIntakeId === it.id;
                          const isLocked = !!it.locked_at;
                          const statusLabel = it.status === "OK" ? "OK" : it.status === "NG" ? "NG" : "未診察";
                          const statusColor = it.status === "OK"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : it.status === "NG"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-gray-100 text-gray-500 border border-gray-200";

                          return (
                            <div key={it.id}>
                              <button
                                onClick={() => setExpandedIntake(isOpen ? null : it.id)}
                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-800">{formatDateJST(it.submittedAt)}</span>
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
                                  {it.prescriptionMenu && (
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 text-[11px] font-medium">{it.prescriptionMenu}</span>
                                  )}
                                  {it.note && (
                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">メモあり</span>
                                  )}
                                  {isLocked && (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">ロック中</span>
                                  )}
                                </div>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {isOpen && (
                                <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
                                  {(it.reservedDate || it.reservedTime) && (
                                    <div className="text-xs text-gray-400">
                                      予約: {it.reservedDate} {it.reservedTime}
                                    </div>
                                  )}

                                  <div className="grid md:grid-cols-2 gap-4">
                                    {/* 医療情報 */}
                                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
                                      <h4 className="text-xs font-bold text-gray-700">医療情報</h4>
                                      <InfoRow label="氏名" value={answers?.name || answers?.氏名 || "-"} />
                                      <InfoRow label="性別" value={answers?.sex || answers?.性別 || "-"} />
                                      <InfoRow label="生年月日" value={answers?.birth || answers?.生年月日 || "-"} />
                                      <InfoRow label="TEL" value={answers?.tel || "-"} />
                                      <InfoRow label="既往歴" value={
                                        answers?.current_disease_yesno === "yes"
                                          ? (answers?.current_disease_detail || "あり")
                                          : answers?.current_disease_yesno === "no" ? "なし" : "-"
                                      } />
                                      <InfoRow label="GLP-1歴" value={answers?.glp_history || "-"} />
                                      <InfoRow label="内服薬" value={
                                        answers?.med_yesno === "yes"
                                          ? (answers?.med_detail || "あり")
                                          : answers?.med_yesno === "no" ? "なし" : "-"
                                      } />
                                      <InfoRow label="アレルギー" value={
                                        answers?.allergy_yesno === "yes"
                                          ? (answers?.allergy_detail || "あり")
                                          : answers?.allergy_yesno === "no" ? "なし" : "-"
                                      } />
                                      {answers?.ng_check && <InfoRow label="NG判定" value={answers.ng_check} />}
                                    </div>

                                    {/* DR. NOTE（編集可能） */}
                                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-gray-700">DR. NOTE</h4>
                                        <div className="flex items-center gap-1">
                                          {/* ロックボタン */}
                                          <button
                                            onClick={() => toggleLock(it.id, isLocked)}
                                            className={`p-1 rounded transition-colors ${
                                              isLocked
                                                ? "text-slate-500 hover:text-slate-700"
                                                : "text-gray-400 hover:text-gray-600"
                                            }`}
                                            title={isLocked ? "ロック解除" : "ロック"}
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              {isLocked ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                              ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                              )}
                                            </svg>
                                          </button>
                                          {/* 編集ボタン */}
                                          {!isEditing && !isLocked && (
                                            <button
                                              onClick={() => startEdit(it)}
                                              className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
                                              title="編集"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {isEditing ? (
                                        <div className="space-y-2">
                                          {/* SOAP構造化入力フォーム */}
                                          <KarteNoteEditor
                                            soap={editSoap}
                                            onSoapChange={setEditSoap}
                                            noteFormat={editNoteFormat}
                                            onNoteFormatChange={setEditNoteFormat}
                                          />
                                          {/* テンプレートボタン */}
                                          <div className="relative">
                                            <button
                                              onClick={() => setShowTemplates(!showTemplates)}
                                              className="text-[11px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                            >
                                              テンプレート挿入
                                            </button>
                                            {showTemplates && (
                                              <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64 max-h-60 overflow-auto">
                                                {Object.entries(templatesByCategory).map(([cat, tmpls]) => (
                                                  <div key={cat}>
                                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                                                      {categoryLabels[cat] || cat}
                                                    </div>
                                                    {tmpls.map(t => (
                                                      <button
                                                        key={t.id}
                                                        onClick={() => insertTemplate(t)}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 transition-colors border-b border-gray-50"
                                                      >
                                                        <div className="font-medium text-gray-800">{t.name}</div>
                                                        <div className="text-gray-400 truncate mt-0.5">{t.body.slice(0, 40)}...</div>
                                                      </button>
                                                    ))}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          {/* 保存・キャンセル */}
                                          <div className="flex items-center gap-2 pt-1">
                                            <button
                                              onClick={saveNote}
                                              disabled={editSaving}
                                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                            >
                                              {editSaving ? "保存中..." : "保存"}
                                            </button>
                                            <button
                                              onClick={cancelEdit}
                                              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
                                            >
                                              キャンセル
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {it.note ? (
                                            <NoteDisplay note={it.note} />
                                          ) : (
                                            <p className="text-sm text-gray-400 italic">メモなし</p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <details>
                                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-red-500 transition-colors">
                                      全回答データを表示
                                    </summary>
                                    <pre className="mt-2 text-[11px] bg-gray-50 rounded-lg p-3 overflow-auto max-h-[300px] text-gray-600 border border-gray-100">
{JSON.stringify(answers, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 購入履歴タブ */}
                    {activeTab === "history" && (
                      <div className="divide-y divide-gray-100">
                        {history.length === 0 ? (
                          <div className="p-8 text-center text-sm text-gray-400">購入履歴なし</div>
                        ) : history.map((h, i) => (
                          <div key={h.id || i} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800">{h.productName}</span>
                                  {h.refundStatus && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-medium">返金: {h.refundStatus}</span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                                  <span>{formatDateJST(h.paidAt)}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{h.paymentMethod}</span>
                                  {h.trackingNumber && h.trackingNumber !== "-" && (
                                    <span className="font-mono text-gray-400">追跡: {h.trackingNumber}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                                ¥{Number(h.amount).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 再処方タブ */}
                    {activeTab === "reorder" && (
                      <div className="divide-y divide-gray-100">
                        {reorders.length === 0 ? (
                          <div className="p-8 text-center text-sm text-gray-400">再処方履歴なし</div>
                        ) : reorders.map((r) => {
                          const statusColor = r.rawStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.rawStatus === "confirmed" ? "bg-blue-50 text-blue-700 border-blue-200"
                            : r.rawStatus === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200"
                            : r.rawStatus === "canceled" ? "bg-gray-100 text-gray-500 border-gray-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";
                          return (
                            <div key={r.id} className="px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">{r.productName}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${statusColor}`}>{r.status}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    申請: {r.createdAt}
                                    {r.approvedAt && <span className="ml-3 text-emerald-600 font-medium">承認: {r.approvedAt}</span>}
                                  </div>
                                </div>
                                <span className="text-xs text-gray-300 font-mono">#{r.id}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-20 flex-shrink-0 text-xs leading-5">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

/** SOAP/プレーンをnote内容から自動判定して表示 */
function NoteDisplay({ note }: { note: string }) {
  // JSON形式（SOAP）かどうかを判定
  let soap: { s: string; o: string; a: string; p: string } | null = null;
  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object" && ("s" in parsed || "o" in parsed || "a" in parsed || "p" in parsed)) {
      soap = parseJsonToSoap(note);
    }
  } catch { /* プレーンテキスト */ }

  if (soap) {
    const sections = [
      { key: "s", label: "S", value: soap.s, color: "border-l-blue-400" },
      { key: "o", label: "O", value: soap.o, color: "border-l-green-400" },
      { key: "a", label: "A", value: soap.a, color: "border-l-amber-400" },
      { key: "p", label: "P", value: soap.p, color: "border-l-purple-400" },
    ].filter(s => s.value);

    if (sections.length === 0) {
      return <p className="text-sm text-gray-400 italic">メモなし</p>;
    }

    return (
      <div className="space-y-2">
        {sections.map(s => (
          <div key={s.key} className={`border-l-4 ${s.color} pl-3`}>
            <div className="text-[10px] font-bold text-gray-400">{s.label}</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{s.value}</p>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note}</p>;
}
