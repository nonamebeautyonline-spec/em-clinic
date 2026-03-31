import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-rich-menu-templates-by-industry")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "テンプレートをそのまま使っても大丈夫ですか？", a: "基本構成はそのまま使えますが、サロン独自のブランドカラーやロゴに合わせてカスタマイズすることをおすすめします。ボタンの配置と導線設計はテンプレート通りが最適解です。" },
  { q: "複数の業態を兼ねている場合はどうすべきですか？", a: "メインの業態のテンプレートをベースに、サブ業態のメニューをボタンとして追加するのが効果的です。例えば「ネイル＋まつげ」のサロンなら、ネイルベースのテンプレートにまつげのボタンを追加します。" },
  { q: "リッチメニューの画像サイズは？", a: "LINE公式のリッチメニュー画像サイズは2,500×1,686ピクセル（大）または2,500×843ピクセル（小）です。サロンには大サイズがおすすめで、6分割で十分な情報量を表示できます。" },
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
  "美容室・ネイル・エステ・まつげ・脱毛の5業態別テンプレート",
  "業態ごとの最適なボタン配置と導線パターン",
  "テンプレートを自サロンにカスタマイズするポイント",
];

const toc = [
  { id: "beauty-salon", label: "美容室のリッチメニュー" },
  { id: "nail-salon", label: "ネイルサロンのリッチメニュー" },
  { id: "esthetic", label: "エステサロンのリッチメニュー" },
  { id: "eyelash", label: "まつげサロンのリッチメニュー" },
  { id: "hair-removal", label: "脱毛サロンのリッチメニュー" },
  { id: "customize", label: "カスタマイズのポイント" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="業態別リッチメニューテンプレート" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">サロンの業態によって、リッチメニューに配置すべきボタンは異なります。本記事では、<strong>美容室・ネイル・エステ・まつげ・脱毛</strong>の5業態別に、最適なリッチメニューの構成パターンを紹介します。</p>

      <section>
        <h2 id="beauty-salon" className="text-xl font-bold text-gray-800">美容室のリッチメニュー</h2>

        <ComparisonTable
          headers={["位置", "ボタン", "リンク先"]}
          rows={[
            ["左上", "予約する", "予約ページ"],
            ["中央上", "スタイリスト紹介", "スタッフ一覧"],
            ["右上", "クーポン", "クーポンページ"],
            ["左下", "メニュー・料金", "メニュー一覧"],
            ["中央下", "スタンプカード", "ポイントカード"],
            ["右下", "アクセス・営業時間", "地図・営業情報"],
          ]}
        />

        <Callout type="point" title="美容室のポイント">
          スタイリスト指名が売上に直結するため、「スタイリスト紹介」ボタンを目立つ位置に配置。各スタイリストのプロフィールから直接指名予約できる導線が理想的です。
        </Callout>
      </section>

      <section>
        <h2 id="nail-salon" className="text-xl font-bold text-gray-800">ネイルサロンのリッチメニュー</h2>

        <ComparisonTable
          headers={["位置", "ボタン", "リンク先"]}
          rows={[
            ["左上", "予約する", "予約ページ"],
            ["中央上", "デザインギャラリー", "ネイルカタログ"],
            ["右上", "クーポン", "クーポンページ"],
            ["左下", "メニュー・料金", "メニュー一覧"],
            ["中央下", "持ち込みデザイン", "LINE画像送信"],
            ["右下", "アクセス", "地図・営業情報"],
          ]}
        />

        <Callout type="point" title="ネイルサロンのポイント">
          「デザインギャラリー」と「持ち込みデザイン送信」がネイルサロン特有のボタン。お客様が施術前にデザインを決められる導線が予約転換率を高めます。
        </Callout>
      </section>

      <section>
        <h2 id="esthetic" className="text-xl font-bold text-gray-800">エステサロンのリッチメニュー</h2>

        <ComparisonTable
          headers={["位置", "ボタン", "リンク先"]}
          rows={[
            ["左上", "体験予約", "体験コース予約"],
            ["中央上", "コース案内", "コース一覧"],
            ["右上", "クーポン", "クーポンページ"],
            ["左下", "お悩み相談", "チャット or カウンセリング予約"],
            ["中央下", "ホームケア商品", "商品一覧（EC連携）"],
            ["右下", "アクセス", "地図・営業情報"],
          ]}
        />

        <Callout type="point" title="エステサロンのポイント">
          「お悩み相談」ボタンで気軽に相談できる導線を用意し、体験予約への転換を促します。「ホームケア商品」ボタンで物販の売上も狙えます。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="eyelash" className="text-xl font-bold text-gray-800">まつげサロンのリッチメニュー</h2>

        <ComparisonTable
          headers={["位置", "ボタン", "リンク先"]}
          rows={[
            ["左上", "予約する", "予約ページ"],
            ["中央上", "デザインカタログ", "まつげデザイン一覧"],
            ["右上", "リペア時期チェック", "前回来店日から自動計算"],
            ["左下", "メニュー・料金", "メニュー一覧"],
            ["中央下", "スタンプカード", "ポイントカード"],
            ["右下", "アクセス", "地図・営業情報"],
          ]}
        />

        <Callout type="point" title="まつげサロンのポイント">
          「リペア時期チェック」がまつげサロン特有の機能。前回来店日からリペア推奨日を自動表示し、予約につなげる導線が効果的です。
        </Callout>
      </section>

      <section>
        <h2 id="hair-removal" className="text-xl font-bold text-gray-800">脱毛サロンのリッチメニュー</h2>

        <ComparisonTable
          headers={["位置", "ボタン", "リンク先"]}
          rows={[
            ["左上", "予約する", "予約ページ"],
            ["中央上", "コース進捗確認", "施術回数・残回数表示"],
            ["右上", "クーポン・友だち紹介", "紹介キャンペーン"],
            ["左下", "プラン・料金", "プラン一覧"],
            ["中央下", "よくある質問", "FAQ"],
            ["右下", "アクセス", "地図・営業情報"],
          ]}
        />

        <Callout type="point" title="脱毛サロンのポイント">
          「コース進捗確認」で残回数を可視化し、継続モチベーションを維持。「友だち紹介」ボタンで新規集客も同時に狙います。
        </Callout>
      </section>

      <section>
        <h2 id="customize" className="text-xl font-bold text-gray-800">カスタマイズのポイント</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>ブランドカラーに統一</strong> — テンプレートの色をサロンのブランドカラーに変更</li>
          <li><strong>季節ごとに更新</strong> — 季節キャンペーンに合わせてバナーを変更</li>
          <li><strong>A/Bテストで最適化</strong> — ボタン配置を変えて反応率を比較テスト</li>
        </ul>

        <p className="mt-4">リッチメニューの基本設計は<Link href="/salon/column/salon-rich-menu-design-guide" className="text-blue-600 underline">リッチメニューの作り方</Link>、A/Bテストの方法は<Link href="/salon/column/salon-rich-menu-ab-test-guide" className="text-blue-600 underline">リッチメニューA/Bテストガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "5業態", label: "テンプレートの種類" },
          { value: "6分割", label: "推奨レイアウト" },
          { value: "2倍", label: "最適化後の予約率向上" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>業態ごとにキーボタンが異なる</strong> — 美容室はスタイリスト、ネイルはデザインギャラリー</li>
          <li><strong>予約ボタンは左上固定</strong> — 全業態共通のベストポジション</li>
          <li><strong>テンプレートをベースにカスタマイズ</strong> — ブランドカラーと季節感を反映</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、5業態のリッチメニューテンプレートを標準搭載。ドラッグ＆ドロップでカスタマイズでき、デザイナー不要でプロ品質のリッチメニューを作成できます。</p>
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
