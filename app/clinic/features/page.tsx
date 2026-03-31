import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ 機能一覧 | 45の医療特化機能をオールインワン",
  description:
    "Lオペの全40機能以上を一覧で紹介。Lオペなら患者CRM・セグメント配信・リッチメニュー・オンライン問診・予約管理・業務時間管理・Google Calendar連携・AI自動返信・音声カルテ・決済管理・配送管理・在庫管理・NPS調査・フロービルダー・マルチ診療分野・スタッフ権限管理など、LINE公式アカウントでクリニック業務をDX化する全機能をオールインワンで提供。",
  keywords: "Lオペ, Lオペ 機能一覧, Lオペ for CLINIC, クリニック LINE 機能, 患者CRM, セグメント配信, リッチメニュー ビルダー, AI自動返信 クリニック, 音声カルテ AI, 予約管理 LINE, オンライン問診, 電子カルテ連携, 配送管理 クリニック, 在庫管理, NPS調査, フロービルダー, チャットボット ビルダー, A/Bテスト LINE, クーポン管理, ダッシュボード 経営, 売上分析 LTV, ステップシナリオ, Flex Message, 業務時間管理, Google Calendar連携, マルチ診療分野, スタッフ権限管理, 問診フォーム複数",
  alternates: { canonical: `${SITE_URL}/clinic/features` },
  openGraph: {
    title: "Lオペ 機能一覧 | 45の医療特化機能をオールインワン",
    description:
      "Lオペなら患者CRM・AI・予約・決済・配送・分析まで、40以上の機能をオールインワンで提供。LINE公式アカウントでクリニック業務をDX化。",
    url: `${SITE_URL}/clinic/features`,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
  },
};

/* ────────────────────────────────────────── */
/*  機能データ（9カテゴリ）                    */
/* ────────────────────────────────────────── */

