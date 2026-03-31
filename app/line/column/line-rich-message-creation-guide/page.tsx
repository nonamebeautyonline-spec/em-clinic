import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-rich-message-creation-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "リッチメッセージの画像サイズは何がおすすめですか？", a: "LINE公式アカウントのリッチメッセージは1040×1040pxの正方形が基本です。カスタムサイズも設定可能ですが、正方形が最も表示崩れが少なく、タップ領域も明確になります。画像は300KB以下に圧縮するのがおすすめです。" },
  { q: "リッチメッセージとリッチビデオメッセージの違いは？", a: "リッチメッセージは画像＋リンクの組み合わせで、タップすると指定URLに遷移します。リッチビデオメッセージは動画を自動再生し、視聴後にアクションボタンを表示する形式です。動画素材がある場合はリッチビデオも効果的です。" },
  { q: "リッチメッセージのクリック率を上げるコツは？", a: "CTAボタンを目立つ色で配置し、タップすべき場所を明確にすることが最重要です。テキストは15文字以内で要点を伝え、画像のコントラストを高くすると視認性が上がります。配信タイミングの最適化も組み合わせると効果的です。" },
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
  "リッチメッセージの画像サイズ・テンプレート・デザインの基本ルール",
  "クリック率を3倍にするCTA設計とテキスト配置のコツ",
  "テキストメッセージとの効果比較データと使い分け方",
];

