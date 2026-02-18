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

// 移行プランの用量別箱数内訳（サマリー計算用）
const TRANSITION_BOX_MAP: Record<string, Record<string, number>> = {
  transition_1: { "2.5mg": 1, "5mg": 1 },
  transition_1x2: { "2.5mg": 2, "5mg": 2 },
  transition_2: { "5mg": 1, "7.5mg": 1 },
  transition_3: { "7.5mg": 1, "10mg": 1 },
};

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

export default function InventoryLedgerPage() {
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

  // エントリ組み立て（台帳は box_count のみ編集、shipped_count/received_count は元値を保持）
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

  // 箱在庫の自動保存（1.5秒デバウンス）
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

  // 箱在庫の値更新（台帳では box_count のみ編集）
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

  // 梱包済み商品を drug_name+dosage でグルーピング
  // のなめタブでは 2.5-7.5mg のみ表示
  const grouped = useMemo(() => {
    const filtered = isEMTab
      ? products
      : products.filter((p) => NONAME_DOSAGES.includes(p.dosage ?? ""));

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
  }, [products, isEMTab]);

  // 在庫サマリー: 日付×用量マトリクス（過去14日分）
  const DOSAGES = ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg"];

  const historyMatrix = useMemo(() => {
    // 全日付を収集（box以外のセクションも含む）
    const dateSet = new Set<string>();
    for (const log of historyLogs) {
      dateSet.add(log.logged_date);
    }
    const dates = Array.from(dateSet).sort().reverse();

    // 商品IDから用量・箱数換算マップ
    const productMap: Record<string, { dosage: string; boxesPerSet: number }> = {};
    for (const p of products) {
      if (p.dosage) {
        productMap[p.id] = { dosage: p.dosage, boxesPerSet: (p.quantity ?? 4) / 2 };
      }
    }

    const matrix: Array<{ date: string; cells: Record<string, { boxCount: number; received: number; shipped: number; total: number }> }> = [];
    for (const date of dates) {
      const cells: Record<string, { boxCount: number; received: number; shipped: number; total: number }> = {};
      for (const dose of DOSAGES) {
        cells[dose] = { boxCount: 0, received: 0, shipped: 0, total: 0 };
      }

      for (const log of historyLogs) {
        if (log.logged_date !== date) continue;

        if (log.section === "box") {
          // 箱在庫セクション
          const dose = log.item_key.replace("box_", "");
          if (cells[dose]) {
            cells[dose].boxCount += log.box_count;
            cells[dose].received += log.received_count ?? 0;
            cells[dose].shipped += log.shipped_count;
          }
        } else if (log.section === "packaged") {
          // 梱包済み商品 → 箱数換算
          const pm = productMap[log.item_key];
          if (pm && cells[pm.dosage]) {
            cells[pm.dosage].boxCount += log.box_count * pm.boxesPerSet;
            cells[pm.dosage].shipped += log.shipped_count * pm.boxesPerSet;
          }
          // 12.5mg 追加アイテム
          const ex = EXTRA_EM_PACKAGED.find(e => e.item_key === log.item_key);
          if (ex && cells[ex.dosage]) {
            cells[ex.dosage].boxCount += log.box_count * ex.boxesPerSet;
            cells[ex.dosage].shipped += log.shipped_count * ex.boxesPerSet;
          }
          // 移行プラン → 用量別箱数換算
          const tb = TRANSITION_BOX_MAP[log.item_key];
          if (tb) {
            for (const [dose, boxes] of Object.entries(tb)) {
              if (cells[dose]) {
                cells[dose].boxCount += log.box_count * boxes;
                cells[dose].shipped += log.shipped_count * boxes;
              }
            }
          }
        }
      }

      // 合計 = 今ある箱数 + 入荷 - 発送
      for (const dose of DOSAGES) {
        cells[dose].total = cells[dose].boxCount + cells[dose].received - cells[dose].shipped;
      }

      matrix.push({ date, cells });
    }
    return matrix;
  }, [historyLogs, products]);

  const tabClass = (name: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      activeTab === name ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">在庫台帳</h1>
        <p className="text-slate-500 text-sm mt-1">在庫の実数管理</p>
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
        <a
          href="/admin/inventory/journal"
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          仕訳ページへ
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
          {/* ===== 各用量の総箱数サマリー ===== */}
          <div className="grid grid-cols-5 gap-3">
            {BOX_ITEMS.map((item) => {
              const dosage = item.label;
              // 1. 薬剤箱在庫（共有ストック）
              const rawBoxes = boxEdits[item.item_key]?.box_count ?? 0;
              // 2. 梱包済みセットに含まれる箱数（全店舗合計）
              let pkgBoxes = 0;
              for (const loc of locations) {
                const storeEdits = pkgEdits[loc] || {};
                // 商品の梱包済みセット
                for (const p of products) {
                  if (p.dosage === dosage) {
                    const sets = storeEdits[p.id]?.box_count ?? 0;
                    const boxesPerSet = (p.quantity ?? 4) / 2;
                    pkgBoxes += sets * boxesPerSet;
                  }
                }
                // 12.5mg等の追加梱包アイテム
                for (const ex of EXTRA_EM_PACKAGED) {
                  if (ex.dosage === dosage) {
                    const sets = storeEdits[ex.item_key]?.box_count ?? 0;
                    pkgBoxes += sets * ex.boxesPerSet;
                  }
                }
                // 移行プランの箱数
                for (const t of TRANSITION_ITEMS) {
                  const breakdown = TRANSITION_BOX_MAP[t.item_key];
                  if (breakdown?.[dosage]) {
                    const sets = storeEdits[t.item_key]?.box_count ?? 0;
                    pkgBoxes += sets * breakdown[dosage];
                  }
                }
              }
              const total = rawBoxes + pkgBoxes;
              return (
                <div key={item.item_key} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">{dosage}</div>
                  <div className={`text-2xl font-bold ${
                    total <= 0 ? "text-red-600"
                      : total <= 5 ? "text-amber-600"
                        : "text-slate-900"
                  }`}>
                    {total}<span className="text-sm font-normal text-slate-400 ml-0.5">箱</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{total * item.units}本</div>
                  {pkgBoxes > 0 && (
                    <div className="text-[10px] text-blue-500 mt-1">
                      未梱包{rawBoxes} + 梱包済{pkgBoxes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===== 箱在庫（共有ストック） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-blue-900">薬剤箱在庫</h2>
                <p className="text-xs text-blue-600 mt-0.5">1箱 = 2本 / 現在の実数</p>
              </div>
              <div className="flex items-center gap-3">
                {autoSaveStatus && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    autoSaveStatus === "saving" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    {autoSaveStatus === "saving" ? "保存中..." : "保存済み"}
                  </span>
                )}
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-900">
                    {BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.box_count ?? 0), 0)}箱
                  </span>
                  <span className="text-xs text-blue-600 ml-1">
                    ({BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.box_count ?? 0) * item.units, 0)}本)
                  </span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {BOX_ITEMS.map((item) => {
                const v = boxEdits[item.item_key];
                const count = v?.box_count ?? 0;
                return (
                  <div key={item.item_key} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50">
                    <div className="w-24">
                      <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={count}
                        onFocus={selectOnFocus}
                        onChange={(e) => updateBox(item.item_key, "box_count", parseInt(e.target.value) || 0)}
                        className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-slate-400">箱</span>
                    </div>
                    <span className="text-xs text-slate-500">= {count * item.units}本</span>
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
                            onFocus={selectOnFocus}
                            onChange={(e) => updatePkg(product.id, "box_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-slate-400">セット</span>
                        </div>
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

            {/* 12.5mg 梱包済み（EMタブのみ） */}
            {isEMTab && (
              <>
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 border-t">
                  <span className="text-xs font-semibold text-slate-600">マンジャロ 12.5mg</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {EXTRA_EM_PACKAGED.map((item) => {
                    const storeEdits = pkgEdits[activeTab] || {};
                    const v = storeEdits[item.item_key];
                    const boxCount = v?.box_count ?? 0;
                    return (
                      <div key={item.item_key} className="px-4 py-3 flex flex-wrap items-center gap-4 hover:bg-slate-50">
                        <div className="w-36 min-w-0">
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">在庫</label>
                          <input
                            type="number"
                            min={0}
                            value={boxCount}
                            onFocus={selectOnFocus}
                            onChange={(e) => updatePkg(item.item_key, "box_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-slate-400">セット</span>
                        </div>
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
                            onFocus={selectOnFocus}
                            onChange={(e) => updatePkg(item.item_key, "box_count", parseInt(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-slate-400">セット</span>
                        </div>
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
              <p className="text-xs text-slate-500 mt-0.5">箱在庫 + 梱包済み（箱換算）の合計推移</p>
            </div>
            {historyMatrix.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">まだデータがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-2 text-slate-500 font-medium sticky left-0 bg-white z-10">日付</th>
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
                          <td className={`px-4 py-2 font-medium sticky left-0 z-10 ${isToday ? "bg-blue-50/50 text-blue-700" : "bg-white text-slate-700"}`}>
                            {label}
                          </td>
                          {DOSAGES.map((dose) => {
                            const cell = row.cells[dose];
                            const hasData = cell.boxCount > 0 || cell.shipped > 0 || cell.received > 0;
                            return (
                              <td key={dose} className="px-3 py-2 text-center">
                                {hasData ? (
                                  <div className="space-y-0.5">
                                    <div className="text-[10px] text-slate-400">
                                      在庫 <span className="font-medium text-slate-600">{cell.boxCount}</span>
                                    </div>
                                    {cell.received > 0 && (
                                      <div className="text-[10px] text-green-600">
                                        入荷 <span className="font-medium">+{cell.received}</span>
                                      </div>
                                    )}
                                    {cell.shipped > 0 && (
                                      <div className="text-[10px] text-orange-600">
                                        発送 <span className="font-medium">-{cell.shipped}</span>
                                      </div>
                                    )}
                                    <div>
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                        cell.total <= 0 ? "bg-red-100 text-red-700"
                                          : cell.total <= 5 ? "bg-amber-100 text-amber-700"
                                            : "bg-emerald-100 text-emerald-700"
                                      }`}>
                                        {cell.total}箱
                                      </span>
                                    </div>
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
