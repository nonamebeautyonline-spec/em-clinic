import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-crm-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE CRMとは何ですか？", a: "LINE上の顧客データ（友だち追加日・トーク履歴・行動ログ）とECの購買データ（注文履歴・購入金額・商品カテゴリ）を統合し、パーソナライズされたコミュニケーションを実現する仕組みです。" },
  { q: "D2CブランドにLINE CRMが向いている理由は？", a: "D2Cは顧客との直接的な関係構築がビジネスの核です。LINEは顧客とのダイレクトなコミュニケーションチャネルであり、購買データと組み合わせることで、1人1人に合わせた関係性を構築できます。" },
  { q: "LINE CRMの導入にどのくらいの期間がかかりますか？", a: "基本的なデータ連携とセグメント設計は2〜4週間で導入可能です。顧客ランク制度やパーソナライズ配信の最適化には2〜3ヶ月の運用が必要ですが、カゴ落ちリマインドなどの基本施策は初日から効果を発揮します。" },
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
  "D2CブランドのLINE×CRM戦略の全体像と設計方法",
  "購買データ統合による顧客LTV最大化の具体的手法",
  "顧客ランク制度とパーソナライズ配信の構築ステップ",
];

const toc = [
  { id: "why-crm", label: "D2CにCRMが必要な理由" },
  { id: "data-integration", label: "LINE×購買データの統合" },
  { id: "customer-segments", label: "顧客セグメント設計" },
  { id: "personalization", label: "パーソナライズ配信の実践" },
  { id: "rank-system", label: "顧客ランク制度の構築" },
  { id: "ltv-optimization", label: "LTV最大化の施策" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE CRM戦略" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">D2Cブランドの成長は「新規獲得」から「顧客LTVの最大化」にシフトしています。LINE×CRMで購買データと顧客コミュニケーションを統合することで、LTVを<strong>最大3倍</strong>に引き上げた事例を交えながら、その戦略の全体像を解説します。</p>

      <section>
        <h2 id="why-crm" className="text-xl font-bold text-gray-800">D2CにCRMが必要な理由</h2>

        <StatGrid stats={[
          { value: "5", unit: "倍", label: "新規獲得 vs 既存維持のコスト差" },
          { value: "25〜95%", label: "リテンション5%向上で利益25〜95%増" },
          { value: "67%", label: "リピーターの購入金額は新規の1.7倍" },
        ]} />

        <p>D2Cブランドが直面する最大の課題は、広告費の高騰による新規獲得コスト（CAC）の上昇です。CACが上がり続ける中、既存顧客のLTVを最大化することが利益の源泉となります。</p>

        <Callout type="point" title="LINEがD2C CRMの最適チャネルである理由">
          LINEは開封率60〜80%の到達力と、1:1のパーソナルコミュニケーションに適したチャネルの一つです。メールCRMでは届かない層にもリーチでき、購買データとの統合により真のパーソナライズを実現できます。
        </Callout>
      </section>

      <section>
        <h2 id="data-integration" className="text-xl font-bold text-gray-800">LINE×購買データの統合</h2>

        <ComparisonTable
          headers={["データソース", "取得データ", "活用方法"]}
          rows={[
            ["ECカート", "注文履歴・カート・商品閲覧", "購買セグメント・リマインド配信"],
            ["LINE", "友だち追加日・トーク・開封率", "エンゲージメントスコア"],
            ["決済", "購入金額・頻度・決済方法", "RFM分析・顧客ランク"],
            ["配送", "配達状況・返品履歴", "CS品質・顧客満足度"],
          ]}
        />

        <FlowSteps steps={[
          { title: "ECカートとLINEのID連携", desc: "購入時にLINE IDとECの顧客IDを紐づけ。友だち追加→購入→LINE通知の一気通貫を実現" },
          { title: "購買データの自動同期", desc: "注文・配送・レビューのデータをリアルタイムでCRMに同期" },
          { title: "セグメントの自動更新", desc: "購買行動に応じてセグメントが自動更新。手動管理不要" },
        ]} />
      </section>

      <section>
        <h2 id="customer-segments" className="text-xl font-bold text-gray-800">顧客セグメント設計</h2>

        <ComparisonTable
          headers={["セグメント", "定義", "構成比", "戦略"]}
          rows={[
            ["ロイヤル顧客", "購入5回以上 & 累計5万円以上", "5〜10%", "VIP施策・アンバサダー"],
            ["成長顧客", "購入2〜4回 & 直近90日以内購入", "15〜20%", "ランクアップ促進"],
            ["新規顧客", "初回購入のみ", "35〜40%", "F2転換施策"],
            ["休眠予備軍", "直近60〜90日購入なし", "15〜20%", "再アクティベーション"],
            ["休眠顧客", "90日以上購入なし", "15〜25%", "復帰キャンペーン"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="personalization" className="text-xl font-bold text-gray-800">パーソナライズ配信の実践</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>購入カテゴリベース</strong> — 過去に購入したカテゴリの新商品・関連商品を優先的に配信</li>
          <li><strong>購買サイクルベース</strong> — 個人の購買間隔に合わせたリマインド配信</li>
          <li><strong>行動ベース</strong> — 商品ページ閲覧→未購入の場合、閲覧商品の情報を配信</li>
          <li><strong>ランクベース</strong> — 顧客ランクに応じたメッセージトーンと特典内容の変更</li>
        </ul>

        <ResultCard before="一斉配信（CV率0.8%）" after="パーソナライズ配信（CV率3.2%）" metric="配信あたりCV率" description="パーソナライズで4倍のCV率を実現" />
      </section>

      <section>
        <h2 id="rank-system" className="text-xl font-bold text-gray-800">顧客ランク制度の構築</h2>

        <ComparisonTable
          headers={["ランク", "条件", "特典"]}
          rows={[
            ["プラチナ", "年間10万円以上", "先行セール・限定品・専用CS"],
            ["ゴールド", "年間5〜10万円", "10%OFFクーポン・誕生日特典"],
            ["シルバー", "年間2〜5万円", "5%OFFクーポン・ポイント2倍"],
            ["ブロンズ", "初回購入〜年間2万円", "3%OFFクーポン"],
          ]}
        />

        <p>ランク制度の詳しい設計方法は<Link href="/ec/column/ec-customer-rank-line-notification" className="text-blue-600 underline">顧客ランク制度の設計とLINE連携</Link>で解説しています。</p>
      </section>

      <section>
        <h2 id="ltv-optimization" className="text-xl font-bold text-gray-800">LTV最大化の施策</h2>

        <StatGrid stats={[
          { value: "3", unit: "倍", label: "LINE CRM導入後のLTV向上" },
          { value: "42%", label: "F2転換率の改善値" },
          { value: "2.3", unit: "倍", label: "リピート購入率の向上" },
        ]} />

        <FlowSteps steps={[
          { title: "F2転換の徹底", desc: "初回購入者の2回目購入率を最大化。シナリオ配信で42%のF2転換を実現" },
          { title: "クロスセル・アップセル", desc: "購入商品に基づく関連提案。客単価を15〜25%向上" },
          { title: "顧客ランクの可視化", desc: "ランクアップまでの差額を通知し、購入モチベーションを向上" },
          { title: "休眠顧客の復帰", desc: "段階的な復帰シナリオで休眠からの復帰率12%を実現" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>D2Cの成長はLTV最大化にかかっている</strong> — CACが上昇する中、既存顧客の価値を最大化することが利益の源泉</li>
          <li><strong>LINE×購買データの統合が基盤</strong> — ECカート・LINE・決済データを一元管理</li>
          <li><strong>5セグメントに分類して施策を設計</strong> — RFM分析の活用は<Link href="/ec/column/ec-rfm-analysis-line-segment" className="text-blue-600 underline">RFM分析×LINEセグメント配信</Link>で解説</li>
          <li><strong>パーソナライズ配信でCV率4倍</strong> — 休眠復帰は<Link href="/ec/column/ec-dormant-customer-reactivation-line" className="text-blue-600 underline">休眠顧客復帰シナリオ</Link>も参照</li>
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
