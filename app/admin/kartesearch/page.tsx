"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calcAge, formatDateJST } from "@/lib/patient-utils";

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
    <div className="min-h-full bg-gray-50">
      {/* ヘッダー + 検索 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">カルテ検索</h1>
          </div>

          {/* 検索モードトグル */}
          <div className="flex items-center gap-2">
            {SEARCH_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => { setSearchMode(m.key); setQ(""); setCandidates([]); setSelected(null); setPatient(null); }}
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

          {/* 検索入力 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xl">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={currentMode.placeholder}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
              />
            </div>
            <button onClick={handleClear} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              クリア
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{loading ? "検索中..." : `候補: ${candidates.length}件`}</span>
            {err && <span className="text-rose-500">{err}</span>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-5 space-y-5">
        {/* 候補一覧 */}
        {candidates.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">検索結果</span>
            </div>
            <div className="divide-y divide-gray-100">
              {candidates.map((c) => {
                const isActive = selected?.patientId === c.patientId;
                const age = calcAge(c.birth);
                return (
                  <div
                    key={c.patientId}
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-red-50 border-l-[3px] border-l-red-600"
                        : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                    }`}
                    onClick={() => loadBundle(c)}
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
                      <Link
                        href={`/admin/patients/${encodeURIComponent(c.patientId)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        詳細
                      </Link>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* バンドル表示 */}
        {selected && (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* 左: 患者サマリ */}
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
                    <div className="bg-red-600 px-5 py-4">
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
                            <span className="text-gray-700">{patient.phone}</span>
                          </div>
                        )}
                        {patient.birth && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-10 text-xs">生年</span>
                            <span className="text-gray-700">{fmtBirth(patient.birth)}</span>
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/admin/patients/${encodeURIComponent(patient.id)}`}
                        className="block w-full text-center px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        カルテ詳細
                      </Link>
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
                  { key: "intake" as const, label: "問診", count: intakes.length },
                  { key: "history" as const, label: "購入履歴", count: history.length },
                  { key: "reorder" as const, label: "再処方", count: reorders.length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
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
                  {/* 問診タブ */}
                  {activeTab === "intake" && (
                    <div className="divide-y divide-gray-100">
                      {intakes.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">問診データなし</div>
                      ) : intakes.map((it) => {
                        const isOpen = expandedIntake === it.id;
                        const answers = it.answers || {};
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

                                  {/* Dr. Note */}
                                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
                                    <h4 className="text-xs font-bold text-gray-700">DR. NOTE</h4>
                                    {it.note ? (
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{it.note}</p>
                                    ) : (
                                      <p className="text-sm text-gray-400 italic">メモなし</p>
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
