"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Product {
  id: string;
  code: string;
  title: string;
  drug_name: string;
  dosage: string | null;
  duration_months: number | null;
  quantity: number | null;
  category: string;
}

interface LogEntry {
  item_key: string;
  section: string;
  location: string;
  logged_date: string;
  box_count: number;
  shipped_count: number;
  received_count: number;
  note?: string;
  product_id?: string;
}

// 箱在庫アイテム（1箱=2本、共有ストック）
const BOX_ITEMS = [
  { item_key: "box_2.5mg", label: "2.5mg", units: 2 },
  { item_key: "box_5mg", label: "5mg", units: 2 },
  { item_key: "box_7.5mg", label: "7.5mg", units: 2 },
  { item_key: "box_10mg", label: "10mg", units: 2 },
  { item_key: "box_12.5mg", label: "12.5mg", units: 2 },
];

// のなめ発送アイテム（箱単位、2.5-7.5mgのみ）
const NONAME_SHIP_ITEMS = [
  { item_key: "noname_ship_2.5mg", label: "2.5mg", dosage: "2.5mg" },
  { item_key: "noname_ship_5mg", label: "5mg", dosage: "5mg" },
  { item_key: "noname_ship_7.5mg", label: "7.5mg", dosage: "7.5mg" },
];

// 移行プラン（EM専用）— buildEntries用
const TRANSITION_ITEMS = [
  { item_key: "transition_1" },
  { item_key: "transition_1x2" },
  { item_key: "transition_2" },
  { item_key: "transition_3" },
];

// EM用の追加梱包アイテム — buildEntries用
const EXTRA_EM_PACKAGED = [
  { item_key: "em_10mg_1m" }, { item_key: "em_10mg_2m" }, { item_key: "em_10mg_3m" },
  { item_key: "em_12.5mg_1m" }, { item_key: "em_12.5mg_2m" }, { item_key: "em_12.5mg_3m" },
];

const SHARED_LOCATION = "共有";

type Val = { box_count: number; shipped_count: number; received_count: number; note: string };
type ValMap = Record<string, Val>;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

