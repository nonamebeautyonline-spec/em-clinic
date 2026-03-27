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
  {
    slug: "management",
    label: "経営戦略",
    description:
      "自費クリニックの経営戦略に関する記事。LTV最大化・リピート率向上・収益構造改善など、持続的な成長のための実践的なノウハウを紹介します。",
    matchValues: ["経営戦略"],
  },
  {
    slug: "operation",
    label: "運営ノウハウ",
    description:
      "クリニックの運営ノウハウに関する記事。スタッフ教育・接遇・業務フロー改善など、日々の運営品質を高めるための実践的な方法を紹介します。",
    matchValues: ["運営ノウハウ"],
  },
  {
    slug: "opening",
    label: "開業・経営",
    description:
      "クリニックの開業準備・経営に関する記事。開業前のマーケティング計画・資金計画・集患戦略など、成功する開業のためのノウハウを紹介します。",
    matchValues: ["開業・経営"],
  },
  {
    slug: "medication",
    label: "医薬品解説",
    description:
      "クリニックで処方される医薬品の作用機序・エビデンス・副作用・服用方法を医師が解説。GLP-1受容体作動薬、美容内服薬など、患者説明にも活用できる情報を提供します。",
    matchValues: ["医薬品解説"],
  },
  {
    slug: "evidence",
    label: "エビデンス解説",
    description:
      "クリニックで提供される施術・治療のエビデンスを比較解説。科学的根拠に基づいた治療選択の判断材料を提供します。",
    matchValues: ["エビデンス解説"],
  },
  {
    slug: "revenue",
    label: "収益モデル",
    description:
      "自費クリニックの診療科別収益モデルを解説。オンライン診療・対面診療それぞれの収益構造と成長戦略を紹介します。",
    matchValues: ["収益モデル"],
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
