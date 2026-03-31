import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-coupon-line-distribution-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINEクーポンの利用率の目安はどのくらいですか？", a: "LINEクーポンの平均利用率は15〜30%です。メールクーポンの5〜10%と比較して2〜3倍高く、特に友だち追加時の初回クーポンは利用率40%を超えるケースもあります。" },
  { q: "クーポンを配り過ぎるとブランド価値が下がりませんか？", a: "頻繁に全員へ割引クーポンを配布すると「安売りブランド」の印象を与えるリスクがあります。セグメント別にクーポン内容を変え、VIP限定・誕生日限定など「特別感」のある設計にすることでブランド価値を維持できます。" },
  { q: "送料無料と%OFFではどちらが効果的ですか？", a: "商品単価5,000円以下の場合は送料無料の方が効果的です。送料がカゴ落ちの最大理由（48%）であるため、送料の壁を取り除くことで購入完了率が大きく改善します。高単価商品は%OFFの方がお得感が伝わります。" },
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
  "初回購入・リピート・休眠復帰の目的別クーポン設計",
  "割引率の最適化と利益を守るルール",
  "LINEクーポンの利用率を最大化する配信テクニック",
];

const toc = [
  { id: "coupon-types", label: "目的別クーポンの種類" },
  { id: "first-purchase", label: "初回購入クーポン" },
  { id: "repeat-coupon", label: "リピート促進クーポン" },
  { id: "dormant-coupon", label: "休眠復帰クーポン" },
  { id: "seasonal-coupon", label: "季節・イベントクーポン" },
  { id: "profit-rules", label: "利益を守るルール" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="クーポン配信戦略" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEクーポンの平均利用率は<strong>15〜30%</strong>で、メールの2〜3倍の効果があります。しかし闇雲にクーポンを配布すると利益を圧迫し、ブランド価値を毀損します。目的別の最適なクーポン設計と利益を守るルールを解説します。</p>

      <section>
        <h2 id="coupon-types" className="text-xl font-bold text-gray-800">目的別クーポンの種類</h2>

        <ComparisonTable
          headers={["クーポン目的", "対象", "割引率", "利用率の目安"]}
          rows={[
            ["初回購入促進", "未購入の友だち", "10〜15%", "35〜45%"],
            ["F2転換（2回目促進）", "初回購入者", "10%", "20〜30%"],
            ["リピート継続", "3回目以降の顧客", "5〜8%", "25〜35%"],
            ["休眠復帰", "90日以上未購入", "15〜20%", "8〜15%"],
            ["誕生日特典", "誕生月の顧客", "10%+送料無料", "30〜40%"],
            ["VIP限定", "上位10%の顧客", "先行アクセス", "40〜55%"],
          ]}
        />
      </section>

      <section>
        <h2 id="first-purchase" className="text-xl font-bold text-gray-800">初回購入クーポン</h2>

        <FlowSteps steps={[
          { title: "友だち追加時に即時配信", desc: "「LINE友だち限定10%OFFクーポン」を自動配信。有効期限は7日間" },
          { title: "3日後にリマインド", desc: "未使用の場合「クーポンの期限が近づいています」とリマインド" },
          { title: "6日後に最終案内", desc: "「明日で期限切れです」と緊急性を訴求" },
        ]} />

        <StatGrid stats={[
          { value: "10〜15%", label: "初回クーポンの推奨割引率" },
          { value: "7", unit: "日間", label: "推奨有効期限" },
          { value: "35〜45%", label: "利用率の目安" },
        ]} />

        <Callout type="success" title="初回クーポンは友だち獲得と同時に設計">
          「LINE友だち追加で初回10%OFF」は、友だち獲得施策と初回購入促進を同時に実現する最も効果的な施策です。購入完了ページへのLINE誘導と組み合わせることで効果を最大化できます。
        </Callout>
      </section>

      <section>
        <h2 id="repeat-coupon" className="text-xl font-bold text-gray-800">リピート促進クーポン</h2>

        <ComparisonTable
          headers={["シーン", "クーポン内容", "配信タイミング"]}
          rows={[
            ["F2転換", "2回目購入10%OFF", "初回購入14日後"],
            ["3回目購入", "リピーター感謝5%OFF", "2回目購入後サイクル5日前"],
            ["まとめ買い促進", "3点以上で15%OFF", "購買サイクル到来時"],
            ["クロスセル", "関連商品500円OFF", "初回購入7日後"],
          ]}
        />

        <Callout type="point" title="F2転換クーポンが最もROIが高い">
          初回→2回目の購入促進クーポンは、新規顧客獲得コストの1/5以下で顧客をリピーターに転換できるため、EC全体のROIに最も大きなインパクトを与えます。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="dormant-coupon" className="text-xl font-bold text-gray-800">休眠復帰クーポン</h2>

        <FlowSteps steps={[
          { title: "90日経過: ソフトリマインド", desc: "「最近ご利用いただけていません」+ 新商品紹介。クーポンなし" },
          { title: "120日経過: 復帰クーポン", desc: "「お帰りなさいクーポン15%OFF」有効期限14日間" },
          { title: "150日経過: 最終案内", desc: "「最後のご案内です」20%OFFクーポン + 人気商品" },
        ]} />

        <ResultCard before="休眠復帰率 3%" after="休眠復帰率 12%" metric="90日以上休眠からの復帰率" description="段階的な復帰シナリオで4倍に改善" />
      </section>

      <section>
        <h2 id="seasonal-coupon" className="text-xl font-bold text-gray-800">季節・イベントクーポン</h2>

        <BarChart
          data={[
            { label: "誕生日クーポン", value: 35, color: "#22c55e" },
            { label: "年末年始セール", value: 28, color: "#3b82f6" },
            { label: "ブラックフライデー", value: 32, color: "#f59e0b" },
            { label: "記念日（登録1周年等）", value: 25, color: "#ec4899" },
            { label: "季節の変わり目", value: 18, color: "#8b5cf6" },
          ]}
          unit="%（クーポン利用率）"
        />

        <Callout type="point" title="誕生日クーポンは特別感が重要">
          誕生日クーポンは「%OFF + 送料無料」のダブル特典が効果的です。「お誕生日おめでとうございます」というパーソナルなメッセージと組み合わせることで、ブランドロイヤルティの向上にもつながります。
        </Callout>
      </section>

      <section>
        <h2 id="profit-rules" className="text-xl font-bold text-gray-800">利益を守るためのルール</h2>

        <FlowSteps steps={[
          { title: "月間割引予算を設定", desc: "月間売上の3〜5%を割引予算の上限とし、超過しないように管理" },
          { title: "セグメント別に割引率を変える", desc: "VIPには先行アクセス、新規には%OFF、休眠には高めの割引。一律割引は厳禁" },
          { title: "セール商品はクーポン対象外", desc: "既に値下げされている商品への二重割引を防止" },
          { title: "月次でROIを検証", desc: "クーポンあたりの利益貢献額を計算し、効果の低いクーポンは廃止" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>目的別にクーポンを設計</strong> — 初回・リピート・休眠復帰で割引率と配信タイミングを変える</li>
          <li><strong>F2転換クーポンが最もROIが高い</strong> — 新規獲得コストの1/5でリピーターに転換</li>
          <li><strong>休眠復帰は段階的にアプローチ</strong> — 詳細は<Link href="/ec/column/ec-dormant-customer-reactivation-line" className="text-blue-600 underline">休眠顧客の復帰シナリオ</Link>で解説</li>
          <li><strong>利益を守るルールを必ず設定</strong> — 配信設計全体は<Link href="/ec/column/ec-segment-delivery-purchase-data" className="text-blue-600 underline">セグメント配信</Link>も参照</li>
        </ol>
      </section>

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
