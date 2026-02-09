// app/admin/merge-patients/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";

type TabType = "name-change" | "merge";

type PatientInfo = {
  id: string;
  name: string;
  kana: string;
  phone: string;
  lineId?: string;
} | null;

type MergePatient = {
  id: string;
  name: string;
  phone: string;
  lineId?: string;
} | null;

type SearchCandidate = {
  patient_id: string;
  patient_name: string;
};

// ─── メインページ ───────────────────────────────────────

export default function PatientInfoChangePage() {
  const [activeTab, setActiveTab] = useState<TabType>("name-change");

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">
            患者情報変更・統合
          </h1>
          <p className="text-xs text-slate-500">
            患者の氏名変更やアカウント統合を行います。
          </p>
        </div>

        <Link
          href="/admin/kartesearch"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
        >
          ← カルテ検索へ
        </Link>
      </header>

      {/* タブ切替 */}
      <div className="border-b border-slate-200 flex gap-0">
        <TabButton
          active={activeTab === "name-change"}
          onClick={() => setActiveTab("name-change")}
          label="氏名変更"
        />
        <TabButton
          active={activeTab === "merge"}
          onClick={() => setActiveTab("merge")}
          label="患者統合"
        />
      </div>

      {activeTab === "name-change" && <NameChangeSection />}
      {activeTab === "merge" && <MergeSection />}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

// ─── 氏名変更セクション ──────────────────────────────────

function NameChangeSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"id" | "name">("id");
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo>(null);

  const [newName, setNewName] = useState("");
  const [newNameKana, setNewNameKana] = useState("");

  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setCandidates([]);
    setSelectedPatient(null);
    setNewName("");
    setNewNameKana("");

    try {
      const res = await fetch(
        `/api/admin/patient-lookup?q=${encodeURIComponent(searchQuery.trim())}&type=${searchType}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.found) {
        // 単一結果 → 直接選択
        await loadPatientDetail(data.found.patient.id);
      } else if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
      } else {
        setError("該当する患者が見つかりませんでした");
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadPatientDetail(patientId: string) {
    setLoading(true);
    setError("");
    setCandidates([]);

    try {
      const res = await fetch(
        `/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!data.ok || !data.patient) {
        throw new Error("患者情報の取得に失敗しました");
      }

      setSelectedPatient({
        id: data.patient.id,
        name: data.patient.name || "",
        kana: data.patient.kana || "",
        phone: data.patient.phone || "",
        lineId: data.patient.lineId || undefined,
      });
      setNewName(data.patient.name || "");
      setNewNameKana(data.patient.kana || "");
    } catch (e: any) {
      setError(String(e?.message || e));
      setSelectedPatient(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    if (!selectedPatient) return;
    if (!newName.trim()) {
      setError("新しい氏名を入力してください");
      return;
    }

    const confirmed = confirm(
      `以下の氏名変更を実行します：\n\n` +
        `患者ID: ${selectedPatient.id}\n` +
        `現在の氏名: ${selectedPatient.name || "（未登録）"}\n` +
        `現在のカナ: ${selectedPatient.kana || "（未登録）"}\n\n` +
        `↓ 変更後 ↓\n\n` +
        `新しい氏名: ${newName.trim()}\n` +
        `新しいカナ: ${newNameKana.trim()}\n\n` +
        `answerers, intake(全レコード), reservationsの氏名を一括更新します。\nよろしいですか？`
    );
    if (!confirmed) return;

    setExecuting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/patient-name-change", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          new_name: newName.trim(),
          new_name_kana: newNameKana.trim(),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "氏名変更に失敗しました");
      }

      setSuccess(
        `氏名変更が完了しました。\n` +
          `「${data.previous?.name || ""}」→「${newName.trim()}」`
      );

      // 変更後の情報で表示を更新
      setSelectedPatient((prev) =>
        prev
          ? { ...prev, name: newName.trim(), kana: newNameKana.trim() }
          : null
      );
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 whitespace-pre-line">
          {success}
        </div>
      )}

      {/* 検索 */}
      <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">患者検索</h2>
        <p className="text-xs text-slate-500">
          Patient IDまたは氏名で患者を検索します。
        </p>

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <div className="flex gap-3 text-xs text-slate-600">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === "id"}
                  onChange={() => setSearchType("id")}
                  disabled={loading || executing}
                />
                PID
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === "name"}
                  onChange={() => setSearchType("name")}
                  disabled={loading || executing}
                />
                氏名
              </label>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder={
                searchType === "id" ? "例: 20260130001" : "例: 山田太郎"
              }
              className="w-full rounded-lg border border-slate-200 p-2 text-sm font-mono"
              disabled={loading || executing}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || loading || executing}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60 h-[38px]"
          >
            {loading ? "検索中..." : "検索"}
          </button>
        </div>
      </section>

      {/* 候補一覧 */}
      {candidates.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            候補一覧（{candidates.length}件）
          </h2>
          <div className="divide-y divide-slate-100">
            {candidates.map((c) => (
              <button
                key={c.patient_id}
                type="button"
                onClick={() => loadPatientDetail(c.patient_id)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between"
                disabled={loading}
              >
                <div>
                  <span className="text-sm font-medium text-slate-800">
                    {c.patient_name || "（氏名なし）"}
                  </span>
                  <span className="ml-2 text-xs text-slate-400 font-mono">
                    {c.patient_id}
                  </span>
                </div>
                <span className="text-xs text-blue-600">選択 →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 選択済み患者 & 変更フォーム */}
      {selectedPatient && (
        <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">氏名変更</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* 現在の情報 */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                現在の情報
              </h3>
              <div className="text-sm">
                <span className="text-slate-500">PID：</span>
                <span className="font-mono">{selectedPatient.id}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">氏名：</span>
                <span className="font-medium">
                  {selectedPatient.name || "（未登録）"}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">カナ：</span>
                <span>{selectedPatient.kana || "（未登録）"}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">TEL：</span>
                <span className="font-mono">
                  {selectedPatient.phone || "（未登録）"}
                </span>
              </div>
            </div>

            {/* 新しい情報入力 */}
            <div className="p-4 bg-blue-50 rounded-xl space-y-3">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                変更後
              </h3>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 block">
                  新しい氏名
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: 山田太郎"
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                  disabled={executing}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 block">
                  新しいカナ
                </label>
                <input
                  type="text"
                  value={newNameKana}
                  onChange={(e) => setNewNameKana(e.target.value)}
                  placeholder="例: ヤマダタロウ"
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                  disabled={executing}
                />
              </div>
            </div>
          </div>

          {/* 変更プレビュー */}
          {(newName.trim() !== selectedPatient.name ||
            newNameKana.trim() !== selectedPatient.kana) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-amber-800">
                <span>変更内容：</span>
              </div>
              {newName.trim() !== selectedPatient.name && (
                <div className="mt-1 text-amber-700">
                  氏名：
                  <span className="line-through text-slate-400">
                    {selectedPatient.name || "（空）"}
                  </span>
                  {" → "}
                  <span className="font-medium">{newName.trim()}</span>
                </div>
              )}
              {newNameKana.trim() !== selectedPatient.kana && (
                <div className="mt-1 text-amber-700">
                  カナ：
                  <span className="line-through text-slate-400">
                    {selectedPatient.kana || "（空）"}
                  </span>
                  {" → "}
                  <span className="font-medium">
                    {newNameKana.trim() || "（空）"}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleExecute}
            disabled={
              !newName.trim() ||
              executing ||
              (newName.trim() === selectedPatient.name &&
                newNameKana.trim() === selectedPatient.kana)
            }
            className="w-full rounded-lg bg-blue-600 text-white px-4 py-3 text-sm font-medium disabled:opacity-60 hover:bg-blue-700 transition"
          >
            {executing ? "変更中..." : "氏名変更を実行"}
          </button>
        </section>
      )}
    </div>
  );
}

// ─── 患者統合セクション（既存機能の移行） ────────────────────

function MergeSection() {
  const [oldPatientId, setOldPatientId] = useState("");
  const [newPatientId, setNewPatientId] = useState("");

  const [loadingOld, setLoadingOld] = useState(false);
  const [loadingNew, setLoadingNew] = useState(false);
  const [merging, setMerging] = useState(false);

  const [oldPatient, setOldPatient] = useState<MergePatient>(null);
  const [newPatient, setNewPatient] = useState<MergePatient>(null);

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

      setSuccess(
        "統合が完了しました。新しいLINE UIDで統合先患者にアクセスできます。"
      );

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
    <div className="space-y-4">
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
          <h2 className="text-sm font-semibold text-slate-800">
            統合元（旧）
          </h2>
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
                <span
                  className={`font-medium ${newPatient && oldPatient.name && newPatient.name && oldPatient.name === newPatient.name ? "text-red-600 font-bold" : ""}`}
                >
                  {oldPatient.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500">TEL：</span>
                <span
                  className={`font-mono ${newPatient && oldPatient.phone && newPatient.phone && oldPatient.phone === newPatient.phone ? "text-red-600 font-bold" : ""}`}
                >
                  {oldPatient.phone}
                </span>
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
          <h2 className="text-sm font-semibold text-slate-800">
            統合先（新）
          </h2>
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
                <span
                  className={`font-medium ${oldPatient && oldPatient.name && newPatient.name && oldPatient.name === newPatient.name ? "text-red-600 font-bold" : ""}`}
                >
                  {newPatient.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500">TEL：</span>
                <span
                  className={`font-mono ${oldPatient && oldPatient.phone && newPatient.phone && oldPatient.phone === newPatient.phone ? "text-red-600 font-bold" : ""}`}
                >
                  {newPatient.phone}
                </span>
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
            統合元の全データ（問診履歴・購入履歴・LINE User
            ID）を統合先に統合します。
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
    </div>
  );
}
