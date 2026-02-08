"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  amount: number;
  paymentMethod: string;
  trackingNumber: string;
  refundStatus: string | null;
};

type ReorderItem = {
  id: number;
  productName: string;
  status: string;
  rawStatus: string;
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

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId: rawPatientId } = use(params);
  const patientId = decodeURIComponent(rawPatientId || "").trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [intakes, setIntakes] = useState<IntakeItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reorders, setReorders] = useState<ReorderItem[]>([]);

  // カルテ編集
  const [selectedIntakeId, setSelectedIntakeId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [expandedIntake, setExpandedIntake] = useState<number | null>(null);

  // 新規カルテ追加
  const [isNewKarteMode, setIsNewKarteMode] = useState(false);
  const [newKarteNote, setNewKarteNote] = useState("");
  const [creatingKarte, setCreatingKarte] = useState(false);

  const selectedIntake = useMemo(() => intakes.find(i => i.id === selectedIntakeId), [intakes, selectedIntakeId]);
  const originalNote = useMemo(() => {
    if (!selectedIntake) return "";
    const raw = selectedIntake.note || "";
    return raw.replace(/^最終更新: .+\n?/, "");
  }, [selectedIntake]);

  async function loadBundle() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "bundle_failed");
      setPatient(data.patient ?? null);
      setIntakes(data.intakes ?? []);
      setHistory(data.history ?? []);
      setReorders(data.reorders ?? []);
      if (data.intakes?.length > 0) {
        setSelectedIntakeId(data.intakes[0].id);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBundle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (!isNewKarteMode) {
      setNoteDraft(originalNote);
    }
  }, [originalNote, isNewKarteMode]);

  async function handleSave() {
    if (!selectedIntakeId) return;
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/patientnote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, note: noteDraft, intakeId: selectedIntakeId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "save_failed");
      setLastSavedAt(data.editedAt || "");

      const res2 = await fetch(`/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" });
      const data2 = await res2.json();
      if (data2.ok) {
        setIntakes(data2.intakes ?? []);
        setHistory(data2.history ?? []);
        setReorders(data2.reorders ?? []);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateKarte() {
    if (!newKarteNote.trim()) return;
    setCreatingKarte(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, note: newKarteNote }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "create_failed");
      setLastSavedAt(data.editedAt || "");
      setNewKarteNote("");
      setIsNewKarteMode(false);

      // リロード
      const res2 = await fetch(`/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" });
      const data2 = await res2.json();
      if (data2.ok) {
        setIntakes(data2.intakes ?? []);
        setHistory(data2.history ?? []);
        setReorders(data2.reorders ?? []);
        if (data.intakeId) {
          setSelectedIntakeId(data.intakeId);
        } else if (data2.intakes?.length > 0) {
          setSelectedIntakeId(data2.intakes[0].id);
        }
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingKarte(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const age = calcAge(patient?.birth || null);

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* ヘッダー */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-400" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href="/admin/kartesearch" className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors">
                &larr; カルテ検索へ戻る
              </Link>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800">{patient?.name || patientId}</h1>
                {patient?.kana && <span className="text-sm text-slate-400">{patient.kana}</span>}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-mono border border-indigo-100">{patientId}</span>
                {patient?.sex && (
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                    patient.sex === "男性" || patient.sex === "male"
                      ? "bg-blue-50 text-blue-600 border-blue-100"
                      : "bg-pink-50 text-pink-600 border-pink-100"
                  }`}>{patient.sex}</span>
                )}
                {age !== null && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-xs border border-slate-200">{age}歳</span>
                )}
                {patient?.birth && (
                  <span className="text-xs text-slate-400">{fmtBirth(patient.birth)}</span>
                )}
                {patient?.phone && <span className="text-xs text-slate-500">TEL: {patient.phone}</span>}
                {patient?.lineId && (
                  <span className="px-2 py-0.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium border border-green-100">LINE連携済</span>
                )}
              </div>
            </div>
          </div>
          {err && <div className="mt-3 text-sm text-rose-500">{err}</div>}
        </div>
      </section>

      {/* メイン: カルテ編集 + 問診履歴 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* 左: カルテ編集 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {isNewKarteMode ? "新規カルテ追加" : "カルテ編集"}
            </h2>
            <div className="flex items-center gap-2">
              {lastSavedAt && <span className="text-xs text-amber-100">保存: {lastSavedAt}</span>}
              <button
                onClick={() => {
                  setIsNewKarteMode(!isNewKarteMode);
                  setNewKarteNote("");
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isNewKarteMode
                    ? "bg-white/30 text-white hover:bg-white/40"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {isNewKarteMode ? "編集に戻る" : "+ 新規追加"}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {isNewKarteMode ? (
              <>
                <p className="text-xs text-slate-500">新しいカルテエントリーを追加します。問診に紐づかない独立したメモを作成できます。</p>
                <textarea
                  value={newKarteNote}
                  onChange={(e) => setNewKarteNote(e.target.value)}
                  className="w-full min-h-[200px] rounded-xl border border-amber-200 p-4 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 leading-relaxed resize-y bg-amber-50/30"
                  placeholder="カルテ内容を入力..."
                  disabled={creatingKarte}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCreateKarte}
                    disabled={creatingKarte || !newKarteNote.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium disabled:opacity-50 hover:shadow-md hover:shadow-amber-200 transition-all"
                  >
                    {creatingKarte ? "追加中..." : "カルテを追加"}
                  </button>
                  <button
                    onClick={() => { setIsNewKarteMode(false); setNewKarteNote(""); }}
                    disabled={creatingKarte}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-500">対象問診</label>
                  <select
                    value={selectedIntakeId || ""}
                    onChange={(e) => setSelectedIntakeId(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-slate-50/50"
                  >
                    {intakes.map(it => (
                      <option key={it.id} value={it.id}>
                        {fmtDate(it.submittedAt)} — {it.status === "OK" ? "診察OK" : it.status === "NG" ? "NG" : "未診察"} {it.prescriptionMenu ? `/ ${it.prescriptionMenu}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="w-full min-h-[200px] rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 leading-relaxed resize-y bg-slate-50/30"
                  placeholder="診察メモを入力..."
                  disabled={saving || !selectedIntakeId}
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || !selectedIntakeId}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:shadow-md hover:shadow-indigo-200 transition-all"
                  >
                    {saving ? "保存中..." : "保存する"}
                  </button>
                  <button
                    onClick={() => setNoteDraft(originalNote)}
                    disabled={saving || !selectedIntakeId}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    元に戻す
                  </button>
                  <span className="text-xs text-slate-400 ml-auto">保存時にタイムスタンプ自動付与</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 右: 問診履歴 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">問診履歴</h2>
            <span className="text-xs text-slate-400">({intakes.length}件)</span>
          </div>
          {intakes.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-400">問診データなし</div>
          ) : intakes.map(it => {
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
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
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
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gradient-to-br from-teal-50/80 to-emerald-50/50 border border-teal-100 p-3 space-y-1.5">
                        <h4 className="text-xs font-bold text-teal-700 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          医療情報
                        </h4>
                        <InfoRow label="既往歴" value={answers?.current_disease_yesno === "yes" ? (answers?.current_disease_detail || "あり") : answers?.current_disease_yesno === "no" ? "なし" : "-"} />
                        <InfoRow label="GLP-1歴" value={answers?.glp_history || "-"} />
                        <InfoRow label="内服薬" value={answers?.med_yesno === "yes" ? (answers?.med_detail || "あり") : answers?.med_yesno === "no" ? "なし" : "-"} />
                        <InfoRow label="アレルギー" value={answers?.allergy_yesno === "yes" ? (answers?.allergy_detail || "あり") : answers?.allergy_yesno === "no" ? "なし" : "-"} />
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/30 border border-amber-200 p-3 space-y-1.5">
                        <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Dr. Note
                        </h4>
                        {it.note ? (
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{it.note}</p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">メモなし</p>
                        )}
                      </div>
                    </div>
                    <details>
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors">全回答データを表示</summary>
                      <pre className="mt-2 text-[11px] bg-slate-50 rounded-xl p-3 overflow-auto max-h-[250px] text-slate-600 border border-slate-100">
{JSON.stringify(answers, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* 下部: 購入履歴 + 再処方 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              購入履歴 <span className="text-violet-200 font-normal normal-case">({history.length}件)</span>
            </h2>
          </div>
          <div className="p-5">
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">履歴なし</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {history.map((h, i) => (
                  <div key={h.id || i} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{h.productName}</span>
                        {h.refundStatus && <span className="text-rose-500 text-[10px] px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200">返金: {h.refundStatus}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        <span>{fmtDate(h.paidAt)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-500 text-[10px]">{h.paymentMethod}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-800 whitespace-nowrap">¥{Number(h.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              再処方 <span className="text-teal-200 font-normal normal-case">({reorders.length}件)</span>
            </h2>
          </div>
          <div className="p-5">
            {reorders.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">履歴なし</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {reorders.map(r => {
                  const statusColor = r.rawStatus === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : r.rawStatus === "confirmed" ? "bg-blue-50 text-blue-600 border-blue-200"
                    : r.rawStatus === "rejected" ? "bg-rose-50 text-rose-600 border-rose-200"
                    : r.rawStatus === "canceled" ? "bg-slate-50 text-slate-400 border-slate-200"
                    : "bg-amber-50 text-amber-600 border-amber-200";
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{r.productName}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>{r.status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          申請: {r.createdAt}
                          {r.approvedAt && <span className="ml-2 text-emerald-600">承認: {r.approvedAt}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-300 font-mono">#{r.id}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
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
