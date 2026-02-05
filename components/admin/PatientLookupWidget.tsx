"use client";

import { useState, useRef, useEffect } from "react";

interface PatientInfo {
  id: string;
  name: string;
  lstep_uid: string;
}

interface OrderInfo {
  date: string;
  product: string;
  amount: string;
  payment: string;
  tracking: string;
}

interface ReorderInfo {
  id: number;
  date: string;
  product: string;
  status: string;
}

interface SummaryInfo {
  product: string;
  count: number;
}

interface LookupResult {
  found: boolean;
  message?: string;
  patient?: PatientInfo;
  orders?: OrderInfo[];
  reorders?: ReorderInfo[];
  summary?: SummaryInfo[];
  totalOrders?: number;
}

interface Message {
  type: "user" | "bot";
  content: string;
  data?: LookupResult;
}

export default function PatientLookupWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "bot",
      content: "患者IDまたは氏名を入力してください。",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // モーダルが開いたらinputにフォーカス
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    const searchQuery = query.trim();
    setQuery("");

    // ユーザーのメッセージを追加
    setMessages((prev) => [...prev, { type: "user", content: searchQuery }]);
    setLoading(true);

    try {
      const adminToken = localStorage.getItem("adminToken") || "";
      const res = await fetch(
        `/api/admin/patient-lookup?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: LookupResult = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: `エラー: ${data.message || "検索に失敗しました"}` },
        ]);
      } else if (!data.found) {
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: `「${searchQuery}」に該当する患者は見つかりませんでした。` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: "", data },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: "通信エラーが発生しました。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        type: "bot",
        content: "患者IDまたは氏名を入力してください。",
      },
    ]);
  };

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-40"
        title="患者クイック検索"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md h-[600px] rounded-lg shadow-xl flex flex-col">
            {/* ヘッダー */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-blue-600 text-white rounded-t-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="font-semibold">患者クイック検索</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-1 hover:bg-blue-700 rounded"
                  title="履歴クリア"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-blue-700 rounded"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.type === "user" ? (
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg max-w-[80%]">
                      {msg.content}
                    </div>
                  ) : msg.data ? (
                    <PatientCard data={msg.data} />
                  ) : (
                    <div className="bg-gray-100 px-4 py-2 rounded-lg max-w-[80%]">
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="患者ID or 氏名を入力..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  検索
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 患者情報カード
function PatientCard({ data }: { data: LookupResult }) {
  const [expanded, setExpanded] = useState<"orders" | "reorders" | null>(null);

  if (!data.patient) return null;

  const lstepUrl = data.patient.lstep_uid
    ? `https://manager.line-business.com/message/1-to-1/${data.patient.lstep_uid}`
    : null;

  return (
    <div className="bg-white border rounded-lg shadow-sm max-w-[90%] w-full">
      {/* 基本情報 */}
      <div className="p-3 border-b bg-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">{data.patient.name}</div>
            <div className="text-sm text-gray-600">ID: {data.patient.id}</div>
          </div>
          {lstepUrl && (
            <a
              href={lstepUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600"
            >
              LINE
            </a>
          )}
        </div>
      </div>

      {/* 処方サマリー */}
      {data.summary && data.summary.length > 0 && (
        <div className="p-3 border-b">
          <div className="text-xs font-semibold text-gray-500 mb-2">処方履歴サマリー</div>
          <div className="flex flex-wrap gap-2">
            {data.summary.map((s, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-100 rounded text-sm"
              >
                {s.product}: {s.count}回
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 注文履歴 */}
      {data.orders && data.orders.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setExpanded(expanded === "orders" ? null : "orders")}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-sm font-medium">
              注文履歴 ({data.totalOrders}件)
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${expanded === "orders" ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded === "orders" && (
            <div className="px-3 pb-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.orders.map((order, i) => (
                  <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{order.date}</span>
                      <span className="text-blue-600">{order.amount}</span>
                    </div>
                    <div className="text-gray-600">{order.product}</div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{order.payment}</span>
                      {order.tracking !== "-" && (
                        <span>追跡: {order.tracking}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 再処方履歴 */}
      {data.reorders && data.reorders.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(expanded === "reorders" ? null : "reorders")}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-sm font-medium">
              再処方申請 ({data.reorders.length}件)
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${expanded === "reorders" ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded === "reorders" && (
            <div className="px-3 pb-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.reorders.map((reorder, i) => (
                  <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">#{reorder.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          reorder.status === "承認済み"
                            ? "bg-green-100 text-green-700"
                            : reorder.status === "承認待ち"
                            ? "bg-yellow-100 text-yellow-700"
                            : reorder.status === "決済済み"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {reorder.status}
                      </span>
                    </div>
                    <div className="text-gray-600">{reorder.product}</div>
                    <div className="text-xs text-gray-500">{reorder.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
