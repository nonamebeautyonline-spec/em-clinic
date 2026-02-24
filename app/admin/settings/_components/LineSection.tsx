// LINE連携セクション（channel_access_token, channel_secret）
"use client";

import { useState } from "react";
import type { SettingsMap } from "../page";
import { SettingRow } from "../page";

interface Props {
  settings: SettingsMap | null;
  onSaved: (msg: string, type: "success" | "error") => void;
}

function SetupGuide({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <span className="text-sm font-bold text-gray-800">LINE連携の設定手順</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
          {/* ステップ1 */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
              <h4 className="text-sm font-bold text-gray-900">LINE公式アカウントの準備</h4>
            </div>
            <div className="ml-8 space-y-1.5 text-xs text-gray-600 leading-relaxed">
              <p>
                <a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                  LINE Official Account Manager
                </a>
                {" "}でLINE公式アカウントを作成（既にあればスキップ）
              </p>
              <p>「設定」→「Messaging API」→「<strong>Messaging APIを利用する</strong>」をクリック</p>
              <p className="text-gray-400">※ プロバイダーの選択を求められたら、新規作成またはクリニック名を選択</p>
            </div>
          </div>

          {/* ステップ2 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
              <h4 className="text-sm font-bold text-gray-900">LINE Developersでチャネル情報を取得</h4>
            </div>
            <div className="ml-8 space-y-1.5 text-xs text-gray-600 leading-relaxed">
              <p>
                <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                  LINE Developers コンソール
                </a>
                {" "}にログイン → 該当プロバイダー → チャネルを選択
              </p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 mt-2">
                <p className="font-medium text-gray-700">「チャネル基本設定」タブ:</p>
                <p className="pl-3">「チャネルID」の値 → 下の <strong>Channel ID (OAuth)</strong> にコピー</p>
                <p className="pl-3">「チャネルシークレット」の値 → 下の <strong>Channel Secret (OAuth)</strong> にコピー</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 mt-2">
                <p className="font-medium text-gray-700">「Messaging API設定」タブ:</p>
                <p className="pl-3">「チャネルアクセストークン」の「<strong>発行</strong>」ボタンを押す</p>
                <p className="pl-3">表示されたトークン → 下の <strong>MAPI Channel Access Token</strong> にコピー</p>
              </div>
            </div>
          </div>

          {/* ステップ3 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
              <h4 className="text-sm font-bold text-gray-900">Webhook URLを設定</h4>
            </div>
            <div className="ml-8 space-y-1.5 text-xs text-gray-600 leading-relaxed">
              <p>LINE Developersの「Messaging API設定」タブを開く</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 mt-2">
                <p><strong>Webhook URL</strong> に以下を入力:</p>
                <code className="block bg-white px-3 py-1.5 rounded border border-gray-200 text-xs font-mono text-gray-800 select-all">
                  https://あなたのドメイン/api/line/webhook
                </code>
                <p className="pl-3">「<strong>Webhookの利用</strong>」→ <strong className="text-green-600">ON</strong></p>
                <p className="pl-3">「<strong>応答メッセージ</strong>」→ <strong className="text-red-600">OFF</strong>（Lオペ側で管理するため）</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LineSection({ settings, onSaved }: Props) {
  const items = settings?.line ?? [];
  const allUnconfigured = items.length === 0 || items.every((i) => i.source === "未設定");

  return (
    <div className="space-y-4">
      {/* 設定手順ガイド（未設定時はデフォルト展開） */}
      <SetupGuide defaultOpen={allUnconfigured} />

      {/* 設定項目一覧 */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
          LINE連携の設定はありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">LINE連携</h2>
              <p className="text-xs text-gray-500 mt-0.5">LINE Messaging APIの認証情報</p>
            </div>
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
              必須
            </span>
          </div>
          {items.map((item) => (
            <SettingRow key={item.key} item={item} category="line" onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
