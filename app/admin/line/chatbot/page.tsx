"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  // 作成フォーム
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  // ノード編集
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [nodes, setNodes] = useState<ChatbotNode[]>([]);
  const [editingNode, setEditingNode] = useState<ChatbotNode | null>(null);
  const [showNodeCreate, setShowNodeCreate] = useState(false);

  /* ---------- シナリオ一覧取得 ---------- */

  const loadScenarios = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chatbot/scenarios", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setScenarios(d.scenarios || []);
      }
    } catch (e) {
      console.error("シナリオ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

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
      loadScenarios();
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
      loadScenarios();
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
      loadScenarios();
      if (selectedScenario?.id === id) {
        setSelectedScenario(null);
        setNodes([]);
      }
    }
  };

  /* ---------- ノード一覧取得 ---------- */

  const loadNodes = useCallback(async (scenarioId: string) => {
    const res = await fetch(`/api/admin/chatbot/scenarios/${scenarioId}/nodes`, {
      credentials: "include",
    });
    if (res.ok) {
      const d = await res.json();
      setNodes(d.nodes || []);
    }
  }, []);

  const handleSelectScenario = (s: Scenario) => {
    setSelectedScenario(s);
    loadNodes(s.id);
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
      loadNodes(selectedScenario.id);
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
      loadNodes(selectedScenario.id);
    }
  };

  /* ---------- ノード削除 ---------- */

  const handleDeleteNode = async (nodeId: string) => {
    if (!selectedScenario || !confirm("このノードを削除しますか？")) return;
    const res = await fetch(
      `/api/admin/chatbot/scenarios/${selectedScenario.id}/nodes?node_id=${nodeId}`,
      { method: "DELETE", credentials: "include" },
    );
    if (res.ok) loadNodes(selectedScenario.id);
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
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-700">
                    {selectedScenario.name} - ノード一覧
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    上から順に実行されます
                  </p>
                </div>
                <button
                  onClick={() => setShowNodeCreate(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg transition-colors"
                >
                  + ノード追加
                </button>
              </div>

              {nodes.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  ノードがありません。「+ ノード追加」で追加してください。
                </div>
              ) : (
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
