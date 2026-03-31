import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for SALON 機能一覧 | サロンのLINE運用に必要な全機能",
  description:
    "Lオペ for SALONの全機能を一覧で紹介。予約管理・ホットペッパー連携・顧客管理・来店履歴・セグメント配信・リッチメニュー・スタンプカード・物販・発送管理など、サロン運営に必要な機能をオールインワンで提供。",
  keywords: "Lオペ for SALON 機能一覧, サロン LINE機能, 予約管理, ホットペッパー連携, 顧客管理, スタンプカード, 物販, セグメント配信, リッチメニュー",
  alternates: { canonical: `${SITE_URL}/salon/features` },
  openGraph: {
    title: "Lオペ for SALON 機能一覧 | サロンのLINE運用に必要な全機能",
    description: "予約管理・顧客管理・配信・スタンプカード・物販まで、全機能をオールインワンで提供。",
    url: `${SITE_URL}/salon/features`,
    siteName: "Lオペ for SALON",
    locale: "ja_JP",
    type: "website",
  },
};

/* 機能カテゴリ */
const featureCategories = [
  {
    category: "予約管理",
    accent: "#ec4899",
    description: "LINE上で予約の受付・変更・キャンセルが完結。ホットペッパー連携（予定）で予約を一元管理。",
    features: [
      { name: "LINE予約受付", desc: "LINEのトーク画面から日時・メニュー・スタッフを選択して予約。お客様はアプリ切り替え不要で予約完了。" },
      { name: "ホットペッパー連携（予定）", desc: "ホットペッパービューティーの予約をLINE管理画面に自動同期。ダブルブッキングを防止。" },
      { name: "予約リマインド", desc: "予約日前に自動でLINEリマインドを送信。無断キャンセルの削減と来店率の向上を実現。" },
      { name: "スタッフシフト管理", desc: "スタッフごとの出勤スケジュールを設定。予約可能枠を自動で管理し、適切な予約配分を実現。" },
    ],
  },
  {
    category: "顧客管理・CRM",
    accent: "#8b5cf6",
    description: "お客様の来店履歴・施術内容・好みを一元管理。パーソナルな接客とリピート促進の基盤を構築。",
    features: [
      { name: "顧客プロフィール", desc: "氏名・生年月日・連絡先・来店回数・施術履歴を一元管理。次回来店時に最適な提案が可能。" },
      { name: "来店履歴", desc: "いつ・どのメニューを・誰が担当したかを自動記録。カルテのように施術履歴を管理。" },
      { name: "タグ・セグメント管理", desc: "メニュー・来店頻度・担当スタッフなどでお客様を自動分類。セグメント配信の基盤に。" },
      { name: "メモ・施術メモ", desc: "お客様ごとにスタッフ間で共有できるメモ機能。好みや注意事項を引き継ぎ。" },
    ],
  },
  {
    category: "配信・メッセージング",
    accent: "#f59e0b",
    description: "来店回数・メニュー・最終来店日でセグメントし、一人ひとりに最適なメッセージを届けます。",
    features: [
      { name: "セグメント配信", desc: "来店回数・メニュー・担当スタッフ・最終来店日などで配信対象を精密に絞り込み。" },
      { name: "シナリオ配信", desc: "来店後フォロー・誕生日クーポン・リマインドなど、関係構築シナリオを自動配信。" },
      { name: "休眠顧客掘り起こし", desc: "一定期間来店がないお客様に自動でアプローチ。クーポン付きメッセージで再来店を促進。" },
      { name: "リッチメッセージ", desc: "画像付きのリッチなメッセージで新メニュー・キャンペーン情報を視覚的に訴求。" },
    ],
  },
  {
    category: "リッチメニュー・UI",
    accent: "#0ea5e9",
    description: "LINEトーク画面のリッチメニューをノーコードで構築。予約・クーポン・スタンプカードへの導線を常時表示。",
    features: [
      { name: "リッチメニュービルダー", desc: "ドラッグ操作でリッチメニューのボタン配置を自由に設計。サロンのブランドイメージに合わせたカスタマイズが可能。" },
      { name: "メニュー出し分け", desc: "新規客と常連客でリッチメニューを切り替え。顧客属性に応じた最適な導線を提供。" },
      { name: "テンプレート", desc: "美容室・ネイル・エステなど業態別のリッチメニューテンプレートを用意。すぐに運用開始可能。" },
    ],
  },
  {
    category: "スタンプカード・ポイント",
    accent: "#10b981",
    description: "紙のポイントカードをLINEでデジタル化。来店動機の創出とリピート率の向上を実現。",
    features: [
      { name: "デジタルスタンプカード", desc: "来店ごとに自動でスタンプを付与。紛失の心配なし、お財布もスッキリ。" },
      { name: "特典・クーポン連携", desc: "スタンプ完了時に自動でクーポン・特典を配信。お客様の来店動機を創出。" },
      { name: "ランク制度", desc: "来店回数や累計金額に応じたランク付け。VIP顧客への特別待遇でロイヤルティを向上。" },
    ],
  },
  {
    category: "物販・EC・発送管理",
    accent: "#e11d48",
    description: "サロン専売品やホームケア商品をLINE上で販売。在庫管理から発送まで一元化。",
    features: [
      { name: "LINE物販", desc: "サロン専売品・ホームケア商品・ギフト券をLINEのトーク内で販売。決済まで完結。" },
      { name: "在庫管理", desc: "商品ごとの在庫数をリアルタイムで管理。在庫切れの自動通知にも対応。" },
      { name: "発送管理", desc: "注文の発送ステータスを管理。発送完了の自動通知でお客様への連絡も自動化。" },
      { name: "クロスセル促進", desc: "施術後のタイミングで関連商品をLINEでおすすめ。客単価アップに貢献。" },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      {/* ヘッダー */}
      <header className="border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
          <Link href="/salon" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Lオペ for SALON" width={36} height={36} className="rounded-lg object-contain" />
            <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-pink-500">for SALON</span></span>
          </Link>
        </div>
      </header>

      {/* パンくず */}
      <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-6 pb-0">
        <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
          <li><Link href="/salon" className="hover:text-pink-600 transition">Lオペ for SALON</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-600 font-medium">機能一覧</li>
        </ol>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        {/* ヒーロー */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">機能一覧</h1>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-500">
            サロン運営に必要なLINE機能をオールインワンで提供。複数ツールの使い分けは不要です。
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
                  <div key={f.name} className="rounded-xl border border-slate-100 bg-white p-5 transition hover:border-pink-200 hover:shadow-sm">
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
          <Link href="/salon/contact" className="inline-block rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-pink-500/20 transition hover:shadow-xl">
            お問い合わせ・無料で相談する
          </Link>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-16 border-t border-slate-100 bg-slate-50 px-5 py-8 text-center text-[11px] text-slate-400">
        <p>運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">株式会社ORDIX</a></p>
        <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
      </footer>
    </div>
  );
}
