import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ComparisonTable,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-at-vs-line-official-account-differences")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE@はまだ使えますか？", a: "いいえ、LINE@は2019年にLINE公式アカウントに完全統合され、現在は新規開設できません。既存のLINE@アカウントもすべてLINE公式アカウントに自動移行されています。" },
  { q: "統合後に使えなくなった機能はありますか？", a: "基本的にLINE@の機能はすべてLINE公式アカウントに引き継がれています。むしろAPI対応の強化、分析機能の充実、リッチメニューの改善など、機能は大幅にアップグレードされています。" },
  { q: "旧LINE@時代のデータは引き継がれていますか？", a: "友だちリスト、トーク履歴、アカウント名などの基本データは引き継がれています。ただし、一部の古い統計データは参照できなくなっている場合があります。" },
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
  "LINE@からLINE公式アカウントへの統合で変わった料金体系を解説",
  "統合後に追加・強化された新機能の一覧と活用法",
  "現在の公式アカウントで活用すべき機能を整理",
];

const toc = [
  { id: "history", label: "LINE@とLINE公式アカウントの歴史" },
  { id: "pricing-change", label: "料金体系の変化" },
  { id: "feature-comparison", label: "機能比較: 何が変わったか" },
  { id: "new-features", label: "統合後に追加された新機能" },
  { id: "api-enhancement", label: "API対応の強化" },
  { id: "current-best-practice", label: "現在のベストプラクティス" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE公式アカウント入門" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">2019年4月に<strong>LINE@はLINE公式アカウントに完全統合</strong>されました。「LINE@と何が違うの？」「統合で何が変わったの？」という疑問を持つ方向けに、<strong>料金体系・機能・API対応</strong>の変更点を整理し、現在のLINE公式アカウントで最大限の成果を出すためのポイントを解説します。</p>

      {/* ── 歴史 ── */}
      <section>
        <h2 id="history" className="text-xl font-bold text-gray-800">LINE@とLINE公式アカウントの歴史</h2>
        <p>LINEのビジネス向けアカウントは、何度かの統合・名称変更を経て現在の形になっています。</p>

        <FlowSteps steps={[
          { title: "2012年: LINE@登場", desc: "中小企業・店舗向けのビジネスアカウントとして登場。無料で始められる手軽さが人気に。" },
          { title: "2015年: LINE公式アカウント（旧）", desc: "大企業向けのプレミアムアカウントとして提供。月額費用が高額で大企業しか利用できなかった。" },
          { title: "2019年4月: 統合", desc: "LINE@と旧LINE公式アカウントが統合。料金体系が「従量課金」ベースに変更され、すべての企業が同じプラットフォームを利用可能に。" },
          { title: "2024年6月: 料金改定", desc: "プラン名称変更（フリー→コミュニケーション）、無料メッセージ通数の削減などが実施。" },
        ]} />
      </section>

      {/* ── 料金の変化 ── */}
      <section>
        <h2 id="pricing-change" className="text-xl font-bold text-gray-800">料金体系の変化</h2>
        <p>最大の変更点は、LINE@時代の「月額定額+無制限配信」から「従量課金」への移行です。</p>

        <ComparisonTable
          headers={["比較項目", "旧LINE@", "現LINE公式アカウント"]}
          rows={[
            ["料金体系", "月額定額（無制限配信）", "基本料+従量課金"],
            ["無料プラン", "月1,000通まで無料", "月200通まで無料"],
            ["ターゲットリーチ", "制限なし", "制限なし"],
            ["1通あたりの単価", "計算しにくい", "明確（約0.5〜3円）"],
            ["コスト管理", "難しい", "容易（通数ベース）"],
          ]}
        />

        <Callout type="info" title="従量課金のメリット">
          従量課金になったことで、「本当に届けたい人にだけ配信する」セグメント配信の重要性が高まりました。結果的に配信の質が向上し、ブロック率の低下にもつながっています。
        </Callout>
      </section>

      {/* ── 機能比較 ── */}
      <section>
        <h2 id="feature-comparison" className="text-xl font-bold text-gray-800">機能比較: 何が変わったか</h2>

        <ComparisonTable
          headers={["機能", "旧LINE@", "現LINE公式アカウント"]}
          rows={[
            ["リッチメニュー", "簡易版のみ", "カスタマイズ可能"],
            ["リッチメッセージ", "一部プラン限定", "全プラン利用可"],
            ["セグメント配信", "非対応", "対応（属性・行動）"],
            ["Messaging API", "一部対応", "フル対応"],
            ["チャットモード", "1:1トークのみ", "チャット+Bot切替"],
            ["分析機能", "基本統計のみ", "詳細ダッシュボード"],
            ["ショップカード", true, true],
            ["クーポン", true, true],
          ]}
        />

        <ResultCard
          before="LINE@: 機能制限あり"
          after="LINE公式: フル機能利用可"
          metric="全プランで主要機能が利用可能に"
          description="大企業限定だった機能が中小企業でも使えるように"
        />
      </section>

      <InlineCTA />

      {/* ── 新機能 ── */}
      <section>
        <h2 id="new-features" className="text-xl font-bold text-gray-800">統合後に追加・強化された新機能</h2>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>オーディエンス配信</strong> — ユーザーの行動（メッセージ開封・リンククリック等）に基づいたターゲティング配信</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>ステップ配信</strong> — 友だち追加後に時系列でメッセージを自動配信するシナリオ機能</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>LINE VOOM</strong> — タイムライン投稿の後継。フォロワーに向けた情報発信</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>リッチビデオメッセージ</strong> — 動画を使ったリッチなメッセージ配信</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">5.</span><strong>LINE Tag</strong> — Webサイト上のユーザー行動をLINEに連携するコンバージョン計測タグ</li>
        </ul>
      </section>

      {/* ── API強化 ── */}
      <section>
        <h2 id="api-enhancement" className="text-xl font-bold text-gray-800">API対応の強化 — 拡張ツールとの連携</h2>
        <p>Messaging APIの全面開放により、Lステップやエルメといった<strong>LINE拡張ツール</strong>との連携が大幅に進化しました。</p>

        <StatGrid stats={[
          { value: "100", unit: "%", label: "APIの全プラン開放" },
          { value: "30", unit: "+", label: "連携可能な拡張ツール" },
          { value: "5", unit: "分", label: "Webhook設定の所要時間" },
        ]} />

        <p>拡張ツールを活用することで、LINE公式アカウント単体では実現できない高度な顧客管理やシナリオ配信が可能になります。詳しくは<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>をご覧ください。</p>
      </section>

      {/* ── ベストプラクティス ── */}
      <section>
        <h2 id="current-best-practice" className="text-xl font-bold text-gray-800">現在のLINE公式アカウントのベストプラクティス</h2>

        <FlowSteps steps={[
          { title: "セグメント配信を基本に", desc: "従量課金のため、一斉配信ではなくターゲットを絞ったセグメント配信でコスト効率を最大化する。" },
          { title: "リッチメニューを徹底活用", desc: "メッセージ通数を消費せずに情報提供できるリッチメニューは、コスト削減の最強ツール。" },
          { title: "拡張ツールの導入を検討", desc: "友だち数が増えてきたら、Lステップやエルメ等の拡張ツールで高度な運用を実現する。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINE@→公式アカウント統合のポイント">
          <ul className="mt-1 space-y-1">
            <li>・LINE@は2019年に公式アカウントに統合済み、新規開設不可</li>
            <li>・料金は従量課金に変更、セグメント配信の重要性が向上</li>
            <li>・機能は大幅強化、全プランで主要機能が利用可能に</li>
            <li>・API全面開放で拡張ツールとの連携が容易に</li>
          </ul>
        </Callout>

        <p>LINE公式アカウントの基本を押さえたら、<Link href="/line/column/how-to-create-line-official-account-2026" className="text-sky-600 underline hover:text-sky-800">アカウントの作り方完全ガイド</Link>で実際に開設してみましょう。料金プランの選び方については<Link href="/line/column/line-official-account-pricing-plan-comparison" className="text-sky-600 underline hover:text-sky-800">料金プラン比較</Link>で詳しく解説しています。</p>
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
