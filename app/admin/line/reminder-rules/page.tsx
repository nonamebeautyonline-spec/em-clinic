"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- 型定義 ---------- */
interface ReminderRule {
  id: number;
  name: string;
  timing_type: "before_hours" | "before_days" | "fixed_time";
  timing_value: number;
  message_template: string;
  is_enabled: boolean;
  sent_count: number;
  created_at: string;
  send_hour?: number;
  send_minute?: number;
  target_day_offset?: number;
  message_format?: "text" | "flex";
}

interface SendLog {
  rule_id: number;
  rule_name: string;
  date: string;
  total: number;
  sent: number;
  failed: number;
  scheduled: number;
  message_format: string;
  send_time: string;
}

const TIMING_TYPES = [
  { value: "before_hours", label: "時間前" },
  { value: "before_days", label: "日前" },
  { value: "fixed_time", label: "固定時刻" },
];

const TEMPLATE_VARS = [
  { var: "{name}", desc: "患者名" },
  { var: "{date}", desc: "予約日" },
  { var: "{time}", desc: "予約時刻" },
  { var: "{patient_id}", desc: "患者ID" },
];

const DEFAULT_TEMPLATE = `{name}様

明日のご予約についてお知らせいたします。

予約日時: {date} {time}

ご来院をお待ちしております。
変更・キャンセルはお早めにご連絡ください。`;

const DEFAULT_MORNING_TEMPLATE = `{name}様

本日、診療のご予約がございます。

予約日時：{date} {time}

詳細につきましてはマイページよりご確認ください。

診療は、予約時間枠の間に「090-」から始まる番号よりお電話いたします。
知らない番号からの着信を受け取れない設定になっている場合は、
事前にご連絡いただけますと幸いです。

なお、診療時間にご連絡なくご対応いただけなかった場合、
次回以降のご予約が取りづらくなる可能性がございます。

キャンセルや予約内容の変更をご希望の場合は、
必ず事前にマイページよりお手続きをお願いいたします。

本日もどうぞよろしくお願いいたします。`;

/* ---------- ヘルパー ---------- */

/** 固定時刻ルールのタイミング表示文字列 */
function getTimingLabel(rule: ReminderRule): string {
  if (rule.timing_type !== "fixed_time") {
    return `予約の ${rule.timing_value}${rule.timing_type === "before_hours" ? "時間" : "日"}前`;
  }
  const hh = String(rule.send_hour ?? 0).padStart(2, "0");
  const mm = String(rule.send_minute ?? 0).padStart(2, "0");
  const dayLabel = rule.target_day_offset === 0 ? "当日" : "前日";
  return `${dayLabel} ${hh}:${mm}`;
}

