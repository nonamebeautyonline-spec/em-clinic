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
const self = articles.find((a) => a.slug === "free-line-extension-tools-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "無料ツールで本格的なLINE運用は可能ですか？", a: "友だち数500人以下・月配信2〜3回程度であれば無料ツールで十分に運用可能です。ただしシナリオ数やフォーム数に制限があるため、友だち数が増えてきたら有料プランへの移行を検討しましょう。" },
  { q: "無料ツールのデメリットは何ですか？", a: "主なデメリットは機能制限（シナリオ数・配信数の上限）、サポートの限定性、詳細な分析機能の不足です。また、無料ツールが突然有料化やサービス終了するリスクもあるため、運営会社の安定性も確認しましょう。" },
  { q: "LINE公式アカウントの標準機能だけで十分な場合もありますか？", a: "はい、友だち数が100人以下で配信が月1〜2回程度であれば、公式アカウントの標準機能（あいさつメッセージ・自動応答・リッチメニュー）だけで十分です。拡張ツールは友だち数の増加に合わせて導入を検討しましょう。" },
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
  "無料で使えるLINE拡張ツール4選を機能・制限付きで比較",
  "LINE公式アカウントの標準機能だけで足りるケースも解説",
  "無料→有料プランへの移行タイミングの判断基準を提示",
];