const featureCategories = [
  {
    category: "患者CRM",
    accent: "#2563eb",
    description: "LINE友だちを「患者」として一元管理。タグ・マーク・カスタムフィールドで診療に必要な情報を整理し、セグメント配信の基盤を構築。",
    features: [
      { name: "LINEトーク管理", desc: "患者との1対1チャットを管理画面で一元管理。問診・処方歴・タグ情報を確認しながらリアルタイムで対応。" },
      { name: "タグ管理", desc: "10色のカラー付きタグで患者を自由に分類。「初診」「美容」「ダイエット」など、属性ごとにセグメント配信の基盤を構築。友だち追加時の自動タグ付けにも対応。" },
      { name: "対応マーク", desc: "「未対応」「対応中」「完了」「重要」「保留」など、患者ごとの対応状況を色付きマークで可視化。スタッフ間の引き継ぎ漏れを防止。" },
      { name: "カスタムフィールド", desc: "患者ごとに自由な情報フィールドを定義・蓄積。「前回処方薬」「アレルギー」「希望メニュー」など、クリニック独自の管理項目をLINE CRMに統合。" },
      { name: "患者重複排除・統合", desc: "重複患者を自動検出し、ワンクリックでマージ処理を実行。名前・電話番号・LINE IDの類似度スコアリングでデータの整合性を維持。" },
    ],
  },
  {
    category: "メッセージ配信",
    accent: "#059669",
    description: "セグメント配信・ステップシナリオ・A/Bテストなど、患者一人ひとりに最適なメッセージを最適なタイミングで届けます。",
    features: [
      { name: "セグメント配信", desc: "タグ・マーク・友だち情報の組み合わせで配信対象を精密に絞り込み。AND/OR条件・除外条件で高度なターゲティングが可能。" },
      { name: "ステップシナリオ", desc: "友だち追加→問診→予約→フォローアップまでの一連の流れを自動化。7種類のトリガーに応じた段階配信で患者との関係構築を自動化。" },
      { name: "テンプレート管理", desc: "よく使うメッセージをテンプレート化してカテゴリ別に整理。変数の自動挿入で、パーソナライズされたメッセージを瞬時に送信。" },
      { name: "予約リマインド自動配信", desc: "予約日前に自動でLINEリマインドを送信。無断キャンセルの削減と来院率の向上を実現。" },
      { name: "フォローアップ自動配信", desc: "診察後や処方後に、最適なタイミングで自動フォローアップを配信。副作用確認・満足度調査・再診促進を自動化。" },
      { name: "A/Bテスト", desc: "メッセージの複数バリアントを自動分割配信し、開封率・CV率を比較検証。データドリブンで配信内容を最適化。" },
      { name: "キーワード自動返信", desc: "患者が送信したキーワードに応じて自動返信。部分一致・完全一致・正規表現に対応し、テンプレートやアクション実行も設定可能。" },
      { name: "高度なセグメント条件", desc: "最終決済日・商品購入履歴・診察ステータス・予約ステータスをセグメント配信の条件に追加。より精密なターゲティングで配信効果を最大化。" },
    ],
  },
  {
    category: "ノーコード構築",
    accent: "#7c3aed",
    description: "リッチメニュー・Flexメッセージ・フォーム・チャットボットをGUI操作で構築。エンジニア不要で現場スタッフが運用可能。",
    features: [
      { name: "リッチメニュービルダー", desc: "ドラッグ操作でLINEリッチメニューのボタン配置を自由に設計。URL・電話・メッセージ送信・タグ操作・メニュー切替など複雑なアクションを設定可能。" },
      { name: "AI Flex Messageビルダー", desc: "テキスト指示と画像添付でAIがLINE Flex Message（カード型リッチメッセージ）を自動生成。12種類のブロック（画像・ボタン・クーポン・カウントダウン等）をエディタで微調整。プリセットから選んでそのまま配信も可能。" },
      { name: "回答フォームビルダー", desc: "問診票・アンケート・同意書などのフォームをGUIで作成。患者はLINE上からワンタップでアクセスし回答。回答データは管理画面に自動集約。" },
      { name: "チャットボットビルダー", desc: "会話フロー（シナリオ）をビジュアルエディタで設計。メッセージ・質問・アクション・条件分岐ノードを組み合わせて自動対話を構築。" },
      { name: "フロービルダー", desc: "複雑な患者対応フローをビジュアルエディタで構築。友だち追加→問診→予約→フォローアップまでの一連の流れをドラッグ&ドロップで設計。" },
      { name: "アクション自動化", desc: "友だち追加→挨拶メッセージ→タグ付与→リッチメニュー切替のようなワークフローをステップ形式で構築。条件分岐にも対応。" },
      { name: "問診フォーム複数対応", desc: "診療分野ごとに複数の問診テンプレートを作成・管理。条件分岐・NGブロック・テンプレート複製・iPhoneプレビューに対応し、分野別に最適化された問診を自動振り分け。" },
    ],
  },
  {
    category: "AI機能",
    accent: "#d97706",
    description: "AI自動返信・音声カルテなど、AIで診療業務とLINE運用を大幅効率化。",
    features: [
      { name: "AI自動返信", desc: "AIが患者からの問い合わせ内容を理解し、クリニックのFAQ・処方情報に加え、予約・決済・発送状況も加味した返信文を自動生成。スタッフ確認後に送信するフローで品質を担保。" },
      { name: "AI自動学習", desc: "スタッフの修正送信・手動返信をAIが自動学習。類似事例を蓄積し、使うほど返信精度が向上。" },
      { name: "音声カルテ自動生成", desc: "診察中の会話をワンタップ録音。AIが音声を文字起こしし、SOAP形式のカルテを自動生成。カルテ作成時間を大幅短縮。" },
      { name: "AIモデル切替", desc: "用途やコストに応じて、管理画面からAIモデルを自由に選択。高精度モデルと高速モデルを使い分けて最適なバランスで運用。" },
    ],
  },
  {
    category: "予約・診察",
    accent: "#0891b2",
    description: "予約管理・オンライン問診・カルテまで、診療の一連の流れをLINE起点で完結。複数医師の並列管理にも対応。",
    features: [
      { name: "予約・スケジュール管理", desc: "月別・週別の予約カレンダーに加え、複数医師の並列スケジュール管理・医師別フィルタ・休日設定・日付オーバーライドに対応。" },
      { name: "オンライン問診", desc: "友だち追加後にLINEで問診フォームを自動送信。来院前に問診完了し、待ち時間を短縮。条件分岐・NG判定（禁忌チェック）にも対応。" },
      { name: "カルテ管理（SOAP対応）", desc: "診察内容をSOAP形式で構造化記録。処方タイムライン・来院履歴を一画面で確認。テンプレートで入力効率化。同時編集ロック機能搭載。" },
      { name: "キャンセル待ち自動通知", desc: "予約キャンセルが発生すると、待ちリストの患者へLINEで自動通知。空き枠を無駄なく活用し、予約充足率を向上。" },
      { name: "EHR連携", desc: "外部電子カルテシステムと患者・カルテデータをCSV/APIで双方向同期。スケジュール実行・エラー再試行・同期ログで運用を安定化。" },
      { name: "業務時間管理", desc: "医師ごとの月間業務時間を一覧で確認・修正。予約枠と連動してリソース稼働状況を可視化し、シフト管理を効率化。" },
      { name: "Google Calendar連携", desc: "予約データとGoogle Calendarを双方向で自動同期。医師ごとに異なるカレンダーとの連携にも対応し、スケジュール管理を一元化。" },
    ],
  },
  {
    category: "決済・配送",
    accent: "#0d9488",
    description: "Square/GMO決済連携から配送管理まで、クリニックの金流と物流をワンストップで管理。",
    features: [
      { name: "会計・決済管理", desc: "Square/GMO決済連携による売上追跡・銀行振込の消込処理・返金管理まで一元可視化。LINE経由でシームレスにオンライン決済を完結。" },
      { name: "配送・発送管理", desc: "ヤマトB2形式のCSV出力・追跡番号管理・配送ラベル印刷まで対応。処方薬の発送漏れを防止し、患者へ追跡リンクも自動共有。" },
      { name: "再処方管理", desc: "再処方申請・承認フローをシステム化。待機中・全件フィルタ、用量別マッピング、商品マスタ連携で再処方業務を効率化。" },
    ],
  },
  {
    category: "在庫・商品管理",
    accent: "#ea580c",
    description: "処方薬・施術メニュー・消耗品の在庫と商品情報をまとめて管理。ポイント自動付与でリピート促進も。",
    features: [
      { name: "在庫管理・在庫台帳", desc: "処方薬・消耗品の在庫をリアルタイムで把握。入出庫の自動記録、在庫台帳で推移を可視化。要発注アラートで欠品防止。" },
      { name: "商品マスタ管理", desc: "処方薬・施術メニュー・消耗品の商品情報をまとめて管理。価格・在庫連動・決済連携設定まで一元管理。" },
      { name: "ポイント自動付与", desc: "購入金額・初回購入・累計額に応じたポイントルールを設定。決済Webhook連動でポイントを自動付与し、リピート促進を自動化。" },
    ],
  },
  {
    category: "分析・レポート",
    accent: "#4f46e5",
    description: "リアルタイムダッシュボード・LTV分析・配信分析・NPS調査まで、経営判断に必要なデータをすべて可視化。",
    features: [
      { name: "リアルタイムダッシュボード", desc: "予約数・売上・新規/リピート比率・LINE友だち推移など13項目のKPIをリアルタイム表示。ドラッグ&ドロップで自由にカスタマイズ。" },
      { name: "売上分析・LTV分析", desc: "患者ごとのLTV（顧客生涯価値）を自動算出。売上推移・コホート分析・商品別ランキング・月次レポートをCSV出力。" },
      { name: "配信分析", desc: "LINE配信の開封率・クリック率・予約転換率を可視化。どのメッセージが効果的かをデータで把握し、配信戦略を最適化。" },
      { name: "流入経路トラッキング", desc: "LINE友だち追加の流入経路をUTM別に計測。広告・SNS・店頭QRなど、どの経路からの友だち追加が多いかをデータで可視化。" },
      { name: "NPS調査", desc: "LINEで患者満足度を定期的に自動調査。NPSスコアを自動計算し、トレンドグラフで推移を把握。" },
      { name: "クーポン管理・分析", desc: "割引クーポンの発行・配布・利用状況を一元管理。固定額・パーセンテージ割引、利用回数上限、有効期限設定に対応。" },
    ],
  },
  {
    category: "運用・セキュリティ",
    accent: "#475569",
    description: "セキュリティ・監査ログ・メディア管理など、安全で安定した運用を支える基盤機能。",
    features: [
      { name: "メッセージ配信ログ", desc: "全メッセージの送受信履歴を一元管理。個別・一斉・リマインド・ステップ配信など種類別に検索可能。送信成功/失敗のステータスで配信品質を監視。" },
      { name: "メディアライブラリ", desc: "リッチメニュー画像・テンプレート画像・PDFなどのメディアファイルをフォルダ管理。各機能から横断的に利用可能。" },
      { name: "セキュリティ・監査ログ", desc: "Row-Level Security・セッション管理・CSRF保護・暗号化通信を標準搭載。全操作を監査ログに記録し、コンプライアンスに対応。" },
      { name: "初期設定ウィザード", desc: "LINE連携→決済設定→商品登録→スケジュール設定まで、ステップバイステップの初期設定ウィザード。導入時の負担を最小化。" },
      { name: "マルチ診療分野対応", desc: "複数の診療分野（美容皮膚科・内科・ダイエット等）の問診・商品・NG判定を分野別に管理。1つのLINEアカウントで複数分野を効率的に運用。" },
      { name: "スマホ管理・LINE通知bot", desc: "レスポンシブ対応の管理画面でスマートフォンからも全機能を操作可能。Cronジョブやシステムエラー発生時にはLINE管理グループへ自動通知。" },
      { name: "スタッフ・ロール権限管理", desc: "オーナー・副管理者・運用者・スタッフの4段階ロールに加え、画面単位のアクセス権限を設定。スタッフごとに必要な機能だけを開放し、セキュリティを強化。" },
    ],
  },
];

