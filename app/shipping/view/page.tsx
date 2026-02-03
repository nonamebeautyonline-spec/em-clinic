"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import LZString from "lz-string";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const SHIPPING_PASSWORD = "1995a";

interface ShippingItem {
  id: string;
  patient_id: string;
  payment_date: string;
  name: string;
  postal_code: string;
  address: string;
  email: string;
  phone: string;
  product_name: string;
  price: number;
  dosage_2_5mg: number;
  dosage_5mg: number;
  dosage_7_5mg: number;
  dosage_10mg: number;
}

function ShippingViewContent() {
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<ShippingItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password === SHIPPING_PASSWORD) {
      setAuthenticated(true);
      loadShippingItems();
    } else {
      setError("パスワードが正しくありません");
    }
  };

  const loadShippingItems = async () => {
    setLoadingItems(true);
    try {
      const idParam = searchParams.get("id");
      const dataParam = searchParams.get("data");

      let shareData: any[];

      if (idParam) {
        // 新方式：IDから取得
        const res = await fetch(`/api/shipping/share/${idParam}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("共有リンクが見つかりません");
          } else if (res.status === 410) {
            setError("共有リンクの有効期限が切れています（3日間）");
          } else {
            setError("データの読み込みに失敗しました");
          }
          return;
        }
        const json = await res.json();
        shareData = json.data;
      } else if (dataParam) {
        // 旧方式：URL圧縮データ（後方互換性）
        const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
        if (!decompressed) {
          setError("データの解凍に失敗しました");
          return;
        }
        shareData = JSON.parse(decompressed);
      } else {
        setError("URLが無効です");
        return;
      }

      if (!Array.isArray(shareData) || shareData.length === 0) {
        setError("データが見つかりません");
        return;
      }

      // 管理画面から渡されたデータをそのまま使用
      const formattedItems: ShippingItem[] = shareData.map((item: any) => ({
        id: item.id,
        patient_id: item.patient_id || "",
        payment_date: item.payment_date || "",
        name: item.name || "",
        postal_code: item.postal_code || "",
        address: item.address || "",
        email: item.email || "",
        phone: item.phone || "",
        product_name: item.product_name || "",
        price: item.price || 0,
        dosage_2_5mg: item.dosage_2_5mg || 0,
        dosage_5mg: item.dosage_5mg || 0,
        dosage_7_5mg: item.dosage_7_5mg || 0,
        dosage_10mg: item.dosage_10mg || 0,
      }));

      setItems(formattedItems);
    } catch (err) {
      console.error("Load items error:", err);
      setError("データの読み込みに失敗しました");
    } finally {
      setLoadingItems(false);
    }
  };

  // ★ アイテムが統合されたものか判定
  const isMergedItem = (item: ShippingItem): boolean => {
    const counts = [item.dosage_2_5mg, item.dosage_5mg, item.dosage_7_5mg, item.dosage_10mg];
    const nonZeroCount = counts.filter(c => c > 0).length;
    return nonZeroCount > 1; // 2つ以上の用量に本数がある = 統合
  };

  // 行の背景色を取得（管理画面と同じロジック）
  const getRowColor = (item: ShippingItem): string => {
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

    const colorMap: Record<string, string> = {
      "2.5mg-12": "bg-blue-200",
      "2.5mg-8": "bg-red-200",
      "2.5mg-4": "bg-yellow-200",
      "5mg-12": "bg-green-200",
      "5mg-8": "bg-purple-200",
      "5mg-4": "bg-orange-200",
      "7.5mg-12": "bg-pink-200",
      "7.5mg-8": "bg-cyan-200",
      "7.5mg-4": "bg-lime-200",
      "10mg-12": "bg-indigo-200",
      "10mg-8": "bg-rose-200",
      "10mg-4": "bg-amber-200",
    };

    const key = `${primaryDosage}-${maxCount}`;
    return colorMap[key] || "";
  };

  // ★ 色グループのキーを取得
  const getColorGroupKey = (item: ShippingItem): string => {
    const maxCount = Math.max(item.dosage_2_5mg, item.dosage_5mg, item.dosage_7_5mg, item.dosage_10mg);
    let primaryDosage = "";
    if (item.dosage_2_5mg === maxCount && maxCount > 0) primaryDosage = "2.5mg";
    else if (item.dosage_5mg === maxCount && maxCount > 0) primaryDosage = "5mg";
    else if (item.dosage_7_5mg === maxCount && maxCount > 0) primaryDosage = "7.5mg";
    else if (item.dosage_10mg === maxCount && maxCount > 0) primaryDosage = "10mg";

    if (isMergedItem(item)) {
      return "merged";
    }

    return `${primaryDosage}-${maxCount}`;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            発送リスト閲覧
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワードを入力"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              閲覧する
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loadingItems) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-slate-700">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">発送リスト</h1>
          <p className="text-sm text-slate-600">合計: {items.length}件</p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-slate-600">注文が見つかりません</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-slate-700 whitespace-nowrap">決済日時</th>
                    <th className="px-2 py-2 text-left font-medium text-slate-700 whitespace-nowrap">Name</th>
                    <th className="px-2 py-2 text-left font-medium text-slate-700 whitespace-nowrap">Postal Code</th>
                    <th className="px-2 py-2 text-left font-medium text-slate-700">Address</th>
                    <th className="px-2 py-2 text-left font-medium text-slate-700 max-w-[100px]">Email</th>
                    <th className="px-2 py-2 text-left font-medium text-slate-700 whitespace-nowrap">Phone</th>
                    <th className="px-2 py-2 text-left font-medium text-slate-700 max-w-[120px]">Product Name</th>
                    <th className="px-2 py-2 text-left font-medium text-slate-700 whitespace-nowrap">Price</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-700 whitespace-nowrap">2.5mg</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-700 whitespace-nowrap">5mg</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-700 whitespace-nowrap">7.5mg</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-700 whitespace-nowrap">10mg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => {
                    const bgColor = getRowColor(item);
                    const currentGroupKey = getColorGroupKey(item);
                    const nextGroupKey = index < items.length - 1 ? getColorGroupKey(items[index + 1]) : null;
                    const isLastInGroup = currentGroupKey !== nextGroupKey;

                    // 現在のグループの人数を計算（最後の行の場合のみ）
                    let groupCount = 0;
                    if (isLastInGroup) {
                      groupCount = items.filter((i) => getColorGroupKey(i) === currentGroupKey).length;
                    }

                    return (
                      <>
                        <tr key={item.id} className={`${bgColor}`}>
                          <td className="px-2 py-2 whitespace-nowrap text-xs">
                            {item.payment_date
                              ? new Date(item.payment_date).toLocaleDateString("ja-JP")
                              : "-"}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs">{item.name}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs">{item.postal_code}</td>
                          <td className={`px-2 py-2 max-w-xs break-words text-xs ${
                            (item.address.includes("沖縄") || item.address.includes("郵便局")) ? "text-red-600 font-bold" : ""
                          }`}>
                            {item.address}
                          </td>
                          <td className="px-2 py-2 text-xs max-w-[100px] truncate" title={item.email}>{item.email}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs">{item.phone}</td>
                          <td className="px-2 py-2 text-xs max-w-[120px] truncate" title={item.product_name}>{item.product_name}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-xs">¥{item.price.toLocaleString()}</td>
                          <td className="px-2 py-2 text-center text-xs font-semibold">{item.dosage_2_5mg || "-"}</td>
                          <td className="px-2 py-2 text-center text-xs font-semibold">{item.dosage_5mg || "-"}</td>
                          <td className="px-2 py-2 text-center text-xs font-semibold">{item.dosage_7_5mg || "-"}</td>
                          <td className="px-2 py-2 text-center text-xs font-semibold">{item.dosage_10mg || "-"}</td>
                        </tr>
                        {/* ★ グループの最後に区切り行を追加 */}
                        {isLastInGroup && (
                          <tr key={`separator-${item.id}`} className="bg-white border-t-2 border-slate-400">
                            <td className="px-2 py-2" colSpan={8}></td>
                            <td className="px-2 py-2 text-center text-sm font-bold text-red-600">
                              {groupCount}人
                            </td>
                            <td className="px-2 py-2" colSpan={3}></td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShippingViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-slate-700">読み込み中...</div>
          </div>
        </div>
      }
    >
      <ShippingViewContent />
    </Suspense>
  );
}