const toc = [
  { id: "what-is-rich-message", label: "リッチメッセージとは" },
  { id: "image-size-template", label: "画像サイズとテンプレート" },
  { id: "design-principles", label: "デザインの5原則" },
  { id: "cta-optimization", label: "CTA設計のコツ" },
  { id: "text-vs-rich", label: "テキスト配信との効果比較" },
  { id: "creation-flow", label: "作成手順" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リッチメッセージ" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEリッチメッセージは、画像とリンクを組み合わせた視覚的なメッセージ形式です。テキストのみの配信と比較して<strong>クリック率が2〜3倍</strong>に向上するケースが多く、効果的に活用すればCVR（成約率）も大幅に改善できます。本記事では、画像サイズの基本からデザインのコツ、CTA最適化までリッチメッセージの作り方を徹底解説します。</p>

      <section>
        <h2 id="what-is-rich-message" className="text-xl font-bold text-gray-800">リッチメッセージとは</h2>
        <p>リッチメッセージは、LINE公式アカウントで配信できるメッセージ形式のひとつです。画像全体がタップ領域となり、ユーザーがタップするとWebページやクーポン画面に遷移します。</p>

        <StatGrid stats={[
          { value: "2〜3倍", label: "テキスト配信比のクリック率" },
          { value: "1040px", label: "推奨画像サイズ（正方形）" },
          { value: "15文字", label: "画像内テキストの目安上限" },
        ]} />

        <Callout type="point" title="リッチメッセージの3つのメリット">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>視覚的なインパクト</strong> — トーク画面で目を引き、スクロールを止める効果が高い</li>
            <li><strong>高いクリック率</strong> — 画像全体がタップ領域のため、自然にアクションにつながる</li>
            <li><strong>情報の凝縮</strong> — テキストでは伝えにくい雰囲気やデザインを直感的に訴求できる</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="image-size-template" className="text-xl font-bold text-gray-800">画像サイズとテンプレート</h2>
        <p>リッチメッセージの画像サイズとテンプレートの選択は、クリック率に直結する重要な要素です。</p>

        <ComparisonTable
          headers={["テンプレート", "分割数", "おすすめ用途"]}
          rows={[
            ["正方形（1040×1040）", "1枠", "1つのCTAに集中させたい場合"],
            ["縦長2分割", "2枠", "2つの商品・メニューを比較提示"],
            ["横長2分割", "2枠", "画像＋CTAボタンの構成"],
            ["4分割", "4枠", "複数カテゴリーを一覧で見せる場合"],
            ["6分割", "6枠", "多数のメニューやカテゴリーを配置"],
          ]}
        />

        <Callout type="warning" title="画像サイズの注意点">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>画像ファイルは<strong>300KB以下</strong>に圧縮する（読み込み速度に影響）</li>
            <li>PNG形式がおすすめ（JPEG圧縮でテキストが潰れるリスクを回避）</li>
            <li>分割数が多いほど各枠が小さくなるため、<strong>テキストの視認性</strong>に注意</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="design-principles" className="text-xl font-bold text-gray-800">クリック率を上げるデザインの5原則</h2>

        <FlowSteps steps={[
          { title: "CTAを明確にする", desc: "「今すぐ予約」「クーポンを受け取る」など、ユーザーが取るべき行動を明確に表示。ボタン風のデザインでタップ可能であることを示す" },
          { title: "テキストは最小限に", desc: "画像内のテキストは15文字以内が目安。伝えたいメッセージを1つに絞り、余計な情報を削ぎ落とす" },
          { title: "コントラストを高くする", desc: "背景と文字のコントラスト比を高くし、小さなスマホ画面でも読みやすいデザインにする" },
          { title: "ブランドカラーを統一", desc: "配信ごとにデザインがバラバラだと信頼感が薄れる。ブランドカラーとフォントを統一する" },
          { title: "季節感・緊急性を演出", desc: "「期間限定」「残りわずか」などの訴求で、タップの動機を強化する" },
        ]} />
      </section>

      <section>
        <h2 id="cta-optimization" className="text-xl font-bold text-gray-800">CTA設計のコツ</h2>
        <p>リッチメッセージのCTA（Call To Action）は、配信の成否を決める最重要要素です。</p>

        <ComparisonTable
          headers={["CTA要素", "良い例", "悪い例"]}
          rows={[
            ["ボタンテキスト", "今すぐ予約する", "こちらをクリック"],
            ["色使い", "背景と対照的な目立つ色", "背景に溶け込む色"],
            ["配置", "画像下部1/3のエリア", "画像の端で見切れる位置"],
            ["文字サイズ", "画像の1/10以上", "小さくて読めないサイズ"],
          ]}
        />

        <ResultCard before="「詳細はこちら」" after="「30%OFFクーポンを今すぐ受け取る」" metric="クリック率" description="具体的なベネフィットを含むCTAでクリック率が2.4倍に向上" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="text-vs-rich" className="text-xl font-bold text-gray-800">テキスト配信との効果比較</h2>

        <BarChart
          data={[
            { label: "テキストのみ", value: 8, color: "#94a3b8" },
            { label: "リッチメッセージ", value: 22, color: "#22c55e" },
            { label: "リッチメッセージ+テキスト", value: 26, color: "#3b82f6" },
          ]}
          unit="%"
        />

        <p>リッチメッセージ単体でテキスト配信の約2.8倍のクリック率を記録しています。さらにテキストメッセージと組み合わせることで、補足情報を伝えつつクリックを誘導でき、最も高い効果を得られます。</p>

        <Callout type="success" title="テキスト+リッチの組み合わせが最強">
          リッチメッセージの前にテキストで「本日限定のお知らせです」と前振りを入れると、リッチメッセージへの注目度が上がります。配信タイミングの最適化と組み合わせると効果はさらに倍増します。詳しくは<Link href="/line/column/line-delivery-best-time-frequency" className="text-blue-600 underline">最適な配信頻度・時間帯</Link>の記事をご覧ください。
        </Callout>
      </section>

      <section>
        <h2 id="creation-flow" className="text-xl font-bold text-gray-800">リッチメッセージの作成手順</h2>

        <FlowSteps steps={[
          { title: "テンプレートを選択", desc: "LINE Official Account Managerにログインし、メッセージ作成画面からリッチメッセージを選択。分割パターンを決定" },
          { title: "画像を作成", desc: "Canva・Figma等のデザインツールで1040×1040pxの画像を作成。CTAボタンを含めてデザイン" },
          { title: "アクションを設定", desc: "各エリアのタップ時のアクション（URL遷移・クーポン表示・テキスト送信）を設定" },
          { title: "テスト配信で確認", desc: "テスト用アカウントに配信し、表示崩れやリンク切れがないかを確認" },
          { title: "本番配信", desc: "ターゲットセグメントと配信日時を設定して配信。配信後はクリック率を必ず確認" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "2〜3倍", label: "テキスト比クリック率向上" },
          { value: "1040px", label: "推奨画像幅" },
          { value: "15文字", label: "画像内テキスト目安" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>リッチメッセージはクリック率がテキストの2〜3倍</strong> — 視覚的なインパクトでアクションを促進</li>
          <li><strong>1040×1040pxの正方形が基本</strong> — テンプレートは目的に合わせて選択</li>
          <li><strong>CTAを明確に・テキストは最小限に</strong> — 「何をすればいいか」が一目で分かるデザインにする</li>
          <li><strong>テキストとの組み合わせ配信が最も効果的</strong> — 前振りテキスト+リッチメッセージの構成</li>
          <li><strong>配信後は必ずクリック率を計測</strong> — データに基づく改善で効果を継続的に高める</li>
        </ol>
        <p className="mt-4">リッチメッセージは配信の基本武器です。デザインの5原則を押さえ、ABテストを繰り返すことで自社に最適な型を見つけましょう。セグメント配信との組み合わせについては<Link href="/line/column/line-broadcast-vs-segment-delivery" className="text-blue-600 underline">一斉配信vsセグメント配信</Link>もご参照ください。</p>
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
