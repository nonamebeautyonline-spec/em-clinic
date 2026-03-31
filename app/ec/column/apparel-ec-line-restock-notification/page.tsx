import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "apparel-ec-line-restock-notification")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "再入荷通知の登録者の購入率はどのくらいですか？", a: "LINE経由の再入荷通知では、登録者の40〜55%が実際に購入するデータがあります。メール経由の15〜20%と比較して2〜3倍の効果です。" },
  { q: "コーディネート提案は手動で作る必要がありますか？", a: "商品データベースに「合わせやすいアイテム」の紐づけを登録しておけば、購入商品に応じたコーディネート提案を自動生成できます。Lオペ for ECでは商品間のリレーション設定が可能です。" },
  { q: "季節セールの先行案内はどの程度前がよいですか？", a: "VIP顧客には48時間前、一般会員には24時間前が効果的です。先行案内の対象を絞ることで「特別感」が生まれ、開封率とCV率が一斉告知の2倍になります。" },
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
  "再入荷通知で購入率40〜55%を実現する方法",
  "コーディネート提案によるクロスセルで客単価25%向上",
  "季節セールのセグメント配信戦略",
];

const toc = [
  { id: "apparel-challenges", label: "アパレルEC特有の課題" },
  { id: "restock-notification", label: "再入荷通知の設計" },
  { id: "coordinate-suggestion", label: "コーディネート提案" },
  { id: "seasonal-campaign", label: "季節キャンペーン配信" },
  { id: "size-concern", label: "サイズ不安の解消" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="アパレルEC活用術" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">アパレルECは「サイズ・カラーの売り切れ」が機会損失の最大要因。LINEの再入荷通知で売り切れ商品の<strong>購入率40〜55%</strong>を実現し、コーディネート提案で客単価<strong>25%アップ</strong>を達成した手法を紹介します。</p>

      <section>
        <h2 id="apparel-challenges" className="text-xl font-bold text-gray-800">アパレルEC特有の課題</h2>
        <BarChart
          data={[
            { label: "サイズ・カラー在庫切れ", value: 35, color: "#ef4444" },
            { label: "サイズが合うか不安", value: 28, color: "#f59e0b" },
            { label: "コーディネートがわからない", value: 18, color: "#3b82f6" },
            { label: "セール時期を待つ", value: 12, color: "#8b5cf6" },
            { label: "送料・返品の不安", value: 7, color: "#ec4899" },
          ]}
          unit="%（アパレルEC離脱理由）"
        />
      </section>

      <section>
        <h2 id="restock-notification" className="text-xl font-bold text-gray-800">再入荷通知の設計</h2>
        <FlowSteps steps={[
          { title: "在庫切れ表示時にLINE登録", desc: "「再入荷をLINEで通知する」ボタンを商品ページに設置。サイズ・カラー別に登録可能" },
          { title: "再入荷時に即時LINE配信", desc: "在庫補充と同時にLINEで通知。「○○さん、お待ちのMサイズ/ブラックが再入荷しました」" },
          { title: "24時間限定の先行購入権", desc: "再入荷通知登録者には24時間の先行購入権を付与。一般公開前に購入可能" },
        ]} />

        <ResultCard before="メール再入荷通知（購入率18%）" after="LINE再入荷通知（購入率48%）" metric="再入荷通知からの購入率" description="2.7倍の購入率を実現" />
      </section>

      <section>
        <h2 id="coordinate-suggestion" className="text-xl font-bold text-gray-800">コーディネート提案によるクロスセル</h2>
        <ComparisonTable
          headers={["購入商品", "提案商品", "配信タイミング", "追加購入率"]}
          rows={[
            ["トップス", "ボトムス・アウター", "購入3日後", "15〜20%"],
            ["ワンピース", "アクセサリー・バッグ", "購入5日後", "12〜18%"],
            ["アウター", "インナー・マフラー", "購入3日後", "18〜25%"],
            ["パンツ", "ベルト・シューズ", "購入5日後", "10〜15%"],
          ]}
        />

        <Callout type="success" title="コーディネート提案で客単価25%アップ">
          購入商品に合わせたコーディネート提案をLINEカード形式で配信。「○○に合わせるなら」という文脈での提案は、一般的なレコメンドの2倍のクリック率を記録しています。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="seasonal-campaign" className="text-xl font-bold text-gray-800">季節キャンペーン配信</h2>
        <ComparisonTable
          headers={["キャンペーン", "セグメント", "配信内容"]}
          rows={[
            ["春物先行", "昨年春物購入者", "新作春物コレクション先行案内"],
            ["サマーセール", "夏物閲覧歴あり", "VIP先行→一般公開の2段階"],
            ["秋冬新作", "アウター購入者", "新作アウター + 限定クーポン"],
            ["年末セール", "全友だち（ランク別）", "ランク別割引率で配信"],
          ]}
        />
      </section>

      <section>
        <h2 id="size-concern" className="text-xl font-bold text-gray-800">サイズ不安の解消</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>サイズガイド配信</strong> — カゴ落ちリマインドにサイズガイドリンクを添付。「サイズが不安ですか？」</li>
          <li><strong>返品・交換の安心案内</strong> — 「サイズ交換無料」「30日間返品OK」をリマインドに明記</li>
          <li><strong>チャットでのサイズ相談</strong> — LINEトーク画面でスタッフに身長・体型を伝えると最適サイズを提案</li>
        </ul>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <StatGrid stats={[
          { value: "48%", label: "再入荷通知の購入率" },
          { value: "25%", unit: "UP", label: "コーデ提案による客単価向上" },
          { value: "2", unit: "倍", label: "季節セールのLINE経由売上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>再入荷通知でサイズ・カラー切れの機会損失を回収</strong> — 購入率40〜55%の強力な施策</li>
          <li><strong>コーディネート提案で客単価25%向上</strong> — 購入商品に合わせた文脈提案が効果的</li>
          <li><strong>季節セールはセグメント配信で効果2倍</strong> — VIP先行→一般公開の段階配信</li>
          <li><strong>セグメント設計の詳細は</strong><Link href="/ec/column/ec-segment-delivery-purchase-data" className="text-blue-600 underline">購買データ活用配信</Link>を、カゴ落ち対策は<Link href="/ec/column/line-cart-abandonment-recovery-guide" className="text-blue-600 underline">カゴ落ち回収ガイド</Link>も参照</li>
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
