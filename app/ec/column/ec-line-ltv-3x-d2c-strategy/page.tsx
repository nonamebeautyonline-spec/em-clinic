import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-ltv-3x-d2c-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LTVを3倍にするのにどのくらいの期間が必要ですか？", a: "12ヶ月の顧客ベースLTVで計測した場合、施策開始から6〜12ヶ月で効果が顕在化します。ただし、F2転換率やリピート率は3ヶ月で改善が見え始めるため、短期的な成果と長期的なLTV向上を並行して追えます。" },
  { q: "小規模D2Cでも同様の効果は期待できますか？", a: "はい、むしろ小規模D2C（月商100〜500万円）の方が効果が出やすい傾向があります。顧客数が少ない分、パーソナライズの質が高まり、1人1人との関係構築がしやすいためです。" },
  { q: "LINE CRMの導入コストは？", a: "Lオペ for ECの場合、初期費用・月額費用はプランにより異なります。詳しくはお問い合わせください。カゴ落ちリマインドの回収額だけでコストを上回るケースがほとんどで、ROIは初月からプラスになることが多いです。" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const keyPoints = [
  "D2CブランドがLINE×CRMでLTVを3倍にした戦略の全貌",
  "顧客セグメント設計からパーソナライズ配信までの具体的プロセス",
  "12ヶ月LTVの改善データと投資対効果",
];

const toc = [
  { id: "ltv-challenge", label: "D2CのLTV課題" },
  { id: "strategy-overview", label: "LTV 3倍戦略の全体像" },
  { id: "phase1", label: "Phase 1: 基盤構築（1〜3ヶ月）" },
  { id: "phase2", label: "Phase 2: 最適化（4〜6ヶ月）" },
  { id: "phase3", label: "Phase 3: スケール（7〜12ヶ月）" },
  { id: "ltv-data", label: "LTV改善データ" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LTV 3倍戦略" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">あるD2Cブランドは、LINE×CRMの導入で12ヶ月LTVを<strong>8,500円→25,500円（3倍）</strong>に引き上げました。新規獲得コストが上昇し続ける中、既存顧客のLTVを最大化することがD2Cの生命線です。その戦略の全貌を、CRM構築から成果データまで公開します。</p>

      <section>
        <h2 id="ltv-challenge" className="text-xl font-bold text-gray-800">D2CのLTV課題</h2>
        <StatGrid stats={[
          { value: "8,500", unit: "円", label: "施策前の12ヶ月LTV" },
          { value: "60%", label: "1回で離脱する顧客" },
          { value: "2〜3", unit: "倍", label: "3年間でのCAC上昇" },
        ]} />

        <p>多くのD2Cブランドが直面する構造的な課題は「CACの上昇」と「低いリピート率」の二重苦です。広告で獲得した顧客の60%が1回で離脱し、LTVが獲得コストを下回るケースも珍しくありません。</p>

        <Callout type="warning" title="LTV > CACが成立しなければ赤字">
          CACが5,000円でLTVが8,500円の場合、利益は3,500円。CACが8,000円に上昇すると利益はわずか500円に。LTVを3倍の25,500円にすれば、CACが上昇しても十分な利益を確保できます。
        </Callout>
      </section>

      <section>
        <h2 id="strategy-overview" className="text-xl font-bold text-gray-800">LTV 3倍戦略の全体像</h2>
        <ComparisonTable
          headers={["LTV要素", "施策前", "施策後", "改善率"]}
          rows={[
            ["F2転換率", "25%", "42%", "1.7倍"],
            ["リピート率（年間）", "22%", "48%", "2.2倍"],
            ["平均客単価", "4,200円", "5,800円", "1.4倍"],
            ["年間購入回数", "1.8回", "3.5回", "1.9倍"],
            ["12ヶ月LTV", "8,500円", "25,500円", "3.0倍"],
          ]}
        />
      </section>

      <section>
        <h2 id="phase1" className="text-xl font-bold text-gray-800">Phase 1: 基盤構築（1〜3ヶ月）</h2>
        <FlowSteps steps={[
          { title: "ECカート×LINE連携", desc: "Shopify連携→カゴ落ちリマインド3段階→発送通知自動化。月商+15%を即座に実現" },
          { title: "友だち獲得施策", desc: "購入完了ページ + 同梱カード + メルマガ告知で友だちを獲得。月200〜500人ペース" },
          { title: "F2転換シナリオ構築", desc: "配達翌日: 使い方ガイド→7日後: レビュー依頼→14日後: 2回目クーポン" },
        ]} />

        <ResultCard before="Phase 1開始時" after="Phase 1終了時（3ヶ月後）" metric="月商の推移" description="500万円→600万円（+20%）カゴ落ち回収とF2転換の効果" />
      </section>

      <section>
        <h2 id="phase2" className="text-xl font-bold text-gray-800">Phase 2: 最適化（4〜6ヶ月）</h2>
        <FlowSteps steps={[
          { title: "RFMセグメント配信", desc: "一斉配信からRFMセグメント配信に全面切り替え。CV率2倍・ブロック率50%削減" },
          { title: "顧客ランク制度導入", desc: "4段階ランク制度を設計。ランクアップ通知でLINE配信のモチベーション向上" },
          { title: "クロスセルシナリオ追加", desc: "購入商品に基づく関連提案を自動化。客単価25%向上" },
        ]} />

        <StatGrid stats={[
          { value: "2", unit: "倍", label: "セグメント配信のCV率" },
          { value: "50%", unit: "削減", label: "ブロック率の改善" },
          { value: "25%", unit: "UP", label: "クロスセルによる客単価向上" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="phase3" className="text-xl font-bold text-gray-800">Phase 3: スケール（7〜12ヶ月）</h2>
        <FlowSteps steps={[
          { title: "VIP施策の本格化", desc: "先行セール・限定商品・アンバサダー制度でVIP顧客のロイヤルティを最大化" },
          { title: "休眠復帰の自動化", desc: "5段階の復帰シナリオで休眠率を半減。新規獲得の1/5のコストで顧客を回復" },
          { title: "UGC活用の拡大", desc: "レビュー・SNS投稿を広告素材に活用。UGC広告のCVRは自社素材の2.3倍" },
          { title: "データドリブンの改善", desc: "A/Bテスト→効果計測→改善のサイクルを毎週実施。KPIダッシュボードで進捗管理" },
        ]} />
      </section>

      <section>
        <h2 id="ltv-data" className="text-xl font-bold text-gray-800">LTV改善データ</h2>

        <BarChart
          data={[
            { label: "施策前", value: 8500, color: "#ef4444" },
            { label: "Phase 1後（3ヶ月）", value: 12000, color: "#f59e0b" },
            { label: "Phase 2後（6ヶ月）", value: 18000, color: "#3b82f6" },
            { label: "Phase 3後（12ヶ月）", value: 25500, color: "#22c55e" },
          ]}
          unit="円（12ヶ月LTV）"
        />

        <ComparisonTable
          headers={["指標", "施策前", "12ヶ月後", "改善率"]}
          rows={[
            ["12ヶ月LTV", "8,500円", "25,500円", "3.0倍"],
            ["F2転換率", "25%", "42%", "+68%"],
            ["年間リピート率", "22%", "48%", "+118%"],
            ["客単価", "4,200円", "5,800円", "+38%"],
            ["LINE経由売上比率", "0%", "35%", "—"],
            ["月間ブロック率", "—", "1.8%", "健全水準"],
          ]}
        />

        <ResultCard before="12ヶ月LTV 8,500円" after="12ヶ月LTV 25,500円" metric="顧客生涯価値" description="LINE×CRM導入で3倍に向上" />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>LTVの最大化がD2Cの生命線</strong> — CACが上昇する中、既存顧客の価値を3倍にする</li>
          <li><strong>3フェーズで段階的に構築</strong> — 基盤（カゴ落ち+F2転換）→最適化（セグメント+ランク）→スケール（VIP+UGC）</li>
          <li><strong>F2転換率の改善が最もインパクト大</strong> — 詳しくは<Link href="/ec/column/ec-repeat-purchase-scenario" className="text-blue-600 underline">リピート購入シナリオ</Link>で解説</li>
          <li><strong>CRM全体の設計は</strong><Link href="/ec/column/ec-line-crm-strategy" className="text-blue-600 underline">D2C LINE CRM戦略</Link>を、ファン育成は<Link href="/ec/column/d2c-brand-line-marketing-strategy" className="text-blue-600 underline">D2Cマーケティング戦略</Link>も参照</li>
        </ol>
        <p className="mt-4">Lオペ for ECは、LINE×CRMの導入からLTV最大化まで、D2Cブランドの成長を一気通貫でサポートします。まずは無料相談からお気軽にお問い合わせください。</p>
      </section>

      <p className="text-xs text-gray-400 mt-8 mb-2">※本記事の事例は、複数の導入実績をもとに再構成したものです。実際の効果はご利用状況により異なります。</p>

      <section id="faq">
        <h2 className="text-2xl font-bold mt-12 mb-6">よくある質問</h2>
        {faqItems.map((item, i) => (
          <div key={i} className="mb-6 rounded-lg border border-gray-200 p-5">
            <h3 className="font-bold text-lg mb-2">Q. {item.q}</h3>
            <p className="text-gray-700 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </section>
    </ArticleLayout>
  );
}
