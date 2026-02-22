"use client";

import { useState } from "react";
import { DEMO_RICH_MENUS, type DemoRichMenu } from "../_data/mock";

// ボタン領域の色（6ボタン分）
const AREA_COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

export default function DemoRichMenuPage() {
  // リッチメニュー一覧（デフォルト切替用にステートで管理）
  const [menus, setMenus] = useState<DemoRichMenu[]>(DEMO_RICH_MENUS);
  // 詳細/編集モーダル用
  const [selectedMenu, setSelectedMenu] = useState<DemoRichMenu | null>(null);
  // トースト通知
  const [toast, setToast] = useState<string | null>(null);

  // デフォルトに設定する処理
  const handleSetDefault = (menuId: string) => {
    setMenus((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === menuId,
      }))
    );
    const targetMenu = menus.find((m) => m.id === menuId);
    // トースト表示
    setToast(`「${targetMenu?.name}」をデフォルトに設定しました`);
    setTimeout(() => setToast(null), 3000);
    // モーダル内の選択メニューも更新
    if (selectedMenu?.id === menuId) {
      setSelectedMenu({ ...selectedMenu, isDefault: true });
    }
  };

  // モーダルを閉じる
  const closeModal = () => setSelectedMenu(null);

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">リッチメニュー管理</h1>

      {/* メニュー一覧（カード型・3枚横並び・レスポンシブ） */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* カードヘッダー：メニュー名 + デフォルトバッジ */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-slate-800">{menu.name}</h2>
                {menu.isDefault && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                    デフォルト
                  </span>
                )}
              </div>
              {/* ボタン数・ユーザー数 */}
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {menu.areas.length}ボタン
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {menu.userCount.toLocaleString()}人
                </span>
              </div>
            </div>

            {/* ボタン領域グリッド（3列×2行） */}
            <div className="px-5 pb-3">
              <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
                {menu.areas.map((area, i) => (
                  <div
                    key={i}
                    className={`relative group rounded-lg border px-2 py-3 text-center cursor-default ${AREA_COLORS[i % AREA_COLORS.length]}`}
                  >
                    <span className="text-xs font-medium leading-tight block truncate">
                      {area.label}
                    </span>
                    {/* ツールチップ（ホバーで表示） */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-slate-800 text-white text-[10px] rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                        <p className="font-semibold">{area.label}</p>
                        <p className="text-slate-300 mt-0.5">{area.action}</p>
                      </div>
                      {/* ツールチップの三角形 */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* カードフッター：アクションボタン */}
            <div className="px-5 pb-5 pt-2 flex gap-2">
              <button
                onClick={() => setSelectedMenu(menu)}
                className="flex-1 py-2 px-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                詳細を見る
              </button>
              {!menu.isDefault && (
                <button
                  onClick={() => handleSetDefault(menu.id)}
                  className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  デフォルトに設定
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 詳細/編集モーダル */}
      {selectedMenu && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // 背景クリックで閉じる
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800">{selectedMenu.name}</h2>
                {selectedMenu.isDefault && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                    デフォルト
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="px-6 py-5 space-y-6">
              {/* メニュー名・説明 */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">メニュー名</label>
                  <p className="text-slate-800 font-medium mt-1">{selectedMenu.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">説明</label>
                  <p className="text-slate-600 text-sm mt-1">{selectedMenu.description}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">表示中ユーザー</label>
                    <p className="text-slate-800 font-medium mt-1">{selectedMenu.userCount.toLocaleString()}人</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ボタン数</label>
                    <p className="text-slate-800 font-medium mt-1">{selectedMenu.areas.length}個</p>
                  </div>
                </div>
              </div>

              {/* プレビュー表示（3×2グリッド） */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">プレビュー</h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="grid grid-cols-3 grid-rows-2 gap-2">
                    {selectedMenu.areas.map((area, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border px-3 py-4 text-center ${AREA_COLORS[i % AREA_COLORS.length]}`}
                      >
                        <span className="text-sm font-semibold block">{area.label}</span>
                        <span className="text-[10px] mt-1 block opacity-75">{area.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ボタン一覧（テーブル形式） */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">ボタン一覧</h3>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-10">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">ラベル</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">アクション種別</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMenu.areas.map((area, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-sm text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${AREA_COLORS[i % AREA_COLORS.length]}`}>
                              {area.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{area.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={closeModal}
                className="py-2 px-4 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                閉じる
              </button>
              {!menus.find((m) => m.id === selectedMenu.id)?.isDefault && (
                <button
                  onClick={() => {
                    handleSetDefault(selectedMenu.id);
                    closeModal();
                  }}
                  className="py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  デフォルトに設定
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out]">
          <div className="bg-slate-800 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm">
            {/* チェックアイコン */}
            <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toast}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* トーストアニメーション用スタイル */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
