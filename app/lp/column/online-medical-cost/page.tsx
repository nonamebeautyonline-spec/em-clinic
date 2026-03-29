import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-medical-cost")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "オンライン診療の導入費用と運用コストを始めるために必要な準備は何ですか？", a: "厚生労働省のオンライン診療ガイドラインに基づく届出、ビデオ通話システムの導入、オンライン決済の設定が必要です。Lオペ for CLINICならLINEビデオ通話・電話音声通話でのオンライン診療に対応しており、別途システム導入が不要です。" },
  { q: "オンライン診療で処方できる薬に制限はありますか？", a: "初診のオンライン診療では処方日数に制限があります（原則7日分まで）。再診では対面診療と同等の処方が可能です。向精神薬・麻薬等の一部薬剤はオンライン診療での処方が制限されています。" },
  { q: "オンライン診療の診療報酬はどのくらいですか？", a: "保険診療では対面診療より低い点数設定ですが、自費診療であれば自由に価格設定が可能です。通院負担の軽減による患者満足度向上と、遠方からの新患獲得を考慮すると、十分な収益性が見込めます。" },
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
  "オンライン診療の導入費用を項目別に解説（システム・ハードウェア・通信・セキュリティ）",
  "月額の運用コスト（システム維持費・マーケティング・スタッフ教育）",
  "費用を抑える3つのコツ",
  "一気通貫型システム導入のメリット",
];

