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
  call_status?: string;
  [key: string]: any; // その他のフィールド
}

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // デフォルトは今日の日付
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    loadReservations(token);
  }, [router, selectedDate]);

  const loadReservations = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/reservations?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
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

      <div className="text-xs text-slate-400 mt-4">
        合計 {reservations.length} 件の予約
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
