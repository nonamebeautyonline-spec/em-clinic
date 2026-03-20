// 設定ページ: スタッフ管理（一覧・追加・権限設定）
"use client";

import { useState, useEffect, useCallback } from "react";
import { ROLE_LABELS, getMenuItemsBySection, ALL_MENU_KEYS } from "@/lib/menu-permissions";

// ---------- 型定義 ----------
interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface StaffSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
  currentUserId: string;
}

// ---------- CSRF トークン取得 ----------
function getCsrfToken(): string {
  return document.cookie.match(/csrf_token=([^;]+)/)?.[1] || "";
}

// ---------- 役職バッジ ----------
const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: "bg-blue-100 text-blue-700",
  admin: "bg-green-100 text-green-700",
  editor: "bg-orange-100 text-orange-700",
  viewer: "bg-gray-100 text-gray-600",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${ROLE_BADGE_STYLES[role] ?? "bg-gray-100 text-gray-600"}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ---------- メインコンポーネント ----------
export default function StaffSection({ onToast, currentUserId }: StaffSectionProps) {
  // スタッフ一覧
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // 追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("viewer");
  const [addingUser, setAddingUser] = useState(false);

  // 権限設定モーダル
  const [showPermModal, setShowPermModal] = useState(false);
  const [permTab, setPermTab] = useState<"editor" | "viewer">("editor");
  const [permData, setPermData] = useState<Record<string, Record<string, boolean>>>({
    editor: {},
    viewer: {},
  });
  const [permEditData, setPermEditData] = useState<Record<string, Record<string, boolean>>>({
    editor: {},
    viewer: {},
  });
  const [savingPerm, setSavingPerm] = useState(false);

  // ---------- スタッフ一覧取得 ----------
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("スタッフ一覧の取得に失敗しました");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "スタッフ一覧の取得に失敗しました");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ---------- 役職変更 ----------
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "役職の変更に失敗しました");
      }
      onToast("役職を変更しました", "success");
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "役職の変更に失敗しました");
    }
  };

  // ---------- スタッフ削除 ----------
  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`${name} を削除しますか？`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "削除に失敗しました");
      }
      onToast(`${name} を削除しました`, "success");
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  // ---------- スタッフ追加 ----------
  const handleAddUser = async () => {
    if (!addName.trim() || !addEmail.trim()) {
      onToast("名前とメールアドレスを入力してください", "error");
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify({ name: addName.trim(), email: addEmail.trim(), role: addRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "スタッフの追加に失敗しました");
      }
      onToast("スタッフを追加しました", "success");
      setAddName("");
      setAddEmail("");
      setAddRole("viewer");
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "スタッフの追加に失敗しました");
    } finally {
      setAddingUser(false);
    }
  };

  // ---------- 権限設定取得 ----------
  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/role-permissions", { credentials: "include" });
      if (!res.ok) throw new Error("権限設定の取得に失敗しました");
      const data = await res.json();
      // data.permissions: { editor: { menu_key: { can_edit: boolean } }, viewer: { ... } }
      const parsed: Record<string, Record<string, boolean>> = { editor: {}, viewer: {} };
      const editParsed: Record<string, Record<string, boolean>> = { editor: {}, viewer: {} };
      for (const role of ["editor", "viewer"] as const) {
        const rolePerms = data.permissions?.[role] || {};
        for (const key of ALL_MENU_KEYS) {
          parsed[role][key] = !!rolePerms[key];
          editParsed[role][key] = rolePerms[key]?.can_edit ?? false;
        }
      }
      setPermData(parsed);
      setPermEditData(editParsed);
    } catch (err) {
      alert(err instanceof Error ? err.message : "権限設定の取得に失敗しました");
    }
  }, []);

  const openPermModal = () => {
    fetchPermissions();
    setShowPermModal(true);
  };

  // ---------- 権限設定保存 ----------
  const handleSavePermissions = async () => {
    setSavingPerm(true);
    try {
      for (const role of ["editor", "viewer"] as const) {
        const menuKeys: Record<string, boolean> = {};
        for (const key of ALL_MENU_KEYS) {
          if (permData[role][key]) {
            menuKeys[key] = role === "editor" ? (permEditData[role][key] ?? false) : false;
          }
        }
        const res = await fetch("/api/admin/role-permissions", {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify({ role, menuKeys }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "権限設定の保存に失敗しました");
        }
      }
      onToast("権限設定を保存しました", "success");
      setShowPermModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "権限設定の保存に失敗しました");
    } finally {
      setSavingPerm(false);
    }
  };

  // ---------- 全選択/全解除 ----------
  const handleSelectAll = () => {
    setPermData((prev) => {
      const next = { ...prev };
      next[permTab] = { ...next[permTab] };
      for (const key of ALL_MENU_KEYS) {
        next[permTab][key] = true;
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    setPermData((prev) => {
      const next = { ...prev };
      next[permTab] = { ...next[permTab] };
      for (const key of ALL_MENU_KEYS) {
        next[permTab][key] = false;
      }
      return next;
    });
  };

  // ---------- 描画 ----------
  const menuSections = getMenuItemsBySection();

  return (
    <div className="space-y-6">
      {/* スタッフ一覧 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">スタッフ一覧</h2>
          <button
            onClick={openPermModal}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            権限設定
          </button>
        </div>

        {loadingUsers ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">読み込み中...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">スタッフが登録されていません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left font-medium text-gray-500">名前</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">ユーザーID</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">メール</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">役職</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isOwner = user.role === "owner";
                  return (
                    <tr key={user.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-900 font-medium">
                        {user.name || "---"}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-gray-400">(自分)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                        {user.id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3 text-gray-600">{user.email}</td>
                      <td className="px-5 py-3">
                        {isSelf || isOwner ? (
                          <RoleBadge role={user.role} />
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          >
                            <option value="admin">副管理者</option>
                            <option value="editor">運用者</option>
                            <option value="viewer">スタッフ</option>
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!isSelf && !isOwner && (
                          <button
                            onClick={() => handleDelete(user.id, user.name || user.email)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                          >
                            削除
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* スタッフ追加 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="w-full px-5 py-4 flex items-center gap-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-lg leading-none">{showAddForm ? "−" : "+"}</span>
          <span>スタッフを追加</span>
        </button>

        {showAddForm && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="yamada@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">役職</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="editor">運用者</option>
                <option value="viewer">スタッフ</option>
              </select>
            </div>
            <button
              onClick={handleAddUser}
              disabled={addingUser || !addName.trim() || !addEmail.trim()}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingUser ? "追加中..." : "追加する"}
            </button>
          </div>
        )}
      </div>

      {/* 権限設定モーダル */}
      {showPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPermModal(false)}
          />

          {/* モーダル本体 */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            {/* ヘッダー */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold text-gray-900">権限設定</h3>
              <button
                onClick={() => setShowPermModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* タブ */}
            <div className="px-6 pt-4 flex gap-2 shrink-0">
              {(["editor", "viewer"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPermTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    permTab === tab
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab === "editor" ? "運用者" : "スタッフ"}
                </button>
              ))}
            </div>

            {/* 全選択/全解除 */}
            <div className="px-6 pt-3 flex gap-2 shrink-0">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                全選択
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                全解除
              </button>
            </div>

            {/* メニュー項目チェックリスト */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {menuSections.map(({ section, items }) => (
                <div key={section} className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {section}
                  </h4>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!permData[permTab]?.[item.key]}
                            onChange={(e) => {
                              setPermData((prev) => ({
                                ...prev,
                                [permTab]: { ...prev[permTab], [item.key]: e.target.checked },
                              }));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </label>
                        {permTab === "editor" && permData[permTab]?.[item.key] && (
                          <label className="flex items-center gap-1.5 cursor-pointer shrink-0 ml-3">
                            <input
                              type="checkbox"
                              checked={!!permEditData[permTab]?.[item.key]}
                              onChange={(e) => {
                                setPermEditData((prev) => ({
                                  ...prev,
                                  [permTab]: { ...prev[permTab], [item.key]: e.target.checked },
                                }));
                              }}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="text-xs text-orange-600 font-medium">編集可</span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowPermModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={savingPerm}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingPerm ? "保存中..." : "保存"}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                設定が反映されるには対象ユーザーの再ログインが必要です
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
