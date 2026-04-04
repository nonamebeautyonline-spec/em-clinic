"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import LZString from "lz-string";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortMode = "dosage" | "date_asc" | "date_desc" | "name" | "price_desc" | "price_asc" | "manual";

interface PendingOrder {
  id: string;
  patient_id: string;
  patient_name?: string;
  postal_code?: string;
  address?: string;
  email?: string;
  phone?: string;
  product_name: string;
  product_code: string;
  amount?: number;
  payment_date: string;
  status: string;
  shipping_list_created_at?: string | null;
}

interface ShippingItem {
  id: string;
  patient_id: string;
  payment_id: string;
  payment_date: string;
  name: string;
  postal_code: string;
  address: string;
  email: string;
  phone: string;
  product_name: string;
  product_code: string;
  price: number;
  dosage_2_5mg: number;
  dosage_5mg: number;
  dosage_7_5mg: number;
  dosage_10mg: number;
  tracking_number: string;
  status: string;
  selected: boolean;
  shipping_list_created_at: string | null;
  isListCreated: boolean;
  editable: {
    name: string;
    postal_code: string;
    address: string;
  };
}

export default function CreateShippingListPage() {
  const router = useRouter();
  const [items, setItems] = useState<ShippingItem[]>([]);
  const [originalItems, setOriginalItems] = useState<ShippingItem[]>([]); // 統合前の状態を保存
  const [isMerged, setIsMerged] = useState(false); // 統合済みフラグ
  const [error, setError] = useState("");
  const [mergeableGroups, setMergeableGroups] = useState<{ patient_id: string; patient_name: string; postal_code?: string; count: number; orders?: PendingOrder[] }[]>([]);
  const [sameNameDiffAddress, setSameNameDiffAddress] = useState<{ patient_name: string; count: number; postal_codes: string[] }[]>([]);
  const [sameAddressGroups, setSameAddressGroups] = useState<{ postal_code: string; patient_names: string[]; count: number; orders?: PendingOrder[] }[]>([]);
  const [selectedMergePatients, setSelectedMergePatients] = useState<Set<string>>(new Set());
  const [selectedMergePostals, setSelectedMergePostals] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("dosage");
  const tableRef = useRef<HTMLTableElement>(null);
  const [dataInitialized, setDataInitialized] = useState(false);

  const { data: pendingData, error: pendingError, isLoading: loading, isValidating } = useSWR<{
    orders: PendingOrder[];
    mergeableGroups: { patient_id: string; patient_name: string; postal_code?: string; count: number; orders?: PendingOrder[] }[];
    sameAddressGroups?: { postal_code: string; patient_names: string[]; count: number; orders?: PendingOrder[] }[];
    sameNameDiffAddress?: { patient_name: string; count: number; postal_codes: string[] }[];
  }>(
    "/api/admin/shipping/pending",
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (pendingError) {
      console.error("Orders fetch error:", pendingError);
      setError(pendingError instanceof Error ? pendingError.message : "エラーが発生しました");
      return;
    }
    if (!pendingData) return;
    if (dataInitialized) return; // ローカル編集中は上書きしない
    const orders = pendingData.orders || [];
    const mg = pendingData.mergeableGroups || [];
    const sag = pendingData.sameAddressGroups || [];
    setMergeableGroups(mg);
    setSameAddressGroups(sag);
    setSameNameDiffAddress(pendingData.sameNameDiffAddress || []);

    // デフォルトで同一患者グループは全選択
    setSelectedMergePatients(new Set(mg.map(g => g.patient_id)));
    setSelectedMergePostals(new Set());

    // 統合候補または注意喚起がある場合はモーダルを表示
    if (mg.length > 0 || sag.length > 0 || (pendingData.sameNameDiffAddress || []).length > 0) {
      setShowMergeModal(true);
    }

    // ★ URLクエリパラメータから選択されたIDを取得（クライアントサイドのみ）
    const urlParams = new URLSearchParams(window.location.search);
    const idsParam = urlParams.get("ids");
    const selectedIds = idsParam ? idsParam.split(",").map(id => id.trim()) : null;

    // 用量を計算してフォーマット
    const formattedItems: ShippingItem[] = orders
      .filter((o: PendingOrder) => o.status === "confirmed") // 確認済みのみ
      .filter((o: PendingOrder) => {
        // ★ idsパラメータがある場合は、そのIDだけをフィルタ
        if (selectedIds && selectedIds.length > 0) {
          return selectedIds.includes(o.id);
        }
        return true; // idsパラメータがない場合は全て表示
      })
      .map((order: PendingOrder) => {
        const dosages = calculateDosage(order.product_code);
        return {
          id: order.id,
          patient_id: order.patient_id,
          payment_id: order.id,
          payment_date: order.payment_date,
          name: order.patient_name || "",
          postal_code: order.postal_code || "",
          address: order.address || "",
          email: order.email || "",
          phone: order.phone || "",
          product_name: order.product_name,
          product_code: order.product_code,
          price: order.amount || 0,
          dosage_2_5mg: dosages["2.5mg"],
          dosage_5mg: dosages["5mg"],
          dosage_7_5mg: dosages["7.5mg"],
          dosage_10mg: dosages["10mg"],
          tracking_number: "",
          status: order.status,
          selected: true, // デフォルトで全選択（フィルタリング済みリスト）
          shipping_list_created_at: order.shipping_list_created_at || null,
          isListCreated: false,
          editable: {
            name: order.patient_name || "",
            postal_code: order.postal_code || "",
            address: order.address || "",
          },
        };
      });

    // 用量順にソート（2.5mg → 5mg → 7.5mg → 10mg、本数が多い順）
    const sorted = sortByDosage(formattedItems);
    setItems(sorted);
    setDataInitialized(true);
  }, [pendingData, pendingError, dataInitialized]);

  const calculateDosage = (productCode: string): Record<string, number> => {
    const dosages: Record<string, number> = { "2.5mg": 0, "5mg": 0, "7.5mg": 0, "10mg": 0 };

    // MJL_2.5mg_1m → 2.5mg x 4本
    // MJL_5mg_2m → 5mg x 8本
    const match = productCode.match(/MJL_([\d.]+)mg_(\d+)m/);
    if (match) {
      const strength = match[1];
      const months = parseInt(match[2], 10);
      const count = months * 4; // 1ヶ月 = 4本

      const key = `${strength}mg`;
      if (key in dosages) {
        dosages[key] = count;
      }
    }

    return dosages;
  };

  // ★ アイテムが統合されたものか判定
  const isMergedItem = (item: ShippingItem): boolean => {
    const counts = [item.dosage_2_5mg, item.dosage_5mg, item.dosage_7_5mg, item.dosage_10mg];
    const nonZeroCount = counts.filter(c => c > 0).length;
    return nonZeroCount > 1; // 2つ以上の用量に本数がある = 統合
  };

  // ★ 統合アイテムの組み合わせパターンを取得（例: "2.5mg+5mg", "5mg+7.5mg"）
  const getCombinationPattern = (item: ShippingItem): string => {
    const dosages = [];
    if (item.dosage_2_5mg > 0) dosages.push('2.5mg');
    if (item.dosage_5mg > 0) dosages.push('5mg');
    if (item.dosage_7_5mg > 0) dosages.push('7.5mg');
    if (item.dosage_10mg > 0) dosages.push('10mg');
    return dosages.join('+');
  };

  // ★ ソート順: 単一用量アイテム（2.5mg → 5mg → 7.5mg → 10mg、本数降順） → 統合アイテム（組み合わせパターン順）
  const sortByDosage = (items: ShippingItem[]): ShippingItem[] => {
    const single = items.filter(item => !isMergedItem(item));
    const merged = items.filter(item => isMergedItem(item));

    // 単一用量アイテムのソート（用量・本数降順）
    const sortedSingle = single.sort((a, b) => {
      // 2.5mgの本数で降順ソート
      if (a.dosage_2_5mg !== b.dosage_2_5mg) {
        return b.dosage_2_5mg - a.dosage_2_5mg;
      }
      // 5mgの本数で降順ソート
      if (a.dosage_5mg !== b.dosage_5mg) {
        return b.dosage_5mg - a.dosage_5mg;
      }
      // 7.5mgの本数で降順ソート
      if (a.dosage_7_5mg !== b.dosage_7_5mg) {
        return b.dosage_7_5mg - a.dosage_7_5mg;
      }
      // 10mgの本数で降順ソート
      if (a.dosage_10mg !== b.dosage_10mg) {
        return b.dosage_10mg - a.dosage_10mg;
      }
      // 全て同じ場合は決済日時順
      return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
    });

    // 統合アイテムのソート（組み合わせパターン順、同パターン内は決済日時順）
    const sortedMerged = merged.sort((a, b) => {
      const patternA = getCombinationPattern(a);
      const patternB = getCombinationPattern(b);

      // 組み合わせパターンで比較（辞書順）
      if (patternA !== patternB) {
        return patternA.localeCompare(patternB);
      }

      // 同じパターンなら決済日時順
      return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
    });

    return [...sortedSingle, ...sortedMerged];
  };

  // ★ プリセットソート関数
  const sortByDate = (items: ShippingItem[], ascending: boolean): ShippingItem[] => {
    return [...items].sort((a, b) => {
      const diff = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      return ascending ? diff : -diff;
    });
  };

  const sortByName = (items: ShippingItem[]): ShippingItem[] => {
    return [...items].sort((a, b) => a.editable.name.localeCompare(b.editable.name, "ja"));
  };

  const sortByPrice = (items: ShippingItem[], descending: boolean): ShippingItem[] => {
    return [...items].sort((a, b) => descending ? b.price - a.price : a.price - b.price);
  };

  const applySortMode = useCallback((mode: SortMode, currentItems: ShippingItem[]): ShippingItem[] => {
    switch (mode) {
      case "dosage": return sortByDosage(currentItems);
      case "date_asc": return sortByDate(currentItems, true);
      case "date_desc": return sortByDate(currentItems, false);
      case "name": return sortByName(currentItems);
      case "price_desc": return sortByPrice(currentItems, true);
      case "price_asc": return sortByPrice(currentItems, false);
      case "manual": return currentItems; // 手動並び替え時はそのまま
      default: return currentItems;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sortByDosage等は安定した関数だが参照が毎回変わるため除外
  }, []);

  const handleApplySort = (mode: SortMode) => {
    setSortMode(mode);
    if (mode !== "manual") {
      setItems(applySortMode(mode, items));
    }
    setShowSortModal(false);
  };

  // ★ ドラッグ＆ドロップのハンドラ
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setItems(arrayMove(items, oldIndex, newIndex));
      setSortMode("manual");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setItems(items.map((item) => ({ ...item, selected: checked })));
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setItems(items.map((item) => (item.id === id ? { ...item, selected: checked } : item)));
  };

  const handleEditField = (id: string, field: keyof ShippingItem["editable"], value: string) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, editable: { ...item.editable, [field]: value } }
          : item
      )
    );
  };

  // ★ 統合/解除のトグル機能
  const handleToggleMerge = () => {
    if (isMerged) {
      // 統合を解除
      setItems(originalItems);
      setIsMerged(false);
    } else {
      // モーダルを表示して選択させる
      setShowMergeModal(true);
    }
  };

  // ★ モーダルから統合を実行
  const handleConfirmMerge = () => {
    if (selectedMergePatients.size === 0 && selectedMergePostals.size === 0) {
      setShowMergeModal(false);
      return;
    }
    setOriginalItems([...items]);
    mergeSelectedGroups(selectedMergePatients, selectedMergePostals);
    setIsMerged(true);
    setShowMergeModal(false);
  };

  // ★ 選択されたグループのみ統合（patient_id一致 + 郵便番号一致の両方に対応）
  const mergeSelectedGroups = (patientIds: Set<string>, postalCodes: Set<string>) => {
    const selectedItems = items.filter((item) => item.selected);
    const unselectedItems = items.filter((item) => !item.selected);

    // 統合対象のpatient_idまたは郵便番号に該当するアイテムを分離
    const toMerge: ShippingItem[] = [];
    const noMerge: ShippingItem[] = [];

    selectedItems.forEach((item) => {
      const postalKey = item.editable.postal_code.replace(/[-\s\u3000]/g, "").trim();
      if (patientIds.has(item.patient_id) || postalCodes.has(postalKey)) {
        toMerge.push(item);
      } else {
        noMerge.push(item);
      }
    });

    // 統合対象を郵便番号でグルーピング
    const grouped: Record<string, ShippingItem[]> = {};
    toMerge.forEach((item) => {
      const postalKey = item.editable.postal_code.replace(/[-\s\u3000]/g, "").trim();
      if (!grouped[postalKey]) grouped[postalKey] = [];
      grouped[postalKey].push(item);
    });

    const merged: ShippingItem[] = [];
    Object.entries(grouped).forEach(([, group]) => {
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        const first = group[0];
        const mergedItem: ShippingItem = {
          ...first,
          dosage_2_5mg: group.reduce((sum, item) => sum + item.dosage_2_5mg, 0),
          dosage_5mg: group.reduce((sum, item) => sum + item.dosage_5mg, 0),
          dosage_7_5mg: group.reduce((sum, item) => sum + item.dosage_7_5mg, 0),
          dosage_10mg: group.reduce((sum, item) => sum + item.dosage_10mg, 0),
          price: group.reduce((sum, item) => sum + item.price, 0),
          id: group[0].id,
          product_name: group.map((item) => item.product_name).join(", "),
        };
        merged.push(mergedItem);
      }
    });

    const sorted = sortByDosage([...merged, ...noMerge, ...unselectedItems]);
    setItems(sorted);
  };

  const handleExportYamatoB2 = async () => {
    const selectedItems = items.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      alert("発送する注文を選択してください");
      return;
    }

    setExporting(true);
    setError("");

    try {
      // ★ CSV作成直前にDBから最新の郵便番号・住所を再取得（顧客がマイページで変更した場合に反映）
      try {
        const freshRes = await fetch("/api/admin/shipping/pending", { credentials: "include" });
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          const freshOrders = freshData.orders || [];
          const freshMap = new Map<string, { postal_code: string; address: string; patient_name: string }>();
          freshOrders.forEach((o: PendingOrder) => {
            freshMap.set(o.id, { postal_code: o.postal_code || "", address: o.address || "", patient_name: o.patient_name || "" });
          });
          // ローカルstateの郵便番号・住所・名義を最新に更新（管理者が手動編集していない場合のみ）
          setItems((prev) =>
            prev.map((item) => {
              const fresh = freshMap.get(item.id);
              if (!fresh) return item;
              const postalUntouched = item.editable.postal_code === item.postal_code;
              const addressUntouched = item.editable.address === item.address;
              const nameUntouched = item.editable.name === item.name;
              return {
                ...item,
                postal_code: fresh.postal_code,
                address: fresh.address,
                name: fresh.patient_name || item.name,
                editable: {
                  ...item.editable,
                  postal_code: postalUntouched ? fresh.postal_code : item.editable.postal_code,
                  address: addressUntouched ? fresh.address : item.editable.address,
                  name: nameUntouched ? (fresh.patient_name || item.editable.name) : item.editable.name,
                },
              };
            })
          );
        }
      } catch (refreshErr) {
        console.warn("[ExportYamatoB2] 住所再取得に失敗（ローカルデータで続行）:", refreshErr);
      }

      // 最新のstateを取得（setItemsは非同期なのでselectedItemsを再計算）
      const latestItems = await new Promise<ShippingItem[]>((resolve) => {
        setItems((prev) => { resolve(prev); return prev; });
      });
      const latestSelected = latestItems.filter((item) => item.selected);

      // 編集されたデータを送信
      const exportData = latestSelected.map((item) => ({
        payment_id: item.id,
        name: item.editable.name,
        postal: item.editable.postal_code,
        address: item.editable.address,
        email: item.email,
        phone: item.phone,
      }));

      // ★ 統合されている場合は、統合前の全payment_idも送信
      let allPaymentIds: string[] = latestSelected.map((item) => item.id);

      if (isMerged && originalItems.length > 0) {
        // 選択されているアイテムの郵便番号リスト（正規化済み）
        const selectedPostals = latestSelected.map((item) =>
          item.editable.postal_code.replace(/[-\s\u3000]/g, "").trim()
        );

        console.log("[ExportYamatoB2] Merged mode detected");
        console.log("[ExportYamatoB2] Selected postals:", selectedPostals);
        console.log("[ExportYamatoB2] OriginalItems count:", originalItems.length);

        // 統合前のoriginalItemsから、選択されている郵便番号と同じものを全て取得
        const originalSelectedItems = originalItems.filter((item) =>
          selectedPostals.includes(item.editable.postal_code.replace(/[-\s\u3000]/g, "").trim())
        );

        console.log("[ExportYamatoB2] OriginalSelectedItems count:", originalSelectedItems.length);

        allPaymentIds = Array.from(new Set([
          ...latestSelected.map((item) => item.id),
          ...originalSelectedItems.map((item) => item.id),
        ]));

        console.log(`[ExportYamatoB2] Merged mode: CSV has ${exportData.length} items, but marking ${allPaymentIds.length} orders`);
        console.log("[ExportYamatoB2] All payment IDs:", allPaymentIds);
      }

      const res = await fetch("/api/admin/shipping/export-yamato-b2-custom", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: exportData,
          all_payment_ids: allPaymentIds, // 統合前を含む全payment_id
        }),
      });

      if (!res.ok) {
        throw new Error(`CSV生成失敗 (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yamato_b2_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // CSV出力成功 → 出力対象をグレーアウト（ラベル作成済み）
      const exportedIds = new Set(allPaymentIds);
      setItems((prev) =>
        prev.map((item) =>
          exportedIds.has(item.id) ? { ...item, isListCreated: true } : item
        )
      );
    } catch (err) {
      console.error("Export error:", err);
      setError(err instanceof Error ? err.message : "CSVエクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  // 日本郵便CSVエクスポート
  const handleExportJapanPost = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      alert("発送する注文を選択してください");
      return;
    }

    setExporting(true);
    setError("");

    try {
      const orderIds = selectedItems.map((item) => item.id);
      const res = await fetch("/api/admin/shipping/export-japanpost", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_ids: orderIds }),
      });

      if (!res.ok) throw new Error(`CSV生成失敗 (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `japanpost_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // CSV出力成功 → 出力対象をグレーアウト
      const exportedIds = new Set(orderIds);
      setItems((prev) =>
        prev.map((item) =>
          exportedIds.has(item.id) ? { ...item, isListCreated: true } : item
        )
      );
    } catch (err) {
      console.error("JapanPost export error:", err);
      setError(err instanceof Error ? err.message : "CSVエクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  // ★ 行全体の背景色を取得（各用量×各本数の組み合わせごとに固有の色）
  const getRowColor = (item: ShippingItem): string => {
    // 主要な用量と本数を決定
    const maxCount = Math.max(item.dosage_2_5mg, item.dosage_5mg, item.dosage_7_5mg, item.dosage_10mg);
    let primaryDosage = "";
    if (item.dosage_2_5mg === maxCount && maxCount > 0) primaryDosage = "2.5mg";
    else if (item.dosage_5mg === maxCount && maxCount > 0) primaryDosage = "5mg";
    else if (item.dosage_7_5mg === maxCount && maxCount > 0) primaryDosage = "7.5mg";
    else if (item.dosage_10mg === maxCount && maxCount > 0) primaryDosage = "10mg";

    if (!primaryDosage) return "";

    // 統合アイテムは特別な色（グレー系・薄い）
    if (isMergedItem(item)) {
      const totalCount = item.dosage_2_5mg + item.dosage_5mg + item.dosage_7_5mg + item.dosage_10mg;
      if (totalCount >= 12) return "bg-slate-200";
      if (totalCount >= 8) return "bg-slate-100";
      return "bg-slate-50";
    }

    // (用量, 本数) の組み合わせごとに色を割り当て（全て対照的な薄い色）
    const colorMap: Record<string, string> = {
      "2.5mg-12": "bg-blue-200",    // 青（薄）
      "2.5mg-8": "bg-red-200",      // 赤（対照）
      "2.5mg-4": "bg-yellow-200",   // 黄（対照）
      "5mg-12": "bg-green-200",     // 緑
      "5mg-8": "bg-purple-200",     // 紫（対照）
      "5mg-4": "bg-orange-200",     // オレンジ（対照）
      "7.5mg-12": "bg-pink-200",    // ピンク
      "7.5mg-8": "bg-cyan-200",     // シアン（対照）
      "7.5mg-4": "bg-lime-200",     // ライム（対照）
      "10mg-12": "bg-indigo-200",   // インディゴ
      "10mg-8": "bg-rose-200",      // ローズ（対照）
      "10mg-4": "bg-amber-200",     // アンバー（対照）
    };

    const key = `${primaryDosage}-${maxCount}`;
    return colorMap[key] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">発送リスト</h1>
        <p className="text-slate-600 text-sm mt-1">
          発送する注文を選択・編集して、ヤマトB2 CSV（送り状）を出力します
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 統合確認モーダル */}
      {showMergeModal && (mergeableGroups.length > 0 || sameAddressGroups.length > 0 || sameNameDiffAddress.length > 0) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">発送リスト統合の確認</h2>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-6" style={{ maxHeight: "calc(85vh - 120px)" }}>

              {/* 1. 同一患者の複数注文（確実） */}
              {mergeableGroups.length > 0 && (
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-sm">📦</span>
                    まとめ配送候補（同一患者の複数注文）— {mergeableGroups.length}グループ
                  </h3>
                  <div className="space-y-3">
                    {mergeableGroups.map((group, i) => {
                      const checked = selectedMergePatients.has(group.patient_id);
                      return (
                        <div key={i} className={`rounded-lg border overflow-hidden transition ${checked ? "border-yellow-300 bg-yellow-50/50" : "border-slate-200 bg-slate-50/50 opacity-60"}`}>
                          <div className={`px-4 py-2 flex items-center gap-3 ${checked ? "bg-yellow-100/80" : "bg-slate-100/80"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(selectedMergePatients);
                                if (e.target.checked) next.add(group.patient_id); else next.delete(group.patient_id);
                                setSelectedMergePatients(next);
                              }}
                              className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                            />
                            <span className="font-bold text-slate-900">{group.patient_name}</span>
                            <span className="text-sm text-slate-600">{group.count}件の注文</span>
                            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${checked ? "bg-yellow-200 text-yellow-800" : "bg-slate-200 text-slate-500"}`}>
                              {checked ? "統合する" : "統合しない"}
                            </span>
                          </div>
                          {group.orders && group.orders.length > 0 && (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-yellow-200/50 text-xs text-slate-500">
                                  <th className="px-4 py-1.5 text-left">商品</th>
                                  <th className="px-4 py-1.5 text-left">金額</th>
                                  <th className="px-4 py-1.5 text-left">郵便番号</th>
                                  <th className="px-4 py-1.5 text-left">住所</th>
                                  <th className="px-4 py-1.5 text-left">電話番号</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.orders.map((o, j) => (
                                  <tr key={j} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-1.5 text-slate-700">{o.product_name}</td>
                                    <td className="px-4 py-1.5 text-slate-700">¥{o.amount?.toLocaleString()}</td>
                                    <td className="px-4 py-1.5 text-slate-600">{o.postal_code}</td>
                                    <td className="px-4 py-1.5 text-slate-600 max-w-[200px] truncate">{o.address}</td>
                                    <td className="px-4 py-1.5 text-slate-600">{o.phone}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. 同一郵便番号・異なる患者（同居家族候補） */}
              {sameAddressGroups.length > 0 && (
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm">👨‍👩‍👧</span>
                    同居家族候補（同一郵便番号・異なる患者）— {sameAddressGroups.length}グループ
                  </h3>
                  <div className="space-y-3">
                    {sameAddressGroups.map((group, i) => {
                      const postalKey = group.postal_code.replace(/[-\s\u3000]/g, "").trim();
                      const checked = selectedMergePostals.has(postalKey);
                      return (
                        <div key={i} className={`rounded-lg border overflow-hidden transition ${checked ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-slate-50/50 opacity-60"}`}>
                          <div className={`px-4 py-2 flex items-center gap-3 ${checked ? "bg-blue-100/80" : "bg-slate-100/80"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(selectedMergePostals);
                                if (e.target.checked) next.add(postalKey); else next.delete(postalKey);
                                setSelectedMergePostals(next);
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="font-mono text-slate-700">〒{group.postal_code}</span>
                            <span className="text-sm text-slate-800">{group.patient_names.join("、")}</span>
                            <span className="text-sm text-slate-600">{group.count}件</span>
                            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${checked ? "bg-blue-200 text-blue-800" : "bg-slate-200 text-slate-500"}`}>
                              {checked ? "統合する" : "統合しない"}
                            </span>
                          </div>
                          {group.orders && group.orders.length > 0 && (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-blue-200/50 text-xs text-slate-500">
                                  <th className="px-4 py-1.5 text-left">患者名</th>
                                  <th className="px-4 py-1.5 text-left">商品</th>
                                  <th className="px-4 py-1.5 text-left">金額</th>
                                  <th className="px-4 py-1.5 text-left">住所</th>
                                  <th className="px-4 py-1.5 text-left">電話番号</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.orders.map((o, j) => (
                                  <tr key={j} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-1.5 font-medium text-slate-700">{o.patient_name}</td>
                                    <td className="px-4 py-1.5 text-slate-700">{o.product_name}</td>
                                    <td className="px-4 py-1.5 text-slate-700">¥{o.amount?.toLocaleString()}</td>
                                    <td className="px-4 py-1.5 text-slate-600 max-w-[200px] truncate">{o.address}</td>
                                    <td className="px-4 py-1.5 text-slate-600">{o.phone}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-blue-600">
                    ※ 同じ郵便番号ですが別患者です。同居家族等の場合はチェックを入れてください。
                  </p>
                </div>
              )}

              {/* 3. 同姓同名・住所違い（注意喚起） */}
              {sameNameDiffAddress.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-sm">⚠️</span>
                    同姓同名・住所違い（統合注意）— {sameNameDiffAddress.length}件
                  </h3>
                  <div className="space-y-2">
                    {sameNameDiffAddress.map((group, i) => (
                      <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="font-medium text-red-900">{group.patient_name}</span>
                        <span className="text-red-700 ml-2">{group.count}件 — 〒{group.postal_codes.join("、〒")}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-red-600">
                    同じ名前ですが郵便番号が異なるため、誤統合しないよう注意してください。
                  </p>
                </div>
              )}

            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                統合対象: {selectedMergePatients.size + selectedMergePostals.size}グループ
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2.5 text-sm rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  統合しない
                </button>
                <button
                  onClick={handleConfirmMerge}
                  disabled={selectedMergePatients.size === 0 && selectedMergePostals.size === 0}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  選択したグループを統合 ({selectedMergePatients.size + selectedMergePostals.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            合計 {items.length} 件 / 選択 {selectedCount} 件
          </span>
          <button
            onClick={handleToggleMerge}
            className={`px-4 py-2 text-sm rounded-lg ${
              isMerged
                ? "bg-slate-500 text-white hover:bg-slate-600"
                : "bg-yellow-500 text-white hover:bg-yellow-600"
            }`}
          >
            {isMerged ? "🔓 統合を解除" : "🔗 まとめ配送を統合"}
          </button>
          <button
            onClick={() => setShowSortModal(true)}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600"
          >
            並び替え
            {sortMode !== "dosage" && (
              <span className="ml-1 text-xs opacity-80">
                ({sortMode === "date_asc" ? "決済日↑" : sortMode === "date_desc" ? "決済日↓" : sortMode === "name" ? "氏名" : sortMode === "price_desc" ? "金額↓" : sortMode === "price_asc" ? "金額↑" : "手動"})
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const selectedItems = items.filter((item) => item.selected);
              if (selectedItems.length === 0) {
                alert("共有する注文を選択してください");
                return;
              }

              try {
                setExporting(true);

                // 表示されているデータをそのまま共有（編集済み、用量、背景色含む）
                const shareData = selectedItems.map((item) => ({
                  id: item.id,
                  payment_date: item.payment_date,
                  name: item.editable.name,
                  postal_code: item.editable.postal_code,
                  address: item.editable.address,
                  email: item.email,
                  phone: item.phone,
                  product_name: item.product_name,
                  price: item.price,
                  dosage_2_5mg: item.dosage_2_5mg,
                  dosage_5mg: item.dosage_5mg,
                  dosage_7_5mg: item.dosage_7_5mg,
                  dosage_10mg: item.dosage_10mg,
                }));

                // データを一時保存して短いIDを取得
                const res = await fetch("/api/admin/shipping/share", {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ data: shareData }),
                });

                if (!res.ok) {
                  throw new Error("共有リンクの作成に失敗しました");
                }

                const { shareId } = await res.json();
                const shareUrl = `${window.location.origin}/shipping/view?id=${shareId}`;
                navigator.clipboard.writeText(shareUrl);
                alert(`共有URLをコピーしました（3日間有効）\n\nパスワード: 1995a\n\nURL: ${shareUrl}`);
              } catch (err) {
                console.error("Share error:", err);
                alert("共有リンクの作成に失敗しました");
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting || selectedCount === 0}
            className={`px-4 py-2 rounded-lg font-medium ${
              exporting || selectedCount === 0
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {exporting ? "作成中..." : `🔗 共有リンク（${selectedCount}件）`}
          </button>
          <button
            onClick={handleExportYamatoB2}
            disabled={exporting || selectedCount === 0}
            className={`px-6 py-2 rounded-lg font-medium ${
              exporting || selectedCount === 0
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {exporting ? "出力中..." : `📦 ヤマトB2 CSV出力（${selectedCount}件）`}
          </button>
          <button
            onClick={handleExportJapanPost}
            disabled={exporting || selectedCount === 0}
            className={`px-6 py-2 rounded-lg font-medium ${
              exporting || selectedCount === 0
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {exporting ? "出力中..." : `📮 日本郵便 CSV出力（${selectedCount}件）`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        {/* キャッシュ表示中は操作不可オーバーレイ */}
        {isValidating && !loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              最新情報を取得中...
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table ref={tableRef} className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={items.every((item) => item.selected)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">決済日時</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase min-w-[150px]">Name</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Postal Code</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase min-w-[250px]">Address</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Phone</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Product Name</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase">Price</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase">2.5mg</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase">5mg</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase">7.5mg</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase">10mg</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">patient_id</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">payment_id</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-8 text-center text-slate-500">
                    発送可能な注文がありません
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={`${item.selected ? (item.isListCreated ? "bg-slate-300 opacity-80" : getRowColor(item)) : "bg-slate-100 opacity-50"}`}>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs whitespace-nowrap">
                      {new Date(item.payment_date).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>
                    {/* ★ 氏名: クリックで編集可能、幅を広げる */}
                    <td className="px-2 py-2 min-w-[150px]">
                      {editingCell?.id === item.id && editingCell?.field === "name" ? (
                        <input
                          type="text"
                          value={item.editable.name}
                          onChange={(e) => handleEditField(item.id, "name", e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="w-full px-1 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingCell({ id: item.id, field: "name" })}
                          className="cursor-pointer hover:bg-slate-100 px-1 py-1 text-xs rounded flex items-center gap-2"
                        >
                          <span>{item.editable.name || "-"}</span>
                          {item.isListCreated && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded whitespace-nowrap">
                              作成済み
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    {/* ★ 郵便番号: クリックで編集可能 */}
                    <td className="px-2 py-2">
                      {editingCell?.id === item.id && editingCell?.field === "postal_code" ? (
                        <input
                          type="text"
                          value={item.editable.postal_code}
                          onChange={(e) => handleEditField(item.id, "postal_code", e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="w-24 px-1 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingCell({ id: item.id, field: "postal_code" })}
                          className="cursor-pointer hover:bg-slate-100 px-1 py-1 text-xs rounded"
                        >
                          {item.editable.postal_code || "-"}
                        </div>
                      )}
                    </td>
                    {/* ★ 住所: クリックで編集可能、2行表示、沖縄・郵便局は太字赤字 */}
                    <td className="px-2 py-2 min-w-[250px]">
                      {editingCell?.id === item.id && editingCell?.field === "address" ? (
                        <textarea
                          value={item.editable.address}
                          onChange={(e) => handleEditField(item.id, "address", e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          rows={2}
                          className={`w-full px-1 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            ((item.editable.address || "").includes("沖縄") || (item.editable.address || "").includes("郵便局")) ? "text-red-600 font-bold" : ""
                          }`}
                        />
                      ) : (
                        <div
                          onClick={() => setEditingCell({ id: item.id, field: "address" })}
                          className={`cursor-pointer hover:bg-slate-100 px-1 py-1 text-xs rounded whitespace-pre-wrap break-words ${
                            ((item.editable.address || "").includes("沖縄") || (item.editable.address || "").includes("郵便局")) ? "text-red-600 font-bold" : ""
                          }`}
                          style={{ maxHeight: "3rem", overflow: "auto" }}
                        >
                          {item.editable.address || "-"}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs">{item.email}</td>
                    <td className="px-2 py-2 text-xs">{item.phone}</td>
                    <td className="px-2 py-2 text-xs">{item.product_name}</td>
                    <td className="px-2 py-2 text-xs text-right">{item.price.toLocaleString()}</td>
                    {/* ★ 用量セル（行全体で色分け済み） */}
                    <td className="px-2 py-2 text-xs text-right font-semibold">
                      {item.dosage_2_5mg || 0}
                    </td>
                    <td className="px-2 py-2 text-xs text-right font-semibold">
                      {item.dosage_5mg || 0}
                    </td>
                    <td className="px-2 py-2 text-xs text-right font-semibold">
                      {item.dosage_7_5mg || 0}
                    </td>
                    <td className="px-2 py-2 text-xs text-right font-semibold">
                      {item.dosage_10mg || 0}
                    </td>
                    <td className="px-2 py-2 text-xs font-mono">
                      <button
                        onClick={() => window.open(`/admin/line/talk?pid=${item.patient_id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {item.patient_id}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-xs font-mono">{item.payment_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ★ 並び替えモーダル */}
      {showSortModal && (
        <SortModal
          currentMode={sortMode}
          items={items}
          onApply={handleApplySort}
          onManualReorder={(reordered) => {
            setItems(reordered);
            setSortMode("manual");
            setShowSortModal(false);
          }}
          onClose={() => setShowSortModal(false)}
        />
      )}
    </div>
  );
}

// ★ 並び替えモーダルコンポーネント
function SortModal({
  currentMode,
  items,
  onApply,
  onManualReorder,
  onClose,
}: {
  currentMode: SortMode;
  items: ShippingItem[];
  onApply: (mode: SortMode) => void;
  onManualReorder: (items: ShippingItem[]) => void;
  onClose: () => void;
}) {
  const [selectedMode, setSelectedMode] = useState<SortMode>(currentMode);
  const [dndItems, setDndItems] = useState<ShippingItem[]>(items);
  const [showDnd, setShowDnd] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const presetOptions: { mode: SortMode; label: string }[] = [
    { mode: "dosage", label: "用量順（2.5mg→5mg→7.5mg→10mg、本数降順）" },
    { mode: "date_asc", label: "決済日順（古い順）" },
    { mode: "date_desc", label: "決済日順（新しい順）" },
    { mode: "name", label: "氏名順（五十音）" },
    { mode: "price_desc", label: "金額順（高い順）" },
    { mode: "price_asc", label: "金額順（安い順）" },
  ];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = dndItems.findIndex((item) => item.id === active.id);
    const newIndex = dndItems.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setDndItems(arrayMove(dndItems, oldIndex, newIndex));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">並び替え</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {!showDnd ? (
            <>
              <p className="text-sm text-slate-600 mb-4">プリセットから選択するか、手動で並び替えてください。</p>
              <div className="space-y-2 mb-6">
                {presetOptions.map((opt) => (
                  <label
                    key={opt.mode}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMode === opt.mode
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sortMode"
                      value={opt.mode}
                      checked={selectedMode === opt.mode}
                      onChange={() => setSelectedMode(opt.mode)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onApply(selectedMode)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  適用
                </button>
                <button
                  onClick={() => setShowDnd(true)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                >
                  手動で並び替え
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">ドラッグして並び替えてください。</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={dndItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {dndItems.map((item, idx) => (
                      <SortableRow key={item.id} item={item} index={idx} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => onManualReorder(dndItems)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  この順序で適用
                </button>
                <button
                  onClick={() => setShowDnd(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                >
                  戻る
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ★ ドラッグ可能な行コンポーネント
function SortableRow({ item, index }: { item: ShippingItem; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded border text-xs ${
        isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 px-1"
        title="ドラッグして並び替え"
      >
        &#x2261;
      </button>
      <span className="text-slate-400 w-6 text-right">{index + 1}.</span>
      <span className="font-medium text-slate-700 truncate flex-1">{item.editable.name || item.name}</span>
      <span className="text-slate-500 whitespace-nowrap">{item.product_name}</span>
      <span className="text-slate-500">&yen;{item.price.toLocaleString()}</span>
    </div>
  );
}
