import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[12];

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
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "クリニック予約システムに必要な機能と選定基準の整理",
  "LINE連携対応を含む10種類の予約システムの特徴・費用比較",
  "クリニック規模別のおすすめ予約システムとLINE連携の重要性",
];

const toc = [
  { id: "required-features", label: "予約システムに求められる機能" },
  { id: "comparison-criteria", label: "比較の観点" },
  { id: "tool-comparison", label: "予約システム10選の比較" },
  { id: "line-integration-impact", label: "LINE連携で変わるポイント" },
  { id: "recommendation-by-scale", label: "クリニック規模別おすすめ" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="予約システム比較" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="required-features" className="text-xl font-bold text-gray-800">クリニック予約システムに求められる機能</h2>
        <p>クリニックの予約システムは、一般的なサービス業の予約管理とは求められる機能が大きく異なります。医療特有の要件を満たしたシステムを選ぶことが、導入後の運用成功の鍵です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">必須機能</h3>

        <ComparisonTable
          headers={["機能", "概要", "重要度"]}
          rows={[
            ["複数予約枠タイプ", "時間帯予約と順番予約の両対応", "必須"],
            ["リマインド機能", "予約前日・当日の自動リマインド", "必須"],
            ["患者情報連携", "電子カルテとの連携で二重入力防止", "必須"],
            ["Web予約受付", "スマホから24時間予約可能", "必須"],
            ["キャンセル管理", "オンラインキャンセル・変更・待ち管理", "必須"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">あると便利な機能</h3>

        <ComparisonTable
          headers={["機能", "概要", "備考"]}
          rows={[
            ["LINE連携", "LINE上から予約受付・リマインド送信", "患者体験を大幅向上"],
            ["オンライン問診", "予約時に問診も完了", "待ち時間短縮"],
            ["決済連携", "デポジット徴収・オンライン決済", "無断キャンセル防止"],
            ["分析機能", "予約数推移・稼働率レポート", "経営判断に活用"],
            ["複数院管理", "分院展開向け一括管理", "中〜大規模向け"],
          ]}
        />
      </section>

      <section>
        <h2 id="comparison-criteria" className="text-xl font-bold text-gray-800">比較の観点 — 予約システム選びで重視すべき5つの軸</h2>

        <FlowSteps steps={[
          { title: "LINE連携の対応レベル", desc: "予約確認メッセージだけか、予約の完結・変更・キャンセルまでできるか差がある" },
          { title: "リマインド機能の充実度", desc: "メール・SMS・LINEなどチャネル対応と配信タイミングのカスタマイズ性" },
          { title: "キャンセル待ち管理", desc: "キャンセル発生時の自動通知+ワンタップ予約確定が理想" },
          { title: "決済連携", desc: "デポジット、オンライン診療後決済、自費診療の事前決済への対応" },
          { title: "費用体系", desc: "初期費用・月額・従量課金を確認。成長に伴うコスト増加リスクに注意" },
        ]} />
      </section>

      <section>
        <h2 id="tool-comparison" className="text-xl font-bold text-gray-800">クリニック予約システム10選の比較</h2>
        <p>クリニック向け予約システムを4つのカテゴリに分類して比較します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">カテゴリ別の比較一覧</h3>

        <ComparisonTable
          headers={["カテゴリ", "システム", "月額", "LINE連携", "特徴"]}
          rows={[
            ["クラウド型", "大手クラウド型A", "無料〜1万円", "有料プランのみ", "低コスト・多業種対応"],
            ["クラウド型", "中小向けB", "5,000円〜", "Webhook経由", "カスタマイズ性高い"],
            ["クラウド型", "医療向けC", "15,000円〜", "標準搭載（通知のみ）", "電子カルテ連携に強み"],
            ["LINE特化型", "LINE拡張A", "10,000円〜", "完全対応", "LINE上で予約完結"],
            ["LINE特化型", "医療×LINE B", "20,000円〜", "完全対応", "問診もLINEで完結"],
            ["総合型", "オールインワンA", "30,000円〜", "オプション", "カルテ・レセプト一体化"],
            ["総合型", "中規模向けB", "20,000円〜", "標準搭載", "配信・分析も統合"],
            ["総合型", "多拠点向けC", "50,000円〜", "API経由", "複数院一元管理"],
            ["専門科特化", "歯科特化A", "8,000円〜", "リマインド対応", "ユニット管理・治療計画連動"],
            ["専門科特化", "美容特化B", "15,000円〜", "フォロー配信対応", "カウンセリング二段階管理"],
          ]}
        />

        <Callout type="point" title="LINE連携レベルの差に注目">
          「LINE連携あり」と一口に言っても、通知のみ、予約確認のみ、LINE上で予約完結など対応レベルは様々です。自院がどのレベルのLINE連携を必要としているかを明確にしてから比較しましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="line-integration-impact" className="text-xl font-bold text-gray-800">LINE連携の有無で大きく変わるポイント</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">患者体験の違い</h3>

        <ResultCard before="40%" after="75%" metric="予約完了率" description="Web予約からLINE予約に切り替えることで、アプリ切替の手間が減り予約完了率が大幅向上" />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リマインドの到達率</h3>

        <BarChart
          data={[
            { label: "メールリマインド", value: 25, color: "#94a3b8" },
            { label: "SMSリマインド", value: 70, color: "#f59e0b" },
            { label: "LINEリマインド", value: 85, color: "#22c55e" },
          ]}
          unit="%"
        />

        <Callout type="success" title="LINEリマインドのコスト優位性">
          SMSは1通あたり3〜10円のコストがかかりますが、LINEは配信プラン内であれば追加コストなしで送れます。到達率が高く低コストで、無断キャンセルを大幅に削減できます。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">マーケティング連携</h3>
        <p>LINE連携のある予約システムなら、予約データと配信機能を組み合わせた高度なマーケティングが可能になります。「最終来院から3ヶ月経過した患者にリマインド」「特定の施術を受けた患者に関連施術を案内」など、予約データをトリガーにした自動配信で再診率を向上させられます。</p>
      </section>

      <section>
        <h2 id="recommendation-by-scale" className="text-xl font-bold text-gray-800">クリニック規模別おすすめ</h2>

        <ComparisonTable
          headers={["規模", "医師数", "月間予約", "おすすめ", "月額目安"]}
          rows={[
            ["開業〜小規模", "1〜2名", "〜300件", "クラウド型A / LINE特化型A", "〜1万円"],
            ["中規模", "2〜5名", "500〜1,500件", "総合型B / LINE特化型B", "2〜3万円"],
            ["大規模・複数院", "5名以上", "1,500件以上", "総合型A / 総合型C", "5万円以上"],
          ]}
        />

        <Callout type="point" title="スモールスタートで成長に合わせてアップグレード">
          開業時はシンプルなシステムから始め、患者数の増加に応じてアップグレードできる柔軟性のあるシステムを選びましょう。大規模クリニックではスタッフ人件費の削減効果（月10〜30万円）で十分に投資回収可能です。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 予約システム選びのポイント</h2>

        <StatGrid stats={[
          { value: "40→75%", label: "LINE連携で予約完了率向上" },
          { value: "80%+", label: "LINEリマインドの開封率" },
          { value: "10〜30万", unit: "円/月", label: "大規模クリニックの工数削減効果" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>LINE連携の対応レベルを確認</strong> — 通知のみか、予約完結までできるかで患者体験が大きく変わる</li>
          <li><strong>自院の規模とフェーズに合ったシステムを選ぶ</strong> — 開業時はシンプルなものから始め、成長に合わせてアップグレード</li>
          <li><strong>トータルコストで比較</strong> — 初期費用だけでなく、月額・従量課金・オプション費用も含めて検討</li>
          <li><strong>リマインド機能の充実度</strong> — 無断キャンセル削減の効果が最も投資対効果が高い</li>
          <li><strong>拡張性を見据える</strong> — 電子カルテ連携・決済連携・分院管理など、将来の拡張に対応できるか</li>
        </ol>
        <p className="mt-4">Lオペ for CLINICは、予約管理・LINE連携・問診・決済・配信をオールインワンで提供するクリニック専用プラットフォームです。予約システムの乗り換えや新規導入をご検討の方は、お気軽にご相談ください。</p>
      </section>
    </ArticleLayout>
  );
}
