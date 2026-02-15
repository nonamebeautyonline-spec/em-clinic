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
  const [lineRemindSending, setLineRemindSending] = useState(false);
  const [lineRemindResult, setLineRemindResult] = useState<ReminderSendResult & { testOnly?: boolean } | null>(null);

  // チェックボックス用（リマインド送信対象選択）
  const [checkedPatientIds, setCheckedPatientIds] = useState<Set<string>>(new Set());

  // デフォルトは今日の日付
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    // 日付変更時は付帯情報・送信結果をリセット
    setReminderPreview(null);
    setLineRemindResult(null);
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
      // 全患者をチェック状態で初期化
      if (data.reminders) {
        setCheckedPatientIds(new Set(data.reminders.map((r: ReminderData) => r.patient_id)));
      }
    } catch (err) {
      console.error("Reminder preview error:", err);
      setError(err instanceof Error ? err.message : "付帯情報作成に失敗しました");
    } finally {
      setLoadingReminder(false);
    }
  };

  // LINE リマインド送信（選択者 or テスト）
  const handleLineRemindSend = async (testOnly: boolean) => {
    setLineRemindSending(true);
    try {
      const payload: Record<string, unknown> = { date: selectedDate, testOnly };
      if (!testOnly && checkedPatientIds.size > 0) {
        payload.patient_ids = [...checkedPatientIds];
      }
      const res = await fetch("/api/admin/reservations/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "送信エラー");
      }
      const data = await res.json();
      setLineRemindResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setLineRemindSending(false);
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
        <div className="hidden md:flex ml-auto gap-2">
          <button
            onClick={handleReminderPreview}
            disabled={loadingReminder || reservations.length === 0}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              loadingReminder || reservations.length === 0
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {loadingReminder ? "読込中..." : "リマインドを行う"}
          </button>
        </div>
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

      {/* 診療リマインドプレビュー */}
      {reminderPreview && (
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
            <h2 className="text-lg font-semibold text-purple-900">
              {formatDate(selectedDate)} 診療リマインド付帯情報
            </h2>
            <p className="text-sm text-purple-700 mt-1">
              {reminderPreview.total}件のリマインド対象者です。
            </p>
          </div>


          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={reminderPreview ? checkedPatientIds.size === reminderPreview.reminders.length : false}
                      onChange={(e) => {
                        if (e.target.checked && reminderPreview) {
                          setCheckedPatientIds(new Set(reminderPreview.reminders.map(r => r.patient_id)));
                        } else {
                          setCheckedPatientIds(new Set());
                        }
                      }}
                      className="w-4 h-4 accent-green-600"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    予約時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    患者名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    PID
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
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={checkedPatientIds.has(reminder.patient_id)}
                          onChange={(e) => {
                            const next = new Set(checkedPatientIds);
                            if (e.target.checked) next.add(reminder.patient_id);
                            else next.delete(reminder.patient_id);
                            setCheckedPatientIds(next);
                          }}
                          className="w-4 h-4 accent-green-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                        {formatTime(reminder.reserved_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {reminder.patient_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        <a
                          href={`/admin/line/talk?pid=${reminder.patient_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {reminder.patient_id}
                        </a>
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


          {/* LINE リマインド送信結果（インライン表示） */}
          {lineRemindResult && (
            <div className={`mx-6 mt-4 p-4 rounded-lg border ${lineRemindResult.testOnly ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-slate-800">
                  {lineRemindResult.testOnly ? "テスト送信結果" : "LINE リマインド送信完了"}
                </h3>
                <button onClick={() => setLineRemindResult(null)} className="text-slate-400 hover:text-slate-600 text-sm">×</button>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">送信成功: {lineRemindResult.sent}件</span>
                {lineRemindResult.noUid > 0 && <span className="text-yellow-600 font-medium">LINE未連携: {lineRemindResult.noUid}件</span>}
                {lineRemindResult.failed > 0 && <span className="text-red-600 font-medium">失敗: {lineRemindResult.failed}件</span>}
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setReminderPreview(null); setLineRemindResult(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 underline"
              >
                戻る
              </button>
              <span className="text-sm text-slate-500">
                選択中: <span className="font-semibold text-green-600">{checkedPatientIds.size}人</span>
                / {reminderPreview.total}人
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLineRemindSend(true)}
                disabled={lineRemindSending}
                className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 font-medium"
              >
                {lineRemindSending ? "送信中..." : "テスト送信（管理者のみ）"}
              </button>
              <button
                onClick={() => handleLineRemindSend(false)}
                disabled={lineRemindSending || checkedPatientIds.size === 0}
                className={`px-5 py-2 text-sm rounded-lg font-medium ${
                  lineRemindSending || checkedPatientIds.size === 0
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {lineRemindSending ? "送信中..." : `LINE リマインド送信（${checkedPatientIds.size}人）`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プレビュー表示時は予約カードを非表示 */}
      {!reminderPreview && <div className="space-y-2">
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
      </div>}


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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
