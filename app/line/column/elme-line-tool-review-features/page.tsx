import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  ComparisonTable,
  FlowSteps,
  BarChart,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "elme-line-tool-review-features")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "エルメの無料プランはいつまで無料ですか？", a: "エルメのフリープランは期間限定ではなく、友だち数や配信数の上限内であれば永久無料です。友だち数や必要な機能が増えた段階で有料プランへの移行を検討すれば問題ありません。" },
  { q: "エルメからLステップへの移行は可能ですか？", a: "友だちリストや基本的なタグ情報はCSVでエクスポート可能なため、移行は技術的に可能です。ただしシナリオ設定やリッチメニューの設計は再構築が必要です。" },
  { q: "エルメのサポート体制はどうですか？", a: "メールサポートは全プラン対応、チャットサポートは有料プランから利用可能です。公式マニュアルや動画チュートリアルも充実しており、基本操作で困ることは少ないです。" },
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
  "エルメの無料プランでできること・できないことを明確に整理",
  "有料プランとの機能差・料金差を徹底比較",
  "Lステップとの違いを具体的に解説",
];

const toc = [
  { id: "overview", label: "エルメ（L Message）とは" },
  { id: "free-plan", label: "無料プランでできること" },
  { id: "pricing", label: "料金プラン詳細比較" },
  { id: "core-features", label: "主要機能の解説" },
  { id: "pros-cons", label: "メリット・デメリット" },
  { id: "vs-lstep", label: "Lステップとの比較" },
  { id: "who-should-use", label: "エルメが向いている人" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ツール比較・選定" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">エルメ（L Message）は<strong>無料プランでも主要機能が使える</strong>LINE拡張ツールとして注目を集めています。「本当に無料で使えるの？」「Lステップとどう違うの？」という疑問に答えるため、本記事では<strong>機能・料金・評判</strong>を実際の管理画面とともに徹底レビューします。</p>

      {/* ── エルメとは ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">エルメ（L Message）とは</h2>
        <p>エルメは株式会社ミショナが提供するLINE公式アカウント向けの拡張ツールです。最大の特徴は<strong>無料プランの充実度</strong>で、シナリオ配信やフォーム作成などの主要機能が0円で利用できます。</p>

        <StatGrid stats={[
          { value: "0", unit: "円", label: "フリープランの月額料金" },
          { value: "1,000", unit: "通", label: "フリープランの月間配信数" },
          { value: "10,780", unit: "円/月", label: "スタンダードプラン" },
          { value: "33,000", unit: "円/月", label: "プロプラン" },
        ]} />
      </section>

      {/* ── 無料プラン ── */}
      <section>
        <h2 id="free-plan" className="text-xl font-bold text-gray-800">無料プランでできること</h2>
        <p>エルメのフリープランは、他ツールの無料プランと比較しても機能が充実しています。</p>

        <ComparisonTable
          headers={["機能", "フリープラン", "スタンダード", "プロ"]}
          rows={[
            ["シナリオ配信", "1つまで", "無制限", "無制限"],
            ["セグメント配信", true, true, true],
            ["フォーム作成", "3つまで", "無制限", "無制限"],
            ["リッチメニュー", "1つまで", "無制限", "無制限"],
            ["タグ管理", true, true, true],
            ["自動応答", true, true, true],
            ["流入経路分析", false, true, true],
            ["スタッフ管理", false, true, true],
            ["ASP連携", false, false, true],
            ["月間配信数", "1,000通", "15,000通", "45,000通"],
          ]}
        />

        <Callout type="success" title="無料プランでも十分使える">
          友だち数が500人以下で月2〜3回の配信であれば、フリープランで十分に運用可能です。シナリオ配信が1つ、フォームが3つという制限はありますが、初期運用には十分な数です。
        </Callout>
      </section>

      {/* ── 料金 ── */}
      <section>
        <h2 id="pricing" className="text-xl font-bold text-gray-800">料金プラン詳細比較</h2>

        <BarChart
          data={[
            { label: "フリープラン", value: 0, color: "#22c55e" },
            { label: "スタンダードプラン", value: 10780, color: "#3b82f6" },
            { label: "プロプラン", value: 33000, color: "#a855f7" },
          ]}
          unit="円/月"
        />

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>フリープラン（0円）</strong>: 月1,000通まで。シナリオ1つ、フォーム3つの制限あり。個人事業主やテスト運用に最適。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>スタンダード（10,780円/月）</strong>: 月15,000通。シナリオ・フォーム無制限。流入経路分析・スタッフ管理が追加。本格運用向け。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>プロ（33,000円/月）</strong>: 月45,000通。ASP連携・API・優先サポートなど全機能解放。大規模運用向け。</li>
        </ul>
      </section>

      {/* ── 主要機能 ── */}
      <section>
        <h2 id="core-features" className="text-xl font-bold text-gray-800">主要機能の解説</h2>

        <FlowSteps steps={[
          { title: "シナリオ配信", desc: "友だち追加後のステップメールのように、時系列でメッセージを自動配信。条件分岐にも対応し、ユーザーの回答に応じて配信内容を変更できます。" },
          { title: "フォーム・アンケート", desc: "LINE内で完結するフォームを作成。回答はタグとして自動保存され、セグメント配信の条件に即座に活用可能です。" },
          { title: "カレンダー予約", desc: "LINE上で予約を受け付けるカレンダー機能。時間枠の設定、自動リマインド、キャンセル受付にも対応しています。" },
          { title: "自動応答・チャットボット", desc: "キーワードに反応して自動返信する機能。複数条件の組み合わせやランダム返信にも対応しています。" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── メリ・デメ ── */}
      <section>
        <h2 id="pros-cons" className="text-xl font-bold text-gray-800">エルメのメリット・デメリット</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">メリット</h3>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>無料プランの機能が充実しておりリスクなく始められる</li>
          <li>UIがシンプルで直感的に操作できる</li>
          <li>カレンダー予約機能が標準搭載</li>
          <li>日本語サポートが丁寧</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">デメリット</h3>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>Lステップに比べると導入実績・情報量が少ない</li>
          <li>フリープランはシナリオ1つ・フォーム3つの制限あり</li>
          <li>高度な分析機能（クロス分析等）がない</li>
          <li>外部ツールとのAPI連携はプロプランのみ</li>
        </ul>
      </section>

      {/* ── Lステップ比較 ── */}
      <section>
        <h2 id="vs-lstep" className="text-xl font-bold text-gray-800">Lステップとの比較</h2>

        <ComparisonTable
          headers={["比較項目", "エルメ", "Lステップ"]}
          rows={[
            ["無料プラン", "あり（充実）", "なし（30日トライアルのみ）"],
            ["最低月額", "0円", "2,980円"],
            ["導入実績", "増加中", "業界最多"],
            ["シナリオ配信", "対応", "対応（より高度）"],
            ["流入経路分析", "有料プラン〜", "スタンダード〜"],
            ["クロス分析", "非対応", "プロプラン〜"],
            ["UIの使いやすさ", "シンプル", "やや複雑"],
            ["予約機能", "標準搭載", "外部連携"],
          ]}
        />

        <Callout type="point" title="選定の基準">
          コストを最小限に抑えたい → エルメ。高度な分析・豊富な情報リソースを重視 → Lステップ。まずはエルメの無料プランで試し、機能不足を感じたらLステップを検討するのが賢い方法です。
        </Callout>
      </section>

      {/* ── 向いている人 ── */}
      <section>
        <h2 id="who-should-use" className="text-xl font-bold text-gray-800">エルメが向いている人</h2>

        <ResultCard
          before="ツール費用0円でLINE運用開始"
          after="友だち増加後にプランアップグレード"
          metric="リスクゼロで始められる段階的導入"
          description="まず無料で機能を体験し、効果を確認してから投資判断"
        />

        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>個人事業主・フリーランス</strong> — コストゼロでLINE運用を始めたい</li>
          <li><strong>小規模店舗</strong> — 友だち数500人以下で基本的な配信ができればOK</li>
          <li><strong>LINE拡張ツール初心者</strong> — まずは操作に慣れてからツール選定したい</li>
          <li><strong>予約機能が必要な業種</strong> — カレンダー予約が標準搭載されている</li>
        </ul>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="エルメ評価のポイント">
          <ul className="mt-1 space-y-1">
            <li>・無料プランの充実度は業界トップクラス</li>
            <li>・シナリオ配信・フォーム・予約機能が0円で使える</li>
            <li>・UIがシンプルで初心者でも扱いやすい</li>
            <li>・高度な分析機能が必要な場合はLステップが優位</li>
          </ul>
        </Callout>

        <p>他のツールとの比較は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>で網羅的に解説しています。無料で始められるツール全般については<Link href="/line/column/free-line-extension-tools-comparison" className="text-sky-600 underline hover:text-sky-800">無料LINE拡張ツール比較</Link>もご覧ください。</p>
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