const totalFeatures = featureCategories.reduce((sum, c) => sum + c.features.length, 0);

/* 機能ページFAQ */
const featureFaqs = [
  { q: "全機能を使うにはどのプランが必要ですか？", a: "すべての機能はスタンダードプランから利用可能です。プロプランでは決済・配送・分析など経営管理機能が追加されます。ユーザー数は全プラン無制限です。" },
  { q: "院長と事務スタッフ1人で全機能を使いこなせますか？", a: "はい。Lオペはノーコード設計で、ITに詳しくないスタッフでも操作できます。導入時のスタッフ研修も無料で提供しています。自動リマインド・AI自動返信・フォローアップ自動配信で手作業をほぼゼロにできます。" },
  { q: "既存の電子カルテや予約システムと併用できますか？", a: "EHR連携機能でCSV/APIによる双方向同期に対応しています。既存システムの患者データをLオペに取り込み、段階的に移行することも可能です。" },
  { q: "AI自動返信の精度はどのくらいですか？", a: "導入初期から高い精度で返信を生成します。さらに、スタッフの修正や手動返信をAIが自動学習するため、使うほど精度が向上します。" },
  { q: "セキュリティ対策は万全ですか？", a: "Row-Level Security・セッション管理・CSRF保護・SSL/TLS暗号化・監査ログを標準搭載。個人情報保護法に準拠した運用が可能です。" },
];

