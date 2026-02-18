"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

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

// 移行プラン（EM専用）
const TRANSITION_ITEMS = [
  { item_key: "transition_1", label: "移行プラン①", desc: "2.5mg×1箱 + 5mg×1箱" },
  { item_key: "transition_1x2", label: "移行プラン①×2", desc: "2.5mg×2箱 + 5mg×2箱" },
  { item_key: "transition_2", label: "移行プラン②", desc: "5mg×1箱 + 7.5mg×1箱" },
  { item_key: "transition_3", label: "移行プラン③", desc: "7.5mg×1箱 + 10mg×1箱" },
];

// EM用の追加梱包アイテム（productsテーブルにない用量）
const EXTRA_EM_PACKAGED = [
  { item_key: "em_12.5mg_1m", label: "12.5mg 1ヶ月（2箱）", dosage: "12.5mg", duration: 1, boxesPerSet: 2 },
  { item_key: "em_12.5mg_2m", label: "12.5mg 2ヶ月（4箱）", dosage: "12.5mg", duration: 2, boxesPerSet: 4 },
  { item_key: "em_12.5mg_3m", label: "12.5mg 3ヶ月（6箱）", dosage: "12.5mg", duration: 3, boxesPerSet: 6 },
];

// のなめで使用する用量（2.5-7.5mgのみ）
const NONAME_DOSAGES = ["2.5mg", "5mg", "7.5mg"];

const SHARED_LOCATION = "共有";

