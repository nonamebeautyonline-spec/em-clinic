import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  ComparisonTable,
  BarChart,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-extension-tool-comparison-2026")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE拡張ツールは必ず必要ですか？", a: "友だち数が100人以下で配信も月1〜2回程度であれば、LINE公式アカウントの標準機能で十分です。友だち数が増えてセグメント配信やシナリオ配信のニーズが出てきた段階で導入を検討しましょう。" },
  { q: "複数のツールを併用することはできますか？", a: "技術的にはWebhookの設定で1つのアカウントに1つのツールしか接続できないため、基本的には併用できません。ツール選定は慎重に行い、一つに絞ることをおすすめします。" },
  { q: "ツールを乗り換える場合、データは引き継げますか？", a: "ツールによりますが、友だちリストや基本的なタグ情報はエクスポート可能なケースが多いです。ただしシナリオ設定やリッチメニューの設計は移行が難しいため、最初のツール選定が重要です。" },
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
  "主要LINE拡張ツール8社の機能・料金・特徴を2026年最新版で比較",
  "Lステップ・エルメ・Liny・プロラインフリーなど主要ツールを網羅",
  "業種・規模別の最適なツール選定ガイド付き",
];

const toc = [
  { id: "what-is-extension-tool", label: "LINE拡張ツールとは" },
  { id: "tool-comparison", label: "主要8ツール比較表" },
  { id: "lstep", label: "Lステップの特徴" },
  { id: "elme", label: "エルメの特徴" },
  { id: "others", label: "その他主要ツール" },
  { id: "pricing-comparison", label: "料金比較" },
  { id: "selection-guide", label: "業種・規模別選定ガイド" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ツール比較・選定" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの標準機能だけでは物足りない――そう感じたら<strong>LINE拡張ツール</strong>の出番です。2026年現在、主要ツールは<strong>8社以上</strong>あり、機能・料金・サポート体制は大きく異なります。本記事では主要ツールを<strong>機能・費用・特徴</strong>の3軸で徹底比較し、自社に最適なツール選びの判断材料を提供します。</p>

      {/* ── LINE拡張ツールとは ── */}
      <section>
        <h2 id="what-is-extension-tool" className="text-xl font-bold text-gray-800">LINE拡張ツールとは</h2>
        <p>LINE拡張ツールとは、LINE公式アカウントのMessaging APIを利用して、標準機能では実現できない高度なマーケティング機能を提供するサードパーティツールの総称です。</p>

        <StatGrid stats={[
          { value: "8", unit: "社+", label: "主要ツール数" },
          { value: "2,980", unit: "円〜", label: "最安月額料金" },
          { value: "0", unit: "円", label: "無料プランあり" },
          { value: "30", unit: "万+", label: "導入アカウント数" },
        ]} />

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>シナリオ配信</strong> — 友だち追加後に時系列でメッセージを自動配信</li>
          <li><strong>高度なセグメント</strong> — タグ・行動・属性を組み合わせた細かいターゲティング</li>
          <li><strong>流入経路分析</strong> — どの経路から友だち追加されたかを追跡</li>
          <li><strong>リッチメニュー切替</strong> — ユーザーの状態に応じてメニューを動的に変更</li>
          <li><strong>フォーム・アンケート</strong> — LINE内で完結する情報収集</li>
        </ul>
      </section>

      {/* ── 比較表 ── */}
      <section>
        <h2 id="tool-comparison" className="text-xl font-bold text-gray-800">主要8ツール比較表</h2>

        <ComparisonTable
          headers={["ツール名", "月額料金", "無料プラン", "シナリオ配信", "セグメント", "特徴"]}
          rows={[
            ["Lステップ", "2,980円〜", false, true, true, "最も利用者が多い定番ツール"],
            ["エルメ", "0円〜", true, true, true, "無料プランが充実"],
            ["Liny", "5,000円〜", false, true, true, "法人向け高機能"],
            ["プロラインフリー", "0円〜", true, true, true, "完全無料で始められる"],
            ["Poster", "980円〜", true, true, false, "シンプルで低価格"],
            ["LIBOT", "3,000円〜", false, true, true, "チャットボット特化"],
            ["Penglue", "成果報酬型", false, false, false, "離脱防止ポップアップ"],
            ["Lオペ", "要問合せ", false, true, true, "業種特化型（クリニック等）"],
          ]}
        />
      </section>

      {/* ── Lステップ ── */}
      <section>
        <h2 id="lstep" className="text-xl font-bold text-gray-800">Lステップの特徴 — 最も導入実績のある定番ツール</h2>
        <p>Lステップは累計導入数が最も多いLINE拡張ツールで、シナリオ配信・セグメント管理・流入経路分析など幅広い機能を備えています。</p>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>料金</strong>: スタートプラン2,980円/月、スタンダード21,780円/月、プロ32,780円/月</li>
          <li><strong>強み</strong>: 導入実績が豊富で情報が多い、テンプレートが充実</li>
          <li><strong>注意点</strong>: 高度な機能はプロプラン以上が必要、初期学習コストが高い</li>
        </ul>
        <p>Lステップの詳細は<Link href="/line/column/lstep-complete-guide-features-pricing" className="text-sky-600 underline hover:text-sky-800">Lステップ徹底解説</Link>で詳しく紹介しています。</p>
      </section>

      {/* ── エルメ ── */}
      <section>
        <h2 id="elme" className="text-xl font-bold text-gray-800">エルメの特徴 — 無料プランが充実した注目ツール</h2>
        <p>エルメ（L Message）は無料プランでも主要機能が使える点が最大の特徴です。コストを抑えてLINE運用を始めたい方に人気があります。</p>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>料金</strong>: フリープラン0円、スタンダード10,780円/月、プロ33,000円/月</li>
          <li><strong>強み</strong>: 無料プランの機能が充実、UIが分かりやすい</li>
          <li><strong>注意点</strong>: 無料プランは友だち数やメッセージ数に制限あり</li>
        </ul>
        <p>エルメの詳細は<Link href="/line/column/elme-line-tool-review-features" className="text-sky-600 underline hover:text-sky-800">エルメ徹底レビュー</Link>で解説しています。</p>
      </section>

      <InlineCTA />

      {/* ── その他ツール ── */}
      <section>
        <h2 id="others" className="text-xl font-bold text-gray-800">その他の主要ツール</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Liny — 法人向け高機能ツール</h3>
        <p>大手企業の導入実績が多く、セキュリティ対応やカスタマイズ性に優れています。月額は5,000円〜で、法人の要件に応じたカスタムプランも用意されています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">プロラインフリー — 完全無料で始められる</h3>
        <p>基本機能が永久無料で使えるのが特徴。ただし高度な機能やサポートは有料プランが必要です。個人事業主やスモールビジネスの入門ツールとして適しています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Poster — シンプルで低価格</h3>
        <p>月額980円からという低価格が魅力。機能は限定的ですが、セグメント配信やステップ配信の基本機能は備えています。</p>
      </section>

      {/* ── 料金比較 ── */}
      <section>
        <h2 id="pricing-comparison" className="text-xl font-bold text-gray-800">料金比較</h2>

        <BarChart
          data={[
            { label: "Poster", value: 980, color: "#22c55e" },
            { label: "Lステップ(Start)", value: 2980, color: "#3b82f6" },
            { label: "LIBOT", value: 3000, color: "#f59e0b" },
            { label: "Liny", value: 5000, color: "#a855f7" },
            { label: "エルメ(Std)", value: 10780, color: "#ec4899" },
            { label: "Lステップ(Std)", value: 21780, color: "#ef4444" },
          ]}
          unit="円/月"
        />

        <Callout type="info" title="価格だけで選ばない">
          最安値のツールが最適とは限りません。必要な機能が含まれているか、サポート体制は十分か、将来的な拡張性はあるかなど、総合的に判断することが重要です。選び方の詳細は<Link href="/line/column/line-tool-selection-5-criteria" className="text-sky-600 underline hover:text-sky-800">LINE運用ツール選び方5つの基準</Link>で解説しています。
        </Callout>
      </section>

      {/* ── 選定ガイド ── */}
      <section>
        <h2 id="selection-guide" className="text-xl font-bold text-gray-800">業種・規模別の選定ガイド</h2>

        <FlowSteps steps={[
          { title: "個人・小規模事業者", desc: "まずは無料のエルメかプロラインフリーで始め、機能不足を感じたらLステップに乗り換えるのが最も安全。" },
          { title: "中小企業・店舗", desc: "Lステップのスタートプラン（2,980円/月）が機能と価格のバランスに優れる。友だち1,000人超でスタンダードプランに移行。" },
          { title: "法人・チェーン店", desc: "LinyまたはLステップのプロプラン。セキュリティ要件や複数店舗管理に対応できるツールを選定。" },
          { title: "特定業種（医療・不動産等）", desc: "業種特化型ツール（Lオペ等）が業務フローに合った機能を提供。汎用ツールよりも初期導入コストを抑えられる場合が多い。" },
        ]} />
      </section>

      {/* クリニック向け誘導 */}
      <div className="my-8 rounded-xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">C</span>
          <span className="text-[14px] font-bold text-blue-800">クリニック・医療機関の方へ</span>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed">
          ツール比較で迷っているクリニックの方には、予約管理・問診・AI自動返信など医療特化の機能を備えた<Link href="/clinic" className="text-blue-600 font-bold underline">Lオペ for CLINIC</Link>がおすすめです。汎用ツールにはない業務フロー統合で導入コストも抑えられます。
          <Link href="/clinic/column/clinic-dx-complete-guide" className="text-blue-600 underline ml-1">クリニックDX完全ガイドを見る →</Link>
        </p>
      </div>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINE拡張ツール選定のポイント">
          <ul className="mt-1 space-y-1">
            <li>・まずは無料ツールで試し、必要な機能を見極める</li>
            <li>・価格だけでなく、機能・サポート・拡張性を総合判断</li>
            <li>・ツールの乗り換えはコストが高いため、初回選定が重要</li>
            <li>・業種特化型ツールも選択肢に入れて検討する</li>
          </ul>
        </Callout>

        <p>無料で始められるツールの詳細は<Link href="/line/column/free-line-extension-tools-comparison" className="text-sky-600 underline hover:text-sky-800">無料LINE拡張ツール比較</Link>をご覧ください。ツール導入後のセグメント配信の設計方法は<Link href="/line/column/line-segment-delivery-design-guide" className="text-sky-600 underline hover:text-sky-800">セグメント配信設計ガイド</Link>で解説しています。</p>
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
