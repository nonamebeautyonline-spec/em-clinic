import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  BarChart,
  StatGrid,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "segment-delivery-repeat")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "LINEセグメント配信でクリニックのリピート率を向上させる方法の効果はどのくらいで実感できますか？", a: "施策にもよりますが、LINE配信やSEO対策は1〜3ヶ月で効果が出始めるケースが多いです。特にセグメント配信は導入直後から開封率・クリック率の改善が見られます。継続的な改善サイクルを回すことで、半年後には大きな成果に繋がります。" },
  { q: "集患施策にかかるコストはどのくらいですか？", a: "LINE公式アカウント自体は無料で開設でき、月額5,000〜15,000円程度で配信が可能です。Web広告と比較してCPA（獲得単価）が低く、既存患者のリピート促進にも効果的なため、費用対効果は非常に高いです。" },
  { q: "Web広告とLINE配信はどちらが効果的ですか？", a: "新規集患にはWeb広告、リピート促進にはLINE配信が効果的です。LINE配信はメッセージ開封率90%と圧倒的なリーチ力を持ち、既存患者への再来院促進・自費診療の訴求に適しています。両方を組み合わせるのが最も効率的です。" },
];

/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */
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
  "一斉配信ではリピート率が上がらない理由",
  "クリニックで使える5つのセグメント分類",
  "セグメント配信 vs 一斉配信の効果比較データ",
];

