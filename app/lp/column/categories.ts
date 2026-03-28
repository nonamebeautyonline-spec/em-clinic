/* カテゴリスラッグマッピング — カテゴリ別ページ・sitemap・内部リンクで共用 */
import { articles } from "./articles";

export interface CategoryDef {
  /** URLスラッグ */
  slug: string;
  /** 表示名 */
  label: string;
  /** SEO用 description */
  description: string;
  /** カテゴリに一致する記事のcategoryフィールド値 */
  matchValues: readonly string[];
}

export const categories: CategoryDef[] = [
  {
    slug: "line-dx",
    label: "LINE運用・業務改善",
    description:
      "LINE公式アカウントを活用したクリニック業務のDX化・効率化に関する記事。予約管理・自動返信・問診・決済など、LINE運用の実践ノウハウを紹介します。",
    matchValues: ["LINE運用・業務改善"],
  },
  {
    slug: "marketing",
    label: "集患・マーケティング",
    description:
      "クリニックの集患・リピート率向上に関するマーケティング記事。SEO・MEO・SNS・LINE配信・口コミ対策など、新患獲得と再来院促進の実践ノウハウを紹介します。",
    matchValues: ["集患・マーケティング"],
  },
  {
    slug: "management",
    label: "経営・開業",
    description:
      "クリニックの開業準備・経営管理に関する記事。資金計画・法人化・事業承継・人件費最適化・損益管理など、安定経営のための実践知識を紹介します。",
    matchValues: ["経営・開業"],
  },
  {
    slug: "self-pay-revenue",
    label: "自費診療の売上戦略",
    description:
      "自費クリニックの収益最大化に関する記事。価格設定・LTV向上・サブスクモデル・リピート処方・物販戦略など、自費診療の売上を伸ばす施策を紹介します。",
    matchValues: ["自費診療の売上戦略"],
  },
  {
    slug: "online-clinic",
    label: "オンライン診療",
    description:
      "オンライン診療の開設・運用に関する記事。法規制・処方ルール・システム選定・問診設計・同意書整備など、遠隔診療の実務ノウハウを網羅的に解説します。",
    matchValues: ["オンライン診療"],
  },
  {
    slug: "specialty",
    label: "診療科別ガイド",
    description:
      "診療科目別のクリニック運営・オンライン診療ガイド。美容・AGA・ED・ピル・花粉症・皮膚科など、各分野の診療戦略と差別化ポイントを解説します。",
    matchValues: ["診療科別ガイド"],
  },
  {
    slug: "comparison",
    label: "ツール・システム比較",
    description:
      "クリニック向けLINEツール・予約システム・CRM・オンライン診療プラットフォームの比較記事。機能・費用・運用負荷の観点から最適なツール選びをサポートします。",
    matchValues: ["ツール・システム比較"],
  },
  {
    slug: "medication",
    label: "医薬品・処方ガイド",
    description:
      "クリニックで処方される医薬品の作用機序・エビデンス・副作用・服用方法を解説。GLP-1受容体作動薬・美容内服薬・ピル・ED治療薬など、患者説明にも活用できる情報を提供します。",
    matchValues: ["医薬品・処方ガイド"],
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
