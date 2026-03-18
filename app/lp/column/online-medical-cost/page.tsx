import type { Metadata } from "next";
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  dateModified: self.date,
  image: `${SITE_URL}/lp/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
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
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── 全体像 ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">導入費用と運用費用の全体像</h2>
        <p>オンライン診療の費用は大きく「導入時（初期費用）」と「運用時（ランニングコスト）」に分かれます。</p>

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

        <p>Lオペ for CLINICは、LINE上で予約・問診・決済・配送管理まで完結するオールインワンプラットフォーム。オンライン診療の導入コストを最小限に抑えながら、患者体験を最大化します。</p>
      </section>
    </ArticleLayout>
  );
}
