// ビジネスルール設定セクション — 再処方制御 + イベント通知
"use client";

import { useState, useEffect } from "react";

interface BusinessRulesConfig {
  dosageChangeNotify: boolean;
  minReorderIntervalDays: number;
  notifyReorderApply: boolean;
  notifyReorderApprove: boolean;
  notifyReorderPaid: boolean;
  intakeReminderHours: number;
  approveMessage: string;
  paymentThankMessage: string;
  autoApproveSameDose: boolean;
}

const DEFAULT_CONFIG: BusinessRulesConfig = {
  dosageChangeNotify: false,
  minReorderIntervalDays: 0,
  notifyReorderApply: true,
  notifyReorderApprove: true,
  notifyReorderPaid: true,
  intakeReminderHours: 0,
  approveMessage: "",
  paymentThankMessage: "",
  autoApproveSameDose: false,
};

const DEFAULT_APPROVE_MESSAGE = "再処方申請が承認されました\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください";

interface BusinessRulesSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function BusinessRulesSection({ onToast }: BusinessRulesSectionProps) {
  const [config, setConfig] = useState<BusinessRulesConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  // --- 初期読み込み ---
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings?category=business_rules", { credentials: "include" });
        const data = await res.json();
        if (!ignore && data.settings && typeof data.settings === "object") {
          const s = data.settings;
          setConfig(prev => ({
            ...prev,
            dosageChangeNotify: s.dosage_change_notify === "true",
            minReorderIntervalDays: s.min_reorder_interval_days ? parseInt(s.min_reorder_interval_days, 10) : prev.minReorderIntervalDays,
            notifyReorderApply: s.notify_reorder_apply !== undefined ? s.notify_reorder_apply !== "false" : prev.notifyReorderApply,
            notifyReorderApprove: s.notify_reorder_approve !== undefined ? s.notify_reorder_approve !== "false" : prev.notifyReorderApprove,
            notifyReorderPaid: s.notify_reorder_paid !== undefined ? s.notify_reorder_paid !== "false" : prev.notifyReorderPaid,
            intakeReminderHours: s.intake_reminder_hours ? parseInt(s.intake_reminder_hours, 10) : prev.intakeReminderHours,
            approveMessage: s.approve_message || prev.approveMessage,
            paymentThankMessage: s.payment_thank_message || prev.paymentThankMessage,
            autoApproveSameDose: s.auto_approve_same_dose === "true",
          }));
        }
      } catch {
        /* デフォルト値を維持 */
      }
      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, []);

  // --- 保存 ---
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const entries: { key: string; value: string }[] = [
        { key: "dosage_change_notify", value: String(config.dosageChangeNotify) },
        { key: "min_reorder_interval_days", value: String(config.minReorderIntervalDays) },
        { key: "notify_reorder_apply", value: String(config.notifyReorderApply) },
        { key: "notify_reorder_approve", value: String(config.notifyReorderApprove) },
        { key: "notify_reorder_paid", value: String(config.notifyReorderPaid) },
        { key: "intake_reminder_hours", value: String(config.intakeReminderHours) },
        { key: "approve_message", value: config.approveMessage },
        { key: "payment_thank_message", value: config.paymentThankMessage },
        { key: "auto_approve_same_dose", value: String(config.autoApproveSameDose) },
      ];

      const results = await Promise.all(
        entries.map(({ key, value }) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ category: "business_rules", key, value }),
          })
        )
      );

      const allOk = results.every(r => r.ok);
      if (allOk) {
        setSaved(true);
        setEditing(false);
        onToast("ビジネスルールを保存しました", "success");
        setTimeout(() => setSaved(false), 3000);
      } else {
        onToast("一部の設定の保存に失敗しました", "error");
      }
    } catch {
      onToast("保存に失敗しました", "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">ビジネスルール</h2>
          <p className="text-xs text-gray-500 mt-0.5">再処方制御・イベント通知の設定</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? "保存中..." : "保存する"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              編集する
            </button>
          )}
        </div>
      </div>

      <div className={`space-y-6 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
        {/* カード1: 再処方制御 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">再処方制御</h3>
            <p className="text-xs text-gray-500 mt-0.5">再処方の申請条件と自動化を設定します</p>
          </div>
          <div className="p-5 space-y-5">
            {/* 再処方間隔 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">再処方間隔の最低日数</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={config.minReorderIntervalDays}
                  onChange={(e) => setConfig(prev => ({ ...prev, minReorderIntervalDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">日（0 = 制限なし）</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">前回の決済完了日から指定日数経過しないと再処方申請ができなくなります</p>
            </div>

            {/* 同量自動承認 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">同量再処方の自動承認</p>
                <p className="text-xs text-gray-400 mt-0.5">前回と同じ用量の再処方申請をDr確認なしで自動承認します</p>
              </div>
              <Toggle
                checked={config.autoApproveSameDose}
                onChange={(v) => setConfig(prev => ({ ...prev, autoApproveSameDose: v }))}
                disabled={!editing}
              />
            </div>

            {/* 用量変更通知 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">用量変更時の管理者通知</p>
                <p className="text-xs text-gray-400 mt-0.5">増量申請時に管理者LINEグループへ追加通知を送信します</p>
              </div>
              <Toggle
                checked={config.dosageChangeNotify}
                onChange={(v) => setConfig(prev => ({ ...prev, dosageChangeNotify: v }))}
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        {/* カード2: イベント通知 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">イベント通知</h3>
            <p className="text-xs text-gray-500 mt-0.5">各イベントの通知ON/OFFと送信メッセージを設定します</p>
          </div>
          <div className="divide-y divide-gray-100">
            {/* 再処方申請通知 */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">再処方申請通知</p>
                  <p className="text-xs text-gray-400 mt-0.5">患者が再処方を申請した際に管理者LINEグループへ通知</p>
                </div>
                <Toggle
                  checked={config.notifyReorderApply}
                  onChange={(v) => setConfig(prev => ({ ...prev, notifyReorderApply: v }))}
                  disabled={!editing}
                />
              </div>
            </div>

            {/* 再処方承認通知 */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">再処方承認通知</p>
                  <p className="text-xs text-gray-400 mt-0.5">Dr承認時に患者へLINEメッセージを送信</p>
                </div>
                <Toggle
                  checked={config.notifyReorderApprove}
                  onChange={(v) => setConfig(prev => ({ ...prev, notifyReorderApprove: v }))}
                  disabled={!editing}
                />
              </div>
              {config.notifyReorderApprove && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">承認通知メッセージ</label>
                  <textarea
                    rows={3}
                    value={config.approveMessage}
                    onChange={(e) => setConfig(prev => ({ ...prev, approveMessage: e.target.value }))}
                    placeholder={DEFAULT_APPROVE_MESSAGE}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">空の場合はデフォルト文言が使用されます</p>
                </div>
              )}
            </div>

            {/* 決済完了通知 */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">決済完了通知</p>
                  <p className="text-xs text-gray-400 mt-0.5">決済完了時に患者へサンクスメッセージを送信</p>
                </div>
                <Toggle
                  checked={config.notifyReorderPaid}
                  onChange={(v) => setConfig(prev => ({ ...prev, notifyReorderPaid: v }))}
                  disabled={!editing}
                />
              </div>
              {config.notifyReorderPaid && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">決済完了メッセージ</label>
                  <textarea
                    rows={3}
                    value={config.paymentThankMessage}
                    onChange={(e) => setConfig(prev => ({ ...prev, paymentThankMessage: e.target.value }))}
                    placeholder="例: お支払いありがとうございます。発送準備を進めてまいります。"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">空の場合、決済完了後のサンクスメッセージは送信されません</p>
                </div>
              )}
            </div>

            {/* 問診後リマインダー */}
            <div className="p-5 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">問診後リマインダー</p>
                <p className="text-xs text-gray-400 mt-0.5">問診完了後、指定時間以内に予約がなければ患者にLINEリマインダーを送信</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={config.intakeReminderHours}
                  onChange={(e) => setConfig(prev => ({ ...prev, intakeReminderHours: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">時間後（0 = 無効）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
