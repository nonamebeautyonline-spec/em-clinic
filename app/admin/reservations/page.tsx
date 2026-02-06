"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Reservation {
  id: string;
  patient_id: string;
  patient_name: string;
  reserved_time: string;
  status: string;
  phone: string;
  lstep_uid?: string;
  line_uid?: string;
  call_status?: string;
  [key: string]: any; // その他のフィールド
}

interface ReminderSendResult {
  total: number;
  sent: number;
  noUid: number;
  failed: number;
  results: { patient_id: string; patient_name: string; status: "sent" | "no_uid" | "failed" }[];
}

interface ReminderData {
  lstep_id: string;
  line_uid: string;
  patient_id: string;
  patient_name: string;
  reserved_time: string;
  phone: string;
  message: string;
  doctor_status: string; // 前回診察：OK/NG
  call_status: string; // 電話状態：不通など
  prescription_menu: string; // 処方メニュー
}

interface ReminderPreviewResult {
  date: string;
  reminders: ReminderData[];
  total: number;
  errors: string[];
}

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reminderPreview, setReminderPreview] = useState<ReminderPreviewResult | null>(null);
  const [loadingReminder, setLoadingReminder] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSendResult, setReminderSendResult] = useState<ReminderSendResult | null>(null);

  // デフォルトは今日の日付
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    // 認証はlayout.tsxで行うため、ここではデータ取得のみ
    loadReservations();
  }, [selectedDate]);

  const loadReservations = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/reservations?date=${selectedDate}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `予約データ取得失敗 (${res.status})`);
      }

      const data = await res.json();
      setReservations(data.reservations || []);
    } catch (err) {
      console.error("Reservations fetch error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setReservations([]); // エラー時は空配列にリセット
    } finally {
      setLoading(false);
    }
  };

  const getLStepUrl = (lstepUid?: string) => {
    if (!lstepUid) return null;
    return `https://manager.linestep.net/line/visual?member=${encodeURIComponent(lstepUid)}`;
  };

  const formatTime = (timeString: string) => {
    // "HH:MM:SS"形式をそのまま表示（秒は省略）
    if (!timeString) return "";
    const parts = timeString.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  };

  const handleReminderPreview = async () => {
    setLoadingReminder(true);
    setError("");
    setReminderPreview(null);

    try {
      const res = await fetch("/api/admin/reservations/reminder-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setReminderPreview(data);
    } catch (err) {
      console.error("Reminder preview error:", err);
      setError(err instanceof Error ? err.message : "付帯情報作成に失敗しました");
    } finally {
      setLoadingReminder(false);
    }
  };

  const handleSendReminder = async () => {
    if (!confirm(`${formatDate(selectedDate)}の予約者${reservations.length}名にLINEリマインドを送信しますか？`)) return;

    setSendingReminder(true);
    setReminderSendResult(null);

    try {
      const res = await fetch("/api/admin/reservations/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!res.ok) {
        throw new Error("リマインド送信に失敗しました");
      }

      const data = await res.json();
      setReminderSendResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSendingReminder(false);
    }
  };

  const handleDownloadReminderCSV = async () => {
    if (!reminderPreview) return;

    try {
      const res = await fetch("/api/admin/reservations/reminder-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reminders: reminderPreview.reminders,
          date: selectedDate,
        }),
      });

      if (!res.ok) {
        throw new Error("診療リマインドCSV生成に失敗しました");
      }

      // CSVダウンロード
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reminder_${selectedDate.replace(/-/g, "")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV download error:", err);
      alert(err instanceof Error ? err.message : "ダウンロードに失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold mb-2">予約リスト</h1>

      {/* 日付選択 */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium text-slate-700">日付選択:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <span className="text-sm text-slate-600">{formatDate(selectedDate)}</span>
        <button
          onClick={() => setSelectedDate(today)}
          className="px-3 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          今日
        </button>
        <button
          onClick={handleReminderPreview}
          disabled={loadingReminder || reservations.length === 0}
          className={`hidden md:inline-flex ml-auto px-4 py-2 text-sm rounded-lg font-medium ${
            loadingReminder || reservations.length === 0
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {loadingReminder ? "作成中..." : "📋 付帯情報を作成"}
        </button>
        <button
          onClick={handleSendReminder}
          disabled={sendingReminder || reservations.length === 0}
          className={`px-4 py-2 text-sm rounded-lg font-medium ${
            sendingReminder || reservations.length === 0
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {sendingReminder ? "送信中..." : "LINE リマインド送信"}
        </button>
      </div>

      {/* 予約人数表示 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-600 mb-1">
              {selectedDate === today ? "本日" : formatDate(selectedDate)}の予約人数
            </div>
            <div className="text-4xl font-bold text-slate-900">
              {reservations.length}
              <span className="text-lg text-slate-500 ml-2">件</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            {reservations.filter(r => r.status === "pending").length > 0 && (
              <div className="text-sm text-slate-600">
                予約中: <span className="font-semibold text-slate-900">
                  {reservations.filter(r => r.status === "pending").length}件
                </span>
              </div>
            )}
            {reservations.filter(r => r.status === "OK" || r.status === "NG").length > 0 && (
              <div className="text-sm text-slate-600">
                完了: <span className="font-semibold text-green-700">
                  {reservations.filter(r => r.status === "OK" || r.status === "NG").length}件
                </span>
              </div>
            )}
            {reservations.filter(r => r.status === "canceled").length > 0 && (
              <div className="text-sm text-slate-600">
                キャンセル: <span className="font-semibold text-red-700">
                  {reservations.filter(r => r.status === "canceled").length}件
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* LINE リマインド送信結果 */}
      {reminderSendResult && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">LINE リマインド送信結果</h3>
            <button onClick={() => setReminderSendResult(null)} className="text-slate-400 hover:text-slate-600">×</button>
          </div>
          <div className="flex gap-4 text-sm mb-3">
            <span className="text-green-600 font-medium">送信済: {reminderSendResult.sent}件</span>
            <span className="text-yellow-600 font-medium">UID無: {reminderSendResult.noUid}件</span>
            {reminderSendResult.failed > 0 && (
              <span className="text-red-600 font-medium">失敗: {reminderSendResult.failed}件</span>
            )}
            <span className="text-slate-500">合計: {reminderSendResult.total}件</span>
          </div>
          {(reminderSendResult.noUid > 0 || reminderSendResult.failed > 0) && (
            <div className="max-h-32 overflow-y-auto text-xs space-y-1">
              {reminderSendResult.results
                .filter(r => r.status !== "sent")
                .map((r, i) => (
                  <div key={i} className={`px-2 py-1 rounded ${r.status === "no_uid" ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                    {r.patient_name} ({r.patient_id}) - {r.status === "no_uid" ? "LINE UID未取得" : "送信失敗"}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 診療リマインドプレビュー（スマホでは非表示） */}
      {reminderPreview && (
        <div className="hidden md:block mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
            <h2 className="text-lg font-semibold text-purple-900">診療リマインド付帯情報</h2>
            <p className="text-sm text-purple-700 mt-1">
              {reminderPreview.total}件のリマインドを作成します。問題なければCSVをダウンロードしてLステップにインポートしてください。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    予約時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    患者名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    LステップID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    LINE UID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    前回診察
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    電話状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    処方メニュー
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {reminderPreview.reminders.map((reminder, i) => {
                  const isNG = reminder.doctor_status === "NG";
                  const isUnreachable = reminder.call_status === "unreachable" || reminder.call_status === "不通";
                  const rowClass = isNG || isUnreachable ? "bg-yellow-50" : "hover:bg-slate-50";

                  return (
                    <tr key={i} className={rowClass}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                        {formatTime(reminder.reserved_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {reminder.patient_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {reminder.lstep_id ? (
                          <a
                            href={getLStepUrl(reminder.lstep_id) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700 hover:underline"
                          >
                            ✅ {reminder.lstep_id}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {reminder.line_uid ? (
                          <span className="text-blue-600" title={reminder.line_uid}>
                            {reminder.line_uid.slice(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reminder.doctor_status ? (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isNG
                                ? "bg-red-100 text-red-800"
                                : reminder.doctor_status === "OK"
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {reminder.doctor_status}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reminder.call_status ? (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isUnreachable
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {reminder.call_status}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {reminder.prescription_menu || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {reminderPreview.errors.length > 0 && (
            <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ 警告</h3>
              <ul className="list-disc list-inside text-xs text-yellow-700 space-y-1">
                {reminderPreview.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              リマインド対象: <span className="font-semibold text-purple-600">{reminderPreview.total}件</span>
              {reminderPreview.errors.length > 0 && (
                <span className="ml-4 text-yellow-600">
                  スキップ: {reminderPreview.errors.length}件
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReminderPreview(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 underline"
              >
                キャンセル
              </button>
              <button
                onClick={handleDownloadReminderCSV}
                disabled={reminderPreview.total === 0}
                className={`px-6 py-3 rounded-lg font-medium ${
                  reminderPreview.total === 0
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                📥 診療リマインドCSVをダウンロード
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {reservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
            {selectedDate === today ? "本日" : formatDate(selectedDate)}の予約はありません
          </div>
        ) : (
          reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 時間 */}
                  <div className="text-lg font-semibold text-slate-900 w-20">
                    {formatTime(reservation.reserved_time)}
                  </div>

                  {/* 患者情報 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/patients/${reservation.patient_id}`)}
                        className="text-slate-900 hover:text-slate-600 hover:underline font-medium"
                      >
                        {reservation.patient_name || "名前なし"}
                      </button>
                      <span className="text-xs text-slate-400 font-mono">
                        {reservation.patient_id}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">{reservation.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* ステータス（不通の場合は不通を優先表示） */}
                  {reservation.call_status === "unreachable" ? (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                      不通
                    </span>
                  ) : (
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        reservation.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : reservation.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {reservation.status === "completed"
                        ? "完了"
                        : reservation.status === "cancelled"
                        ? "キャンセル"
                        : "予約中"}
                    </span>
                  )}

                  {/* Lステップリンク */}
                  {getLStepUrl(reservation.lstep_uid) && (
                    <a
                      href={getLStepUrl(reservation.lstep_uid)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                    >
                      Lステップ
                    </a>
                  )}

                  {/* カルテ詳細ボタン */}
                  <button
                    onClick={() => setSelectedReservation(reservation)}
                    className="px-3 py-1 text-xs bg-slate-500 text-white rounded-full hover:bg-slate-600 transition-colors"
                  >
                    詳細
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* カルテモーダル */}
      {selectedReservation && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelectedReservation(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-[90vw] md:w-[70vw] p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-lg font-semibold">
                {selectedReservation.patient_name} のカルテ
              </h2>
              <button
                onClick={() => setSelectedReservation(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* 基本情報 */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">基本情報</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">患者ID:</span>
                    <span className="ml-2 font-mono">{selectedReservation.patient_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">電話番号:</span>
                    <span className="ml-2">{selectedReservation.phone || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">予約日時:</span>
                    <span className="ml-2">
                      {selectedReservation.reserved_date} {formatTime(selectedReservation.reserved_time)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">ステータス:</span>
                    <span className="ml-2">{selectedReservation.status}</span>
                  </div>
                </div>
              </div>

              {/* 問診情報（answersに含まれる情報） */}
              {selectedReservation.answers && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">問診情報</h3>
                  <div className="space-y-3 text-sm">
                    {Object.entries(selectedReservation.answers).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600 text-xs mb-1">{key}</div>
                        <div className="text-slate-900">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* メモ */}
              {selectedReservation.note && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">メモ</h3>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-900 whitespace-pre-wrap">
                    {selectedReservation.note}
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex gap-2 pt-4 border-t">
                <a
                  href={`/admin/patients/${selectedReservation.patient_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  患者詳細ページを開く
                </a>
                {selectedReservation.lstep_uid && (
                  <a
                    href={getLStepUrl(selectedReservation.lstep_uid)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Lステップで開く
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
