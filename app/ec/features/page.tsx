import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for EC 機能一覧 | EC向けLINE運用に必要な全機能",
  description:
    "Lオペ for ECの全機能を一覧で紹介。カゴ落ち対策・発送管理・顧客CRM・セグメント配信・クーポン管理・分析ダッシュボードなど、EC向けLINE運用に必要な機能をオールインワンで提供。",
  keywords: "Lオペ for EC 機能一覧, EC LINE機能, カゴ落ち対策, 発送通知, EC CRM, セグメント配信, クーポン管理, 購買分析",
  alternates: { canonical: `${SITE_URL}/ec/features` },
  openGraph: {
    title: "Lオペ for EC 機能一覧 | EC向けLINE運用に必要な全機能",
    description: "カゴ落ち対策・発送管理・CRM・配信・クーポン・分析まで、全機能をオールインワンで提供。",
    url: `${SITE_URL}/ec/features`,
    siteName: "Lオペ for EC",
    locale: "ja_JP",
    type: "website",
  },
};

/* 機能カテゴリ */
const featureCategories = [
  {
    category: "カゴ落ち対策・売上回復",
    accent: "#b45309",
    description: "カートに商品を残した顧客へのリマインド配信で、逃した売上を回収します。",
    features: [
      { name: "カゴ落ちリマインド", desc: "カート放棄後の最適なタイミングでLINE通知を自動送信。商品画像・価格付きのリッチメッセージで購入を促進。" },
      { name: "段階的リマインド", desc: "1時間後・24時間後・3日後など複数段階のリマインドシナリオを設定。クーポン付きの最終リマインドで回収率を最大化。" },
      { name: "カゴ落ち分析", desc: "離脱タイミング・商品カテゴリ・顧客セグメント別のカゴ落ち傾向を可視化。改善ポイントをデータで特定。" },
    ],
  },
  {
    category: "発送管理・配送通知",
    accent: "#78716c",
    description: "注文確認から配達完了まで、配送の各ステータスをLINEで自動通知します。",
    features: [
      { name: "注文確認通知", desc: "決済完了と同時にLINEで注文確認メッセージを自動送信。商品名・金額・配送予定日を通知。" },
      { name: "発送完了通知", desc: "出荷処理と連動して発送完了をLINE通知。追跡番号・配送会社のリンクを自動挿入。" },
      { name: "配達完了通知", desc: "配達完了後にレビュー依頼や関連商品のレコメンドを自動配信。" },
      { name: "配送状況照会", desc: "LINEのトーク画面から配送状況を確認できるボット機能。問い合わせ件数を削減。" },
    ],
  },
  {
    category: "顧客CRM・セグメント",
    accent: "#57534e",
    description: "購買データに基づく精密な顧客管理で、最適なアプローチを実現します。",
    features: [
      { name: "購買履歴管理", desc: "注文履歴・購入金額・購入頻度・最終購入日をLINE友だちと自動紐付けで管理。" },
      { name: "RFM分析", desc: "最新購入日（Recency）・購入頻度（Frequency）・購入金額（Monetary）でスコアリング。優良顧客・休眠顧客を自動識別。" },
      { name: "自動タグ付け", desc: "購入商品カテゴリ・金額帯・購入回数に応じたタグを自動付与。手動のセグメント管理が不要に。" },
      { name: "顧客ランク管理", desc: "購買金額・頻度に応じたランク制度を構築。ランクアップ通知でロイヤルティを醸成。" },
    ],
  },
  {
    category: "配信・メッセージング",
    accent: "#7c3aed",
    description: "ECデータを活用した精密な配信で、開封率・CV率を最大化します。",
    features: [
      { name: "セグメント配信", desc: "購買金額・商品カテゴリ・購入頻度・最終購入日などEC特有の条件で配信対象を絞り込み。" },
      { name: "シナリオ配信", desc: "購入後のサンクス配信・レビュー依頼・再購入リマインドなど、購買サイクルに最適化した自動配信。" },
      { name: "A/Bテスト", desc: "メッセージの複数バリアントを自動分割配信し、開封率・CV率を比較検証。" },
      { name: "リッチメニュー管理", desc: "顧客ランクや購買状況に応じたリッチメニューの出し分け。注文履歴・配送状況への導線を最適化。" },
    ],
  },
  {
    category: "クーポン・ポイント",
    accent: "#059669",
    description: "クーポン・ポイント施策でリピート購入を効率的に促進します。",
    features: [
      { name: "クーポン自動発行", desc: "誕生日・初回購入・ランクアップ・休眠復帰など、シナリオに応じたクーポンを自動発行。" },
      { name: "利用率トラッキング", desc: "クーポンごとの発行数・利用数・利用率・売上貢献額をリアルタイムで計測。" },
      { name: "ポイント管理", desc: "購入金額に応じたポイント付与・失効管理。ポイント残高通知でリピート購入を促進。" },
    ],
  },
  {
    category: "分析・レポート",
    accent: "#0ea5e9",
    description: "LINE経由の売上貢献をリアルタイムで可視化。データドリブンなEC運営を支援します。",
    features: [
      { name: "売上分析", desc: "LINE経由の売上・注文数・客単価・リピート率をリアルタイムで計測。施策ごとのROIを可視化。" },
      { name: "配信効果分析", desc: "開封率・クリック率・CV率・売上貢献額をセグメント別に詳細分析。" },
      { name: "カゴ落ち回収レポート", desc: "カゴ落ちリマインドの送信数・回収数・回収金額を自動集計。" },
      { name: "月次レポート", desc: "主要KPIをまとめた月次レポートを自動生成。前月比較・施策効果の振り返りに活用。" },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      {/* ヘッダー */}
      <header className="border-b border-stone-100/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
          <Link href="/ec" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Lオペ for EC" width={36} height={36} className="rounded-lg object-contain" />
            <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-[11px] font-semibold text-stone-500">for EC</span></span>
          </Link>
        </div>
      </header>

      {/* パンくず */}
      <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-6 pb-0">
        <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
          <li><Link href="/ec" className="hover:text-amber-700 transition">Lオペ for EC</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-600 font-medium">機能一覧</li>
        </ol>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        {/* ヒーロー */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">機能一覧</h1>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-500">
            EC向けLINE運用に必要な機能をオールインワンで提供。カゴ落ち対策から発送管理、CRM、分析まで。
          </p>
        </div>

        {/* 機能カテゴリ */}
        <div className="space-y-16">
          {featureCategories.map((cat) => (
            <section key={cat.category}>
              <div className="mb-8">
                <h2 className="mb-2 text-xl font-extrabold text-slate-900" style={{ borderLeft: `4px solid ${cat.accent}`, paddingLeft: 12 }}>
                  {cat.category}
                </h2>
                <p className="pl-5 text-[13px] leading-relaxed text-slate-400">{cat.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cat.features.map((f) => (
                  <div key={f.name} className="rounded-xl border border-stone-100 bg-white p-5 transition hover:border-amber-200 hover:shadow-sm">
                    <h3 className="mb-1.5 text-[14px] font-bold text-slate-800">{f.name}</h3>
                    <p className="text-[12px] leading-relaxed text-slate-400">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <p className="mb-4 text-[14px] text-slate-500">気になる機能がありましたら、お気軽にお問い合わせください。</p>
          <Link href="/ec/contact" className="inline-block rounded-xl bg-gradient-to-r from-stone-700 to-amber-700 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-stone-500/20 transition hover:shadow-xl">
            お問い合わせ・無料トライアル
          </Link>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-16 border-t border-stone-100 bg-stone-50 px-5 py-8 text-center text-[11px] text-slate-400">
        <p>運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">株式会社ORDIX</a></p>
        <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
      </footer>
    </div>
  );
}
