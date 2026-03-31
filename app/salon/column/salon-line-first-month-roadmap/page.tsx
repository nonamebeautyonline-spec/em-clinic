import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-first-month-roadmap")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE運用は1人でも回せますか？", a: "はい、小規模サロンであれば1人で十分運用可能です。初月は設定作業が中心のため、1日30分程度の時間を確保すれば進められます。2ヶ月目以降は週に1〜2回の配信作業が中心となり、1回15分程度です。" },
  { q: "最初の1ヶ月で友だちは何人集まりますか？", a: "来店客数にもよりますが、月間来店数100人のサロンで声かけとPOP設置を実施すれば、初月で30〜50人の友だち追加が見込めます。InstagramやホットペッパーからのLINE誘導を併用すると50〜80人も十分達成可能です。" },
  { q: "最初の配信は何を送ればよいですか？", a: "初回配信は「LINE限定クーポン」が最も効果的です。友だち追加のお礼とともに、次回来店時に使える500〜1,000円OFFクーポンを配信すると、開封率・利用率ともに高い傾向があります。" },
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
  "運用開始1ヶ月間の週次タスクを具体的に整理したロードマップ",
  "友だち集めの初速をつけるための店頭施策とSNS連携",
  "初回配信で反応率を最大化するメッセージ設計",
];

