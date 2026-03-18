import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, BarChart, FlowSteps, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[18];

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
  "運用代行と自社運用のメリット・デメリットを費用・効果の両面で比較",
  "クリニック規模別の最適な運用方法の判断基準を明確に解説",
  "初期構築は外注・運用は自社のハイブリッド方式が最もコスパの高い選択肢",
];

const toc = [
  { id: "what-is-outsource", label: "LINE運用代行とは何か" },
  { id: "outsource-pros-cons", label: "運用代行のメリット・デメリット" },
  { id: "inhouse-pros-cons", label: "自社運用のメリット・デメリット" },
  { id: "cost-comparison", label: "費用比較" },
  { id: "scale-criteria", label: "クリニック規模別の判断基準" },
  { id: "hybrid", label: "ハイブリッド運用という選択肢" },
  { id: "tool-selection", label: "自社運用を成功させるためのツール選び" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="運用代行vs自社" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="what-is-outsource" className="text-xl font-bold text-gray-800">LINE運用代行とは何か</h2>
        <p>LINE公式アカウントの運用代行とは、クリニックのLINE公式アカウントの構築・配信・分析などの業務を外部の専門業者に委託するサービスです。</p>
        <ComparisonTable
          headers={["サービス内容", "詳細"]}
          rows={[
            ["初期構築", "アカウント設定、リッチメニューデザイン、あいさつメッセージ設計"],
            ["コンテンツ制作", "配信メッセージの企画・文面作成・画像制作"],
            ["配信運用", "セグメント設計、配信スケジュール管理、A/Bテスト実施"],
            ["分析・レポーティング", "月次レポート作成、改善提案"],
            ["チャットボット構築", "自動応答シナリオの設計・実装"],
          ]}
        />
        <Callout type="warning" title="注意点">
          <p>多くの運用代行業者はLステップやLinyなどの汎用LINE拡張ツールを利用しており、クリニック特化の知識を持つ業者は限られているのが現状です。</p>
        </Callout>
      </section>

      <section>
        <h2 id="outsource-pros-cons" className="text-xl font-bold text-gray-800">運用代行のメリット・デメリット</h2>
        <ComparisonTable
          headers={["観点", "メリット", "デメリット"]}
          rows={[
            ["専門性", "プロに任せられる", "医療知識が不足しがち"],
            ["コスト", "—", "月額10〜30万円（年間120〜360万円）"],
            ["スピード", "—", "急な変更に1〜2営業日のラグ"],
            ["スタッフ負担", "本来業務に集中できる", "—"],
            ["クオリティ", "プロのデザイン・コピー", "患者対応の温度差"],
            ["ノウハウ", "分析に基づく改善提案", "契約終了時にノウハウが残らない"],
          ]}
        />
      </section>

      <section>
        <h2 id="inhouse-pros-cons" className="text-xl font-bold text-gray-800">自社運用のメリット・デメリット</h2>
        <ComparisonTable
          headers={["観点", "メリット", "デメリット"]}
          rows={[
            ["コスト", "ツール費用のみ（月額数万円〜）", "—"],
            ["スピード", "急な配信を即時実行可能", "—"],
            ["患者理解", "現場スタッフが直接配信", "—"],
            ["ノウハウ", "社内に蓄積される", "属人化リスク"],
            ["学習コスト", "—", "操作方法・マーケ手法の習得が必要"],
            ["デザイン", "—", "専門デザイナー不在だと品質低下"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="cost-comparison" className="text-xl font-bold text-gray-800">費用比較 — 運用代行 vs 自社運用</h2>
        <p>コスト面での比較は、運用方法を選択する上で最も重要な判断材料のひとつです。</p>
        <BarChart data={[
          { label: "運用代行（年間）", value: 410, color: "#ef4444" },
          { label: "ハイブリッド（年間）", value: 130, color: "#f59e0b" },
          { label: "自社運用（年間）", value: 120, color: "#22c55e" },
        ]} unit="万円" />
        <ComparisonTable
          headers={["費用項目", "運用代行", "自社運用"]}
          rows={[
            ["初期構築費", "20〜50万円", "ツール費に含む"],
            ["月額費用", "10〜30万円", "数万円〜"],
            ["年間コスト合計", "140〜410万円", "60〜120万円"],
          ]}
        />
        <ResultCard before="運用代行で年間410万円" after="自社運用で年間120万円" metric="年間 80〜290万円 のコスト削減" description="コスト差を他の設備投資やマーケティング施策に回せる" />
      </section>

      <section>
        <h2 id="scale-criteria" className="text-xl font-bold text-gray-800">クリニック規模別の判断基準</h2>
        <p>運用代行と自社運用のどちらが最適かは、クリニックの規模やリソースによって異なります。</p>
        <ComparisonTable
          headers={["クリニック規模", "推奨方式", "理由"]}
          rows={[
            ["小規模（医師1〜2名、スタッフ5名以下）", "自社運用", "月額費用が経営を圧迫。受付スタッフ1名で十分に運用可能"],
            ["中規模（医師3〜5名、スタッフ10〜20名）", "ハイブリッド運用", "初期構築は外部委託、日常運用は自社で最も効率的"],
            ["大規模・医療法人（複数院展開）", "自社運用+専任担当者", "マーケ専任1名配置で全院を一元管理が理想"],
          ]}
        />
      </section>

      <section>
        <h2 id="hybrid" className="text-xl font-bold text-gray-800">ハイブリッド運用という選択肢 — 初期構築は外注、運用は自社</h2>
        <Callout type="success" title="最もコスパの高い選択肢">
          <p>初期構築のクオリティはプロに任せつつ、日常運用は自社でコストを抑える。限られた予算で最大の効果を出すための現実的な選択肢です。</p>
        </Callout>
        <FlowSteps steps={[
          { title: "初期構築フェーズ（1〜2ヶ月）", desc: "外部パートナーにアカウント設計・リッチメニュー・あいさつメッセージ・基本シナリオの構築を依頼" },
          { title: "トレーニングフェーズ（2〜4週間）", desc: "外部パートナーから自社スタッフへの操作トレーニング、運用マニュアルの作成" },
          { title: "自社運用フェーズ", desc: "日常の配信・患者対応を自社スタッフが担当。必要に応じて外部にスポットコンサルを依頼" },
        ]} />
        <StatGrid stats={[
          { value: "10〜30", unit: "万円", label: "初期構築費（一度きり）" },
          { value: "数万", unit: "円/月", label: "月額ツール費" },
          { value: "70〜130", unit: "万円/年", label: "年間コスト合計" },
        ]} />
      </section>

      <section>
        <h2 id="tool-selection" className="text-xl font-bold text-gray-800">自社運用を成功させるためのツール選び</h2>
        <p>自社運用の成否は、<strong>使用するツールの選択</strong>に大きく左右されます。</p>
        <h3 className="text-lg font-semibold text-gray-700 mt-4">ツール選びの5つのチェックポイント</h3>
        <FlowSteps steps={[
          { title: "クリニック業務に特化", desc: "予約管理・問診・カルテ連携など医療特有の機能が標準搭載されているか" },
          { title: "直感的な操作性", desc: "ITに詳しくないスタッフでも迷わず使えるUI/UXか" },
          { title: "セグメント配信の容易さ", desc: "患者の属性・来院履歴に基づいた配信が設定しやすいか" },
          { title: "充実したサポート体制", desc: "導入時のトレーニングや運用中の問い合わせ対応が手厚いか" },
          { title: "費用対効果", desc: "月額費用に対して、得られる機能・効果が十分か" },
        ]} />
        <ComparisonTable
          headers={["比較項目", "汎用ツール", "クリニック専用ツール"]}
          rows={[
            ["機能範囲", "幅広いが汎用的", "医療業務フローに最適化"],
            ["カスタマイズ", "専門知識が必要", "導入直後から活用可能"],
            ["テンプレート", "汎用テンプレート", "医療専用テンプレート完備"],
            ["学習コスト", "高い", "低い"],
          ]}
        />
        <Callout type="warning" title="自社運用で挫折する最大の原因">
          <p>「ツールの操作が難しくて続かない」こと。だからこそ、クリニックのスタッフが無理なく使えるツールを選ぶことが、自社運用成功の最大のポイントです。</p>
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 大半のクリニックには自社運用が最適解</h2>
        <StatGrid stats={[
          { value: "80〜290", unit: "万円/年", label: "運用代行とのコスト差" },
          { value: "即時", unit: "", label: "急な配信変更の対応速度" },
          { value: "半額以下", unit: "", label: "ハイブリッド方式の年間コスト" },
        ]} />
        <p className="mt-4">Lオペ for CLINICは、クリニックの自社運用を前提に設計されたLINE運用プラットフォームです。直感的な操作性と充実したテンプレートで、ITに詳しくないスタッフでもすぐに運用を開始できます。初期構築サポートからトレーニングまで、自社運用の立ち上げを伴走いたします。</p>
      </section>
    </ArticleLayout>
  );
}
