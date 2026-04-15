import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-broadcast-vs-segment-delivery")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "セグメント配信を始めるにはどのくらいの友だち数が必要ですか？", a: "友だち数が100人以上であればセグメント配信の効果を実感できます。ただし、精度の高いセグメントを作るには300人以上が目安です。友だち数が少ない段階では一斉配信で全体の反応を見つつ、タグ付けを進めるのがおすすめです。" },
  { q: "一斉配信を完全にやめてセグメント配信だけにすべきですか？", a: "いいえ、両方を使い分けるのが最適です。全員に届けるべき重要なお知らせやブランドメッセージは一斉配信で、キャンペーンや商品案内はセグメント配信で送るのが効果的です。完全にセグメントだけにすると、配信対象から漏れるユーザーが出るリスクがあります。" },
  { q: "セグメント配信のタグはどうやって付ければいいですか？", a: "主に3つの方法があります。(1)リッチメニューやアンケートで自己申告してもらう、(2)メッセージ内のリンククリックなど行動データで自動付与する、(3)購買履歴や予約データからAPI連携で付与する。拡張ツール（Lステップ等）を使うとより柔軟なタグ管理が可能です。" },
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
  "一斉配信とセグメント配信の開封率・クリック率・ブロック率をデータで比較",
  "目的別の使い分け基準と組み合わせ戦略",
  "セグメント配信の設計ステップと効果的なタグ管理手法",
];

