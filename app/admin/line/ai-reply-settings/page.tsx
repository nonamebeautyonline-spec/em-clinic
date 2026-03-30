"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { AIReplyStatsContent } from "../ai-reply-stats/page";
import { useConfirmModal } from "@/hooks/useConfirmModal";

interface AiReplySettings {
  is_enabled: boolean;
  mode: string;
  medical_reply_mode: string;
  greeting_reply_enabled: boolean;
  knowledge_base: string;
  custom_instructions: string;
  min_message_length: number;
  daily_limit: number;
  approval_timeout_hours: number;
  model_id: string;
  rag_similarity_threshold: number;
  rag_max_examples: number;
  rag_max_kb_chunks: number;
  // Cost Guard設定
  debounce_sec: number;
  daily_cost_limit_usd: number;
  rate_limit_30s: number;
  rate_limit_1h: number;
  spam_filter_enabled: boolean;
  // Case Routing設定
  case_routing_enabled: boolean;
}

type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface DaySchedule {
  start: string;
  end: string;
  closed: boolean;
}

interface BusinessHoursConfig {
  enabled: boolean;
  schedule: Record<DayOfWeek, DaySchedule>;
  timezone: string;
  outside_message: string;
}

const ALL_DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "月", tue: "火", wed: "水", thu: "木",
  fri: "金", sat: "土", sun: "日",
};

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "バランス型（推奨）" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "高速・低コスト" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6", description: "高精度" },
] as const;

const DEFAULT_SETTINGS: AiReplySettings = {
  is_enabled: false,
  mode: "approval",
  medical_reply_mode: "confirm",
  greeting_reply_enabled: false,
  knowledge_base: "",
  custom_instructions: "",
  min_message_length: 5,
  daily_limit: 100,
  approval_timeout_hours: 24,
  model_id: "claude-sonnet-4-6",
  rag_similarity_threshold: 0.35,
  rag_max_examples: 5,
  rag_max_kb_chunks: 5,
  debounce_sec: 15,
  daily_cost_limit_usd: 10.0,
  rate_limit_30s: 3,
  rate_limit_1h: 30,
  spam_filter_enabled: true,
  case_routing_enabled: false,
};

const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  enabled: false,
  schedule: {
    mon: { start: "09:00", end: "18:00", closed: false },
    tue: { start: "09:00", end: "18:00", closed: false },
    wed: { start: "09:00", end: "18:00", closed: false },
    thu: { start: "09:00", end: "18:00", closed: false },
    fri: { start: "09:00", end: "18:00", closed: false },
    sat: { start: "09:00", end: "18:00", closed: true },
    sun: { start: "09:00", end: "18:00", closed: true },
  },
  timezone: "Asia/Tokyo",
  outside_message: "営業時間外のため、翌営業日にご返信いたします。",
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

