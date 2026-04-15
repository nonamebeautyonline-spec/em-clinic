import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-delivery-best-time-frequency")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE配信の最適な頻度は週に何回ですか？", a: "業種や友だち数によりますが、一般的には週1〜2回が最適です。配信頻度が高すぎるとブロック率が上昇し、低すぎると存在を忘れられます。セグメント配信を活用すれば、ターゲットごとに頻度を調整できます。" },
  { q: "配信時間帯は何時が最も効果的ですか？", a: "業種によって異なりますが、BtoC向けでは平日の12:00〜13:00（昼休み）と20:00〜22:00（帰宅後）が高い開封率を記録しています。飲食店であれば11:00前後のランチ前、美容サロンであれば21:00前後が効果的です。" },
  { q: "ブロック率が高い場合、配信頻度を下げるべきですか？", a: "頻度だけでなく配信内容の見直しも必要です。宣伝ばかりの配信はブロック率が上がりやすく、役立つ情報や限定特典を組み合わせることで、同じ頻度でもブロック率を下げることが可能です。" },
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
  "業種別の最適な配信頻度と曜日・時間帯をデータで解説",
  "ブロック率を抑えつつ開封率を最大化する配信スケジュール設計",
  "配信タイミングのABテスト手法と改善サイクルの回し方",
];

