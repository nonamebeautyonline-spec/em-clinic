"use client";

// app/admin/reservations/google-calendar-settings.tsx
// Google Calendar連携設定コンポーネント
// 医師一覧と連携ステータスの表示、OAuth2フロー開始、同期実行、連携解除

import { useState, useEffect, useCallback } from "react";

interface Doctor {
  doctor_id: string;
  doctor_name: string;
  google_calendar_id: string | null;
  google_token_expires_at: string | null;
}

interface SyncResult {
  ok: boolean;
  doctor_id: string;
  sync: {
    google_to_clinic: {
      events_found: number;
      overrides_created: number;
    };
    clinic_to_google: {
      reservations_found: number;
      events_created: number;
      already_synced: number;
    };
  };
}

export default function GoogleCalendarSettings() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null); // 同期中の医師ID
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null); // 連携解除中の医師ID

  // 医師一覧を取得
  const loadDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/doctors", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("医師一覧の取得に失敗しました");
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Google連携を開始（OAuth2フロー）
  const handleConnect = async (doctorId: string) => {
    try {
      const res = await fetch(
        `/api/admin/google-calendar/auth?doctor_id=${encodeURIComponent(doctorId)}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "認証URL取得に失敗しました");
      }
      const data = await res.json();
      // Googleの認証画面にリダイレクト
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // 同期実行
  const handleSync = async (doctorId: string) => {
    setSyncing(doctorId);
    setSyncResult(null);
    setError("");

    try {
      const res = await fetch("/api/admin/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "同期に失敗しました");
      }

      const data: SyncResult = await res.json();
      setSyncResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "同期エラーが発生しました");
    } finally {
      setSyncing(null);
    }
  };

  // 連携解除
  const handleDisconnect = async (doctorId: string) => {
    if (!confirm("Google Calendar連携を解除しますか？")) return;

    setDisconnecting(doctorId);
    setError("");

    try {
      const res = await fetch("/api/admin/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          doctor_id: doctorId,
          google_calendar_id: null,
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "連携解除に失敗しました");
      }

      // 医師一覧を再取得
      await loadDoctors();
      setSyncResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "連携解除エラーが発生しました");
    } finally {
      setDisconnecting(null);
    }
  };

  // トークン有効期限を表示用にフォーマット
  const formatExpiry = (expiresAt: string | null): string => {
    if (!expiresAt) return "-";
    const date = new Date(expiresAt);
    const now = new Date();
    if (date <= now) return "期限切れ（次回同期時に自動更新）";
    return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Google Calendar 連携設定
        </h2>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            x
          </button>
        </div>
      )}

      {/* 同期結果 */}
      {syncResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-green-800">同期完了</h3>
            <button
              onClick={() => setSyncResult(null)}
              className="text-green-500 hover:text-green-700 text-sm"
            >
              x
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-green-700 font-medium">Google → em-clinic</p>
              <p className="text-green-600">
                取得イベント: {syncResult.sync.google_to_clinic.events_found}件
              </p>
              <p className="text-green-600">
                新規ブロック: {syncResult.sync.google_to_clinic.overrides_created}件
              </p>
            </div>
            <div>
              <p className="text-green-700 font-medium">em-clinic → Google</p>
              <p className="text-green-600">
                対象予約: {syncResult.sync.clinic_to_google.reservations_found}件
              </p>
              <p className="text-green-600">
                新規追加: {syncResult.sync.clinic_to_google.events_created}件
              </p>
              <p className="text-green-600">
                同期済み: {syncResult.sync.clinic_to_google.already_synced}件
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 医師一覧 */}
      {doctors.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          登録されている医師がいません
        </div>
      ) : (
        <div className="space-y-3">
          {doctors.map((doctor) => {
            const isConnected = !!doctor.google_calendar_id;
            const isSyncing = syncing === doctor.doctor_id;
            const isDisconnecting = disconnecting === doctor.doctor_id;

            return (
              <div
                key={doctor.doctor_id}
                className="bg-white border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 連携ステータスアイコン */}
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isConnected ? "bg-green-500" : "bg-slate-300"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-slate-900">
                        {doctor.doctor_name || doctor.doctor_id}
                      </p>
                      <p className="text-xs text-slate-500">
                        ID: {doctor.doctor_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        {/* 連携済み: トークン有効期限 */}
                        <span className="text-xs text-slate-500 hidden md:inline">
                          トークン: {formatExpiry(doctor.google_token_expires_at)}
                        </span>

                        {/* 同期実行ボタン */}
                        <button
                          onClick={() => handleSync(doctor.doctor_id)}
                          disabled={isSyncing}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
                            isSyncing
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isSyncing ? "同期中..." : "同期実行"}
                        </button>

                        {/* 連携解除ボタン */}
                        <button
                          onClick={() => handleDisconnect(doctor.doctor_id)}
                          disabled={isDisconnecting}
                          className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
                            isDisconnecting
                              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                              : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                          }`}
                        >
                          {isDisconnecting ? "解除中..." : "連携解除"}
                        </button>
                      </>
                    ) : (
                      /* 未連携: Google連携ボタン */
                      <button
                        onClick={() => handleConnect(doctor.doctor_id)}
                        className="px-4 py-1.5 text-sm rounded-lg font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-4 h-4"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Google連携
                      </button>
                    )}
                  </div>
                </div>

                {/* 連携済みの場合: カレンダーID表示 */}
                {isConnected && (
                  <div className="mt-2 text-xs text-slate-500">
                    カレンダーID: {doctor.google_calendar_id}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 注意事項 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-2">注意事項</p>
        <ul className="list-disc list-inside space-y-1">
          <li>同期は今日から30日後までの予定を対象とします</li>
          <li>Googleカレンダーの予定は「外部予定あり」としてem-clinicに反映されます</li>
          <li>em-clinicの予約はGoogleカレンダーにイベントとして追加されます</li>
          <li>同期は手動実行です。定期的に同期ボタンを押してください</li>
        </ul>
      </div>
    </div>
  );
}
