import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[6];

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="types" className="text-xl font-bold text-slate-800">電子カルテの種類: クラウド型 vs オンプレミス型</h2>
        <p>クリニック向け電子カルテは大きく<strong>クラウド型</strong>と<strong>オンプレミス型</strong>の2種類に分類されます。それぞれの特徴を理解した上で、自院に最適なタイプを選ぶことが重要です。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">クラウド型電子カルテ</h3>
        <p>インターネット経由でサーバーに接続し、ブラウザやアプリからカルテを操作するタイプです。近年のクリニック開業では主流になりつつあります。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>メリット</strong>: 初期費用が安い（月額制）、サーバー管理不要、どこからでもアクセス可能、自動アップデート</li>
          <li><strong>デメリット</strong>: インターネット回線に依存、月額コストが継続的に発生、カスタマイズ性がやや低い</li>
          <li><strong>代表例</strong>: CLINICSカルテ、メドレー、カルテZERO</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">オンプレミス型電子カルテ</h3>
        <p>院内にサーバーを設置し、院内ネットワークで動作するタイプです。大規模病院から中小クリニックまで長年の実績があります。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>メリット</strong>: オフラインでも動作、高いカスタマイズ性、データが院内に保管される安心感</li>
          <li><strong>デメリット</strong>: 初期費用が高額（200〜500万円）、サーバー保守が必要、院外からのアクセスに制限</li>
          <li><strong>代表例</strong>: ダイナミクス、HOPE LifeMark-SX</li>
        </ul>

        <p className="mt-4"><strong>結論として、クリニック規模（医師1〜3名）ではクラウド型が圧倒的にコストパフォーマンスが高い</strong>です。特にLINE連携やオンライン診療など外部システムとの連携を考えると、API対応が充実しているクラウド型が有利です。</p>
      </section>

      <section>
        <h2 id="required-features" className="text-xl font-bold text-slate-800">クリニック向け電子カルテに必要な機能一覧</h2>
        <p>電子カルテを選ぶ際に、クリニック運営で必要となる機能を整理しておきましょう。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">基本機能</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>SOAP形式のカルテ記録</strong>: Subjective（主観）・Objective（客観）・Assessment（評価）・Plan（計画）の4項目で構造化記録</li>
          <li><strong>テンプレート機能</strong>: 頻出する診療パターンをテンプレート化し、入力時間を短縮</li>
          <li><strong>画像管理</strong>: 症例写真・検査画像の取り込み・カルテへの紐付け</li>
          <li><strong>処方箋発行</strong>: 薬剤データベースとの連携、用量チェック、相互作用チェック</li>
          <li><strong>レセプト連携</strong>: ORCA等のレセコンとのデータ連携</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">あると便利な機能</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>予約管理連携</strong>: カルテと予約システムの統合で二重入力を排除</li>
          <li><strong>問診データ連携</strong>: Web問診やLINE問診の回答をカルテに自動転記</li>
          <li><strong>音声入力</strong>: 診察中の音声をAIでテキスト化してカルテに反映</li>
          <li><strong>患者ポータル</strong>: 患者自身が検査結果や処方内容を確認できる機能</li>
          <li><strong>分析・レポート</strong>: 診療実績・売上・患者動向の可視化</li>
        </ul>
      </section>

      <InlineCTA />

      <section>
        <h2 id="line-integration" className="text-xl font-bold text-slate-800">LINE連携のメリット: 問診からフォローまでシームレスに</h2>
        <p>電子カルテとLINE公式アカウントを連携させることで、<strong>患者とのコミュニケーションとカルテ記録が一つの流れ</strong>でつながります。これにより、従来は手作業だった多くの工程が自動化されます。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">問診データの自動転記</h3>
        <p>LINEで事前に回答された問診データが、そのまま電子カルテの該当フィールドに自動で反映されます。受付スタッフが紙の問診票を見ながらPCに入力する作業がゼロになり、<strong>1患者あたり5〜10分の入力時間を削減</strong>できます。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">予約リマインドの自動送信</h3>
        <p>電子カルテの予約データに基づき、来院前日にLINEで自動リマインドを送信。無断キャンセルの大幅削減につながります。リマインドメッセージには予約日時・持ち物・注意事項を含められるため、患者の来院準備もスムーズになります。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">来院後フォローの自動化</h3>
        <p>来院日をトリガーに、翌日の経過確認メッセージや1週間後のフォローアップメッセージをLINEで自動送信。<strong>医師やスタッフの手を借りずに、きめ細かな術後・治療後フォロー</strong>が実現します。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">定期検診・再診のリマインド</h3>
        <p>前回来院日や治療計画に基づき、適切なタイミングでLINEリマインドを自動送信。特に慢性疾患の定期通院や美容施術のメンテナンスなど、<strong>リピート促進に直結する施策</strong>です。</p>
      </section>

      <section>
        <h2 id="five-checkpoints" className="text-xl font-bold text-slate-800">電子カルテ選びの5つのチェックポイント</h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>API・外部連携の充実度</strong>
            <p>LINE連携、Web問診連携、予約システム連携、決済連携など、外部システムとのAPI連携が充実しているかを確認。クローズドなシステムでは将来の拡張が困難です。</p>
          </li>
          <li>
            <strong>操作性・入力速度</strong>
            <p>実際のデモで医師・スタッフに操作してもらい、カルテ入力の速度とストレスを確認。テンプレートの使いやすさ、マウス操作の少なさ、キーボードショートカットの充実度がポイントです。</p>
          </li>
          <li>
            <strong>コスト構造の透明性</strong>
            <p>月額費用だけでなく、初期導入費用・データ移行費用・オプション費用・解約費用まで含めた<strong>トータルコスト</strong>を比較しましょう。5年間の総費用で比較するのが賢明です。</p>
          </li>
          <li>
            <strong>サポート体制</strong>
            <p>導入時のサポートだけでなく、運用開始後のサポート体制も重要です。電話・チャットの対応時間、リモートサポートの可否、トラブル時の対応速度を確認しましょう。</p>
          </li>
          <li>
            <strong>データポータビリティ</strong>
            <p>将来のシステム移行を考慮し、カルテデータのエクスポート機能があるかを確認。ベンダーロックインを避けるため、<strong>標準的なデータ形式（SS-MIX2等）でのエクスポートに対応しているか</strong>が重要です。</p>
          </li>
        </ol>
      </section>

      <section>
        <h2 id="case-study" className="text-xl font-bold text-slate-800">導入事例: LINE連携で問診→カルテ記入時間を半減</h2>
        <p>ある皮膚科クリニック（1日来院数50名）では、紙の問診票から電子カルテへの転記に受付スタッフ2名が1日計3時間を費やしていました。</p>
        <p>LINE問診と電子カルテの連携を導入した結果、以下の改善が実現しました。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>問診→カルテ転記時間</strong>: 1日3時間 → 30分（83%削減）</li>
          <li><strong>受付スタッフの残業</strong>: 月平均20時間 → 3時間</li>
          <li><strong>患者の待ち時間</strong>: 平均15分 → 5分（事前問診済みの場合）</li>
          <li><strong>問診の回答精度</strong>: 自宅でゆっくり回答できるため、記載漏れが70%減少</li>
        </ul>
        <p>さらに、来院後のフォローアップLINEを自動化したことで、<strong>患者満足度アンケートのスコアが4.2→4.7に向上</strong>。「丁寧なフォローをしてもらえる」という口コミも増加しました。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: LINE連携を前提に電子カルテを選ぶ時代</h2>
        <p>電子カルテ選びは「カルテ入力の効率化」だけでなく、<strong>患者コミュニケーション全体の効率化</strong>という視点が重要です。LINE連携に対応した電子カルテを選ぶことで、問診・予約・リマインド・フォローアップまで一気通貫の業務効率化が実現します。</p>
        <p>Lオペ for CLINICは、主要なクラウド型電子カルテとの連携に対応。LINE上での問診データをカルテに自動転記する機能や、来院データに基づく自動フォローメッセージなど、<strong>電子カルテとLINEの架け橋</strong>となるプラットフォームです。</p>
      </section>
    </ArticleLayout>
  );
}
