import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-management-success")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  dateModified: self.date,
  image: `${SITE_URL}/lp/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "クリニック経営に必要な3つの業務（人材育成・設備管理・資金繰り）",
  "成功するクリニックの3つの共通点",
  "2024年の医療機関倒産件数が過去最多64件に達した背景",
  "LINEを活用した経営改善の具体策",
];

const toc = [
  { id: "bankruptcy-data", label: "医療機関の倒産が過去最多に" },
  { id: "three-tasks", label: "経営に必要な3つの業務" },
  { id: "success-points", label: "成功するクリニックの3つのポイント" },
  { id: "failure-factors", label: "失敗するクリニックの共通点" },
  { id: "line-solution", label: "LINE活用で経営課題を解決" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── 倒産データ ── */}
      <section>
        <h2 id="bankruptcy-data" className="text-xl font-bold text-gray-800">医療機関の倒産が過去最多に</h2>
        <p>2024年の医療機関の倒産件数は<strong>64件</strong>で過去最多を記録しました。開業すれば安泰という時代は終わり、経営力がクリニックの存続を左右する時代です。</p>

        <BarChart
          data={[
            { label: "2018年", value: 40, color: "bg-gray-300" },
            { label: "2019年", value: 45, color: "bg-gray-300" },
            { label: "2020年", value: 27, color: "bg-gray-300" },
            { label: "2021年", value: 33, color: "bg-gray-300" },
            { label: "2022年", value: 41, color: "bg-gray-300" },
            { label: "2023年", value: 41, color: "bg-gray-300" },
            { label: "2024年", value: 64, color: "bg-red-500" },
          ]}
          unit="件"
        />

        <Callout type="warning" title="2024年は前年比56%増">
          医療機関の倒産が急増している背景には、人件費高騰・物価上昇・患者獲得競争の激化があります。「良い診療をしていれば患者は来る」という時代ではなくなりました。
        </Callout>
      </section>

      {/* ── 3つの業務 ── */}
      <section>
        <h2 id="three-tasks" className="text-xl font-bold text-gray-800">クリニック経営に必要な3つの業務</h2>
        <p>クリニックを成功させるためには、診療の質だけでなく、経営者として以下の3つの業務を回す必要があります。</p>

        <ComparisonTable
          headers={["業務領域", "主な内容", "課題"]}
          rows={[
            ["人材育成", "採用・教育・労務管理・離職防止", "慢性的な人手不足"],
            ["設備管理", "電子カルテ・予約システム・医療機器", "初期投資が高額"],
            ["資金繰り管理", "開業資金・運転資金・返済計画", "5,000万〜1億円の初期費用"],
          ]}
        />

        <Callout type="info" title="開業資金の目安">
          クリニックの開業には5,000万〜1億円程度の資金が必要です。自己資金に加え、日本政策金融公庫の融資を活用するのが一般的です。
        </Callout>
      </section>

      {/* ── 成功ポイント ── */}
      <section>
        <h2 id="success-points" className="text-xl font-bold text-gray-800">成功するクリニックの3つのポイント</h2>

        <FlowSteps steps={[
          { title: "患者ファーストの行動", desc: "待ち時間の短縮、丁寧な説明、利便性の高い予約方法など、患者目線でのサービス設計を徹底する。" },
          { title: "経営理念の策定と共有", desc: "クリニックが目指す方向性を明確にし、スタッフ全員で共有。採用基準や意思決定の軸になる。" },
          { title: "データに基づく経営判断", desc: "KPIをダッシュボードで管理し、予約数・リピート率・LTVなどの数値で経営状況を把握する。" },
        ]} />

        <StatGrid stats={[
          { value: "80", unit: "%", label: "LINEメッセージ開封率" },
          { value: "50", unit: "%", label: "キャンセル削減効果" },
          { value: "3", unit: "倍", label: "再診率向上" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 失敗要因 ── */}
      <section>
        <h2 id="failure-factors" className="text-xl font-bold text-gray-800">失敗するクリニックの共通点</h2>

        <Callout type="warning" title="倒産するクリニックに共通する3つの要因">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>経営知識の不足</strong> — 医療の専門家でも経営の専門家ではない。会計・マーケティング・労務の知識が不足</li>
            <li><strong>スタッフの定着率低下</strong> — 採用コストがかさみ、サービス品質も低下する悪循環</li>
            <li><strong>集患力の弱さ</strong> — WebサイトやSNSの活用が不十分で、新患獲得の導線がない</li>
          </ol>
        </Callout>

        <BarChart
          data={[
            { label: "経営知識不足", value: 85, color: "bg-red-400" },
            { label: "スタッフ離職", value: 72, color: "bg-red-400" },
            { label: "集患不足", value: 68, color: "bg-red-400" },
            { label: "設備投資過多", value: 45, color: "bg-gray-300" },
          ]}
          unit="%"
        />
      </section>

      {/* ── LINE活用 ── */}
      <section>
        <h2 id="line-solution" className="text-xl font-bold text-gray-800">LINE活用で経営課題を解決する</h2>
        <p>上記の失敗要因の多くは、LINEを活用したDX化で大幅に改善できます。</p>

        <ComparisonTable
          headers={["経営課題", "従来の対策", "LINE活用の解決策"]}
          rows={[
            ["集患力不足", "チラシ・HP・口コミ頼み", "LINE友だち追加→自動ナーチャリング"],
            ["スタッフ負荷", "電話予約・紙問診・手動リマインド", "予約・問診・リマインド自動化"],
            ["再診率低下", "DMハガキ（開封率12%）", "セグメント配信（開封率80%）"],
            ["キャンセル損失", "前日電話リマインド", "自動LINEリマインド+簡単変更"],
            ["データ不足", "紙カルテ・Excelで手集計", "ダッシュボードでKPIリアルタイム把握"],
          ]}
        />

        <ResultCard
          before="複数ツール月15〜30万+人件費"
          after="Lオペ1本で月15〜20万"
          metric="ツール代＋人件費をまとめて削減。事務スタッフ1人で運用完結"
        />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="クリニック経営成功の鍵">
          <ul className="mt-2 space-y-1">
            <li>• 診療の質だけでなく、経営力・集患力を高めることが不可欠</li>
            <li>• 患者ファースト × データドリブン × DX化の三位一体で経営基盤を強化</li>
            <li>• LINEを起点にした業務自動化で、スタッフの負荷を下げながら患者満足度を向上</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、クリニック経営に必要な予約・問診・配信・決済・分析をLINE公式アカウント上で一元化。経営の「攻め」と「守り」の両方を支援します。</p>
      </section>
    </ArticleLayout>
  );
}
