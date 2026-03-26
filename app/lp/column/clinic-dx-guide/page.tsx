import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  FlowSteps,
  StatGrid,
  DonutChart,
  BarChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-dx-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  dateModified: self.updatedDate || self.date,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "クリニックDXをLINE公式アカウントから始める段階的なロードマップ",
  "5ステップで予約・問診・会計・配送をデジタル化する方法",
  "DX導入で失敗しないためのポイントと対策",
];

const toc = [
  { id: "what-is-dx", label: "クリニックDXとは" },
  { id: "why-line", label: "LINE公式アカウントが最適な理由" },
  { id: "five-steps", label: "5つのステップ" },
  { id: "avoid-failure", label: "DXで失敗しないために" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="DXガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックDXはLINE公式アカウントを起点に、予約・問診・会計・配送を<strong>5ステップ</strong>で段階的にデジタル化するのが最も成功率の高い進め方です。本記事では、何から始めればいいか分からないクリニック向けに、具体的なロードマップと失敗しないためのポイントを解説します。
      </p>

      {/* SEO用セマンティックリスト — Featured Snippet対策 */}
      <ol className="list-decimal pl-6 space-y-1 text-[14px] text-gray-700">
        <li>LINE公式アカウント開設（1日目）</li>
        <li>リッチメニュー+自動応答の設定（1週間目）</li>
        <li>オンライン問診+予約管理（2週間目）</li>
        <li>セグメント配信+患者CRM（1ヶ月目）</li>
        <li>決済・配送・分析の統合（2ヶ月目〜）</li>
      </ol>

      <section>
        <h2 id="what-is-dx" className="text-xl font-bold text-gray-800">クリニックDXとは何か</h2>
        <p>DX（デジタルトランスフォーメーション）とは、デジタル技術を活用して業務プロセスやサービス提供の方法を根本的に変革することです。クリニックにおけるDXとは、紙やExcel、電話に頼っていた業務をデジタル化し、<strong>患者体験の向上と業務効率化を同時に実現</strong>することを指します。</p>

        <Callout type="warning" title="「何から始めればいいか分からない」が最大の壁">
          電子カルテ・予約システム・LINE配信・決済...選択肢が多すぎて手が止まるケースが大半です。LINE活用の具体的な成功事例は<Link href="/lp/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link>で紹介しています。このガイドでは、LINE公式アカウントを起点にした段階的なDXの進め方を解説します。
        </Callout>
      </section>

      <section>
        <h2 id="why-line" className="text-xl font-bold text-gray-800">なぜLINE公式アカウントがDXの起点として最適なのか</h2>

        <StatGrid stats={[
          { value: "9,700", unit: "万人+", label: "日本のLINEユーザー数" },
          { value: "80", unit: "%超", label: "メッセージ開封率" },
          { value: "0", unit: "円", label: "患者側のアプリ追加費用" },
        ]} />

        <BarChart
          data={[
            { label: "LINE", value: 80, color: "bg-emerald-500" },
            { label: "メール", value: 20, color: "bg-gray-400" },
            { label: "SMS", value: 70, color: "bg-gray-400" },
            { label: "電話（応答率）", value: 50, color: "bg-gray-400" },
          ]}
          unit="%"
        />

        <Callout type="success" title="LINEが起点に最適な4つの理由">
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>患者の利用率が圧倒的</strong> — 新しいアプリをインストールしてもらう必要がない</li>
            <li><strong>メール・電話より確実に届く</strong> — 開封率80%超でコストも低い</li>
            <li><strong>双方向コミュニケーション</strong> — 患者からの問い合わせもLINEで完結</li>
            <li><strong>段階的に機能を拡張できる</strong> — 配信から始め、予約・問診・決済と拡大可能</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="five-steps" className="text-xl font-bold text-gray-800">クリニックDXの5つのステップ</h2>

        <FlowSteps steps={[
          { title: "LINE公式アカウント開設（1日目）", desc: "Messaging APIを設定し、院内にQRコードを掲示。来院患者に友だち追加を促し、まずはLINEを「連絡手段」として活用開始。" },
          { title: "リッチメニュー+自動応答の設定（1週間目）", desc: "「予約する」「問診票を記入」「アクセス」などのボタンを配置。リッチメニューの設計ノウハウは別記事で解説。よくある質問にはAI自動返信を設定し、電話問い合わせを大幅に削減。" },
          { title: "オンライン問診+予約管理（2週間目）", desc: "紙の問診票をLINE上のフォームに移行。来院前に問診完了で待ち時間短縮。予約もLINE上で完結し、前日に自動リマインドを送信。" },
          { title: "セグメント配信+患者CRM（1ヶ月目）", desc: "来院履歴・診療科・タグなどのデータを活用。再診促進・キャンペーン告知・定期検診リマインドなど、患者ごとに最適なメッセージを配信。" },
          { title: "決済・配送・分析の統合（2ヶ月目〜）", desc: "LINE上でオンライン決済を完了。配送管理も統合。ダッシュボードで売上・予約数・リピート率・LTVをリアルタイム確認。" },
        ]} />

        <InlineCTA />
      </section>

      <section>
        <h2 id="avoid-failure" className="text-xl font-bold text-gray-800">DXで失敗しないために</h2>
        <p>クリニックDXでよくある失敗パターンと対策です。</p>

        <Callout type="warning" title="一度にすべてをやろうとする">
          段階的に導入しましょう。まずはステップ1-2から始め、現場が慣れてから拡張。最初から全機能を一気に入れると混乱のもとです。
        </Callout>

        <Callout type="warning" title="スタッフの理解を得られない">
          「電話対応が減る」「手作業が減る」という具体的メリットを数字で示すことが重要です。導入前後のデータ比較が説得力を生みます。
        </Callout>

        <Callout type="point" title="成功するDXの3原則">
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li><strong>クリニック専用のオールインワンツール</strong>を選ぶ（汎用ツールとの違いは<Link href="/lp/column/lstep-vs-clinic-tool" className="text-emerald-700 underline">Lステップ・Liny vs クリニック専用ツール比較</Link>を参照）</li>
            <li><strong>自動化できる部分は徹底的に自動化</strong>する（手動作業を残さない設計）</li>
            <li><strong>小さく始めて段階的に拡張</strong>する（ステップ1-2が安定してから次へ）</li>
          </ol>
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: LINE公式アカウントからDXを始めよう</h2>
        <p>クリニックDXは、LINE公式アカウントという「患者がすでに使っているチャネル」から始めるのが最も効果的です。紙→デジタル、電話→LINE、手作業→自動化を段階的に進めることで、<strong>スタッフの業務負担を削減しながら患者満足度を向上</strong>させることができます。リッチメニューの設計ポイントは<Link href="/lp/column/rich-menu-design" className="text-emerald-700 underline">リッチメニュー設計5つのポイント</Link>で詳しく解説しています。</p>

        <DonutChart percentage={80} label="LINE開封率" sublabel="メール(20%)の4倍の到達力" />

        <p>Lオペ for CLINICは、この5ステップをすべてワンストップで実現できるクリニック専用プラットフォームです。各ステップで活用できる具体的な機能は<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">機能一覧ページ</Link>でご確認いただけます。電子カルテ・予約・問診・決済を含むDXの全体設計については<Link href="/lp/column/clinic-dx-complete-guide" className="text-emerald-700 underline">クリニックDX完全ガイド</Link>もぜひご覧ください。DX導入のビフォーアフターを数値で見たい方は<Link href="/lp/column/clinic-dx-before-after" className="text-sky-600 underline hover:text-sky-800">DX導入ビフォーアフター事例</Link>を、日常業務の具体的な変化は<Link href="/lp/column/clinic-dx-daily-transformation" className="text-sky-600 underline hover:text-sky-800">DXで1日の業務がここまで変わる</Link>も参考になります。</p>
      </section>
    </ArticleLayout>
  );
}
