import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  BarChart,
  StatGrid,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "lstep-vs-clinic-tool")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "Lステップとクリニック専用ツールの最大の違いは？", a: "Lステップは業種を問わない汎用LINE拡張ツールで、クリニック専用ツールは予約管理・問診・カルテ・決済など医療特有の機能を一体化しています。汎用ツールでは医療ワークフローの構築に大量のカスタマイズが必要ですが、専用ツールなら初期設定だけで運用開始できます。" },
  { q: "LステップからLオペ for CLINICに移行できますか？", a: "はい、移行可能です。LINE公式アカウントはそのまま維持し、連携ツールだけを切り替える形になります。友だちリストやトーク履歴はLINE公式側に残るため、患者への影響はありません。" },
  { q: "Linyとの違いは何ですか？", a: "LinyもLステップと同様に汎用LINE配信ツールです。クリニック専用ツールとの違いは、予約管理・問診・カルテ・決済など医療特有の機能の有無です。配信機能だけでなく業務全体を効率化したい場合は専用ツールが適しています。" },
];

/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */
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
  "Lステップ・Linyとクリニック専用ツールの機能比較",
  "汎用LINE配信ツールではカバーできないクリニック特有の課題",
  "費用面でのオールインワン vs 複数SaaS組み合わせの比較",
];

