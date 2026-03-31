import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-rich-menu-design-examples-20")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "リッチメニューのデザインは自分で作成できますか？", a: "はい、Canvaなどの無料デザインツールで作成可能です。LINE公式アカウントの管理画面にも簡易的なイメージメーカーが搭載されています。本格的なデザインが必要な場合はデザイナーへの外注も選択肢です。費用相場は1デザインあたり5,000〜30,000円程度です。" },
  { q: "業種によってリッチメニューのデザインは変えるべきですか？", a: "はい、業種によってユーザーが求めるアクションが異なるため、業種に合わせたデザインが効果的です。飲食店なら「メニュー/クーポン/予約」、美容サロンなら「メニュー/予約/スタイル一覧」など、業種特有のニーズに対応した構成にしましょう。" },
  { q: "リッチメニューは何パターン用意すべきですか？", a: "最低2パターンは用意することをおすすめします。1つは新規ユーザー向け（初回クーポン・サービス紹介中心）、もう1つはリピーター向け（予約・ポイントカード中心）です。タブ切り替え機能を使えば1画面で複数メニューを切り替えることも可能です。" },
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
  "飲食・美容・EC・不動産・教育など業種別のリッチメニューデザイン事例20選",
  "CVRに直結するUI設計パターンとデザインの共通原則",
  "CanvaやFigmaでの作成手順とデザインテンプレートの活用法",
];