const toc = [
  { id: "overview", label: "一斉配信とセグメント配信の違い" },
  { id: "data-comparison", label: "効果データ比較" },
  { id: "cost-comparison", label: "配信コストの違い" },
  { id: "use-case", label: "目的別の使い分け基準" },
  { id: "segment-design", label: "セグメント設計のポイント" },
  { id: "combined-strategy", label: "組み合わせ戦略" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="一斉配信vsセグメント" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの配信方法は大きく<strong>「一斉配信」と「セグメント配信」</strong>に分かれます。一斉配信は全友だちに同一メッセージを送る手法で、セグメント配信は属性や行動に基づいてターゲットを絞り込む手法です。本記事では両者の効果をデータで比較し、目的別の使い分け基準と最適な組み合わせ戦略を解説します。</p>

      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">一斉配信とセグメント配信の違い</h2>

        <ComparisonTable
          headers={["比較項目", "一斉配信", "セグメント配信"]}
          rows={[
            ["配信対象", "全友だち", "条件に合致するユーザーのみ"],
            ["メッセージ内容", "全員同一", "セグメントごとに最適化可能"],
            ["配信通数", "多い（全友だち分）", "少ない（対象者分のみ）"],
            ["パーソナライズ", false, true],
            ["設定の手軽さ", true, false],
            ["ブロック率", "高くなりやすい", "低く抑えやすい"],
            ["向いている用途", "全体告知・ブランドメッセージ", "キャンペーン・商品案内"],
          ]}
        />
      </section>

      <section>
        <h2 id="data-comparison" className="text-xl font-bold text-gray-800">効果データ比較 — 開封率・クリック率・ブロック率</h2>

        <BarChart
          data={[
            { label: "一斉配信 開封率", value: 40, color: "#94a3b8" },
            { label: "セグメント 開封率", value: 62, color: "#22c55e" },
            { label: "一斉配信 クリック率", value: 4, color: "#94a3b8" },
            { label: "セグメント クリック率", value: 12, color: "#22c55e" },
          ]}
          unit="%"
        />

        <StatGrid stats={[
          { value: "大幅向上", label: "開封率の向上" },
          { value: "大幅向上", label: "クリック率の向上" },
          { value: "大幅低減", label: "ブロック率の低減" },
        ]} />

        <Callout type="success" title="セグメント配信は全指標で優位">
          セグメント配信は「関心のある情報を、関心のあるユーザーに届ける」ため、開封率・クリック率が大幅に向上し、ブロック率も低く抑えられます。
        </Callout>
      </section>

      <section>
        <h2 id="cost-comparison" className="text-xl font-bold text-gray-800">配信コストの違い</h2>
        <p>LINE公式アカウントの料金プランはメッセージ通数に応じた課金体系です。セグメント配信は対象者を絞り込むため、配信通数を大幅に削減できます。</p>

        <ResultCard before="月10,000通（一斉配信）" after="月4,000通（セグメント配信）" metric="月間配信通数" description="配信コストを60%削減しつつ、CVRは3倍に向上" />

        <Callout type="point" title="コスト効率は圧倒的にセグメント配信が有利">
          友だち数10,000人の場合、毎週の一斉配信で月40,000通を消費します。セグメント配信で対象を40%に絞れば月16,000通に削減でき、プランダウンや通数追加の回避が可能です。料金プランの詳細は<Link href="/line/column/line-official-account-pricing-plan-comparison" className="text-blue-600 underline">料金プラン完全比較</Link>をご覧ください。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="use-case" className="text-xl font-bold text-gray-800">目的別の使い分け基準</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">一斉配信が適しているケース</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>年末年始の営業案内</strong>など全員に届けるべき重要告知</li>
          <li><strong>ブランドメッセージ</strong>や企業理念の発信</li>
          <li><strong>全品セール</strong>など全ユーザーが対象のキャンペーン</li>
          <li><strong>友だち数が少ない段階</strong>（300人未満）での配信</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">セグメント配信が適しているケース</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>特定カテゴリの商品案内</strong> — 過去の購買履歴に基づくレコメンド</li>
          <li><strong>地域限定キャンペーン</strong> — エリア属性で絞り込み</li>
          <li><strong>休眠顧客の掘り起こし</strong> — 一定期間来店がないユーザーへの特別オファー</li>
          <li><strong>リピーター向け施策</strong> — 購入回数や来店頻度に応じた特典</li>
          <li><strong>誕生日クーポン</strong> — 誕生月のユーザーに自動配信</li>
        </ul>
      </section>

      <section>
        <h2 id="segment-design" className="text-xl font-bold text-gray-800">セグメント設計のポイント</h2>

        <FlowSteps steps={[
          { title: "タグ設計", desc: "属性タグ（性別・年代・地域）と行動タグ（閲覧・購入・来店）を体系的に設計する" },
          { title: "データ収集", desc: "リッチメニュー・アンケート・クリック行動・購買データからタグを自動付与する仕組みを構築" },
          { title: "セグメント作成", desc: "複数タグの掛け合わせで配信対象を定義。対象が狭すぎないよう最低50人以上を目安に" },
          { title: "効果測定", desc: "セグメントごとの開封率・クリック率・CVRを比較し、セグメント精度を継続改善" },
        ]} />

        <Callout type="warning" title="セグメントを細分化しすぎない">
          セグメントを細かくしすぎると、対象者が少なくなり統計的に有意な効果測定ができなくなります。最初は3〜5セグメントから始め、データを見ながら徐々に分解していくのがおすすめです。
        </Callout>
      </section>

      <section>
        <h2 id="combined-strategy" className="text-xl font-bold text-gray-800">一斉配信×セグメント配信の組み合わせ戦略</h2>
        <p>最も効果的なのは、両者を目的に応じて組み合わせる戦略です。</p>

        <ComparisonTable
          headers={["配信パターン", "頻度", "目的"]}
          rows={[
            ["一斉配信（月次）", "月1回", "ブランドメッセージ・全体告知"],
            ["セグメント配信（週次）", "週1〜2回", "ターゲット別キャンペーン"],
            ["トリガー配信（自動）", "都度", "行動起点の自動配信（カート放棄等）"],
          ]}
        />

        <p>この組み合わせにより、全体への認知とターゲットへの訴求を両立できます。配信タイミングの最適化については<Link href="/line/column/line-delivery-best-time-frequency" className="text-blue-600 underline">最適な配信頻度・時間帯</Link>もご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "62%", label: "セグメント配信の開封率" },
          { value: "3倍", label: "クリック率の差" },
          { value: "60%減", label: "配信コスト削減" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>セグメント配信は全指標で一斉配信を上回る</strong> — 開封率が大幅に向上、クリック率が大幅に向上、ブロック率が大幅に低減</li>
          <li><strong>配信コストも大幅に削減</strong> — 対象を絞ることで通数課金を最適化</li>
          <li><strong>一斉配信も適材適所で活用</strong> — 全員に届けるべき告知には一斉配信が有効</li>
          <li><strong>3〜5セグメントから始める</strong> — 最初から細分化しすぎず段階的に精度を上げる</li>
          <li><strong>両者の組み合わせが最強</strong> — 月次の一斉配信+週次のセグメント配信が王道パターン</li>
        </ol>
        <p className="mt-4">セグメント配信の具体的な設計方法は<Link href="/line/column/line-segment-delivery-design-guide" className="text-blue-600 underline">セグメント配信設計ガイド</Link>で詳しく解説しています。まずはタグ設計から始めて、段階的にセグメント配信の精度を高めていきましょう。</p>
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
