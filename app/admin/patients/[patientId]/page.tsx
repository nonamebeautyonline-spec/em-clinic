"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calcAge, formatBirthWithEra, formatDateJST } from "@/lib/patient-utils";

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
  karteNote: string;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
};

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

  // 新規カルテ追加
  const [newKarteNote, setNewKarteNote] = useState("");
  const [creatingKarte, setCreatingKarte] = useState(false);
  const [showNewKarte, setShowNewKarte] = useState(false);

  // 下部タブ
  const [bottomTab, setBottomTab] = useState<"history" | "reorder">("history");

  const selectedIntake = useMemo(() => intakes.find(i => i.id === selectedIntakeId), [intakes, selectedIntakeId]);
  const originalNote = useMemo(() => {
    if (!selectedIntake) return "";
    const raw = selectedIntake.note || "";
    return raw.replace(/^最終更新: .+\n?/, "");
  }, [selectedIntake]);

  async function reloadBundle() {
    try {
      const res = await fetch(`/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setIntakes(data.intakes ?? []);
        setHistory(data.history ?? []);
        setReorders(data.reorders ?? []);
      }
    } catch { /* ignore */ }
  }

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
      await reloadBundle();
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
      setNewKarteNote("");
      setShowNewKarte(false);
      await reloadBundle();
      if (data.intakeId) {
        setSelectedIntakeId(data.intakeId);
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
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  const age = calcAge(patient?.birth || null);
  const answers = selectedIntake?.answers || {};

  return (
    <div className="min-h-full bg-gray-50">
      {/* 患者ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-screen-2xl mx-auto">
          <Link href="/admin/karte" className="text-xs text-gray-400 hover:text-red-600 transition-colors inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            カルテ一覧
          </Link>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">{patient?.name || patientId}</h1>
            {patient?.kana && <span className="text-sm text-gray-400">{patient.kana}</span>}
            {patient?.birth && (
              <span className="text-sm text-gray-500">{formatBirthWithEra(patient.birth)}</span>
            )}
            {age !== null && (
              <span className="text-sm text-gray-700 font-medium">{age}歳</span>
            )}
            {patient?.sex && (
              <span className="text-sm text-gray-700">{patient.sex}</span>
            )}
            <span className="text-xs text-gray-400 font-mono">PID: {patientId}</span>
            {patient?.phone && <span className="text-xs text-gray-500">TEL: {patient.phone}</span>}
            {patient?.lineId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">LINE連携済</span>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="max-w-screen-2xl mx-auto px-4 pt-3">
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-2 text-sm text-rose-600">{err}</div>
        </div>
      )}

      {/* メインコンテンツ: 左パネル + 右パネル */}
      <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row">
        {/* 左パネル: 来院履歴リスト */}
        <div className="w-full lg:w-64 lg:min-w-[16rem] border-r border-gray-200 bg-white">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-700">来院履歴</h2>
              <span className="text-xs text-gray-400">({intakes.length}件)</span>
            </div>
            <button
              onClick={() => setShowNewKarte(!showNewKarte)}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
            >
              + 新規作成
            </button>
          </div>

          {/* 新規カルテ追加（トグル表示） */}
          {showNewKarte && (
            <div className="p-3 border-b border-gray-200 bg-red-50/50">
              <textarea
                value={newKarteNote}
                onChange={(e) => setNewKarteNote(e.target.value)}
                className="w-full min-h-[80px] rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 leading-relaxed resize-y bg-white"
                placeholder="新規カルテ内容を入力..."
                disabled={creatingKarte}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateKarte}
                  disabled={creatingKarte || !newKarteNote.trim()}
                  className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  {creatingKarte ? "追加中..." : "追加"}
                </button>
                <button
                  onClick={() => { setShowNewKarte(false); setNewKarteNote(""); }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          {/* 来院リスト */}
          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            {intakes.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">問診データなし</div>
            ) : (
              intakes.map(it => {
                const isSelected = selectedIntakeId === it.id;
                const statusLabel = it.status === "OK" ? "OK" : it.status === "NG" ? "NG" : "未";
                const statusColor = it.status === "OK"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : it.status === "NG"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-gray-100 text-gray-500 border-gray-200";

                return (
                  <button
                    key={it.id}
                    onClick={() => setSelectedIntakeId(it.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors ${
                      isSelected
                        ? "bg-red-50 border-l-[3px] border-l-red-600"
                        : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isSelected ? "text-red-700" : "text-gray-800"}`}>
                        {formatDateJST(it.submittedAt)}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {it.prescriptionMenu && (
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">{it.prescriptionMenu}</div>
                    )}
                    {it.note && (
                      <div className="text-[10px] text-amber-600 mt-0.5">メモあり</div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 右パネル: カルテ内容 */}
        <div className="flex-1 min-w-0 p-4 lg:p-6">
          {!selectedIntake ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              左のリストから問診を選択してください
            </div>
          ) : (
            <div className="space-y-5">
              {/* ステータスバー */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">ステータス:</span>
                  {selectedIntake.status === "OK" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">OK</span>
                  ) : selectedIntake.status === "NG" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">NG</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">未診察</span>
                  )}
                </div>
                {selectedIntake.prescriptionMenu && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">処方:</span>
                    <span className="text-sm font-medium text-gray-800">{selectedIntake.prescriptionMenu}</span>
                  </div>
                )}
                {selectedIntake.reservedDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">予約:</span>
                    <span className="text-xs text-gray-700">
                      {selectedIntake.reservedDate} {selectedIntake.reservedTime || ""}
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-400">
                  作成: {formatDateJST(selectedIntake.submittedAt)}
                </span>
              </div>

              {/* Dr. Note エディタ */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700">Dr. Note</h3>
                  {lastSavedAt && <span className="text-xs text-gray-400">最終保存: {lastSavedAt}</span>}
                </div>
                <div className="p-4">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    className="w-full min-h-[180px] rounded-lg border border-gray-300 p-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 leading-relaxed resize-y"
                    placeholder="診察メモを入力..."
                    disabled={saving}
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-700 transition-colors"
                    >
                      {saving ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={() => setNoteDraft(originalNote)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      元に戻す
                    </button>
                  </div>
                </div>
              </div>

              {/* 医療情報 */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700">医療情報</h3>
                </div>
                <div className="p-4">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
                    <InfoRow label="既往歴" value={answers?.current_disease_yesno === "yes" ? (answers?.current_disease_detail || "あり") : answers?.current_disease_yesno === "no" ? "なし" : "-"} />
                    <InfoRow label="GLP-1歴" value={answers?.glp_history || "-"} />
                    <InfoRow label="内服薬" value={answers?.med_yesno === "yes" ? (answers?.med_detail || "あり") : answers?.med_yesno === "no" ? "なし" : "-"} />
                    <InfoRow label="アレルギー" value={answers?.allergy_yesno === "yes" ? (answers?.allergy_detail || "あり") : answers?.allergy_yesno === "no" ? "なし" : "-"} />
                  </div>
                  <details className="mt-4">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-red-500 transition-colors">全回答データを表示</summary>
                    <pre className="mt-2 text-[11px] bg-gray-50 rounded-lg p-3 overflow-auto max-h-[250px] text-gray-600 border border-gray-100">
{JSON.stringify(answers, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>

              {/* 購入履歴 / 再処方 タブ */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 border-b border-gray-200 flex items-center gap-0">
                  <button
                    onClick={() => setBottomTab("history")}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      bottomTab === "history"
                        ? "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    購入履歴 ({history.length})
                  </button>
                  <button
                    onClick={() => setBottomTab("reorder")}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      bottomTab === "reorder"
                        ? "border-red-600 text-red-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    再処方 ({reorders.length})
                  </button>
                </div>
                <div className="p-4">
                  {bottomTab === "history" ? (
                    history.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">履歴なし</p>
                    ) : (
                      <div className="space-y-0 divide-y divide-gray-100 max-h-[300px] overflow-auto">
                        {history.map((h, i) => (
                          <div key={h.id || i} className="flex items-center justify-between gap-3 py-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-800">{h.productName}</span>
                                {h.refundStatus && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">返金: {h.refundStatus}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                <span>{formatDateJST(h.paidAt)}</span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{h.paymentMethod}</span>
                                {h.trackingNumber && <span className="text-gray-400">追跡: {h.trackingNumber}</span>}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-gray-800 whitespace-nowrap">¥{Number(h.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    reorders.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">履歴なし</p>
                    ) : (
                      <div className="space-y-0 divide-y divide-gray-100 max-h-[300px] overflow-auto">
                        {reorders.map(r => {
                          const statusColor = r.rawStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.rawStatus === "confirmed" ? "bg-blue-50 text-blue-700 border-blue-200"
                            : r.rawStatus === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200"
                            : r.rawStatus === "canceled" ? "bg-gray-100 text-gray-500 border-gray-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";
                          return (
                            <div key={r.id} className="py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">{r.productName}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor}`}>{r.status}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    申請: {r.createdAt}
                                    {r.approvedAt && <span className="ml-2 text-emerald-600 font-medium">承認: {r.approvedAt}</span>}
                                    {r.paidAt && <span className="ml-2 text-blue-600 font-medium">決済: {r.paidAt}</span>}
                                  </div>
                                </div>
                                <span className="text-xs text-gray-300 font-mono">#{r.id}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm py-1">
      <span className="text-gray-400 w-20 flex-shrink-0 text-xs leading-5">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
