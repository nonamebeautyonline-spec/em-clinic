import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "hair-removal-salon-line-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "脱毛の施術間隔リマインドの設定方法は？", a: "部位とマシンによって最適な間隔が異なります。顔は2〜3週間、ワキ・VIOは4〜6週間、腕・脚は6〜8週間が一般的です。コース開始時にメニュータグを付け、自動で次回推奨日を計算してリマインド配信します。" },
  { q: "友だち紹介キャンペーンは脱毛サロンで効果がありますか？", a: "脱毛は友人同士で話題になりやすいため、紹介キャンペーンとの相性は抜群です。「紹介者・被紹介者ともに5,000円OFF」の設計で、月間紹介数が5〜10件発生するサロンも多いです。" },
  { q: "コース進捗の可視化はどのように行いますか？", a: "LINEのリッチメニューから「施術履歴」を確認できる仕組みを作ります。全12回コースの中で「今回は6回目/12回」と表示し、残回数を見える化することで継続モチベーションを維持できます。" },
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
  "部位別の施術間隔に合わせた自動リマインド設計",
  "コース進捗の可視化で中途解約を防止",
  "友だち紹介キャンペーンで新規集客を加速",
];

const toc = [
  { id: "characteristics", label: "脱毛サロンのLINE活用特性" },
  { id: "interval-remind", label: "施術間隔リマインドの設計" },
  { id: "progress", label: "コース進捗の可視化" },
  { id: "referral", label: "友だち紹介キャンペーン" },
  { id: "faq-management", label: "FAQ対応の自動化" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="脱毛サロンLINE活用" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">脱毛サロンは「長期コース」「施術間隔の管理」「友だち紹介との相性」が特徴です。LINEを活用して<strong>施術間隔の自動管理</strong>と<strong>紹介キャンペーン</strong>を両立させる方法を解説します。</p>

      <section>
        <h2 id="characteristics" className="text-xl font-bold text-gray-800">脱毛サロンのLINE活用特性</h2>

        <StatGrid stats={[
          { value: "6〜12ヶ月", label: "脱毛コースの平均期間" },
          { value: "4〜8週間", label: "施術の平均間隔" },
          { value: "25%", label: "友だち紹介経由の新規率（業界上位）" },
        ]} />

        <ComparisonTable
          headers={["活用ポイント", "脱毛サロンの特性", "LINE活用方法"]}
          rows={[
            ["施術間隔", "部位別に異なる最適間隔", "メニュータグ別の自動リマインド"],
            ["コース管理", "長期コース（6〜12ヶ月）", "進捗の可視化・継続モチベーション"],
            ["紹介", "友人との話題になりやすい", "LINE紹介キャンペーンの自動化"],
            ["FAQ", "施術前後の質問が多い", "自動応答でFAQ対応"],
          ]}
        />
      </section>

      <section>
        <h2 id="interval-remind" className="text-xl font-bold text-gray-800">施術間隔リマインドの設計</h2>

        <ComparisonTable
          headers={["部位", "推奨間隔", "リマインドタイミング"]}
          rows={[
            ["顔", "2〜3週間", "施術後2週間"],
            ["ワキ", "4〜6週間", "施術後4週間"],
            ["VIO", "4〜6週間", "施術後4週間"],
            ["腕・脚", "6〜8週間", "施術後6週間"],
            ["全身", "6〜8週間", "施術後6週間"],
          ]}
        />

        <ResultCard before="70%（リマインドなし）" after="90%（自動リマインド）" metric="次回施術の予約率" description="部位別リマインドで大幅に改善" />
      </section>

      <section>
        <h2 id="progress" className="text-xl font-bold text-gray-800">コース進捗の可視化</h2>

        <FlowSteps steps={[
          { title: "施術完了時に進捗更新", desc: "「本日の施術完了！3回目/12回（25%完了）」と自動通知" },
          { title: "中間報告の自動配信", desc: "コース半分消化時に「折り返し地点です！ここまでの変化を振り返りましょう」" },
          { title: "残り3回で追加提案", desc: "「残り3回です。追加コースのご案内はこちら」" },
          { title: "コース完了の祝福", desc: "「全12回完了おめでとうございます！メンテナンスプランのご案内」" },
        ]} />

        <Callout type="point" title="進捗の可視化が中途解約を防ぐ">
          「あと何回残っているかわからない」状態は離脱の原因になります。毎回の施術後に進捗を通知することで、ゴールが見えて継続しやすくなります。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="referral" className="text-xl font-bold text-gray-800">友だち紹介キャンペーン</h2>

        <BarChart
          data={[
            { label: "紹介者特典（5,000円OFF）", value: 85, color: "#22c55e" },
            { label: "被紹介者特典（5,000円OFF）", value: 85, color: "#3b82f6" },
            { label: "月間平均紹介件数", value: 8, color: "#f59e0b" },
          ]}
          unit=""
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">紹介キャンペーンの設計</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>双方に特典</strong> — 紹介者・被紹介者の両方に5,000円OFF</li>
          <li><strong>紹介専用URL</strong> — LINEから1タップで紹介リンクを生成・共有</li>
          <li><strong>紹介状況の可視化</strong> — 「あなたの紹介で2人が来店しました」と通知</li>
          <li><strong>追加特典</strong> — 3人紹介で「ワキ脱毛1回無料」など上位特典</li>
        </ul>

        <p className="mt-4">友だち集めの全体戦略は<Link href="/salon/column/salon-line-friends-collection-strategies" className="text-blue-600 underline">LINE友だち集め10の施策</Link>、0→1000人のロードマップは<Link href="/salon/column/salon-line-zero-to-1000-friends" className="text-blue-600 underline">友だち0→1000人ロードマップ</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="faq-management" className="text-xl font-bold text-gray-800">FAQ対応の自動化</h2>
        <p>脱毛サロンでは施術前後の質問が多いため、よくある質問への自動応答が効果的です。</p>

        <ul className="list-disc pl-6 space-y-1">
          <li>「施術前の自己処理はどうすればいい？」</li>
          <li>「施術後にお風呂に入っていい？」</li>
          <li>「日焼けしてもOK？」</li>
          <li>「痛みはどのくらい？」</li>
        </ul>

        <Callout type="success" title="リッチメニューのFAQが便利">
          リッチメニューに「よくある質問」ボタンを設置し、タップするとFAQ一覧が表示される仕組みにすると、スタッフの問い合わせ対応が大幅に削減されます。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>部位別に施術間隔リマインドを設定</strong> — 顔2週間、ワキ4週間、脚6週間</li>
          <li><strong>コース進捗の可視化で離脱防止</strong> — 毎回の施術後に進捗通知</li>
          <li><strong>友だち紹介キャンペーンで新規を加速</strong> — 双方に5,000円OFFで月8件の紹介</li>
          <li><strong>FAQ自動応答でスタッフの負荷を軽減</strong> — 施術前後の質問を自動対応</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、脱毛サロン向けのコース進捗管理と部位別リマインドを標準搭載。長期コースの継続率と紹介率を最大化します。</p>
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
