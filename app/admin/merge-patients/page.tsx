// app/admin/merge-patients/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";

type Patient = {
  id: string;
  name: string;
  phone: string;
  lineId?: string;
} | null;

export default function MergePatientsPage() {
  const [oldPatientId, setOldPatientId] = useState("");
  const [newPatientId, setNewPatientId] = useState("");

  const [loadingOld, setLoadingOld] = useState(false);
  const [loadingNew, setLoadingNew] = useState(false);
  const [merging, setMerging] = useState(false);

  const [oldPatient, setOldPatient] = useState<Patient>(null);
  const [newPatient, setNewPatient] = useState<Patient>(null);

  const [deleteNewIntake, setDeleteNewIntake] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPatient(patientId: string, isOld: boolean) {
    const setLoading = isOld ? setLoadingOld : setLoadingNew;
    const setPatient = isOld ? setOldPatient : setNewPatient;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.message || "患者情報の取得に失敗しました");
      }

      if (!data.patient) {
        throw new Error("患者が見つかりませんでした");
      }

      setPatient(data.patient);
    } catch (e: any) {
      setError(String(e?.message || e));
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge() {
    if (!oldPatient || !newPatient) {
      setError("両方の患者情報を読み込んでください");
      return;
    }

    if (oldPatientId === newPatientId) {
      setError("同じ患者IDは統合できません");
      return;
    }

    const confirmed = confirm(
      `以下の統合を実行します：\n\n` +
      `【統合元】${oldPatient.name} (${oldPatientId})\n` +
      `LINE UID: ${oldPatient.lineId || "なし"}\n\n` +
      `【統合先】${newPatient.name} (${newPatientId})\n` +
      `現在のLINE UID: ${newPatient.lineId || "なし"}\n\n` +
      (deleteNewIntake
        ? `⚠️ 統合先の予約・問診・個人情報を削除してから統合します。\n`
        : ``) +
      `統合元の全データ（問診履歴・購入履歴・LINE UID）を統合先に統合します。\n` +
      `統合後、統合元のIDは無効になります。\n\n` +
      `よろしいですか？`
    );

    if (!confirmed) return;

    const token = prompt("管理者トークンを入力してください:");
    if (!token) return;

    setMerging(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/merge-patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_patient_id: oldPatientId,
          new_patient_id: newPatientId,
          delete_new_intake: deleteNewIntake,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "統合に失敗しました");
      }

      setSuccess("統合が完了しました。新しいLINE UIDで統合先患者にアクセスできます。");

      // 統合後、新患者の情報を再読み込み
      await loadPatient(newPatientId, false);

      // 旧患者情報をクリア
      setOldPatientId("");
      setOldPatient(null);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setMerging(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">患者統合</h1>
          <p className="text-xs text-slate-500">
            LINEアカウント移行時・電話番号変更時に使用。統合元の全データ（問診履歴・購入履歴・LINE UID）を統合先に統合し、統合元IDを無効化します。
          </p>
        </div>

        <Link
          href="/admin/kartesearch"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
        >
          ← カルテ検索へ
        </Link>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* 統合元（旧） */}
        <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">統合元（旧）</h2>
          <p className="text-xs text-slate-500">
            以前のLINEアカウントで登録していた患者ID
          </p>

          <div className="space-y-2">
            <label className="text-xs text-slate-600 block">Patient ID</label>
            <input
              type="text"
              value={oldPatientId}
              onChange={(e) => setOldPatientId(e.target.value)}
              placeholder="例: 20251200001"
              className="w-full rounded-lg border border-slate-200 p-2 text-sm font-mono"
              disabled={loadingOld || merging}
            />

            <button
              type="button"
              onClick={() => loadPatient(oldPatientId, true)}
              disabled={!oldPatientId || loadingOld || merging}
              className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {loadingOld ? "読込中..." : "患者情報を取得"}
            </button>
          </div>

          {oldPatient && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-2 text-sm">
              <div>
                <span className="text-slate-500">氏名：</span>
                <span className={`font-medium ${newPatient && oldPatient.name && newPatient.name && oldPatient.name === newPatient.name ? "text-red-600 font-bold" : ""}`}>{oldPatient.name}</span>
              </div>
              <div>
                <span className="text-slate-500">TEL：</span>
                <span className={`font-mono ${newPatient && oldPatient.phone && newPatient.phone && oldPatient.phone === newPatient.phone ? "text-red-600 font-bold" : ""}`}>{oldPatient.phone}</span>
              </div>
              <div>
                <span className="text-slate-500">LINE UID：</span>
                <span className="font-mono text-xs">
                  {oldPatient.lineId || "（未登録）"}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 統合先（新） */}
        <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">統合先（新）</h2>
          <p className="text-xs text-slate-500">
            新しいLINEアカウントで新規登録した患者ID
          </p>

          <div className="space-y-2">
            <label className="text-xs text-slate-600 block">Patient ID</label>
            <input
              type="text"
              value={newPatientId}
              onChange={(e) => setNewPatientId(e.target.value)}
              placeholder="例: 20260130002"
              className="w-full rounded-lg border border-slate-200 p-2 text-sm font-mono"
              disabled={loadingNew || merging}
            />

            <button
              type="button"
              onClick={() => loadPatient(newPatientId, false)}
              disabled={!newPatientId || loadingNew || merging}
              className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {loadingNew ? "読込中..." : "患者情報を取得"}
            </button>
          </div>

          {newPatient && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-2 text-sm">
              <div>
                <span className="text-slate-500">氏名：</span>
                <span className={`font-medium ${oldPatient && oldPatient.name && newPatient.name && oldPatient.name === newPatient.name ? "text-red-600 font-bold" : ""}`}>{newPatient.name}</span>
              </div>
              <div>
                <span className="text-slate-500">TEL：</span>
                <span className={`font-mono ${oldPatient && oldPatient.phone && newPatient.phone && oldPatient.phone === newPatient.phone ? "text-red-600 font-bold" : ""}`}>{newPatient.phone}</span>
              </div>
              <div>
                <span className="text-slate-500">LINE UID：</span>
                <span className="font-mono text-xs">
                  {newPatient.lineId || "（未登録）"}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 統合実行ボタン */}
      <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">統合実行</h3>
          <p className="text-xs text-slate-500">
            統合元の全データ（問診履歴・購入履歴・LINE User ID）を統合先に統合します。
            統合元のpatient_idは全て統合先のpatient_idに置き換えられ、データの重複は発生しません。
          </p>

          <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={deleteNewIntake}
              onChange={(e) => setDeleteNewIntake(e.target.checked)}
              disabled={merging}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium text-amber-800">
                統合先の予約・問診を先に削除する
              </span>
              <p className="text-xs text-amber-600 mt-0.5">
                新アカウントで既に予約を取っている場合にチェック。統合先のintake・予約・個人情報を削除してから統合元のデータを移行します。
              </p>
            </div>
          </label>

          <button
            type="button"
            onClick={handleMerge}
            disabled={!oldPatient || !newPatient || merging}
            className="w-full rounded-lg bg-blue-600 text-white px-4 py-3 text-sm font-medium disabled:opacity-60 hover:bg-blue-700 transition"
          >
            {merging ? "統合中..." : "統合を実行"}
          </button>
        </div>
      </section>
    </main>
  );
}
