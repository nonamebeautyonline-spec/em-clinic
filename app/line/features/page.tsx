import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ 機能一覧 | LINE運用に必要な全機能をオールインワン",
  description:
    "Lオペの全機能を一覧で紹介。セグメント配信・シナリオ配信・リッチメニュー管理・予約管理・フォーム作成・分析ダッシュボード・チャットボット・A/Bテスト・API連携など、LINE公式アカウント運用に必要な機能をオールインワンで提供。",
  keywords: "Lオペ 機能一覧, LINE配信ツール 機能, セグメント配信, シナリオ配信, リッチメニュー ビルダー, 予約管理 LINE, フォーム作成, 分析ダッシュボード, チャットボット, A/Bテスト, API連携",
  alternates: { canonical: `${SITE_URL}/line/features` },
  openGraph: {
    title: "Lオペ 機能一覧 | LINE運用に必要な全機能をオールインワン",
    description: "セグメント配信・シナリオ配信・リッチメニュー・予約・フォーム・分析まで、全機能をオールインワンで提供。",
    url: `${SITE_URL}/line/features`,
    siteName: "Lオペ",
    locale: "ja_JP",
    type: "website",
  },
};

/* 機能カテゴリ */
const featureCategories = [
  {
    category: "メッセージ配信",
    accent: "#2563eb",
    description: "セグメント配信・シナリオ配信・A/Bテストなど、最適なメッセージを最適なタイミングで届けます。",
    features: [
      { name: "セグメント配信", desc: "タグ・属性・行動履歴で配信対象を精密に絞り込み。AND/OR条件・除外条件で高度なターゲティングが可能。" },
      { name: "シナリオ配信", desc: "友だち追加後のステップ配信やイベントトリガーに応じた自動メッセージで、顧客との関係構築を自動化。" },
      { name: "テンプレート管理", desc: "よく使うメッセージをテンプレート化してカテゴリ別に整理。変数の自動挿入でパーソナライズされたメッセージを瞬時に送信。" },
      { name: "A/Bテスト", desc: "メッセージの複数バリアントを自動分割配信し、開封率・CV率を比較検証。" },
      { name: "キーワード自動返信", desc: "ユーザーが送信したキーワードに応じて自動返信。部分一致・完全一致・正規表現に対応。" },
      { name: "リマインド配信", desc: "予約日前に自動でLINEリマインドを送信。無断キャンセルの削減と来店率の向上を実現。" },
    ],
  },
  {
    category: "ノーコード構築",
    accent: "#7c3aed",
    description: "リッチメニュー・フォーム・チャットボットをGUI操作で構築。エンジニア不要で現場スタッフが運用可能。",
    features: [
      { name: "リッチメニュービルダー", desc: "ドラッグ操作でリッチメニューのボタン配置を自由に設計。属性に応じたメニュー出し分けにも対応。" },
      { name: "フォームビルダー", desc: "アンケート・申し込み・問い合わせフォームをノーコードで作成。回答データはCRMに自動連携。" },
      { name: "チャットボット", desc: "選択肢ベースの会話フローをGUIで構築。よくある質問への自動対応で工数を削減。" },
      { name: "Flexメッセージ", desc: "カルーセル・ボタン・画像を組み合わせたリッチなメッセージをノーコードで作成。" },
    ],
  },
  {
    category: "CRM・顧客管理",
    accent: "#059669",
    description: "LINE友だちを顧客として一元管理。タグ・属性で情報を整理し、セグメント配信の基盤を構築。",
    features: [
      { name: "顧客管理", desc: "友だちの属性情報・行動履歴・タグを一元管理。管理画面から1対1チャットも可能。" },
      { name: "タグ管理", desc: "カラー付きタグで顧客を自由に分類。友だち追加時の自動タグ付けにも対応。" },
      { name: "カスタムフィールド", desc: "顧客ごとに自由な情報フィールドを定義。業種独自の管理項目をCRMに統合。" },
      { name: "対応ステータス管理", desc: "「未対応」「対応中」「完了」など、顧客ごとの対応状況を可視化。引き継ぎ漏れを防止。" },
    ],
  },
  {
    category: "予約・フォーム",
    accent: "#d97706",
    description: "LINE上で予約の受付・変更・キャンセルが完結。フォームで情報収集も効率化。",
    features: [
      { name: "予約管理", desc: "LINE上で予約の受付・変更・キャンセルが完結。リマインド自動配信で無断キャンセルを防止。" },
      { name: "カレンダー連携", desc: "Google Calendarとの双方向同期で、予約状況をリアルタイムに反映。" },
      { name: "アンケートフォーム", desc: "満足度調査・申し込み・問い合わせなど、用途に合わせたフォームを作成。回答はCRMに自動連携。" },
    ],
  },
  {
    category: "分析・レポート",
    accent: "#0ea5e9",
    description: "配信効果をリアルタイムで可視化。データドリブンで配信戦略を最適化。",
    features: [
      { name: "配信分析", desc: "開封率・クリック率・CV率をリアルタイムで可視化。配信ごとの効果を詳細に分析。" },
      { name: "友だち分析", desc: "友だち数の推移・流入経路・属性分布をダッシュボードで確認。" },
      { name: "セグメント分析", desc: "セグメントごとの配信効果を比較。ターゲティングの精度を継続的に改善。" },
      { name: "CSVエクスポート", desc: "全データをCSV形式でエクスポート可能。外部ツールとの連携や社内レポートに活用。" },
    ],
  },
  {
    category: "管理・セキュリティ",
    accent: "#64748b",
    description: "チーム運用に必要な権限管理・セキュリティ機能を標準搭載。",
    features: [
      { name: "スタッフ権限管理", desc: "管理者・編集者・閲覧者など、役割に応じたアクセス権限を設定。" },
      { name: "監査ログ", desc: "管理画面上の操作をすべて記録。いつ・誰が・何をしたかを追跡可能。" },
      { name: "API連携", desc: "外部システムとのデータ連携に対応。Webhook・REST APIで柔軟に統合。" },
      { name: "SSLと暗号化", desc: "全通信をSSL暗号化。顧客データは暗号化保存で安全に管理。" },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      {/* ヘッダー */}
      <header className="border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
          <Link href="/line" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Lオペ" width={36} height={36} className="rounded-lg object-contain" />
            <span className="text-[15px] font-bold tracking-tight">Lオペ</span>
          </Link>
        </div>
      </header>

      {/* パンくず */}
      <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-6 pb-0">
        <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
          <li><Link href="/line" className="hover:text-emerald-600 transition">Lオペ</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-600 font-medium">機能一覧</li>
        </ol>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        {/* ヒーロー */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">機能一覧</h1>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-500">
            LINE公式アカウント運用に必要な機能をオールインワンで提供。複数ツールの使い分けは不要です。
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
                  <div key={f.name} className="rounded-xl border border-slate-100 bg-white p-5 transition hover:border-emerald-200 hover:shadow-sm">
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
          <Link href="/line/contact" className="inline-block rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-500 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl">
            お問い合わせ・無料で始める
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
