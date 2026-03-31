import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-cart-abandonment-recovery-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "カゴ落ちリマインドは何回送るのが最適ですか？", a: "3回の段階配信（1時間後・24時間後・72時間後）が最もバランスが良いとされています。4回以上はブロック率が上がるリスクがあり、2回以下だと回収機会を逃します。" },
  { q: "カゴ落ちリマインドにクーポンは付けるべきですか？", a: "1回目・2回目はクーポンなし、3回目（72時間後）に期間限定クーポンを付けるのが推奨です。最初からクーポンを付けると、意図的にカゴ落ちしてクーポンを狙う行動を誘発するリスクがあります。" },
  { q: "カゴ落ちリマインドの回収率はどのくらいですか？", a: "LINE経由のカゴ落ちリマインドでは、平均15〜25%の回収率が報告されています。メール（5〜8%）と比較して約3倍の効果があり、商品単価の高いカテゴリほど回収率が高い傾向があります。" },
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
  "ECサイトのカゴ落ち率平均69.8%という課題とLINEリマインドの効果",
  "1時間後・24時間後・72時間後の段階リマインド設計と最適化",
  "業態別の回収率データと具体的なメッセージ設計のコツ",
];

const toc = [
  { id: "cart-abandonment-reality", label: "カゴ落ちの実態と損失額" },
  { id: "why-line-works", label: "LINEリマインドが効く理由" },
  { id: "three-step-design", label: "3段階リマインドの設計" },
  { id: "message-design", label: "メッセージ設計のコツ" },
  { id: "optimization", label: "回収率を最大化する最適化" },
  { id: "industry-data", label: "業態別の回収率データ" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="カゴ落ち回収ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ECサイトの平均カゴ落ち率は<strong>69.8%</strong>。月商1,000万円のECサイトなら、毎月<strong>約2,300万円分</strong>の商品がカートに入れられたまま購入されていません。LINEリマインド配信で、この機会損失の15〜25%を回収する方法を解説します。</p>

      <section>
        <h2 id="cart-abandonment-reality" className="text-xl font-bold text-gray-800">カゴ落ちの実態と損失額</h2>

        <DonutChart percentage={70} label="カゴ落ち率" sublabel="ECサイト平均で約70%がカート放棄" />

        <p>Baymard Instituteの調査によると、ECサイトの平均カゴ落ち率は69.8%です。つまり、カートに商品を入れた顧客の約7割が購入に至りません。</p>

        <BarChart
          data={[
            { label: "送料・手数料が高い", value: 48, color: "#ef4444" },
            { label: "アカウント作成が面倒", value: 26, color: "#f59e0b" },
            { label: "比較検討中", value: 22, color: "#3b82f6" },
            { label: "決済方法が少ない", value: 13, color: "#8b5cf6" },
            { label: "配送が遅い", value: 12, color: "#ec4899" },
          ]}
          unit="%（カゴ落ち理由）"
        />

        <Callout type="warning" title="カゴ落ちの損失額を計算してみよう">
          月商 × カゴ落ち率(70%) ÷ (1 - カゴ落ち率) = カゴ落ち損失額。月商500万円なら約1,170万円、月商1,000万円なら約2,330万円の機会損失が発生しています。
        </Callout>
      </section>

      <section>
        <h2 id="why-line-works" className="text-xl font-bold text-gray-800">LINEリマインドが効く理由</h2>

        <ComparisonTable
          headers={["チャネル", "開封率", "クリック率", "回収率"]}
          rows={[
            ["メール", "15〜20%", "2〜3%", "5〜8%"],
            ["LINE", "60〜80%", "10〜25%", "15〜25%"],
            ["Webプッシュ通知", "3〜5%", "1〜2%", "2〜4%"],
            ["SMS", "90%以上", "5〜8%", "10〜15%"],
          ]}
        />

        <p>LINEリマインドが高い回収率を実現する理由は3つあります。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>即時到達</strong> — プッシュ通知で確実にユーザーの目に入る。メールのように埋もれない</li>
          <li><strong>リッチコンテンツ</strong> — 商品画像・価格・カートリンクをカード形式で表示でき、ワンタップで購入に復帰</li>
          <li><strong>トーク画面の親密感</strong> — 友人や家族とのやり取りと同じ空間でメッセージが届き、開封の心理的ハードルが低い</li>
        </ul>
      </section>

      <section>
        <h2 id="three-step-design" className="text-xl font-bold text-gray-800">3段階リマインドの設計</h2>

        <FlowSteps steps={[
          { title: "1時間後: ソフトリマインド", desc: "「お買い物をお忘れではないですか？」商品画像 + カートリンク。最も回収率が高いタイミング（全回収の40〜50%）" },
          { title: "24時間後: 在庫・レビュー訴求", desc: "「残り在庫わずかです」在庫数 + 購入者レビュー + カートリンク。緊急性と社会的証明で背中を押す" },
          { title: "72時間後: クーポン付き最終リマインド", desc: "「48時間限定10%OFFクーポン」期限付きクーポン + カートリンク。最後の一押しで回収率5〜8%を上乗せ" },
        ]} />

        <StatGrid stats={[
          { value: "40〜50%", label: "1時間後リマインドの回収比率" },
          { value: "25〜30%", label: "24時間後リマインドの回収比率" },
          { value: "20〜25%", label: "72時間後リマインドの回収比率" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="message-design" className="text-xl font-bold text-gray-800">メッセージ設計のコツ</h2>

        <ul className="list-disc pl-6 space-y-2">
          <li><strong>商品画像を必ず含める</strong> — テキストのみと比較して、商品画像ありのメッセージはクリック率が2.5倍</li>
          <li><strong>カートリンクはワンタップ復帰</strong> — カートページに直接遷移するリンクを設置。再度商品を探させない</li>
          <li><strong>パーソナライズ</strong> — 「◯◯さん」と名前で呼びかけ、カートに入っている具体的な商品名を表示</li>
          <li><strong>緊急性の演出</strong> — 「残り3点」「本日限り」など、購入を先延ばしにするとデメリットがあると伝える</li>
          <li><strong>文面は短く</strong> — 3行以内のテキスト + 商品カード。長文は読まれない</li>
        </ul>

        <Callout type="point" title="メッセージテンプレートの活用">
          業態別のカゴ落ちリマインドテンプレートは<Link href="/ec/column/cart-recovery-message-templates" className="text-blue-600 underline">カゴ落ちリマインドのメッセージテンプレート10選</Link>で紹介しています。そのまま使える文面例を業態別に用意しています。
        </Callout>
      </section>

      <section>
        <h2 id="optimization" className="text-xl font-bold text-gray-800">回収率を最大化する最適化</h2>

        <ComparisonTable
          headers={["最適化項目", "改善前", "改善後", "効果"]}
          rows={[
            ["配信タイミング", "一律3時間後", "1h→24h→72hの3段階", "回収率+40%"],
            ["商品画像", "テキストのみ", "商品カード形式", "クリック率2.5倍"],
            ["パーソナライズ", "一律メッセージ", "名前+商品名表示", "回収率+20%"],
            ["クーポン", "初回からクーポン", "3回目のみクーポン", "利益率+15%"],
          ]}
        />
      </section>

      <section>
        <h2 id="industry-data" className="text-xl font-bold text-gray-800">業態別の回収率データ</h2>

        <BarChart
          data={[
            { label: "ジュエリー・アクセサリー", value: 28, color: "#22c55e" },
            { label: "アパレル", value: 22, color: "#3b82f6" },
            { label: "家電・ガジェット", value: 20, color: "#f59e0b" },
            { label: "化粧品・スキンケア", value: 18, color: "#ec4899" },
            { label: "食品・飲料", value: 12, color: "#8b5cf6" },
          ]}
          unit="%（LINE回収率）"
        />

        <Callout type="success" title="高単価商品ほど回収率が高い">
          ジュエリーやアパレルなど単価が高い商品カテゴリほど、カゴ落ちリマインドの回収率が高くなります。「もう少し考えよう」と比較検討していた層が、リマインドで購入に至るためです。
        </Callout>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <ResultCard before="カゴ落ち対策なし" after="月売上+15〜20%" metric="LINEカゴ落ちリマインド導入後" description="月商500万円のECサイトで月75〜100万円の売上回復" />

        <StatGrid stats={[
          { value: "15〜25%", label: "平均回収率" },
          { value: "月75〜100", unit: "万円", label: "月商500万円での回復額" },
          { value: "3〜5", unit: "倍", label: "メール比の回収率" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>カゴ落ち率70%は巨大な機会損失</strong> — 月商の2倍以上の金額がカートに残されている</li>
          <li><strong>LINEリマインドで15〜25%を回収</strong> — メールの3倍の回収率で損失を取り戻す</li>
          <li><strong>3段階リマインドが最適</strong> — 1h→24h→72hの段階配信で回収率を最大化。最適なタイミングは<Link href="/ec/column/optimal-cart-reminder-timing" className="text-blue-600 underline">カゴ落ちリマインドの最適タイミング</Link>で詳しく解説</li>
          <li><strong>クーポンは3回目のみ</strong> — 割引なしで回収できる層を先に取り、最後の一押しだけクーポン。クーポン戦略の詳細は<Link href="/ec/column/cart-abandonment-coupon-strategy" className="text-blue-600 underline">カゴ落ちクーポン戦略</Link>を参照</li>
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