/* JSON-LD */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lオペ for CLINIC 機能一覧",
    description: `LINE公式アカウントでクリニック業務をDX化するLオペ for CLINICの全${totalFeatures}機能`,
    numberOfItems: totalFeatures,
    itemListElement: featureCategories.flatMap((cat, ci) =>
      cat.features.map((f, fi) => ({
        "@type": "ListItem",
        position: ci * 10 + fi + 1,
        name: f.name,
        description: f.desc,
      }))
    ),
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for CLINIC",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: "スタンダードプラン",
        description: "予約・カルテ・問診まで診療業務をカバー。全機能利用可・ユーザー数無制限。",
        availability: "https://schema.org/InStock",
        price: "0",
        priceCurrency: "JPY",
        url: `${SITE_URL}/clinic/contact`,
      },
      {
        "@type": "Offer",
        name: "プロプラン",
        description: "決済・配送・分析まで業務をまるごとDX化。全機能利用可・ユーザー数無制限。",
        availability: "https://schema.org/InStock",
        price: "0",
        priceCurrency: "JPY",
        url: `${SITE_URL}/clinic/contact`,
      },
    ],
  },
  /* FAQPage — 機能に関するよくある質問 */
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: featureFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  /* Service — サービス詳細 */
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Lオペ for CLINIC",
    serviceType: "クリニック向けLINE公式アカウント運用・業務DXプラットフォーム",
    provider: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
    areaServed: { "@type": "Country", name: "JP" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "機能カテゴリ",
      itemListElement: featureCategories.map((cat) => ({
        "@type": "OfferCatalog",
        name: cat.category,
        description: cat.description,
        numberOfItems: cat.features.length,
      })),
    },
  },
  /* WebPage — ページ情報 */
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "機能一覧 | Lオペ for CLINIC",
    description:
      "Lオペ for CLINICの全40機能以上を一覧で紹介。患者CRM・セグメント配信・リッチメニュー・オンライン問診・予約管理・AI自動返信・音声カルテ・決済管理・配送管理・在庫管理・NPS調査・フロービルダーなど、LINE公式アカウントでクリニック業務をDX化する全機能を解説。",
    url: `${SITE_URL}/clinic/features`,
    isPartOf: { "@type": "WebSite", name: "Lオペ for CLINIC", url: SITE_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Lオペ for CLINIC", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "機能一覧", item: `${SITE_URL}/clinic/features` },
      ],
    },
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-sky-700">
        メインコンテンツへスキップ
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ──────────────── ヒーロー ──────────────── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 pb-14 pt-20">
          {/* パンくず */}
          <nav aria-label="パンくずリスト" className="mb-10">
            <ol className="flex items-center gap-1.5 text-[13px] text-gray-400 list-none m-0 p-0">
              <li><Link href="/" className="hover:text-blue-600 transition">Lオペ for CLINIC</Link></li>
              <li aria-hidden="true" className="text-gray-300">/</li>
              <li aria-current="page" className="text-gray-600 font-medium">機能一覧</li>
            </ol>
          </nav>

          <p className="text-[13px] font-semibold tracking-widest text-blue-600 uppercase">Features</p>
          <h1 className="mt-3 text-[2rem] font-extrabold leading-tight tracking-tight text-gray-900 md:text-[2.5rem]">
            機能一覧
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-gray-500">
            患者CRM・メッセージ配信・AI・予約・決済・配送・分析まで、クリニック運営に必要な{totalFeatures}の機能をオールインワンで搭載しています。
          </p>

          {/* カテゴリナビ */}
          <div className="mt-10 flex flex-wrap gap-2">
            {featureCategories.map((cat) => (
              <a
                key={cat.category}
                href={`#${cat.category}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-600 hover:shadow-sm"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.accent }} />
                {cat.category}
                <span className="text-gray-400">{cat.features.length}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── メインコンテンツ ──────────────── */}
      <div id="main-content" className="mx-auto max-w-5xl px-6 py-16">
        {featureCategories.map((cat, catIdx) => (
          <section
            key={cat.category}
            id={cat.category}
            className={catIdx > 0 ? "mt-24" : ""}
          >
            {/* カテゴリヘッダー */}
            <div className="flex items-start gap-4">
              <div
                className="mt-1 h-1 w-10 flex-shrink-0 rounded-full"
                style={{ backgroundColor: cat.accent }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-[1.35rem] font-extrabold text-gray-900">{cat.category}</h2>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-semibold text-gray-500">{cat.features.length}</span>
                </div>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-gray-500">{cat.description}</p>
              </div>
            </div>

            {/* 機能リスト */}
            <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 md:grid-cols-2">
              {cat.features.map((f) => (
                <article key={f.name} className="bg-white p-6">
                  <h3 className="text-[15px] font-bold text-gray-900">{f.name}</h3>
                  <p className="mt-2 text-[13px] leading-[1.8] text-gray-500">{f.desc}</p>
                </article>
              ))}
              {/* 奇数の場合に空セルを追加して均等にする */}
              {cat.features.length % 2 !== 0 && <div className="bg-white" />}
            </div>
          </section>
        ))}

        {/* ──────────────── サマリー ──────────────── */}
        <section className="mt-24 rounded-2xl bg-gray-50 p-10 text-center md:p-14">
          <p className="text-[13px] font-semibold tracking-widest text-blue-600 uppercase">All-in-one</p>
          <h2 className="mt-3 text-[1.5rem] font-extrabold text-gray-900 md:text-[1.75rem]">
            {featureCategories.length}カテゴリ・全{totalFeatures}機能
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-gray-500">
            すべての機能がスタンダードプランから利用可能。ユーザー数無制限・アップデート無料。
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-6 sm:grid-cols-5 lg:grid-cols-9">
            {featureCategories.map((cat) => (
              <div key={cat.category} className="flex flex-col items-center gap-2">
                <span className="text-[1.5rem] font-extrabold" style={{ color: cat.accent }}>{cat.features.length}</span>
                <span className="text-[11px] font-medium text-gray-500 text-center leading-tight">{cat.category}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────── FAQ ──────────────── */}
        <section className="mt-24">
          <p className="text-[13px] font-semibold tracking-widest text-blue-600 uppercase">FAQ</p>
          <h2 className="mt-3 text-[1.35rem] font-extrabold text-gray-900">機能に関するよくある質問</h2>
          <div className="mt-8 divide-y divide-gray-100">
            {featureFaqs.map((f, i) => (
              <details key={i} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between text-[14px] font-semibold text-gray-800">
                  <span className="pr-4">{f.q}</span>
                  <svg className="h-5 w-5 flex-shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ──────────────── CTA ──────────────── */}
        <section className="mt-16 overflow-hidden rounded-2xl bg-gray-900 px-8 py-14 text-center md:px-14">
          <h2 className="text-[1.5rem] font-extrabold text-white md:text-[1.75rem]">まずは資料でご確認ください</h2>
          <p className="mx-auto mt-3 max-w-lg text-[14px] text-gray-400">
            貴院の課題に合わせたデモのご案内も可能です。お気軽にお問い合わせください。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/clinic/contact"
              className="rounded-lg bg-blue-600 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-blue-700"
            >
              無料で資料請求
            </a>
            <Link
              href="/#pricing"
              className="rounded-lg border border-gray-600 px-8 py-3.5 text-[14px] font-bold text-gray-300 transition hover:border-gray-400 hover:text-white"
            >
              料金プランを見る
            </Link>
          </div>
        </section>
      </div>

      {/* ──────────────── フッター ──────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center text-[13px] text-gray-400">
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/" className="hover:text-blue-600 transition">Lオペ for CLINIC トップ</Link>
          <Link href="/clinic/about" className="hover:text-blue-600 transition">Lオペとは</Link>
          <Link href="/clinic/column" className="hover:text-blue-600 transition">コラム</Link>
          <Link href="/clinic/contact" className="hover:text-blue-600 transition">お問い合わせ</Link>
          <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">運営会社</a>
        </div>
      </footer>
    </div>
  );
}