/** アイコン表示テキスト */
function getIconText(rule: ReminderRule): string {
  if (rule.timing_type !== "fixed_time") {
    return `${rule.timing_value}${rule.timing_type === "before_hours" ? "h" : "d"}`;
  }
  const hh = String(rule.send_hour ?? 0).padStart(2, "0");
  const mm = String(rule.send_minute ?? 0).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** FLEXプレビュー（モーダル内） */
function FlexPreview() {
  const sampleDate = "2/18(火) 10:00〜10:15";
  return (
    <div className="mt-3 bg-gray-50/80 rounded-xl border border-gray-200 overflow-hidden max-w-[280px]">
      {/* ヘッダー */}
      <div className="bg-[#E75A7C] px-4 py-3">
        <span className="text-white font-bold text-sm">明日のご予約</span>
      </div>
      {/* ボディ */}
      <div className="px-4 py-3 bg-white">
        <div className="text-[10px] text-gray-500 mb-0.5">予約日時</div>
        <div className="text-base font-bold text-[#E75A7C] mb-2">{sampleDate}</div>
        <div className="border-t border-gray-100 pt-2">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            明日のご予約がございます。<br />
            変更・キャンセルをご希望の場合は、マイページよりお手続きをお願いいたします。
          </p>
        </div>
      </div>
    </div>
  );
}

/** FLEXミニプレビュー（ルール一覧カード内） */
function FlexPreviewMini() {
  return (
    <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-100/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#E75A7C] text-white rounded">FLEX</span>
        <span className="text-[11px] text-gray-600 font-medium">明日のご予約リマインド</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-16 h-10 bg-white rounded border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-[#E75A7C] h-2.5 flex items-center px-1">
            <span className="text-white text-[4px]">明日のご予約</span>
          </div>
          <div className="px-1 py-0.5 flex-1">
            <div className="text-[4px] text-gray-400">予約日時</div>
            <div className="text-[5px] font-bold text-[#E75A7C]">2/18 10:00</div>
          </div>
        </div>
        <span className="text-[10px] text-gray-400">予約日時 + 案内メッセージ</span>
      </div>
    </div>
  );
}

/* ---------- メインページ ---------- */
export default function ReminderRulesPage() {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<Partial<ReminderRule> | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/line/reminder-rules", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setRules(d.rules || []);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/line/reminder-rules/logs", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setSendLogs(d.logs || []);
      }
    } catch (e) {
      console.error("ログ取得エラー:", e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); loadLogs(); }, [loadData, loadLogs]);

  const handleCreate = () => {
    setEditRule({
      name: "",
      timing_type: "before_hours",
      timing_value: 24,
      message_template: DEFAULT_TEMPLATE,
      is_enabled: true,
      message_format: "text",
    });
    setShowModal(true);
  };

  const handleEdit = (rule: ReminderRule) => {
    setEditRule({ ...rule });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editRule) return;
    setSaving(true);
    try {
      const method = editRule.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/line/reminder-rules", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRule),
      });
      if (res.ok) {
        setShowModal(false);
        setEditRule(null);
        loadData();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: ReminderRule) => {
    await fetch("/api/admin/line/reminder-rules", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, is_enabled: !rule.is_enabled }),
    });
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このリマインドルールを削除しますか？")) return;
    await fetch(`/api/admin/line/reminder-rules?id=${id}`, { method: "DELETE", credentials: "include" });
    loadData();
  };

  /** タイミングタイプ変更時のデフォルト値設定 */
  const handleTimingTypeChange = (newType: string) => {
    if (!editRule) return;
    if (newType === "fixed_time") {
      setEditRule({
        ...editRule,
        timing_type: "fixed_time" as const,
        send_hour: editRule.send_hour ?? 19,
        send_minute: editRule.send_minute ?? 0,
        target_day_offset: editRule.target_day_offset ?? 1,
        message_format: editRule.message_format || "flex",
        message_template: editRule.message_template || "",
      });
    } else {
      setEditRule({
        ...editRule,
        timing_type: newType as "before_hours" | "before_days",
        message_format: "text",
        message_template: editRule.message_template || DEFAULT_TEMPLATE,
      });
    }
  };

  const closeModal = () => { setShowModal(false); setEditRule(null); };
  const totalSent = rules.reduce((sum, r) => sum + r.sent_count, 0);
  const activeCount = rules.filter(r => r.is_enabled).length;

  // 保存ボタンの無効化条件
  const isSaveDisabled = (() => {
    if (saving || !editRule?.name?.trim()) return true;
    if (editRule?.timing_type === "fixed_time" && editRule?.message_format === "flex") return false;
    return !editRule?.message_template?.trim();
  })();

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                予約リマインド
              </h1>
              <p className="text-sm text-gray-400 mt-1">予約の自動通知。固定時刻やFLEXメッセージにも対応しています。</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新しいルール
            </button>
          </div>

          {/* サマリーカード */}
          {rules.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100/50">
                <div className="text-2xl font-bold text-sky-700">{rules.length}</div>
                <div className="text-xs text-sky-500 mt-0.5">ルール数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{activeCount}</div>
                <div className="text-xs text-green-500 mt-0.5">稼働中</div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100/50">
                <div className="text-2xl font-bold text-violet-700">{totalSent}</div>
                <div className="text-xs text-violet-500 mt-0.5">送信実績</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ルール一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">リマインドルールはまだありません</p>
            <p className="text-gray-300 text-xs mt-1">「新しいルール」から予約リマインドを設定しましょう</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                  !rule.is_enabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* タイミングアイコン */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      rule.is_enabled
                        ? rule.timing_type === "fixed_time"
                          ? "bg-gradient-to-br from-orange-500 to-amber-600"
                          : "bg-gradient-to-br from-sky-500 to-blue-600"
                        : "bg-gray-200"
                    }`}>
                      <span className="text-white text-[10px] font-bold leading-tight text-center">
                        {getIconText(rule as ReminderRule)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-gray-900 truncate">{rule.name}</h3>
                        {!rule.is_enabled && (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full font-medium">
                            停止中
                          </span>
                        )}
                        {rule.message_format === "flex" && (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] bg-[#E75A7C] text-white rounded-full font-medium">
                            FLEX
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                          rule.timing_type === "fixed_time"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-sky-50 text-sky-700"
                        }`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {getTimingLabel(rule as ReminderRule)}
                        </span>
                        <span className="text-gray-400">
                          送信実績: <span className="text-gray-600 font-medium">{rule.sent_count}件</span>
                        </span>
                      </div>

                      {/* メッセージプレビュー */}
                      {rule.message_format === "flex" ? (
                        <FlexPreviewMini />
                      ) : (
                        <div className="bg-gray-50/80 rounded-lg p-3 text-[11px] text-gray-500 whitespace-pre-wrap line-clamp-2 leading-relaxed border border-gray-100/50">
                          {rule.message_template}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(rule as ReminderRule)}
                      className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(rule as ReminderRule)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        rule.is_enabled ? "bg-[#06C755]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          rule.is_enabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 送信履歴 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900">送信履歴</h2>
            <span className="text-[11px] text-gray-400">直近30日</span>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : sendLogs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">送信履歴はまだありません</p>
              <p className="text-xs text-gray-300 mt-1">リマインドが送信されるとここに記録されます</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* 日付ごとにグルーピング */}
              {(() => {
                const grouped = new Map<string, SendLog[]>();
                for (const log of sendLogs) {
                  const list = grouped.get(log.date) || [];
                  list.push(log);
                  grouped.set(log.date, list);
                }
                return [...grouped.entries()].map(([date, logs]) => {
                  const [yy, mm, dd] = date.split("-").map(Number);
                  const dt = new Date(Date.UTC(yy, mm - 1, dd));
                  const dow = ["日", "月", "火", "水", "木", "金", "土"][dt.getUTCDay()];
                  const dateLabel = `${mm}/${dd}(${dow})`;
                  const totalForDay = logs.reduce((s, l) => s + l.total, 0);

                  return (
                    <div key={date} className="px-5 py-3">
                      {/* 日付ヘッダー */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-700">{dateLabel}</span>
                        <span className="text-[10px] text-gray-400">{date}</span>
                        <span className="ml-auto text-[11px] text-gray-500">
                          計 <span className="font-semibold text-gray-700">{totalForDay}件</span> 送信
                        </span>
                      </div>

                      {/* 各ルールの送信結果 */}
                      <div className="space-y-1.5">
                        {logs.map((log, i) => (
                          <div key={`${log.rule_id}-${i}`} className="flex items-center gap-3 pl-3 py-1.5 rounded-lg bg-gray-50/60">
                            {/* 送信時刻 */}
                            <span className="text-xs font-mono font-semibold text-gray-600 w-12 shrink-0">
                              {log.send_time}
                            </span>

                            {/* ルール名 + 形式バッジ */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-[12px] text-gray-700 truncate">{log.rule_name}</span>
                              {log.message_format === "flex" && (
                                <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-bold bg-[#E75A7C] text-white rounded">FLEX</span>
                              )}
                            </div>

                            {/* 送信結果 */}
                            <div className="flex items-center gap-2 shrink-0">
                              {log.sent > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  <span className="text-green-700 font-medium">{log.sent}</span>
                                </span>
                              )}
                              {log.failed > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  <span className="text-red-600 font-medium">{log.failed}</span>
                                </span>
                              )}
                              {log.scheduled > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                  <span className="text-yellow-700 font-medium">{log.scheduled}</span>
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 w-8 text-right">{log.total}人</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 作成/編集モーダル */}
      {showModal && editRule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {editRule.id ? "ルール編集" : "新しいリマインドルール"}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* ルール名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ルール名</label>
                <input
                  type="text"
                  value={editRule.name || ""}
                  onChange={e => setEditRule({ ...editRule, name: e.target.value })}
                  placeholder="例: 前日リマインド（FLEX）"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* タイミングタイプ選択（3ボタン） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">タイミングタイプ</label>
                <div className="flex gap-2">
                  {TIMING_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTimingTypeChange(t.value)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl border transition-all ${
                        editRule.timing_type === t.value
                          ? t.value === "fixed_time"
                            ? "bg-orange-50 border-orange-300 text-orange-700"
                            : "bg-sky-50 border-sky-300 text-sky-700"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 条件分岐UI: 固定時刻 vs 相対時間 */}
              {editRule.timing_type === "fixed_time" ? (
                <>
                  {/* 送信時刻 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">送信時刻</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={editRule.send_hour ?? 19}
                        onChange={e => setEditRule({ ...editRule, send_hour: parseInt(e.target.value) })}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <span className="text-gray-500 font-medium">:</span>
                      <select
                        value={editRule.send_minute ?? 0}
                        onChange={e => setEditRule({ ...editRule, send_minute: parseInt(e.target.value) })}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                      >
                        {[0, 15, 30, 45].map(m => (
                          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 対象予約 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">対象予約</label>
                    <select
                      value={editRule.target_day_offset ?? 1}
                      onChange={e => setEditRule({ ...editRule, target_day_offset: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                    >
                      <option value={1}>翌日の予約（前日送信）</option>
                      <option value={0}>当日の予約</option>
                    </select>
                  </div>

                  {/* メッセージ形式 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">メッセージ形式</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newTemplate = editRule.message_template ||
                            (editRule.target_day_offset === 0 ? DEFAULT_MORNING_TEMPLATE : DEFAULT_TEMPLATE);
                          setEditRule({ ...editRule, message_format: "text", message_template: newTemplate });
                        }}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl border transition-all ${
                          editRule.message_format !== "flex"
                            ? "bg-sky-50 border-sky-300 text-sky-700"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        テキスト
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRule({ ...editRule, message_format: "flex" })}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl border transition-all ${
                          editRule.message_format === "flex"
                            ? "bg-[#E75A7C]/10 border-[#E75A7C]/40 text-[#E75A7C]"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        FLEX
                      </button>
                    </div>
                  </div>

                  {/* FLEX: プレビュー表示 / テキスト: テンプレートエディタ */}
                  {editRule.message_format === "flex" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">FLEXプレビュー</label>
                      <p className="text-xs text-gray-400 mb-1">予約日時を自動で差し込んだFLEXメッセージが送信されます</p>
                      <FlexPreview />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">メッセージ</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {TEMPLATE_VARS.map(v => (
                          <button
                            key={v.var}
                            type="button"
                            onClick={() => setEditRule({ ...editRule, message_template: (editRule.message_template || "") + v.var })}
                            className="px-2.5 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors"
                          >
                            {v.var} <span className="text-sky-400">({v.desc})</span>
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={editRule.message_template || ""}
                        onChange={e => setEditRule({ ...editRule, message_template: e.target.value })}
                        rows={8}
                        placeholder="リマインドメッセージを入力..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all resize-none"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 既存: 相対タイミング */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">送信タイミング</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">予約の</span>
                      <input
                        type="number"
                        min={1}
                        value={editRule.timing_value ?? 24}
                        onChange={e => setEditRule({ ...editRule, timing_value: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                      />
                      <span className="text-sm text-gray-600">
                        {editRule.timing_type === "before_hours" ? "時間前" : "日前"}
                      </span>
                    </div>
                  </div>

                  {/* メッセージテンプレート */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">メッセージ</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {TEMPLATE_VARS.map(v => (
                        <button
                          key={v.var}
                          type="button"
                          onClick={() => setEditRule({ ...editRule, message_template: (editRule.message_template || "") + v.var })}
                          className="px-2.5 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors"
                        >
                          {v.var} <span className="text-sky-400">({v.desc})</span>
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={editRule.message_template || ""}
                      onChange={e => setEditRule({ ...editRule, message_template: e.target.value })}
                      rows={8}
                      placeholder="リマインドメッセージを入力..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isSaveDisabled}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 disabled:opacity-40 text-sm font-medium shadow-lg shadow-sky-500/25 transition-all"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </span>
                ) : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