// タブ定義
const TABS = [
  { key: "settings" as const, label: "設定" },
  { key: "examples" as const, label: "学習例" },
  { key: "stats" as const, label: "統計" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AiReplySettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("settings");
  const swrKey = "/api/admin/line/ai-reply-settings";
  const { data: swrData, isLoading: loading } = useSWR(swrKey);
  const [settings, setSettings] = useState<AiReplySettings>(DEFAULT_SETTINGS);
  const [businessHours, setBusinessHours] = useState<BusinessHoursConfig>(DEFAULT_BUSINESS_HOURS);
  const [todayUsage, setTodayUsage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // SWRデータをローカルステートに反映（編集可能にするため）
  useEffect(() => {
    if (swrData) {
      setSettings(swrData.settings);
      setTodayUsage(swrData.todayUsage ?? 0);
      if (swrData.businessHours) {
        setBusinessHours(swrData.businessHours);
      }
    }
  }, [swrData]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/line/ai-reply-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, business_hours: businessHours }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
        const data = await res.json();
        setSettings(data.settings);
        mutate(swrKey);
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

  // 曜日スケジュール更新ヘルパー
  const updateDaySchedule = (day: DayOfWeek, field: keyof DaySchedule, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value },
      },
    }));
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

      {/* タブ切替 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 学習例タブ */}
      {activeTab === "examples" && <AiReplyExamplesTab />}

      {/* 統計タブ */}
      {activeTab === "stats" && <AIReplyStatsContent />}

      {/* 設定タブ */}
      {activeTab === "settings" && <>
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

      {/* 医学的質問への対応モード */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-gray-700 mb-1">医学的質問への対応</h2>
        <p className="text-xs text-gray-400 mb-3">薬の効果・副作用・症状など医学的な質問に対するAIの返答方式</p>
        <div className="flex gap-3">
          <label className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
            (settings.medical_reply_mode || "confirm") === "confirm" ? "border-purple-500 bg-purple-50" : "border-gray-200"
          }`}>
            <input
              type="radio"
              name="medical_reply_mode"
              value="confirm"
              checked={(settings.medical_reply_mode || "confirm") === "confirm"}
              onChange={() => setSettings(s => ({ ...s, medical_reply_mode: "confirm" }))}
              className="accent-purple-600"
            />
            <div>
              <div className="text-sm font-medium">確認モード</div>
              <div className="text-xs text-gray-400">「確認いたします」等で断定を避ける</div>
            </div>
          </label>
          <label className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
            settings.medical_reply_mode === "direct" ? "border-purple-500 bg-purple-50" : "border-gray-200"
          }`}>
            <input
              type="radio"
              name="medical_reply_mode"
              value="direct"
              checked={settings.medical_reply_mode === "direct"}
              onChange={() => setSettings(s => ({ ...s, medical_reply_mode: "direct" }))}
              className="accent-purple-600"
            />
            <div>
              <div className="text-sm font-medium">直接回答モード</div>
              <div className="text-xs text-gray-400">ナレッジベースを元に具体的に回答</div>
            </div>
          </label>
        </div>
      </div>

      {/* 挨拶・お礼への返信 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">挨拶・お礼への返信</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              「ありがとうございます」「了解しました」等の挨拶メッセージにもAIが返信案を生成します
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, greeting_reply_enabled: !s.greeting_reply_enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.greeting_reply_enabled ? "bg-purple-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.greeting_reply_enabled ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* AIモデル選択 */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-gray-700 mb-1">AIモデル</h2>
        <p className="text-xs text-gray-400 mb-3">AI返信に使用するClaudeモデルを選択してください</p>
        <div className="flex gap-3 flex-wrap">
          {MODEL_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
                (settings.model_id || "claude-sonnet-4-6") === opt.value
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="model_id"
                value={opt.value}
                checked={(settings.model_id || "claude-sonnet-4-6") === opt.value}
                onChange={() => setSettings(s => ({ ...s, model_id: opt.value }))}
                className="accent-purple-600"
              />
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Case Routing（自動モデル振り分け） */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">Case Routing（自動モデル振り分け）</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              分類結果に応じてHaiku（高速・低コスト）とSonnet（高精度）を自動選択
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(s => ({ ...s, case_routing_enabled: !s.case_routing_enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.case_routing_enabled ? "bg-purple-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.case_routing_enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {settings.case_routing_enabled && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              上の「AIモデル」の選択はSonnet側モデルとして使用されます
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 text-gray-500 font-normal">分類</th>
                  <th className="text-left py-1 text-gray-500 font-normal">条件</th>
                  <th className="text-left py-1 text-gray-500 font-normal">モデル</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-1">挨拶</td>
                  <td className="py-1">-</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">Haiku</span></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">運用系</td>
                  <td className="py-1">信頼度 &ge; 0.8</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">Haiku</span></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">運用系</td>
                  <td className="py-1">信頼度 &lt; 0.8</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Sonnet</span></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">医療系</td>
                  <td className="py-1">常に</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Sonnet</span></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">その他</td>
                  <td className="py-1">エスカレーション</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Sonnet</span></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">その他</td>
                  <td className="py-1">信頼度 &ge; 0.8</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">Haiku</span></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">その他</td>
                  <td className="py-1">信頼度 &lt; 0.8</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Sonnet</span></td>
                </tr>
                <tr>
                  <td className="py-1">分類失敗</td>
                  <td className="py-1">-</td>
                  <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Sonnet</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 営業時間設定 */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">営業時間設定</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              営業時間外はAI返信の代わりに定型メッセージを自動送信します
            </p>
          </div>
          <button
            onClick={() => setBusinessHours(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              businessHours.enabled ? "bg-purple-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                businessHours.enabled ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {businessHours.enabled && (
          <>
            {/* 曜日別スケジュール */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block font-medium">曜日別スケジュール</label>
              <div className="space-y-1.5">
                {ALL_DAYS.map(day => (
                  <div key={day} className="flex items-center gap-3">
                    {/* 定休日チェックボックス */}
                    <label className="flex items-center gap-1.5 w-16 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!businessHours.schedule[day].closed}
                        onChange={e => updateDaySchedule(day, "closed", !e.target.checked)}
                        className="accent-purple-600 w-4 h-4"
                      />
                      <span className={`text-sm font-medium ${
                        businessHours.schedule[day].closed ? "text-gray-400" : "text-gray-700"
                      }`}>
                        {DAY_LABELS[day]}
                      </span>
                    </label>

                    {/* 時刻入力 */}
                    {businessHours.schedule[day].closed ? (
                      <span className="text-xs text-gray-400 italic">定休日</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={businessHours.schedule[day].start}
                          onChange={e => updateDaySchedule(day, "start", e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-28"
                        />
                        <span className="text-gray-400 text-sm">〜</span>
                        <input
                          type="time"
                          value={businessHours.schedule[day].end}
                          onChange={e => updateDaySchedule(day, "end", e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-28"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 営業時間外メッセージ */}
            <div>
              <label className="text-xs text-gray-500 block mb-1 font-medium">営業時間外メッセージ</label>
              <textarea
                value={businessHours.outside_message}
                onChange={e => setBusinessHours(prev => ({ ...prev, outside_message: e.target.value }))}
                placeholder="営業時間外のため、翌営業日にご返信いたします。"
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                営業時間外に患者からメッセージが届いた場合、このメッセージを自動送信します
              </p>
            </div>
          </>
        )}
      </div>

      {/* ナレッジベース */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-gray-700 mb-1">ナレッジベース</h2>
        <p className="text-xs text-gray-400 mb-2">
          クリニックの基本情報を入力してください。AIはこの情報を参照して回答します。
        </p>
        <details className="mb-3 text-xs border border-purple-100 rounded-lg bg-purple-50/50">
          <summary className="px-3 py-2 cursor-pointer text-purple-600 font-medium hover:text-purple-700 select-none">
            書き方のヒント
          </summary>
          <div className="px-3 pb-3 pt-1 text-gray-600 space-y-2">
            <div>
              <p className="font-medium text-gray-700 mb-0.5">基本ルール</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-500">
                <li><code className="bg-white px-1 rounded text-purple-600">■ セクション名</code> で区切ると、AIが質問に関連する部分だけを自動抽出します</li>
                <li>1セクションは400文字以内が目安（長すぎると分割されます）</li>
                <li>箇条書き・簡潔な文で書くとAIの回答精度が上がります</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-0.5">おすすめセクション</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-gray-500">
                <span>■ 営業時間・休診日</span>
                <span>■ アクセス・駐車場</span>
                <span>■ 料金・支払い方法</span>
                <span>■ 予約・キャンセル方法</span>
                <span>■ 施術メニュー</span>
                <span>■ 再処方・マイページ</span>
                <span>■ よくある質問</span>
                <span>■ 注意事項・禁忌</span>
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-0.5">記入例</p>
              <pre className="bg-white rounded p-2 text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed">■ 予約方法{"\n"}LINEメニューの「予約する」ボタンから予約できます。{"\n"}キャンセルはご予約の前日18時までにLINEでご連絡ください。{"\n"}当日キャンセルはキャンセル料（施術料金の50%）が発生します。{"\n"}{"\n"}■ 再処方{"\n"}マイページの「再処方申請」からお手続きいただけます。{"\n"}前回の処方から3ヶ月以上経過している場合は再診が必要です。</pre>
            </div>
          </div>
        </details>
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

        <h3 className="font-medium text-gray-600 text-sm mt-4">RAG検索パラメータ</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">類似度閾値</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={settings.rag_similarity_threshold}
              onChange={e => setSettings(s => ({ ...s, rag_similarity_threshold: Number(e.target.value) || 0.35 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">低いほど幅広くマッチ（推奨: 0.3〜0.5）</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">学習例の最大数</label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.rag_max_examples}
              onChange={e => setSettings(s => ({ ...s, rag_max_examples: Number(e.target.value) || 5 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">プロンプトに含める学習例数</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">KBチャンクの最大数</label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.rag_max_kb_chunks}
              onChange={e => setSettings(s => ({ ...s, rag_max_kb_chunks: Number(e.target.value) || 5 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">プロンプトに含めるKBチャンク数</p>
          </div>
        </div>
      </div>

      {/* コスト防御設定 */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">コスト防御（Anti-Spam）</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-500">{settings.spam_filter_enabled ? "有効" : "無効"}</span>
            <input
              type="checkbox"
              checked={settings.spam_filter_enabled}
              onChange={e => setSettings(s => ({ ...s, spam_filter_enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="relative w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">デバウンス（秒）</label>
            <input
              type="number"
              min={5}
              max={120}
              value={settings.debounce_sec}
              onChange={e => setSettings(s => ({ ...s, debounce_sec: Number(e.target.value) || 15 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">メッセージ待機時間</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">30秒レート上限</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.rate_limit_30s}
              onChange={e => setSettings(s => ({ ...s, rate_limit_30s: Number(e.target.value) || 3 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">30秒あたりの最大メッセージ数</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">1時間レート上限</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={settings.rate_limit_1h}
              onChange={e => setSettings(s => ({ ...s, rate_limit_1h: Number(e.target.value) || 30 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">1時間あたりの最大メッセージ数</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">日次コスト上限（USD）</label>
            <input
              type="number"
              min={0}
              max={10000}
              step={0.5}
              value={settings.daily_cost_limit_usd}
              onChange={e => setSettings(s => ({ ...s, daily_cost_limit_usd: Number(e.target.value) || 10 }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">テナント全体の1日コスト上限</p>
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
      </>}
    </div>
  );
}

// 学習例タブコンポーネント
interface AiReplyExample {
  id: number;
  question: string;
  answer: string;
  source: "staff_edit" | "manual_reply";
  category: string;
  used_count: number;
  quality_score: number | null;
  approved_count: number | null;
  rejected_count: number | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  staff_reply: "スタッフ返信",
  rule: "ルール",
  faq: "FAQ",
};

function AiReplyExamplesTab() {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const examplesKey = "/api/admin/line/ai-reply-examples";
  const { data: exData, isLoading: loading } = useSWR(examplesKey);
  const allExamples: AiReplyExample[] = exData?.examples || [];
  const total: number = exData?.total || 0;
  const [deleting, setDeleting] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const examples = categoryFilter === "all"
    ? allExamples
    : allExamples.filter(ex => (ex.category || "staff_reply") === categoryFilter);

  const handleDelete = async (id: number) => {
    const ok = await confirm({ title: "学習例削除", message: "この学習例を削除しますか？", variant: "danger", confirmLabel: "削除する" });
    if (!ok) return;
    setDeleting(id);
    try {
      const res = await fetch("/api/admin/line/ai-reply-examples", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        mutate(examplesKey);
      }
    } catch (e) {
      console.error("学習例削除エラー:", e);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-700">学習例一覧</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            スタッフの修正・手動返信から自動学習された Q&A です。AIは患者メッセージに類似する学習例を参考にして返信します。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs border rounded px-2 py-1 text-gray-600"
          >
            <option value="all">すべて ({total})</option>
            <option value="staff_reply">スタッフ返信</option>
            <option value="rule">ルール</option>
            <option value="faq">FAQ</option>
          </select>
          <span className="text-sm text-gray-500">{examples.length}件</span>
        </div>
      </div>

      {examples.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">
          まだ学習例がありません。スタッフがAI返信を修正・手動返信すると自動的に蓄積されます。
        </div>
      ) : (
        <div className="space-y-3">
          {examples.map(ex => (
            <div key={ex.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">患者メッセージ</span>
                    <p className="text-sm text-gray-700 mt-0.5">{ex.question}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">スタッフ返信</span>
                    <p className="text-sm text-gray-700 mt-0.5">{ex.answer}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded ${
                      ex.source === "staff_edit" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                    }`}>
                      {ex.source === "staff_edit" ? "修正送信" : "手動返信"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      (ex.category || "staff_reply") === "rule" ? "bg-orange-50 text-orange-600" :
                      (ex.category || "staff_reply") === "faq" ? "bg-cyan-50 text-cyan-600" :
                      "bg-gray-50 text-gray-500"
                    }`}>
                      {CATEGORY_LABELS[ex.category || "staff_reply"] || ex.category}
                    </span>
                    {(ex.quality_score != null) && (
                      <span className={`px-1.5 py-0.5 rounded ${
                        ex.quality_score >= 1.2 ? "bg-purple-50 text-purple-600" :
                        ex.quality_score >= 0.8 ? "bg-gray-100 text-gray-600" :
                        "bg-red-50 text-red-500"
                      }`}>
                        品質 {ex.quality_score.toFixed(1)}
                      </span>
                    )}
                    <span title="使用回数">使用 {ex.used_count || 0}回</span>
                    {(ex.approved_count != null && ex.approved_count > 0) && (
                      <span className="text-green-600" title="承認回数">承認 {ex.approved_count}</span>
                    )}
                    {(ex.rejected_count != null && ex.rejected_count > 0) && (
                      <span className="text-red-500" title="却下回数">却下 {ex.rejected_count}</span>
                    )}
                    <span>{new Date(ex.created_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ex.id)}
                  disabled={deleting === ex.id}
                  className="text-gray-400 hover:text-red-500 transition-colors text-sm p-1 shrink-0"
                  title="削除"
                >
                  {deleting === ex.id ? "..." : "×"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
