/* コラム記事のメタデータ一覧 — インデックスページ・相互リンク・sitemapで共用 */

import type { Article } from "@/lib/column-shared/types";

export type { Article };

/* カテゴリ→タグの自動マッピング（個別タグ未設定時のフォールバック） */
const categoryTagMap: Record<string, string[]> = {
  "EC×LINE活用入門": ["EC LINE", "LINE公式アカウント", "ECサイト", "LINE連携"],
  "カゴ落ち対策": ["カゴ落ち", "カート放棄", "リマインド", "売上回復"],
  "配信・リピート促進": ["セグメント配信", "リピート率", "クーポン", "シナリオ配信"],
  "顧客管理・CRM": ["CRM", "RFM分析", "顧客ランク", "購買履歴"],
  "発送管理・物流": ["発送通知", "配送", "物流", "自動通知"],
  "業態別活用事例": ["D2C", "アパレルEC", "食品EC", "活用事例"],
  "分析・改善": ["KPI", "データ分析", "売上分析", "効果測定"],
  "成功事例・売上UP": ["成功事例", "売上UP", "リピート率", "EC成長"],
};

/** 記事のタグを取得（個別指定 > カテゴリ自動） */
export function getArticleTags(article: Article): string[] {
  return article.tags || categoryTagMap[article.category] || ["EC LINE", "LINE運用"];
}

