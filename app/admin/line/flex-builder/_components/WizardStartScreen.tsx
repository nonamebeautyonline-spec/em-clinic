"use client";

import type { FlexPreset } from "../page";

interface Props {
  onStartFromTemplate: () => void;
  onStartFromScratch: () => void;
  presets: FlexPreset[];
  onSelectPreset: (preset: FlexPreset) => void;
}

/** FLEXビルダー初回表示のスタート画面 — 2モード選択 */
export function WizardStartScreen({
  onStartFromTemplate,
  onStartFromScratch,
  presets,
  onSelectPreset,
}: Props) {
  // おすすめプリセット（最初の6件）
  const recommended = presets.slice(0, 6);

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50/30 p-6">
      <div className="max-w-3xl w-full">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Flexメッセージを作成
          </h1>
          <p className="text-sm text-gray-500">
            テンプレートから始めるか、ゼロから自由に作成できます
          </p>
        </div>

        {/* 2モードカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {/* テンプレートから作る */}
          <button
            onClick={onStartFromTemplate}
            className="group text-left p-6 bg-white rounded-2xl border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">テンプレートから作る</h3>
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full mt-0.5">
                  おすすめ
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              クリニック向けテンプレートを選んで、テキストや画像を差し替えるだけで完成。初めての方はこちら。
            </p>
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
              ギャラリーを見る
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* ゼロから作る */}
          <button
            onClick={onStartFromScratch}
            className="group text-left p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">ゼロから作る</h3>
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full mt-0.5">
                  上級者向け
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              空のキャンバスからブロックを追加して自由にデザイン。完全にオリジナルなメッセージを作りたい方に。
            </p>
            <div className="flex items-center gap-1 text-blue-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
              エディタを開く
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* おすすめプリセット（クイックスタート） */}
        {recommended.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-600 mb-3">
              よく使われるテンプレート
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {recommended.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className="group text-left p-3 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-md transition-all duration-200"
                >
                  <span className="text-sm font-medium text-gray-800 block truncate group-hover:text-green-700">
                    {preset.name}
                  </span>
                  {preset.description && (
                    <span className="text-[11px] text-gray-400 block mt-0.5 truncate">
                      {preset.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