export default function InventoryJournalPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [locations, setLocations] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved">("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const isInitialLoad = useRef(true);

  // 箱在庫（共有）— 入荷・EM発送・のなめ発送
  const [boxEdits, setBoxEdits] = useState<ValMap>({});
  const [boxOriginal, setBoxOriginal] = useState<ValMap>({});

  // 梱包済み在庫（店舗別）— UIには出さないがデータ保持用
  const [pkgEdits, setPkgEdits] = useState<Record<string, ValMap>>({});
  const [pkgOriginal, setPkgOriginal] = useState<Record<string, ValMap>>({});

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/inventory?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setProducts(data.products || []);

      const locs: string[] = data.locations || ["本院"];
      setLocations(locs);

      const logs: LogEntry[] = data.logs || [];
      const bMap: ValMap = {};
      const pMap: Record<string, ValMap> = {};
      for (const loc of locs) pMap[loc] = {};

      for (const log of logs) {
        if (log.location === SHARED_LOCATION || log.section === "box") {
          bMap[log.item_key] = { box_count: log.box_count, shipped_count: log.shipped_count, received_count: log.received_count ?? 0, note: log.note || "" };
        } else if (pMap[log.location]) {
          pMap[log.location][log.item_key] = { box_count: log.box_count, shipped_count: log.shipped_count, received_count: log.received_count ?? 0, note: log.note || "" };
        }
      }

      setBoxEdits(bMap);
      setBoxOriginal(bMap);
      setPkgEdits(pMap);
      setPkgOriginal(pMap);
      isInitialLoad.current = true;
    } catch {
      setMessage("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // エントリ組み立て（仕訳の入力 + 台帳のpackagedデータを保持）
  const buildEntries = useCallback(() => {
    // box セクション（入荷・EM発送）
    const boxEntries = BOX_ITEMS.map((b) => ({
      item_key: b.item_key,
      section: "box",
      location: SHARED_LOCATION,
      box_count: boxEdits[b.item_key]?.box_count ?? 0,
      shipped_count: boxEdits[b.item_key]?.shipped_count ?? 0,
      received_count: boxEdits[b.item_key]?.received_count ?? 0,
      note: boxEdits[b.item_key]?.note ?? "",
    }));

    // のなめ発送アイテム
    const nonameEntries = NONAME_SHIP_ITEMS.map((n) => ({
      item_key: n.item_key,
      section: "box",
      location: SHARED_LOCATION,
      box_count: 0,
      shipped_count: boxEdits[n.item_key]?.shipped_count ?? 0,
      received_count: 0,
      note: "",
    }));

    // packaged セクション（台帳データを保持）
    const allPkgEntries: Array<{
      item_key: string;
      section: string;
      location: string;
      product_id?: string;
      box_count: number;
      shipped_count: number;
      received_count: number;
      note: string;
    }> = [];

    for (const loc of locations) {
      const storeEdits = pkgEdits[loc] || {};
      const locIsEM = loc.includes("EM");

      for (const p of products) {
        allPkgEntries.push({
          item_key: p.id,
          section: "packaged",
          location: loc,
          product_id: p.id,
          box_count: storeEdits[p.id]?.box_count ?? 0,
          shipped_count: storeEdits[p.id]?.shipped_count ?? 0,
          received_count: storeEdits[p.id]?.received_count ?? 0,
          note: storeEdits[p.id]?.note ?? "",
        });
      }

      if (locIsEM) {
        for (const ex of EXTRA_EM_PACKAGED) {
          allPkgEntries.push({
            item_key: ex.item_key,
            section: "packaged",
            location: loc,
            box_count: storeEdits[ex.item_key]?.box_count ?? 0,
            shipped_count: storeEdits[ex.item_key]?.shipped_count ?? 0,
            received_count: storeEdits[ex.item_key]?.received_count ?? 0,
            note: storeEdits[ex.item_key]?.note ?? "",
          });
        }
        for (const t of TRANSITION_ITEMS) {
          allPkgEntries.push({
            item_key: t.item_key,
            section: "packaged",
            location: loc,
            box_count: storeEdits[t.item_key]?.box_count ?? 0,
            shipped_count: storeEdits[t.item_key]?.shipped_count ?? 0,
            received_count: storeEdits[t.item_key]?.received_count ?? 0,
            note: storeEdits[t.item_key]?.note ?? "",
          });
        }
      }
    }

    return [...boxEntries, ...nonameEntries, ...allPkgEntries];
  }, [boxEdits, pkgEdits, locations, products]);

  // 保存（手動）
  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const entries = buildEntries();
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, entries }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessage(`${data.saved}件保存しました`);
      await fetchData();
    } catch {
      setMessage("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // 自動保存（1.5秒デバウンス）
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (JSON.stringify(boxEdits) === JSON.stringify(boxOriginal)) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        const entries = buildEntries();
        const res = await fetch("/api/admin/inventory", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, entries }),
        });
        if (res.ok) {
          setAutoSaveStatus("saved");
          setBoxOriginal(boxEdits);
          setPkgOriginal(pkgEdits);
          setTimeout(() => setAutoSaveStatus(""), 2000);
        }
      } catch { /* サイレント失敗 */ }
    }, 1500);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [boxEdits]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateBox = (key: string, field: keyof Val, value: number | string) => {
    setBoxEdits((prev) => ({
      ...prev,
      [key]: { box_count: prev[key]?.box_count ?? 0, shipped_count: prev[key]?.shipped_count ?? 0, received_count: prev[key]?.received_count ?? 0, note: prev[key]?.note ?? "", [field]: value },
    }));
  };

  const hasChanges = JSON.stringify(boxEdits) !== JSON.stringify(boxOriginal);

  // 入荷合計
  const receivedTotal = BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.received_count ?? 0), 0);

  // EM発送合計（本数）
  const emShippedTotal = BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.shipped_count ?? 0), 0);

  // のなめ発送合計（箱数）
  const nonameShippedTotal = NONAME_SHIP_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.shipped_count ?? 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">仕訳</h1>
        <p className="text-slate-500 text-sm mt-1">日々の入荷・発送管理</p>
      </div>

      {/* 日付 + 保存 */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">日付</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1" />
        {autoSaveStatus && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            autoSaveStatus === "saving" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
          }`}>
            {autoSaveStatus === "saving" ? "保存中..." : "保存済み"}
          </span>
        )}
        <a
          href="/admin/inventory"
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          台帳ページへ
        </a>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
            saving || !hasChanges ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.includes("失敗") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-slate-500">読み込み中...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ===== 入荷（箱単位） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-green-900">入荷</h2>
                <p className="text-xs text-green-600 mt-0.5">箱単位（1箱 = 2本）</p>
              </div>
              <span className="text-xs text-green-600 font-medium">合計 {receivedTotal}箱</span>
            </div>
            <div className="divide-y divide-slate-100">
              {BOX_ITEMS.map((item) => {
                const received = boxEdits[item.item_key]?.received_count ?? 0;
                return (
                  <div key={item.item_key} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                    <div className="w-24">
                      <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={received}
                        onFocus={selectOnFocus}
                        onChange={(e) => updateBox(item.item_key, "received_count", parseInt(e.target.value) || 0)}
                        className="w-20 border border-green-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-slate-400">箱</span>
                    </div>
                    <span className="text-xs text-slate-500">= {received * item.units}本</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== EM発送（本数単位） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-orange-900">EM発送</h2>
                <p className="text-xs text-orange-600 mt-0.5">用量別の発送本数</p>
              </div>
              <span className="text-xs text-orange-600 font-medium">合計 {emShippedTotal}本</span>
            </div>
            <div className="divide-y divide-slate-100">
              {BOX_ITEMS.map((item) => {
                const shipped = boxEdits[item.item_key]?.shipped_count ?? 0;
                return (
                  <div key={item.item_key} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                    <div className="w-24">
                      <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={shipped}
                        onFocus={selectOnFocus}
                        onChange={(e) => updateBox(item.item_key, "shipped_count", parseInt(e.target.value) || 0)}
                        className="w-20 border border-orange-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-slate-400">本</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== のなめ発送（箱単位） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-purple-900">のなめ発送</h2>
                <p className="text-xs text-purple-600 mt-0.5">用量別の発送箱数（1箱 = 2本）</p>
              </div>
              <span className="text-xs text-purple-600 font-medium">合計 {nonameShippedTotal}箱</span>
            </div>
            <div className="divide-y divide-slate-100">
              {NONAME_SHIP_ITEMS.map((item) => {
                const shipped = boxEdits[item.item_key]?.shipped_count ?? 0;
                return (
                  <div key={item.item_key} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                    <div className="w-24">
                      <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={shipped}
                        onFocus={selectOnFocus}
                        onChange={(e) => updateBox(item.item_key, "shipped_count", parseInt(e.target.value) || 0)}
                        className="w-20 border border-purple-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-slate-400">箱</span>
                    </div>
                    <span className="text-xs text-slate-500">= {shipped * 2}本</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
