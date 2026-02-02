"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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
      const dataParam = searchParams.get("data");
      if (!dataParam) {
        setError("URLが無効です");
        return;
      }

      // Base64デコード
      const decoded = atob(dataParam);
      const orderIds = decoded.split(",");

      if (orderIds.length === 0) {
        setError("注文IDが見つかりません");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // 指定されたIDの注文を取得
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, patient_id, product_name, amount, shipping_name, postal_code, address, email, phone, paid_at"
        )
        .in("id", orderIds);

      if (ordersError) {
        console.error("Orders fetch error:", ordersError);
        setError("注文情報の取得に失敗しました");
        return;
      }

      if (!orders || orders.length === 0) {
        setItems([]);
        return;
      }

      // データを整形
      const formattedItems: ShippingItem[] = orders.map((order) => {
        // 商品名から用量と本数を推測
        const productName = order.product_name || "";
        let dosage25mg = 0;
        let dosage5mg = 0;
        let dosage75mg = 0;
        let dosage10mg = 0;

        if (productName.includes("2.5mg")) {
          if (productName.includes("1ヶ月") || productName.includes("1m")) dosage25mg = 4;
          else if (productName.includes("2ヶ月") || productName.includes("2m")) dosage25mg = 8;
          else if (productName.includes("3ヶ月") || productName.includes("3m")) dosage25mg = 12;
        } else if (productName.includes("5mg") && !productName.includes("7.5mg")) {
          if (productName.includes("1ヶ月") || productName.includes("1m")) dosage5mg = 4;
          else if (productName.includes("2ヶ月") || productName.includes("2m")) dosage5mg = 8;
          else if (productName.includes("3ヶ月") || productName.includes("3m")) dosage5mg = 12;
        } else if (productName.includes("7.5mg")) {
          if (productName.includes("1ヶ月") || productName.includes("1m")) dosage75mg = 4;
          else if (productName.includes("2ヶ月") || productName.includes("2m")) dosage75mg = 8;
          else if (productName.includes("3ヶ月") || productName.includes("3m")) dosage75mg = 12;
        } else if (productName.includes("10mg")) {
          if (productName.includes("1ヶ月") || productName.includes("1m")) dosage10mg = 4;
          else if (productName.includes("2ヶ月") || productName.includes("2m")) dosage10mg = 8;
          else if (productName.includes("3ヶ月") || productName.includes("3m")) dosage10mg = 12;
        }

        return {
          id: order.id,
          patient_id: order.patient_id,
          payment_date: order.paid_at || "",
          name: order.shipping_name || "",
          postal_code: order.postal_code || "",
          address: order.address || "",
          email: order.email || "",
          phone: order.phone || "",
          product_name: productName,
          price: order.amount || 0,
          dosage_2_5mg: dosage25mg,
          dosage_5mg: dosage5mg,
          dosage_7_5mg: dosage75mg,
          dosage_10mg: dosage10mg,
        };
      });

      setItems(formattedItems);
    } catch (err) {
      console.error("Load items error:", err);
      setError("データの読み込みに失敗しました");
    } finally {
      setLoadingItems(false);
    }
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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                    <th className="px-4 py-3 text-left font-medium text-slate-700">決済日時</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Postal Code</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Address</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Product Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Price</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">2.5mg</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">5mg</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">7.5mg</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">10mg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.payment_date
                          ? new Date(item.payment_date).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.postal_code}</td>
                      <td className="px-4 py-3 max-w-xs break-words">{item.address}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.phone}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{item.product_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">¥{item.price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{item.dosage_2_5mg || "-"}</td>
                      <td className="px-4 py-3 text-center">{item.dosage_5mg || "-"}</td>
                      <td className="px-4 py-3 text-center">{item.dosage_7_5mg || "-"}</td>
                      <td className="px-4 py-3 text-center">{item.dosage_10mg || "-"}</td>
                    </tr>
                  ))}
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
