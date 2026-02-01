"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ShippingItem {
  id: string;
  user_id: string;
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
  editable: {
    name: string;
    postal_code: string;
    address: string;
  };
}

export default function CreateShippingListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShippingItem[]>([]);
  const [originalItems, setOriginalItems] = useState<ShippingItem[]>([]); // 統合前の状態を保存
  const [isMerged, setIsMerged] = useState(false); // 統合済みフラグ
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/shipping/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`データ取得失敗 (${res.status})`);
      }

      const data = await res.json();
      const orders = data.orders || [];

      // 用量を計算してフォーマット
      const formattedItems: ShippingItem[] = orders
        .filter((o: any) => o.status === "confirmed") // 確認済みのみ
        .map((order: any) => {
          const dosages = calculateDosage(order.product_code);
          return {
            id: order.id,
            user_id: order.lstep_id || "",
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
            selected: true, // デフォルトで全選択
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
    } catch (err) {
      console.error("Orders fetch error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

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

  // ★ ソート順: 単一用量アイテム（2.5mg → 5mg → 7.5mg → 10mg、本数降順） → 統合アイテム
  const sortByDosage = (items: ShippingItem[]): ShippingItem[] => {
    const single = items.filter(item => !isMergedItem(item));
    const merged = items.filter(item => isMergedItem(item));

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

    // 統合アイテムは決済日時順
    const sortedMerged = merged.sort((a, b) =>
      new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );

    return [...sortedSingle, ...sortedMerged];
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
      // 統合実行
      setOriginalItems([...items]); // 現在の状態を保存
      mergeByName();
      setIsMerged(true);
    }
  };

  // ★ 同じ氏名を統合（並び順を修正）
  const mergeByName = () => {
    const grouped: Record<string, ShippingItem[]> = {};

    // 選択されている項目のみグルーピング
    const selectedItems = items.filter((item) => item.selected);
    const unselectedItems = items.filter((item) => !item.selected);

    // 氏名でグルーピング
    selectedItems.forEach((item) => {
      const name = item.editable.name.trim();
      if (!grouped[name]) {
        grouped[name] = [];
      }
      grouped[name].push(item);
    });

    const merged: ShippingItem[] = [];

    Object.entries(grouped).forEach(([name, group]) => {
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        // 重複している場合は統合
        const first = group[0];
        const mergedItem: ShippingItem = {
          ...first,
          dosage_2_5mg: group.reduce((sum, item) => sum + item.dosage_2_5mg, 0),
          dosage_5mg: group.reduce((sum, item) => sum + item.dosage_5mg, 0),
          dosage_7_5mg: group.reduce((sum, item) => sum + item.dosage_7_5mg, 0),
          dosage_10mg: group.reduce((sum, item) => sum + item.dosage_10mg, 0),
          price: group.reduce((sum, item) => sum + item.price, 0),
          id: group.map((item) => item.id).join(","), // 複数IDを結合
          product_name: group.map((item) => item.product_name).join(", "),
        };
        merged.push(mergedItem);
      }
    });

    // ★ 統合後も同じ用量順にソート（2.5mg → 5mg → 7.5mg → 10mg、本数降順）
    const sorted = sortByDosage([...merged, ...unselectedItems]);
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
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // 編集されたデータを送信
      const exportData = selectedItems.map((item) => ({
        payment_id: item.id,
        name: item.editable.name,
        postal: item.editable.postal_code,
        address: item.editable.address,
        email: item.email,
        phone: item.phone,
      }));

      const res = await fetch("/api/admin/shipping/export-yamato-b2-custom", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: exportData }),
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
    } catch (err) {
      console.error("Export error:", err);
      setError(err instanceof Error ? err.message : "CSVエクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    const selectedItems = items.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      alert("発送する注文を選択してください");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // タイトル
      doc.setFontSize(16);
      doc.text("発送リスト", 14, 15);

      // 日付
      doc.setFontSize(10);
      const today = new Date().toLocaleDateString("ja-JP");
      doc.text(`作成日: ${today}`, 14, 22);

      // テーブルデータ
      const headers = [
        ["user_id", "決済日時", "Name", "Postal Code", "Address", "Email", "Phone", "Product Name", "Price", "2.5mg", "5mg", "7.5mg", "10mg", "patient_id", "payment_id"]
      ];

      const data = selectedItems.map((item) => [
        item.user_id,
        new Date(item.payment_date).toLocaleDateString("ja-JP"),
        item.editable.name,
        item.editable.postal_code,
        item.editable.address,
        item.email,
        item.phone,
        item.product_name,
        `¥${item.price.toLocaleString()}`,
        item.dosage_2_5mg.toString(),
        item.dosage_5mg.toString(),
        item.dosage_7_5mg.toString(),
        item.dosage_10mg.toString(),
        item.patient_id,
        item.payment_id,
      ]);

      // RGB変換関数
      const getRgbColor = (item: ShippingItem): [number, number, number] => {
        // 統合アイテムは特別な色（グレー系）
        if (isMergedItem(item)) {
          const totalCount = item.dosage_2_5mg + item.dosage_5mg + item.dosage_7_5mg + item.dosage_10mg;
          if (totalCount >= 12) return [148, 163, 184]; // slate-400
          if (totalCount >= 8) return [203, 213, 225];  // slate-300
          return [226, 232, 240];                       // slate-200
        }

        const maxCount = Math.max(item.dosage_2_5mg, item.dosage_5mg, item.dosage_7_5mg, item.dosage_10mg);
        let primaryDosage = "";
        if (item.dosage_2_5mg === maxCount && maxCount > 0) primaryDosage = "2.5mg";
        else if (item.dosage_5mg === maxCount && maxCount > 0) primaryDosage = "5mg";
        else if (item.dosage_7_5mg === maxCount && maxCount > 0) primaryDosage = "7.5mg";
        else if (item.dosage_10mg === maxCount && maxCount > 0) primaryDosage = "10mg";

        const colorMap: Record<string, [number, number, number]> = {
          "2.5mg-12": [96, 165, 250],   // blue-400
          "2.5mg-8": [147, 197, 253],   // blue-300
          "2.5mg-4": [191, 219, 254],   // blue-200
          "5mg-12": [248, 113, 113],    // red-400
          "5mg-8": [252, 165, 165],     // red-300
          "5mg-4": [254, 202, 202],     // red-200
          "7.5mg-12": [250, 204, 21],   // yellow-400
          "7.5mg-8": [253, 224, 71],    // yellow-300
          "7.5mg-4": [254, 240, 138],   // yellow-200
          "10mg-12": [74, 222, 128],    // green-400
          "10mg-8": [134, 239, 172],    // green-300
          "10mg-4": [187, 247, 208],    // green-200
        };

        const key = `${primaryDosage}-${maxCount}`;
        return colorMap[key] || [255, 255, 255];
      };

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 28,
        styles: {
          fontSize: 6,
          cellPadding: 2,
          font: "helvetica", // 日本語サポートのため
        },
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: 255,
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 15 }, // user_id
          1: { cellWidth: 20 }, // 決済日時
          2: { cellWidth: 20 }, // Name
          3: { cellWidth: 20 }, // Postal Code
          4: { cellWidth: 40 }, // Address
          5: { cellWidth: 25 }, // Email
          6: { cellWidth: 18 }, // Phone
          7: { cellWidth: 25 }, // Product Name
          8: { cellWidth: 15 }, // Price
          9: { cellWidth: 10 }, // 2.5mg
          10: { cellWidth: 10 }, // 5mg
          11: { cellWidth: 10 }, // 7.5mg
          12: { cellWidth: 10 }, // 10mg
          13: { cellWidth: 20 }, // patient_id
          14: { cellWidth: 20 }, // payment_id
        },
        didDrawCell: (data) => {
          // 各セルの背景色を設定
          if (data.section === "body") {
            const item = selectedItems[data.row.index];
            const color = getRgbColor(item);
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
            // テキストを再描画
            doc.setTextColor(0, 0, 0);
            const text = String(data.cell.text);
            doc.text(text, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2);
          }
        },
      });

      // PDF保存
      doc.save(`shipping_list_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      setError(err instanceof Error ? err.message : "PDF出力に失敗しました");
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

    // 統合アイテムは特別な色（グレー系）
    if (isMergedItem(item)) {
      const totalCount = item.dosage_2_5mg + item.dosage_5mg + item.dosage_7_5mg + item.dosage_10mg;
      if (totalCount >= 12) return "bg-slate-400";
      if (totalCount >= 8) return "bg-slate-300";
      return "bg-slate-200";
    }

    // (用量, 本数) の組み合わせごとに色を割り当て（対照的な色）
    const colorMap: Record<string, string> = {
      "2.5mg-12": "bg-blue-400",    // 青
      "2.5mg-8": "bg-blue-300",
      "2.5mg-4": "bg-blue-200",
      "5mg-12": "bg-red-400",       // 赤（青の対照）
      "5mg-8": "bg-red-300",
      "5mg-4": "bg-red-200",
      "7.5mg-12": "bg-yellow-400",  // 黄色（赤の対照）
      "7.5mg-8": "bg-yellow-300",
      "7.5mg-4": "bg-yellow-200",
      "10mg-12": "bg-green-400",    // 緑（黄色の対照）
      "10mg-8": "bg-green-300",
      "10mg-4": "bg-green-200",
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
        <h1 className="text-2xl font-bold text-slate-900">発送リスト作成</h1>
        <p className="text-slate-600 text-sm mt-1">
          発送する注文を選択・編集して、ヤマトB2 CSVを出力します
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
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
            {isMerged ? "🔓 統合を解除" : "🔗 同じ氏名を統合"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={selectedCount === 0}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedCount === 0
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            📄 PDF出力（{selectedCount}件）
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
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
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
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">user_id</th>
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
                  <td colSpan={16} className="px-6 py-8 text-center text-slate-500">
                    発送可能な注文がありません
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={`${item.selected ? getRowColor(item) : "bg-slate-100 opacity-50"}`}>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs font-mono">{item.user_id}</td>
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
                          className="cursor-pointer hover:bg-slate-100 px-1 py-1 text-xs rounded"
                        >
                          {item.editable.name || "-"}
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
                    {/* ★ 住所: クリックで編集可能、2行表示 */}
                    <td className="px-2 py-2 min-w-[250px]">
                      {editingCell?.id === item.id && editingCell?.field === "address" ? (
                        <textarea
                          value={item.editable.address}
                          onChange={(e) => handleEditField(item.id, "address", e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          rows={2}
                          className="w-full px-1 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingCell({ id: item.id, field: "address" })}
                          className="cursor-pointer hover:bg-slate-100 px-1 py-1 text-xs rounded whitespace-pre-wrap break-words"
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
                    <td className="px-2 py-2 text-xs font-mono">{item.patient_id}</td>
                    <td className="px-2 py-2 text-xs font-mono">{item.payment_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
