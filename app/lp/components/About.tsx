"use client";

import { Section, Label, Title, Sub } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem } from "./animations";

export default function About() {
  return (
    <Section className="bg-gradient-to-b from-blue-50/40 to-white">
      <div className="text-center">
        <Label>ABOUT</Label>
        <Title>Lオペ for CLINIC とは</Title>
        <Sub>Lオペ for CLINIC は、LINE公式アカウントを「クリニックの業務基盤」へ進化させる、医療機関専用のオールインワン運用プラットフォームです。</Sub>
      </div>

      {/* 管理画面モック — aboutページと同一の3カラムトーク画面 */}
      <FadeIn className="mx-auto mt-8 max-w-5xl" delay={0.1}>
        <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/10 ring-1 ring-gray-200">
          <div className="flex" style={{ height: "520px" }}>
            {/* ═══ サイドバー ═══ */}
            <div className="hidden w-[150px] shrink-0 flex-col bg-slate-900 px-2.5 py-3 md:flex">
              <div className="flex items-center gap-1.5 px-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-r from-cyan-400 to-blue-500">
                  <span className="text-[8px] font-bold text-white">L</span>
                </div>
                <span className="text-[10px] font-bold text-white">Lオペ <span className="text-blue-400">for CLINIC</span></span>
              </div>
              <nav className="mt-5 flex-1 space-y-0.5 text-[10px]">
                <div className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-white/5">📊 ダッシュボード</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-white/5">💹 売上管理</div>
                <div className="rounded-md bg-white/10 px-2 py-1.5 font-bold text-white">💬 LINE機能 <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] text-white">5</span></div>
                <div className="mt-3 px-2 pb-0.5 text-[8px] font-bold tracking-wider text-slate-600">予約・診察</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">📅 予約リスト</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">🔄 再処方リスト</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">📋 カルテ</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">🩺 簡易カルテ</div>
                <div className="mt-3 px-2 pb-0.5 text-[8px] font-bold tracking-wider text-slate-600">決済管理</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">💳 決済</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">🏦 銀行振込照合</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">🔄 定期プラン</div>
                <div className="mt-3 px-2 pb-0.5 text-[8px] font-bold tracking-wider text-slate-600">発送管理</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">📦 発送</div>
                <div className="rounded-md px-2 py-1.5 text-slate-400">🏷 追跡番号</div>
              </nav>
            </div>

            {/* ═══ コンテンツエリア ═══ */}
            <div className="flex flex-1 flex-col bg-white">
              {/* タブ1行目 */}
              <div className="flex items-center border-b border-gray-200 bg-white px-1 text-[9px] md:text-[10px]">
                <span className="px-2.5 py-2 text-gray-400">トップ</span>
                <span className="px-2.5 py-2 text-gray-400">友達一覧</span>
                <span className="border-b-2 border-[#06C755] px-2.5 py-2 font-bold text-[#06C755]">個別トーク</span>
                <span className="px-2.5 py-2 text-gray-400">一斉送信</span>
                <span className="px-2.5 py-2 text-gray-400">テンプレート</span>
                <span className="hidden px-2.5 py-2 text-gray-400 md:inline">回答フォーム</span>
                <span className="hidden px-2.5 py-2 text-gray-400 md:inline">ステップ配信</span>
                <span className="hidden px-2.5 py-2 text-gray-400 md:inline">自動応答</span>
                <span className="hidden px-2.5 py-2 text-gray-400 md:inline">AI返信</span>
                <span className="hidden px-2.5 py-2 text-gray-400 md:inline">リマインド</span>
                <span className="hidden px-2.5 py-2 text-gray-400 lg:inline">タグ管理</span>
                <span className="hidden px-2.5 py-2 text-gray-400 lg:inline">アクション管理</span>
              </div>
              {/* タブ2行目 */}
              <div className="flex items-center border-b border-gray-100 bg-white px-1 text-[8px] md:text-[9px]">
                <span className="px-2 py-1.5 text-gray-400">対応マーク</span>
                <span className="px-2 py-1.5 text-gray-400">情報欄</span>
                <span className="px-2 py-1.5 text-gray-400">メディア</span>
                <span className="px-2 py-1.5 text-gray-400">リッチメニュー</span>
                <span className="px-2 py-1.5 text-gray-400">友達追加時設定</span>
                <span className="hidden px-2 py-1.5 text-gray-400 md:inline">チャットボット</span>
                <span className="hidden px-2 py-1.5 text-gray-400 md:inline">フロービルダー</span>
                <span className="hidden px-2 py-1.5 text-gray-400 md:inline">A/Bテスト</span>
                <span className="hidden px-2 py-1.5 text-gray-400 md:inline">クーポン</span>
                <span className="hidden px-2 py-1.5 text-gray-400 lg:inline">クリック分析</span>
                <span className="hidden px-2 py-1.5 text-gray-400 lg:inline">配信効果分析</span>
                <span className="hidden px-2 py-1.5 text-gray-400 lg:inline">NPS</span>
              </div>

              {/* ═══ 3カラムトーク画面 ═══ */}
              <div className="flex flex-1 overflow-hidden">
                {/* 左: 友達リスト */}
                <div className="hidden w-[180px] shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
                  <div className="space-y-1.5 border-b border-gray-100 p-2.5">
                    <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                      <span className="text-[8px] font-bold text-gray-400">ID</span>
                      <span className="text-[8px] text-gray-300">患者IDで検索</span>
                    </div>
                    <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                      <span className="text-[8px] text-gray-400">🔍</span>
                      <span className="text-[8px] text-gray-300">氏名で検索</span>
                    </div>
                    <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                      <span className="text-[8px] text-gray-400">💬</span>
                      <span className="text-[8px] text-gray-300">メッセージ内容で検索</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-2.5 py-1.5">
                    <span className="text-[9px] text-gray-500">56+件</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] text-orange-500">📌 8</span>
                      <label className="flex items-center gap-1 text-[8px] text-gray-400"><input type="checkbox" className="h-2.5 w-2.5" readOnly /> 未読のみ</label>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {[
                      { name: "田中 美咲", sub: "「マイページ」をタップしました", time: "昨日", badge: "処方ずみ", badgeColor: "bg-blue-500", pin: true, img: "bg-purple-100 text-purple-600" },
                      { name: "佐藤 あかり", sub: "すみません電話に出られなく、時間変更で…", time: "昨日", badge: "不通", badgeColor: "bg-gray-400", pin: true, img: "bg-pink-100 text-pink-600" },
                      { name: "鈴木 陽菜", sub: "了解です", time: "3/24", badge: "処方ずみ", badgeColor: "bg-blue-500", pin: true, img: "bg-amber-100 text-amber-600" },
                      { name: "高橋 結衣", sub: "「マイページ」をタップしました", time: "昨日", badge: "処方ずみ", badgeColor: "bg-blue-500", pin: false, img: "bg-teal-100 text-teal-600" },
                      { name: "山本 さくら", sub: "リッチメニュー操作", time: "0:07", badge: "処方ずみ", badgeColor: "bg-blue-500", active: true, img: "bg-orange-100 text-orange-600" },
                      { name: "伊藤 凛", sub: "ありがとうございます", time: "昨日", badge: "未対応", badgeColor: "bg-red-500", pin: false, img: "bg-rose-100 text-rose-600" },
                    ].map((f) => (
                      <div key={f.name} className={`flex items-start gap-2 border-b border-gray-50 px-2.5 py-2.5 ${f.active ? "bg-blue-50/60" : "hover:bg-gray-50"}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${f.img}`}>
                          {f.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-[10px] font-bold text-gray-800">{f.name}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[8px] text-gray-400">{f.time}</span>
                              {f.pin && <span className="text-[8px] text-amber-500">📌</span>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="truncate text-[8px] text-gray-400">{f.sub}</p>
                            <span className={`shrink-0 ml-1 rounded px-1 py-0.5 text-[7px] font-bold text-white ${f.badgeColor}`}>{f.badge}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 中央: メッセージ */}
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between bg-gradient-to-r from-[#00B900] to-[#00a000] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-bold text-white">山本 さくら</p>
                      <p className="text-[10px] font-mono text-white/70">20260922047</p>
                    </div>
                    <span className="text-[12px] text-amber-300">🔖</span>
                  </div>
                  <div className="relative flex-1 overflow-hidden">
                    <div className="absolute inset-0 space-y-3 overflow-y-auto bg-[#7494C0]/15 p-3">
                      {/* 決済のご案内 */}
                      <div className="flex items-end justify-end gap-1.5">
                        <span className="text-[7px] text-gray-400">10:44</span>
                        <div className="max-w-[75%] overflow-hidden rounded-lg bg-white shadow-sm">
                          <div className="bg-[#06C755] px-3 py-2 text-[10px] font-bold text-white">決済のご案内</div>
                          <div className="p-3">
                            <p className="text-[9px] leading-relaxed text-gray-700">診療後はマイページより決済が可能となっております。ご確認いただけますと幸いです。</p>
                          </div>
                        </div>
                      </div>

                      <div className="text-center">
                        <span className="text-[8px] text-gray-400">23:17</span>
                        <div className="mt-0.5">
                          <span className="rounded-full bg-gray-200/80 px-3 py-0.5 text-[8px] text-gray-500">「マイページ」をタップしました</span>
                        </div>
                      </div>

                      {/* 決済完了 */}
                      <div className="flex items-end justify-end gap-1.5">
                        <span className="text-[7px] text-gray-400">6:50</span>
                        <div className="max-w-[75%] overflow-hidden rounded-lg bg-white shadow-sm">
                          <div className="bg-[#4a8fcc] px-3 py-2 text-[10px] font-bold text-white">決済完了</div>
                          <div className="p-3 text-[9px]">
                            <p className="font-bold text-amber-600">ご注文内容</p>
                            <div className="mt-1.5 space-y-0.5 text-right text-gray-700">
                              <p>マンジャロ 5mg 1ヶ月</p>
                              <p>¥22,850</p>
                              <p>クレジットカード決済</p>
                            </div>
                            <div className="my-2 border-t border-gray-200" />
                            <p className="font-bold text-amber-600">配送先情報</p>
                            <div className="mt-1.5 space-y-0.5 text-right text-gray-700">
                              <p>山本さくら</p>
                              <p>100-0000</p>
                              <p>東京都○○区△△1-2-3</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 日付区切り */}
                      <div className="text-center">
                        <span className="rounded-full bg-gray-400/80 px-4 py-1 text-[8px] font-bold text-white">2026年9月25日</span>
                      </div>

                      {/* アクション通知 */}
                      <div className="text-center">
                        <span className="text-[8px] text-gray-400">8:45</span>
                        <div className="mt-0.5">
                          <span className="rounded-full bg-gray-200/80 px-3 py-0.5 text-[8px] text-gray-500">「マイページ」をタップしました</span>
                        </div>
                      </div>

                      {/* 発送完了のお知らせ */}
                      <div className="flex items-end justify-end gap-1.5">
                        <span className="text-[7px] text-gray-400">16:03</span>
                        <div className="max-w-[75%] overflow-hidden rounded-lg bg-white shadow-sm">
                          <div className="bg-[#ec4899] px-3 py-2.5 text-[11px] font-bold text-white">発送完了のお知らせ</div>
                          <div className="p-3">
                            {/* 配送プログレスバー */}
                            <div className="flex items-center justify-between text-[8px] text-gray-500">
                              <span>発送</span>
                              <span>お届け予定</span>
                            </div>
                            <div className="relative mt-1 h-2.5 w-full rounded-full bg-pink-100">
                              <div className="absolute left-0 top-0 h-2.5 w-[55%] rounded-full bg-gradient-to-r from-yellow-400 to-pink-400" />
                              <div className="absolute left-0 top-0 flex h-2.5 w-5 items-center justify-center rounded-full bg-pink-200 text-[6px]">✓</div>
                            </div>
                            <p className="mt-1 text-center text-[8px] text-gray-500">（ヤマト運輸）</p>

                            <div className="my-2 text-center">
                              <p className="text-[8px] text-gray-500">追跡番号</p>
                              <p className="text-[13px] font-bold text-blue-600">1234-5678-9012</p>
                            </div>
                            <div className="border-t border-gray-100 pt-2 text-[8px] text-gray-600">
                              <p>ヤマト運輸からの発送が開始されると日時指定が可能となります。</p>
                              <div className="my-1.5 border-t border-gray-100" />
                              <p>お届け後は冷蔵保管をするようにお願いいたします。</p>
                            </div>
                            <button className="mt-2 w-full rounded-full bg-[#ec4899] py-1.5 text-[9px] font-bold text-white">配送状況を確認</button>
                            <p className="mt-1 text-center text-[7px] text-gray-400">マイページからも確認が可能です</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* スクロールヒント */}
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#c8d5e2] via-[#c8d5e2]/90 to-transparent pb-3 pt-16">
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-[9px] font-bold text-gray-500">下にスクロールして発送通知を確認</p>
                        <div className="flex animate-bounce flex-col items-center">
                          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          <svg className="-mt-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 入力エリア */}
                  <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-2.5">
                    <span className="text-[12px] text-gray-300">＋</span>
                    <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] text-gray-400">メッセージを入力</div>
                    <button className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm">
                      ⚠ 送信
                    </button>
                  </div>
                </div>

                {/* 右: 患者情報パネル */}
                <div className="hidden w-[190px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white lg:block">
                  <div className="p-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[18px] font-bold text-orange-600">山</div>
                    <p className="mt-2 text-[12px] font-bold text-gray-800">山本 さくら</p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="text-[8px] text-green-500">●</span>
                      <span className="text-[9px] text-green-600">連携済み</span>
                    </div>
                    <button className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[9px] text-gray-600 hover:bg-gray-50">👤 友だち詳細</button>
                    <p className="mt-1 text-[8px] text-gray-400">登録日時: 2026/09/22 14:08</p>
                  </div>

                  <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                    <div>
                      <p className="text-[9px] font-bold text-gray-700">個人情報</p>
                      <div className="mt-1 grid grid-cols-2 gap-y-1 text-[8px]">
                        <span className="text-gray-400">カナ</span><span className="text-gray-700">ヤマモト サクラ</span>
                        <span className="text-gray-400">性別</span><span className="text-gray-700">女</span>
                        <span className="text-gray-400">生年月日</span><span className="text-gray-700">2003/09/12（22歳）</span>
                        <span className="text-gray-400">電話番号</span><span className="text-gray-700">09012345678</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold text-blue-600">予約 2026-09-22 16:45:00（診察済み）</p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold text-gray-700">対応マーク</p>
                      <div className="mt-1 flex items-center rounded-lg border border-gray-200 px-2 py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                        <span className="ml-1.5 text-[9px] text-gray-700">処方ずみ</span>
                        <span className="ml-auto text-[8px] text-gray-400">▼</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold text-gray-700">タグ</p>
                        <span className="text-[8px] text-blue-500">＋ 追加</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">処方ずみ <span className="ml-0.5 text-blue-400">×</span></span>
                        <span className="flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[8px] font-bold text-green-700">個人情報提出ずみ <span className="ml-0.5 text-green-400">×</span></span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold text-gray-700">最新決済</p>
                      <div className="mt-1 rounded bg-gray-50 p-1.5 text-[8px]">
                        <p className="text-gray-700">マンジャロ5mg 1ヶ月</p>
                        <p className="font-bold text-gray-800">¥22,850</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[12px] text-slate-400">
          管理画面 — LINEトーク・患者CRM・対応ステータス・AI Flex作成をひとつの画面で操作
        </p>
      </FadeIn>

      <StaggerChildren className="mt-12 grid gap-5 md:grid-cols-3">
        {[
          { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "LINE起点のCRM", desc: "友だち追加から問診・予約・フォローアップまで、患者とのすべてのタッチポイントをLINE上で一元管理。" },
          { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", title: "業務オールインワン", desc: "予約・会計・配送・カルテ・スケジュール管理まで、バラバラだったツールを1つに統合。" },
          { icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z", title: "最新AI搭載", desc: "Claude・GPTなど最新AIモデルを搭載。患者対応の自動返信、診察音声からのカルテ自動生成、スタッフの修正から自動学習する方式で、使うほど精度が向上します。" },
        ].map((c) => (
          <StaggerItem key={c.title}>
            <div className="group rounded-2xl border border-slate-100 bg-white p-8 text-center transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 transition group-hover:from-blue-100 group-hover:to-sky-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={c.icon} /></svg>
              </div>
              <h3 className="mb-2 text-lg font-bold tracking-tight">{c.title}</h3>
              <p className="text-[13px] leading-relaxed text-slate-400">{c.desc}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>

      {/* ── AI FLEXビルダー モック ── */}
      <FadeIn className="mx-auto mt-16 max-w-5xl" delay={0.15}>
        <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/10 ring-1 ring-gray-200">
          {/* ウィンドウバー */}
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-3 text-[10px] font-medium text-gray-400">Flex Messageビルダー — AI作成モード</span>
          </div>

          <div className="flex bg-white" style={{ minHeight: 380 }}>
            {/* ═══ 左: エディタ側 ═══ */}
            <div className="flex flex-1 flex-col border-r border-gray-100 p-4">
              {/* タブ */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="rounded-md bg-violet-100 px-2.5 py-1 text-[9px] font-bold text-violet-700">AI作成</span>
                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-[9px] text-gray-400">プリセット</span>
                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-[9px] text-gray-400">手動編集</span>
                <span className="ml-auto text-[9px] text-gray-300">&#8984;K</span>
              </div>

              {/* ブロック構造 */}
              <div className="mb-3 rounded-lg bg-gray-50 p-3">
                <div className="text-[9px] font-bold text-gray-400 mb-2">ブロック構造</div>
                <div className="space-y-1.5">
                  {[
                    { icon: "🖼", name: "ヒーロー画像", tag: "AI生成", tagColor: "text-blue-500" },
                    { icon: "T", name: "タイトル", sub: "春の特別キャンペーン" },
                    { icon: "📝", name: "本文テキスト", sub: null },
                    { icon: "🎫", name: "クーポンバッジ", sub: "20% OFF", subColor: "text-amber-600" },
                    { icon: "🔘", name: "予約ボタン", sub: null },
                  ].map((b) => (
                    <div key={b.name} className={`flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 border ${b.tag ? "border-blue-200 shadow-sm" : "border-gray-200"}`}>
                      <span className="text-[11px] w-4 text-center">{b.icon}</span>
                      <span className="text-[10px] font-semibold text-gray-700">{b.name}</span>
                      {b.tag && <span className="ml-auto text-[8px] text-blue-500 font-semibold">{b.tag}</span>}
                      {b.sub && <span className={`ml-auto text-[8px] ${b.subColor || "text-gray-400"}`}>{b.sub}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI指示入力 */}
              <div className="mt-auto rounded-lg border-2 border-violet-200 bg-violet-50/50 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white font-bold">AI</span>
                  <span className="text-[10px] font-bold text-violet-700">AIに指示して作成</span>
                </div>
                {/* 添付画像 */}
                <div className="mb-2 flex items-center gap-2.5 rounded-md bg-white px-2.5 py-2 border border-gray-200">
                  <div className="h-10 w-10 shrink-0 rounded-md bg-gradient-to-br from-pink-200 to-pink-100 flex items-center justify-center text-[14px]">🌸</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-semibold text-gray-600">sakura-campaign.jpg</div>
                    <div className="text-[8px] text-gray-400">画像添付済み</div>
                  </div>
                  <span className="text-[10px] text-gray-300">✕</span>
                </div>
                {/* 指示テキスト */}
                <div className="rounded-md bg-white border border-violet-200 px-3 py-2.5 text-[11px] text-gray-600 leading-relaxed">
                  春のキャンペーン告知を作って。添付の桜画像をヒーローに使って、20%OFFクーポンと予約ボタンを入れて
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <button className="flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2.5 py-1 text-[9px] text-gray-500">📎 画像</button>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5 rounded-md bg-violet-500 px-4 py-2 text-[10px] font-bold text-white shadow-sm">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    生成中...
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ 右: LINEプレビュー ═══ */}
            <div className="flex w-[280px] shrink-0 flex-col items-center bg-gray-50/50 p-4 md:w-[320px]">
              <div className="text-[10px] font-semibold text-gray-400 mb-3 self-start">LINEプレビュー</div>
              {/* LINEフレーム */}
              <div className="w-full max-w-[240px] rounded-xl border border-gray-200 bg-[#7494C0]/15 p-3 shadow-inner">
                <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                  {/* ヒーロー画像 */}
                  <div className="relative h-28 bg-gradient-to-br from-pink-300 via-pink-200 to-rose-100">
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl opacity-60">🌸</span></div>
                    <div className="absolute bottom-1.5 right-1.5 rounded bg-black/40 px-1.5 py-0.5 text-[7px] text-white">AI配置</div>
                  </div>
                  {/* タイトル */}
                  <div className="px-3.5 pt-3">
                    <div className="text-[12px] font-extrabold text-gray-800 leading-tight">春の特別キャンペーン</div>
                  </div>
                  {/* 本文 */}
                  <div className="px-3.5 pt-1.5">
                    <div className="text-[9px] text-gray-500 leading-relaxed">日頃のご愛顧に感謝を込めて、春の特別キャンペーンを開催いたします。この機会にぜひお試しください。</div>
                  </div>
                  {/* クーポン */}
                  <div className="mx-3.5 mt-2.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-3 py-2 text-center">
                    <div className="text-[8px] text-amber-600">期間限定クーポン</div>
                    <div className="text-[16px] font-extrabold text-amber-600">20% OFF</div>
                    <div className="text-[8px] text-amber-400">2026/4/30まで</div>
                  </div>
                  {/* 予約ボタン */}
                  <div className="p-3.5 pt-2.5">
                    <div className="rounded-full bg-[#06C755] py-2.5 text-center text-[10px] font-bold text-white shadow-sm">今すぐ予約する</div>
                  </div>
                </div>
              </div>
              {/* 生成ステータス */}
              <div className="mt-3 flex items-center gap-1.5 self-start">
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-[9px] text-violet-600 font-semibold">AIがFLEXメッセージを構築中...</span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[12px] text-slate-400">
          AI Flexビルダー — テキスト指示と画像送信だけでリッチなFlex Messageを自動作成
        </p>
      </FadeIn>
    </Section>
  );
}
