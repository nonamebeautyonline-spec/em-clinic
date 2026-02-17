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
  { item_key: "transition_2", label: "移行プラン②", desc: "5mg×1箱 + 7.5mg×1箱" },
  { item_key: "transition_3", label: "移行プラン③", desc: "7.5mg×1箱 + 10mg×1箱" },
];

const SHARED_LOCATION = "共有";

type Val = { box_count: number; shipped_count: number; received_count: number; note: string };
type ValMap = Record<string, Val>;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function InventoryPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [locations, setLocations] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved">("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const isInitialLoad = useRef(true);

  // 箱在庫（共有）
  const [boxEdits, setBoxEdits] = useState<ValMap>({});
  const [boxOriginal, setBoxOriginal] = useState<ValMap>({});

  // 梱包済み在庫（店舗別）
  const [pkgEdits, setPkgEdits] = useState<Record<string, ValMap>>({});
  const [pkgOriginal, setPkgOriginal] = useState<Record<string, ValMap>>({});

  // 梱包済みの店舗サブタブ
  const [activeTab, setActiveTab] = useState("");
  // 履歴データ（サマリーマトリクス用）
  const [historyLogs, setHistoryLogs] = useState<LogEntry[]>([]);

  const isEMTab = activeTab.includes("EM");

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      // 当日データ + 過去14日分の履歴を並行取得
      const d = new Date(selectedDate);
      const from = new Date(d);
      from.setDate(from.getDate() - 13);
      const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

      const [res, histRes] = await Promise.all([
        fetch(`/api/admin/inventory?date=${selectedDate}`, { credentials: "include" }),
        fetch(`/api/admin/inventory?from=${fromStr}&to=${selectedDate}`, { credentials: "include" }),
      ]);

      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setProducts(data.products || []);

      const locs: string[] = data.locations || ["本院"];
      setLocations(locs);
      if (!activeTab || !locs.includes(activeTab)) {
        setActiveTab(locs[0]);
      }

      // 履歴データ
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistoryLogs(histData.logs || []);
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
      // 自動保存トリガーを防ぐ
      isInitialLoad.current = true;
    } catch {
      setMessage("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]); // activeTab は依存に含めない（不要な再fetch防止）

  useEffect(() => { fetchData(); }, [fetchData]);

  // activeTab 初期化（locations 更新時）
  useEffect(() => {
    if (locations.length > 0 && !locations.includes(activeTab)) {
      setActiveTab(locations[0]);
    }
  }, [locations, activeTab]);

  // エントリ組み立て（保存・自動保存共用）
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

  // 箱在庫の自動保存（1.5秒デバウンス）
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    // boxEdits が変更されていない場合はスキップ
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
          // 履歴も更新
          const d = new Date(selectedDate);
          const from = new Date(d);
          from.setDate(from.getDate() - 13);
          const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
          const histRes = await fetch(`/api/admin/inventory?from=${fromStr}&to=${selectedDate}`, { credentials: "include" });
          if (histRes.ok) {
            const histData = await histRes.json();
            setHistoryLogs(histData.logs || []);
          }
          setTimeout(() => setAutoSaveStatus(""), 2000);
        }
      } catch { /* サイレント失敗 */ }
    }, 1500);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [boxEdits]); // eslint-disable-line react-hooks/exhaustive-deps

  // 箱在庫の値更新
  const updateBox = (key: string, field: keyof Val, value: number | string) => {
    setBoxEdits((prev) => ({
      ...prev,
      [key]: { box_count: prev[key]?.box_count ?? 0, shipped_count: prev[key]?.shipped_count ?? 0, received_count: prev[key]?.received_count ?? 0, note: prev[key]?.note ?? "", [field]: value },
    }));
  };

  // 梱包済みの値更新（現在のactiveTab店舗）
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

  // 梱包済み商品を drug_name+dosage でグルーピング
  const grouped = useMemo(() =>
    products.reduce(
      (acc, p) => {
        const key = `${p.drug_name}_${p.dosage ?? ""}`;
        if (!acc[key]) acc[key] = { drug_name: p.drug_name, dosage: p.dosage, items: [] };
        acc[key].items.push(p);
        acc[key].items.sort((a, b) => (a.duration_months ?? 0) - (b.duration_months ?? 0));
        return acc;
      },
      {} as Record<string, { drug_name: string; dosage: string | null; items: Product[] }>
    ), [products]);

  // 在庫サマリー: 日付×用量マトリクス（過去14日分）
  const DOSAGES = ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg"];

  const historyMatrix = useMemo(() => {
    // 日付一覧を抽出（降順）
    const dateSet = new Set<string>();
    for (const log of historyLogs) {
      if (log.section === "box") dateSet.add(log.logged_date);
    }
    const dates = Array.from(dateSet).sort().reverse();

    // 日付×用量のマップを構築
    const matrix: Array<{ date: string; cells: Record<string, { boxCount: number; shipped: number; received: number }> }> = [];
    for (const date of dates) {
      const cells: Record<string, { boxCount: number; shipped: number; received: number }> = {};
      for (const dose of DOSAGES) {
        cells[dose] = { boxCount: 0, shipped: 0, received: 0 };
      }
      for (const log of historyLogs) {
        if (log.logged_date === date && log.section === "box") {
          const dose = log.item_key.replace("box_", "");
          if (cells[dose]) {
            cells[dose] = { boxCount: log.box_count, shipped: log.shipped_count, received: log.received_count ?? 0 };
          }
        }
      }
      matrix.push({ date, cells });
    }
    return matrix;
  }, [historyLogs]);

  const tabClass = (name: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      activeTab === name ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">在庫管理</h1>
        <p className="text-slate-500 text-sm mt-1">日次棚卸し</p>
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
          {/* ===== 箱在庫（共有ストック） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-blue-900">箱在庫（共有ストック）</h2>
                <p className="text-xs text-blue-600 mt-0.5">1箱 = 2本 / 棚卸し = 入荷後の実数</p>
              </div>
              {autoSaveStatus && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  autoSaveStatus === "saving" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                }`}>
                  {autoSaveStatus === "saving" ? "保存中..." : "保存済み"}
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {BOX_ITEMS.map((item) => {
                const v = boxEdits[item.item_key];
                const count = v?.box_count ?? 0;
                const received = v?.received_count ?? 0;
                return (
                  <div key={item.item_key} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                    <div className="w-24">
                      <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">棚卸し</label>
                      <input
                        type="number"
                        min={0}
                        value={count}
                        onChange={(e) => updateBox(item.item_key, "box_count", parseInt(e.target.value) || 0)}
                        className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center"
                      />
                      <span className="text-xs text-slate-400">箱</span>
                    </div>
                    <span className="text-xs text-slate-500">= {count * item.units}本</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-green-600">入荷</label>
                      <input
                        type="number"
                        min={0}
                        value={received}
                        onChange={(e) => updateBox(item.item_key, "received_count", parseInt(e.target.value) || 0)}
                        className="w-20 border border-green-300 rounded-lg px-3 py-1.5 text-sm text-center"
                      />
                      <span className="text-xs text-slate-400">箱</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="メモ"
                        value={v?.note ?? ""}
                        onChange={(e) => updateBox(item.item_key, "note", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== EM発送記録（用量別） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-orange-900">EM発送記録</h2>
                <p className="text-xs text-orange-600 mt-0.5">その日の発送本数（用量別）</p>
              </div>
              <span className="text-xs text-orange-400">
                合計 {BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.shipped_count ?? 0), 0)}本
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
                        onChange={(e) => updateBox(item.item_key, "shipped_count", parseInt(e.target.value) || 0)}
                        className="w-20 border border-orange-300 rounded-lg px-3 py-1.5 text-sm text-center"
                      />
                      <span className="text-xs text-slate-400">本</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== 梱包済み在庫（店舗別サブタブ） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-emerald-900">梱包済み在庫</h2>
                <p className="text-xs text-emerald-600 mt-0.5">発送準備完了セット（店舗別）</p>
              </div>
              {locations.length > 1 && (
                <div className="flex gap-1 bg-emerald-100/60 rounded-lg p-1">
                  {locations.map((loc) => (
                    <button key={loc} onClick={() => setActiveTab(loc)} className={tabClass(loc)}>
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {Object.entries(grouped).map(([key, group]) => (
              <div key={key}>
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">{group.drug_name} {group.dosage}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map((product) => {
                    const storeEdits = pkgEdits[activeTab] || {};
                    const v = storeEdits[product.id];
                    const boxCount = v?.box_count ?? 0;
                    const shipped = v?.shipped_count ?? 0;
                    const remaining = boxCount - shipped;
                    const boxesPerSet = (product.quantity ?? 4) / 2;
                    return (
                      <div key={product.id} className="px-4 py-3 flex flex-wrap items-center gap-4 hover:bg-slate-50">
                        <div className="w-36 min-w-0">
                          <span className="text-sm font-medium text-slate-700">
                            {product.duration_months}ヶ月（{boxesPerSet}箱）
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">在庫</label>
                          <input
                            type="number"
                            min={0}
                            value={boxCount}
                            onChange={(e) => updatePkg(product.id, "box_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center"
                          />
                          <span className="text-xs text-slate-400">セット</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">発送</label>
                          <input
                            type="number"
                            min={0}
                            value={shipped}
                            onChange={(e) => updatePkg(product.id, "shipped_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center"
                          />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          remaining <= 0 ? "bg-red-100 text-red-700"
                            : remaining <= 3 ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}>
                          残 {remaining}
                        </span>
                        <div className="flex-1 min-w-[100px]">
                          <input
                            type="text"
                            placeholder="メモ"
                            value={v?.note ?? ""}
                            onChange={(e) => updatePkg(product.id, "note", e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 移行プラン（EMタブのみ） */}
            {isEMTab && (
              <>
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 border-t">
                  <span className="text-xs font-semibold text-amber-700">移行プラン（EM用）</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {TRANSITION_ITEMS.map((item) => {
                    const storeEdits = pkgEdits[activeTab] || {};
                    const v = storeEdits[item.item_key];
                    const boxCount = v?.box_count ?? 0;
                    const shipped = v?.shipped_count ?? 0;
                    const remaining = boxCount - shipped;
                    return (
                      <div key={item.item_key} className="px-4 py-3 flex flex-wrap items-center gap-4 hover:bg-slate-50">
                        <div className="w-36 min-w-0">
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                          <span className="text-xs text-slate-400 ml-1">({item.desc})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">在庫</label>
                          <input
                            type="number"
                            min={0}
                            value={boxCount}
                            onChange={(e) => updatePkg(item.item_key, "box_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center"
                          />
                          <span className="text-xs text-slate-400">セット</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">発送</label>
                          <input
                            type="number"
                            min={0}
                            value={shipped}
                            onChange={(e) => updatePkg(item.item_key, "shipped_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center"
                          />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          remaining <= 0 ? "bg-red-100 text-red-700"
                            : remaining <= 3 ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}>
                          残 {remaining}
                        </span>
                        <div className="flex-1 min-w-[100px]">
                          <input
                            type="text"
                            placeholder="メモ"
                            value={v?.note ?? ""}
                            onChange={(e) => updatePkg(item.item_key, "note", e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ===== 在庫推移（日次×用量マトリクス） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-700">在庫推移</h2>
              <p className="text-xs text-slate-500 mt-0.5">箱在庫の日次推移（発送分差引後）</p>
            </div>
            {historyMatrix.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">まだデータがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-2 text-slate-500 font-medium sticky left-0 bg-white">日付</th>
                      {DOSAGES.map((d) => (
                        <th key={d} className="px-3 py-2 text-slate-500 font-medium text-center">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyMatrix.map((row) => {
                      const dateObj = new Date(row.date + "T00:00:00");
                      const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                      const isToday = row.date === todayStr();
                      return (
                        <tr key={row.date} className={`border-b border-slate-100 ${isToday ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                          <td className={`px-4 py-2 font-medium sticky left-0 ${isToday ? "bg-blue-50/50 text-blue-700" : "bg-white text-slate-700"}`}>
                            {label}
                          </td>
                          {DOSAGES.map((dose) => {
                            const cell = row.cells[dose];
                            const remain = cell.boxCount * 2 - cell.shipped;
                            const hasData = cell.boxCount > 0 || cell.shipped > 0 || cell.received > 0;
                            return (
                              <td key={dose} className="px-3 py-2 text-center">
                                {hasData ? (
                                  <div>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                      remain <= 0 ? "bg-red-100 text-red-700"
                                        : remain <= 6 ? "bg-amber-100 text-amber-700"
                                          : "bg-emerald-100 text-emerald-700"
                                    }`}>
                                      {cell.boxCount}箱
                                    </span>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {cell.shipped > 0 ? `${remain}本残` : `${cell.boxCount * 2}本`}
                                    </div>
                                    {cell.received > 0 && (
                                      <div className="text-[10px] text-green-600 font-medium mt-0.5">
                                        +{cell.received}箱入荷
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