const toc = [
  { id: "design-principles", label: "デザインの共通原則" },
  { id: "restaurant-examples", label: "飲食店の事例（4選）" },
  { id: "beauty-examples", label: "美容サロンの事例（4選）" },
  { id: "ec-examples", label: "EC・小売の事例（4選）" },
  { id: "service-examples", label: "不動産・教育・医療の事例（4選）" },
  { id: "advanced-examples", label: "高度なデザイン事例（4選）" },
  { id: "creation-tools", label: "デザイン作成ツール" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="デザイン事例20選" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">リッチメニューのデザインはLINE公式アカウントの<strong>「顔」</strong>であり、ユーザーのアクション率を大きく左右します。本記事では飲食・美容・EC・不動産・教育など<strong>業種別に20パターン</strong>のデザイン事例を紹介し、CVRに直結するUI設計の共通原則を解説します。</p>

      <section>
        <h2 id="design-principles" className="text-xl font-bold text-gray-800">デザインの共通原則</h2>
        <p>業種を問わず、効果の高いリッチメニューには共通するデザイン原則があります。</p>

        <StatGrid stats={[
          { value: "3〜4枠", label: "最もタップ率が高い枠数" },
          { value: "左上", label: "最もタップされるエリア" },
          { value: "月1回", label: "推奨デザイン更新頻度" },
        ]} />

        <Callout type="point" title="高CVRメニューの5つの共通点">
          <ol className="list-decimal pl-4 space-y-1 mt-1">
            <li><strong>主要アクションが3〜4つに絞られている</strong> — 選択肢が多すぎると迷う</li>
            <li><strong>アイコン+テキストで直感的</strong> — アイコンだけでは伝わらない</li>
            <li><strong>ブランドカラーで統一</strong> — プロフェッショナルな印象</li>
            <li><strong>CTAが明確</strong> — 「予約」「クーポン」など具体的なアクション名</li>
            <li><strong>定期的に更新</strong> — 季節やキャンペーンに合わせてデザインを刷新</li>
          </ol>
        </Callout>
      </section>

      <section>
        <h2 id="restaurant-examples" className="text-xl font-bold text-gray-800">飲食店のリッチメニュー事例（4選）</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例1: カフェ — シンプル3枠構成</h3>
        <p>「メニュー」「テイクアウト注文」「クーポン」の3枠構成。ナチュラルなブラウン系のカラーで温かみを表現し、メニュー写真を背景に使用。テイクアウト注文のCVRが導入前の2.3倍に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例2: 居酒屋 — クーポン押し6枠構成</h3>
        <p>左上に「今週のクーポン」を大きく配置し、残り5枠に「コース予約」「メニュー」「アクセス」「幹事特典」「口コミ投稿」を配置。クーポン利用率がチラシ比で4倍に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例3: ラーメン店 — 写真全面+2枠構成</h3>
        <p>人気メニューの写真を全面に使用し、下部に「メニュー」「ポイントカード」の2枠を配置。シンプルながら来店動機を高めるデザイン。ショップカード利用率が65%に到達。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例4: デリバリー専門店 — 注文導線特化型</h3>
        <p>「今すぐ注文」ボタンを画面の1/3を占める大きさで配置し、残りに「メニュー」「配達エリア」「お問い合わせ」を配置。注文ページへの遷移率が従来のテキストリンク比で3.5倍に。</p>

        <ResultCard before="テキストリンクのみ" after="リッチメニュー導入" metric="飲食店の平均CVR" description="予約・注文CVRが平均2.5倍に向上" />
      </section>

      <section>
        <h2 id="beauty-examples" className="text-xl font-bold text-gray-800">美容サロンのリッチメニュー事例（4選）</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例5: ヘアサロン — 予約導線重視型</h3>
        <p>左上に「予約する」を大きく配置し、「メニュー・料金」「スタイル一覧」「アクセス」の4枠構成。ピンクゴールドのカラーで上品な印象。予約率が1.8倍に向上。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例6: エステサロン — 初回特典押し型</h3>
        <p>上段に「初回体験50%OFF」の大きなバナーを配置し、下段に「メニュー」「口コミ」「予約」の3枠。初回体験の申込率が3.2倍に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例7: ネイルサロン — ギャラリー重視型</h3>
        <p>「デザインギャラリー」を最大の枠で配置し、インスタグラム風のビジュアルで訴求。「予約」「料金」「空き状況」を小枠で配置。ギャラリー閲覧からの予約率が42%に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例8: まつエクサロン — タブ切り替え型</h3>
        <p>「新規の方」「リピーターの方」のタブ切り替えメニューを実装。新規向けは初回クーポン・メニュー紹介中心、リピーター向けは予約・ポイントカード中心の構成。リピート予約率が28%向上。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="ec-examples" className="text-xl font-bold text-gray-800">EC・小売のリッチメニュー事例（4選）</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例9: アパレルEC — カテゴリ一覧型</h3>
        <p>6枠に「新着」「セール」「レディース」「メンズ」「ランキング」「お気に入り」を配置。カテゴリ別の写真をアイコン代わりに使用し、ブランドの世界観を表現。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例10: コスメブランド — 肌診断導線型</h3>
        <p>「肌診断スタート」を最大枠で配置し、診断結果からおすすめ商品ページに遷移。「商品一覧」「口コミ」「お得情報」を補助枠で配置。診断完了者の購入率が38%に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例11: 食品EC — 定期便推し型</h3>
        <p>「定期便を始める」を左上に大きく配置し、定期便のメリットを視覚的に訴求。「商品一覧」「レシピ」「お問い合わせ」を併設。定期便の新規申込率が2.1倍に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例12: 雑貨店 — 季節更新型</h3>
        <p>月替わりで季節のテーマカラーとおすすめ商品を変更。「今月のおすすめ」枠を毎月更新することで、常にフレッシュな印象を維持。リピート購入率が35%向上。</p>
      </section>

      <section>
        <h2 id="service-examples" className="text-xl font-bold text-gray-800">不動産・教育・医療の事例（4選）</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例13: 不動産仲介 — 物件検索導線型</h3>
        <p>「物件を探す」「内見予約」「相談する」「お役立ち情報」の4枠構成。青系のカラーで信頼感を表現。内見予約数が従来の電話予約比で1.7倍に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例14: 学習塾 — 体験授業誘導型</h3>
        <p>「無料体験に申し込む」を最大枠で配置し、「コース紹介」「合格実績」「アクセス」を補助枠で。体験授業の申込率が2.4倍に。保護者向けの安心感のあるデザインが特徴。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例15: クリニック — 予約+情報提供型</h3>
        <p>「Web予約」「診療メニュー」「料金」「アクセス」「よくある質問」「お知らせ」の6枠構成。清潔感のある白×ブルーのデザイン。Web予約率が電話予約の3倍に。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例16: フィットネスジム — 入会促進型</h3>
        <p>「入会キャンペーン」を上段に大きく配置し、下段に「施設紹介」「料金プラン」「体験予約」を配置。入会申込のCVRが2.6倍に。</p>
      </section>

      <section>
        <h2 id="advanced-examples" className="text-xl font-bold text-gray-800">高度なデザイン事例（4選）</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例17: タブ切り替え+アニメーション風</h3>
        <p>「HOME」「SHOP」「EVENT」のタブ切り替えメニューで、各タブに対応するメニューを表示。タブ部分のデザインを統一し、切り替え体験をスムーズに。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例18: ユーザーステータス別メニュー</h3>
        <p>会員ランク（ゴールド・シルバー・レギュラー）に応じて異なるリッチメニューを自動切り替え。ゴールド会員にはVIP特典枠を表示し、ロイヤルティを強化。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例19: クイズ形式のインタラクティブメニュー</h3>
        <p>「あなたに合う商品は？」というクイズの選択肢をリッチメニューで表示。選択結果に応じてシナリオ配信を分岐させ、パーソナライズされた商品提案を実現。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例20: 季節イベント特化型</h3>
        <p>クリスマス・バレンタイン・夏祭りなど、季節イベントに合わせて期間限定のデザインに全面変更。通常メニューとイベントメニューを自動切り替えし、イベント期間中のCVRが平均1.9倍に。</p>

        <Callout type="point" title="高度な実装には拡張ツールが必要">
          タブ切り替えやユーザーステータス別メニューの実装にはLステップ等の拡張ツールが必要です。詳しい実装方法は<Link href="/line/column/line-rich-menu-tab-switching-implementation" className="text-blue-600 underline">タブ切り替え実装ガイド</Link>をご覧ください。
        </Callout>
      </section>

      <section>
        <h2 id="creation-tools" className="text-xl font-bold text-gray-800">デザイン作成に使えるツール</h2>

        <ComparisonTable
          headers={["ツール", "費用", "特徴", "おすすめ度"]}
          rows={[
            ["Canva", "無料〜", "テンプレート豊富・初心者向け", "★★★★★"],
            ["Figma", "無料〜", "自由度が高い・チーム共有可能", "★★★★☆"],
            ["LINE公式イメージメーカー", "無料", "管理画面内で簡易作成", "★★★☆☆"],
            ["Photoshop", "月額2,728円〜", "プロ向け・高品質", "★★★★☆"],
            ["外注（デザイナー）", "5,000〜30,000円/1枚", "プロクオリティ", "★★★★★"],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "20事例", label: "業種別デザインパターン" },
          { value: "2〜3倍", label: "メニュー最適化によるCVR向上" },
          { value: "3〜4枠", label: "最も効果の高い枠数" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>業種に合ったメニュー構成を選ぶ</strong> — ユーザーが求めるアクションは業種で異なる</li>
          <li><strong>3〜4枠で主要アクションに集中</strong> — 選択肢を絞ることでタップ率が向上</li>
          <li><strong>ブランドカラーとアイコン+テキストで統一</strong> — 直感的に操作できるデザインが鍵</li>
          <li><strong>定期的なデザイン更新</strong> — 季節やキャンペーンに合わせて刷新する</li>
          <li><strong>ABテストでデータに基づく改善を</strong> — 感覚ではなく数値でデザインを判断する</li>
        </ol>
        <p className="mt-4">リッチメニューの基本設定から学びたい方は<Link href="/line/column/line-rich-menu-complete-guide" className="text-blue-600 underline">リッチメニュー作り方完全ガイド</Link>をご覧ください。</p>
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
