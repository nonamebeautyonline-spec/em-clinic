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

  const selectedIntake = useMemo(() => intakes.find(i => i.id === selectedIntakeId), [intakes, selectedIntakeId]);
  const originalNote = useMemo(() => {
    if (!selectedIntake) return "";
    const raw = selectedIntake.note || "";
    return raw.replace(/^最終更新: .+\n?/, "");
  }, [selectedIntake]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "bundle_failed");
        if (!mounted) return;
        setPatient(data.patient ?? null);
        setIntakes(data.intakes ?? []);
        setHistory(data.history ?? []);
        setReorders(data.reorders ?? []);
        if (data.intakes?.length > 0) {
          setSelectedIntakeId(data.intakes[0].id);
        }
      } catch (e: unknown) {
        if (!mounted) return;
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [patientId]);

  useEffect(() => {
    setNoteDraft(originalNote);
  }, [originalNote]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const age = calcAge(patient?.birth || null);

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* ヘッダー */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/admin/kartesearch" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              &larr; カルテ検索へ戻る
            </Link>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{patient?.name || patientId}</h1>
              {patient?.kana && <span className="text-sm text-slate-400">{patient.kana}</span>}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono">{patientId}</span>
              {patient?.sex && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  patient.sex === "男性" || patient.sex === "male" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                }`}>{patient.sex}</span>
              )}
              {age !== null && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">{age}歳</span>
              )}
              {patient?.phone && <span className="text-xs text-slate-500">TEL: {patient.phone}</span>}
              {patient?.lineId && (
                <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 text-xs font-medium">LINE連携済</span>
              )}
            </div>
          </div>
        </div>
        {err && <div className="mt-3 text-sm text-red-500">{err}</div>}
      </section>

      {/* メイン: カルテ編集 + 問診履歴 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* 左: カルテ編集 */}
        <section className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">カルテ編集</h2>
            {lastSavedAt && <span className="text-xs text-emerald-600">保存: {lastSavedAt}</span>}
          </div>

          <div>
            <label className="text-xs text-slate-500">対象問診</label>
            <select
              value={selectedIntakeId || ""}
              onChange={(e) => setSelectedIntakeId(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
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
            className="w-full min-h-[200px] rounded-xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 leading-relaxed resize-y"
            placeholder="診察メモを入力..."
            disabled={saving || !selectedIntakeId}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !selectedIntakeId}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors"
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
            <span className="text-xs text-slate-400 ml-auto">保存時にタイムスタンプが自動付与されます</span>
          </div>
        </section>

        {/* 右: 問診履歴 */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1">問診履歴</h2>
          {intakes.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-slate-500">問診データなし</div>
          ) : intakes.map(it => {
            const isOpen = expandedIntake === it.id;
            const answers = it.answers || {};
            const statusLabel = it.status === "OK" ? "診察OK" : it.status === "NG" ? "NG" : "未診察";
            const statusColor = it.status === "OK" ? "bg-emerald-50 text-emerald-600" : it.status === "NG" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500";

            return (
              <div key={it.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedIntake(isOpen ? null : it.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{fmtDate(it.submittedAt)}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
                    {it.prescriptionMenu && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[11px] font-medium">{it.prescriptionMenu}</span>
                    )}
                    {it.note && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-medium">メモあり</span>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
                        <h4 className="text-xs font-semibold text-slate-600">医療情報</h4>
                        <InfoRow label="既往歴" value={answers?.current_disease_yesno === "yes" ? (answers?.current_disease_detail || "あり") : answers?.current_disease_yesno === "no" ? "なし" : "-"} />
                        <InfoRow label="GLP-1歴" value={answers?.glp_history || "-"} />
                        <InfoRow label="内服薬" value={answers?.med_yesno === "yes" ? (answers?.med_detail || "あり") : answers?.med_yesno === "no" ? "なし" : "-"} />
                        <InfoRow label="アレルギー" value={answers?.allergy_yesno === "yes" ? (answers?.allergy_detail || "あり") : answers?.allergy_yesno === "no" ? "なし" : "-"} />
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                        <h4 className="text-xs font-semibold text-slate-600">Dr. Note</h4>
                        {it.note ? (
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{it.note}</p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">メモなし</p>
                        )}
                      </div>
                    </div>
                    <details>
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">全回答データを表示</summary>
                      <pre className="mt-2 text-[11px] bg-slate-50 rounded-xl p-3 overflow-auto max-h-[250px] text-slate-600">
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
        <section className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">購入履歴 <span className="text-slate-400 font-normal normal-case">({history.length}件)</span></h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">履歴なし</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {history.map((h, i) => (
                <div key={h.id || i} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{h.productName}</span>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span>{fmtDate(h.paidAt)}</span>
                      <span>{h.paymentMethod}</span>
                      {h.refundStatus && <span className="text-red-500">返金: {h.refundStatus}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 whitespace-nowrap">¥{Number(h.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">再処方 <span className="text-slate-400 font-normal normal-case">({reorders.length}件)</span></h2>
          {reorders.length === 0 ? (
            <p className="text-sm text-slate-500">履歴なし</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {reorders.map(r => {
                const statusColor = r.rawStatus === "paid" ? "bg-emerald-50 text-emerald-600"
                  : r.rawStatus === "confirmed" ? "bg-blue-50 text-blue-600"
                  : r.rawStatus === "rejected" ? "bg-red-50 text-red-600"
                  : r.rawStatus === "canceled" ? "bg-slate-100 text-slate-500"
                  : "bg-yellow-50 text-yellow-600";
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{r.productName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>{r.status}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        申請: {r.createdAt}
                        {r.approvedAt && <span className="ml-2">承認: {r.approvedAt}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">#{r.id}</span>
                  </div>
                );
              })}
            </div>
          )}
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
