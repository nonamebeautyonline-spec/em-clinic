import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-birthday-coupon-line-automation")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "誕生日情報はどうやって収集しますか？", a: "友だち追加時のアンケートや、来店時のカルテ記入、LINEのリッチメニューから誕生月を登録してもらう方法があります。「誕生月を登録すると毎年バースデー特典が届きます」と案内すると登録率が高くなります。" },
  { q: "誕生日クーポンの最適な配信タイミングは？", a: "誕生日の2週間前が最適です。当日だと予約が間に合わないケースが多く、1ヶ月前だと忘れられてしまいます。2週間前に送り、有効期限を誕生月の末日に設定するのがベストです。" },
  { q: "誕生日クーポンの割引率はどのくらいが適切ですか？", a: "通常クーポンよりも割引率を上げて特別感を出しましょう。通常10%OFFなら誕生日は20%OFF、通常500円OFFなら誕生日は1,000円OFFが目安です。プレゼント（ミニトリートメント無料など）の方が特別感が出る場合もあります。" },
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
  "誕生日クーポンの自動配信設定手順と最適なタイミング",
  "誕生日クーポンの利用率を最大化する特典設計",
  "年間を通じた安定した来店動機の創出方法",
];

const toc = [
  { id: "why-birthday", label: "誕生日クーポンが効果的な理由" },
  { id: "data-collection", label: "誕生日データの収集方法" },
  { id: "setup", label: "自動配信の設定手順" },
  { id: "design", label: "効果を最大化する特典設計" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="誕生日クーポン自動配信" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">誕生日クーポンは<strong>利用率30%以上</strong>を誇るサロンの鉄板施策です。LINEの自動配信を活用すれば、一度設定するだけで毎年自動的にお客様の誕生月にクーポンが届く仕組みを構築できます。</p>

      <section>
        <h2 id="why-birthday" className="text-xl font-bold text-gray-800">誕生日クーポンが効果的な理由</h2>

        <StatGrid stats={[
          { value: "30%", unit: "以上", label: "誕生日クーポンの利用率" },
          { value: "3倍", label: "通常クーポンと比較した反応率" },
          { value: "1.5倍", label: "誕生日来店時の平均客単価" },
        ]} />

        <p>誕生日は「自分へのご褒美」としてサロンに行く動機が最も強い時期です。さらに、カラーチェンジやスペシャルメニューに挑戦しやすいため、客単価も通常より高くなる傾向があります。</p>

        <Callout type="success" title="特別感が口コミを生む">
          「サロンから誕生日にお祝いメッセージが届いた」という体験は、お客様の満足度と信頼感を高めます。SNSで「嬉しい！」とシェアしてくれるケースも多く、自然な口コミにつながります。
        </Callout>
      </section>

      <section>
        <h2 id="data-collection" className="text-xl font-bold text-gray-800">誕生日データの収集方法</h2>

        <BarChart
          data={[
            { label: "友だち追加時アンケート", value: 45, color: "#22c55e" },
            { label: "来店時カルテ記入", value: 30, color: "#3b82f6" },
            { label: "リッチメニュー登録", value: 15, color: "#f59e0b" },
            { label: "キャンペーン連動", value: 10, color: "#a855f7" },
          ]}
          unit="%"
        />

        <Callout type="point" title="収集率を上げるコツ">
          「誕生月を登録すると、毎年バースデー特別クーポンが届きます」と明確なメリットを提示すること。登録率は通常30%程度ですが、メリットを提示すると60%以上に向上します。
        </Callout>
      </section>

      <section>
        <h2 id="setup" className="text-xl font-bold text-gray-800">自動配信の設定手順</h2>

        <FlowSteps steps={[
          { title: "誕生月タグの設計", desc: "「1月生まれ」「2月生まれ」...「12月生まれ」の12タグを作成" },
          { title: "メッセージの作成", desc: "お祝いメッセージ＋クーポン画像＋予約リンクを1つのメッセージに" },
          { title: "自動配信ルールの設定", desc: "毎月1日に該当月のタグがついた友だちに自動配信する設定" },
          { title: "テスト配信", desc: "自分のアカウントでテスト配信して表示・リンクを確認" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="design" className="text-xl font-bold text-gray-800">効果を最大化する特典設計</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">割引型の特典</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>定額割引</strong> — 1,000円OFF（客単価が低いサロン向け）</li>
          <li><strong>定率割引</strong> — 20%OFF（客単価が高いサロン向け）</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">プレゼント型の特典（おすすめ）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>ミニトリートメント無料</strong> — 原価は低いが満足度が高い</li>
          <li><strong>ヘッドスパ10分サービス</strong> — 体験型で記憶に残りやすい</li>
          <li><strong>ホームケア商品プレゼント</strong> — 試供品の活用で物販にもつながる</li>
        </ul>

        <Callout type="point" title="プレゼント型が効果的な理由">
          割引は「安くなった」ですが、プレゼントは「もらえた」という感情になります。心理的な嬉しさはプレゼント型の方が大きく、リピート率も高い傾向があります。クーポン設計の全般は<Link href="/salon/column/salon-line-coupon-design-best-practices" className="text-blue-600 underline">クーポン設計ベストプラクティス</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <ResultCard before="10%（通常クーポン）" after="32%（誕生日クーポン）" metric="クーポン利用率" description="特別感のある特典設計で大幅に向上" />

        <StatGrid stats={[
          { value: "32%", label: "誕生日クーポンの利用率" },
          { value: "1.5倍", label: "来店時の客単価（通常比）" },
          { value: "月8〜12名", label: "追加来店数（友だち500人のサロン）" },
        ]} />

        <p>リピート率向上の全体戦略は<Link href="/salon/column/salon-repeat-rate-line-delivery-strategy" className="text-blue-600 underline">リピート率を上げるLINE配信術</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>誕生日クーポンは利用率30%超の鉄板施策</strong> — 通常クーポンの3倍の反応率</li>
          <li><strong>自動配信で完全自動化</strong> — 一度設定すれば毎年自動で配信</li>
          <li><strong>プレゼント型特典がおすすめ</strong> — 割引よりも心理的な満足度が高い</li>
          <li><strong>誕生日データの収集が肝</strong> — メリットを明示して登録率60%を目指す</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、誕生日クーポンの自動配信を標準機能として搭載。タグ設定から配信まで、設定は10分で完了します。</p>
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