const toc = [
  { id: "why-not-mass", label: "一斉配信の限界" },
  { id: "five-segments", label: "5つのセグメント" },
  { id: "tips", label: "効果を最大化する3つのコツ" },
  { id: "comparison", label: "セグメント vs 一斉配信" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="セグメント配信" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックのリピート率を上げるには、一斉配信ではなくセグメント配信が不可欠です。診療科目・来院回数・最終来院日・年齢層・施術内容の<strong>5軸</strong>で患者を分類し、それぞれに最適なメッセージを届けることで、開封率・再診率ともに<strong>大幅な改善</strong>が見込めます。本記事では具体的な分類方法と効果比較データを紹介します。
      </p>

      <section>
        <h2 id="why-not-mass" className="text-xl font-bold text-gray-800">なぜ一斉配信ではリピート率が上がらないのか</h2>
        <p>多くのクリニックがLINE公式アカウントで一斉配信を行っていますが、全患者に同じメッセージを送っても効果は限定的です。</p>

        <Callout type="warning" title="一斉配信の根本的な問題">
          20代の美容目的の患者と60代の慢性疾患の患者では、必要な情報もフォローのタイミングも全く異なります。全員に同じメッセージを送ることは、患者にとって「不要な通知」となりブロックの原因になります。ブロック対策の詳細は<Link href="/lp/column/line-block-rate-reduction" className="text-emerald-700 underline">ブロック率を下げる5つの鉄則</Link>をご覧ください。
        </Callout>

        <BarChart
          data={[
            { label: "一斉配信 開封率", value: 65, color: "bg-gray-400" },
            { label: "セグメント配信 開封率", value: 85, color: "bg-sky-500" },
            { label: "一斉配信 クリック率", value: 4, color: "bg-gray-400" },
            { label: "セグメント配信 クリック率", value: 12, color: "bg-sky-500" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="five-segments" className="text-xl font-bold text-gray-800">クリニックで使える5つのセグメント</h2>

        <FlowSteps steps={[
          { title: "最終来院日ベース", desc: "3ヶ月未来院→再診促進、6ヶ月→定期検診リマインド、1年以上→復帰促進。最も基本的で効果の高いセグメント。" },
          { title: "診療科・施術内容ベース", desc: "過去の診療内容で分類。「前回のレーザー治療から1ヶ月経ちました」のようなパーソナルなフォローが可能。" },
          { title: "タグ・属性ベース", desc: "年齢層・性別・関心領域で分類。「40代女性 x エイジングケア関心」のようなターゲットキャンペーンを実施。" },
          { title: "来院回数ベース", desc: "初回来院→サンキュー+次回促進、3回以上→ロイヤル患者特別オファー、10回以上→VIP先行案内・優先予約。" },
          { title: "行動トリガーベース", desc: "「予約したがキャンセル」「問診未完了」「リンクをクリック」などの行動をトリガーに適切なフォローを自動送信。" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="tips" className="text-xl font-bold text-gray-800">セグメント配信の効果を最大化する3つのコツ</h2>

        <Callout type="point" title="コツ1: 配信タイミングを最適化する">
          クリニックの患者は平日日中は仕事中が多いため、<strong>平日18時〜20時</strong>または<strong>土日の午前中</strong>が開封率が高い傾向。セグメントごとに最適な時間帯をテストしましょう。季節に合わせた配信企画は<Link href="/lp/column/clinic-seasonal-campaign" className="text-sky-600 underline hover:text-sky-800">季節別配信戦略ガイド</Link>も参考になります。
        </Callout>

        <Callout type="point" title="コツ2: メッセージをパーソナルにする">
          名前の挿入だけでなく「前回ご来院の△△から3ヶ月が経ちました」のように、<strong>患者固有の情報を含める</strong>ことで反応率が大幅に向上します。
        </Callout>

        <Callout type="point" title="コツ3: 配信結果を分析・改善する">
          開封率・クリック率・予約転換率を計測し、効果の高いメッセージテンプレートを蓄積。PDCAを回すことで配信の精度が継続的に向上します。配信効果の測定方法は<Link href="/lp/column/clinic-line-analytics" className="text-sky-600 underline hover:text-sky-800">LINE配信効果測定ガイド</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">実際の成果: セグメント配信 vs 一斉配信</h2>

        <ComparisonTable
          headers={["指標", "一斉配信", "セグメント配信"]}
          rows={[
            ["開封率", "60〜70%", "80〜90%"],
            ["クリック率", "3〜5%", "10〜15%"],
            ["予約転換率", "1〜2%", "5〜8%"],
            ["ブロック率", "3〜5%/月", "0.5〜1%/月"],
            ["患者満足度", "「また営業か...」", "「自分に合った情報で助かる」"],
          ]}
        />

        <ResultCard before="3〜5%" after="0.5〜1%" metric="月間ブロック率" description="パーソナルな情報配信でブロック率が大幅に低下" />

        <Callout type="success" title="ブロック率の差が最重要指標">
          一斉配信は「自分に関係ない情報」が多くブロックされやすく、友だち数が減少していきます。セグメント配信なら患者に必要な情報だけを届けるためブロック率を低く抑えられます。
        </Callout>

        <StatGrid stats={[
          { value: "20〜30", unit: "%UP", label: "再来院率の向上" },
          { value: "3倍", unit: "", label: "クリック率の改善" },
          { value: "4倍", unit: "", label: "予約転換率の改善" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: セグメント配信でリピート率向上を実現</h2>
        <p>セグメント配信は、クリニックのLINE活用において<strong>最もROIが高い施策</strong>の一つです。一斉配信からセグメント配信に切り替えるだけで、再来院率が20〜30%向上するケースも珍しくありません。セグメント配信の効果を最大化するには、まず友だち数の母数を増やすことが重要です。具体的な施策は<Link href="/lp/column/clinic-line-friends-growth" className="text-emerald-700 underline">LINE友だち集め月100人増やす7つの施策</Link>で解説しています。</p>
        <p>Lオペ for CLINICなら、来院履歴・予約・決済データと連動した<Link href="/lp/features#メッセージ配信" className="text-sky-600 underline hover:text-sky-800">セグメント配信機能</Link>が標準搭載。クリニックに最適化されたセグメント設計を簡単に実現できます。導入クリニックの具体的な成果については<Link href="/lp/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link>もご覧ください。セグメント配信を含むLINE運用の全体像は<Link href="/lp/column/line-operation-guide" className="text-emerald-700 underline">LINE公式アカウント運用完全ガイド</Link>で体系的にまとめています。</p>
      </section>
    
      {/* ── FAQ ── */}
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
