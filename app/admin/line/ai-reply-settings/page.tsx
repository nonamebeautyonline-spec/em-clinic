"use client";

import { useState, useEffect, useCallback } from "react";

interface AiReplySettings {
  is_enabled: boolean;
  mode: string;
  knowledge_base: string;
  custom_instructions: string;
  min_message_length: number;
  daily_limit: number;
  approval_timeout_hours: number;
}

const DEFAULT_SETTINGS: AiReplySettings = {
  is_enabled: false,
  mode: "approval",
  knowledge_base: "",
  custom_instructions: "",
  min_message_length: 5,
  daily_limit: 100,
  approval_timeout_hours: 24,
};

const KNOWLEDGE_PLACEHOLDER = `例:
■ 営業時間
月〜金: 10:00-19:00
土: 10:00-17:00
日祝: 休診

■ アクセス
東京都○○区○○ 1-2-3 ○○ビル5F
最寄駅: ○○駅 徒歩3分

■ 料金
初診料: ¥3,300
再診料: ¥1,100

■ 予約方法
LINEメニューの「予約する」ボタンから予約できます。
キャンセルはご予約の前日までにLINEでご連絡ください。

■ 再処方
マイページの「再処方申請」からお手続きいただけます。`;

export default function AiReplySettingsPage() {
  const [settings, setSettings] = useState<AiReplySettings>(DEFAULT_SETTINGS);
  const [todayUsage, setTodayUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/line/ai-reply-settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setTodayUsage(data.todayUsage ?? 0);
      }
    } catch (e) {
      console.error("設定取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/line/ai-reply-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
        const data = await res.json();
        setSettings(data.settings);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "保存に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-800">AI返信設定</h1>
      <p className="text-sm text-gray-500">
        患者からのLINEメッセージに対してAIが返信案を生成し、管理グループで承認してから送信します。
      </p>

      {/* 有効/無効 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">AI返信機能</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              有効にすると、キーワード自動応答にマッチしないメッセージにAIが返信案を生成します
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, is_enabled: !s.is_enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.is_enabled ? "bg-purple-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.is_enabled ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* モード */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-gray-700 mb-2">動作モード</h2>
        <div className="flex gap-3">
          <label className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
            settings.mode === "approval" ? "border-purple-500 bg-purple-50" : "border-gray-200"
          }`}>
            <input
              type="radio"
              name="mode"
              value="approval"
              checked={settings.mode === "approval"}
              onChange={() => setSettings(s => ({ ...s, mode: "approval" }))}
              className="accent-purple-600"
            />
            <div>
              <div className="text-sm font-medium">承認制</div>
              <div className="text-xs text-gray-400">管理グループで承認後に送信</div>
            </div>
          </label>
          <label className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
            settings.mode === "auto" ? "border-purple-500 bg-purple-50" : "border-gray-200"
          }`}>
            <input
              type="radio"
              name="mode"
              value="auto"
              checked={settings.mode === "auto"}
              onChange={() => setSettings(s => ({ ...s, mode: "auto" }))}
              className="accent-purple-600"
            />
            <div>
              <div className="text-sm font-medium">自動送信</div>
              <div className="text-xs text-gray-400">AIが即座に返信（要品質確認後）</div>
            </div>
          </label>
        </div>
      </div>

      {/* ナレッジベース */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-gray-700 mb-1">ナレッジベース</h2>
        <p className="text-xs text-gray-400 mb-2">
          クリニックの基本情報を入力してください。AIはこの情報を参照して回答します。
        </p>
        <textarea
          value={settings.knowledge_base}
          onChange={e => setSettings(s => ({ ...s, knowledge_base: e.target.value }))}
          placeholder={KNOWLEDGE_PLACEHOLDER}
          rows={12}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
        />
      </div>

      {/* カスタム指示 */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-gray-700 mb-1">カスタム指示</h2>
        <p className="text-xs text-gray-400 mb-2">
          AIの口調や禁止事項を追加指定できます。空欄の場合はデフォルトの丁寧な口調になります。
        </p>
        <textarea
          value={settings.custom_instructions}
          onChange={e => setSettings(s => ({ ...s, custom_instructions: e.target.value }))}
          placeholder="例: 絵文字は使わず、ですます調で回答してください"
          rows={4}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
        />
      </div>

      {/* 本日の使用状況 */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-gray-700 mb-2">本日の使用状況</h2>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">
            本日のAI返信: <span className="font-bold">{todayUsage}</span> / {settings.daily_limit}件
          </span>
          <span className="text-xs text-gray-400">
            {settings.daily_limit > 0
              ? `残り${Math.max(0, settings.daily_limit - todayUsage)}件`
              : ""}
          </span>
        </div>
        {(() => {
          const pct = settings.daily_limit > 0
            ? Math.min(100, Math.round((todayUsage / settings.daily_limit) * 100))
            : 0;
          const barColor =
            pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-yellow-500" : "bg-green-500";
          return (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`${barColor} h-2.5 rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          );
        })()}
        {todayUsage >= settings.daily_limit && settings.daily_limit > 0 && (
          <p className="text-xs text-red-500 mt-1">
            日次上限に達しました。本日はこれ以上AI返信が生成されません。
          </p>
        )}
      </div>

      {/* 詳細設定 */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold text-gray-700">詳細設定</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">最小文字数</label>
            <input
              type="number"
              min={1}
              value={settings.min_message_length}
              onChange={e => setSettings(s => ({ ...s, min_message_length: Number(e.target.value) || 5 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">この文字数未満はスキップ</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">日次上限（回/日）</label>
            <input
              type="number"
              min={1}
              value={settings.daily_limit}
              onChange={e => setSettings(s => ({ ...s, daily_limit: Number(e.target.value) || 100 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">1日のAI呼び出し上限</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">承認タイムアウト（時間）</label>
            <input
              type="number"
              min={1}
              value={settings.approval_timeout_hours}
              onChange={e => setSettings(s => ({ ...s, approval_timeout_hours: Number(e.target.value) || 24 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">この時間を過ぎると自動失効</p>
          </div>
        </div>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div className={`p-3 rounded text-sm ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>
    </div>
  );
}
