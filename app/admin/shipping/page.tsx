"use client";

export default function ShippingPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">配送管理</h1>
        <p className="text-slate-600 text-sm mt-1">配送状況と追跡情報を管理</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-slate-600">配送データがここに表示されます</p>
      </div>
    </div>
  );
}
