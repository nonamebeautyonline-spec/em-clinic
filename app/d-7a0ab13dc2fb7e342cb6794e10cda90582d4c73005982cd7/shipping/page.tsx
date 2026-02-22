"use client";

import { useState } from "react";
import { DEMO_SHIPMENTS, DEMO_PATIENTS, type DemoShipment } from "../_data/mock";

const TABS = ["概要", "本日発送", "追跡番号", "伝票作成"] as const;
type Tab = (typeof TABS)[number];

const statusStyles: Record<string, string> = {
  "発送待ち": "bg-amber-100 text-amber-700",
  "発送済み": "bg-blue-100 text-blue-700",
  "配達完了": "bg-emerald-100 text-emerald-700",
};

const STATUS_TABS = ["全て", "発送待ち", "発送済み", "配達完了"] as const;

const dosageColor = (product: string) => {
  if (product.includes("2.5mg")) return "bg-blue-100";
  if (product.includes("5mg") && !product.includes("7.5mg") && !product.includes("15mg")) return "bg-purple-100";
  if (product.includes("7.5mg")) return "bg-green-100";
  return "";
};

export default function DemoShippingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("概要");
  const [shipments, setShipments] = useState<DemoShipment[]>(DEMO_SHIPMENTS);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  // 追跡番号タブ用
  const [selectedPatient, setSelectedPatient] = useState("");
  const [newTracking, setNewTracking] = useState("");
  const [editableTracking, setEditableTracking] = useState<Record<string, string>>({});
  const [showLineModal, setShowLineModal] = useState(false);
  const [lineNotifyTargets, setLineNotifyTargets] = useState<DemoShipment[]>([]);

  // 伝票タブ用
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // 概要タブ用
  const [statusTab, setStatusTab] = useState<string>("全て");

  const pendingCount = shipments.filter((s) => s.status === "発送待ち").length;
  const shippedCount = shipments.filter((s) => s.status === "発送済み").length;
  const deliveredCount = shipments.filter((s) => s.status === "配達完了").length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShip = (id: string) => {
    const tracking = trackingInput[id]?.trim();
    if (!tracking) return;
    setShipments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "発送済み" as const, trackingNumber: tracking } : s))
    );
    setTrackingInput((prev) => ({ ...prev, [id]: "" }));
    showToast("発送ステータスを更新しました");
  };

  const handleAddTracking = () => {
    if (!selectedPatient || !newTracking.trim()) return;
    setShipments((prev) =>
      prev.map((s) =>
        s.patientName === selectedPatient && s.status === "発送待ち"
          ? { ...s, trackingNumber: newTracking.trim() }
          : s
      )
    );
    setEditableTracking((prev) => {
      const target = shipments.find(
        (s) => s.patientName === selectedPatient && s.status === "発送待ち"
      );
      return target ? { ...prev, [target.id]: newTracking.trim() } : prev;
    });
    setSelectedPatient("");
    setNewTracking("");
    showToast("追跡番号を追加しました");
  };

  const handleBulkApply = () => {
    const updated: DemoShipment[] = [];
    setShipments((prev) =>
      prev.map((s) => {
        if (editableTracking[s.id] && s.status === "発送待ち") {
          const newS = { ...s, status: "発送済み" as const, trackingNumber: editableTracking[s.id] };
          updated.push(newS);
          return newS;
        }
        return s;
      })
    );
    if (updated.length > 0) {
      setLineNotifyTargets(updated);
      setShowLineModal(true);
      setEditableTracking({});
      showToast(`${updated.length}件の発送ステータスを更新しました`);
    }
  };

  const handleLineNotify = () => {
    setShowLineModal(false);
    setLineNotifyTargets([]);
    showToast("LINE通知を送信しました");
  };

  const handleCsvExport = () => {
    showToast("CSVを出力しました");
  };

  const pendingShipments = shipments.filter((s) => s.status === "発送待ち");
  const filteredByStatus = statusTab === "全て" ? shipments : shipments.filter((s) => s.status === statusTab);

  const trackingEntries = shipments.filter((s) => s.trackingNumber || editableTracking[s.id]);

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">発送管理</h1>
        <p className="text-sm text-slate-500 mt-1">発送状態の確認・追跡番号の付与・伝票作成</p>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === "概要" && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              <p className="text-xs text-amber-600 mt-1">発送待ち</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{shippedCount}</p>
              <p className="text-xs text-blue-600 mt-1">発送済み</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{deliveredCount}</p>
              <p className="text-xs text-emerald-600 mt-1">配達完了</p>
            </div>
          </div>

          {/* ステータスタブ */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 発送リスト */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">患者名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">商品</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">決済</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">住所</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">ステータス</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">追跡番号</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden lg:table-cell">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredByStatus.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{shipment.patientName}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{shipment.product}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">{shipment.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell max-w-[200px] truncate">{shipment.address}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[shipment.status]}`}>
                          {shipment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono hidden lg:table-cell">
                        {shipment.trackingNumber || "-"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {shipment.status === "発送待ち" && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="追跡番号"
                              value={trackingInput[shipment.id] || ""}
                              onChange={(e) => setTrackingInput((prev) => ({ ...prev, [shipment.id]: e.target.value }))}
                              className="w-36 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleShip(shipment.id)}
                              disabled={!trackingInput[shipment.id]?.trim()}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                              発送する
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 本日発送タブ */}
      {activeTab === "本日発送" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">発送待ちのアイテム: {pendingShipments.length}件</p>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              印刷
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 w-10">No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">患者名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">商品</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">郵便番号</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">住所</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">電話</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">決済方法</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingShipments.map((s, i) => {
                    const patient = DEMO_PATIENTS.find((p) => p.name === s.patientName);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-500 text-center">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.patientName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.product}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{patient?.postalCode || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{patient?.address || s.address}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{patient?.tel || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.paymentMethod}</td>
                      </tr>
                    );
                  })}
                  {pendingShipments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                        発送待ちのアイテムはありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 追跡番号タブ */}
      {activeTab === "追跡番号" && (
        <div className="space-y-6">
          {/* 手動入力フォーム */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">追跡番号を追加</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">患者名</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {pendingShipments.map((s) => (
                    <option key={s.id} value={s.patientName}>
                      {s.patientName} - {s.product}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">追跡番号</label>
                <input
                  type="text"
                  value={newTracking}
                  onChange={(e) => setNewTracking(e.target.value)}
                  placeholder="4912-XXXX-XXXX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddTracking}
                disabled={!selectedPatient || !newTracking.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                追加
              </button>
            </div>
          </div>

          {/* 入力済み一覧 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700">追跡番号一覧</h3>
              <button
                onClick={handleBulkApply}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                反映する
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">患者名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">商品</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">追跡番号</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.patientName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{s.product}</td>
                      <td className="px-4 py-3">
                        {s.status === "発送待ち" ? (
                          <input
                            type="text"
                            value={editableTracking[s.id] ?? s.trackingNumber ?? ""}
                            onChange={(e) => setEditableTracking((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            placeholder="追跡番号を入力"
                            className="w-48 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm font-mono text-slate-600">{s.trackingNumber || "-"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[s.status]}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 伝票作成タブ */}
      {activeTab === "伝票作成" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">
              {checkedItems.size}件選択中
            </p>
            <button
              onClick={handleCsvExport}
              disabled={checkedItems.size === 0}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              CSV出力
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={pendingShipments.length > 0 && pendingShipments.every((s) => checkedItems.has(s.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCheckedItems(new Set(pendingShipments.map((s) => s.id)));
                          } else {
                            setCheckedItems(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">患者名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">商品</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">住所</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">決済方法</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingShipments.map((s) => (
                    <tr key={s.id} className={`hover:bg-slate-50 ${dosageColor(s.product)}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checkedItems.has(s.id)}
                          onChange={(e) => {
                            const next = new Set(checkedItems);
                            if (e.target.checked) {
                              next.add(s.id);
                            } else {
                              next.delete(s.id);
                            }
                            setCheckedItems(next);
                          }}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.patientName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{s.product}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{s.address}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{s.paymentMethod}</td>
                    </tr>
                  ))}
                  {pendingShipments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                        発送待ちのアイテムはありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LINE通知モーダル */}
      {showLineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLineModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">LINE通知送信</h2>
              <p className="text-xs text-slate-500 mt-1">以下の患者にLINEで発送通知を送信します</p>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-6">
                {lineNotifyTargets.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{t.patientName}</span>
                    <span className="text-xs text-slate-500">{t.product}</span>
                    <span className="text-xs font-mono text-slate-400 ml-auto">{t.trackingNumber}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleLineNotify}
                  className="flex-1 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
                >
                  通知を送信
                </button>
                <button
                  onClick={() => setShowLineModal(false)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
