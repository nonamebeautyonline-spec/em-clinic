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
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-tool-selection-5-criteria")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE拡張ツールを導入するベストなタイミングはいつですか？", a: "友だち数が300〜500人を超え、一斉配信だけでは効果が出にくくなったタイミングが導入の目安です。セグメント配信やシナリオ配信のニーズが出てきたら検討しましょう。" },
  { q: "ツール選定で最も重視すべき基準は何ですか？", a: "最も重要なのは「自社の運用目的に合った機能があるか」です。機能が豊富でも使わなければ意味がありません。まず達成したい目標を明確にし、それに必要な機能を備えたツールを選びましょう。" },
  { q: "ツールの乗り換えコストはどのくらいですか？", a: "友だちリストの移行自体は1〜2日で完了しますが、シナリオ設定・リッチメニュー・自動応答の再構築に2〜4週間かかります。乗り換えコストを考えると、初回の選定が非常に重要です。" },
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
  "LINE拡張ツール選定で失敗しないための5つの判断基準を解説",
  "機能要件・費用対効果・サポート・拡張性・導入実績の5軸で評価",
  "自社の状況に応じた最適な選定フレームワークを提供",
];

const toc = [
  { id: "why-selection-matters", label: "ツール選定が重要な理由" },
  { id: "criteria-1", label: "基準1: 機能要件の適合度" },
  { id: "criteria-2", label: "基準2: 費用対効果" },
  { id: "criteria-3", label: "基準3: サポート体制" },
  { id: "criteria-4", label: "基準4: 拡張性・将来性" },
  { id: "criteria-5", label: "基準5: 導入実績・評判" },
  { id: "selection-flow", label: "選定フロー" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ツール比較・選定" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE拡張ツールは<strong>8社以上</strong>あり、機能・料金・サポート体制は千差万別です。「どれを選べば正解なのか」で迷う担当者は少なくありません。本記事では、ツール選定で<strong>失敗しないための5つの判断基準</strong>を解説し、自社に最適なツールを見極める方法を紹介します。</p>

      {/* ── なぜ重要か ── */}
      <section>
        <h2 id="why-selection-matters" className="text-xl font-bold text-gray-800">ツール選定が重要な理由</h2>
        <p>LINE拡張ツールは一度導入すると、シナリオ設定やデータの蓄積が進むため、乗り換えコストが高くなります。</p>

        <StatGrid stats={[
          { value: "2〜4", unit: "週間", label: "乗り換え時の再構築期間" },
          { value: "30", unit: "%", label: "ツール選定に不満を持つ企業" },
          { value: "50", unit: "万円+", label: "乗り換え時の機会損失" },
        ]} />

        <Callout type="warning" title="乗り換えコストは想像以上に高い">
          ツールの月額料金だけでなく、シナリオの再構築・スタッフの再教育・データ移行の工数を考えると、乗り換えには数十万円相当のコストがかかります。最初の選定が極めて重要です。
        </Callout>
      </section>

      {/* ── 基準1 ── */}
      <section>
        <h2 id="criteria-1" className="text-xl font-bold text-gray-800">基準1: 機能要件の適合度</h2>
        <p>最も重要な基準は、自社の運用目的に合った機能があるかどうかです。</p>

        <FlowSteps steps={[
          { title: "運用目的を明確にする", desc: "「友だちの自動育成」「予約の自動化」「セグメント配信」など、達成したい目的を3つ以内に絞る。" },
          { title: "必須機能をリストアップ", desc: "目的達成に必要な機能をリスト化。シナリオ配信、セグメント、予約、フォーム等。" },
          { title: "各ツールの対応状況を確認", desc: "必須機能が含まれるプランと料金を確認。無料トライアルで実際に操作して確かめる。" },
        ]} />

        <Callout type="point" title="機能が多い=良いツールではない">
          使わない機能に月額費用を払い続けるのは無駄です。必要な機能に絞って選ぶことが、費用対効果を最大化するポイントです。
        </Callout>
      </section>

      {/* ── 基準2 ── */}
      <section>
        <h2 id="criteria-2" className="text-xl font-bold text-gray-800">基準2: 費用対効果</h2>
        <p>ツールの費用は「月額料金」だけでなく、導入・運用にかかるトータルコストで判断します。</p>

        <ComparisonTable
          headers={["コスト項目", "内容", "目安"]}
          rows={[
            ["月額料金", "ツールの利用料", "0〜33,000円/月"],
            ["初期設定コスト", "シナリオ構築・研修", "5〜30万円"],
            ["運用工数", "配信設計・分析の人件費", "月5〜20時間"],
            ["LINE通数料金", "公式アカウントの配信コスト", "0〜15,000円/月"],
          ]}
        />

        <ResultCard
          before="月額料金だけで比較"
          after="トータルコストで比較判断"
          metric="真のコストパフォーマンスを把握"
          description="安いツールでも運用工数が多ければトータルコストは高くなる"
        />
      </section>

      <InlineCTA />

      {/* ── 基準3 ── */}
      <section>
        <h2 id="criteria-3" className="text-xl font-bold text-gray-800">基準3: サポート体制</h2>
        <p>ツール導入後の運用でつまずいた際、どれだけ迅速に問題解決できるかはサポート体制に依存します。</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>チャット・メールサポートの対応時間</strong> — 平日のみか土日も対応か</li>
          <li><strong>電話サポートの有無</strong> — 緊急時に電話で相談できるか</li>
          <li><strong>マニュアル・動画の充実度</strong> — セルフ解決できる資料があるか</li>
          <li><strong>コミュニティの有無</strong> — ユーザー同士で情報交換できる場があるか</li>
          <li><strong>導入支援・コンサルティング</strong> — 初期構築を支援してもらえるか</li>
        </ul>
      </section>

      {/* ── 基準4 ── */}
      <section>
        <h2 id="criteria-4" className="text-xl font-bold text-gray-800">基準4: 拡張性・将来性</h2>
        <p>現時点で必要な機能だけでなく、将来的に必要になりそうな機能が備わっているかも重要です。</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>プランのアップグレード</strong> — 友だち数の増加に対応できるか</li>
          <li><strong>API連携</strong> — 外部システム（CRM・EC・予約システム）と連携可能か</li>
          <li><strong>開発ロードマップ</strong> — 新機能の追加頻度と方向性</li>
          <li><strong>マルチアカウント対応</strong> — 複数店舗・ブランドの一括管理が可能か</li>
        </ul>
      </section>

      {/* ── 基準5 ── */}
      <section>
        <h2 id="criteria-5" className="text-xl font-bold text-gray-800">基準5: 導入実績・評判</h2>
        <p>実際に使っている企業の評判や導入実績は、ツールの信頼性を判断する重要な指標です。</p>

        <FlowSteps steps={[
          { title: "同業種の導入事例を確認", desc: "自社と同じ業種・規模の企業が導入しているかを確認。業界特有の課題に対応できるかの判断材料になる。" },
          { title: "レビューサイトで評判を調査", desc: "G2・ITreview等のレビューサイトで実際のユーザー評価を確認。良い評価だけでなく不満点も必ずチェック。" },
          { title: "運営会社の安定性", desc: "ツールが突然サービス終了すると大きなリスク。運営会社の経営状況や資本力も確認ポイント。" },
        ]} />
      </section>

      {/* ── 選定フロー ── */}
      <section>
        <h2 id="selection-flow" className="text-xl font-bold text-gray-800">5つの基準を使った選定フロー</h2>

        <FlowSteps steps={[
          { title: "Step 1: 運用目的を3つ以内に整理", desc: "何のためにツールを導入するのかを明確化。" },
          { title: "Step 2: 必須機能と予算を決定", desc: "目的に必要な機能と月額予算の上限を設定。" },
          { title: "Step 3: 候補を3ツール以内に絞り込み", desc: "5つの基準でスコアリングし、上位3ツールに絞る。" },
          { title: "Step 4: 無料トライアルで実際に操作", desc: "管理画面の使いやすさ、必要な機能の動作を確認。" },
          { title: "Step 5: 最終決定・導入", desc: "トライアル結果をもとに最終判断。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="ツール選定5つの基準">
          <ul className="mt-1 space-y-1">
            <li>・基準1: 自社の運用目的に合った機能があるか</li>
            <li>・基準2: トータルコストでの費用対効果</li>
            <li>・基準3: サポート体制の充実度</li>
            <li>・基準4: 将来的な拡張性</li>
            <li>・基準5: 導入実績と評判</li>
          </ul>
        </Callout>

        <p>各ツールの詳細比較は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>をご覧ください。コストを抑えたい方は<Link href="/line/column/free-line-extension-tools-comparison" className="text-sky-600 underline hover:text-sky-800">無料LINE拡張ツール比較</Link>も参考にどうぞ。</p>
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
