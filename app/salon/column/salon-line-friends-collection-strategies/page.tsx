import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-friends-collection-strategies")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "友だち追加特典はどのくらいの金額が効果的ですか？", a: "500〜1,000円OFF（または10%OFF）が最もコスパが高いラインです。あまり高額な割引にすると利益を圧迫し、安すぎると追加のインセンティブになりません。施術単価の5〜10%程度を目安にしましょう。" },
  { q: "Instagramからの友だち追加はどうやって促しますか？", a: "プロフィールリンクにLINE友だち追加URLを設定し、ストーリーズで定期的に「LINE限定クーポン配信中」と告知するのが効果的です。ハイライトに「LINE特典」を固定するのもおすすめです。" },
  { q: "友だち追加後のブロックを防ぐには？", a: "友だち追加直後の1週間が最もブロックされやすい期間です。あいさつメッセージで即座にメリット（クーポン）を提示し、その後1週間は配信を控えることでブロック率を抑えられます。" },
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
  "オフライン（店頭）とオンライン（SNS・Web）の友だち集め施策10選",
  "施策ごとの効果目安と優先順位の付け方",
  "友だち追加後のブロックを防ぐファーストタッチ設計",
];

const toc = [
  { id: "why-friends", label: "友だち数がサロン売上に直結する理由" },
  { id: "offline", label: "オフライン施策（店頭5選）" },
  { id: "online", label: "オンライン施策（Web・SNS5選）" },
  { id: "priority", label: "施策の優先順位" },
  { id: "first-touch", label: "友だち追加後のファーストタッチ設計" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE友だち集め10の施策" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの友だち数は、サロンの売上に直結する最重要指標です。本記事では、<strong>店頭施策5つ・オンライン施策5つ</strong>の合計10の具体的な友だち集め方法を、効果目安とともに紹介します。</p>

      <section>
        <h2 id="why-friends" className="text-xl font-bold text-gray-800">友だち数がサロン売上に直結する理由</h2>

        <StatGrid stats={[
          { value: "85%", label: "LINEメッセージの平均開封率" },
          { value: "3〜5倍", label: "メールと比較した反応率" },
          { value: "15%", label: "クーポン配信時の平均来店率" },
        ]} />

        <p>LINE友だち1人あたりの月間売上貢献額は平均<strong>300〜500円</strong>と言われています。つまり、友だち数が100人増えると月間売上が<strong>3〜5万円</strong>増加する計算です。</p>

        <Callout type="point" title="友だち数 × 配信力 = 売上">
          単に友だちを増やすだけでなく、適切な配信で来店に結びつけることが重要です。友だち数とリピート率の掛け算がサロンの売上を決定します。
        </Callout>
      </section>

      <section>
        <h2 id="offline" className="text-xl font-bold text-gray-800">オフライン施策：店頭での友だち集め5選</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 会計時のスタッフ声かけ</h3>
        <p>最も効果が高い施策です。「LINEのお友だち登録で次回500円OFFのクーポンお渡ししてます」と、会計時に全スタッフが案内します。声かけ時の追加率は<strong>約40〜60%</strong>です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. QRコード付きPOP設置</h3>
        <p>レジ横・鏡前・待合スペース・トイレにQRコード付きPOPを設置します。特典内容を大きく明記し、QRコードはスマートフォンで読み取りやすい3cm以上のサイズにしましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. 名刺・ショップカードにQRコード印刷</h3>
        <p>お渡しする名刺やショップカードの裏面にQRコードを印刷。「LINEでかんたん予約」の一言を添えると効果的です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. 施術中のタブレット提示</h3>
        <p>カット中やネイル施術中にタブレットでQRコードを提示。施術中はスマートフォンを触る余裕があるため、追加率が高い傾向にあります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">5. イベント・キャンペーン連動</h3>
        <p>周年イベントや季節キャンペーン時に「LINE友だち限定の特別メニュー」を用意し、友だち追加を促します。</p>

        <BarChart
          data={[
            { label: "声かけ", value: 50, color: "#22c55e" },
            { label: "POP", value: 20, color: "#3b82f6" },
            { label: "名刺・カード", value: 10, color: "#f59e0b" },
            { label: "タブレット", value: 15, color: "#a855f7" },
            { label: "イベント", value: 5, color: "#ec4899" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="online" className="text-xl font-bold text-gray-800">オンライン施策：Web・SNSでの友だち集め5選</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">6. Instagramプロフィール・ストーリーズ</h3>
        <p>プロフィールリンクにLINE追加URLを設定。ストーリーズで「LINE限定クーポン配信中」と週1〜2回告知します。ハイライトに固定するのも有効です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">7. ホットペッパー予約完了メッセージ</h3>
        <p>ホットペッパーの予約完了後のメッセージにLINE友だち追加の案内を追記。「LINEからの次回予約で500円OFF」と来店前に友だち追加を促します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">8. Googleビジネスプロフィール</h3>
        <p>Googleマップのビジネスプロフィールにリンクを追加。「LINE予約はこちら」のボタンを設定します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">9. 自社WebサイトのLINEボタン</h3>
        <p>サイトのヘッダーやフッター、予約ページに「LINEで予約」ボタンを設置。スマートフォン閲覧時はLINEアプリが直接起動するリンクを使用します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">10. 友だち紹介キャンペーン</h3>
        <p>既存友だちに「お友だちを紹介すると双方に500円OFF」キャンペーンを実施。紹介する側もされる側もメリットを感じられる設計がポイントです。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="priority" className="text-xl font-bold text-gray-800">施策の優先順位</h2>

        <FlowSteps steps={[
          { title: "最優先：声かけ＋POP設置", desc: "コストゼロで即日開始可能。来店客の50%以上を友だちに変換できる" },
          { title: "第2段階：Instagram連携", desc: "既存フォロワーをLINE友だちに移行。デザイン訴求と相性がよい" },
          { title: "第3段階：ホットペッパー連携", desc: "新規客の来店前にLINE友だち化。リピートの起点を作る" },
          { title: "第4段階：友だち紹介", desc: "友だち数100人以上になったら実施。紹介の連鎖で加速度的に増加" },
        ]} />

        <ResultCard before="0人" after="50〜80人/月" metric="友だち追加数" description="声かけ＋POP＋Instagram連携で初月から達成可能" />
      </section>

      <section>
        <h2 id="first-touch" className="text-xl font-bold text-gray-800">友だち追加後のファーストタッチ設計</h2>
        <p>友だちを集めた後、最初の1週間でブロックされないことが重要です。</p>

        <Callout type="warning" title="追加直後1週間のブロック率が最も高い">
          あいさつメッセージ送信後、1週間以内にブロックされるケースが全ブロックの約60%を占めます。この期間に過度な配信を行わないことが鉄則です。
        </Callout>

        <FlowSteps steps={[
          { title: "友だち追加直後", desc: "あいさつメッセージ＋クーポンを自動送信" },
          { title: "1〜7日間", desc: "配信なし。お客様が自分のペースでリッチメニューを閲覧" },
          { title: "来店時", desc: "クーポン利用を確認。来店お礼メッセージを手動で送信" },
          { title: "来店後2〜3日", desc: "アフターフォローメッセージ。次回予約の案内" },
        ]} />

        <p className="mt-4">ブロック率を下げる詳細な施策は<Link href="/salon/column/salon-line-block-rate-reduction" className="text-blue-600 underline">LINEブロック率を下げる7つの方法</Link>で解説しています。DX全体の進め方は<Link href="/salon/column/salon-digital-transformation-line" className="text-blue-600 underline">サロンのDXはLINEから始める</Link>もご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>声かけとPOP設置を最優先</strong> — コストゼロで最も効果が高い</li>
          <li><strong>オンラインとオフラインの両面で攻める</strong> — 来店前のお客様もLINEに取り込む</li>
          <li><strong>友だち追加後の1週間は配信を控える</strong> — ブロック率を最小化する</li>
          <li><strong>友だち数 × 配信力で売上に直結</strong> — 集めた友だちを適切にリピートに結びつける</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、友だち集めから配信・分析まで一気通貫でサポート。サロンに最適化されたテンプレートとノウハウで、友だち数の急速な拡大を支援します。</p>
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
