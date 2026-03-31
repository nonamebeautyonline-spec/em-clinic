import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-dormant-customer-reactivation")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "休眠顧客の定義は何日から？", a: "一般的にサロン業界では最終来店から90日以上を休眠と定義します。ただし業態によって異なり、美容室は90日、ネイルサロンは60日、エステは120日が目安です。自サロンの平均来店周期の2倍を休眠の基準にするのが合理的です。" },
  { q: "休眠顧客にクーポンを送っても反応がない場合は？", a: "1回目で反応がなくても、2〜3回までは異なるアプローチで再アプローチしてみましょう。クーポン→パーソナルメッセージ→新メニュー紹介の順に変えていきます。3回反応がなければ配信リストから除外し、通数コストを節約しましょう。" },
  { q: "休眠顧客への配信でブロックされませんか？", a: "配信する価値（クーポンや限定情報）がなければブロックされる可能性はあります。しかし、もともと来なくなった顧客なので、反応しない人にブロックされてもリスクは低いです。大切なのは、反応する人を確実に再来店につなげることです。" },
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
  "休眠顧客を掘り起こす5つの具体的な施策",
  "休眠期間別のアプローチ戦略と最適なタイミング",
  "新規獲得の5分の1のコストで売上を回復する方法",
];

const toc = [
  { id: "hidden-asset", label: "休眠顧客はサロンの「隠れ資産」" },
  { id: "five-strategies", label: "休眠顧客を掘り起こす5つの施策" },
  { id: "timing", label: "休眠期間別のアプローチ" },
  { id: "message-template", label: "メッセージテンプレート" },
  { id: "results", label: "再来店率の改善効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="休眠顧客の掘り起こし" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">サロンのLINE友だちリストの中に「最後の来店から3ヶ月以上経過したお客様」はどのくらいいますか？この休眠顧客は、新規集客の<strong>5分の1のコスト</strong>で再来店を促せる「隠れ資産」です。</p>

      <section>
        <h2 id="hidden-asset" className="text-xl font-bold text-gray-800">休眠顧客はサロンの「隠れ資産」</h2>

        <StatGrid stats={[
          { value: "30〜40%", label: "LINE友だちの中の休眠顧客の割合" },
          { value: "1/5", label: "新規と比較した再来店の獲得コスト" },
          { value: "15〜20%", label: "適切なアプローチでの再来店率" },
        ]} />

        <p>休眠顧客はすでにサロンの場所を知っていて、施術を体験済みです。サロンとの接点（LINE友だち）も残っています。ゼロから集客する新規客と比べて、はるかに来店のハードルが低い存在です。</p>
      </section>

      <section>
        <h2 id="five-strategies" className="text-xl font-bold text-gray-800">休眠顧客を掘り起こす5つの施策</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 限定クーポンの配信</h3>
        <p>「お久しぶりです！特別に20%OFFクーポンをお送りします」と、通常より割引率の高い限定クーポンを送ります。有効期限は2週間以内に設定し、緊急性を持たせましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. パーソナルメッセージ</h3>
        <p>「〇〇様、前回のカラーの調子はいかがですか？」と、名前と過去の施術内容を含むメッセージを送信。一斉配信ではなく「自分宛」だと感じさせることが重要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. 新メニュー・リニューアルの告知</h3>
        <p>「新メニューのヘッドスパが大好評！」「店内をリニューアルしました」など、変化をアピール。以前と異なる体験ができることを伝えましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. 季節イベントの活用</h3>
        <p>「春の衣替えシーズンにヘアチェンジしませんか？」など、季節の変わり目をきっかけに来店動機を創出します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">5. 友だち紹介キャンペーン</h3>
        <p>「お友だちと一緒にご来店いただくと、お二人とも30%OFF」と、友人同伴のインセンティブを用意。来店のハードルを下げる効果があります。</p>

        <BarChart
          data={[
            { label: "限定クーポン", value: 25, color: "#22c55e" },
            { label: "パーソナルメッセージ", value: 18, color: "#3b82f6" },
            { label: "新メニュー告知", value: 12, color: "#f59e0b" },
            { label: "季節イベント", value: 10, color: "#a855f7" },
            { label: "友だち紹介", value: 8, color: "#ec4899" },
          ]}
          unit="%"
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">休眠期間別のアプローチ</h2>

        <FlowSteps steps={[
          { title: "90日経過（軽度の休眠）", desc: "やわらかいトーンで「お久しぶりです」＋10%OFFクーポン。反応率は約20%" },
          { title: "120日経過（中度の休眠）", desc: "新メニューやリニューアル情報＋15%OFFクーポン。反応率は約15%" },
          { title: "180日経過（重度の休眠）", desc: "パーソナルメッセージ＋20%OFF特別クーポン。反応率は約10%" },
          { title: "270日以上（長期休眠）", desc: "最終アプローチ。反応なしの場合は配信リストから除外を検討" },
        ]} />
      </section>

      <section>
        <h2 id="message-template" className="text-xl font-bold text-gray-800">メッセージテンプレート</h2>

        <Callout type="point" title="パーソナル感が成功の鍵">
          <p className="mt-1">一斉配信であっても「〇〇様」と名前を入れるだけで反応率が1.5倍になります。さらに「前回の〇〇の施術」と過去の来店情報を含めると、「覚えていてくれた」という好感度が高まり、再来店意欲が大幅にアップします。</p>
        </Callout>

        <p className="mt-4">セグメント配信の詳しい設計方法は<Link href="/salon/column/salon-repeat-rate-line-delivery-strategy" className="text-blue-600 underline">リピート率を上げるLINE配信術</Link>、クーポンの効果的な設計は<Link href="/salon/column/salon-line-coupon-design-best-practices" className="text-blue-600 underline">クーポン設計ベストプラクティス</Link>もご参照ください。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">再来店率の改善効果</h2>

        <ResultCard before="0%" after="15〜20%" metric="休眠顧客の再来店率" description="限定クーポン＋パーソナルメッセージで達成" />

        <StatGrid stats={[
          { value: "15〜20%", label: "休眠顧客の再来店率" },
          { value: "3〜5万円", label: "月間売上の回復額（100人アプローチ時）" },
          { value: "1/5", label: "新規獲得比のコスト" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>休眠顧客は新規の5分の1のコストで再来店を促せる</strong> — 見過ごしがちだが大きな資産</li>
          <li><strong>限定クーポンとパーソナルメッセージが最も効果的</strong> — 名前と過去の施術情報で特別感を演出</li>
          <li><strong>休眠期間に応じてアプローチを変える</strong> — 長期ほど割引率を上げてインパクトを出す</li>
          <li><strong>3回アプローチしても反応がなければ配信対象から除外</strong> — 通数コストの最適化</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、最終来店日から自動で休眠顧客を検出し、段階的なアプローチを自動配信。眠っている売上を取り戻します。</p>
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
