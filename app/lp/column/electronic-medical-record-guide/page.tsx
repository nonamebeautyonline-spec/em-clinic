import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ComparisonTable, FlowSteps, ResultCard, BarChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "electronic-medical-record-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "クラウド型とオンプレミス型の違いと選び方",
  "LINE連携で問診→カルテの業務効率を劇的改善",
  "電子カルテ選びの5つのチェックポイント",
];

const toc = [
  { id: "types", label: "電子カルテの種類" },
  { id: "required-features", label: "必要な機能一覧" },
  { id: "line-integration", label: "LINE連携のメリット" },
  { id: "five-checkpoints", label: "5つのチェックポイント" },
  { id: "case-study", label: "導入事例" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="電子カルテ" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニック向け電子カルテは、初期費用が安く院外からもアクセスできるクラウド型が主流になりつつあります。さらにLINE連携により問診データを自動でカルテに取り込めば、業務効率が<strong>劇的に改善</strong>します。本記事では、クラウド型とオンプレミス型の比較、選定時の<strong>5つのチェックポイント</strong>、導入事例を解説します。
      </p>

      <section>
        <h2 id="types" className="text-xl font-bold text-gray-800">電子カルテの種類: クラウド型 vs オンプレミス型</h2>
        <p>クリニック向け電子カルテは大きく<strong>クラウド型</strong>と<strong>オンプレミス型</strong>の2種類に分類されます。それぞれの特徴を理解した上で、自院に最適なタイプを選ぶことが重要です。</p>

        <ComparisonTable
          headers={["比較項目", "クラウド型", "オンプレミス型"]}
          rows={[
            ["初期費用", "安い（月額制）", "高額（200〜500万円）"],
            ["サーバー管理", "不要（ベンダー側）", "必要（院内保守）"],
            ["アクセス", "どこからでも可能", "院内ネットワーク限定"],
            ["オフライン動作", "不可（回線依存）", "可能"],
            ["カスタマイズ性", "やや低い", "高い"],
            ["アップデート", "自動", "手動対応"],
          ]}
        />

        <Callout type="success" title="クリニック規模ならクラウド型がおすすめ">
          医師1〜3名のクリニック規模では、クラウド型が圧倒的にコストパフォーマンスが高いです。LINE連携やオンライン診療など外部システムとの連携を考えると、API対応が充実しているクラウド型が有利です。
        </Callout>
      </section>

      <section>
        <h2 id="required-features" className="text-xl font-bold text-gray-800">クリニック向け電子カルテに必要な機能一覧</h2>
        <p>電子カルテを選ぶ際に、クリニック運営で必要となる機能を整理しておきましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">基本機能</h3>
        <ComparisonTable
          headers={["機能", "内容", "重要度"]}
          rows={[
            ["SOAP形式の記録", "主観・客観・評価・計画の4項目で構造化", "必須"],
            ["テンプレート", "頻出する診療パターンをテンプレート化", "必須"],
            ["画像管理", "症例写真・検査画像の取り込み・紐付け", "必須"],
            ["処方箋発行", "薬剤DB連携、用量・相互作用チェック", "必須"],
            ["レセプト連携", "ORCA等のレセコンとのデータ連携", "必須"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">あると便利な機能</h3>
        <ComparisonTable
          headers={["機能", "内容", "効果"]}
          rows={[
            ["予約管理連携", "カルテと予約システムの統合", "二重入力を排除"],
            ["問診データ連携", "Web・LINE問診の回答を自動転記", "入力時間を削減"],
            ["音声入力", "音声をAIでテキスト化してカルテに反映", "診察中の記録を効率化"],
            ["患者ポータル", "患者が検査結果・処方内容を確認", "問い合わせ削減"],
            ["分析・レポート", "診療実績・売上・患者動向の可視化", "経営判断に活用"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="line-integration" className="text-xl font-bold text-gray-800">LINE連携のメリット: 問診からフォローまでシームレスに</h2>
        <p>電子カルテとLINE公式アカウントを連携させることで、<strong>患者とのコミュニケーションとカルテ記録が一つの流れ</strong>でつながります。これにより、従来は手作業だった多くの工程が自動化されます。LINE上でのオンライン診療との組み合わせについては、<Link href="/lp/column/online-medical-line" className="text-sky-600 underline hover:text-sky-800">オンライン診療×LINEの記事</Link>で詳しく解説しています。</p>

        <FlowSteps steps={[
          { title: "問診データの自動転記", desc: "LINEで回答された問診が電子カルテに自動反映。1患者あたり5〜10分の入力時間を削減" },
          { title: "予約リマインドの自動送信", desc: "カルテの予約データに基づき、来院前日にLINEで自動リマインド。無断キャンセルを大幅削減" },
          { title: "来院後フォローの自動化", desc: "来院日をトリガーに、翌日の経過確認や1週間後のフォローアップを自動送信" },
          { title: "定期検診・再診リマインド", desc: "前回来院日や治療計画に基づき、適切なタイミングでリマインドを自動送信" },
        ]} />

        <Callout type="point" title="LINE連携で実現できること">
          医師やスタッフの手を借りずに、きめ細かな術後・治療後フォローが実現します。特に慢性疾患の定期通院や美容施術のメンテナンスなど、リピート促進に直結する施策です。
        </Callout>
      </section>

      <section>
        <h2 id="five-checkpoints" className="text-xl font-bold text-gray-800">電子カルテ選びの5つのチェックポイント</h2>

        <FlowSteps steps={[
          { title: "API・外部連携の充実度", desc: "LINE連携、Web問診、予約システム、決済連携など外部APIが充実しているか確認。クローズドなシステムでは将来の拡張が困難" },
          { title: "操作性・入力速度", desc: "デモで医師・スタッフに操作してもらい、入力速度とストレスを確認。テンプレートの使いやすさ、ショートカットの充実度がポイント" },
          { title: "コスト構造の透明性", desc: "月額だけでなく、初期導入・データ移行・オプション・解約費用まで含めたトータルコスト（5年間総額）で比較" },
          { title: "サポート体制", desc: "運用開始後の電話・チャット対応時間、リモートサポートの可否、トラブル時の対応速度を確認" },
          { title: "データポータビリティ", desc: "カルテデータのエクスポート機能があるか確認。SS-MIX2等の標準形式に対応しているかが重要" },
        ]} />

        <Callout type="warning" title="ベンダーロックインに注意">
          将来のシステム移行を考慮し、標準的なデータ形式でのエクスポートに対応しているかを必ず確認しましょう。独自形式のみだと、将来の選択肢が大幅に制限されます。
        </Callout>
      </section>

      <section>
        <h2 id="case-study" className="text-xl font-bold text-gray-800">導入事例: LINE連携で問診→カルテ記入時間を半減</h2>
        <p>ある皮膚科クリニック（1日来院数50名）では、紙の問診票から電子カルテへの転記に受付スタッフ2名が1日計3時間を費やしていました。LINE問診と電子カルテの連携を導入した結果、以下の改善が実現しました。</p>

        <ResultCard before="3時間/日" after="30分/日" metric="問診→カルテ転記時間" description="83%の時間削減を達成" />

        <ResultCard before="月20時間" after="月3時間" metric="受付スタッフの残業時間" description="85%の残業削減" />

        <StatGrid stats={[
          { value: "83", unit: "%", label: "転記時間の削減" },
          { value: "85", unit: "%", label: "残業時間の削減" },
          { value: "67", unit: "%", label: "待ち時間の短縮" },
          { value: "70", unit: "%", label: "問診記載漏れの減少" },
        ]} />

        <Callout type="success" title="患者満足度も向上">
          来院後のフォローアップLINEを自動化したことで、患者満足度アンケートのスコアが4.2→4.7に向上。「丁寧なフォローをしてもらえる」という口コミも増加しました。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: LINE連携を前提に電子カルテを選ぶ時代</h2>
        <p>電子カルテ選びは「カルテ入力の効率化」だけでなく、<strong>患者コミュニケーション全体の効率化</strong>という視点が重要です。LINE連携に対応した電子カルテを選ぶことで、問診・予約・リマインド・フォローアップまで一気通貫の業務効率化が実現します。Web問診の導入についてさらに詳しく知りたい方は<Link href="/lp/column/online-questionnaire-guide" className="text-sky-600 underline hover:text-sky-800">オンライン問診導入ガイド</Link>も参考にしてください。また、クリニック全体のDX推進については<Link href="/lp/column/clinic-dx-guide" className="text-sky-600 underline hover:text-sky-800">クリニックDX完全ガイド</Link>で体系的に解説しています。</p>
        <p>Lオペ for CLINICは、LINE上の問診データをダッシュボードで一元管理し、カルテ入力時の参照に活用可能です。来院データに基づく自動フォローメッセージなど、<strong>問診データ活用とLINE運用の架け橋</strong>となるプラットフォームです。<Link href="/lp/features#予約・診察" className="text-sky-600 underline hover:text-sky-800">予約・診察カテゴリの全機能</Link>もご確認ください。</p>
      </section>
    </ArticleLayout>
  );
}
