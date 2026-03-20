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
    slug: "case-studies",
    label: "活用事例",
    description:
      "LINE公式アカウントを活用したクリニックの導入事例を紹介。美容・歯科・皮膚科など、診療科目別の成功事例と具体的な成果を解説します。",
    matchValues: ["活用事例"],
  },
  {
    slug: "comparison",
    label: "ツール比較",
    description:
      "クリニック向けLINEツール・予約システム・CRMの比較記事。機能・費用・運用負荷の観点から最適なツール選びをサポートします。",
    matchValues: ["ツール比較"],
  },
  {
    slug: "guide",
    label: "ガイド",
    description:
      "クリニックのDX推進・LINE公式アカウント導入・運用に関する完全ガイド。電子カルテ連携からAI自動返信まで、段階的な導入方法を解説します。",
    matchValues: ["ガイド"],
  },
  {
    slug: "improvement",
    label: "業務改善",
    description:
      "クリニックの業務効率化に関する記事。予約管理の無断キャンセル削減や開業医の業務負荷軽減など、LINE活用による具体的な改善施策を紹介します。",
    matchValues: ["業務改善"],
  },
  {
    slug: "marketing",
    label: "マーケティング",
    description:
      "クリニックの集患・リピート率向上に関するマーケティング記事。LINEセグメント配信・友だち集め・ブロック率低減など実践的なノウハウを紹介します。",
    matchValues: ["マーケティング"],
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
