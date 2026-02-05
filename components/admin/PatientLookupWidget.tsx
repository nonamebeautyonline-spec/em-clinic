"use client";

import { useState, useRef, useEffect } from "react";

interface LatestOrderInfo {
  date: string;
  product: string;
  amount: string;
  payment: string;
  tracking: string;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  refund_status?: string | null;
}

interface ReorderInfo {
  id: number;
  date: string;
  product: string;
  status: string;
}

interface PendingBankInfo {
  product: string;
  date: string;
}

interface OrderHistoryItem {
  date: string;
  product: string;
  refund_status?: string | null;
}

interface PatientResult {
  id: string;
  name: string;
  lstep_uid: string;
  latestOrder: LatestOrderInfo | null;
  orderHistory: OrderHistoryItem[];
  reorders: ReorderInfo[];
  pendingBankTransfer: PendingBankInfo | null;
}

interface Candidate {
  id: string;
  name: string;
}

export default function PatientLookupWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatientResult | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const idInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => idInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = async (searchType: "id" | "name", directId?: string) => {
    const query = directId || (searchType === "id" ? patientId.trim() : patientName.trim());
    if (!query || loading) return;

    setLoading(true);
    setError("");
    setResult(null);
    setCandidates([]);

    try {
      const adminToken = localStorage.getItem("adminToken") || "";
      const typeParam = directId ? "id" : searchType;
      const res = await fetch(
        `/api/admin/patient-lookup?q=${encodeURIComponent(query)}&type=${typeParam}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "検索失敗");
        return;
      }

      // 候補リストがある場合
      if (!data.found && data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
        return;
      }

      if (!data.found) {
        setError("見つかりませんでした");
        return;
      }

      setResult({
        id: data.patient.id,
        name: data.patient.name,
        lstep_uid: data.patient.lstep_uid,
        latestOrder: data.latestOrder || null,
        orderHistory: data.orderHistory || [],
        reorders: data.reorders || [],
        pendingBankTransfer: data.pendingBankTransfer || null,
      });
    } catch {
      setError("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (id: string) => {
    setCandidates([]);
    handleSearch("id", id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, searchType: "id" | "name") => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSearch(searchType);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPatientId("");
    setPatientName("");
    setResult(null);
    setCandidates([]);
    setError("");
  };

  const lstepUrl = result?.lstep_uid
    ? `https://manager.linestep.net/line/visual?member=${result.lstep_uid}`
    : null;

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-40"
        title="患者検索"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* ポップアップ */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-96 bg-white rounded-lg shadow-2xl border z-50 max-h-[80vh] flex flex-col">
          {/* ヘッダー */}
          <div className="px-4 py-2 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
            <span className="font-semibold text-sm">患者検索</span>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 検索フォーム */}
          <div className="p-3 border-b space-y-2">
            {/* 患者ID検索 */}
            <div className="flex gap-2">
              <input
                ref={idInputRef}
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "id")}
                placeholder="患者ID"
                className="flex-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSearch("id")}
                disabled={loading || !patientId.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                検索
              </button>
            </div>
            {/* 氏名検索 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "name")}
                placeholder="氏名"
                className="flex-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => handleSearch("name")}
                disabled={loading || !patientName.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                検索
              </button>
            </div>
          </div>

          {/* 結果エリア */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-3 text-gray-500 text-sm">検索中...</div>
            )}

            {error && (
              <div className="p-3 text-red-600 text-sm">{error}</div>
            )}

            {/* 候補リスト */}
            {candidates.length > 0 && (
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">候補を選択してください</div>
                <div className="space-y-1">
                  {candidates.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectCandidate(c.id)}
                      className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded text-sm flex justify-between items-center"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <div className="p-3 space-y-3">
                {/* 基本情報 */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{result.name}</div>
                    <div className="text-xs text-gray-500">ID: {result.id}</div>
                  </div>
                  {lstepUrl && (
                    <a
                      href={lstepUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Lステップ
                    </a>
                  )}
                </div>

                {/* 銀行振込申請中 */}
                {result.pendingBankTransfer && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <div className="text-xs font-semibold text-yellow-700 mb-1">銀行振込申請中</div>
                    <div className="text-xs text-yellow-800">
                      {result.pendingBankTransfer.product} ({result.pendingBankTransfer.date})
                    </div>
                  </div>
                )}

                {/* 最新決済情報 */}
                {result.latestOrder && (
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
                      最新決済
                      {(result.latestOrder.refund_status === "refunded" || result.latestOrder.refund_status === "COMPLETED") && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-600 text-white">返金済</span>
                      )}
                      {(result.latestOrder.refund_status === "partial" || result.latestOrder.refund_status === "PARTIAL") && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-500 text-white">一部返金</span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{result.latestOrder.product}</span>
                        <span className="text-blue-600 font-semibold">{result.latestOrder.amount}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>{result.latestOrder.payment}</span>
                        <span>{result.latestOrder.date}</span>
                      </div>
                      {result.latestOrder.tracking !== "-" && (
                        <div className="pt-1">
                          <a
                            href={`https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${result.latestOrder.tracking}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            追跡: {result.latestOrder.tracking}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* 配送先情報 */}
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1 text-xs">
                      {result.latestOrder.postal_code && (
                        <div className="text-gray-600">〒{result.latestOrder.postal_code}</div>
                      )}
                      {result.latestOrder.address && (
                        <div className="text-gray-700">{result.latestOrder.address}</div>
                      )}
                      {result.latestOrder.email && (
                        <div className="text-gray-500">{result.latestOrder.email}</div>
                      )}
                      {result.latestOrder.phone && (
                        <div className="text-gray-500">{result.latestOrder.phone}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 決済なし */}
                {!result.latestOrder && !result.pendingBankTransfer && (
                  <div className="text-xs text-gray-400">決済履歴なし</div>
                )}

                {/* 処方履歴 */}
                {result.orderHistory.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">処方履歴</div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {result.orderHistory.map((o, i) => (
                        <div key={i} className="text-xs bg-gray-50 p-1.5 rounded flex justify-between items-center">
                          <span className="text-gray-500">{o.date}</span>
                          <div className="flex items-center gap-1">
                            {(o.refund_status === "refunded" || o.refund_status === "COMPLETED") && (
                              <span className="px-1 py-0.5 text-[9px] font-bold rounded bg-purple-600 text-white">返金</span>
                            )}
                            {(o.refund_status === "partial" || o.refund_status === "PARTIAL") && (
                              <span className="px-1 py-0.5 text-[9px] font-bold rounded bg-orange-500 text-white">一部</span>
                            )}
                            <span className="text-gray-700">{o.product}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 再処方 */}
                {result.reorders.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">再処方</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.reorders.map((r, i) => (
                        <div key={i} className="text-xs bg-gray-50 p-2 rounded flex justify-between items-center">
                          <div>
                            <span className="text-gray-400">#{r.id}</span> {r.product}
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            r.status === "承認済み" ? "bg-green-100 text-green-700" :
                            r.status === "承認待ち" ? "bg-yellow-100 text-yellow-700" :
                            r.status === "決済済み" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
