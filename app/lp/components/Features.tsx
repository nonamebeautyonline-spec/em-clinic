"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Section, Label, Title, Sub, MockWindow } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   機能紹介 — タブ式UI（5カテゴリ）+ 主要機能のMockWindow
   ═══════════════════════════════════════════════════════════════════════════ */

const categories = [
  {
    id: "line",
    label: "LINE運用",
    icon: "💬",
    features: [
      { name: "LINEトーク", desc: "患者との1対1チャットを管理画面から送受信。患者情報・問診・処方歴を確認しながら対応" },
      { name: "セグメント配信", desc: "タグ・属性・来院日の組み合わせで精密なターゲティング配信。A/Bテスト対応" },
      { name: "ステップシナリオ", desc: "友だち追加後のフォロー・再診促進を時間差で自動配信。条件分岐にも対応" },
      { name: "リッチメニュービルダー", desc: "ドラッグ操作でメニューを構築。画像・アクションを直感的に配置" },
      { name: "キーワード自動返信", desc: "「予約」「料金」等のキーワードに即座に自動返信。24時間対応を実現" },
      { name: "Flex Messageビルダー", desc: "リッチなカード型メッセージをノーコードで作成・配信。カルーセル・ボタン対応" },
      { name: "チャットボットビルダー", desc: "会話フローをビジュアルで設計。質問・条件分岐・アクションを組み合わせてシナリオ構築" },
      { name: "A/Bテスト", desc: "メッセージの複数バリアントを比較検証。開封率・CV率をデータで最適化" },
      { name: "LINE通知bot", desc: "予約・決済・AI返信の状況をLINE通知botでリアルタイムにプッシュ通知。スマホからAI返信の承認・メッセージ送信も可能" },
    ],
  },
  {
    id: "ai",
    label: "AI機能",
    icon: "🤖",
    features: [
      { name: "AI自動返信", desc: "患者の問い合わせをAIが理解し返信文を自動生成。スタッフ確認後に送信で品質を担保（自動返信に切り替えも可）" },
      { name: "AI自動学習", desc: "スタッフの修正・手動返信をAIが自動学習。使うほど返信精度が向上するRAG方式" },
      { name: "音声カルテ自動生成", desc: "診察中の会話を録音→AIがSOAP形式のカルテを自動生成。医療用語も自動抽出" },
      { name: "AIモデル切替", desc: "用途に応じてAIモデルを管理画面から選択。コスト・精度のバランスを自由に調整" },
    ],
  },
  {
    id: "clinic",
    label: "予約・診察",
    icon: "🩺",
    features: [
      { name: "予約カレンダー", desc: "7日×15分刻みのスロット予約。コース選択・複数医師の並列スケジュールに対応" },
      { name: "オンライン問診", desc: "1問ずつのステップ表示で回答率を最大化。条件分岐・NG判定で禁忌チェックも自動化" },
      { name: "カルテ管理", desc: "問診・処方履歴を一画面に集約。テンプレート・処方タイムライン・同時編集ロックに対応" },
      { name: "友だち管理（患者CRM）", desc: "タグ・マーク・カスタムフィールドで患者情報を一元管理。複合検索・CSV出力" },
      { name: "自動リマインド", desc: "予約前日にLINE自動通知。電話リマインド業務をゼロに" },
      { name: "フォローアップ自動配信", desc: "診察後・処方後に最適なタイミングで自動フォローメッセージを配信" },
      { name: "キャンセル待ち", desc: "予約キャンセル発生時、待ちリストの患者へLINEで自動通知。空き枠を逃さない" },
      { name: "患者重複統合", desc: "重複患者を自動検出し、ワンクリックでマージ。データの整合性を維持" },
      { name: "EHR連携", desc: "外部電子カルテとCSV/API連携。患者データの双方向同期・スケジュール実行に対応" },
    ],
  },
  {
    id: "payment",
    label: "決済・配送",
    icon: "💳",
    features: [
      { name: "クレジットカード決済", desc: "Square/GMO対応。申し込みから決済までLINE経由でシームレスに完結" },
      { name: "銀行振込消込", desc: "振込データの照合・消込処理を管理画面で一元管理" },
      { name: "配送管理", desc: "配送CSVワンクリック出力→追跡番号一括登録→患者へLINE自動通知" },
      { name: "在庫管理", desc: "入出庫の自動記録・在庫台帳で推移を可視化。発注判断をサポート" },
      { name: "商品マスタ", desc: "処方薬・施術の価格・カテゴリをまとめて管理。フォルダ階層で大量商品も整理" },

      { name: "ポイント自動付与", desc: "購入金額・初回購入・累計額に応じたポイントルールを設定。リピート促進を自動化" },
    ],
  },
  {
    id: "analytics",
    label: "分析・管理",
    icon: "📊",
    features: [
      { name: "D&Dダッシュボード", desc: "13項目のKPIカードをドラッグ&ドロップで自由に配置。クリニックに最適な画面をカスタマイズ" },
      { name: "売上管理", desc: "日別・月別の売上KPIをリアルタイム表示。LTV分析・コホート分析・商品別ランキング" },
      { name: "流入経路トラッキング", desc: "LINE友だち追加の流入経路をUTM別に計測。日別トレンド・CV分析で広告効果を可視化" },
      { name: "配信分析", desc: "開封率・CTR・予約CV率の追跡。どのCTAが効果的かデータで判断" },
      { name: "NPS調査", desc: "LINEで患者満足度を自動測定。NPSスコア・月別推移・コメントを集約" },
      { name: "ビジネスルール設定", desc: "再処方ルール・通知条件・業務フローをテナント別に柔軟管理" },
    ],
  },
];

