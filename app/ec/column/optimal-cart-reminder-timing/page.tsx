import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "optimal-cart-reminder-timing")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "カゴ落ちリマインドの最初の配信は何分後がベストですか？", a: "データ上、カゴ落ち後30分〜1時間が最も回収率が高いです。15分以内だと「監視されている」感を与えるリスクがあり、2時間以上空けると購買意欲が冷めてしまいます。" },
  { q: "深夜のカゴ落ちにもリマインドを送るべきですか？", a: "深夜帯（23:00〜7:00）のカゴ落ちは、翌朝8:00〜9:00に配信するのが推奨です。深夜の通知はブロック率を上げる原因になるため、配信時間帯の制限を設定しましょう。" },
  { q: "4回目以降のリマインドは効果がありますか？", a: "4回目以降は回収率が大幅に低下し、ブロック率が上昇するため推奨しません。3回目のクーポン付きリマインドで回収できなかった場合は、後日のセグメント配信で再アプローチする方が効果的です。" },
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
  "カゴ落ち後1時間・24時間・72時間の回収率データ",
  "業態・時間帯別の最適配信タイミング",
  "段階リマインドの設計と配信時間帯の制限ルール",
];

const toc = [
  { id: "timing-impact", label: "タイミングが回収率に与える影響" },
  { id: "optimal-timing", label: "最適な配信タイミング" },
  { id: "time-zone", label: "時間帯別の配信ルール" },
  { id: "industry-timing", label: "業態別の最適タイミング" },
  { id: "staged-design", label: "段階リマインドの設計" },
  { id: "anti-patterns", label: "避けるべきパターン" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="最適配信タイミング" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">カゴ落ちリマインドの回収率は、配信タイミングによって<strong>最大3倍</strong>の差が出ます。早すぎても遅すぎても効果は薄い。本記事では、データに基づく最適な配信タイミングと、業態別の調整ポイントを解説します。</p>

      <section>
        <h2 id="timing-impact" className="text-xl font-bold text-gray-800">タイミングが回収率に与える影響</h2>

        <BarChart
          data={[
            { label: "15分後", value: 8, color: "#ef4444" },
            { label: "30分後", value: 15, color: "#f59e0b" },
            { label: "1時間後", value: 22, color: "#22c55e" },
            { label: "3時間後", value: 16, color: "#3b82f6" },
            { label: "6時間後", value: 11, color: "#8b5cf6" },
            { label: "24時間後", value: 8, color: "#ec4899" },
          ]}
          unit="%（1回目リマインドの回収率）"
        />

        <p>データから明確に言えることは、<strong>カゴ落ち後1時間前後</strong>が最も回収率が高いということです。15分以内は「監視されている」印象を与え、3時間以上空くと購買意欲が冷めています。</p>

        <ResultCard before="一律24時間後配信" after="1時間後配信に変更" metric="カゴ落ち回収率" description="8%→22%に向上（約2.8倍）" />
      </section>

      <section>
        <h2 id="optimal-timing" className="text-xl font-bold text-gray-800">段階別の最適な配信タイミング</h2>

        <ComparisonTable
          headers={["段階", "タイミング", "回収率", "メッセージ内容"]}
          rows={[
            ["1回目", "1時間後", "全回収の40〜50%", "ソフトリマインド + 商品画像"],
            ["2回目", "24時間後", "全回収の25〜30%", "在庫残少 + レビュー"],
            ["3回目", "72時間後", "全回収の20〜25%", "期間限定クーポン"],
          ]}
        />

        <StatGrid stats={[
          { value: "1", unit: "時間後", label: "最も回収率が高いタイミング" },
          { value: "3", unit: "回", label: "最適なリマインド回数" },
          { value: "72", unit: "時間", label: "最終リマインドのタイミング" },
        ]} />
      </section>

      <section>
        <h2 id="time-zone" className="text-xl font-bold text-gray-800">時間帯別の配信ルール</h2>

        <ComparisonTable
          headers={["カゴ落ち時間帯", "1回目配信", "理由"]}
          rows={[
            ["7:00〜22:00", "1時間後そのまま配信", "通常の活動時間内"],
            ["22:00〜23:00", "翌朝8:00に配信", "就寝前の通知は避ける"],
            ["23:00〜7:00", "翌朝8:00〜9:00に配信", "深夜通知はブロック率が上昇"],
          ]}
        />

        <Callout type="warning" title="深夜配信は絶対に避ける">
          22:00〜8:00のプッシュ通知はブロック率を2〜3倍に引き上げます。この時間帯のカゴ落ちは、翌朝の配信に自動遅延する設定を必ず行いましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="industry-timing" className="text-xl font-bold text-gray-800">業態別の最適タイミング</h2>

        <ComparisonTable
          headers={["業態", "1回目", "2回目", "3回目", "特記事項"]}
          rows={[
            ["アパレル", "1時間後", "24時間後", "72時間後", "週末のカゴ落ちは月曜に2回目を配信"],
            ["食品・飲料", "30分後", "12時間後", "48時間後", "鮮度の関係でサイクルを短縮"],
            ["化粧品", "1時間後", "24時間後", "72時間後", "レビュー訴求が特に効果的"],
            ["家電・ガジェット", "2時間後", "48時間後", "7日後", "検討期間が長いため間隔を広く"],
            ["日用品", "30分後", "12時間後", "48時間後", "衝動買いが多いため早めに配信"],
          ]}
        />

        <Callout type="point" title="商品単価で間隔を調整">
          高単価商品は検討期間が長いため、リマインド間隔を広めに設定します。逆に日用品や消耗品は衝動買いの要素が強いため、早めのタイミングが効果的です。
        </Callout>
      </section>

      <section>
        <h2 id="staged-design" className="text-xl font-bold text-gray-800">段階リマインドの設計フロー</h2>

        <FlowSteps steps={[
          { title: "カゴ落ち検知", desc: "ECカートのWebhookでカート放棄イベントを検知。顧客のLINE IDと紐づけ" },
          { title: "配信時間帯チェック", desc: "深夜帯の場合は翌朝に自動遅延。配信可能時間帯（8:00〜22:00）内のみ配信" },
          { title: "1回目配信（1h後）", desc: "商品画像 + カートリンクのソフトリマインド" },
          { title: "購入チェック", desc: "配信前に購入済みかチェック。購入済みなら配信をキャンセル" },
          { title: "2回目配信（24h後）", desc: "在庫残少 + レビュー訴求。未購入の場合のみ配信" },
          { title: "3回目配信（72h後）", desc: "期間限定クーポン付き最終リマインド。これで終了" },
        ]} />
      </section>

      <section>
        <h2 id="anti-patterns" className="text-xl font-bold text-gray-800">避けるべきパターン</h2>

        <ComparisonTable
          headers={["NGパターン", "問題点", "改善策"]}
          rows={[
            ["カゴ落ち5分後に配信", "監視されている感が強い", "最短30分〜1時間に設定"],
            ["深夜に配信", "ブロック率2〜3倍", "22:00〜8:00は配信停止"],
            ["毎日リマインドを送る", "スパム認定・ブロック", "3回で打ち止め"],
            ["購入済みなのに配信", "信頼を損なう", "配信前に購入状況をチェック"],
            ["全員に同じタイミング", "業態・商品を無視", "商品カテゴリ別にタイミングを最適化"],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>1時間後が最も回収率が高い</strong> — 15分は早すぎ、3時間以上は遅すぎ</li>
          <li><strong>3段階リマインドが最適解</strong> — 1h→24h→72hの段階設計で回収率を最大化</li>
          <li><strong>深夜配信は厳禁</strong> — 22:00〜8:00は配信を自動遅延させる設定が必須</li>
          <li><strong>業態に応じた調整が重要</strong> — 高単価は間隔広め、日用品は早め。メッセージ文面は<Link href="/ec/column/cart-recovery-message-templates" className="text-blue-600 underline">テンプレート10選</Link>を参考に。全体戦略は<Link href="/ec/column/line-cart-abandonment-recovery-guide" className="text-blue-600 underline">カゴ落ち回収ガイド</Link>で解説</li>
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
