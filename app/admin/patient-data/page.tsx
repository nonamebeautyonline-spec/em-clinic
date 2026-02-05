"use client";

import { useState } from "react";

interface Reservation {
  id: number;
  reserve_id: string;
  reserved_date: string;
  reserved_time: string;
  status: string;
  patient_name: string;
}

interface Intake {
  id: number;
  patient_name: string;
  reserved_date: string | null;
  reserved_time: string | null;
  reserve_id: string | null;
  created_at: string;
}

interface PatientData {
  patient_id: string;
  reservations: Reservation[];
  intake: Intake | null;
}

export default function PatientDataPage() {
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PatientData | null>(null);
  const [error, setError] = useState("");
  const [actionResult, setActionResult] = useState("");

  const handleSearch = async () => {
    if (!patientId.trim()) return;

    setLoading(true);
    setError("");
    setData(null);
    setActionResult("");

    try {
      const res = await fetch(
        `/api/admin/delete-patient-data?patient_id=${encodeURIComponent(patientId.trim())}`,
        {
          credentials: "include",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "検索失敗");
        return;
      }

      setData(json);
    } catch {
      setError("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (options: {
    deleteReservation: boolean;
    deleteIntake: boolean;
    syncGas: boolean;
  }) => {
    if (!data?.patient_id) return;

    const confirmMsg = [];
    if (options.deleteReservation) confirmMsg.push("予約をキャンセル");
    if (options.deleteIntake) confirmMsg.push("問診を削除");
    if (options.syncGas) confirmMsg.push("GASシートから削除");

    if (!confirm(`以下の操作を実行しますか？\n\n${confirmMsg.join("\n")}\n\n患者ID: ${data.patient_id}`)) {
      return;
    }

    setLoading(true);
    setActionResult("");

    try {
      const res = await fetch("/api/admin/delete-patient-data", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: data.patient_id,
          delete_reservation: options.deleteReservation,
          delete_intake: options.deleteIntake,
          sync_gas: options.syncGas,
        }),
      });

      const json = await res.json();

      if (json.ok) {
        setActionResult("✅ 処理完了");
        // 再検索
        handleSearch();
      } else {
        setActionResult(`❌ エラー: ${json.errors?.join(", ") || "不明"}`);
      }
    } catch {
      setActionResult("❌ 通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const activeReservations = data?.reservations?.filter(r => r.status !== "canceled") || [];
  const canceledReservations = data?.reservations?.filter(r => r.status === "canceled") || [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">患者データ管理</h1>

      {/* 検索フォーム */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="患者IDを入力"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !patientId.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "検索中..." : "検索"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {actionResult && (
        <div className={`px-4 py-3 rounded-lg mb-6 ${
          actionResult.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {actionResult}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* 患者情報 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold text-lg mb-3">患者ID: {data.patient_id}</h2>
            {data.intake && (
              <div className="text-gray-600">
                <p>氏名: {data.intake.patient_name || "-"}</p>
                <p>問診登録日: {data.intake.created_at?.slice(0, 10) || "-"}</p>
              </div>
            )}
          </div>

          {/* アクティブな予約 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b bg-blue-50">
              <h3 className="font-bold">有効な予約 ({activeReservations.length}件)</h3>
            </div>
            {activeReservations.length > 0 ? (
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">予約ID</th>
                      <th className="pb-2">日付</th>
                      <th className="pb-2">時間</th>
                      <th className="pb-2">ステータス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReservations.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 font-mono text-xs">{r.reserve_id}</td>
                        <td className="py-2">{r.reserved_date}</td>
                        <td className="py-2">{r.reserved_time}</td>
                        <td className="py-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-gray-500">有効な予約はありません</div>
            )}
          </div>

          {/* キャンセル済み予約 */}
          {canceledReservations.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="font-bold text-gray-600">キャンセル済み予約 ({canceledReservations.length}件)</h3>
              </div>
              <div className="p-4">
                <table className="w-full text-sm text-gray-500">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2">予約ID</th>
                      <th className="pb-2">日付</th>
                      <th className="pb-2">時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canceledReservations.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 font-mono text-xs">{r.reserve_id}</td>
                        <td className="py-2">{r.reserved_date}</td>
                        <td className="py-2">{r.reserved_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 問診情報 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b bg-yellow-50">
              <h3 className="font-bold">問診データ</h3>
            </div>
            {data.intake ? (
              <div className="p-4">
                <p><span className="text-gray-500">ID:</span> {data.intake.id}</p>
                <p><span className="text-gray-500">氏名:</span> {data.intake.patient_name || "-"}</p>
                <p><span className="text-gray-500">予約日:</span> {data.intake.reserved_date || "-"}</p>
                <p><span className="text-gray-500">予約時間:</span> {data.intake.reserved_time || "-"}</p>
              </div>
            ) : (
              <div className="p-4 text-gray-500">問診データがありません</div>
            )}
          </div>

          {/* 削除アクション */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4 text-red-600">データ削除</h3>
            <div className="flex flex-wrap gap-3">
              {activeReservations.length > 0 && (
                <button
                  onClick={() => handleDelete({ deleteReservation: true, deleteIntake: false, syncGas: false })}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  予約をキャンセル（DB）
                </button>
              )}
              {activeReservations.length > 0 && (
                <button
                  onClick={() => handleDelete({ deleteReservation: true, deleteIntake: false, syncGas: true })}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  予約をキャンセル + GAS削除
                </button>
              )}
              {data.intake && (
                <button
                  onClick={() => handleDelete({ deleteReservation: false, deleteIntake: true, syncGas: false })}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  問診を削除
                </button>
              )}
              {(activeReservations.length > 0 || data.intake) && (
                <button
                  onClick={() => handleDelete({ deleteReservation: true, deleteIntake: true, syncGas: true })}
                  disabled={loading}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
                >
                  全削除（予約+問診+GAS）
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
