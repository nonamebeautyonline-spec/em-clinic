import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-coupon-design-best-practices")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "割引率は何%が最適ですか？", a: "施術単価の5〜15%が適切です。10%OFFが最もバランスが良く、利用率と利益率の両方を確保できます。20%以上の割引は誕生日やVIP向けなど特別な場面に限定しましょう。" },
  { q: "クーポンの有効期限はどのくらいに設定すべきですか？", a: "2週間が最適です。1週間だと短すぎて「行けなかった」となり、1ヶ月だと「まだいいか」と先延ばしされます。2週間で適度な緊急性を持たせつつ、来店のタイミングを確保できます。" },
  { q: "クーポンを頻繁に配布すると、通常価格で来なくなりませんか？", a: "はい、その懸念は正しいです。そのため、クーポン配信は月1回以下に制限し、「LINE限定」「期間限定」の希少性を演出することが重要です。また、割引クーポンだけでなく、ノベルティやサービスアップグレードのクーポンを織り交ぜると効果的です。" },
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
  "効果を最大化するクーポン設計の5つのルール",
  "割引率・有効期限・条件設定の最適解をデータで検証",
  "クーポン配信のタイミングと頻度のベストプラクティス",
];

const toc = [
  { id: "five-rules", label: "クーポン設計の5つのルール" },
  { id: "discount-rate", label: "ルール1：割引率の最適化" },
  { id: "expiry", label: "ルール2：有効期限の設定" },
  { id: "conditions", label: "ルール3：利用条件の設計" },
  { id: "visual", label: "ルール4：ビジュアルデザイン" },
  { id: "timing", label: "ルール5：配信タイミング" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="クーポン設計ベストプラクティス" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「クーポンを配信しても利用されない」「割引ばかりで利益が減っている」——クーポン運用の悩みは、<strong>設計のルールを知らない</strong>ことが原因です。本記事では、効果を最大化しつつ利益を守るクーポン設計の5つのルールを解説します。</p>

      <section>
        <h2 id="five-rules" className="text-xl font-bold text-gray-800">クーポン設計の5つのルール</h2>

        <FlowSteps steps={[
          { title: "ルール1", desc: "割引率は5〜15%。目的に応じて使い分け" },
          { title: "ルール2", desc: "有効期限は2週間。緊急性で行動を促す" },
          { title: "ルール3", desc: "利用条件を明確に。対象メニュー・最低金額を設定" },
          { title: "ルール4", desc: "ビジュアルで目を引く。画像クーポンが利用率2倍" },
          { title: "ルール5", desc: "金曜夜の配信がベスト。週末の来店につなげる" },
        ]} />
      </section>

      <section>
        <h2 id="discount-rate" className="text-xl font-bold text-gray-800">ルール1：割引率の最適化</h2>

        <ComparisonTable
          headers={["クーポン種別", "割引率", "利用率", "利益への影響"]}
          rows={[
            ["日常配信クーポン", "5〜10%", "10〜15%", "小さい"],
            ["新規2回目クーポン", "10〜15%", "20〜25%", "中程度"],
            ["誕生日クーポン", "15〜20%", "30%以上", "中程度"],
            ["休眠掘り起こし", "20〜30%", "15〜20%", "大きい"],
          ]}
        />

        <Callout type="point" title="定額 vs 定率">
          客単価5,000円以下のメニューは定額割引（500円OFF）、5,000円以上は定率割引（10%OFF）が心理的にお得感を感じやすい傾向があります。
        </Callout>
      </section>

      <section>
        <h2 id="expiry" className="text-xl font-bold text-gray-800">ルール2：有効期限の設定</h2>

        <BarChart
          data={[
            { label: "1週間", value: 8, color: "#ef4444" },
            { label: "2週間", value: 15, color: "#22c55e" },
            { label: "1ヶ月", value: 10, color: "#f59e0b" },
            { label: "2ヶ月", value: 6, color: "#a855f7" },
          ]}
          unit="%"
        />

        <p><strong>有効期限2週間がスイートスポット</strong>です。短すぎると「予約が取れなかった」、長すぎると「まだいいか」と先延ばしされます。</p>
      </section>

      <section>
        <h2 id="conditions" className="text-xl font-bold text-gray-800">ルール3：利用条件の設計</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>対象メニューを限定</strong> — 利益率の高いメニューに誘導（例：トリートメント付きセット）</li>
          <li><strong>最低利用金額を設定</strong> — 「5,000円以上のメニューで使用可」で客単価維持</li>
          <li><strong>併用不可の明記</strong> — 他クーポンやホットペッパークーポンとの併用ルールを明確に</li>
          <li><strong>1人1回の制限</strong> — 同じクーポンの複数回使用を防止</li>
        </ul>

        <Callout type="warning" title="条件が複雑すぎるとNG">
          利用条件が3つ以上あると、お客様は「面倒くさい」と感じて利用率が下がります。条件は2つまでに抑えましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="visual" className="text-xl font-bold text-gray-800">ルール4：ビジュアルデザイン</h2>
        <p>テキストだけのクーポンよりも、画像付きクーポンの方が利用率が<strong>約2倍</strong>高くなります。</p>

        <ResultCard before="8%（テキストのみ）" after="16%（画像付き）" metric="クーポン利用率" description="画像を付けるだけで2倍の差" />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">画像クーポンの要素</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>割引額を大きく表示</strong> — 「1,000円OFF」が最も目を引く</li>
          <li><strong>有効期限を明記</strong> — 「〜3/31まで」と期限を明示</li>
          <li><strong>サロンの雰囲気が伝わる写真</strong> — 施術イメージや店内写真</li>
          <li><strong>予約ボタンを目立たせる</strong> — 「今すぐ予約」のCTAボタン</li>
        </ul>
      </section>

      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">ルール5：配信タイミング</h2>

        <StatGrid stats={[
          { value: "金曜20時", label: "クーポン配信の最適タイミング" },
          { value: "月1〜2回", label: "クーポン配信の推奨頻度" },
          { value: "2倍", label: "金曜配信 vs 月曜配信の利用率差" },
        ]} />

        <p>金曜夜にクーポンを配信すると、週末の予約につながりやすく利用率が最も高くなります。月曜配信だと「週末まで覚えていない」ケースが多くなります。リピート促進の全体戦略は<Link href="/salon/column/salon-repeat-rate-line-delivery-strategy" className="text-blue-600 underline">リピート率を上げるLINE配信術</Link>、誕生日クーポンの活用は<Link href="/salon/column/salon-birthday-coupon-line-automation" className="text-blue-600 underline">誕生日クーポン自動配信</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>割引率は5〜15%が基本</strong> — 目的に応じて段階的に設計</li>
          <li><strong>有効期限は2週間</strong> — 緊急性と実現性のバランス</li>
          <li><strong>利用条件は2つまで</strong> — 複雑な条件は利用率を下げる</li>
          <li><strong>画像付きクーポンで利用率2倍</strong> — 割引額と期限を大きく表示</li>
          <li><strong>金曜20時の配信がベスト</strong> — 週末の来店につなげる</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、画像クーポンの作成から配信・効果測定までをワンストップで実現。テンプレートを使えば5分でプロ品質のクーポンを作成できます。</p>
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
