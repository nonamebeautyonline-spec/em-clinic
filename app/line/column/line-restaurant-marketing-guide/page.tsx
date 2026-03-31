import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-restaurant-marketing-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "飲食店のLINE公式アカウント運用で最初にやるべきことは？", a: "まずは友だち集めの仕組みを作ることです。店頭POP・レジ横のQRコード・テーブルテントの設置が基本です。「友だち追加で1品サービス」のような初回特典をつけると追加率が大幅に上がります。並行してリッチメニューとあいさつメッセージを設定しましょう。" },
  { q: "飲食店に最適な配信頻度は？", a: "週1〜2回が目安です。特に金曜夕方に週末の来店を促す配信、火〜水曜日にランチやディナーのお知らせを配信するパターンが効果的です。宣伝ばかりでなく、新メニュー紹介やシェフのこだわり紹介など読んで楽しいコンテンツを織り交ぜるとブロック率を抑えられます。" },
  { q: "ショップカード（ポイントカード）は効果がありますか？", a: "はい、飲食店では非常に効果的です。紙のポイントカードと違い紛失しないため、利用率が大幅に高くなります。来店5回ごとに500円OFFクーポンを付与するなどの設計で、リピート来店を強力に促進できます。" },
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
  "飲食店特有のLINE活用戦略（クーポン・ショップカード・予約管理）",
  "リピート率を2倍にする配信設計とセグメント活用法",
  "友だち集めから売上向上まで、飲食店のLINE運用ロードマップ",
];

