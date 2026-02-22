"use client"

import { useState } from "react"

// AI返信設定デモページ
export default function AIReplySettingsPage() {
  // AI返信有効/無効
  const [enabled, setEnabled] = useState(true)
  // 動作モード: "approval" = 承認制, "auto" = 自動送信
  const [mode, setMode] = useState<"approval" | "auto">("approval")
  // ナレッジベース
  const [knowledge, setKnowledge] = useState("")
  // カスタム指示
  const [customInstruction, setCustomInstruction] = useState("")
  // 詳細設定
  const [minChars, setMinChars] = useState(10)
  const [dailyLimit, setDailyLimit] = useState(100)
  const [approvalTimeout, setApprovalTimeout] = useState(30)
  // トースト表示
  const [showToast, setShowToast] = useState(false)

  // 本日の使用状況
  const usedToday = 32
  const usagePercent = (usedToday / dailyLimit) * 100

  // 使用状況バーの色分け
  const getBarColor = (percent: number) => {
    if (percent <= 50) return "bg-green-500"
    if (percent <= 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  // 保存処理
  const handleSave = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">AI返信設定</h1>

      {/* トースト通知 */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          設定を保存しました
        </div>
      )}

      <div className="space-y-6">
        {/* AI返信有効/無効トグル */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">AI返信を有効にする</h2>
              <p className="text-sm text-slate-500 mt-1">
                LINEメッセージに対してAIが自動で返信を生成します
              </p>
            </div>
            {/* 紫色のトグルスイッチ */}
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                enabled ? "bg-purple-600" : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 動作モード選択 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">動作モード</h2>
          <div className="space-y-3">
            {/* 承認制 */}
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                mode === "approval"
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value="approval"
                checked={mode === "approval"}
                onChange={() => setMode("approval")}
                className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-medium text-slate-800">承認制</span>
                <p className="text-sm text-slate-500 mt-0.5">
                  AIが下書きを作成 → スタッフが確認後送信
                </p>
              </div>
            </label>

            {/* 自動送信 */}
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                mode === "auto"
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value="auto"
                checked={mode === "auto"}
                onChange={() => setMode("auto")}
                className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">自動送信</span>
                {/* 注意アイコン */}
                <svg
                  className="w-5 h-5 text-amber-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500 mt-0.5 -ml-7 pl-7">
                AIが直接返信（スタッフの確認なし）
              </p>
            </label>
          </div>
        </div>

        {/* ナレッジベース */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">ナレッジベース</h2>
          <p className="text-sm text-slate-500 mb-3">
            クリニックの基本情報やよくある質問の回答を入力してください。AIがこの情報をもとに返信を生成します。
          </p>
          <textarea
            rows={12}
            value={knowledge}
            onChange={(e) => setKnowledge(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y"
            placeholder={`【クリニック情報】\nクリニック名: ○○クリニック\n住所: 東京都渋谷区...\n営業時間: 月〜金 10:00-19:00、土 10:00-17:00\n休診日: 日・祝\n\n【取扱メニュー】\n- マンジャロ 2.5mg〜15mg\n- GLP-1ダイエット相談\n\n【注意事項】\n- 医学的な質問には「医師にご確認ください」と案内\n- 料金の割引交渉には応じない`}
          />
        </div>

        {/* カスタム指示 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">カスタム指示</h2>
          <p className="text-sm text-slate-500 mb-3">
            AIの返信トーンや振る舞いに関する追加指示を入力してください。
          </p>
          <textarea
            rows={4}
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y"
            placeholder="丁寧語で対応してください。..."
          />
        </div>

        {/* 本日の使用状況 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">本日の使用状況</h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">AI返信回数</span>
            <span className="text-sm font-semibold text-slate-800">
              {usedToday} / {dailyLimit} 件
            </span>
          </div>
          {/* 進捗バー */}
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getBarColor(usagePercent)}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            使用率: {usagePercent.toFixed(0)}%（日次上限に達すると自動停止します）
          </p>
        </div>

        {/* 詳細設定（3列グリッド） */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">詳細設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 最小文字数 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                最小文字数
              </label>
              <input
                type="number"
                value={minChars}
                onChange={(e) => setMinChars(Number(e.target.value))}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                この文字数未満のメッセージはAI返信しません
              </p>
            </div>

            {/* 日次上限 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                日次上限
              </label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                1日あたりのAI返信最大件数
              </p>
            </div>

            {/* 承認タイムアウト */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                承認タイムアウト（分）
              </label>
              <input
                type="number"
                value={approvalTimeout}
                onChange={(e) => setApprovalTimeout(Number(e.target.value))}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                承認制モードで未承認の下書きが自動破棄されるまでの時間
              </p>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-8 py-3 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  )
}