const toc = [
  { id: "overview", label: "無料ツールの選択肢" },
  { id: "comparison", label: "無料ツール4選の比較" },
  { id: "elme-free", label: "エルメ フリープラン" },
  { id: "proline-free", label: "プロラインフリー" },
  { id: "poster-free", label: "Poster フリープラン" },
  { id: "official-only", label: "公式アカウント標準機能のみ" },
  { id: "upgrade-timing", label: "有料プランへの移行タイミング" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ツール比較・選定" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの運用を強化したいけど、<strong>まだ有料ツールに投資する段階ではない</strong>――そんな方のために、<strong>0円から始められるLINE拡張ツール</strong>を徹底比較します。無料プランの機能制限を正確に把握し、自社に最適な選択肢を見つけましょう。</p>

      {/* ── 選択肢 ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">無料で使えるLINE拡張ツールの選択肢</h2>
        <p>2026年現在、無料プランを提供しているLINE拡張ツールは主に3つあります。加えて、LINE公式アカウントの標準機能だけで運用する選択肢も含めて比較します。</p>

        <StatGrid stats={[
          { value: "3", unit: "ツール", label: "無料プランあり" },
          { value: "0", unit: "円", label: "初期費用" },
          { value: "1,000", unit: "通〜", label: "月間配信数" },
        ]} />
      </section>

      {/* ── 比較表 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">無料ツール4選の比較</h2>

        <ComparisonTable
          headers={["比較項目", "エルメ(無料)", "プロラインフリー", "Poster(無料)", "公式のみ"]}
          rows={[
            ["月額料金", "0円", "0円", "0円", "0円"],
            ["月間配信数", "1,000通", "無制限", "1,000通", "200通"],
            ["シナリオ配信", "1つ", "10ステップ", false, false],
            ["セグメント配信", true, true, false, "簡易"],
            ["フォーム", "3つ", "無制限", false, false],
            ["リッチメニュー切替", "1つ", true, false, false],
            ["予約機能", true, false, false, false],
            ["自動応答", true, true, true, true],
            ["分析", "基本", "基本", "基本", "基本"],
          ]}
        />
      </section>

      {/* ── エルメ ── */}
      <section>
        <h2 id="elme-free" className="text-xl font-bold text-gray-800">エルメ フリープラン — 最もバランスの良い無料ツール</h2>
        <p>エルメのフリープランは、シナリオ配信・フォーム・予約機能・セグメント配信が無料で利用できる、<strong>最もバランスの良い選択肢</strong>です。</p>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>シナリオ配信</strong>: 1シナリオまで作成可能</li>
          <li><strong>フォーム</strong>: 3つまで作成可能</li>
          <li><strong>予約機能</strong>: カレンダー予約が標準搭載</li>
          <li><strong>配信数上限</strong>: 月1,000通まで</li>
        </ul>

        <Callout type="success" title="おすすめの使い方">
          友だち追加後の自動シナリオを1つ設定し、フォームで顧客情報を収集、予約機能で来店を促進する。この3つだけでもLINE運用の効果は大幅に向上します。
        </Callout>

        <p>エルメの詳細機能は<Link href="/line/column/elme-line-tool-review-features" className="text-sky-600 underline hover:text-sky-800">エルメ徹底レビュー</Link>で解説しています。</p>
      </section>

      {/* ── プロライン ── */}
      <section>
        <h2 id="proline-free" className="text-xl font-bold text-gray-800">プロラインフリー — 配信数無制限が魅力</h2>
        <p>プロラインフリーの最大の特徴は<strong>メッセージ配信数が無制限</strong>（LINE公式アカウント側の通数制限は別途あり）である点です。</p>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>配信数</strong>: ツール側の制限なし</li>
          <li><strong>シナリオ</strong>: 10ステップまで</li>
          <li><strong>フォーム</strong>: 無制限</li>
          <li><strong>注意</strong>: UIがやや独特で慣れが必要</li>
        </ul>

        <Callout type="info" title="LINE公式の通数制限に注意">
          プロラインフリー側の配信制限はありませんが、LINE公式アカウント側のメッセージ通数制限は別途適用されます。無料のコミュニケーションプランでは月200通までです。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── Poster ── */}
      <section>
        <h2 id="poster-free" className="text-xl font-bold text-gray-800">Poster フリープラン — シンプルさが魅力</h2>
        <p>Posterのフリープランは機能が限定的ですが、UIが非常にシンプルで分かりやすいのが特徴です。</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>配信数</strong>: 月1,000通まで</li>
          <li><strong>自動応答</strong>: キーワード応答に対応</li>
          <li><strong>制限</strong>: シナリオ配信・セグメント配信は非対応</li>
        </ul>
      </section>

      {/* ── 公式のみ ── */}
      <section>
        <h2 id="official-only" className="text-xl font-bold text-gray-800">LINE公式アカウントの標準機能だけで運用する</h2>
        <p>拡張ツールを使わず、LINE公式アカウントの標準機能だけで運用するのも立派な選択肢です。</p>

        <ResultCard
          before="拡張ツールなし"
          after="標準機能を最大限活用"
          metric="月額完全0円でLINE運用"
          description="友だち100人以下なら標準機能で十分に成果が出せる"
        />

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>あいさつメッセージ</strong>: 友だち追加時の自動メッセージ</li>
          <li><strong>自動応答</strong>: キーワード反応の定型文返信</li>
          <li><strong>リッチメニュー</strong>: トーク画面下部のメニュー（固定1種類）</li>
          <li><strong>一斉配信</strong>: 全友だちへのメッセージ配信（月200通まで）</li>
          <li><strong>クーポン・ショップカード</strong>: 来店促進ツール</li>
        </ul>
      </section>

      {/* ── 移行タイミング ── */}
      <section>
        <h2 id="upgrade-timing" className="text-xl font-bold text-gray-800">無料→有料プランへの移行タイミング</h2>

        <FlowSteps steps={[
          { title: "友だち数500人超", desc: "セグメント配信の必要性が高まり、無料プランの配信数では不足する段階。" },
          { title: "シナリオを複数使いたい", desc: "友だち追加後のシナリオに加え、購入後フォローや季節キャンペーン用のシナリオが必要になった段階。" },
          { title: "流入経路を分析したい", desc: "どの広告・施策から友だちが増えているか把握し、投資判断をしたい段階。" },
          { title: "複数スタッフで運用", desc: "権限管理や操作ログの確認が必要になった段階。" },
        ]} />

        <Callout type="point" title="迷ったらまず無料で始める">
          有料ツールに投資して使いこなせないよりも、まず無料で始めて「何が足りないか」を体感してから有料プランを検討する方が、結果的にコストパフォーマンスが高くなります。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="無料ツール選びのポイント">
          <ul className="mt-1 space-y-1">
            <li>・バランス重視ならエルメのフリープランが最適</li>
            <li>・配信数重視ならプロラインフリー</li>
            <li>・友だち100人以下なら公式アカウント標準機能で十分</li>
            <li>・友だち500人超で有料プランへの移行を検討</li>
          </ul>
        </Callout>

        <p>有料ツールを含めた全体比較は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>をご覧ください。ツール選定の判断基準は<Link href="/line/column/line-tool-selection-5-criteria" className="text-sky-600 underline hover:text-sky-800">LINE運用ツール選び方5つの基準</Link>で詳しく解説しています。</p>
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
