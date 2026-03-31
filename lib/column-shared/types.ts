/* コラム記事の共通型定義 — clinic・汎用LINE両方で使用 */

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  category: string;
  readTime: string;
  tags?: string[];
}

export interface CategoryDef {
  /** URLスラッグ */
  slug: string;
  /** 表示名 */
  label: string;
  /** SEO用 description */
  description: string;
  /** カテゴリページに表示するSEO導入テキスト（任意） */
  seoIntro?: string;
  /** カテゴリに一致する記事のcategoryフィールド値 */
  matchValues: readonly string[];
}

export interface TocItem {
  id: string;
  label: string;
}
