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

// 移行プランの用量別箱数内訳
const TRANSITION_BOX_MAP: Record<string, Record<string, number>> = {
  transition_1: { "2.5mg": 1, "5mg": 1 },
  transition_1x2: { "2.5mg": 2, "5mg": 2 },
  transition_2: { "5mg": 1, "7.5mg": 1 },
  transition_3: { "7.5mg": 1, "10mg": 1 },
};

// EM用の追加梱包アイテム（productsテーブルで非活性の用量）
const EXTRA_EM_PACKAGED = [
  { item_key: "em_10mg_1m", label: "10mg 1ヶ月（2箱）", dosage: "10mg", duration: 1, boxesPerSet: 2 },
  { item_key: "em_10mg_2m", label: "10mg 2ヶ月（4箱）", dosage: "10mg", duration: 2, boxesPerSet: 4 },
  { item_key: "em_10mg_3m", label: "10mg 3ヶ月（6箱）", dosage: "10mg", duration: 3, boxesPerSet: 6 },
  { item_key: "em_12.5mg_1m", label: "12.5mg 1ヶ月（2箱）", dosage: "12.5mg", duration: 1, boxesPerSet: 2 },
  { item_key: "em_12.5mg_2m", label: "12.5mg 2ヶ月（4箱）", dosage: "12.5mg", duration: 2, boxesPerSet: 4 },
  { item_key: "em_12.5mg_3m", label: "12.5mg 3ヶ月（6箱）", dosage: "12.5mg", duration: 3, boxesPerSet: 6 },
];

// のなめ発送アイテム（箱単位、2.5-7.5mgのみ）
const NONAME_SHIP_ITEMS = [
  { item_key: "noname_ship_2.5mg", label: "2.5mg", dosage: "2.5mg" },
  { item_key: "noname_ship_5mg", label: "5mg", dosage: "5mg" },
  { item_key: "noname_ship_7.5mg", label: "7.5mg", dosage: "7.5mg" },
];

const NONAME_DOSAGES = ["2.5mg", "5mg", "7.5mg"];
const DOSAGES = ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg"];
const SHARED_LOCATION = "共有";

type Val = { box_count: number; shipped_count: number; received_count: number; note: string };
type ValMap = Record<string, Val>;
type MainTab = "journal" | "ledger";

