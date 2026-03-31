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
const self = articles.find((a) => a.slug === "line-scenario-delivery-setup-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "シナリオ配信は何通くらいが適切ですか？", a: "初回シナリオは5〜7通が標準的です。1通目は友だち追加直後、2〜3通目は翌日〜3日後に教育コンテンツ、4〜5通目で商品・サービスの紹介、最終通でCTA（予約・購入等）という構成が効果的です。" },
  { q: "シナリオ配信とステップ配信の違いは何ですか？", a: "基本的には同じ意味で使われます。「ステップ配信」はLINE公式アカウントの標準機能名、「シナリオ配信」はLステップ等の拡張ツールで使われる名称です。拡張ツールの方が条件分岐など高度な設定が可能です。" },
  { q: "シナリオ配信のメッセージ通数はカウントされますか？", a: "はい、シナリオ配信で送られるメッセージもLINE公式アカウントの配信通数にカウントされます。友だち数が多い場合はプランの通数上限に注意が必要です。" },
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
  "シナリオ配信の基本概念と効果的な活用パターンを解説",
  "友だち追加後の自動配信シナリオの設計テンプレートを提供",
  "条件分岐を活用した高度なシナリオ設計の方法を紹介",
];

const toc = [
  { id: "what-is-scenario", label: "シナリオ配信とは" },
  { id: "why-effective", label: "シナリオ配信が効果的な理由" },
  { id: "basic-scenario", label: "基本シナリオの設計テンプレート" },
  { id: "conditional-branching", label: "条件分岐の活用" },
  { id: "industry-examples", label: "業種別シナリオ事例" },
  { id: "optimization", label: "シナリオの最適化方法" },
  { id: "tools-comparison", label: "ツール別のシナリオ機能比較" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="配信・メッセージング" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">友だち追加後に「自動で」「最適なタイミングで」「段階的に」メッセージを配信する<strong>シナリオ配信（ステップ配信）</strong>は、LINE運用の効果を飛躍的に高める機能です。手動配信に比べてCVRが<strong>2〜5倍</strong>向上するケースも珍しくありません。本記事では<strong>設計テンプレート・条件分岐・業種別事例</strong>まで、シナリオ配信の作り方を完全解説します。</p>

      {/* ── シナリオ配信とは ── */}
      <section>
        <h2 id="what-is-scenario" className="text-xl font-bold text-gray-800">シナリオ配信（ステップ配信）とは</h2>
        <p>シナリオ配信とは、友だち追加や特定のアクションをトリガーに、あらかじめ設定した複数のメッセージを時系列で自動配信する機能です。メールマーケティングの「ステップメール」のLINE版と考えると分かりやすいでしょう。</p>

        <StatGrid stats={[
          { value: "2〜5", unit: "倍", label: "手動配信比のCVR向上" },
          { value: "90", unit: "%", label: "シナリオ1通目の開封率" },
          { value: "0", unit: "時間", label: "運用にかかる日次工数" },
          { value: "5〜7", unit: "通", label: "標準的なシナリオ通数" },
        ]} />

        <Callout type="info" title="一度設定すれば自動で稼働し続ける">
          シナリオ配信は最初の設計・設定に工数がかかりますが、一度設定すれば友だちが追加されるたびに自動で配信が走ります。「寝ている間にも顧客育成が進む」のがシナリオ配信の最大の魅力です。
        </Callout>
      </section>

      {/* ── なぜ効果的か ── */}
      <section>
        <h2 id="why-effective" className="text-xl font-bold text-gray-800">シナリオ配信が効果的な理由</h2>

        <FlowSteps steps={[
          { title: "最も関心が高いタイミングで配信", desc: "友だち追加直後はサービスへの関心が最も高い時期。このゴールデンタイムを逃さず自動でアプローチできる。" },
          { title: "段階的な信頼構築", desc: "いきなりセールスするのではなく、教育→信頼構築→提案の流れで段階的にアプローチ。押し売り感がなく受け入れられやすい。" },
          { title: "全員に同じ品質のメッセージ", desc: "手動対応では担当者によるバラつきが出るが、シナリオ配信では全員に同じ品質のメッセージが届く。" },
          { title: "データに基づく改善が可能", desc: "各ステップの開封率・クリック率が計測できるため、データに基づいてシナリオを継続的に改善できる。" },
        ]} />
      </section>

      {/* ── 基本シナリオ ── */}
      <section>
        <h2 id="basic-scenario" className="text-xl font-bold text-gray-800">基本シナリオの設計テンプレート（7通構成）</h2>

        <ComparisonTable
          headers={["ステップ", "配信タイミング", "内容", "目的"]}
          rows={[
            ["1通目", "友だち追加直後", "あいさつ+特典配布", "初回エンゲージメント"],
            ["2通目", "1日後", "自己紹介・ストーリー", "信頼構築"],
            ["3通目", "3日後", "お役立ち情報①", "教育・価値提供"],
            ["4通目", "5日後", "お役立ち情報②", "教育・価値提供"],
            ["5通目", "7日後", "サービス紹介", "認知・理解"],
            ["6通目", "10日後", "お客様の声・事例", "社会的証明"],
            ["7通目", "14日後", "CTA（予約・購入）", "コンバージョン"],
          ]}
        />

        <Callout type="point" title="最初の3通が勝負">
          シナリオの離脱は1〜3通目に集中します。特に1通目のあいさつメッセージは開封率90%以上ですが、2通目以降は徐々に下がります。最初の3通で「このアカウントは有益だ」と感じてもらうことが重要です。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 条件分岐 ── */}
      <section>
        <h2 id="conditional-branching" className="text-xl font-bold text-gray-800">条件分岐を活用した高度なシナリオ設計</h2>
        <p>拡張ツール（Lステップ・エルメ等）を使うと、ユーザーの回答やアクションに応じてシナリオを分岐させることができます。</p>

        <FlowSteps steps={[
          { title: "分岐条件1: アンケート回答", desc: "「何に興味がありますか？」の回答に応じて、Aコース（商品紹介）とBコース（サービス紹介）に分岐。" },
          { title: "分岐条件2: リンククリック", desc: "配信メッセージ内のリンクをクリックしたかどうかで分岐。クリックしたユーザーには詳細情報を、しなかったユーザーには別のアプローチを配信。" },
          { title: "分岐条件3: タグ条件", desc: "特定のタグが付いている（例: 過去購入済み）かどうかで配信内容を変更。リピーターと新規で異なるシナリオを展開。" },
        ]} />

        <ResultCard
          before="全員に同じシナリオ: CVR 3%"
          after="条件分岐シナリオ: CVR 8%"
          metric="パーソナライズでCVRが2.7倍に"
          description="ユーザーの関心に合ったメッセージで成約率が大幅向上"
        />
      </section>

      {/* ── 業種別事例 ── */}
      <section>
        <h2 id="industry-examples" className="text-xl font-bold text-gray-800">業種別シナリオ事例</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">EC・物販</h3>
        <p>友だち追加 → ブランドストーリー → 人気商品紹介 → お客様レビュー → 限定クーポン → 購入CTA</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">美容サロン</h3>
        <p>友だち追加 → サロン紹介 → メニュー案内 → ビフォーアフター → 初回特典クーポン → 予約CTA</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">教育・スクール</h3>
        <p>友だち追加 → 無料コンテンツ配布 → 学習のコツ① → 学習のコツ② → 受講生の声 → 体験申込CTA</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">不動産</h3>
        <p>友だち追加 → エリア情報 → 物件選びのポイント → 新着物件案内 → 内見予約CTA</p>

        <BarChart
          data={[
            { label: "EC・物販", value: 5.2, color: "#22c55e" },
            { label: "美容サロン", value: 7.8, color: "#ec4899" },
            { label: "教育・スクール", value: 4.5, color: "#3b82f6" },
            { label: "不動産", value: 3.1, color: "#f59e0b" },
          ]}
          unit="% CVR"
        />
      </section>

      {/* ── 最適化 ── */}
      <section>
        <h2 id="optimization" className="text-xl font-bold text-gray-800">シナリオの最適化方法</h2>

        <FlowSteps steps={[
          { title: "各ステップの開封率を確認", desc: "開封率が急落するステップがあれば、配信タイミングやメッセージ内容を見直す。" },
          { title: "離脱ポイントを特定", desc: "シナリオのどのステップでブロック・離脱が多いかを分析し、そのステップの内容を改善する。" },
          { title: "A/Bテストを実施", desc: "同じステップで2パターンのメッセージを用意し、開封率・クリック率の高い方を採用する。" },
          { title: "月1回のシナリオ見直し", desc: "全ステップのデータを確認し、改善点をリストアップして順次対応する。" },
        ]} />
      </section>

      {/* ── ツール比較 ── */}
      <section>
        <h2 id="tools-comparison" className="text-xl font-bold text-gray-800">ツール別のシナリオ機能比較</h2>

        <ComparisonTable
          headers={["機能", "LINE公式(標準)", "Lステップ", "エルメ"]}
          rows={[
            ["ステップ数", "最大10", "無制限", "無制限（有料）"],
            ["条件分岐", false, true, true],
            ["時間指定", "日単位", "分単位", "分単位"],
            ["アクショントリガー", "友だち追加のみ", "タグ・クリック等", "タグ・クリック等"],
            ["テンプレート", "なし", "あり", "あり"],
            ["A/Bテスト", false, true, "有料プラン"],
          ]}
        />

        <p>高度なシナリオ配信を実現するにはLINE拡張ツールの導入が必要です。ツールの選び方は<Link href="/line/column/line-tool-selection-5-criteria" className="text-sky-600 underline hover:text-sky-800">LINE運用ツール選び方5つの基準</Link>で解説しています。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="シナリオ配信設計のポイント">
          <ul className="mt-1 space-y-1">
            <li>・基本シナリオは5〜7通、教育→信頼→提案の流れで設計</li>
            <li>・最初の3通でユーザーの興味を維持することが最重要</li>
            <li>・条件分岐でパーソナライズするとCVRが2〜3倍に</li>
            <li>・月1回のデータ確認と改善でシナリオの効果を持続させる</li>
          </ul>
        </Callout>

        <p>シナリオ配信と合わせて<Link href="/line/column/line-segment-delivery-design-guide" className="text-sky-600 underline hover:text-sky-800">セグメント配信設計</Link>も導入すると、配信効果がさらに向上します。LINE公式アカウントの料金プランと配信コストの関係は<Link href="/line/column/line-official-account-pricing-plan-comparison" className="text-sky-600 underline hover:text-sky-800">料金プラン比較</Link>をご覧ください。</p>
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
