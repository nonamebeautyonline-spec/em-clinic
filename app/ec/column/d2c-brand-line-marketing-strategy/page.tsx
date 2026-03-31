import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "d2c-brand-line-marketing-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "D2CブランドがLINEを活用するメリットは？", a: "D2Cは仲介業者を介さず顧客と直接つながるビジネスモデルです。LINEは開封率60〜80%のダイレクトチャネルとして、ブランドストーリーの伝達・ファンコミュニティの育成・リピート促進を一気通貫で実現できます。" },
  { q: "ファンコミュニティとLINEの相性が良い理由は？", a: "LINEのトーク画面は1:1の親密なコミュニケーション空間です。SNSのようなパブリックな場ではなく、ブランドと顧客が直接対話できる「内輪感」がファンの帰属意識を高めます。" },
  { q: "D2CのLINE運用で最初に取り組むべきことは？", a: "まずはECカート連携→カゴ落ちリマインド→発送通知の自動化から始め、売上への直接効果を実感しましょう。その上でブランドストーリー配信やファン施策を段階的に追加していくのが効果的です。" },
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
  "D2CブランドのLINEマーケティング戦略の全体像",
  "ファンコミュニティ育成からVIP施策までの具体的手法",
  "ブランドストーリー配信とUGC活用のベストプラクティス",
];

const toc = [
  { id: "d2c-challenges", label: "D2Cブランドの課題" },
  { id: "fan-building", label: "LINEでファンを育てる" },
  { id: "brand-story", label: "ブランドストーリー配信" },
  { id: "vip-strategy", label: "VIP施策の設計" },
  { id: "ugc-strategy", label: "UGC活用戦略" },
  { id: "results", label: "成果事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="D2CブランドLINE戦略" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">D2Cブランドの成長は「広告依存の新規獲得」から「ファンベースの有機的成長」にシフトしています。LINEを核としたファンコミュニティ育成で、<strong>LTV 3倍・口コミ経由売上30%</strong>を実現したD2Cブランドの戦略を紹介します。</p>

      <section>
        <h2 id="d2c-challenges" className="text-xl font-bold text-gray-800">D2Cブランドの課題</h2>
        <StatGrid stats={[
          { value: "2〜3", unit: "倍", label: "3年間でのCAC上昇" },
          { value: "60%", label: "1回購入で離脱する顧客" },
          { value: "10%", unit: "未満", label: "ファン層（売上の50%を生む）" },
        ]} />

        <p>広告費の高騰でCACが上昇し続ける中、D2Cブランドが持続的に成長するには「ファン」を育て、リピート購入と口コミによるオーガニック成長を実現する必要があります。</p>
      </section>

      <section>
        <h2 id="fan-building" className="text-xl font-bold text-gray-800">LINEでファンを育てる</h2>
        <FlowSteps steps={[
          { title: "Phase 1: 認知→友だち追加", desc: "初回購入特典・SNS誘導・商品同梱カードでLINE友だちを獲得" },
          { title: "Phase 2: 信頼構築", desc: "ウェルカムシリーズでブランドの理念・こだわり・開発ストーリーを段階的に配信" },
          { title: "Phase 3: リピート促進", desc: "購買サイクルに合わせたリマインド・クロスセル・新商品先行案内" },
          { title: "Phase 4: ファン化", desc: "VIP施策・アンバサダー制度・限定イベント招待でブランドの「仲間」に" },
        ]} />
      </section>

      <section>
        <h2 id="brand-story" className="text-xl font-bold text-gray-800">ブランドストーリー配信</h2>
        <ComparisonTable
          headers={["配信内容", "配信タイミング", "効果"]}
          rows={[
            ["創業ストーリー", "友だち追加3日後", "ブランドへの共感・信頼構築"],
            ["商品開発の裏側", "友だち追加7日後", "商品への愛着・理解深化"],
            ["お客様の声", "友だち追加14日後", "社会的証明・購入後押し"],
            ["社会貢献活動", "月1回", "ブランド価値・ロイヤルティ向上"],
          ]}
        />

        <Callout type="point" title="売り込みではなく「共感」が鍵">
          D2Cブランドのストーリー配信は、商品を売るためではなく「なぜこの商品を作っているか」を伝えることが目的です。共感がファン化の起点になります。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="vip-strategy" className="text-xl font-bold text-gray-800">VIP施策の設計</h2>
        <ComparisonTable
          headers={["VIP施策", "内容", "効果"]}
          rows={[
            ["先行セール", "一般公開48時間前にアクセス権", "VIP購入率45%"],
            ["限定商品", "VIPのみ購入可能なコラボ商品", "即日完売率80%"],
            ["開発参加", "新商品のフレーバー・カラー投票", "エンゲージメント5倍"],
            ["限定イベント", "ポップアップストア・試飲会", "NPS +30"],
          ]}
        />
      </section>

      <section>
        <h2 id="ugc-strategy" className="text-xl font-bold text-gray-800">UGC活用戦略</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>レビュー × クーポン</strong> — 写真付きレビューで次回1,000円OFFクーポン進呈</li>
          <li><strong>SNS投稿キャンペーン</strong> — ハッシュタグ投稿でプレゼント。UGC素材を広告に二次利用</li>
          <li><strong>アンバサダー制度</strong> — 熱量の高いファンにサンプル提供→レビュー・SNS投稿を依頼</li>
        </ul>

        <ResultCard before="広告素材のみ" after="UGC活用広告" metric="広告CVR" description="1.2%→2.8%に向上（2.3倍）" />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">成果事例</h2>
        <StatGrid stats={[
          { value: "3", unit: "倍", label: "顧客LTVの向上" },
          { value: "30%", label: "口コミ経由の売上比率" },
          { value: "45%", label: "VIP層のリピート率" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>D2Cの成長はファン育成にかかっている</strong> — 広告依存から脱却し、LTVとオーガニック成長を最大化</li>
          <li><strong>LINEはD2Cの最適なファン育成チャネル</strong> — 親密な1:1コミュニケーションで信頼を構築</li>
          <li><strong>ブランドストーリーで共感を生む</strong> — 売り込みではなく理念の共有がファン化の起点</li>
          <li><strong>CRM全体設計は</strong><Link href="/ec/column/ec-line-crm-strategy" className="text-blue-600 underline">LINE CRM戦略</Link>を、LTV最大化の全貌は<Link href="/ec/column/ec-line-ltv-3x-d2c-strategy" className="text-blue-600 underline">LTV 3倍戦略</Link>も参照</li>
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