const toc = [
  { id: "overview", label: "導入費用と運用費用の全体像" },
  { id: "initial-cost", label: "導入時にかかる費用" },
  { id: "running-cost", label: "運用時にかかる費用" },
  { id: "patient-cost", label: "患者側の負担" },
  { id: "cost-reduction", label: "費用を抑える3つのコツ" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">オンライン診療の導入費用は<strong>初期50〜300万円</strong>、<strong>月額運用コスト3〜15万円</strong>が目安です。費用を抑えるには、LINE連携型の一気通貫システムを選び、補助金を活用するのが効果的です。本記事では、導入・運用・患者側の費用を項目別に詳しく解説します。</p>

      {/* ── 全体像 ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">導入費用と運用費用の全体像</h2>
        <p>オンライン診療の費用は大きく「導入時（初期費用）」と「運用時（ランニングコスト）」に分かれます。オンライン診療の仕組みや活用方法の全体像は<Link href="/lp/column/online-medical-line" className="text-sky-600 underline hover:text-sky-800">オンライン診療×LINE</Link>で解説しています。</p>

        <StatGrid stats={[
          { value: "50〜300", unit: "万円", label: "初期費用の目安" },
          { value: "3〜15", unit: "万円/月", label: "月額運用コスト" },
          { value: "500〜1,000", unit: "円", label: "患者側負担" },
        ]} />
      </section>

      {/* ── 初期費用 ── */}
      <section>
        <h2 id="initial-cost" className="text-xl font-bold text-gray-800">導入時にかかる費用</h2>

        <ComparisonTable
          headers={["費用項目", "内容", "費用目安"]}
          rows={[
            ["システム構築費用", "オンライン診療システムの導入・設定", "30〜150万円"],
            ["ハードウェア", "PC・タブレット・Webカメラ・マイク", "10〜50万円"],
            ["通信環境整備", "高速回線・Wi-Fi強化・バックアップ回線", "5〜30万円"],
            ["セキュリティ対策", "SSL証明書・VPN・アクセス制御", "5〜50万円"],
            ["スタッフ研修", "操作研修・マニュアル作成", "5〜20万円"],
          ]}
        />

        <p>予約システムの選定でお悩みの方は<Link href="/lp/column/reservation-system-comparison" className="text-sky-600 underline hover:text-sky-800">予約システム比較10選</Link>も参考にしてください。</p>
        <Callout type="warning" title="注意：電子カルテとの端末共用はNG">
          電子カルテとオンライン診療を同一端末で使用すると、患者情報漏洩や不正アクセスのリスクが高まります。端末は必ず分離してください。
        </Callout>
      </section>

      {/* ── 運用費用 ── */}
      <section>
        <h2 id="running-cost" className="text-xl font-bold text-gray-800">運用時にかかる費用</h2>

        <ComparisonTable
          headers={["費用項目", "内容", "月額目安"]}
          rows={[
            ["システム月額利用料", "オンライン診療プラットフォームの月額", "1〜5万円"],
            ["決済手数料", "クレジットカード決済の手数料", "売上の3〜5%"],
            ["通信費", "インターネット回線・ビデオ通話", "1〜3万円"],
            ["マーケティング費用", "広告運用・SNS活用・LP制作", "5〜30万円"],
            ["スタッフ教育費", "新人研修・アップデート対応", "1〜5万円"],
          ]}
        />

        <BarChart
          data={[
            { label: "システム利用料", value: 50, color: "bg-sky-500" },
            { label: "決済手数料", value: 35, color: "bg-sky-400" },
            { label: "マーケティング", value: 30, color: "bg-violet-400" },
            { label: "通信費", value: 20, color: "bg-gray-400" },
            { label: "教育費", value: 15, color: "bg-gray-300" },
          ]}
          unit="千円/月"
        />
      </section>

      {/* ── 患者負担 ── */}
      <section>
        <h2 id="patient-cost" className="text-xl font-bold text-gray-800">患者側の負担</h2>
        <p>オンライン診療では「療養の給付と直接関係ないサービス等」として、患者に<strong>500〜1,000円程度</strong>のシステム利用料を請求することが認められています。</p>

        <Callout type="info" title="患者負担は初診料とは別">
          オンライン診療のシステム利用料は保険点数とは別に請求可能。通院の交通費・時間コストと比較すると、多くの患者にとってメリットがあります。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 費用削減 ── */}
      <section>
        <h2 id="cost-reduction" className="text-xl font-bold text-gray-800">費用を抑える3つのコツ</h2>

        <FlowSteps steps={[
          { title: "一気通貫型システムを導入する", desc: "予約・問診・ビデオ通話・決済・配送が一体化したシステムなら、複数ツールの月額を大幅に削減可能。Lオペ for CLINICなら1つのプラットフォームで完結。" },
          { title: "既存インフラを活用する", desc: "すでに導入しているPC・タブレット・回線をそのまま活用。新規購入は最小限に抑える。" },
          { title: "補助金・助成金を活用する", desc: "IT導入補助金やデジタル化支援事業など、活用できる補助金を確認。自治体独自の助成金もチェック。" },
        ]} />

        <ResultCard
          before="複数ツール合計 月15万円"
          after="一気通貫型 月7万円"
          metric="ツール統合で月額コストを53%削減"
          description="予約・問診・決済・配信を1つのプラットフォームに集約"
        />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="オンライン診療の費用対効果">
          <ul className="mt-1 space-y-1">
            <li>• 初期費用50〜300万円、月額3〜15万円が目安</li>
            <li>• 一気通貫型システムの選択でコストを半減できる</li>
            <li>• 患者の利便性向上→新患獲得・リピート率UPで投資回収は早い</li>
            <li>• LINE連携でオンライン診療の導線を最適化すれば、さらに効果が高まる</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、LINE上で予約・問診・<Link href="/lp/features#決済・配送" className="text-sky-600 underline hover:text-sky-800">決済・配送管理</Link>まで完結するオールインワンプラットフォーム。オンライン診療の導入コストを最小限に抑えながら、患者体験を最大化します。DX化の進め方全体については<Link href="/lp/column/clinic-dx-guide" className="text-sky-600 underline hover:text-sky-800">クリニックDX完全ガイド</Link>もご覧ください。</p>
      </section>
    
      {/* ── FAQ ── */}
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