const toc = [
  { id: "pitfall", label: "LINE配信ツール選びの落とし穴" },
  { id: "comparison", label: "比較表: 汎用 vs 専用ツール" },
  { id: "generic-use-case", label: "汎用ツールが向いているケース" },
  { id: "why-clinic-tool", label: "クリニック専用ツールが必要な理由" },
  { id: "cost", label: "費用比較" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ツール比較" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        Lステップ・Linyなどの汎用LINE配信ツールは配信・タグ管理に強い一方、問診・カルテ・決済・配送といったクリニック特有の業務には対応できません。複数SaaSを組み合わせるとコストが膨らむため、クリニックには<strong>オールインワンの専用ツール</strong>が費用対効果で優れます。本記事では機能・費用の両面から徹底比較します。
      </p>

      <section>
        <h2 id="pitfall" className="text-xl font-bold text-gray-800">クリニックがLINE配信ツールを選ぶ際の落とし穴</h2>
        <p>「LINE公式アカウントをもっと活用したい」と考えたとき、まず候補に上がるのがLステップやLinyなどの汎用LINE配信ツールです。これらは飲食・EC・美容サロンなど幅広い業種に対応しており、高機能なツールです。</p>

        <Callout type="warning" title="クリニック特有の業務フローに注意">
          汎用ツールは「配信・タグ管理」が主領域。問診・カルテ・決済・配送といった医療特有の業務フローはカバーできず、複数SaaSを組み合わせる必要があります。実際のクリニック活用事例は<Link href="/clinic/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link>で紹介しています。
        </Callout>
      </section>

      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">比較表: 汎用ツール vs クリニック専用ツール</h2>

        <ComparisonTable
          headers={["比較項目", "Lステップ・Liny等", "Lオペ for CLINIC"]}
          rows={[
            ["対象業種", "飲食・EC・サロン等 汎用", "クリニック専用設計"],
            ["患者CRM", "顧客管理（汎用）", "患者CRM（来院履歴・処方・タグ）"],
            ["オンライン問診", "フォーム作成のみ", "医療問診 → 予約 → 来院フロー統合"],
            ["予約管理", "外部連携 or なし", "LINE上で予約完結＋自動リマインド"],
            ["カルテ管理", false, "SOAP形式カルテ＋音声カルテ"],
            ["決済管理", false, "Square/GMO連携オンライン決済"],
            ["配送管理", false, "処方薬配送CSV＋追跡番号自動通知"],
            ["AI自動返信", "チャットボット（ルールベース）", "AI返信（予約・決済・発送状況を加味）＋スタッフ修正学習"],
            ["スマホ管理・通知bot", false, "LINE通知botで予約・決済をリアルタイム通知＋スマホからAI返信承認・トーク操作"],
            ["リッチメニュー", "テンプレート選択", "ノーコードビルダー＋患者状態連動切替"],
            ["セグメント配信", "タグ・属性ベース", "来院履歴・予約・決済データ連動"],
            ["導入サポート", "オンラインマニュアル中心", "専任担当のワンストップ伴走"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="generic-use-case" className="text-xl font-bold text-gray-800">Lステップ・Linyが向いているケース</h2>
        <p>汎用ツールが有効なのは以下のようなケースです。</p>

        <Callout type="info" title="汎用ツールがフィットする条件">
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>飲食・EC・サロンなど、予約→来店で完結するビジネス</li>
            <li>LINE配信（メッセージマーケティング）が主目的</li>
            <li>決済・配送・カルテなどの業務管理は別システムで完結している</li>
            <li>既にLステップのシナリオ構築に習熟したスタッフがいる</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="why-clinic-tool" className="text-xl font-bold text-gray-800">クリニック専用ツールが必要な理由</h2>
        <p>クリニックの業務フローは「問診→予約→診察→処方→決済→配送→フォロー」という長いチェーンです。汎用ツールはこのチェーンの一部にしか対応できません。</p>

        <FlowSteps steps={[
          { title: "問診", desc: "LINE上でオンライン問診を完了" },
          { title: "予約", desc: "空き枠から予約＋自動リマインド" },
          { title: "診察", desc: "SOAP形式カルテで記録" },
          { title: "決済", desc: "Square/GMOでオンライン決済" },
          { title: "配送", desc: "処方薬の配送＋追跡番号通知" },
          { title: "フォロー", desc: "セグメント配信で再診促進" },
        ]} />

        <Callout type="point" title="クリニック専用ツールを選ぶべき3つの理由">
          <ol className="list-decimal pl-5 space-y-2 mt-1">
            <li><strong>データが分断されない</strong> — 問い合わせ・予約・来院・決済・配送がすべて1画面で連携。抜け漏れゼロ</li>
            <li><strong>ツール代＋人件費をまとめて削減</strong> — カルテ・予約・LINE/CRMの個別導入で月15〜30万＋管理人件費。Lオペなら月10〜18万円でオールインワン、事務スタッフ1人で運用完結</li>
            <li><strong>医療特化の自動化シナリオ</strong> — 友だち追加から再診促進まで全自動フロー。汎用ツールでは実現困難</li>
          </ol>
        </Callout>
      </section>

      <section>
        <h2 id="cost" className="text-xl font-bold text-gray-800">費用の違い: 複数SaaS＋人件費 vs オールインワン</h2>
        <p>クリニックが汎用ツール＋各種SaaSを組み合わせた場合、ツール費用だけでなく管理する事務スタッフの人件費も発生します。オールインワンツールとのトータルコストを比較します。予約システム単体の比較は<Link href="/clinic/column/reservation-system-comparison" className="text-emerald-700 underline">予約システム比較10選</Link>で詳しく解説しています。</p>

        <BarChart
          data={[
            { label: "LINE配信ツール", value: 3, color: "bg-gray-400" },
            { label: "予約管理", value: 2, color: "bg-gray-400" },
            { label: "オンライン問診", value: 2, color: "bg-gray-400" },
            { label: "決済システム", value: 1.5, color: "bg-gray-400" },
            { label: "配送管理", value: 1, color: "bg-gray-400" },
            { label: "事務員人件費（管理工数）", value: 8, color: "bg-red-300" },
          ]}
          unit="万円/月"
        />

        <StatGrid stats={[
          { value: "15〜30", unit: "万円", label: "複数SaaS＋人件費/月" },
          { value: "10〜18", unit: "万円", label: "Lオペ オールインワン/月" },
          { value: "0", unit: "個", label: "追加で必要なツール数" },
        ]} />

        <Callout type="success" title="Lオペ for CLINICなら月5〜12万円以上のコスト削減">
          複数ツールの個別契約だけで月5〜10万円。さらにツール間のデータ転記・管理に事務スタッフの工数がかかり、実質月15〜30万円のコストになります。Lオペなら全機能がオールインワンで月10〜18万円、事務スタッフ1人で運用完結。年間で60〜150万円以上のコスト削減が可能です。<Link href="/clinic/features" className="text-sky-600 underline hover:text-sky-800">全機能一覧</Link>をご確認の上、<a href="/clinic/contact" className="text-emerald-700 underline">お問い合わせ</a>ください。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: クリニックには専用ツールを選ぶべき</h2>
        <p>Lステップ・Linyは優れたLINE配信ツールですが、クリニックの業務フロー全体をカバーするには力不足です。<strong>LINE配信だけでなく、予約・問診・カルテ・決済・配送まで統合管理</strong>したいクリニックには、専用設計のツールが最適解です。LINE起点でDXを進める全体像については<Link href="/clinic/column/clinic-dx-guide" className="text-emerald-700 underline">クリニックDX完全ガイド</Link>も併せてご覧ください。自費クリニックの集患チャネル全体像については<Link href="/clinic/column/self-pay-clinic-marketing-guide" className="text-emerald-700 underline">自費クリニック集患マーケティング完全ガイド</Link>で詳しく解説しています。</p>
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