export const articles: Article[] = [
  /* ═══════════════════════════════════════════════════════════════════════════
     EC×LINE活用入門（4記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "ec-line-official-account-guide-2026",
    title: "ECサイトのLINE公式アカウント活用入門 — 開設から売上貢献までの完全ガイド",
    description: "ECサイトでLINE公式アカウントを活用するための完全ガイド。アカウント開設からECカート連携、初回配信設計まで、EC×LINEの導入を成功させるための基礎知識を体系的に解説。",
    date: "2026-03-31",
    category: "EC×LINE活用入門",
    readTime: "12分",
  },
  {
    slug: "shopify-line-integration-setup",
    title: "Shopify×LINE連携の設定方法 — ECカートとLINE公式アカウントを接続するステップガイド",
    description: "ShopifyとLINE公式アカウントを連携する具体的な手順を解説。Webhookの設定からカゴ落ち通知・発送通知の自動化まで、技術的な知識なしで導入できる方法を紹介。",
    date: "2026-03-31",
    category: "EC×LINE活用入門",
    readTime: "10分",
  },
  {
    slug: "ec-line-vs-email-marketing-comparison",
    title: "EC事業者のためのLINE vs メールマーケティング徹底比較 — 開封率3倍の理由",
    description: "ECサイトのマーケティングチャネルとしてLINEとメールを徹底比較。開封率・クリック率・CV率のデータをもとに、LINE活用が売上に直結する理由と最適な使い分けを解説。",
    date: "2026-03-31",
    category: "EC×LINE活用入門",
    readTime: "9分",
  },
  {
    slug: "ec-line-first-month-roadmap",
    title: "EC×LINE運用開始1ヶ月のロードマップ — 友だち集めから初回売上まで",
    description: "ECサイトでLINE運用を開始した最初の1ヶ月で取り組むべきことをロードマップ形式で解説。友だち獲得施策から初回配信、売上貢献の計測まで、成果を出すための最初の一歩。",
    date: "2026-03-31",
    category: "EC×LINE活用入門",
    readTime: "11分",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     カゴ落ち対策（4記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "line-cart-abandonment-recovery-guide",
    title: "LINEでカゴ落ち率を50%改善する方法 — リマインド配信の設計と最適化",
    description: "LINEのカゴ落ちリマインド配信で回収率を最大化する方法を徹底解説。最適な配信タイミング、メッセージ設計、段階的リマインドの組み立て方まで、実践的なノウハウを紹介。",
    date: "2026-03-31",
    category: "カゴ落ち対策",
    readTime: "13分",
  },
  {
    slug: "cart-recovery-message-templates",
    title: "カゴ落ちリマインドのメッセージテンプレート10選 — 業態別の最適な表現",
    description: "カゴ落ちリマインドのメッセージ文面を業態別に10パターン紹介。商品画像の活用法、緊急性の演出、クーポン付きリマインドなど、回収率を高めるメッセージ設計のコツを解説。",
    date: "2026-03-31",
    category: "カゴ落ち対策",
    readTime: "8分",
  },
  {
    slug: "optimal-cart-reminder-timing",
    title: "カゴ落ちリマインドの最適タイミング — データで見る回収率が最も高い配信時間",
    description: "カゴ落ちリマインドを送るべき最適なタイミングをデータに基づいて解説。1時間後・24時間後・3日後の段階的配信の効果と、業態・商品カテゴリ別の最適化ポイントを紹介。",
    date: "2026-03-31",
    category: "カゴ落ち対策",
    readTime: "7分",
  },
  {
    slug: "cart-abandonment-coupon-strategy",
    title: "カゴ落ちクーポン戦略 — 割引率の最適化と利益を守る設計",
    description: "カゴ落ちリマインドにクーポンを付けるべきか、付ける場合の最適な割引率は何%か。利益を守りながら回収率を最大化するクーポン戦略を、実際のデータとともに解説。",
    date: "2026-03-31",
    category: "カゴ落ち対策",
    readTime: "9分",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     配信・リピート促進（4記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "ec-segment-delivery-purchase-data",
    title: "購買データを活用したLINEセグメント配信 — EC売上を最大化する配信設計",
    description: "購入金額・商品カテゴリ・購入頻度・最終購入日など、EC特有のデータを活用したセグメント配信の設計方法を解説。一斉配信からの脱却で売上とリピート率を同時に改善。",
    date: "2026-03-31",
    category: "配信・リピート促進",
    readTime: "11分",
  },
  {
    slug: "ec-repeat-purchase-scenario",
    title: "ECのリピート購入率を2倍にするLINEシナリオ設計 — 購買サイクル別の自動配信",
    description: "商品の購買サイクルに合わせたLINEシナリオ配信で、リピート購入率を2倍に引き上げる方法を解説。消耗品の再購入リマインド、関連商品のクロスセル、ランクアップ通知の設計術。",
    date: "2026-03-31",
    category: "配信・リピート促進",
    readTime: "10分",
  },
  {
    slug: "ec-coupon-line-distribution-strategy",
    title: "ECのLINEクーポン配信戦略 — 初回購入・リピート・休眠復帰別の最適設計",
    description: "初回購入特典・リピート促進クーポン・休眠顧客の復帰クーポンなど、目的別のLINEクーポン配信戦略を解説。割引率の最適化と利益を守るクーポン設計のベストプラクティス。",
    date: "2026-03-31",
    category: "配信・リピート促進",
    readTime: "9分",
  },
  {
    slug: "ec-line-block-rate-reduction",
    title: "ECサイトのLINEブロック率を下げる7つの方法 — 配信頻度と内容の最適化",
    description: "ECサイトのLINE配信でブロック率が上がる原因と、具体的な改善方法を7つ紹介。配信頻度の最適化・コンテンツの質向上・セグメント精度の改善で、ブロック率を50%削減する手法。",
    date: "2026-03-31",
    category: "配信・リピート促進",
    readTime: "8分",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     顧客管理・CRM（4記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "ec-line-crm-strategy",
    title: "D2CブランドのLINE CRM戦略 — 購買データ×LINEで顧客LTVを最大化",
    description: "D2CブランドがLINE×CRMで顧客LTVを最大化する戦略を解説。購買履歴に基づくセグメント設計、パーソナライズ配信、顧客ランク制度の構築方法を紹介。",
    date: "2026-03-31",
    category: "顧客管理・CRM",
    readTime: "12分",
  },
  {
    slug: "ec-rfm-analysis-line-segment",
    title: "RFM分析×LINEセグメント配信 — EC顧客を4象限で分類して売上を最大化",
    description: "RFM分析（最新購入日・購入頻度・購入金額）を活用したLINEセグメント配信の設計方法。優良顧客・新規顧客・休眠顧客・離脱予備軍の4象限に応じた最適なアプローチを解説。",
    date: "2026-03-31",
    category: "顧客管理・CRM",
    readTime: "10分",
  },
  {
    slug: "ec-customer-rank-line-notification",
    title: "EC顧客ランク制度の設計とLINE連携 — ランクアップ通知で購買頻度を高める",
    description: "購買金額・回数に応じた顧客ランク制度の設計方法と、LINEを活用したランクアップ通知・特典案内の自動配信。顧客ロイヤルティを効率的に醸成する仕組みを解説。",
    date: "2026-03-31",
    category: "顧客管理・CRM",
    readTime: "9分",
  },
  {
    slug: "ec-dormant-customer-reactivation-line",
    title: "ECの休眠顧客をLINEで復帰させる5つのシナリオ — 再購入率を3倍にする方法",
    description: "一定期間購入のない休眠顧客に対するLINE復帰シナリオを5パターン紹介。最終購入からの経過日数に応じた段階的アプローチで、再購入率を3倍に引き上げる実践手法。",
    date: "2026-03-31",
    category: "顧客管理・CRM",
    readTime: "8分",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     発送管理・物流（3記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "ec-shipping-notification-line-automation",
    title: "ECの発送通知をLINEで自動化する方法 — 注文確認から配達完了まで",
    description: "ECサイトの注文確認・発送完了・配達完了の通知をLINEで自動化する方法を解説。追跡番号の自動挿入、配送遅延時のフォロー、配達後のレビュー依頼まで、物流×LINEの全体設計。",
    date: "2026-03-31",
    category: "発送管理・物流",
    readTime: "10分",
  },
  {
    slug: "ec-delivery-status-line-bot",
    title: "LINEで配送状況を確認できるボットの構築方法 — 問い合わせ削減の実践ガイド",
    description: "顧客がLINEのトーク画面から配送状況を確認できるボットの構築方法を解説。「今どこ？」の問い合わせを80%削減した実例とともに、設計から運用までのノウハウを紹介。",
    date: "2026-03-31",
    category: "発送管理・物流",
    readTime: "9分",
  },
  {
    slug: "ec-post-delivery-review-request",
    title: "配達完了後のLINEレビュー依頼 — 回答率を高めるタイミングとメッセージ設計",
    description: "配達完了後にLINEでレビュー依頼を送る最適なタイミングとメッセージ設計を解説。レビュー回答率を3倍に引き上げた事例とともに、UGC獲得を加速させるノウハウを紹介。",
    date: "2026-03-31",
    category: "発送管理・物流",
    readTime: "7分",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     業態別活用事例（4記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "d2c-brand-line-marketing-strategy",
    title: "D2CブランドのLINEマーケティング戦略 — ファン育成から売上拡大まで",
    description: "D2CブランドがLINEを活用してファンコミュニティを育成し、売上を拡大する戦略を解説。ブランドストーリー配信・VIP限定施策・UGC活用のベストプラクティスを紹介。",
    date: "2026-03-31",
    category: "業態別活用事例",
    readTime: "11分",
  },
  {
    slug: "apparel-ec-line-restock-notification",
    title: "アパレルECのLINE活用術 — 再入荷通知・コーディネート提案で売上UP",
    description: "アパレルECにおけるLINE活用の具体例を紹介。サイズ・カラー別の再入荷通知、コーディネート提案によるクロスセル、季節セール情報のセグメント配信など、売上に直結する施策を解説。",
    date: "2026-03-31",
    category: "業態別活用事例",
    readTime: "9分",
  },
  {
    slug: "food-ec-line-repurchase-reminder",
    title: "食品ECのLINE再購入リマインド戦略 — 賞味期限ベースの自動配信設計",
    description: "食品ECにおけるLINE活用事例。賞味期限や消費サイクルに基づく再購入リマインド、季節限定商品の先行予約、定期便の配送スケジュール通知など、食品EC特有の配信設計を解説。",
    date: "2026-03-31",
    category: "業態別活用事例",
    readTime: "8分",
  },
  {
    slug: "subscription-ec-line-churn-prevention",
    title: "サブスクECのLINE活用 — 解約防止と継続率を高める5つの施策",
    description: "サブスクECの解約防止にLINEを活用する5つの施策を紹介。解約予兆スコアリング・自動フォロー・プラン変更提案・継続特典通知・休止オプション案内のベストプラクティス。",
    date: "2026-03-31",
    category: "業態別活用事例",
    readTime: "10分",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     分析・改善（3記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "ec-line-roi-measurement",
    title: "EC×LINE運用のROI測定方法 — LINE経由売上の正しい計測と可視化",
    description: "LINE経由のEC売上を正確に計測する方法を解説。配信施策ごとのROI算出、アトリビューション分析、投資対効果の可視化まで、データドリブンなEC×LINE運用の基盤を構築。",
    date: "2026-03-31",
    category: "分析・改善",
    readTime: "10分",
  },
  {
    slug: "ec-line-kpi-dashboard-design",
    title: "EC×LINE運用のKPI設計 — 追うべき指標とダッシュボードの作り方",
    description: "EC×LINE運用で追うべきKPIを体系的に整理。売上貢献額・カゴ落ち回収率・リピート率・配信ROIなど、意思決定に必要な指標とダッシュボードの設計方法を解説。",
    date: "2026-03-31",
    category: "分析・改善",
    readTime: "9分",
  },
  {
    slug: "ec-line-ab-test-best-practices",
    title: "EC×LINEのA/Bテスト実践ガイド — 配信効果を科学的に改善する方法",
    description: "LINE配信のA/Bテストの設計から実施、結果分析までの実践ガイド。メッセージ文面・画像・配信タイミング・クーポン設計のテスト手法と、統計的に有意な結果を得るためのポイント。",
    date: "2026-03-31",
    category: "分析・改善",
    readTime: "8分",
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     成功事例・売上UP（4記事）
     ═══════════════════════════════════════════════════════════════════════════ */
  {
    slug: "ec-line-sales-20-percent-up-case-study",
    title: "カゴ落ち対策で月商20%アップ — EC×LINE成功事例5選",
    description: "LINEのカゴ落ち対策で月商を20%以上アップさせたEC事業者の成功事例5選。業態・規模別の施策内容と具体的な成果データを紹介し、再現可能なポイントを解説。",
    date: "2026-03-31",
    category: "成功事例・売上UP",
    readTime: "12分",
  },
  {
    slug: "stripe-line-payment-completion-rate",
    title: "Stripe×LINE連携で決済完了率を上げる — 決済フロー最適化の実践ガイド",
    description: "Stripe決済とLINE通知を連携し、決済完了率を改善する方法を解説。決済リマインド・決済完了通知・決済エラー時のフォローなど、売上の取りこぼしを防ぐ実践ノウハウ。",
    date: "2026-03-31",
    category: "成功事例・売上UP",
    readTime: "10分",
  },
  {
    slug: "ec-line-repeat-rate-double-case-study",
    title: "LINE配信でリピート率を2倍にしたEC事業者の施策 — 成功パターンと再現方法",
    description: "LINEのセグメント配信・シナリオ配信でリピート率を2倍に引き上げたEC事業者の実例。施策の設計プロセス、配信シナリオの具体例、効果測定の方法を詳しく紹介。",
    date: "2026-03-31",
    category: "成功事例・売上UP",
    readTime: "11分",
  },
  {
    slug: "ec-line-ltv-3x-d2c-strategy",
    title: "D2CブランドのLINE活用で顧客LTVを3倍にした戦略 — CRM構築から成果まで",
    description: "D2CブランドがLINE×CRMで顧客LTVを3倍に引き上げた戦略の全貌。顧客セグメント設計・パーソナライズ配信・ランク制度の構築から、具体的な成果データまでを公開。",
    date: "2026-03-31",
    category: "成功事例・売上UP",
    readTime: "13分",
  },
];
