import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ResultCard,
  BarChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-official-account-first-month-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "友だちが10人しかいない段階でも配信すべきですか？", a: "はい、少人数でも配信すべきです。初期段階の配信はコンテンツのテスト（開封率・クリック率の確認）として活用でき、友だちが増えた後の本格配信に向けた知見を蓄積できます。" },
  { q: "最初の1ヶ月で友だちは何人くらい集まりますか？", a: "業種や集客施策によりますが、実店舗がある場合は来店客への声掛け+QRコードで月50〜100人が目安です。Web中心の場合はSNS連携や広告活用で同等の数値を目指せます。" },
  { q: "最初の1ヶ月で一番大切なことは何ですか？", a: "友だち追加の導線を確立することです。どんなに良いコンテンツを用意しても、友だちがいなければ配信の効果は出ません。まずは友だちを集める仕組み作りに注力しましょう。" },
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
  "運用開始1ヶ月のロードマップを週単位で具体的に解説",
  "友だち集めの施策から初回配信、効果測定までをカバー",
  "最初の30日間で成果を出すための実践的なアクションプラン",
];

const toc = [
  { id: "roadmap", label: "1ヶ月ロードマップ全体像" },
  { id: "week1", label: "1週目: 友だち追加の導線構築" },
  { id: "week2", label: "2週目: 初回配信とコンテンツ準備" },
  { id: "week3", label: "3週目: 友だち集めの加速" },
  { id: "week4", label: "4週目: 効果測定と改善" },
  { id: "kpi", label: "追うべきKPI" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE公式アカウント入門" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントは<strong>開設しただけでは成果は出ません</strong>。運用開始後の最初の1ヶ月で何をやるかが、その後の成果を大きく左右します。本記事では<strong>友だち集め・初回配信・効果測定</strong>まで、最初の30日間のロードマップを週単位で具体的に解説します。</p>

      {/* ── ロードマップ ── */}
      <section>
        <h2 id="roadmap" className="text-xl font-bold text-gray-800">1ヶ月ロードマップ全体像</h2>

        <FlowSteps steps={[
          { title: "1週目: 土台づくり", desc: "友だち追加の導線を構築し、QRコードやURLをあらゆるタッチポイントに設置する。" },
          { title: "2週目: コンテンツ配信", desc: "初回の配信を実施し、開封率・クリック率のベースラインを把握する。" },
          { title: "3週目: 集客加速", desc: "SNS連携や友だち追加特典を活用して友だち数を加速させる。" },
          { title: "4週目: 振り返り", desc: "1ヶ月の数値を分析し、翌月の配信計画を策定する。" },
        ]} />

        <StatGrid stats={[
          { value: "100", unit: "人", label: "1ヶ月目の友だち目標" },
          { value: "4", unit: "回", label: "月間配信回数の目安" },
          { value: "60", unit: "%+", label: "目標開封率" },
        ]} />
      </section>

      {/* ── 1週目 ── */}
      <section>
        <h2 id="week1" className="text-xl font-bold text-gray-800">1週目: 友だち追加の導線構築</h2>
        <p>まずは「友だちが増える仕組み」を作ることが最優先です。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>QRコード作成・設置</strong>: 店頭POP、レジ横、名刺、チラシにQRコードを設置</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>WebサイトにLINEボタン設置</strong>: ヘッダー・フッター・コンタクトページにLINE友だち追加ボタンを設置</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>SNSプロフィールにURL追加</strong>: Instagram・X（旧Twitter）のプロフィールにLINE追加URLを記載</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>友だち追加特典の用意</strong>: クーポン・限定コンテンツなど、友だち追加のインセンティブを準備</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">5.</span><strong>スタッフへの周知</strong>: 全スタッフに友だち追加の案内方法を共有</li>
        </ul>

        <Callout type="point" title="友だち追加特典が最も効果的">
          「友だち追加で10%OFFクーポンプレゼント」のような明確な特典があると、友だち追加率が2〜3倍に向上します。初月は特に特典を充実させて友だち数を増やしましょう。
        </Callout>
      </section>

      {/* ── 2週目 ── */}
      <section>
        <h2 id="week2" className="text-xl font-bold text-gray-800">2週目: 初回配信とコンテンツ準備</h2>

        <FlowSteps steps={[
          { title: "配信コンテンツの企画", desc: "お役立ち情報、キャンペーン告知、新商品紹介など、ユーザーにとって価値のあるコンテンツを企画する。" },
          { title: "配信フォーマットの選択", desc: "テキスト、リッチメッセージ、カードタイプメッセージなど、目的に合ったフォーマットを選択。" },
          { title: "初回配信の実施", desc: "少人数でも構わないので、まずは1回目の配信を実施して開封率のベースラインを測定する。" },
        ]} />

        <Callout type="info" title="初回配信のコツ">
          初回配信は「お役立ち情報」がおすすめです。いきなりセールス色の強い配信をするとブロックされやすいため、まずは信頼関係の構築を優先しましょう。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 3週目 ── */}
      <section>
        <h2 id="week3" className="text-xl font-bold text-gray-800">3週目: 友だち集めの加速</h2>
        <p>1〜2週目の取り組みをさらに強化し、友だち数の増加ペースを加速させます。</p>

        <BarChart
          data={[
            { label: "店頭POP・声掛け", value: 35, color: "#22c55e" },
            { label: "Webサイト導線", value: 25, color: "#3b82f6" },
            { label: "SNS連携", value: 20, color: "#f59e0b" },
            { label: "友だち追加広告", value: 15, color: "#a855f7" },
            { label: "紹介キャンペーン", value: 5, color: "#ec4899" },
          ]}
          unit="%"
        />

        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>店頭での積極的な声掛け</strong> — 「LINEで友だち追加するとクーポンがもらえます」と会計時に案内</li>
          <li><strong>InstagramストーリーでのLINE案内</strong> — ストーリーズにLINE友だち追加リンクを定期的に投稿</li>
          <li><strong>既存顧客へのメール・DM案内</strong> — メールマガジン読者やSNSフォロワーに向けてLINEへの移行を案内</li>
        </ul>
      </section>

      {/* ── 4週目 ── */}
      <section>
        <h2 id="week4" className="text-xl font-bold text-gray-800">4週目: 効果測定と改善</h2>

        <ResultCard
          before="配信のみで効果測定なし"
          after="データに基づいた改善サイクルを確立"
          metric="PDCAサイクルの起点を作る"
          description="1ヶ月目のデータが翌月以降の改善の基盤になる"
        />

        <FlowSteps steps={[
          { title: "友だち数の推移を確認", desc: "日別・週別の友だち追加数を確認し、どの施策が効果的だったかを分析する。" },
          { title: "配信データの分析", desc: "開封率・クリック率・ブロック率を確認し、配信内容やタイミングの改善点を洗い出す。" },
          { title: "翌月の配信計画を策定", desc: "1ヶ月目のデータをもとに、翌月の配信スケジュール・コンテンツ計画を作成する。" },
        ]} />
      </section>

      {/* ── KPI ── */}
      <section>
        <h2 id="kpi" className="text-xl font-bold text-gray-800">最初の1ヶ月で追うべきKPI</h2>

        <StatGrid stats={[
          { value: "100", unit: "人+", label: "友だち追加数" },
          { value: "60", unit: "%+", label: "開封率" },
          { value: "5", unit: "%以下", label: "ブロック率" },
          { value: "10", unit: "%+", label: "クリック率" },
        ]} />

        <Callout type="info" title="完璧を求めない">
          1ヶ月目は数値の「ベースライン」を作ることが目的です。業界平均を下回っていても落ち込む必要はありません。重要なのは翌月以降に改善を続けることです。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="運用開始1ヶ月のポイント">
          <ul className="mt-1 space-y-1">
            <li>・1週目は友だち追加の導線構築に集中</li>
            <li>・2週目で初回配信を実施しベースラインを測定</li>
            <li>・3週目で友だち集めを加速</li>
            <li>・4週目でデータを振り返り翌月の計画を策定</li>
          </ul>
        </Callout>

        <p>最初の1ヶ月をしっかり乗り越えれば、LINE公式アカウントの運用は軌道に乗ります。初期設定がまだの方は<Link href="/line/column/line-official-account-initial-setup-10-steps" className="text-sky-600 underline hover:text-sky-800">初期設定でやるべき10のこと</Link>から始めてください。運用効率をさらに高めたい方は<Link href="/line/column/line-tool-selection-5-criteria" className="text-sky-600 underline hover:text-sky-800">LINE運用ツールの選び方</Link>も参考にどうぞ。</p>
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
