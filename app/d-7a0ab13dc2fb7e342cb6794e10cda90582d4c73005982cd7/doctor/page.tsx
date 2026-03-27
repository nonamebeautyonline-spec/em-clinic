"use client";

import { useState, useMemo } from "react";
import { DEMO_PATIENTS, DEMO_RESERVATIONS } from "../_data/mock";

// 用量オプション
const DOSE_OPTIONS = ["2.5mg", "5mg", "7.5mg", "10mg", "15mg"] as const;

// ステータスオプション
const STATUS_OPTIONS = ["OK", "NG"] as const;

// クイックテキスト
const QUICK_TEXTS = [
  { label: "処方許可", text: "副作用がなく、継続使用のため処方。" },
  { label: "副作用説明", text: "主な副作用として吐き気・食欲低下がありますが、多くは1-2週間で軽減されます。" },
  { label: "使用方法", text: "週1回、同じ曜日に皮下注射。腹部・太もも・上腕のいずれかに注射。" },
  { label: "増量検討", text: "現用量で効果不十分のため、次回増量を検討。" },
  { label: "不通", text: "架電するも不通。後日再連絡予定。" },
];

export default function DemoDoctorPage() {
  // 患者選択
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  // カルテフォーム
  const [karteNote, setKarteNote] = useState("");
  const [selectedDose, setSelectedDose] = useState<string>("2.5mg");
  const [karteStatus, setKarteStatus] = useState<"OK" | "NG">("OK");

  // トースト
  const [toast, setToast] = useState<string | null>(null);

  // 選択された患者情報
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return DEMO_PATIENTS.find((p) => p.id === selectedPatientId) ?? null;
  }, [selectedPatientId]);

  // 選択された患者の予約情報
  const patientReservations = useMemo(() => {
    if (!selectedPatientId) return [];
    return DEMO_RESERVATIONS.filter((r) => r.patientId === selectedPatientId);
  }, [selectedPatientId]);

  // トースト表示
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // 保存処理
  const handleSave = () => {
    if (!selectedPatient) return;
    showToast(`${selectedPatient.name} のカルテを保存しました`);
  };

  // クイックテキスト挿入
  const insertQuickText = (text: string) => {
    setKarteNote((prev) => (prev ? prev + "\n" + text : text));
  };

  // 患者選択時のリセット
  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    setKarteNote("");
    setSelectedDose("2.5mg");
    setKarteStatus("OK");
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">簡易カルテ</h1>
        <p className="text-sm text-slate-500 mt-1">
          患者を選択して診察メモ・用量・ステータスを記録します
        </p>
      </div>

      {/* 患者選択 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          患者を選択
        </label>
        <select
          value={selectedPatientId}
          onChange={(e) => handlePatientChange(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- 患者を選択してください --</option>
          {DEMO_PATIENTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}（{p.kana}）— {p.gender} {p.age}歳
            </option>
          ))}
        </select>
      </div>

      {/* 患者情報 + カルテフォーム */}
      {selectedPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左: 患者基本情報 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                {selectedPatient.name.charAt(0)}
              </span>
              {selectedPatient.name}
            </h2>

            <div className="space-y-3">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="性別" value={selectedPatient.gender} />
                <InfoRow label="年齢" value={`${selectedPatient.age}歳`} />
                <InfoRow
                  label="生年月日"
                  value={selectedPatient.birthDate}
                />
                <InfoRow label="電話番号" value={selectedPatient.tel} />
              </div>

              <hr className="border-slate-100" />

              {/* 医療情報 */}
              <h3 className="text-sm font-semibold text-slate-700 mt-2">
                医療情報
              </h3>
              <div className="space-y-2">
                <InfoRow label="アレルギー" value={selectedPatient.allergies} />
                <InfoRow
                  label="現在の服薬"
                  value={selectedPatient.currentMeds}
                />
                <InfoRow
                  label="GLP-1履歴"
                  value={selectedPatient.glp1History}
                />
                <InfoRow
                  label="既往歴"
                  value={selectedPatient.medHistory}
                />
              </div>

              <hr className="border-slate-100" />

              {/* タグ */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedPatient.tags.map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-block px-2.5 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>

              {/* メモ */}
              {selectedPatient.memo && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-amber-700 mb-0.5">
                    メモ
                  </p>
                  <p className="text-sm text-amber-900">
                    {selectedPatient.memo}
                  </p>
                </div>
              )}
            </div>

            {/* 予約履歴 */}
            {patientReservations.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  予約履歴
                </h3>
                <div className="space-y-2">
                  {patientReservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="text-slate-600">
                        {r.date} {r.time} — {r.menu}
                      </span>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.status === "OK"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "NG"
                              ? "bg-red-100 text-red-700"
                              : r.status === "キャンセル"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右: カルテフォーム */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              簡易カルテ入力
            </h2>

            <div className="space-y-5">
              {/* ステータス選択 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ステータス
                </label>
                <div className="flex gap-3">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => setKarteStatus(status)}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        karteStatus === status
                          ? status === "OK"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-red-600 text-white border-red-600"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* 用量選択 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  用量選択
                </label>
                <div className="flex flex-wrap gap-2">
                  {DOSE_OPTIONS.map((dose) => (
                    <button
                      key={dose}
                      onClick={() => setSelectedDose(dose)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedDose === dose
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {dose}
                    </button>
                  ))}
                </div>
              </div>

              {/* クイックテキスト */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  クイックテキスト
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEXTS.map((qt) => (
                    <button
                      key={qt.label}
                      onClick={() => insertQuickText(qt.text)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* メモ */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  診察メモ
                </label>
                <textarea
                  value={karteNote}
                  onChange={(e) => setKarteNote(e.target.value)}
                  rows={8}
                  placeholder="診察内容・所見・処方内容を入力..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* サマリー */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  入力サマリー
                </h3>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    <span className="font-medium">患者:</span>{" "}
                    {selectedPatient.name}
                  </p>
                  <p>
                    <span className="font-medium">ステータス:</span>{" "}
                    <span
                      className={
                        karteStatus === "OK"
                          ? "text-emerald-600 font-bold"
                          : "text-red-600 font-bold"
                      }
                    >
                      {karteStatus}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">用量:</span> マンジャロ{" "}
                    {selectedDose}
                  </p>
                  <p>
                    <span className="font-medium">メモ:</span>{" "}
                    {karteNote
                      ? karteNote.length > 50
                        ? karteNote.slice(0, 50) + "..."
                        : karteNote
                      : "（未入力）"}
                  </p>
                </div>
              </div>

              {/* 保存ボタン */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setKarteNote("");
                    setSelectedDose("2.5mg");
                    setKarteStatus("OK");
                  }}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  リセット
                </button>
                <button
                  onClick={handleSave}
                  disabled={!karteNote.trim()}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 未選択時 */
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">
            上のドロップダウンから患者を選択してください
          </p>
        </div>
      )}
    </div>
  );
}

// 情報表示用コンポーネント
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}
