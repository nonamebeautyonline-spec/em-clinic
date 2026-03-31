import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  ComparisonTable,
  FlowSteps,
  ResultCard,
  BarChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-segment-delivery-design-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "セグメント配信は何人から効果がありますか？", a: "友だち数300人以上から効果が実感しやすくなります。それ以下だとセグメントの母数が少なすぎて統計的に有意な差が出にくいため、まずは一斉配信で友だちを増やすことに注力しましょう。" },
  { q: "セグメントはいくつくらい作るのが適切ですか？", a: "初期は3〜5セグメントから始めるのがおすすめです。「新規」「リピーター」「休眠」などの基本セグメントを設定し、運用しながら徐々に細分化していきましょう。細かくしすぎると運用が煩雑になります。" },
  { q: "セグメント配信で一斉配信より費用が増えることはありますか？", a: "いいえ、セグメント配信は「送る人を絞る」ため、一斉配信よりもメッセージ通数が減少し、コスト削減になります。同時に開封率・CVRも向上するため、費用対効果は大幅に改善します。" },
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
  "セグメント配信の基本概念と一斉配信との効果差をデータで解説",
  "属性タグ・行動データ・購買履歴を活用した実践的なセグメント設計",
  "配信効果を最大化するセグメント運用のベストプラクティス",
];