const toc = [
  { id: "frequency-basics", label: "配信頻度の基本原則" },
  { id: "best-time-by-industry", label: "業種別の最適な配信時間帯" },
  { id: "day-of-week", label: "曜日別の開封率傾向" },
  { id: "block-rate-relation", label: "配信頻度とブロック率の関係" },
  { id: "schedule-design", label: "配信スケジュールの設計方法" },
  { id: "ab-test", label: "配信タイミングのABテスト" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="配信頻度・時間帯" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの配信効果は<strong>「何を送るか」と同じくらい「いつ送るか」</strong>で決まります。配信頻度が高すぎればブロック率が上昇し、低すぎれば存在を忘れられてしまいます。本記事では、業種別のデータをもとに最適な配信頻度・時間帯・曜日を解説し、ブロック率を抑えつつ開封率を最大化する配信スケジュールの設計方法を紹介します。</p>

      <section>
        <h2 id="frequency-basics" className="text-xl font-bold text-gray-800">配信頻度の基本原則</h2>
        <p>LINE公式アカウントの配信頻度には「ちょうどよい範囲」が存在します。この範囲を外れると、ブロック率の上昇や開封率の低下を招きます。</p>

        <StatGrid stats={[
          { value: "週1〜2回", label: "推奨配信頻度（一般的な業種）" },
          { value: "3%以下", label: "理想的なブロック率" },
          { value: "40〜60%", label: "目標開封率" },
        ]} />

        <Callout type="point" title="配信頻度の3原則">
          <ol className="list-decimal pl-4 space-y-1 mt-1">
            <li><strong>価値ある情報を適切な間隔で</strong> — 宣伝ばかりではなく、役立つ情報と組み合わせる</li>
            <li><strong>セグメントで頻度を最適化</strong> — 全員に同じ頻度で送るのではなく、関心度に応じて調整</li>
            <li><strong>予告・期待感の醸成</strong> — 「毎週金曜にお得情報をお届け」のように配信日を固定すると習慣化される</li>
          </ol>
        </Callout>
      </section>

      <section>
        <h2 id="best-time-by-industry" className="text-xl font-bold text-gray-800">業種別の最適な配信時間帯</h2>
        <p>配信時間帯は業種によって大きく異なります。以下は各業種のデータに基づくベストタイミングです。</p>

        <ComparisonTable
          headers={["業種", "最適な時間帯", "理由"]}
          rows={[
            ["飲食店", "11:00〜11:30 / 17:00〜17:30", "ランチ・ディナーの意思決定直前"],
            ["美容サロン", "20:00〜22:00", "帰宅後のリラックスタイムに予約検討"],
            ["EC・小売", "12:00〜13:00 / 21:00〜22:00", "昼休み・就寝前のスマホ閲覧時間"],
            ["不動産", "18:00〜20:00", "仕事終わりの物件検索タイム"],
            ["教育・スクール", "19:00〜21:00", "保護者が子どもの習い事を検討する時間"],
          ]}
        />

        <BarChart
          data={[
            { label: "7-9時", value: 28, color: "#94a3b8" },
            { label: "12-13時", value: 58, color: "#22c55e" },
            { label: "15-17時", value: 35, color: "#94a3b8" },
            { label: "18-20時", value: 48, color: "#3b82f6" },
            { label: "20-22時", value: 55, color: "#22c55e" },
          ]}
          unit="%"
        />

        <Callout type="success" title="昼休みと夜がゴールデンタイム">
          BtoC業種全般で12:00〜13:00と20:00〜22:00が高い開封率を記録しています。ただし配信集中時間帯は競合メッセージも多いため、少しずらす（11:50配信など）テクニックも有効です。
        </Callout>
      </section>

      <section>
        <h2 id="day-of-week" className="text-xl font-bold text-gray-800">曜日別の開封率傾向</h2>
        <p>配信の曜日選びも開封率に影響します。一般的な傾向として以下のデータが見られます。</p>

        <BarChart
          data={[
            { label: "月曜", value: 42, color: "#94a3b8" },
            { label: "火曜", value: 52, color: "#3b82f6" },
            { label: "水曜", value: 50, color: "#3b82f6" },
            { label: "木曜", value: 53, color: "#22c55e" },
            { label: "金曜", value: 55, color: "#22c55e" },
            { label: "土曜", value: 48, color: "#94a3b8" },
            { label: "日曜", value: 38, color: "#94a3b8" },
          ]}
          unit="%"
        />

        <ul className="list-disc pl-6 space-y-1">
          <li><strong>火〜金曜日</strong>が全体的に開封率が高い傾向</li>
          <li><strong>月曜日</strong>は仕事の立ち上がりで未読スルーされやすい</li>
          <li><strong>日曜日</strong>は外出が多くスマホ操作が減る傾向</li>
          <li><strong>飲食店</strong>は金曜夕方の配信が週末集客に直結</li>
          <li><strong>美容サロン</strong>は火〜水曜日に翌週の予約を促す配信が効果的</li>
        </ul>
      </section>

      <InlineCTA />

      <section>
        <h2 id="block-rate-relation" className="text-xl font-bold text-gray-800">配信頻度とブロック率の関係</h2>
        <p>配信頻度とブロック率には明確な相関があります。適切な頻度を超えると急激にブロック率が上昇します。</p>

        <BarChart
          data={[
            { label: "月2回", value: 1.5, color: "#22c55e" },
            { label: "週1回", value: 2.5, color: "#22c55e" },
            { label: "週2回", value: 3.5, color: "#f59e0b" },
            { label: "週3回", value: 6.0, color: "#ef4444" },
            { label: "週5回以上", value: 12.0, color: "#ef4444" },
          ]}
          unit="%"
        />

        <Callout type="warning" title="週3回を超えると危険ゾーン">
          週3回以上の配信ではブロック率が6%を超え、友だち数の減少が加速します。頻度を上げたい場合は、セグメント配信でアクティブユーザーに絞って送るのが鉄則です。配信とセグメントの使い分けについては<Link href="/line/column/line-broadcast-vs-segment-delivery" className="text-blue-600 underline">一斉配信vsセグメント配信の比較記事</Link>をご覧ください。
        </Callout>

        <ResultCard before="週5回一斉配信" after="週2回セグメント配信" metric="ブロック率" description="ブロック率の大幅低減、開封率の向上が報告されています" />
      </section>

      <section>
        <h2 id="schedule-design" className="text-xl font-bold text-gray-800">配信スケジュールの設計方法</h2>
        <p>効果的な配信スケジュールは「頻度×時間帯×コンテンツ」の3要素で設計します。</p>

        <FlowSteps steps={[
          { title: "配信カレンダーの作成", desc: "月間の配信予定を事前に計画。定期配信（毎週金曜）と臨時配信（セール・イベント）を分けて管理" },
          { title: "コンテンツミックスの設計", desc: "宣伝系30%・情報提供系50%・エンタメ系20%の比率を目安にコンテンツを分配" },
          { title: "セグメント別の頻度調整", desc: "アクティブユーザーには週2回、休眠ユーザーには月2回など、エンゲージメントに応じて頻度を変える" },
          { title: "定期的な振り返り", desc: "月次で開封率・クリック率・ブロック率を確認し、配信タイミングを微調整" },
        ]} />

        <Callout type="point" title="コンテンツミックスが重要">
          宣伝ばかりの配信はブロック率を上げます。役立つ情報やクーポンなど「受け取って嬉しい」コンテンツを織り交ぜることで、同じ頻度でもブロック率を抑えられます。
        </Callout>
      </section>

      <section>
        <h2 id="ab-test" className="text-xl font-bold text-gray-800">配信タイミングのABテスト</h2>
        <p>最適な配信タイミングは業種や顧客属性によって異なるため、ABテストで自社の最適解を見つけることが重要です。</p>

        <FlowSteps steps={[
          { title: "仮説を立てる", desc: "「木曜20時より金曜12時の方が開封率が高い」など具体的な仮説を設定" },
          { title: "テストグループを分割", desc: "友だちリストをランダムに2グループに分割し、同じ内容を異なる時間帯で配信" },
          { title: "結果を比較", desc: "開封率・クリック率・CVR・ブロック率の4指標で比較。最低2週間は継続して傾向を確認" },
          { title: "勝ちパターンを定着", desc: "効果の高かった配信タイミングを定期配信のデフォルトに採用" },
        ]} />

        <p>ABテストはセグメント配信機能を使って簡単に実施できます。詳しい設定方法は<Link href="/line/column/line-segment-delivery-design-guide" className="text-blue-600 underline">セグメント配信設計ガイド</Link>で解説しています。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "週1〜2回", label: "推奨配信頻度" },
          { value: "12時/20時", label: "ゴールデンタイム" },
          { value: "火〜金", label: "高開封率の曜日" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>配信頻度は週1〜2回が基本</strong> — 週3回を超えるとブロック率が急上昇する</li>
          <li><strong>業種に合った時間帯を選ぶ</strong> — 飲食は食事前、美容は夜、ECは昼休みと就寝前が効果的</li>
          <li><strong>火〜金曜日が高開封率</strong> — 月曜・日曜は避けるのが無難</li>
          <li><strong>セグメント配信で頻度を最適化</strong> — アクティブ度に応じて配信回数を調整</li>
          <li><strong>ABテストで自社の最適解を見つける</strong> — データに基づいた改善サイクルを回す</li>
        </ol>
        <p className="mt-4">配信頻度と時間帯の最適化は、LINE運用の成果を大きく左右します。まずは自社のデータを分析し、ABテストで最適なタイミングを見つけることから始めましょう。ブロック率の改善については<Link href="/line/column/line-block-rate-reduction-7-methods" className="text-blue-600 underline">ブロック率を下げる7つの方法</Link>もご参照ください。</p>
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