type Val = { box_count: number; shipped_count: number; received_count: number; note: string };
type ValMap = Record<string, Val>;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// number input のフォーカス時全選択（先頭0問題を解消）
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

  // 箱在庫（共有）— 入荷とEM発送を管理
  const [boxEdits, setBoxEdits] = useState<ValMap>({});
  const [boxOriginal, setBoxOriginal] = useState<ValMap>({});

  // 梱包済み在庫（店舗別）— 発送を管理
  const [pkgEdits, setPkgEdits] = useState<Record<string, ValMap>>({});
  const [pkgOriginal, setPkgOriginal] = useState<Record<string, ValMap>>({});

  // 店舗サブタブ
  const [activeTab, setActiveTab] = useState("");

  const isEMTab = activeTab.includes("EM");

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
      if (!activeTab || !locs.includes(activeTab)) {
        setActiveTab(locs[0]);
      }

      // ログを振り分け
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
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (locations.length > 0 && !locations.includes(activeTab)) {
      setActiveTab(locations[0]);
    }
  }, [locations, activeTab]);

  // エントリ組み立て（仕訳は shipped_count/received_count を編集、box_count は元値を保持）
  const buildEntries = useCallback(() => {
    const boxEntries = BOX_ITEMS.map((b) => ({
      item_key: b.item_key,
      section: "box",
      location: SHARED_LOCATION,
      box_count: boxEdits[b.item_key]?.box_count ?? 0,
      shipped_count: boxEdits[b.item_key]?.shipped_count ?? 0,
      received_count: boxEdits[b.item_key]?.received_count ?? 0,
      note: boxEdits[b.item_key]?.note ?? "",
    }));

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

    return [...boxEntries, ...allPkgEntries];
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
    const boxChanged = JSON.stringify(boxEdits) !== JSON.stringify(boxOriginal);
    const pkgChanged = JSON.stringify(pkgEdits) !== JSON.stringify(pkgOriginal);
    if (!boxChanged && !pkgChanged) return;

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
  }, [boxEdits, pkgEdits]); // eslint-disable-line react-hooks/exhaustive-deps

  // 箱在庫の値更新（仕訳では received_count と shipped_count を編集）
  const updateBox = (key: string, field: keyof Val, value: number | string) => {
    setBoxEdits((prev) => ({
      ...prev,
      [key]: { box_count: prev[key]?.box_count ?? 0, shipped_count: prev[key]?.shipped_count ?? 0, received_count: prev[key]?.received_count ?? 0, note: prev[key]?.note ?? "", [field]: value },
    }));
  };

  // 梱包済みの値更新
  const updatePkg = (key: string, field: keyof Val, value: number | string) => {
    setPkgEdits((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [key]: {
          box_count: prev[activeTab]?.[key]?.box_count ?? 0,
          shipped_count: prev[activeTab]?.[key]?.shipped_count ?? 0,
          received_count: prev[activeTab]?.[key]?.received_count ?? 0,
          note: prev[activeTab]?.[key]?.note ?? "",
          [field]: value,
        },
      },
    }));
  };

  const hasChanges =
    JSON.stringify(boxEdits) !== JSON.stringify(boxOriginal) ||
    JSON.stringify(pkgEdits) !== JSON.stringify(pkgOriginal);

  // のなめ発送: 用量(2.5-7.5mg) × 月数(1-3ヶ月) でグルーピング
  const nonameGrouped = useMemo(() => {
    const filtered = products.filter((p) => NONAME_DOSAGES.includes(p.dosage ?? ""));
    return filtered.reduce(
      (acc, p) => {
        const key = `${p.drug_name}_${p.dosage ?? ""}`;
        if (!acc[key]) acc[key] = { drug_name: p.drug_name, dosage: p.dosage, items: [] };
        acc[key].items.push(p);
        acc[key].items.sort((a, b) => (a.duration_months ?? 0) - (b.duration_months ?? 0));
        return acc;
      },
      {} as Record<string, { drug_name: string; dosage: string | null; items: Product[] }>
    );
  }, [products]);

  // EM発送: 全用量で本数記録
  const emShippedTotal = useMemo(() =>
    BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.shipped_count ?? 0), 0),
    [boxEdits]
  );

  // 入荷合計
  const receivedTotal = useMemo(() =>
    BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.received_count ?? 0), 0),
    [boxEdits]
  );

  const tabClass = (name: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      activeTab === name ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
              <span className="text-xs text-green-600 font-medium">
                合計 {receivedTotal}箱
              </span>
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

          {/* ===== EM発送（用量別・本数） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-orange-900">EM発送</h2>
                <p className="text-xs text-orange-600 mt-0.5">用量別の発送本数</p>
              </div>
              <span className="text-xs text-orange-400">
                合計 {emShippedTotal}本
              </span>
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

          {/* ===== のなめ・梱包済み発送（店舗別） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-purple-900">梱包済み発送</h2>
                <p className="text-xs text-purple-600 mt-0.5">店舗別の発送記録</p>
              </div>
              {locations.length > 1 && (
                <div className="flex gap-1 bg-purple-100/60 rounded-lg p-1">
                  {locations.map((loc) => (
                    <button key={loc} onClick={() => setActiveTab(loc)} className={tabClass(loc)}>
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* のなめ発送: 2.5-7.5mg × 1-3ヶ月 */}
            {!isEMTab && (
              <>
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">のなめ発送（用量 × 月数）</span>
                </div>
                {Object.entries(nonameGrouped).map(([key, group]) => (
                  <div key={key}>
                    <div className="bg-slate-50/50 px-4 py-1.5 border-b border-slate-100">
                      <span className="text-xs font-medium text-slate-500">{group.drug_name} {group.dosage}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.items.map((product) => {
                        const storeEdits = pkgEdits[activeTab] || {};
                        const v = storeEdits[product.id];
                        const shipped = v?.shipped_count ?? 0;
                        return (
                          <div key={product.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                            <div className="w-36 min-w-0">
                              <span className="text-sm font-medium text-slate-700">
                                {product.dosage} {product.duration_months}ヶ月分
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">発送</label>
                              <input
                                type="number"
                                min={0}
                                value={shipped}
                                onChange={(e) => updatePkg(product.id, "shipped_count", parseInt(e.target.value) || 0)}
                                onFocus={selectOnFocus}
                                className="w-20 border border-purple-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <span className="text-xs text-slate-400">セット</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* EM梱包済み発送: 全用量 × 月数 */}
            {isEMTab && (
              <>
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">梱包済み発送（用量 × 月数）</span>
                </div>
                {(() => {
                  const emGrouped = products.reduce(
                    (acc, p) => {
                      const key = `${p.drug_name}_${p.dosage ?? ""}`;
                      if (!acc[key]) acc[key] = { drug_name: p.drug_name, dosage: p.dosage, items: [] };
                      acc[key].items.push(p);
                      acc[key].items.sort((a, b) => (a.duration_months ?? 0) - (b.duration_months ?? 0));
                      return acc;
                    },
                    {} as Record<string, { drug_name: string; dosage: string | null; items: Product[] }>
                  );

                  return Object.entries(emGrouped).map(([key, group]) => (
                    <div key={key}>
                      <div className="bg-slate-50/50 px-4 py-1.5 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-500">{group.drug_name} {group.dosage}</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {group.items.map((product) => {
                          const storeEdits = pkgEdits[activeTab] || {};
                          const v = storeEdits[product.id];
                          const shipped = v?.shipped_count ?? 0;
                          return (
                            <div key={product.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                              <div className="w-36 min-w-0">
                                <span className="text-sm font-medium text-slate-700">
                                  {product.dosage} {product.duration_months}ヶ月分
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-500">発送</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={shipped}
                                  onChange={(e) => updatePkg(product.id, "shipped_count", parseInt(e.target.value) || 0)}
                                  onFocus={selectOnFocus}
                                className="w-20 border border-purple-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <span className="text-xs text-slate-400">セット</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}

                {/* 12.5mg発送（EM専用） */}
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 border-t">
                  <span className="text-xs font-semibold text-slate-600">12.5mg 発送</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {EXTRA_EM_PACKAGED.map((item) => {
                    const storeEdits = pkgEdits[activeTab] || {};
                    const v = storeEdits[item.item_key];
                    const shipped = v?.shipped_count ?? 0;
                    return (
                      <div key={item.item_key} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                        <div className="w-36 min-w-0">
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">発送</label>
                          <input
                            type="number"
                            min={0}
                            value={shipped}
                            onFocus={selectOnFocus}
                            onChange={(e) => updatePkg(item.item_key, "shipped_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-purple-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-slate-400">セット</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 移行プラン発送（EM専用） */}
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 border-t">
                  <span className="text-xs font-semibold text-amber-700">移行プラン発送（EM用）</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {TRANSITION_ITEMS.map((item) => {
                    const storeEdits = pkgEdits[activeTab] || {};
                    const v = storeEdits[item.item_key];
                    const shipped = v?.shipped_count ?? 0;
                    return (
                      <div key={item.item_key} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                        <div className="w-36 min-w-0">
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                          <span className="text-xs text-slate-400 ml-1">({item.desc})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">発送</label>
                          <input
                            type="number"
                            min={0}
                            value={shipped}
                            onFocus={selectOnFocus}
                            onChange={(e) => updatePkg(item.item_key, "shipped_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-amber-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-slate-400">セット</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
