import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "機能一覧 | Lオペ for CLINIC — LINE公式アカウント クリニック運用",
  description:
    "Lオペ for CLINICの全機能を一覧で紹介。患者CRM・セグメント配信・リッチメニュー・オンライン問診・予約管理・AI自動返信・決済管理・配送管理など、LINE公式アカウントでクリニック業務をDX化する機能をすべて解説。",
  alternates: { canonical: `${SITE_URL}/lp/features` },
  openGraph: {
    title: "機能一覧 | Lオペ for CLINIC",
    description: "LINE公式アカウントでクリニック業務をDX化。Lオペ for CLINICの全機能を紹介。",
    url: `${SITE_URL}/lp/features`,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
  },
};

const featureCategories = [
  {
    category: "LINE運用",
    features: [
      { name: "LINEトーク・患者CRM", desc: "友だち追加から問診・予約・フォローアップまで、患者とのすべてのコミュニケーションをLINE上で一元管理。タグ・対応マーク・メモで患者情報を整理。", keywords: "患者CRM, クリニック LINE管理" },
      { name: "セグメント配信", desc: "来院履歴・タグ・年齢・性別などの条件で患者をセグメント分け。対象者にだけ最適なメッセージを一括配信。再診促進やキャンペーン告知に。", keywords: "LINE セグメント配信, クリニック LINE配信" },
      { name: "リッチメニュービルダー", desc: "ドラッグ&ドロップでリッチメニューを構築。患者の状態に応じてメニューを自動切替。予約・問診・マイページへの導線を最適化。", keywords: "リッチメニュー, クリニック LINE メニュー" },
      { name: "AI自動返信", desc: "AIが患者からのLINEメッセージに自動返信。スタッフの修正内容を学習し、回答精度が向上。営業時間外の問い合わせ対応を自動化。", keywords: "AI自動返信, クリニック チャットボット" },
      { name: "自動アクション", desc: "友だち追加・予約確定・決済完了などのイベントをトリガーに、メッセージ送信・タグ付与・リッチメニュー切替を自動実行。", keywords: "LINE 自動化, クリニック 業務自動化" },
    ],
  },
  {
    category: "業務管理",
    features: [
      { name: "予約管理", desc: "LINE上で予約の受付・変更・キャンセルを完結。カレンダー表示で空き状況を一目で把握。前日自動リマインドで無断キャンセルを防止。", keywords: "クリニック 予約管理, LINE 予約システム" },
      { name: "オンライン問診", desc: "友だち追加後にLINEで問診フォームを自動送信。来院前に問診完了し、待ち時間を短縮。回答内容は管理画面にリアルタイム反映。", keywords: "オンライン問診, クリニック 問診票 電子化" },
      { name: "カルテ管理", desc: "診察内容をSOAP形式で記録。音声カルテオプションで、診察中の会話からカルテを自動生成。来院履歴・処方履歴を一覧で管理。", keywords: "電子カルテ, クリニック カルテ管理" },
      { name: "決済管理", desc: "Square・GMO等の決済サービスと連携。LINE上でオンライン決済を完結。決済完了時にLINEで自動通知。売上データを自動集計。", keywords: "クリニック 決済, オンライン決済 医療" },
      { name: "配送管理", desc: "処方薬・サプリメントの発送をワンクリックで管理。配送CSV出力・追跡番号一括登録・患者へのLINE自動通知まで一気通貫。", keywords: "クリニック 配送管理, 処方薬 発送" },
    ],
  },
  {
    category: "分析・レポート",
    features: [
      { name: "ダッシュボード", desc: "予約数・売上・LINE友だち数・リピート率などのKPIをリアルタイムで一覧表示。経営判断に必要なデータを1画面に集約。", keywords: "クリニック ダッシュボード, 経営分析" },
      { name: "売上分析・LTV分析", desc: "患者ごとのLTV（顧客生涯価値）を自動算出。売上推移・診療科別分析・月次レポートをCSV出力。", keywords: "クリニック 売上分析, 患者LTV" },
      { name: "配信分析", desc: "LINE配信の開封率・クリック率・予約転換率を可視化。どのメッセージが効果的かをデータで把握し、配信戦略を最適化。", keywords: "LINE配信 分析, メッセージ 効果測定" },
    ],
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Lオペ for CLINIC 機能一覧",
  description: "LINE公式アカウントでクリニック業務をDX化するLオペ for CLINICの全機能",
  numberOfItems: featureCategories.reduce((sum, c) => sum + c.features.length, 0),
  itemListElement: featureCategories.flatMap((cat, ci) =>
    cat.features.map((f, fi) => ({
      "@type": "ListItem",
      position: ci * 10 + fi + 1,
      name: f.name,
      description: f.desc,
    }))
  ),
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* パンくず */}
      <nav aria-label="パンくずリスト" className="mx-auto max-w-5xl px-5 pt-20 pb-0">
        <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
          <li><a href="https://l-ope.jp" className="hover:text-blue-600 transition">ホーム</a></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/lp" className="hover:text-blue-600 transition">Lオペ for CLINIC</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-600 font-medium">機能一覧</li>
        </ol>
      </nav>

      <main className="mx-auto max-w-5xl px-5 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Lオペ for CLINIC の<span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">全機能</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-500">
          LINE公式アカウントを起点に、クリニック運営に必要なすべての機能をオールインワンで提供。Lステップ等の汎用ツールにはない、医療特化の機能群です。
        </p>

        {featureCategories.map((cat) => (
          <section key={cat.category} className="mt-16">
            <h2 className="mb-8 text-2xl font-bold text-slate-800">{cat.category}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cat.features.map((f) => (
                <article key={f.name} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <h3 className="text-lg font-bold text-slate-800">{f.name}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{f.desc}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* LP本体への内部リンク */}
        <section className="mt-20 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-10 text-center text-white">
          <h2 className="text-2xl font-extrabold">これらの機能をすべて体験しませんか？</h2>
          <p className="mt-3 text-[14px] text-blue-100">貴院の課題に合わせたデモのご案内も可能です。</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <a href="/lp/contact" className="rounded-xl bg-white px-8 py-3.5 text-[13px] font-bold text-blue-600 shadow-lg transition hover:shadow-xl">無料で資料請求</a>
            <Link href="/lp#features" className="rounded-xl border border-white/40 px-8 py-3.5 text-[13px] font-bold text-white transition hover:bg-white/10">LP で詳しく見る</Link>
          </div>
        </section>
      </main>

      {/* フッターリンク */}
      <footer className="border-t border-slate-100 py-8 text-center text-[12px] text-slate-400">
        <Link href="/lp" className="hover:text-blue-600">← Lオペ for CLINIC トップに戻る</Link>
      </footer>
    </div>
  );
}
