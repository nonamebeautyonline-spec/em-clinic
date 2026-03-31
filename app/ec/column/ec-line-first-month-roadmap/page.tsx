import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-first-month-roadmap")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE運用開始後、どのくらいで成果が出ますか？", a: "カゴ落ちリマインドは導入直後から効果を実感できます。友だち数が500人を超える頃（通常1〜2ヶ月）には、LINE経由売上が月商の5〜10%に達するケースが多いです。" },
  { q: "友だちが少ない段階でも配信する意味はありますか？", a: "はい。友だち数が少ない段階こそ、1人1人の反応を丁寧に分析し、配信内容を最適化するチャンスです。少人数での配信テストを経て、友だち増加後のスケール配信に備えましょう。" },
  { q: "最初の1ヶ月で最低限やるべきことは何ですか？", a: "LINE公式アカウント開設・ECカート連携・友だち獲得導線（購入完了ページ + サイトバナー）の3つです。この土台があれば、カゴ落ちリマインドとウェルカムメッセージの自動配信を開始できます。" },
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
  "運用開始1ヶ月間のWeek別タスクを明確に提示",
  "友だち獲得から初回売上までの具体的なアクションプラン",
  "1ヶ月目の成果目標と効果測定の方法",
];

const toc = [
  { id: "goal-setting", label: "1ヶ月目のゴール設定" },
  { id: "week1", label: "Week 1: 基盤構築" },
  { id: "week2", label: "Week 2: 友だち獲得開始" },
  { id: "week3", label: "Week 3: 配信テスト" },
  { id: "week4", label: "Week 4: 効果測定と改善" },
  { id: "milestones", label: "達成すべきマイルストーン" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="1ヶ月ロードマップ" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">EC×LINE運用を始めた最初の1ヶ月は、その後の成果を左右する最も重要な期間です。本記事では、<strong>Week別の具体的なタスク</strong>と達成すべきマイルストーンを整理し、1ヶ月でLINE経由の初回売上を実現するためのロードマップを提示します。</p>

      <section>
        <h2 id="goal-setting" className="text-xl font-bold text-gray-800">1ヶ月目のゴール設定</h2>

        <StatGrid stats={[
          { value: "200〜500", unit: "人", label: "友だち数（1ヶ月目標）" },
          { value: "3", unit: "本", label: "自動配信シナリオ稼働" },
          { value: "初回売上", label: "LINE経由の売上を計測" },
        ]} />

        <Callout type="point" title="1ヶ月目は「仕組みづくり」が最優先">
          最初の1ヶ月で大きな売上を期待するのではなく、カゴ落ちリマインド・ウェルカムメッセージ・発送通知の3つの自動配信を安定稼働させることがゴールです。この仕組みが2ヶ月目以降の成長基盤になります。
        </Callout>
      </section>

      <section>
        <h2 id="week1" className="text-xl font-bold text-gray-800">Week 1: 基盤構築</h2>

        <FlowSteps steps={[
          { title: "Day 1〜2: LINE公式アカウント開設", desc: "アカウント作成→Messaging API有効化→プロフィール設定（ロゴ・説明文・URL）" },
          { title: "Day 3〜4: ECカート連携", desc: "Shopify/BASE等との連携設定→Webhookテスト→顧客ID紐づけ確認" },
          { title: "Day 5〜7: 自動メッセージ設定", desc: "ウェルカムメッセージ（初回クーポン付き）→カゴ落ちリマインド（3段階）→注文確認メッセージ" },
        ]} />

        <ComparisonTable
          headers={["設定項目", "内容", "優先度"]}
          rows={[
            ["ウェルカムメッセージ", "友だち追加時の挨拶 + 10%OFFクーポン", "最高"],
            ["カゴ落ちリマインド", "1h後・24h後・72h後の3段階配信", "最高"],
            ["注文確認メッセージ", "注文番号・商品名・お届け予定日", "高"],
            ["発送通知", "追跡番号 + 配送業者リンク", "高"],
            ["配達完了通知", "受取確認 + レビュー依頼", "中"],
          ]}
        />
      </section>

      <section>
        <h2 id="week2" className="text-xl font-bold text-gray-800">Week 2: 友だち獲得開始</h2>

        <FlowSteps steps={[
          { title: "購入完了ページにLINE誘導設置", desc: "「LINEで発送状況を受け取る」ボタンを設置。購入直後で友だち追加率35%" },
          { title: "サイト内バナー設置", desc: "ヘッダー・フッター・商品ページにLINE友だち追加バナーを設置" },
          { title: "既存顧客へメールで告知", desc: "メルマガで「LINE限定クーポン」を告知し、既存顧客をLINEに誘導" },
        ]} />

        <BarChart
          data={[
            { label: "購入完了ページ", value: 35, color: "#22c55e" },
            { label: "サイトバナー", value: 15, color: "#3b82f6" },
            { label: "メルマガ告知", value: 25, color: "#f59e0b" },
            { label: "SNS告知", value: 10, color: "#8b5cf6" },
          ]}
          unit="%（友だち追加率）"
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="week3" className="text-xl font-bold text-gray-800">Week 3: 配信テストと最適化</h2>

        <FlowSteps steps={[
          { title: "テスト注文で動作確認", desc: "自分でテスト注文→カゴ落ちリマインド→注文確認→発送通知が正しく届くか確認" },
          { title: "ウェルカムシナリオの効果検証", desc: "初回クーポンの利用率・2回目配信のクリック率を確認し、メッセージを調整" },
          { title: "初回セグメント配信テスト", desc: "既存友だちに向けて人気商品紹介を配信。開封率・クリック率のベンチマークを取得" },
        ]} />

        <Callout type="warning" title="Week 3でやりがちな失敗">
          友だち数がまだ少ない段階で配信頻度を上げすぎると、ブロック率が急上昇します。Week 3は週1回の配信にとどめ、反応データの収集に専念しましょう。
        </Callout>
      </section>

      <section>
        <h2 id="week4" className="text-xl font-bold text-gray-800">Week 4: 効果測定と次月の計画</h2>

        <StatGrid stats={[
          { value: "60%", unit: "以上", label: "開封率（Week 4目標）" },
          { value: "10%", unit: "以上", label: "クリック率（Week 4目標）" },
          { value: "15%", unit: "以下", label: "ブロック率（Week 4目標）" },
        ]} />

        <FlowSteps steps={[
          { title: "KPIの集計", desc: "友だち数・開封率・クリック率・カゴ落ち回収率・LINE経由売上をダッシュボードで確認" },
          { title: "改善点の洗い出し", desc: "ブロック率が高い配信・クリック率が低いメッセージを特定し、改善案を策定" },
          { title: "2ヶ月目の計画策定", desc: "セグメント配信の本格導入・リピート促進シナリオの設計・友だち獲得施策の拡大" },
        ]} />
      </section>

      <section>
        <h2 id="milestones" className="text-xl font-bold text-gray-800">達成すべきマイルストーン</h2>

        <ComparisonTable
          headers={["マイルストーン", "目標値", "重要度"]}
          rows={[
            ["友だち数", "200〜500人", "最高"],
            ["カゴ落ちリマインド稼働", "3段階配信が自動動作", "最高"],
            ["ウェルカムメッセージ稼働", "初回クーポン付き自動配信", "最高"],
            ["発送通知稼働", "注文確認→発送→配達の自動通知", "高"],
            ["LINE経由売上の初回計測", "UTMパラメータで計測可能な状態", "高"],
            ["開封率60%以上", "配信メッセージの開封率", "中"],
          ]}
        />

        <ResultCard before="LINE未導入" after="月200〜500友だち・自動配信3本稼働" metric="1ヶ月目の達成状態" description="この基盤が2ヶ月目以降の売上成長を支える" />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>Week 1で基盤を整える</strong> — アカウント開設・ECカート連携・自動配信3本の設定を完了</li>
          <li><strong>Week 2で友だち獲得を開始</strong> — 購入完了ページ・サイトバナー・メルマガ告知で友だちを集める</li>
          <li><strong>Week 3でテストと最適化</strong> — 自動配信の動作確認と配信内容の微調整。配信設計の詳細は<Link href="/ec/column/ec-segment-delivery-purchase-data" className="text-blue-600 underline">購買データ活用のセグメント配信</Link>を参照</li>
          <li><strong>Week 4で効果測定</strong> — KPIの集計と改善。KPI設計は<Link href="/ec/column/ec-line-kpi-dashboard-design" className="text-blue-600 underline">EC×LINE運用のKPI設計</Link>で詳しく解説</li>
        </ol>
        <p className="mt-4">Lオペ for ECは、アカウント開設から自動配信設定・効果測定まで、EC×LINE運用の立ち上げをワンストップでサポートします。<Link href="/ec/column/ec-line-official-account-guide-2026" className="text-blue-600 underline">EC×LINE活用入門</Link>も合わせてご覧ください。</p>
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