// 日本の祝日判定（振替休日対応）
function isJapaneseHoliday(d: Date): boolean {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const key = `${m}-${day}`;

  // 固定祝日
  const fixed = new Set([
    "1-1",   // 元日
    "2-11",  // 建国記念の日
    "2-23",  // 天皇誕生日
    "4-29",  // 昭和の日
    "5-3",   // 憲法記念日
    "5-4",   // みどりの日
    "5-5",   // こどもの日
    "8-11",  // 山の日
    "11-3",  // 文化の日
    "11-23", // 勤労感謝の日
  ]);
  if (fixed.has(key)) return true;

  // ハッピーマンデー
  const dow = d.getDay();
  const weekOfMonth = Math.ceil(day / 7);
  if (dow === 1) {
    if (m === 1 && weekOfMonth === 2) return true;  // 成人の日（1月第2月曜）
    if (m === 7 && weekOfMonth === 3) return true;  // 海の日（7月第3月曜）
    if (m === 9 && weekOfMonth === 3) return true;  // 敬老の日（9月第3月曜）
    if (m === 10 && weekOfMonth === 2) return true; // スポーツの日（10月第2月曜）
  }

  // 春分の日・秋分の日（近似式）
  if (m === 3) {
    const vernal = Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
    if (day === vernal) return true;
  }
  if (m === 9) {
    const autumnal = Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
    if (day === autumnal) return true;
  }

  // 振替休日: 祝日が日曜の場合、翌月曜が振替休日
  if (dow === 1) {
    const yesterday = new Date(y, m - 1, day - 1);
    if (yesterday.getDay() === 0 && isJapaneseHoliday(yesterday)) return true;
  }

  return false;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

export default function InventoryPage() {
  const [mainTab, setMainTab] = useState<MainTab>("journal");
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

  // 台帳: 梱包済みの店舗サブタブ
  const [storeTab, setStoreTab] = useState("");
  // 履歴データ（マトリクス用）
  const [historyLogs, setHistoryLogs] = useState<LogEntry[]>([]);

  // 仕訳: のなめ自動入力
  const [autoFillBase, setAutoFillBase] = useState<Record<string, number>>({});
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  const isEMTab = storeTab.includes("EM");

  // データ取得（両タブ共通）
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
      if (!storeTab || !locs.includes(storeTab)) {
        setStoreTab(locs[0]);
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        setHistoryLogs(histData.logs || []);
      }

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
    if (locations.length > 0 && !locations.includes(storeTab)) {
      setStoreTab(locations[0]);
    }
  }, [locations, storeTab]);

  // エントリ組み立て（台帳 + 仕訳の全データを含む）
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

    const nonameEntries = NONAME_SHIP_ITEMS.map((n) => ({
      item_key: n.item_key,
      section: "box",
      location: SHARED_LOCATION,
      box_count: 0,
      shipped_count: boxEdits[n.item_key]?.shipped_count ?? 0,
      received_count: 0,
      note: "",
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
    if (
      JSON.stringify(boxEdits) === JSON.stringify(boxOriginal) &&
      JSON.stringify(pkgEdits) === JSON.stringify(pkgOriginal)
    ) return;

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
          // 推移データも更新
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
  }, [boxEdits, pkgEdits]); // eslint-disable-line react-hooks/exhaustive-deps

  // 値更新
  const updateBox = (key: string, field: keyof Val, value: number | string) => {
    setBoxEdits((prev) => ({
      ...prev,
      [key]: { box_count: prev[key]?.box_count ?? 0, shipped_count: prev[key]?.shipped_count ?? 0, received_count: prev[key]?.received_count ?? 0, note: prev[key]?.note ?? "", [field]: value },
    }));
  };

  const updatePkg = (key: string, field: keyof Val, value: number | string) => {
    setPkgEdits((prev) => ({
      ...prev,
      [storeTab]: {
        ...prev[storeTab],
        [key]: {
          box_count: prev[storeTab]?.[key]?.box_count ?? 0,
          shipped_count: prev[storeTab]?.[key]?.shipped_count ?? 0,
          received_count: prev[storeTab]?.[key]?.received_count ?? 0,
          note: prev[storeTab]?.[key]?.note ?? "",
          [field]: value,
        },
      },
    }));
  };

  // のなめ発送自動入力
  const handleAutoFill = async () => {
    setAutoFillLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/shipping-summary?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      const summary: Record<string, number> = data.summary || {};

      const base: Record<string, number> = {};
      const newEdits = { ...boxEdits };

      for (const item of NONAME_SHIP_ITEMS) {
        const boxes = summary[item.dosage] || 0;
        base[item.item_key] = boxes;
        newEdits[item.item_key] = {
          box_count: newEdits[item.item_key]?.box_count ?? 0,
          shipped_count: boxes,
          received_count: newEdits[item.item_key]?.received_count ?? 0,
          note: newEdits[item.item_key]?.note ?? "",
        };
      }

      setAutoFillBase(base);
      setBoxEdits(newEdits);
      setMessage(`発送データ取得完了（${data.orderCount}件）`);
    } catch {
      setMessage("発送データの取得に失敗しました");
    } finally {
      setAutoFillLoading(false);
    }
  };

  const hasChanges =
    JSON.stringify(boxEdits) !== JSON.stringify(boxOriginal) ||
    JSON.stringify(pkgEdits) !== JSON.stringify(pkgOriginal);

  // 梱包済み商品をグルーピング
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

  // ===== 在庫推移マトリクス（ランニングバランス） =====
  const productMap = useMemo(() => {
    const m: Record<string, { dosage: string; boxesPerSet: number }> = {};
    for (const p of products) {
      if (p.dosage) m[p.id] = { dosage: p.dosage, boxesPerSet: (p.quantity ?? 4) / 2 };
    }
    return m;
  }, [products]);

  // 日付ごとの生データを集計
  const dailyRaw = useMemo(() => {
    const dateSet = new Set<string>();
    for (const log of historyLogs) dateSet.add(log.logged_date);
    const dates = Array.from(dateSet).sort(); // 昇順（繰越計算用）

    const result: Array<{ date: string; cells: Record<string, { boxCount: number; received: number; shipped: number }> }> = [];

    for (const date of dates) {
      const cells: Record<string, { boxCount: number; received: number; shipped: number }> = {};
      for (const dose of DOSAGES) cells[dose] = { boxCount: 0, received: 0, shipped: 0 };

      for (const log of historyLogs) {
        if (log.logged_date !== date) continue;

        if (log.section === "box") {
          const dose = log.item_key.replace("box_", "");
          if (cells[dose]) {
            cells[dose].boxCount += log.box_count;
            cells[dose].received += log.received_count ?? 0;
            cells[dose].shipped += log.shipped_count / 2; // EM: 本数→箱
          }
          const nonameDose = log.item_key.replace("noname_ship_", "");
          if (nonameDose !== log.item_key && cells[nonameDose]) {
            cells[nonameDose].shipped += log.shipped_count; // のなめ: 箱のまま
          }
        } else if (log.section === "packaged") {
          const pm = productMap[log.item_key];
          if (pm && cells[pm.dosage]) {
            cells[pm.dosage].boxCount += log.box_count * pm.boxesPerSet;
          }
          const ex = EXTRA_EM_PACKAGED.find(e => e.item_key === log.item_key);
          if (ex && cells[ex.dosage]) {
            cells[ex.dosage].boxCount += log.box_count * ex.boxesPerSet;
          }
          const tb = TRANSITION_BOX_MAP[log.item_key];
          if (tb) {
            for (const [dose, boxes] of Object.entries(tb)) {
              if (cells[dose]) cells[dose].boxCount += log.box_count * boxes;
            }
          }
        }
      }

      result.push({ date, cells });
    }
    return result;
  }, [historyLogs, productMap]);

  // ランニングバランス計算
  const historyMatrix = useMemo(() => {
    const prevClosing: Record<string, number> = {};
    const matrix: Array<{
      date: string;
      cells: Record<string, { opening: number; received: number; shipped: number; total: number }>;
    }> = [];

    for (const day of dailyRaw) {
      const cells: Record<string, { opening: number; received: number; shipped: number; total: number }> = {};

      for (const dose of DOSAGES) {
        const raw = day.cells[dose];
        // 台帳が入力済み（boxCount > 0）ならその値を使用、なければ前日の繰越
        const opening = raw.boxCount > 0 ? raw.boxCount : (prevClosing[dose] ?? 0);
        const total = opening + raw.received - raw.shipped;
        cells[dose] = { opening, received: raw.received, shipped: raw.shipped, total };
        prevClosing[dose] = total;
      }

      matrix.push({ date: day.date, cells });
    }

    return matrix.reverse(); // 降順（新しい日が上）
  }, [dailyRaw]);

  // サマリー: 最新の推移データから取得
  const latestBalance = useMemo(() => {
    const bal: Record<string, number> = {};
    if (historyMatrix.length > 0) {
      const latest = historyMatrix[0]; // 降順なので[0]が最新
      for (const dose of DOSAGES) {
        bal[dose] = latest.cells[dose].total;
      }
    }
    return bal;
  }, [historyMatrix]);

  // 仕訳の合計
  const receivedTotal = BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.received_count ?? 0), 0);
  const emShippedTotal = BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.shipped_count ?? 0), 0);
  const nonameShippedTotal = NONAME_SHIP_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.shipped_count ?? 0), 0);

  const storeTabClass = (name: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      storeTab === name ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー + メインタブ */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">在庫管理</h1>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMainTab("journal")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainTab === "journal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            仕訳
          </button>
          <button
            onClick={() => setMainTab("ledger")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainTab === "ledger" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            在庫台帳
          </button>
        </div>
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

      {/* ===== サマリーカード（常に表示） ===== */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {BOX_ITEMS.map((item) => {
          const dosage = item.label;
          const total = latestBalance[dosage] ?? 0;
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
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-slate-500">読み込み中...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ==================== 仕訳タブ ==================== */}
          {mainTab === "journal" && (
            <>
              {/* 入荷（箱単位） */}
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

              {/* EM発送（本数単位） */}
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

              {/* のなめ発送（箱単位） */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-purple-900">のなめ発送</h2>
                    <p className="text-xs text-purple-600 mt-0.5">用量別の発送箱数（1箱 = 2本）</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-purple-600 font-medium">合計 {nonameShippedTotal}箱</span>
                    <button
                      onClick={handleAutoFill}
                      disabled={autoFillLoading}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        autoFillLoading
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      {autoFillLoading ? "取得中..." : "発送データ自動入力"}
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {NONAME_SHIP_ITEMS.map((item) => {
                    const shipped = boxEdits[item.item_key]?.shipped_count ?? 0;
                    const base = autoFillBase[item.item_key];
                    const extra = base !== undefined ? shipped - base : undefined;
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
                        {base !== undefined && (
                          <span className="text-xs text-purple-500">
                            （発送データ: {base}箱{extra && extra > 0 ? ` + 追加: ${extra}箱` : ""})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ==================== 台帳タブ ==================== */}
          {mainTab === "ledger" && (
            <>
              {/* 箱在庫（共有ストック） */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-blue-900">薬剤箱在庫</h2>
                    <p className="text-xs text-blue-600 mt-0.5">1箱 = 2本 / 現在の実数</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-900">
                      {BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.box_count ?? 0), 0)}箱
                    </span>
                    <span className="text-xs text-blue-600 ml-1">
                      ({BOX_ITEMS.reduce((sum, item) => sum + (boxEdits[item.item_key]?.box_count ?? 0) * item.units, 0)}本)
                    </span>
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

              {/* 梱包済み在庫（店舗別サブタブ） */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-emerald-900">梱包済み在庫</h2>
                    <p className="text-xs text-emerald-600 mt-0.5">発送準備完了セット（店舗別）</p>
                  </div>
                  {locations.length > 1 && (
                    <div className="flex gap-1 bg-emerald-100/60 rounded-lg p-1">
                      {locations.map((loc) => (
                        <button key={loc} onClick={() => setStoreTab(loc)} className={storeTabClass(loc)}>
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
                        const storeEdits = pkgEdits[storeTab] || {};
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

                {/* 10mg/12.5mg 梱包済み（EMタブのみ） */}
                {isEMTab && ["10mg", "12.5mg"].map((dose) => {
                  const items = EXTRA_EM_PACKAGED.filter(e => e.dosage === dose);
                  if (items.length === 0) return null;
                  return (
                    <div key={dose}>
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 border-t">
                        <span className="text-xs font-semibold text-slate-600">マンジャロ {dose}</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {items.map((item) => {
                          const storeEdits = pkgEdits[storeTab] || {};
                          const v = storeEdits[item.item_key];
                          const boxCount = v?.box_count ?? 0;
                          return (
                            <div key={item.item_key} className="px-4 py-3 flex flex-wrap items-center gap-4 hover:bg-slate-50">
                              <div className="w-36 min-w-0">
                                <span className="text-sm font-medium text-slate-700">{item.duration}ヶ月（{item.boxesPerSet}箱）</span>
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
                    </div>
                  );
                })}

                {/* 移行プラン（EMタブのみ） */}
                {isEMTab && (
                  <>
                    <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 border-t">
                      <span className="text-xs font-semibold text-amber-700">移行プラン（EM用）</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {TRANSITION_ITEMS.map((item) => {
                        const storeEdits = pkgEdits[storeTab] || {};
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
            </>
          )}

          {/* ===== 在庫推移（ランニングバランス） ===== */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-700">在庫推移</h2>
              <p className="text-xs text-slate-500 mt-0.5">前日繰越 + 入荷 - 発送 = 翌日在庫（箱単位）</p>
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
                      const dow = dateObj.getDay();
                      const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                      const isToday = row.date === todayStr();
                      const isSunday = dow === 0;
                      const isSaturday = dow === 6;
                      const isHoliday = !isSunday && isJapaneseHoliday(dateObj);
                      const dateColor = isToday
                        ? "text-blue-700"
                        : isSunday || isHoliday
                          ? "text-red-500"
                          : isSaturday
                            ? "text-blue-500"
                            : "text-slate-700";
                      return (
                        <tr key={row.date} className={`border-b border-slate-100 ${isToday ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                          <td className={`px-4 py-2 font-medium sticky left-0 z-10 ${isToday ? "bg-blue-50/50" : "bg-white"} ${dateColor}`}>
                            {label}
                          </td>
                          {DOSAGES.map((dose) => {
                            const cell = row.cells[dose];
                            const hasData = cell.opening > 0 || cell.shipped > 0 || cell.received > 0;
                            return (
                              <td key={dose} className="px-3 py-2 text-center">
                                {hasData ? (
                                  <div className="space-y-0.5">
                                    <div className="text-[10px] text-slate-400">
                                      繰越 <span className="font-medium text-slate-600">{cell.opening}</span>
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