/* ─── カテゴリ別 関連コラムリンク ─── */
const categoryColumnLinks: Record<string, { href: string; label: string }> = {
  line: { href: "/lp/column/segment-delivery-repeat", label: "LINEセグメント配信でリピート率を向上させる方法" },
  ai: { href: "/lp/column/ai-auto-reply-guide", label: "AI自動返信導入ガイド" },
  clinic: { href: "/lp/column/reservation-system-comparison", label: "クリニック予約システム比較10選" },
  payment: { href: "/lp/column/dermatology-clinic-line", label: "皮膚科の処方薬配送とフォローアップ自動化" },
  analytics: { href: "/lp/column/clinic-kpi-dashboard", label: "LINEダッシュボードで見るべきKPI7選" },
};

export default function Features() {
  const [activeTab, setActiveTab] = useState("line");
  const active = categories.find((c) => c.id === activeTab)!;

  return (
    <Section id="features" className="bg-slate-50/30">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>クリニック運営に必要な<br className="md:hidden" />すべてを、ひとつに</Title>
        <Sub>LINE公式アカウントの配信・予約・問診・カルテ・決済・配送・AI — 30以上の機能をオールインワンで搭載。</Sub>
      </div>

      {/* ── タブナビゲーション ── */}
      <FadeIn>
        <div className="mx-auto mt-2 flex flex-wrap justify-center gap-2" role="tablist" aria-label="機能カテゴリ">
          {categories.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeTab === cat.id}
              aria-controls={`tabpanel-${cat.id}`}
              id={`tab-${cat.id}`}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all ${
                activeTab === cat.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-blue-200 hover:text-blue-600"
              }`}
            >
              <span className="text-base" aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* ── タブコンテンツ ── */}
      <div
        className="mt-12 min-h-[320px]"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {active.features.map((f, i) => (
                <motion.article
                  key={f.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50"
                >
                  <h3 className="mb-2 text-[15px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{f.name}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-400">{f.desc}</p>
                </motion.article>
              ))}
            </div>
            {/* 関連コラムリンク */}
            {categoryColumnLinks[activeTab] && (
              <div className="mt-6 text-center">
                <Link
                  href={categoryColumnLinks[activeTab].href}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700 transition"
                >
                  詳しくはコラムで: {categoryColumnLinks[activeTab].label}
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 主要機能ハイライト（3つだけMockWindow） ── */}
      <div className="mt-24 space-y-20">

        {/* 1. LINEトーク — 3カラム管理画面 */}
        <FadeIn>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-14">
            <div className="w-full lg:w-[58%]">
              <MockWindow title="LINE管理 — 個別トーク">
                <div className="flex gap-0 divide-x divide-slate-100" style={{ minHeight: 280, minWidth: 520 }}>
                  {/* 友だちリスト */}
                  <div className="w-36 shrink-0 space-y-1 pr-3">
                    <input className="mb-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] placeholder:text-slate-300" placeholder="検索..." readOnly />
                    {[
                      { name: "星野 さくら", msg: "ありがとうございます", mark: "bg-red-400", active: true },
                      { name: "青山 はるか", msg: "了解しました", mark: "bg-blue-400", active: false },
                      { name: "緑川 大輝", msg: "予約したいです", mark: "bg-amber-400", active: false },
                    ].map((f) => (
                      <div key={f.name} className={`rounded-lg px-2 py-1.5 ${f.active ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${f.mark}`} />
                          <span className="text-[10px] font-semibold text-slate-700 truncate">{f.name}</span>
                        </div>
                        <div className="mt-0.5 text-[9px] text-slate-400 truncate">{f.msg}</div>
                      </div>
                    ))}
                  </div>
                  {/* チャット */}
                  <div className="flex flex-1 flex-col px-3">
                    <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="h-6 w-6 rounded-full bg-slate-200" />
                      <span className="text-[11px] font-semibold text-slate-700">星野 さくら</span>
                      <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-500">未対応</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[10px] text-slate-600">再処方の手続きはどうすればいいですか？</div></div>
                      <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#8CE62C] px-3 py-2 text-[10px] text-slate-700">マイページの「再処方申請」からお手続きいただけます。</div></div>
                      <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[10px] text-slate-600">ありがとうございます！</div></div>
                    </div>
                    <div className="mt-2 flex gap-1 border-t border-slate-100 pt-2">
                      <input className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] placeholder:text-slate-300" placeholder="メッセージを入力..." readOnly />
                      <button className="rounded-lg bg-blue-500 px-3 py-1.5 text-[9px] font-bold text-white">送信</button>
                    </div>
                  </div>
                  {/* 患者情報 */}
                  <div className="w-44 shrink-0 pl-3 text-[9px] space-y-2 overflow-y-auto">
                    <div className="font-bold text-slate-400 uppercase tracking-wider text-[8px]">患者情報</div>
                    {[
                      { l: "氏名", v: "星野 さくら" }, { l: "性別", v: "女性" }, { l: "年齢", v: "32歳" }, { l: "TEL", v: "090-****-5678" },
                    ].map((r) => <div key={r.l} className="flex justify-between"><span className="text-slate-400">{r.l}</span><span className="text-slate-600">{r.v}</span></div>)}
                    <div className="font-bold text-slate-400 uppercase tracking-wider text-[8px] pt-1">タグ</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[8px] font-semibold text-pink-700">美容皮膚科</span>
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700">VIP</span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-semibold text-blue-700">リピーター</span>
                    </div>
                    <div className="font-bold text-slate-400 uppercase tracking-wider text-[8px] pt-1">処方履歴</div>
                    <div className="space-y-1">
                      <div className="rounded bg-slate-50 px-1.5 py-1">
                        <div className="flex justify-between"><span className="text-slate-400">6/10</span><span className="text-slate-600">内服薬セットB</span></div>
                        <div className="text-right font-semibold text-slate-700">¥15,400</div>
                      </div>
                      <div className="rounded bg-slate-50 px-1.5 py-1">
                        <div className="flex justify-between"><span className="text-slate-400">5/12</span><span className="text-slate-600">内服薬セットA</span></div>
                        <div className="text-right font-semibold text-slate-700">¥13,200</div>
                      </div>
                    </div>
                    <div className="font-bold text-slate-400 uppercase tracking-wider text-[8px] pt-1">最新決済</div>
                    <div className="flex justify-between"><span className="text-slate-400">方法</span><span className="text-slate-600">クレジット</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">状態</span><span className="font-semibold text-emerald-600">決済済</span></div>
                    <div className="font-bold text-slate-400 uppercase tracking-wider text-[8px] pt-1">配送</div>
                    <div className="flex justify-between"><span className="text-slate-400">状態</span><span className="font-semibold text-blue-600">発送済</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">追跡</span><span className="text-slate-600 truncate">1234-5678</span></div>
                  </div>
                </div>
              </MockWindow>
            </div>
            <div className="w-full lg:w-[42%] lg:pt-4">
              <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">患者との対話を一画面で完結</h4>
              <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">LINEトーク・患者情報・問診内容・処方歴・決済履歴を3カラムで一覧表示。画面を切り替えることなく、必要な情報を確認しながら対応できます。</p>
              <ul className="space-y-2.5">
                {["チャット+患者情報+履歴を一画面に集約", "テンプレート送信・画像送信にも対応", "対応マーク（未対応/対応中/完了）で進捗管理"].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>

        {/* 2. AI自動返信 + 学習 */}
        <FadeIn>
          <div className="flex flex-col gap-8 lg:flex-row-reverse lg:items-start lg:gap-14">
            <div className="w-full lg:w-[58%]">
              <MockWindow title="AI返信 — 返信候補">
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-[10px] font-semibold text-slate-400">患者メッセージ</div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">再処方の手続きはどうすればいいですか？</div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px]">🤖</span>
                      <span className="text-[11px] font-semibold text-blue-700">AI生成返信</span>
                      <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600">生成完了</span>
                    </div>
                    <div className="rounded-md bg-white p-3 text-[11px] leading-relaxed text-slate-600">
                      お問い合わせありがとうございます。再処方のお手続きは、LINEメニューの「マイページ」から「再処方申請」をタップしていただくと、簡単にお手続きいただけます。
                    </div>
                  </div>
                  {/* 学習例バッジ */}
                  <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2">
                    <span className="text-[11px]">🧠</span>
                    <span className="text-[10px] text-violet-700">過去の類似対応 <span className="font-bold">3件</span> を参照して生成</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[11px] font-semibold text-slate-500">修正指示</button>
                    <button className="flex-1 rounded-lg bg-blue-500 py-2.5 text-[11px] font-bold text-white">このまま送信</button>
                  </div>
                </div>
              </MockWindow>
            </div>
            <div className="w-full lg:w-[42%] lg:pt-4">
              <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">AIが対応し、学び、進化する</h4>
              <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">AIがFAQ・処方情報・予約状況を踏まえた返信文を自動生成。スタッフの修正や手動返信をAIが自動学習し、使うほど返信精度が向上します。</p>
              <ul className="space-y-2.5">
                {["スタッフ確認後に送信で品質を担保（自動返信に切り替えも可）", "修正・手動返信をAIが自動学習（RAG方式）", "営業時間外の自動送信モード対応", "音声からSOAPカルテも自動生成"].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>

        {/* 3. すべてがLINEに届く — 自動通知タイムライン */}
        <FadeIn>
          <div className="flex flex-col gap-8 lg:flex-row-reverse lg:items-start lg:gap-14">
            <div className="w-full lg:w-[58%]">
              <MockWindow title="LINE通知 — ステータス自動配信">
                <div className="space-y-2.5">
                  {/* タイムライン形式の通知一覧 */}
                  {[
                    { time: "10:00", icon: "📅", label: "予約確定", msg: "6/15（日）14:00〜 ご予約を承りました。", color: "bg-blue-500" },
                    { time: "前日 18:00", icon: "🔔", label: "リマインド", msg: "明日 14:00〜 のご予約がございます。お忘れなく。", color: "bg-sky-500" },
                    { time: "14:30", icon: "💳", label: "決済完了", msg: "¥13,200 のお支払いが完了しました。", color: "bg-emerald-500" },
                    { time: "翌日 09:00", icon: "📦", label: "発送通知", msg: "処方薬を発送しました。追跡番号: 1234-5678-9012", color: "bg-amber-500" },
                    { time: "翌々日 15:00", icon: "✅", label: "配達完了", msg: "お届けが完了しました。ご不明点はお気軽にどうぞ。", color: "bg-violet-500" },
                  ].map((n, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      {/* タイムライン縦線 */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.color} text-[12px] text-white shadow-sm`}>{n.icon}</div>
                        {i < 4 && <div className="w-px flex-1 bg-slate-200 mt-1" style={{ minHeight: 12 }} />}
                      </div>
                      {/* 通知内容 */}
                      <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold text-slate-700">{n.label}</span>
                          <span className="text-[9px] text-slate-400">{n.time}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-relaxed">{n.msg}</div>
                      </div>
                    </div>
                  ))}
                  {/* 自動通知バッジ */}
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 mt-1">
                    <span className="text-[10px]">⚡</span>
                    <span className="text-[10px] text-green-700">すべてのステータス変化がLINEへ自動通知 — スタッフの手動連絡は不要</span>
                  </div>
                </div>
              </MockWindow>
            </div>
            <div className="w-full lg:w-[42%] lg:pt-4">
              <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">すべてがLINEに届く</h4>
              <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">予約確定・リマインド・決済完了・発送通知・追跡番号…すべてのステータス変化がLINEに自動通知。患者はLINEを見るだけで状況を把握でき、スタッフの手動連絡も不要です。</p>
              <ul className="space-y-2.5">
                {["予約→決済→発送の全フローで通知が自動化", "患者はLINEだけで自分の状況を把握", "電話・メールの確認漏れをゼロに"].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>

        {/* 3.5 スマホでどこからでも管理 — LINE通知bot + モバイル操作 */}
        <FadeIn>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-14">
            <div className="w-full lg:w-[58%]">
              {/* スマホモック */}
              <div className="mx-auto flex justify-center gap-4">
                {/* スマホ1: LINE通知bot */}
                <div className="w-[180px] rounded-[24px] border-2 border-slate-300 bg-slate-900 p-2 shadow-xl">
                  <div className="rounded-[18px] bg-white overflow-hidden">
                    {/* ステータスバー */}
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-1">
                      <span className="text-[8px] text-slate-500">9:41</span>
                      <span className="text-[8px] text-slate-500">LINE</span>
                    </div>
                    {/* チャット画面 */}
                    <div className="px-2 py-2 space-y-1.5" style={{ minHeight: 220 }}>
                      <div className="text-center text-[7px] text-slate-400 mb-2">Lオペ通知bot</div>
                      {[
                        { icon: "📅", text: "新規予約が入りました\n田中 花子 様\n6/15(日) 14:00〜", time: "9:32" },
                        { icon: "🤖", text: "AI返信が生成されました\n「再処方の件について…」\nタップして確認・送信", time: "9:35" },
                        { icon: "💳", text: "決済完了\n星野 さくら 様\n¥15,400 クレジット", time: "9:41" },
                      ].map((m, i) => (
                        <div key={i} className="rounded-lg bg-[#E8F5E9] px-2 py-1.5">
                          <div className="flex items-start gap-1">
                            <span className="text-[10px]">{m.icon}</span>
                            <div className="flex-1 text-[8px] text-slate-700 leading-[1.4] whitespace-pre-line">{m.text}</div>
                          </div>
                          <div className="text-right text-[7px] text-slate-400">{m.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* スマホ2: モバイル管理画面 */}
                <div className="w-[180px] rounded-[24px] border-2 border-slate-300 bg-slate-900 p-2 shadow-xl">
                  <div className="rounded-[18px] bg-white overflow-hidden">
                    <div className="flex items-center justify-between bg-blue-600 px-3 py-1.5">
                      <span className="text-[8px] text-white/80">9:41</span>
                      <span className="text-[8px] font-bold text-white">Lオペ管理</span>
                      <span className="text-[8px] text-white/80">...</span>
                    </div>
                    <div className="px-2 py-2 space-y-1.5" style={{ minHeight: 220 }}>
                      {/* AI返信承認 */}
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[9px]">🤖</span>
                          <span className="text-[8px] font-bold text-blue-700">AI返信候補</span>
                        </div>
                        <div className="rounded bg-white px-1.5 py-1 text-[7px] text-slate-600 leading-[1.4]">再処方のお手続きは、マイページの「再処方申請」から…</div>
                        <div className="mt-1.5 flex gap-1">
                          <button className="flex-1 rounded bg-white border border-slate-200 py-1 text-[7px] text-slate-500">修正</button>
                          <button className="flex-1 rounded bg-blue-500 py-1 text-[7px] font-bold text-white">送信</button>
                        </div>
                      </div>
                      {/* トーク */}
                      <div className="rounded-lg bg-slate-50 p-2">
                        <div className="text-[8px] font-bold text-slate-600 mb-1">星野 さくら</div>
                        <div className="rounded bg-white px-1.5 py-1 text-[7px] text-slate-600">ありがとうございます！</div>
                        <div className="mt-1 flex gap-1">
                          <input className="flex-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[7px]" placeholder="返信..." readOnly />
                          <button className="rounded bg-blue-500 px-2 py-0.5 text-[7px] text-white">送</button>
                        </div>
                      </div>
                      {/* 決済サマリ */}
                      <div className="rounded-lg bg-emerald-50 p-2">
                        <div className="text-[8px] font-bold text-emerald-700 mb-0.5">本日の決済</div>
                        <div className="flex justify-between text-[8px]">
                          <span className="text-slate-500">12件</span>
                          <span className="font-bold text-emerald-600">¥168,400</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-[42%] lg:pt-4">
              <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">スマホでどこからでも管理</h4>
              <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">LINE通知botが予約・決済・AI返信の状況をリアルタイムでプッシュ通知。スマホのブラウザからトーク画面を操作し、AI返信の承認・メッセージ送信・決済状況の確認がどこからでも可能です。</p>
              <ul className="space-y-2.5">
                {[
                  "予約・決済・AI返信をLINE通知botでリアルタイム把握",
                  "スマホからAI返信を確認→ワンタップで承認・送信",
                  "外出先からメッセージ送信・決済情報を確認",
                  "PCがなくても患者対応が止まらない",
                ].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>

        {/* 4. 決済・配送管理 */}
        <FadeIn>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-14">
            <div className="w-full lg:w-[58%]">
              <MockWindow title="決済・配送管理">
                <div className="space-y-3">
                  {/* ステータスサマリー */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "本日の決済", val: "12", unit: "件", bg: "bg-emerald-50", text: "text-emerald-600" },
                      { label: "入金待ち", val: "3", unit: "件", bg: "bg-amber-50", text: "text-amber-600" },
                      { label: "発送待ち", val: "5", unit: "件", bg: "bg-blue-50", text: "text-blue-600" },
                      { label: "配達完了", val: "28", unit: "件", bg: "bg-slate-50", text: "text-slate-600" },
                    ].map((k) => (
                      <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                        <div className="text-[10px] text-slate-400">{k.label}</div>
                        <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                      </div>
                    ))}
                  </div>
                  {/* 注文一覧テーブル */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_80px_70px_60px] gap-0 bg-slate-50 px-3 py-1.5 text-[9px] font-semibold text-slate-400 border-b border-slate-200">
                      <span>患者名</span><span>商品</span><span>金額</span><span>決済</span><span>配送</span>
                    </div>
                    {[
                      { name: "星野 さくら", item: "内服薬セットB", price: "¥15,400", pay: "済", payColor: "text-emerald-600", ship: "発送済", shipColor: "text-blue-600" },
                      { name: "青山 はるか", item: "外用薬セット", price: "¥8,800", pay: "済", payColor: "text-emerald-600", ship: "準備中", shipColor: "text-amber-600" },
                      { name: "緑川 大輝", item: "内服薬セットA", price: "¥13,200", pay: "未", payColor: "text-red-500", ship: "—", shipColor: "text-slate-300" },
                      { name: "白石 美咲", item: "内服薬セットC", price: "¥18,700", pay: "済", payColor: "text-emerald-600", ship: "配達完了", shipColor: "text-slate-500" },
                    ].map((r) => (
                      <div key={r.name} className="grid grid-cols-[1fr_1fr_80px_70px_60px] gap-0 px-3 py-2 text-[10px] border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <span className="font-semibold text-slate-700">{r.name}</span>
                        <span className="text-slate-500">{r.item}</span>
                        <span className="font-semibold text-slate-700">{r.price}</span>
                        <span className={`font-semibold ${r.payColor}`}>{r.pay}</span>
                        <span className={`font-semibold ${r.shipColor}`}>{r.ship}</span>
                      </div>
                    ))}
                  </div>
                  {/* アクションバー */}
                  <div className="flex gap-2">
                    <button className="flex-1 rounded-lg border border-slate-200 py-2 text-[10px] font-semibold text-slate-500">配送CSV出力</button>
                    <button className="flex-1 rounded-lg border border-slate-200 py-2 text-[10px] font-semibold text-slate-500">追跡番号一括登録</button>
                  </div>
                </div>
              </MockWindow>
            </div>
            <div className="w-full lg:w-[42%] lg:pt-4">
              <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">決済から配送まで一気通貫</h4>
              <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">GMO決済・銀行振込の消込から配送CSV出力・追跡番号の一括登録まで、管理画面で完結。決済状況・配送ステータスを一覧で把握できます。</p>
              <ul className="space-y-2.5">
                {["LINE上で申込→決済までシームレスに完結", "配送CSVワンクリック出力＋追跡番号一括登録", "在庫管理・入出庫台帳で発注判断もサポート"].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>

        {/* 5. ダッシュボード + 売上管理 */}
        <FadeIn>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-14">
            <div className="w-full lg:w-[58%]">
              <MockWindow title="ダッシュボード — 月次レポート">
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "本日の予約", val: "24", unit: "件", bg: "bg-blue-50", text: "text-blue-600" },
                      { label: "LINE友だち", val: "1,847", unit: "人", bg: "bg-sky-50", text: "text-sky-600" },
                      { label: "月間売上", val: "3.2", unit: "M", bg: "bg-amber-50", text: "text-amber-600" },
                      { label: "リピート率", val: "68", unit: "%", bg: "bg-violet-50", text: "text-violet-600" },
                    ].map((k) => (
                      <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                        <div className="text-[10px] text-slate-400">{k.label}</div>
                        <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="mb-2 text-[10px] font-semibold text-slate-500">月間売上推移</div>
                      <div className="flex items-end gap-0.5" style={{ height: 60 }}>
                        {[40, 55, 45, 60, 50, 65, 72, 58, 68, 75, 62, 80].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="mb-2 text-[10px] font-semibold text-slate-500">商品別売上</div>
                      {[
                        { name: "処方薬A", pct: 38 },
                        { name: "処方薬B", pct: 31 },
                        { name: "処方薬C", pct: 20 },
                      ].map((p) => (
                        <div key={p.name} className="mt-1.5 flex items-center gap-2">
                          <span className="w-14 text-[9px] text-slate-500">{p.name}</span>
                          <div className="flex-1 rounded-full bg-slate-200/50" style={{ height: 6 }}><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-sky-400" style={{ width: `${p.pct * 2.5}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <span className="text-[10px]">🖱️</span>
                    <span className="text-[10px] text-blue-700">KPIカードはドラッグ&ドロップで自由に並び替え可能</span>
                  </div>
                </div>
              </MockWindow>
            </div>
            <div className="w-full lg:w-[42%] lg:pt-4">
              <h4 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">経営データをリアルタイムで可視化</h4>
              <p className="mb-5 text-[14px] leading-[1.9] text-slate-500">予約数・売上・リピート率・配信成績など、13項目のKPIをドラッグ&ドロップで自由にカスタマイズ。LTV分析・コホート分析・商品別ランキングまで多角的に分析できます。</p>
              <ul className="space-y-2.5">
                {["D&DでKPIカードを自由に配置", "LTV・コホート・商品別の多角分析", "CSV出力・配信成績の追跡にも対応"].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600">&#10003;</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>

      </div>

      {/* ── 全機能数バッジ ── */}
      <FadeIn className="mt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-6 py-2.5 text-[14px] font-semibold text-blue-700">
          <span className="text-xl">⚡</span>
          他にも30以上の機能を搭載 — 全プランで全機能利用可能
        </span>
      </FadeIn>
    </Section>
  );
}
