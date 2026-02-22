"use client";

import { useState } from "react";
import { DEMO_SHIPMENTS, type DemoShipment } from "../_data/mock";

const STATUS_TABS = ["全て", "発送待ち", "発送済み", "配達完了"] as const;

const statusStyles: Record<string, string> = {
  "発送待ち": "bg-amber-100 text-amber-700",
  "発送済み": "bg-blue-100 text-blue-700",
  "配達完了": "bg-emerald-100 text-emerald-700",
};

export default function DemoShippingPage() {
  const [activeTab, setActiveTab] = useState<string>("全て");
  const [shipments, setShipments] = useState<DemoShipment[]>(DEMO_SHIPMENTS);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});

  const filtered = activeTab === "全て" ? shipments : shipments.filter((s) => s.status === activeTab);
  const pendingCount = shipments.filter((s) => s.status === "発送待ち").length;
  const shippedCount = shipments.filter((s) => s.status === "発送済み").length;
  const deliveredCount = shipments.filter((s) => s.status === "配達完了").length;

  const handleShip = (id: string) => {
    const tracking = trackingInput[id]?.trim();
    if (!tracking) return;
    setShipments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "発送済み" as const, trackingNumber: tracking } : s))
    );
    setTrackingInput((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <div className="p-6 pb-16 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">発送管理</h1>
        <p className="text-sm text-slate-500 mt-1">発送状態の確認・追跡番号の付与</p>
      </div>

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
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">患者名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">商品</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">決済</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">決済日</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ステータス</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">追跡番号</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{shipment.patientName}</p>
                    <p className="text-xs text-slate-500 lg:hidden">{shipment.address.slice(0, 10)}...</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{shipment.product}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">{shipment.paymentMethod}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{shipment.paidAt}</td>
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
                          発送
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
    </div>
  );
}
