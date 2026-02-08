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

const SEARCH_MODES = [
  { key: "name", label: "氏名", placeholder: "氏名で検索（例：山田）" },
  { key: "pid", label: "PID", placeholder: "患者IDで検索（例：2026010）" },
  { key: "tel", label: "TEL", placeholder: "電話番号で検索（例：09012345678）" },
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

  // debounce search
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
      <section className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">カルテ検索</h1>
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            管理画面へ戻る
          </Link>
        </div>

        {/* 検索モードトグル */}
        <div className="flex items-center gap-2">
          {SEARCH_MODES.map(m => (
            <button
              key={m.key}
              onClick={() => { setSearchMode(m.key); setQ(""); setCandidates([]); setSelected(null); setPatient(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                searchMode === m.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 検索入力 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={currentMode.placeholder}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
            />
          </div>
          <button onClick={handleClear} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            クリア
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{loading ? "検索中..." : `候補: ${candidates.length}件`}</span>
          {err && <span className="text-red-500">{err}</span>}
        </div>
      </section>

      {/* 候補一覧 */}
      {candidates.length > 0 && (
        <section className="grid md:grid-cols-2 gap-3">
          {candidates.map((c) => {
            const isActive = selected?.patientId === c.patientId;
            const age = calcAge(c.birth);
            return (
              <div
                key={c.patientId}
                className={`bg-white rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-md ${
                  isActive ? "border-blue-400 bg-blue-50/30 shadow-md" : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => loadBundle(c)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">{c.name}</span>
                      {c.sex && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          c.sex === "男性" || c.sex === "male" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                        }`}>{c.sex}</span>
                      )}
                      {age !== null && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">{age}歳</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono">{c.patientId}</span>
                      {c.phone && <span>TEL: {c.phone}</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      <span>最終問診: {fmtDate(c.lastSubmittedAt)}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">問診 {c.intakeCount}件</span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/patients/${encodeURIComponent(c.patientId)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                  >
                    詳細
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* バンドル表示 */}
      {selected && (
        <section className="flex flex-col lg:flex-row gap-5">
          {/* 左: 患者サマリ */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 sticky top-4">
              {bundleLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : patient ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
                    {patient.kana && <p className="text-xs text-slate-400 mt-0.5">{patient.kana}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {patient.sex && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        patient.sex === "男性" || patient.sex === "male" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                      }`}>{patient.sex}</span>
                    )}
                    {calcAge(patient.birth) !== null && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">{calcAge(patient.birth)}歳</span>
                    )}
                    {patient.lineId && (
                      <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 text-xs font-medium">LINE連携済</span>
                    )}
                  </div>
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
                        <span className="text-slate-700">{patient.birth}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/admin/patients/${encodeURIComponent(patient.id)}`}
                    className="block w-full text-center px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    カルテ編集
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">データなし</p>
              )}
            </div>
          </div>

          {/* 右: タブコンテンツ */}
          <div className="flex-1 min-w-0">
            {/* タブ */}
            <div className="flex items-center gap-1 mb-4">
              {[
                { key: "intake" as const, label: "問診", count: intakes.length },
                { key: "history" as const, label: "購入履歴", count: history.length },
                { key: "reorder" as const, label: "再処方", count: reorders.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.key ? "bg-white/20" : "bg-slate-100"
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {bundleLoading ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* 問診タブ */}
                {activeTab === "intake" && (
                  <div className="space-y-3">
                    {intakes.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-500">問診データなし</div>
                    ) : intakes.map((it) => {
                      const isOpen = expandedIntake === it.id;
                      const answers = it.answers || {};
                      const statusLabel = it.status === "OK" ? "診察OK" : it.status === "NG" ? "NG" : "未診察";
                      const statusColor = it.status === "OK" ? "bg-emerald-50 text-emerald-600" : it.status === "NG" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500";

                      return (
                        <div key={it.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                          <button
                            onClick={() => setExpandedIntake(isOpen ? null : it.id)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-semibold text-slate-900">{fmtDate(it.submittedAt)}</span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
                              {it.prescriptionMenu && (
                                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[11px] font-medium">{it.prescriptionMenu}</span>
                              )}
                            </div>
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
                              {/* 予約情報 */}
                              {(it.reservedDate || it.reservedTime) && (
                                <div className="pt-3 text-xs text-slate-500">
                                  予約: {it.reservedDate} {it.reservedTime}
                                </div>
                              )}

                              <div className="grid md:grid-cols-2 gap-4 pt-2">
                                {/* 医療情報 */}
                                <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">医療情報</h4>
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
                                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Dr. Note</h4>
                                  {it.note ? (
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{it.note}</p>
                                  ) : (
                                    <p className="text-sm text-slate-400 italic">メモなし</p>
                                  )}
                                </div>
                              </div>

                              {/* 全文表示トグル */}
                              <details className="pt-2">
                                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
                                  全回答データを表示
                                </summary>
                                <pre className="mt-2 text-[11px] bg-slate-50 rounded-xl p-3 overflow-auto max-h-[300px] text-slate-600">
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
                      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-500">購入履歴なし</div>
                    ) : history.map((h, i) => (
                      <div key={h.id || i} className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{h.productName}</span>
                              {h.refundStatus && (
                                <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-medium">返金: {h.refundStatus}</span>
                              )}
                            </div>
                            <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-500">
                              <span>{fmtDate(h.paidAt)}</span>
                              <span>{h.paymentMethod}</span>
                              {h.trackingNumber && h.trackingNumber !== "-" && (
                                <span className="font-mono">追跡: {h.trackingNumber}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
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
                      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-500">再処方履歴なし</div>
                    ) : reorders.map((r) => {
                      const statusColor = r.rawStatus === "paid" ? "bg-emerald-50 text-emerald-600"
                        : r.rawStatus === "confirmed" ? "bg-blue-50 text-blue-600"
                        : r.rawStatus === "rejected" ? "bg-red-50 text-red-600"
                        : r.rawStatus === "canceled" ? "bg-slate-100 text-slate-500"
                        : "bg-yellow-50 text-yellow-600";
                      return (
                        <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">{r.productName}</span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColor}`}>{r.status}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                申請: {r.createdAt}
                                {r.approvedAt && <span className="ml-3">承認: {r.approvedAt}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">#{r.id}</span>
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
