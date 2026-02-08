"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

function calcAge(birthday: string | null): number | null {
  if (!birthday) return null;
  try {
    const birth = new Date(birthday);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

function fmtDate(s: string) {
  if (!s) return "-";
  try {
    const d = new Date(s);
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return `${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")} ${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
  } catch {
    return s.slice(0, 10);
  }
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

const SEARCH_MODES = [
  { key: "name", label: "氏名", placeholder: "氏名で検索（例：山田）" },
  { key: "pid", label: "PID", placeholder: "患者IDで検索（例：2026010）" },
] as const;

export default function KarteSearchPage() {
  const [searchMode, setSearchMode] = useState<string>("name");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [err, setErr] = useState("");

  // バンドルデータ
  const [bundleLoading, setBundleLoading] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [intakes, setIntakes] = useState<IntakeItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reorders, setReorders] = useState<ReorderItem[]>([]);
  const [activeTab, setActiveTab] = useState<"intake" | "history" | "reorder">("intake");
  const [expandedIntake, setExpandedIntake] = useState<number | null>(null);

  const canSearch = useMemo(() => q.trim().length >= 1, [q]);

  useEffect(() => {
    if (!canSearch) { setCandidates([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/admin/kartesearch?q=${encodeURIComponent(q.trim())}&type=${searchMode}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "search_failed");
        setCandidates(data.candidates || []);
      } catch (e: unknown) {
        setCandidates([]);
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, canSearch, searchMode]);

  async function loadBundle(c: Candidate) {
    setSelected(c);
    setBundleLoading(true);
    setErr("");
    setPatient(null);
    setIntakes([]);
    setHistory([]);
    setReorders([]);
    setActiveTab("intake");
    setExpandedIntake(null);

    try {
      const res = await fetch(`/api/admin/patientbundle?patientId=${encodeURIComponent(c.patientId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "bundle_failed");
      setPatient(data.patient ?? null);
      setIntakes(data.intakes ?? []);
      setHistory(data.history ?? []);
      setReorders(data.reorders ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBundleLoading(false);
    }
  }

  function handleClear() {
    setQ("");
    setCandidates([]);
    setSelected(null);
    setPatient(null);
    setIntakes([]);
    setHistory([]);
    setReorders([]);
    setErr("");
  }

  const currentMode = SEARCH_MODES.find(m => m.key === searchMode) || SEARCH_MODES[0];

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* ヘッダー + 検索 */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-400" />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-200">
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-800">カルテ検索</h1>
            </div>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-indigo-600 transition-colors">
              管理画面へ戻る
            </Link>
          </div>

          {/* 検索モードトグル */}
          <div className="flex items-center gap-2">
            {SEARCH_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => { setSearchMode(m.key); setQ(""); setCandidates([]); setSelected(null); setPatient(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  searchMode === m.key
                    ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-200"
                    : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 検索入力 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={currentMode.placeholder}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all bg-slate-50/50"
              />
            </div>
            <button onClick={handleClear} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
              クリア
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{loading ? "検索中..." : `候補: ${candidates.length}件`}</span>
            {err && <span className="text-rose-500">{err}</span>}
          </div>
        </div>
      </section>

      {/* 候補一覧（縦リスト） */}
      {candidates.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">検索結果</span>
          </div>
          <div className="divide-y divide-slate-100">
            {candidates.map((c) => {
              const isActive = selected?.patientId === c.patientId;
              const age = calcAge(c.birth);
              return (
                <div
                  key={c.patientId}
                  className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-all ${
                    isActive
                      ? "bg-indigo-50/60 border-l-3 border-l-indigo-500"
                      : "hover:bg-slate-50/80 border-l-3 border-l-transparent"
                  }`}
                  onClick={() => loadBundle(c)}
                >
                  <span className={`font-semibold text-sm min-w-[6rem] ${isActive ? "text-indigo-700" : "text-slate-800"}`}>
                    {c.name}
                  </span>
                  {c.sex ? (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium min-w-[3rem] text-center ${
                      c.sex === "男性" || c.sex === "male"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-pink-50 text-pink-600"
                    }`}>{c.sex}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-300 text-[11px] min-w-[3rem] text-center">-</span>
                  )}
                  <span className="text-xs text-slate-500 min-w-[10rem]">
                    {fmtBirth(c.birth)}
                    {age !== null && <span className="ml-1 text-slate-400">({age}歳)</span>}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{c.patientId}</span>
                  <span className="ml-auto flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-400">
                      問診{c.intakeCount}件
                    </span>
                    <Link
                      href={`/admin/patients/${encodeURIComponent(c.patientId)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-medium hover:shadow-md hover:shadow-indigo-200 transition-all"
                    >
                      詳細
                    </Link>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* バンドル表示 */}
      {selected && (
        <section className="flex flex-col lg:flex-row gap-5">
          {/* 左: 患者サマリ */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-4">
              {bundleLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : patient ? (
                <>
                  <div className="bg-gradient-to-br from-indigo-500 to-blue-600 px-5 py-4">
                    <h2 className="text-lg font-bold text-white">{patient.name}</h2>
                    {patient.kana && <p className="text-xs text-indigo-200 mt-0.5">{patient.kana}</p>}
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
                  <div className="p-5 space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-10 text-xs">PID</span>
                        <span className="font-mono text-slate-700">{patient.id}</span>
                      </div>
                      {patient.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-10 text-xs">TEL</span>
                          <span className="text-slate-700">{patient.phone}</span>
                        </div>
                      )}
                      {patient.birth && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-10 text-xs">生年</span>
                          <span className="text-slate-700">{fmtBirth(patient.birth)}</span>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/admin/patients/${encodeURIComponent(patient.id)}`}
                      className="block w-full text-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-medium hover:shadow-md hover:shadow-indigo-200 transition-all"
                    >
                      カルテ編集
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">データなし</p>
              )}
            </div>
          </div>

          {/* 右: タブコンテンツ */}
          <div className="flex-1 min-w-0">
            {/* タブ */}
            <div className="flex items-center gap-1 mb-4">
              {[
                { key: "intake" as const, label: "問診", count: intakes.length, color: "from-teal-500 to-emerald-500" },
                { key: "history" as const, label: "購入履歴", count: history.length, color: "from-amber-500 to-orange-500" },
                { key: "reorder" as const, label: "再処方", count: reorders.length, color: "from-violet-500 to-purple-500" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                      : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.key ? "bg-white/25" : "bg-slate-100"
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {bundleLoading ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* 問診タブ */}
                {activeTab === "intake" && (
                  <div className="space-y-3">
                    {intakes.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-400">問診データなし</div>
                    ) : intakes.map((it) => {
                      const isOpen = expandedIntake === it.id;
                      const answers = it.answers || {};
                      const statusLabel = it.status === "OK" ? "診察OK" : it.status === "NG" ? "NG" : "未診察";
                      const statusColor = it.status === "OK"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : it.status === "NG"
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : "bg-slate-50 text-slate-400 border border-slate-200";

                      return (
                        <div key={it.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                          <button
                            onClick={() => setExpandedIntake(isOpen ? null : it.id)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800">{fmtDate(it.submittedAt)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
                              {it.prescriptionMenu && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 text-[11px] font-medium">{it.prescriptionMenu}</span>
                              )}
                              {it.note && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-medium">メモあり</span>
                              )}
                            </div>
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
                              {(it.reservedDate || it.reservedTime) && (
                                <div className="pt-3 text-xs text-slate-400">
                                  予約: {it.reservedDate} {it.reservedTime}
                                </div>
                              )}

                              <div className="grid md:grid-cols-2 gap-4 pt-2">
                                {/* 医療情報 */}
                                <div className="rounded-xl bg-gradient-to-br from-teal-50/80 to-emerald-50/50 border border-teal-100 p-4 space-y-2">
                                  <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    医療情報
                                  </h4>
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

                                {/* Dr. Note */}
                                <div className="rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/30 border border-amber-200 p-4 space-y-2">
                                  <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Dr. Note
                                  </h4>
                                  {it.note ? (
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{it.note}</p>
                                  ) : (
                                    <p className="text-sm text-slate-400 italic">メモなし</p>
                                  )}
                                </div>
                              </div>

                              <details className="pt-2">
                                <summary className="text-xs text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors">
                                  全回答データを表示
                                </summary>
                                <pre className="mt-2 text-[11px] bg-slate-50 rounded-xl p-3 overflow-auto max-h-[300px] text-slate-600 border border-slate-100">
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
                  <div className="space-y-3">
                    {history.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-400">購入履歴なし</div>
                    ) : history.map((h, i) => (
                      <div key={h.id || i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">{h.productName}</span>
                              {h.refundStatus && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-medium">返金: {h.refundStatus}</span>
                              )}
                            </div>
                            <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-500">
                              <span>{fmtDate(h.paidAt)}</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px]">{h.paymentMethod}</span>
                              {h.trackingNumber && h.trackingNumber !== "-" && (
                                <span className="font-mono text-slate-400">追跡: {h.trackingNumber}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-800 whitespace-nowrap bg-slate-50 px-3 py-1 rounded-lg">
                            ¥{Number(h.amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 再処方タブ */}
                {activeTab === "reorder" && (
                  <div className="space-y-3">
                    {reorders.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-400">再処方履歴なし</div>
                    ) : reorders.map((r) => {
                      const statusColor = r.rawStatus === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : r.rawStatus === "confirmed" ? "bg-blue-50 text-blue-600 border-blue-200"
                        : r.rawStatus === "rejected" ? "bg-rose-50 text-rose-600 border-rose-200"
                        : r.rawStatus === "canceled" ? "bg-slate-50 text-slate-400 border-slate-200"
                        : "bg-amber-50 text-amber-600 border-amber-200";
                      return (
                        <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">{r.productName}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColor}`}>{r.status}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                申請: {r.createdAt}
                                {r.approvedAt && <span className="ml-3 text-emerald-600">承認: {r.approvedAt}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-slate-300 font-mono">#{r.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-400 w-20 flex-shrink-0 text-xs leading-5">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
