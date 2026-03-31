/* カテゴリスラッグマッピング — カテゴリ別ページ・sitemap・内部リンクで共用 */
import type { CategoryDef } from "@/lib/column-shared/types";
import { articles } from "./articles";

export type { CategoryDef };

export const categories: CategoryDef[] = [
  {
    slug: "getting-started",
    label: "EC×LINE活用入門",
    description:
      "ECサイトでLINE公式アカウントを活用するための基礎知識。開設・初期設定・連携方法など、これからEC×LINEを始める方向けの入門記事。",
    seoIntro:
      "ECサイトとLINE公式アカウントの連携は、顧客との直接的なコミュニケーションチャネルを構築し、売上拡大に直結するマーケティング手法として注目されています。メール開封率が平均20%に対し、LINEメッセージの開封率は60%以上。本カテゴリでは、ECサイトでLINE公式アカウントを活用するための基礎知識から連携設定まで、EC×LINEの導入を成功させるためのガイドを提供しています。",
    matchValues: ["EC×LINE活用入門"],
  },
  {
    slug: "cart-recovery",
    label: "カゴ落ち対策",
    description:
      "カゴ落ち率の改善に特化した記事。LINEリマインド・タイミング最適化・メッセージ設計など、カゴ落ち回収率を最大化する実践ノウハウ。",
    seoIntro:
      "EC業界の平均カゴ落ち率は約70%。商品をカートに入れたものの購入に至らない顧客への適切なフォローアップが、EC売上を大きく左右します。LINEのリマインド通知はメールに比べて3倍以上の開封率を誇り、カゴ落ち回収の最も効果的なチャネルです。本カテゴリでは、LINEを活用したカゴ落ち対策の具体的な手法、最適な配信タイミング、メッセージ設計のベストプラクティスを解説しています。",
    matchValues: ["カゴ落ち対策"],
  },
  {
    slug: "messaging",
    label: "配信・リピート促進",
    description:
      "セグメント配信・シナリオ配信・クーポン活用など、EC向けLINE配信の設計と最適化。リピート率を高める配信戦略を紹介。",
    seoIntro:
      "ECサイトのLINE配信は、一斉配信ではなく購買データに基づくセグメント配信が鍵です。購入商品・金額・頻度に応じた配信設計により、ブロック率を抑えながらリピート率を大幅に向上させる事例が増えています。本カテゴリでは、購買サイクルに最適化したシナリオ配信、クーポン活用によるリピート促進、効果的な配信タイミングの設計など、EC向けLINE配信の実践ノウハウを解説しています。",
    matchValues: ["配信・リピート促進"],
  },
  {
    slug: "crm",
    label: "顧客管理・CRM",
    description:
      "購買履歴を活用した顧客管理・RFM分析・ランク制度など、EC向けLINE CRM戦略の構築方法を解説。",
    seoIntro:
      "ECサイトの成長には、新規顧客の獲得だけでなく既存顧客のLTV最大化が不可欠です。LINE×CRMの連携により、購買履歴に基づく精密なセグメント管理・RFM分析・顧客ランク制度の構築が可能になります。本カテゴリでは、EC向けLINE CRMの構築方法から運用ノウハウまで、顧客管理を売上に直結させる実践的な手法を紹介しています。",
    matchValues: ["顧客管理・CRM"],
  },
  {
    slug: "shipping",
    label: "発送管理・物流",
    description:
      "発送通知の自動化・配送ステータス連携・物流オペレーション効率化など、ECの物流×LINE活用を解説。",
    seoIntro:
      "ECサイトにおける「注文後の顧客体験」は、リピート率に直結する重要な要素です。発送通知・配達完了通知・配送遅延のフォローなど、物流の各ステータスに応じたLINE通知の自動化により、顧客満足度の向上と問い合わせ件数の削減を同時に実現できます。本カテゴリでは、EC物流とLINEの連携方法から運用効率化のノウハウまでを解説しています。",
    matchValues: ["発送管理・物流"],
  },
  {
    slug: "industry-cases",
    label: "業態別活用事例",
    description:
      "D2C・アパレル・食品・サブスクなど業態別のEC×LINE活用事例。各業態特有の課題に応じた運用戦略を紹介。",
    seoIntro:
      "EC×LINEの活用法は業態によって大きく異なります。D2Cブランドではファン育成とブランドストーリー配信、アパレルECでは再入荷通知とコーディネート提案、食品ECでは賞味期限ベースの再購入リマインド、サブスクECでは解約防止と継続特典通知など、業態特有のパターンが確立されています。本カテゴリでは、各業態のEC×LINE成功事例を紹介しています。",
    matchValues: ["業態別活用事例"],
  },
  {
    slug: "analytics",
    label: "分析・改善",
    description:
      "配信効果分析・売上貢献測定・KPI設計など、EC向けLINE運用の改善手法。データドリブンな運用最適化を解説。",
    seoIntro:
      "EC×LINE運用の成果を最大化するには、正しいKPI設定と継続的なデータ分析が不可欠です。配信の開封率・クリック率だけでなく、LINE経由の売上貢献額・カゴ落ち回収率・リピート率など、EC特有の指標を追うことで、投資対効果を正確に把握できます。本カテゴリでは、データドリブンなEC×LINE運用改善の方法を解説しています。",
    matchValues: ["分析・改善"],
  },
  {
    slug: "success-stories",
    label: "成功事例・売上UP",
    description:
      "EC×LINE活用で売上向上・リピート率改善に成功した事例と、実践的な運用ノウハウを紹介。",
    seoIntro:
      "LINE公式アカウントをEC運営に活用し、売上を大幅に伸ばした事業者は多数存在します。カゴ落ち回収で月商20%アップ、セグメント配信でリピート率2倍、D2Cブランドの顧客LTV3倍など、具体的な成果データとともに成功パターンを知ることで、自社のEC運営に活かせるヒントが得られます。本カテゴリでは、EC×LINEの成功事例と再現可能なノウハウを紹介しています。",
    matchValues: ["成功事例・売上UP"],
  },
];

/** スラッグからカテゴリ定義を取得 */
export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return categories.find((c) => c.slug === slug);
}

/** カテゴリ定義に一致する記事を返す */
export function getArticlesByCategory(cat: CategoryDef) {
  return articles.filter((a) => cat.matchValues.includes(a.category));
}
