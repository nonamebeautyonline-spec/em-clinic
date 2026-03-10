"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ============================================
// 型定義
// ============================================
type ActionItem = {
  id?: string;
  action_type: string;
  sort_order: number;
  config: Record<string, unknown>;
};

type ActionSetting = {
  event_type: string;
  is_enabled: boolean;
  repeat_on_subsequent: boolean;
  items: ActionItem[];
};

type TagDef = { id: number; name: string; color: string };
type MarkDef = { value: string; label: string; color: string; icon: string };
type RichMenu = { id: number; name: string; is_active: boolean };

// ============================================
// 定数
// ============================================
const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  reservation_created: { label: "予約完了時のアクション", icon: "📩" },
  reservation_changed: { label: "予約変更時のアクション", icon: "🔄" },
  reservation_canceled: { label: "予約キャンセル時のアクション", icon: "❌" },
};

const EVENT_ORDER = ["reservation_created", "reservation_changed", "reservation_canceled"];

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  text_send: { label: "テキスト送信", color: "bg-blue-100 text-blue-700 border-blue-200" },
  template_send: { label: "テンプレート送信", color: "bg-purple-100 text-purple-700 border-purple-200" },
  tag_add: { label: "タグ追加", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  tag_remove: { label: "タグ削除", color: "bg-red-100 text-red-700 border-red-200" },
  mark_change: { label: "対応マーク変更", color: "bg-amber-100 text-amber-700 border-amber-200" },
  menu_change: { label: "メニュー操作", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

// ============================================
// メインコンポーネント
// ============================================
export default function ReservationActionsPage() {
  const [actions, setActions] = useState<ActionSetting[]>([]);
  const [tags, setTags] = useState<TagDef[]>([]);
  const [marks, setMarks] = useState<MarkDef[]>([]);
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // どのイベントのアクション追加モーダルを開いているか
  const [addingFor, setAddingFor] = useState<string | null>(null);

  // データ読み込み
  useEffect(() => {
    (async () => {
      try {
        const [actionsRes, tagsRes, marksRes, menusRes] = await Promise.all([
          fetch("/api/admin/reservation-actions", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/admin/tags?simple=true", { credentials: "include" }).then((r) => r.json()).catch(() => ({ tags: [] })),
          fetch("/api/admin/line/marks?simple=true", { credentials: "include" }).then((r) => r.json()).catch(() => ({ marks: [] })),
          fetch("/api/admin/line/rich-menus?simple=true", { credentials: "include" }).then((r) => r.json()).catch(() => ({ menus: [] })),
        ]);
        if (actionsRes.ok && actionsRes.actions) setActions(actionsRes.actions);
        if (tagsRes.tags) setTags(tagsRes.tags);
        if (marksRes.marks) setMarks(marksRes.marks);
        if (menusRes.menus) setMenus(menusRes.menus);
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // アクション設定更新ヘルパー
  const updateAction = useCallback((eventType: string, updates: Partial<ActionSetting>) => {
    setActions((prev) =>
      prev.map((a) => (a.event_type === eventType ? { ...a, ...updates } : a))
    );
  }, []);

  // アイテム追加
  const addItem = useCallback((eventType: string, actionType: string) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.event_type !== eventType) return a;
        const newItem: ActionItem = {
          action_type: actionType,
          sort_order: a.items.length,
          config: getDefaultConfig(actionType),
        };
        return { ...a, items: [...a.items, newItem] };
      })
    );
    setAddingFor(null);
  }, []);

  // アイテム削除
  const removeItem = useCallback((eventType: string, index: number) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.event_type !== eventType) return a;
        const items = a.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i }));
        return { ...a, items };
      })
    );
  }, []);

  // アイテム設定更新
  const updateItemConfig = useCallback((eventType: string, index: number, config: Record<string, unknown>) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.event_type !== eventType) return a;
        const items = a.items.map((item, i) => (i === index ? { ...item, config } : item));
        return { ...a, items };
      })
    );
  }, []);

  // アイテム並び替え（上下移動）
  const moveItem = useCallback((eventType: string, index: number, direction: "up" | "down") => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.event_type !== eventType) return a;
        const items = [...a.items];
        const swapIdx = direction === "up" ? index - 1 : index + 1;
        if (swapIdx < 0 || swapIdx >= items.length) return a;
        [items[index], items[swapIdx]] = [items[swapIdx], items[index]];
        return { ...a, items: items.map((item, i) => ({ ...item, sort_order: i })) };
      })
    );
  }, []);

  // 保存
  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reservation-actions", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
      } else {
        setMessage({ type: "error", text: json.message || "保存に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  const sortedActions = [...actions].sort(
    (a, b) => EVENT_ORDER.indexOf(a.event_type) - EVENT_ORDER.indexOf(b.event_type)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/admin/schedule" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← 予約枠管理に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">予約アクション設定</h1>
          <p className="text-slate-600 mt-1">予約の各イベント発生時に実行するアクションを設定します</p>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* イベント別アクション設定 */}
        <div className="space-y-6">
          {sortedActions.map((action) => {
            const meta = EVENT_LABELS[action.event_type];
            if (!meta) return null;

            return (
              <div key={action.event_type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* イベントヘッダー */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <h2 className="text-lg font-bold text-slate-800">{meta.label}</h2>
                  </div>
                  <button
                    onClick={() => updateAction(action.event_type, { is_enabled: !action.is_enabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      action.is_enabled ? "bg-blue-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        action.is_enabled ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>

                {action.is_enabled && (
                  <div className="p-6">
                    {/* アクション選択ボタン */}
                    <p className="text-sm text-slate-500 text-center mb-4">行う動作を選択してください</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      {Object.entries(ACTION_TYPE_LABELS).map(([type, meta]) => (
                        <button
                          key={type}
                          onClick={() => addItem(action.event_type, type)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium hover:opacity-80 transition ${meta.color}`}
                        >
                          {meta.label}
                        </button>
                      ))}
                    </div>

                    {/* 設定済みアクション一覧 */}
                    {action.items.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600 font-medium">設定済みの動作 ({action.items.length})</p>
                        {action.items.map((item, idx) => (
                          <ActionItemCard
                            key={`${item.action_type}-${idx}`}
                            item={item}
                            index={idx}
                            total={action.items.length}
                            tags={tags}
                            marks={marks}
                            menus={menus}
                            onRemove={() => removeItem(action.event_type, idx)}
                            onUpdateConfig={(config) => updateItemConfig(action.event_type, idx, config)}
                            onMove={(dir) => moveItem(action.event_type, idx, dir)}
                          />
                        ))}
                      </div>
                    )}

                    {action.items.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">アクションが設定されていません</p>
                    )}

                    {/* 発動2回目以降オプション */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={action.repeat_on_subsequent}
                          onChange={(e) => updateAction(action.event_type, { repeat_on_subsequent: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">発動2回目以降も各動作を実行する</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-lg shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition text-base"
          >
            {saving ? "保存中..." : "この条件で決定する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// アクションアイテムカード
// ============================================
function ActionItemCard({
  item, index, total, tags, marks, menus,
  onRemove, onUpdateConfig, onMove,
}: {
  item: ActionItem;
  index: number;
  total: number;
  tags: TagDef[];
  marks: MarkDef[];
  menus: RichMenu[];
  onRemove: () => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const meta = ACTION_TYPE_LABELS[item.action_type];
  if (!meta) return null;

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* 並び替えボタン */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMove("up")}
              disabled={index === 0}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => onMove("down")}
              disabled={index === total - 1}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${meta.color}`}>
            {index + 1}. {meta.label}
          </span>
        </div>
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* アクションタイプ別の設定フォーム */}
      <div className="pl-10">
        {item.action_type === "text_send" && (
          <textarea
            value={(item.config.message as string) || ""}
            onChange={(e) => onUpdateConfig({ ...item.config, message: e.target.value })}
            placeholder="送信するテキストメッセージを入力&#10;&#10;変数: {date}=予約日時, {name}=患者名"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        )}

        {item.action_type === "template_send" && (
          <div className="text-sm text-slate-500">
            <p className="mb-2">デフォルトのFlex Messageテンプレートが送信されます</p>
            <p className="text-xs text-slate-400">配色・文言はFlex Message設定から変更できます</p>
          </div>
        )}

        {item.action_type === "tag_add" && (
          <select
            value={(item.config.tag_id as number) || ""}
            onChange={(e) => onUpdateConfig({ ...item.config, tag_id: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">タグを選択してください</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        {item.action_type === "tag_remove" && (
          <select
            value={(item.config.tag_id as number) || ""}
            onChange={(e) => onUpdateConfig({ ...item.config, tag_id: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">削除するタグを選択してください</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        {item.action_type === "mark_change" && (
          <select
            value={(item.config.mark as string) || ""}
            onChange={(e) => onUpdateConfig({ ...item.config, mark: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">対応マークを選択してください</option>
            <option value="none">なし</option>
            {marks.filter((m) => m.value !== "none").map((m) => (
              <option key={m.value} value={m.value}>
                {m.icon} {m.label}
              </option>
            ))}
          </select>
        )}

        {item.action_type === "menu_change" && (
          <select
            value={(item.config.rich_menu_id as number) || ""}
            onChange={(e) => onUpdateConfig({ ...item.config, rich_menu_id: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">リッチメニューを選択してください</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.is_active ? "" : "(無効)"}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ============================================
// ヘルパー
// ============================================
function getDefaultConfig(actionType: string): Record<string, unknown> {
  switch (actionType) {
    case "text_send": return { message: "" };
    case "template_send": return {};
    case "tag_add": return { tag_id: null };
    case "tag_remove": return { tag_id: null };
    case "mark_change": return { mark: "" };
    case "menu_change": return { rich_menu_id: null };
    default: return {};
  }
}