const toc = [
  { id: "why-restaurant-line", label: "飲食店がLINEを活用すべき理由" },
  { id: "friends-collection", label: "友だち集めの施策" },
  { id: "coupon-strategy", label: "クーポン配信戦略" },
  { id: "shop-card", label: "ショップカード活用" },
  { id: "delivery-design", label: "配信設計のポイント" },
  { id: "reservation", label: "予約管理の効率化" },
  { id: "success-case", label: "成功事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="飲食店LINE活用" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">飲食店のLINE公式アカウント活用は、<strong>リピート率向上と集客コスト削減</strong>の両面で高い効果を発揮します。クーポン配信・ショップカード・予約管理・セグメント配信を組み合わせることで、既存顧客のリピート率を2倍に引き上げた事例も。本記事では、飲食業界に特化したLINE運用戦略を友だち集めから売上向上まで包括的に解説します。</p>

      <section>
        <h2 id="why-restaurant-line" className="text-xl font-bold text-gray-800">飲食店がLINEを活用すべき理由</h2>

        <StatGrid stats={[
          { value: "9,600万人", label: "LINEの国内月間アクティブユーザー" },
          { value: "85%", label: "メッセージ開封率（メルマガの3〜4倍）" },
          { value: "2倍", label: "LINE活用店のリピート率向上" },
        ]} />

        <Callout type="point" title="飲食店にLINEが最適な4つの理由">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>来店動機の喚起</strong> — クーポンや新メニュー情報で来店のきっかけを作れる</li>
            <li><strong>ショップカード機能</strong> — 紙のポイントカードを完全デジタル化</li>
            <li><strong>予約の自動化</strong> — 電話対応を減らし、業務効率を大幅に向上</li>
            <li><strong>顧客データの蓄積</strong> — 来店頻度・注文傾向に基づくパーソナライズ配信が可能</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="friends-collection" className="text-xl font-bold text-gray-800">友だち集めの施策</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">店頭での施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>レジ横QRコードPOP</strong> — 「友だち追加で1品サービス」の特典付き</li>
          <li><strong>テーブルテント</strong> — 待ち時間に友だち追加を促進</li>
          <li><strong>レシートに印刷</strong> — QRコードと特典案内をレシートに印刷</li>
          <li><strong>スタッフからの声かけ</strong> — 「LINEでクーポンお配りしています」の一言で追加率UP</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">オンラインでの施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Googleマイビジネス</strong> — プロフィールにLINE友だち追加リンクを掲載</li>
          <li><strong>Instagram・X連携</strong> — プロフィール欄にLINE追加リンクを常設</li>
          <li><strong>食べログ・ぐるなび</strong> — 店舗ページからの導線を設置</li>
        </ul>

        <ResultCard before="月20人（POP設置のみ）" after="月150人（特典+声かけ+SNS連携）" metric="月間友だち追加数" description="複数施策の組み合わせで7.5倍に増加" />
      </section>

      <section>
        <h2 id="coupon-strategy" className="text-xl font-bold text-gray-800">クーポン配信戦略</h2>
        <p>クーポンは飲食店のLINE運用で最も強力なツールです。ただし、闇雲に配信すると利益率が低下するため、戦略的な設計が必要です。</p>

        <ComparisonTable
          headers={["クーポン種類", "タイミング", "効果"]}
          rows={[
            ["友だち追加クーポン", "初回追加時", "友だち追加率を3倍に向上"],
            ["再来店クーポン", "来店後7日目", "2回目来店率を35%向上"],
            ["誕生日クーポン", "誕生月", "特別感でロイヤルティ向上"],
            ["休眠復帰クーポン", "30日以上未来店", "休眠顧客の20%を復帰"],
            ["平日限定クーポン", "毎週火〜木曜", "閑散期の来客数を底上げ"],
          ]}
        />

        <Callout type="warning" title="クーポン疲れに注意">
          毎回クーポンを配信すると「クーポンがないと行かない」顧客を増やしてしまいます。クーポンは月1〜2回に抑え、他の配信では新メニュー紹介やシェフの裏話など、価値あるコンテンツを配信しましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="shop-card" className="text-xl font-bold text-gray-800">ショップカード（ポイントカード）活用</h2>

        <StatGrid stats={[
          { value: "90%", label: "紛失しないデジタルの利用継続率" },
          { value: "+45%", label: "紙カード比のリピート率向上" },
          { value: "0円", label: "運用コスト（LINE標準機能）" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">効果的なショップカード設計</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>来店5回で500円OFF</strong> — 達成しやすい回数設定でモチベーション維持</li>
          <li><strong>中間特典の設置</strong> — 3回目にドリンク1杯サービスなど中間ボーナスを追加</li>
          <li><strong>ランクアップ制</strong> — ゴールド・プラチナなどのランクで常連客を優遇</li>
        </ul>
      </section>

      <section>
        <h2 id="delivery-design" className="text-xl font-bold text-gray-800">配信設計のポイント</h2>

        <ComparisonTable
          headers={["配信タイミング", "コンテンツ", "目的"]}
          rows={[
            ["金曜 17:00", "週末限定メニュー・クーポン", "週末の来店を促進"],
            ["火曜 11:00", "ランチおすすめ+写真", "平日ランチの集客"],
            ["月初", "今月の新メニュー紹介", "新メニューへの関心喚起"],
            ["誕生月", "誕生日クーポン", "特別感の演出"],
            ["来店後7日目", "再来店クーポン（自動）", "2回目来店の促進"],
          ]}
        />

        <p>配信タイミングの最適化については<Link href="/line/column/line-delivery-best-time-frequency" className="text-blue-600 underline">最適な配信頻度・時間帯</Link>で業種別のデータを解説しています。</p>
      </section>

      <section>
        <h2 id="reservation" className="text-xl font-bold text-gray-800">予約管理の効率化</h2>
        <p>LINEでの予約受付を導入すると、電話対応の負荷を大幅に削減できます。</p>

        <BarChart
          data={[
            { label: "電話予約", value: 100, color: "#94a3b8" },
            { label: "Web予約", value: 140, color: "#3b82f6" },
            { label: "LINE予約", value: 250, color: "#22c55e" },
          ]}
          unit="件/月"
        />

        <p>LINE予約システムの詳しい導入方法は<Link href="/line/column/line-reservation-system-integration" className="text-blue-600 underline">LINE予約システム導入ガイド</Link>をご覧ください。</p>
      </section>

      <section>
        <h2 id="success-case" className="text-xl font-bold text-gray-800">成功事例</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">イタリアンレストラン（友だち数1,200人）</h3>
        <StatGrid stats={[
          { value: "2.1倍", label: "リピート率の向上" },
          { value: "月30万円", label: "LINE経由の売上増加" },
          { value: "70%削減", label: "電話予約対応工数" },
        ]} />
        <p>金曜夕方のクーポン配信+ショップカード+LINE予約の3施策を導入。特にショップカードの中間特典（3回来店で前菜サービス）がリピート率向上に大きく貢献しました。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ラーメン店（友だち数3,500人）</h3>
        <StatGrid stats={[
          { value: "月500人", label: "LINE経由来店客数" },
          { value: "45%", label: "クーポン利用率" },
          { value: "1.8倍", label: "平日ランチの来客数" },
        ]} />
        <p>火〜木曜のランチタイム限定クーポンで平日の閑散期を底上げ。セグメント配信で「ランチ来店者」と「ディナー来店者」を分けた配信が高い開封率を実現しました。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>友だち集めは店頭施策+特典が基本</strong> — レジ横POP・テーブルテント・友だち追加特典の3点セット</li>
          <li><strong>クーポンは戦略的に月1〜2回</strong> — 再来店・誕生日・平日限定など目的別に設計</li>
          <li><strong>ショップカードでリピート率+45%</strong> — 中間特典+ランクアップ制で来店動機を強化</li>
          <li><strong>配信は金曜夕方+火〜木ランチ前</strong> — 飲食店の来店決定タイミングに合わせる</li>
          <li><strong>LINE予約で電話対応を70%削減</strong> — 予約+リマインドで無断キャンセルも防止</li>
        </ol>
        <p className="mt-4">飲食店のリッチメニュー設計例は<Link href="/line/column/line-rich-menu-design-examples-20" className="text-blue-600 underline">デザイン事例20選</Link>の飲食店事例もご参照ください。</p>
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
