"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";

/* ---------- 型定義 ---------- */

interface Scenario {
  id: string;
  name: string;
  description: string | null;
  trigger_keyword: string | null;
  is_active: boolean;
  created_at: string;
}

interface ChatbotNode {
  id: string;
  scenario_id: string;
  node_type: "message" | "question" | "action" | "condition";
  position_x: number;
  position_y: number;
  data: Record<string, unknown>;
  next_node_id: string | null;
}

/* ---------- メインページ ---------- */

export default function ChatbotPage() {
  const { data: scenariosData, isLoading: loading } = useSWR<{ scenarios: Scenario[] }>("/api/admin/chatbot/scenarios");
  const scenarios = scenariosData?.scenarios || [];

  const [showCreate, setShowCreate] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  // 作成フォーム
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  // ノード編集
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [editingNode, setEditingNode] = useState<ChatbotNode | null>(null);
  const [showNodeCreate, setShowNodeCreate] = useState(false);

  // 表示モード切り替え（リスト / フロー）
  const [viewMode, setViewMode] = useState<"list" | "flow">("list");

  /* ---------- シナリオ作成 ---------- */

  const handleCreate = async () => {
    if (!newName.trim()) return alert("シナリオ名を入力してください");
    const res = await fetch("/api/admin/chatbot/scenarios", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDescription || null,
        trigger_keyword: newKeyword || null,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewKeyword("");
      mutate("/api/admin/chatbot/scenarios");
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.message || "作成に失敗しました");
    }
  };

  /* ---------- シナリオ更新 ---------- */

  const handleUpdate = async () => {
    if (!editingScenario) return;
    const res = await fetch(`/api/admin/chatbot/scenarios/${editingScenario.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingScenario.name,
        description: editingScenario.description,
        trigger_keyword: editingScenario.trigger_keyword,
        is_active: editingScenario.is_active,
      }),
    });
    if (res.ok) {
      setEditingScenario(null);
      mutate("/api/admin/chatbot/scenarios");
    } else {
      alert("更新に失敗しました");
    }
  };

  /* ---------- シナリオ削除 ---------- */

  const handleDelete = async (id: string) => {
    if (!confirm("このシナリオを削除しますか？関連ノード・セッションもすべて削除されます。")) return;
    const res = await fetch(`/api/admin/chatbot/scenarios/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      mutate("/api/admin/chatbot/scenarios");
      if (selectedScenario?.id === id) {
        setSelectedScenario(null);
      }
    }
  };

  /* ---------- ノード一覧取得 ---------- */

  const nodesKey = selectedScenario ? `/api/admin/chatbot/scenarios/${selectedScenario.id}/nodes` : null;
  const { data: nodesData } = useSWR<{ nodes: ChatbotNode[] }>(nodesKey);
  const nodes = nodesData?.nodes || [];

  const handleSelectScenario = (s: Scenario) => {
    setSelectedScenario(s);
  };

  /* ---------- ノード作成 ---------- */

  const handleCreateNode = async (nodeType: string) => {
    if (!selectedScenario) return;
    const defaultData: Record<string, unknown> = {};
    if (nodeType === "message") defaultData.text = "メッセージを入力";
    if (nodeType === "question") {
      defaultData.question_text = "質問を入力";
      defaultData.buttons = [{ label: "選択肢1", value: "1" }];
    }

    const res = await fetch(`/api/admin/chatbot/scenarios/${selectedScenario.id}/nodes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node_type: nodeType,
        position_x: 0,
        position_y: nodes.length * 120,
        data: defaultData,
      }),
    });
    if (res.ok) {
      setShowNodeCreate(false);
      mutate(nodesKey);
    }
  };

  /* ---------- ノード更新 ---------- */

  const handleUpdateNode = async () => {
    if (!editingNode || !selectedScenario) return;
    const res = await fetch(`/api/admin/chatbot/scenarios/${selectedScenario.id}/nodes`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingNode.id,
        data: editingNode.data,
        next_node_id: editingNode.next_node_id,
      }),
    });
    if (res.ok) {
      setEditingNode(null);
      mutate(nodesKey);
    }
  };

  /* ---------- ノード削除 ---------- */

  const handleDeleteNode = async (nodeId: string) => {
    if (!selectedScenario || !confirm("このノードを削除しますか？")) return;
    const res = await fetch(
      `/api/admin/chatbot/scenarios/${selectedScenario.id}/nodes?node_id=${nodeId}`,
      { method: "DELETE", credentials: "include" },
    );
    if (res.ok) mutate(nodesKey);
  };

  /* ---------- ノードタイプラベル ---------- */

  const nodeTypeLabel = (t: string) => {
    switch (t) {
      case "message": return "メッセージ";
      case "question": return "質問（選択肢）";
      case "action": return "アクション";
      case "condition": return "条件分岐";
      default: return t;
    }
  };

  const nodeTypeColor = (t: string) => {
    switch (t) {
      case "message": return "bg-blue-100 text-blue-700";
      case "question": return "bg-green-100 text-green-700";
      case "action": return "bg-orange-100 text-orange-700";
      case "condition": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  /* ---------- レンダリング ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">チャットボット</h1>
          <p className="text-sm text-gray-500 mt-1">
            シナリオ型チャットボットの作成・管理
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg transition-colors"
        >
          + 新規シナリオ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左: シナリオ一覧 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-700">シナリオ一覧</h2>
            </div>
            {scenarios.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                シナリオがありません
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {scenarios.map((s) => (
                  <div
                    key={s.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedScenario?.id === s.id ? "bg-green-50 border-l-2 border-[#06C755]" : ""
                    }`}
                    onClick={() => handleSelectScenario(s)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {s.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                              s.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {s.is_active ? "有効" : "停止"}
                          </span>
                        </div>
                        {s.trigger_keyword && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            キーワード: {s.trigger_keyword}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingScenario({ ...s }); }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="編集"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右: ノード編集エリア */}
        <div className="lg:col-span-2">
          {!selectedScenario ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">シナリオを選択してノードを編集</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* ヘッダー: タイトル + タブ切り替え + ノード追加ボタン */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-700">
                    {selectedScenario.name} - ノード
                  </h2>
                  <button
                    onClick={() => setShowNodeCreate(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg transition-colors"
                  >
                    + ノード追加
                  </button>
                </div>
                {/* タブ切り替え */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === "list"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    リスト表示
                  </button>
                  <button
                    onClick={() => setViewMode("flow")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === "flow"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    フロー表示
                  </button>
                </div>
              </div>

              {nodes.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  ノードがありません。「+ ノード追加」で追加してください。
                </div>
              ) : viewMode === "list" ? (
                /* ---------- リスト表示（既存） ---------- */
                <div className="divide-y divide-gray-50">
                  {nodes.map((n, idx) => (
                    <div key={n.id} className="px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${nodeTypeColor(n.node_type)}`}>
                                {nodeTypeLabel(n.node_type)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 mt-1">
                              {n.node_type === "message" && (
                                <span>{(n.data.text as string) || "(テキスト未設定)"}</span>
                              )}
                              {n.node_type === "question" && (
                                <div>
                                  <span>{(n.data.question_text as string) || "(質問未設定)"}</span>
                                  {Array.isArray(n.data.buttons) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(n.data.buttons as Array<{ label: string }>).map((b, i) => (
                                        <span key={i} className="px-2 py-0.5 text-[10px] bg-gray-100 rounded-full text-gray-600">
                                          {b.label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {n.node_type === "action" && (
                                <span>アクション: {(n.data.action_type as string) || "(未設定)"}</span>
                              )}
                              {n.node_type === "condition" && (
                                <span>条件分岐: {Array.isArray(n.data.conditions) ? `${(n.data.conditions as unknown[]).length}件` : "0件"}</span>
                              )}
                            </div>
                            {n.next_node_id && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                次ノード: {n.next_node_id.slice(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingNode({ ...n })}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteNode(n.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ---------- フロー表示（ビジュアル） ---------- */
                <FlowView
                  nodes={nodes}
                  nodeTypeLabel={nodeTypeLabel}
                  nodeTypeColor={nodeTypeColor}
                  onEditNode={(n) => setEditingNode({ ...n })}
                  onDeleteNode={handleDeleteNode}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* シナリオ作成モーダル */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">新規シナリオ作成</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">シナリオ名 *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  placeholder="例: 初回問い合わせ対応"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  rows={2}
                  placeholder="シナリオの説明（任意）"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">トリガーキーワード</label>
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  placeholder="例: 予約"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  ユーザーがこのキーワードを送信するとシナリオが開始されます
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* シナリオ編集モーダル */}
      {editingScenario && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">シナリオ編集</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">シナリオ名</label>
                <input
                  value={editingScenario.name}
                  onChange={(e) => setEditingScenario({ ...editingScenario, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
                <textarea
                  value={editingScenario.description || ""}
                  onChange={(e) => setEditingScenario({ ...editingScenario, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">トリガーキーワード</label>
                <input
                  value={editingScenario.trigger_keyword || ""}
                  onChange={(e) => setEditingScenario({ ...editingScenario, trigger_keyword: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingScenario.is_active}
                  onChange={(e) => setEditingScenario({ ...editingScenario, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">有効</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingScenario(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ノード作成モーダル */}
      {showNodeCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">ノード追加</h3>
            <div className="space-y-2">
              {(["message", "question", "action", "condition"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleCreateNode(t)}
                  className="w-full px-4 py-3 text-left text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full mr-2 ${nodeTypeColor(t)}`}>
                    {nodeTypeLabel(t)}
                  </span>
                  <span className="text-gray-600">
                    {t === "message" && "テキストメッセージを送信"}
                    {t === "question" && "選択肢付きの質問を表示"}
                    {t === "action" && "タグ付けなどのアクションを実行"}
                    {t === "condition" && "条件に基づいて分岐"}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowNodeCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ノード編集モーダル */}
      {editingNode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              ノード編集 - {nodeTypeLabel(editingNode.node_type)}
            </h3>
            <div className="space-y-3">
              {/* message ノード */}
              {editingNode.node_type === "message" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">テキスト</label>
                  <textarea
                    value={(editingNode.data.text as string) || ""}
                    onChange={(e) =>
                      setEditingNode({
                        ...editingNode,
                        data: { ...editingNode.data, text: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                    rows={4}
                  />
                </div>
              )}

              {/* question ノード */}
              {editingNode.node_type === "question" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">質問テキスト</label>
                    <textarea
                      value={(editingNode.data.question_text as string) || ""}
                      onChange={(e) =>
                        setEditingNode({
                          ...editingNode,
                          data: { ...editingNode.data, question_text: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">選択肢</label>
                    {(
                      (editingNode.data.buttons as Array<{ label: string; value: string; next_node_id?: string }>) || []
                    ).map((btn, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input
                          value={btn.label}
                          onChange={(e) => {
                            const buttons = [
                              ...((editingNode.data.buttons as Array<{ label: string; value: string; next_node_id?: string }>) || []),
                            ];
                            buttons[i] = { ...buttons[i], label: e.target.value };
                            setEditingNode({
                              ...editingNode,
                              data: { ...editingNode.data, buttons },
                            });
                          }}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                          placeholder="ラベル"
                        />
                        <input
                          value={btn.value}
                          onChange={(e) => {
                            const buttons = [
                              ...((editingNode.data.buttons as Array<{ label: string; value: string; next_node_id?: string }>) || []),
                            ];
                            buttons[i] = { ...buttons[i], value: e.target.value };
                            setEditingNode({
                              ...editingNode,
                              data: { ...editingNode.data, buttons },
                            });
                          }}
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                          placeholder="値"
                        />
                        <button
                          onClick={() => {
                            const buttons = [
                              ...((editingNode.data.buttons as Array<{ label: string; value: string; next_node_id?: string }>) || []),
                            ];
                            buttons.splice(i, 1);
                            setEditingNode({
                              ...editingNode,
                              data: { ...editingNode.data, buttons },
                            });
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const buttons = [
                          ...((editingNode.data.buttons as Array<{ label: string; value: string }>) || []),
                          { label: "", value: "" },
                        ];
                        setEditingNode({
                          ...editingNode,
                          data: { ...editingNode.data, buttons },
                        });
                      }}
                      className="text-xs text-[#06C755] hover:underline"
                    >
                      + 選択肢を追加
                    </button>
                  </div>
                </>
              )}

              {/* action ノード */}
              {editingNode.node_type === "action" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">アクション種別</label>
                    <select
                      value={(editingNode.data.action_type as string) || ""}
                      onChange={(e) =>
                        setEditingNode({
                          ...editingNode,
                          data: { ...editingNode.data, action_type: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                    >
                      <option value="">選択...</option>
                      <option value="tag_add">タグ追加</option>
                      <option value="tag_remove">タグ除去</option>
                      <option value="api_call">API呼び出し</option>
                    </select>
                  </div>
                  {(editingNode.data.action_type === "tag_add" || editingNode.data.action_type === "tag_remove") && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">タグID</label>
                      <input
                        value={(editingNode.data.tag_id as string) || ""}
                        onChange={(e) =>
                          setEditingNode({
                            ...editingNode,
                            data: { ...editingNode.data, tag_id: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                      />
                    </div>
                  )}
                  {editingNode.data.action_type === "api_call" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">API URL</label>
                      <input
                        value={(editingNode.data.api_url as string) || ""}
                        onChange={(e) =>
                          setEditingNode({
                            ...editingNode,
                            data: { ...editingNode.data, api_url: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                      />
                    </div>
                  )}
                </>
              )}

              {/* 次ノードID（共通） */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">次ノードID</label>
                <select
                  value={editingNode.next_node_id || ""}
                  onChange={(e) =>
                    setEditingNode({ ...editingNode, next_node_id: e.target.value || null })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                >
                  <option value="">なし（終了）</option>
                  {nodes
                    .filter((n) => n.id !== editingNode.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {nodeTypeLabel(n.node_type)} - {n.id.slice(0, 8)}...
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingNode(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateNode}
                className="px-4 py-2 text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   フロー表示コンポーネント
   - ノードをカード型で縦に配置し、SVG矢印で接続を描画
   - 外部ライブラリ不使用（SVG + CSS のみ）
   ========================================================================== */

/** ノードタイプ別のカードボーダー色 */
const nodeTypeBorderColor = (t: string) => {
  switch (t) {
    case "message": return "#3B82F6";   // blue-500
    case "question": return "#22C55E";  // green-500
    case "action": return "#F97316";    // orange-500
    case "condition": return "#A855F7"; // purple-500
    default: return "#9CA3AF";          // gray-400
  }
};

/** フロー表示のレイアウト定数 */
const FLOW_CARD_WIDTH = 260;
const FLOW_CARD_HEIGHT = 100;
const FLOW_GAP_Y = 60;
const FLOW_PADDING_X = 40;
const FLOW_PADDING_Y = 30;

interface FlowViewProps {
  nodes: ChatbotNode[];
  nodeTypeLabel: (t: string) => string;
  nodeTypeColor: (t: string) => string;
  onEditNode: (n: ChatbotNode) => void;
  onDeleteNode: (id: string) => void;
}

function FlowView({ nodes, nodeTypeLabel, nodeTypeColor, onEditNode, onDeleteNode }: FlowViewProps) {
  /* ノード配置の計算（メモ化） */
  const layout = useMemo(() => {
    // ノードIDからインデックスへのマップ
    const idToIndex = new Map<string, number>();
    nodes.forEach((n, i) => idToIndex.set(n.id, i));

    // 各ノードの位置を計算（縦一列配置）
    const positions = nodes.map((_, i) => ({
      x: FLOW_PADDING_X,
      y: FLOW_PADDING_Y + i * (FLOW_CARD_HEIGHT + FLOW_GAP_Y),
    }));

    // 接続線の計算
    const connections: Array<{
      fromIdx: number;
      toIdx: number;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }> = [];

    nodes.forEach((n, fromIdx) => {
      if (n.next_node_id) {
        const toIdx = idToIndex.get(n.next_node_id);
        if (toIdx !== undefined) {
          const from = positions[fromIdx];
          const to = positions[toIdx];
          connections.push({
            fromIdx,
            toIdx,
            // 出発点: カード下端中央
            fromX: from.x + FLOW_CARD_WIDTH / 2,
            fromY: from.y + FLOW_CARD_HEIGHT,
            // 到着点: カード上端中央
            toX: to.x + FLOW_CARD_WIDTH / 2,
            toY: to.y,
          });
        }
      }
    });

    // 接続先を持つノードIDのセット（到達可能判定用）
    const connectedNodeIds = new Set<string>();
    nodes.forEach((n) => {
      if (n.next_node_id) {
        connectedNodeIds.add(n.id);
        connectedNodeIds.add(n.next_node_id);
      }
    });

    // SVG全体のサイズ
    const svgWidth = FLOW_PADDING_X * 2 + FLOW_CARD_WIDTH;
    const svgHeight = positions.length > 0
      ? positions[positions.length - 1].y + FLOW_CARD_HEIGHT + FLOW_PADDING_Y
      : 200;

    return { positions, connections, connectedNodeIds, svgWidth, svgHeight };
  }, [nodes]);

  /** ノードの内容プレビューテキストを取得 */
  const getNodePreview = (n: ChatbotNode): string => {
    switch (n.node_type) {
      case "message":
        return (n.data.text as string) || "(テキスト未設定)";
      case "question":
        return (n.data.question_text as string) || "(質問未設定)";
      case "action":
        return `アクション: ${(n.data.action_type as string) || "(未設定)"}`;
      case "condition": {
        const count = Array.isArray(n.data.conditions) ? (n.data.conditions as unknown[]).length : 0;
        return `条件分岐: ${count}件`;
      }
      default:
        return "";
    }
  };

  /** 接続線のSVGパス（曲線）を生成 */
  const buildArrowPath = (conn: typeof layout.connections[number]): string => {
    const { fromX, fromY, toX, toY } = conn;
    const dy = toY - fromY;

    // 直下への接続（通常のケース）
    if (Math.abs(fromX - toX) < 1 && dy > 0) {
      // まっすぐ下に伸びる矢印
      return `M ${fromX} ${fromY} L ${toX} ${toY}`;
    }

    // 離れたノードへの接続（曲線）
    const cpOffsetY = Math.min(Math.abs(dy) * 0.4, 60);
    return `M ${fromX} ${fromY} C ${fromX} ${fromY + cpOffsetY}, ${toX} ${toY - cpOffsetY}, ${toX} ${toY}`;
  };

  return (
    <div className="overflow-auto" style={{ maxHeight: "600px" }}>
      <svg
        width={layout.svgWidth}
        height={layout.svgHeight}
        className="mx-auto"
        style={{ minWidth: FLOW_CARD_WIDTH + FLOW_PADDING_X * 2 }}
      >
        {/* 矢印マーカー定義 */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#9CA3AF" />
          </marker>
        </defs>

        {/* 接続線の描画 */}
        {layout.connections.map((conn, i) => (
          <path
            key={i}
            d={buildArrowPath(conn)}
            fill="none"
            stroke="#9CA3AF"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
            className="transition-colors"
          />
        ))}

        {/* ノードカードの描画 */}
        {nodes.map((n, idx) => {
          const pos = layout.positions[idx];
          const borderColor = nodeTypeBorderColor(n.node_type);
          const isConnected = layout.connectedNodeIds.has(n.id);
          const preview = getNodePreview(n);

          return (
            <g
              key={n.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => onEditNode(n)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
            >
              {/* カード背景 */}
              <rect
                x={0}
                y={0}
                width={FLOW_CARD_WIDTH}
                height={FLOW_CARD_HEIGHT}
                rx={10}
                ry={10}
                fill="white"
                stroke={borderColor}
                strokeWidth={2}
                className="transition-all"
              />

              {/* 左のカラーバー */}
              <rect
                x={0}
                y={0}
                width={6}
                height={FLOW_CARD_HEIGHT}
                rx={3}
                fill={borderColor}
              />
              {/* 左上角に合わせてrxを調整 */}
              <rect
                x={0}
                y={0}
                width={10}
                height={10}
                rx={10}
                fill={borderColor}
              />
              <rect
                x={0}
                y={FLOW_CARD_HEIGHT - 10}
                width={10}
                height={10}
                rx={10}
                fill={borderColor}
              />

              {/* ノード番号（丸バッジ） */}
              <circle
                cx={24}
                cy={22}
                r={12}
                fill={borderColor}
                opacity={0.15}
              />
              <text
                x={24}
                y={26}
                textAnchor="middle"
                fontSize={11}
                fontWeight="bold"
                fill={borderColor}
              >
                {idx + 1}
              </text>

              {/* ノードタイプラベル */}
              <text
                x={44}
                y={26}
                fontSize={11}
                fontWeight="600"
                fill={borderColor}
              >
                {nodeTypeLabel(n.node_type)}
              </text>

              {/* 内容プレビュー（2行分、はみ出しclip） */}
              <foreignObject
                x={16}
                y={38}
                width={FLOW_CARD_WIDTH - 32}
                height={40}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#4B5563",
                    lineHeight: "1.4",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    wordBreak: "break-all",
                  }}
                >
                  {preview}
                </div>
              </foreignObject>

              {/* 未接続バッジ（接続なしの場合） */}
              {!isConnected && (
                <>
                  <rect
                    x={FLOW_CARD_WIDTH - 56}
                    y={6}
                    width={48}
                    height={18}
                    rx={9}
                    fill="#FEF2F2"
                  />
                  <text
                    x={FLOW_CARD_WIDTH - 32}
                    y={18}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#EF4444"
                    fontWeight="500"
                  >
                    未接続
                  </text>
                </>
              )}

              {/* 下部: 操作アイコンエリア */}
              <g transform={`translate(${FLOW_CARD_WIDTH - 50}, ${FLOW_CARD_HEIGHT - 24})`}>
                {/* 編集アイコン */}
                <g
                  onClick={(e) => { e.stopPropagation(); onEditNode(n); }}
                  className="cursor-pointer"
                >
                  <circle cx={8} cy={8} r={10} fill="transparent" />
                  <path
                    d="M4 12.5V14h1.5l5.3-5.3-1.5-1.5L4 12.5zm7.1-4.1c.15-.15.15-.39 0-.54l-.96-.96c-.15-.15-.39-.15-.54 0L8.7 7.8l1.5 1.5.9-.9z"
                    fill="#9CA3AF"
                    transform="scale(0.85) translate(-1, -1)"
                  />
                </g>
                {/* 削除アイコン */}
                <g
                  onClick={(e) => { e.stopPropagation(); onDeleteNode(n.id); }}
                  className="cursor-pointer"
                  transform="translate(22, 0)"
                >
                  <circle cx={8} cy={8} r={10} fill="transparent" />
                  <path
                    d="M5 5h6M8 5V3.5M4.5 5v7.5a1 1 0 001 1h5a1 1 0 001-1V5M6.5 7.5v3M9.5 7.5v3"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth={1}
                    strokeLinecap="round"
                    transform="scale(0.9) translate(0, 0)"
                  />
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
