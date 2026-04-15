import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-kpi-dashboard-design")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "EC×LINE運用で最初に追うべきKPIは何ですか？", a: "最初は「友だち数」「カゴ落ち回収率」「LINE経由売上」の3つに絞りましょう。この3指標で運用の基本的な健全性を把握できます。慣れてきたらセグメント別KPIを追加していきます。" },
  { q: "KPIの確認頻度はどのくらいですか？", a: "友だち数・売上・カゴ落ち回収率は日次、配信別の開封率・クリック率は配信ごと、ブロック率・ROIは週次〜月次で確認するのが推奨です。" },
  { q: "KPIダッシュボードはどう作りますか？", a: "Lオペ for ECの管理画面で配信実績やセグメント別の反応率を確認できます。より詳細な分析が必要な場合は、GA4やLooker Studioとの連携も可能です。" },
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
  "EC×LINE運用で追うべきKPIの体系的な整理",
  "フェーズ別（立ち上げ・成長・成熟）のKPI設計",
  "意思決定に必要なダッシュボードの構成",
];

const toc = [
  { id: "kpi-framework", label: "KPIフレームワーク" },
  { id: "core-kpis", label: "コアKPI 5指標" },
  { id: "phase-kpis", label: "フェーズ別KPI設計" },
  { id: "dashboard-design", label: "ダッシュボード構成" },
  { id: "alert-rules", label: "アラートルール" },
  { id: "reporting", label: "レポーティング" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="KPI設計" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「何を計測すべきかわからない」「データは見ているが改善に繋がらない」 — EC×LINE運用の効果を最大化するには、<strong>正しいKPI設計</strong>と意思決定に直結するダッシュボードが不可欠です。本記事では、追うべき指標と実践的なダッシュボードの作り方を解説します。</p>

      <section>
        <h2 id="kpi-framework" className="text-xl font-bold text-gray-800">KPIフレームワーク</h2>
        <ComparisonTable
          headers={["レイヤー", "KPI", "目的"]}
          rows={[
            ["ビジネス", "LINE経由売上・ROI", "経営判断・投資判断"],
            ["チャネル", "友だち数・ブロック率", "チャネルの健全性"],
            ["配信", "開封率・クリック率・CV率", "配信施策の効果"],
            ["施策", "カゴ落ち回収率・リピート率", "個別施策の最適化"],
          ]}
        />
      </section>

      <section>
        <h2 id="core-kpis" className="text-xl font-bold text-gray-800">コアKPI 5指標</h2>
        <StatGrid stats={[
          { value: "LINE経由売上", label: "月商に占めるLINE貢献額" },
          { value: "友だち数", label: "アクティブ友だちの増減" },
          { value: "カゴ落ち回収率", label: "リマインド後の購入率" },
          { value: "配信ROI", label: "コスト対売上の比率" },
          { value: "ブロック率", label: "月間のブロック率" },
        ]} />

        <ComparisonTable
          headers={["KPI", "目標値", "計測頻度", "改善アクション"]}
          rows={[
            ["LINE経由売上", "月商の10〜20%", "日次", "配信施策の追加・最適化"],
            ["アクティブ友だち数", "月+5〜10%成長", "日次", "友だち獲得施策の強化"],
            ["カゴ落ち回収率", "15%以上", "日次", "メッセージ・タイミングの改善"],
            ["配信ROI", "300%以上", "月次", "高ROI施策への集中"],
            ["ブロック率", "月2%以下", "週次", "配信頻度・内容の改善"],
          ]}
        />
      </section>

      <section>
        <h2 id="phase-kpis" className="text-xl font-bold text-gray-800">フェーズ別KPI設計</h2>
        <FlowSteps steps={[
          { title: "立ち上げ期（1〜3ヶ月）", desc: "友だち数・自動配信稼働率・カゴ落ち回収率の3指標に集中。まずは仕組みの安定稼働が最優先" },
          { title: "成長期（4〜12ヶ月）", desc: "LINE経由売上・配信ROI・セグメント別CV率を追加。売上貢献の可視化と施策の効果測定" },
          { title: "成熟期（13ヶ月〜）", desc: "LTV・リテンション率・NPS・カスタムアトリビューションを追加。長期的な顧客価値の最大化" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="dashboard-design" className="text-xl font-bold text-gray-800">ダッシュボード構成</h2>
        <ComparisonTable
          headers={["セクション", "表示指標", "対象者"]}
          rows={[
            ["サマリー", "LINE経由売上・友だち数・ROI", "経営者・マネージャー"],
            ["配信パフォーマンス", "配信別の開封率・クリック率・CV率", "運用担当者"],
            ["カゴ落ち回収", "回収率・回収額・メッセージ別効果", "運用担当者"],
            ["セグメント分析", "セグメント別CV率・売上・ブロック率", "マーケター"],
            ["トレンド", "週次・月次のKPI推移グラフ", "全員"],
          ]}
        />
      </section>

      <section>
        <h2 id="alert-rules" className="text-xl font-bold text-gray-800">アラートルール</h2>
        <ComparisonTable
          headers={["アラート条件", "しきい値", "対応"]}
          rows={[
            ["ブロック率急上昇", "週間3%以上", "直近の配信内容・頻度を見直し"],
            ["カゴ落ち回収率低下", "10%以下", "配信タイミング・メッセージの改善"],
            ["開封率低下", "50%以下", "件名・配信時間帯の変更"],
            ["ROI低下", "200%以下", "コスト見直し・低効果施策の停止"],
          ]}
        />
      </section>

      <section>
        <h2 id="reporting" className="text-xl font-bold text-gray-800">レポーティング</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>日次レポート</strong> — 売上・友だち数・カゴ落ち回収の自動集計。Slack/LINE通知</li>
          <li><strong>週次レポート</strong> — 配信パフォーマンスの週間サマリー。改善ポイントの共有</li>
          <li><strong>月次レポート</strong> — ROI・LTV・セグメント分析の月間レポート。経営報告用</li>
        </ul>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>5つのコアKPIから始める</strong> — LINE経由売上・友だち数・カゴ落ち回収率・ROI・ブロック率</li>
          <li><strong>フェーズに応じてKPIを段階的に追加</strong> — 立ち上げ→成長→成熟で追う指標を変える</li>
          <li><strong>ダッシュボードは対象者別に設計</strong> — 経営者向けと運用担当者向けで表示内容を変える</li>
          <li><strong>ROI測定の詳細は</strong><Link href="/ec/column/ec-line-roi-measurement" className="text-blue-600 underline">ROI測定方法</Link>を、改善手法は<Link href="/ec/column/ec-line-ab-test-best-practices" className="text-blue-600 underline">A/Bテスト実践ガイド</Link>も参照</li>
        </ol>
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