const toc = [
  { id: "overview", label: "1ヶ月ロードマップ全体像" },
  { id: "week1", label: "第1週：基盤整備" },
  { id: "week2", label: "第2週：友だち集め開始" },
  { id: "week3", label: "第3週：初回配信" },
  { id: "week4", label: "第4週：効果測定・改善" },
  { id: "kpi", label: "1ヶ月後のKPI目標" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE運用1ヶ月ロードマップ" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントを開設したものの、<strong>「何から手をつければよいかわからない」</strong>というサロンオーナーは少なくありません。本記事では、最初の1ヶ月間を4週に分け、毎週やるべきことを具体的にまとめたロードマップを紹介します。</p>

      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">1ヶ月ロードマップ全体像</h2>

        <FlowSteps steps={[
          { title: "第1週：基盤整備", desc: "プロフィール・あいさつメッセージ・リッチメニュー・応答設定を完了させる" },
          { title: "第2週：友だち集め開始", desc: "店頭POP設置・声かけ開始・SNSでの告知を実施" },
          { title: "第3週：初回配信", desc: "LINE限定クーポンまたはお役立ち情報を初回配信" },
          { title: "第4週：効果測定・改善", desc: "友だち数・開封率・クーポン利用率を確認し改善" },
        ]} />
      </section>

      <section>
        <h2 id="week1" className="text-xl font-bold text-gray-800">第1週：基盤整備 — 設定を完了させる</h2>
        <p>アカウント開設後、まず最初の1週間で以下の設定を完了させます。まだ開設がお済みでない場合は<Link href="/salon/column/salon-line-official-account-setup-guide" className="text-blue-600 underline">LINE公式アカウント開設ガイド</Link>を参照してください。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">第1週のタスクリスト</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>プロフィール完成</strong> — ロゴ画像、ステータスメッセージ、営業時間、住所、Webリンクを設定</li>
          <li><strong>あいさつメッセージ設定</strong> — 友だち追加直後の自動メッセージを作成（3吹き出し以内）</li>
          <li><strong>リッチメニュー作成</strong> — 予約・クーポン・アクセスの3ボタンを最低限配置</li>
          <li><strong>応答設定</strong> — チャットモード有効化。営業時間外の自動応答メッセージを設定</li>
          <li><strong>スタッフへの共有</strong> — 管理アプリのインストールと通知設定を全スタッフに依頼</li>
        </ul>

        <Callout type="point" title="完璧を目指さない">
          リッチメニューのデザインに時間をかけすぎるサロンが多いですが、最初はシンプルなもので十分です。運用しながら改善していく前提で、まず「使える状態」にすることを優先しましょう。
        </Callout>
      </section>

      <section>
        <h2 id="week2" className="text-xl font-bold text-gray-800">第2週：友だち集め開始</h2>
        <p>設定が完了したら、友だち集めを本格的にスタートします。</p>

        <BarChart
          data={[
            { label: "会計時の声かけ", value: 40, color: "#22c55e" },
            { label: "店頭POP・QRコード", value: 25, color: "#3b82f6" },
            { label: "Instagram連携", value: 20, color: "#f59e0b" },
            { label: "ホットペッパー誘導", value: 15, color: "#a855f7" },
          ]}
          unit="%"
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">すぐ始められる施策</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>会計時の声かけ</strong> — 「LINE登録で次回使える500円OFFクーポンお渡ししてます」とスタッフ全員が案内</li>
          <li><strong>QRコードPOP</strong> — レジ横・鏡前・待合スペースにQRコード付きPOPを設置</li>
          <li><strong>Instagramストーリーズ</strong> — 「LINE限定クーポン配信中！」とリンク付きで投稿</li>
          <li><strong>ホットペッパーのメッセージ欄</strong> — 予約確認メッセージにLINE追加の案内を追記</li>
        </ul>

        <Callout type="success" title="声かけが最強の友だち集め">
          データ上、友だち追加の約40%は会計時のスタッフの声かけから発生しています。声かけのトークスクリプトを統一し、スタッフ全員が自然に案内できる仕組みを作りましょう。詳しくは<Link href="/salon/column/salon-line-friends-collection-strategies" className="text-blue-600 underline">LINE友だち集め10の施策</Link>で解説しています。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="week3" className="text-xl font-bold text-gray-800">第3週：初回配信を実施</h2>
        <p>友だちが20〜30人集まったタイミングで、初回の一斉配信を行います。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">初回配信の鉄則</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>配信内容はクーポンが鉄板</strong> — LINE限定の割引クーポンが最も反応率が高い</li>
          <li><strong>配信時間は平日の昼12時か夜20時</strong> — サロン顧客層（20〜40代女性）のアクティブ時間帯</li>
          <li><strong>テキスト＋画像の組み合わせ</strong> — 画像付きメッセージは開封後のタップ率が2倍以上</li>
          <li><strong>吹き出しは2つまで</strong> — 多すぎると通数消費が増え、読了率も下がる</li>
        </ul>

        <StatGrid stats={[
          { value: "85%", label: "LINE配信の平均開封率" },
          { value: "12〜15%", label: "クーポンの平均利用率" },
          { value: "2倍", label: "画像付きメッセージのタップ率" },
        ]} />
      </section>

      <section>
        <h2 id="week4" className="text-xl font-bold text-gray-800">第4週：効果測定と改善</h2>
        <p>1ヶ月目の最終週は振り返りの時間です。以下のKPIを確認しましょう。</p>

        <ComparisonTable
          headers={["KPI指標", "目標値", "確認方法"]}
          rows={[
            ["友だち追加数", "30〜50人", "管理画面の友だち数推移"],
            ["ブロック率", "10%以下", "管理画面の統計データ"],
            ["開封率", "70%以上", "メッセージ配信の統計"],
            ["クーポン利用率", "10%以上", "クーポンの使用状況"],
          ]}
        />
      </section>

      <section>
        <h2 id="kpi" className="text-xl font-bold text-gray-800">1ヶ月後のKPI目標</h2>

        <StatGrid stats={[
          { value: "30〜50", unit: "人", label: "友だち追加数（月間来店100人のサロン）" },
          { value: "10%", unit: "以下", label: "ブロック率" },
          { value: "1回", label: "一斉配信の実施回数" },
        ]} />

        <Callout type="point" title="2ヶ月目以降の運用へ">
          1ヶ月目は設定と友だち集めの基盤づくりが中心です。2ヶ月目以降は週1〜2回のペースで配信を開始し、リピート促進やセグメント配信に取り組んでいきます。配信戦略の詳細は<Link href="/salon/column/salon-repeat-rate-line-delivery-strategy" className="text-blue-600 underline">リピート率を上げるLINE配信術</Link>を参照してください。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>第1週で設定を完了</strong> — プロフィール・あいさつ・リッチメニュー・応答設定</li>
          <li><strong>第2週で友だち集めをスタート</strong> — 声かけ・POP・SNS連携を一斉に開始</li>
          <li><strong>第3週で初回配信</strong> — クーポン配信で友だちに「LINE登録してよかった」と感じてもらう</li>
          <li><strong>第4週で振り返り</strong> — KPIを確認し、2ヶ月目の改善ポイントを把握</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、LINE公式アカウントの初期設定から配信・分析までワンストップで対応。サロン専用のテンプレートで最短ルートの運用立ち上げを支援します。</p>
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