const toc = [
  { id: "why-segment", label: "なぜセグメント配信が重要か" },
  { id: "segment-types", label: "セグメントの種類と設計方法" },
  { id: "basic-segments", label: "基本セグメント5選" },
  { id: "advanced-segments", label: "高度なセグメント設計" },
  { id: "message-design", label: "セグメント別メッセージ設計" },
  { id: "measurement", label: "効果測定と改善" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="配信・メッセージング" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの配信で<strong>「全員に同じメッセージを送る」一斉配信</strong>を続けていませんか？ セグメント配信を導入すると、開封率は<strong>1.5〜2倍</strong>、CVRは<strong>2〜3倍</strong>に向上し、同時にブロック率も大幅に低下します。本記事では<strong>ターゲティング精度を高めるセグメント設計の実践手法</strong>を解説します。</p>

      {/* ── なぜセグメント ── */}
      <section>
        <h2 id="why-segment" className="text-xl font-bold text-gray-800">なぜセグメント配信が重要か</h2>
        <p>従量課金制のLINE公式アカウントでは、1通1通のメッセージに費用がかかります。全員に同じメッセージを送る一斉配信は、興味のないユーザーにもメッセージを送ることになり、コスト効率が悪化します。</p>

        <ComparisonTable
          headers={["指標", "一斉配信", "セグメント配信"]}
          rows={[
            ["開封率", "約40%", "約60〜70%"],
            ["クリック率", "約3%", "約8〜12%"],
            ["CVR（成約率）", "約1%", "約3〜5%"],
            ["ブロック率", "約5%/月", "約1〜2%/月"],
            ["配信コスト", "高い（全員に送信）", "低い（対象者のみ）"],
          ]}
        />

        <ResultCard
          before="一斉配信: 開封率40%・CVR1%"
          after="セグメント配信: 開封率65%・CVR4%"
          metric="配信効果が約3〜4倍に向上"
          description="配信通数も削減されるためコスト効率も大幅改善"
        />
      </section>

      {/* ── セグメントの種類 ── */}
      <section>
        <h2 id="segment-types" className="text-xl font-bold text-gray-800">セグメントの種類と設計方法</h2>
        <p>セグメントは大きく3つのデータソースから設計します。</p>

        <FlowSteps steps={[
          { title: "属性データ（デモグラフィック）", desc: "年齢・性別・地域・職業など、ユーザーの基本属性。フォームやアンケートで収集する。" },
          { title: "行動データ（ビヘイビオラル）", desc: "メッセージ開封・リンククリック・リッチメニュータップなど、LINE上での行動履歴。" },
          { title: "購買・利用データ", desc: "購入履歴・来店回数・契約プラン・最終利用日など、実際のビジネス上のデータ。" },
        ]} />

        <Callout type="info" title="まずは行動データから">
          属性データの収集にはフォーム回答が必要ですが、行動データ（開封・クリック）はツール側で自動的に取得されます。まずは行動データベースのセグメントから始めるのが最も手軽です。
        </Callout>
      </section>

      {/* ── 基本セグメント ── */}
      <section>
        <h2 id="basic-segments" className="text-xl font-bold text-gray-800">最初に作るべき基本セグメント5選</h2>

        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>新規友だち（追加7日以内）</strong> — ウェルカムシリーズの対象。自己紹介や特典案内を配信し、初回アクションを促す。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>アクティブユーザー</strong> — 直近30日以内にメッセージ開封またはタップしたユーザー。通常の配信対象。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>休眠ユーザー</strong> — 30日以上アクションがないユーザー。掘り起こしキャンペーンの対象。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>購入・来店済みユーザー</strong> — リピート促進・アップセルの対象。購入商品に合わせた関連提案を配信。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">5.</span><strong>高関与ユーザー</strong> — 開封率・クリック率が高いロイヤルユーザー。VIP特典や先行案内の対象。</li>
        </ul>

        <StatGrid stats={[
          { value: "5", unit: "セグメント", label: "初期に作るべき数" },
          { value: "70", unit: "%", label: "アクティブ率の目安" },
          { value: "30", unit: "%以下", label: "休眠ユーザーの目標" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 高度なセグメント ── */}
      <section>
        <h2 id="advanced-segments" className="text-xl font-bold text-gray-800">高度なセグメント設計</h2>
        <p>基本セグメントの運用が安定したら、複数条件を掛け合わせた高度なセグメントを追加します。</p>

        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>購入商品×購入日</strong> — 「商品Aを30日前に購入」→ リピート提案配信</li>
          <li><strong>地域×イベント</strong> — 「東京在住」→ 東京限定イベントの案内</li>
          <li><strong>年齢×関心カテゴリ</strong> — 「30代女性×美容に関心」→ 美容商品の案内</li>
          <li><strong>流入経路×行動</strong> — 「Instagram経由で追加×未購入」→ SNS限定特典の配信</li>
        </ul>

        <Callout type="warning" title="セグメントの細分化しすぎに注意">
          セグメントを細かくしすぎると、1セグメントあたりの母数が少なくなり、配信効果の測定が困難になります。1セグメントあたり最低50人以上を目安に設計しましょう。
        </Callout>
      </section>

      {/* ── メッセージ設計 ── */}
      <section>
        <h2 id="message-design" className="text-xl font-bold text-gray-800">セグメント別メッセージ設計</h2>

        <ComparisonTable
          headers={["セグメント", "配信内容", "配信頻度", "目的"]}
          rows={[
            ["新規友だち", "自己紹介・特典案内", "追加直後+3日後", "初回アクション促進"],
            ["アクティブ", "新商品・キャンペーン", "週1回", "エンゲージメント維持"],
            ["休眠", "特別クーポン・限定オファー", "月1回", "掘り起こし"],
            ["購入済み", "関連商品・レビュー依頼", "購入後3日+30日", "リピート促進"],
            ["高関与", "VIP特典・先行案内", "不定期", "ロイヤルティ強化"],
          ]}
        />
      </section>

      {/* ── 効果測定 ── */}
      <section>
        <h2 id="measurement" className="text-xl font-bold text-gray-800">効果測定と改善</h2>

        <BarChart
          data={[
            { label: "開封率", value: 65, color: "#22c55e" },
            { label: "クリック率", value: 12, color: "#3b82f6" },
            { label: "CVR", value: 4, color: "#a855f7" },
            { label: "ブロック率", value: 2, color: "#ef4444" },
          ]}
          unit="%"
        />

        <FlowSteps steps={[
          { title: "セグメント別の配信データを比較", desc: "各セグメントの開封率・クリック率・CVR・ブロック率を比較し、効果の高いセグメントを特定する。" },
          { title: "A/Bテストで最適化", desc: "同一セグメント内でメッセージ内容・配信時間をA/Bテストし、最適な組み合わせを見つける。" },
          { title: "セグメント条件の見直し", desc: "月1回、セグメントの定義やメッセージ内容を見直し、改善を続ける。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="セグメント配信設計のポイント">
          <ul className="mt-1 space-y-1">
            <li>・一斉配信からセグメント配信への移行で効果3〜4倍</li>
            <li>・まずは基本5セグメントから始める</li>
            <li>・行動データベースのセグメントが最も手軽に始められる</li>
            <li>・1セグメント最低50人を目安に設計</li>
            <li>・月1回のセグメント見直しで継続的に改善</li>
          </ul>
        </Callout>

        <p>セグメント配信と合わせて<Link href="/line/column/line-scenario-delivery-setup-guide" className="text-sky-600 underline hover:text-sky-800">シナリオ配信の設計</Link>も導入すると、顧客育成の自動化がさらに進みます。配信に使うツールの選定は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>を参考にしてください。</p>
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
