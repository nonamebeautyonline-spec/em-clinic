import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  BarChart,
  StatGrid,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-step-delivery-design")!;

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
  dateModified: self.updatedDate || self.date,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "初診後7日→30日→90日の3段階フォローシナリオの設計方法",
  "診療科別（自費・オンライン診療・保険）のステップ配信テンプレート",
  "離脱防止シナリオで再診率を向上させるテクニック",
  "Lオペのフロービルダーを使ったノーコード配信設計",
];

const toc = [
  { id: "what-is-step", label: "ステップ配信とは" },
  { id: "basic-scenario", label: "基本の3段階フォローシナリオ" },
  { id: "by-department", label: "診療科別ステップ配信例" },
  { id: "online-followup", label: "オンライン診療後のフォロー配信" },
  { id: "churn-prevention", label: "離脱防止シナリオの設計" },
  { id: "flow-builder", label: "フロービルダーで配信を自動化" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINEのステップ配信は、あらかじめ設定したシナリオに沿って患者に自動でメッセージを届ける仕組みです。初診後のフォローアップから定期来院の促進まで、<strong>手動では実現が難しい「一人ひとりに合わせた継続フォロー」</strong>をLINE上で自動化できます。本記事では、クリニックの診療科や患者属性に合わせたステップ配信の設計方法を解説します。
      </p>

      {/* ── ステップ配信とは ── */}
      <section>
        <h2 id="what-is-step" className="text-xl font-bold text-gray-800">ステップ配信とは</h2>
        <p>ステップ配信とは、特定のトリガー（友だち追加・来院・予約完了など）を起点として、あらかじめ設定したタイミングと内容でメッセージを自動送信する仕組みです。一般的なEC・マーケティング業界で広く使われていますが、クリニック領域でも再診促進や処方フォローに高い効果が期待できます。</p>

        <StatGrid stats={[
          { value: "3.2", unit: "倍", label: "再診予約率（手動比）" },
          { value: "78", unit: "%", label: "ステップ配信の開封率" },
          { value: "65", unit: "%", label: "離脱防止に効果を実感" },
          { value: "15", unit: "時間/月", label: "配信業務の削減時間" },
        ]} />

        <p>一斉配信と異なり、ステップ配信は患者ごとの「起点日」に基づいて個別にメッセージが送信されるため、タイミングの合ったフォローが可能です。<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信によるリピート率向上</Link>と組み合わせることで、さらに効果を高められます。</p>
      </section>

      {/* ── 基本の3段階フォローシナリオ ── */}
      <section>
        <h2 id="basic-scenario" className="text-xl font-bold text-gray-800">基本の3段階フォローシナリオ</h2>
        <p>クリニックのステップ配信で最も汎用的なのが、初診後の3段階フォローシナリオです。来院日を起点に、7日後・30日後・90日後の3回にわたって患者にメッセージを届けます。</p>

        <FlowSteps steps={[
          { title: "7日後：経過確認＋満足度ヒアリング", desc: "治療後の経過を確認するメッセージを送信。体調変化や副作用の有無をヒアリングし、不安がある場合はLINE上で相談を促します。NPS調査のリンクを添付して、フィードバック収集も同時に行えます。" },
          { title: "30日後：再診リマインド＋情報提供", desc: "次回来院のタイミングを案内するメッセージを送信。症状に合わせた生活習慣のアドバイスや、季節性の健康情報を添えて開封率を高めます。予約リンクをワンタップで開ける形式にします。" },
          { title: "90日後：定期来院促進＋キャンペーン案内", desc: "長期未来院の患者に再来院を促すメッセージを送信。定期検診の案内や、期間限定の検査メニューなどを案内して来院動機を作ります。" },
        ]} />

        <BarChart data={[
          { label: "7日後配信", value: 82, color: "#3b82f6" },
          { label: "30日後配信", value: 68, color: "#6366f1" },
          { label: "90日後配信", value: 45, color: "#8b5cf6" },
        ]} unit="% 開封率" />

        <Callout type="info" title="配信タイミングの目安">
          上記は一般的なクリニック向けの基本シナリオです。診療科や治療内容によってタイミングは調整が必要です。たとえば処方薬が30日分の場合は、25日後に「お薬の残りは大丈夫ですか？」とリマインドを送ると再診率の向上が期待できます。
        </Callout>
      </section>

      {/* ── 診療科別ステップ配信例 ── */}
      <section>
        <h2 id="by-department" className="text-xl font-bold text-gray-800">診療科別ステップ配信例</h2>

        <h3 className="text-lg font-bold text-gray-800 mt-6">自費診療（美容・AGA・ダイエット等）</h3>
        <p>自費診療では、治療効果の実感までに時間がかかるケースが多いため、モチベーション維持を目的としたステップ配信が有効です。</p>
        <FlowSteps steps={[
          { title: "3日後：施術後のケア方法", desc: "施術直後の注意事項やスキンケア方法を案内。写真付きで具体的な手順を伝えると開封率が向上します。" },
          { title: "14日後：経過確認＋症例紹介", desc: "効果の実感タイミングに合わせて経過を確認。同じ施術を受けた方の経過例（匿名・許可取得済み）を紹介して安心感を与えます。" },
          { title: "60日後：次回施術の案内", desc: "効果を維持するための次回施術時期を案内。リピート割引などの特典を添えると予約率が向上します。" },
        ]} />

        <h3 className="text-lg font-bold text-gray-800 mt-6">保険診療（内科・整形外科等）</h3>
        <p>保険診療では服薬コンプライアンスの維持と定期検査の受診促進が主な目的です。</p>
        <FlowSteps steps={[
          { title: "翌日：処方薬の服用開始確認", desc: "処方薬の飲み方や注意事項を改めてLINEで案内。薬局で聞き逃した疑問にも回答できるようにします。" },
          { title: "14日後：服薬状況の確認", desc: "お薬を継続できているかを確認。副作用や飲み忘れに関する対処法を案内します。" },
          { title: "28日後：再診予約の促進", desc: "処方薬の残量タイミングに合わせて再診を案内。予約リンクを添付してワンタップ予約を促します。" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── オンライン診療後のフォロー配信 ── */}
      <section>
        <h2 id="online-followup" className="text-xl font-bold text-gray-800">オンライン診療後のフォロー配信</h2>
        <p>オンライン診療は対面に比べて患者との接点が希薄になりやすいため、ステップ配信によるフォローアップが特に重要です。服薬フォローや処方薬リマインドをLINEで自動化することで、遠隔でも手厚いケアを実現できます。</p>

        <FlowSteps steps={[
          { title: "配送完了時：服薬開始の案内", desc: "処方薬が届いたタイミングで服薬方法をLINEで案内。動画や画像を使った分かりやすい説明で、オンライン特有の「対面説明がない不安」を解消します。" },
          { title: "7日後：副作用チェック", desc: "服薬開始から1週間のタイミングで副作用の有無を確認。不調がある場合はLINEから再診予約へ誘導し、オンライン診療で迅速に対応します。" },
          { title: "25日後：処方薬リマインド", desc: "30日分の処方薬が残り少なくなるタイミングで再処方を案内。LINE上からワンタップでオンライン再診を予約できるようにして、離脱を防止します。" },
        ]} />

        <ResultCard
          before="オンライン再診率 38%"
          after="オンライン再診率 61%"
          metric="ステップ配信導入で再診率23ポイント向上"
          description="処方薬リマインドの自動化が特に効果的"
        />

        <Callout type="success" title="オンライン診療との相性">
          オンライン診療はLINE上で完結する患者導線と親和性が高いため、ステップ配信の開封率・反応率ともに対面診療よりも高い傾向があります。Lオペではオンライン診療後の配送ステータスと連動したステップ配信も設定可能です。
        </Callout>
      </section>

      {/* ── 離脱防止シナリオ ── */}
      <section>
        <h2 id="churn-prevention" className="text-xl font-bold text-gray-800">離脱防止シナリオの設計</h2>
        <p>治療途中で来院が途切れてしまう「離脱」は、クリニックの売上にも患者の健康にも大きな影響を与えます。ステップ配信を活用した離脱防止シナリオで、適切なタイミングで患者に声をかけましょう。</p>

        <BarChart data={[
          { label: "離脱率（対策なし）", value: 42, color: "#ef4444" },
          { label: "離脱率（リマインドのみ）", value: 28, color: "#f59e0b" },
          { label: "離脱率（ステップ配信）", value: 15, color: "#22c55e" },
        ]} unit="%" />

        <p>離脱防止シナリオのポイントは、<strong>「なぜ来院が必要か」を患者目線で伝える</strong>ことです。単なる予約案内ではなく、治療を中断した場合のリスクや、継続することで期待できる効果を具体的に伝えることで、患者自身が来院の意思決定をしやすくなります。<Link href="/lp/column/clinic-patient-retention" className="text-sky-600 underline hover:text-sky-800">患者リテンション戦略の記事</Link>でも詳しく解説しています。</p>

        <Callout type="warning" title="配信頻度に注意">
          離脱防止メッセージの送信は月2回程度が適切です。頻度が高すぎるとブロック率が上昇し、逆効果になるリスクがあります。Lオペのセグメント配信機能でブロック率をモニタリングしながら、配信頻度を調整することが大切です。
        </Callout>
      </section>

      {/* ── フロービルダー ── */}
      <section>
        <h2 id="flow-builder" className="text-xl font-bold text-gray-800">フロービルダーで配信を自動化</h2>
        <p>Lオペのフロービルダーは、ステップ配信のシナリオをノーコードで設計できる機能です。ドラッグ＆ドロップの直感的な操作で、複雑な分岐シナリオも簡単に構築できます。</p>

        <StatGrid stats={[
          { value: "5", unit: "分", label: "シナリオ作成時間" },
          { value: "0", unit: "行", label: "必要なコード" },
          { value: "10", unit: "種類+", label: "分岐条件パターン" },
          { value: "A/B", unit: "対応", label: "テスト機能" },
        ]} />

        <p>フロービルダーでは以下のような分岐条件を設定できます。</p>
        <ul className="space-y-2 text-gray-700">
          <li><strong>タグ条件</strong>：患者に付与されたタグ（診療科目・治療内容・属性等）に応じてメッセージを出し分け</li>
          <li><strong>反応条件</strong>：前回のメッセージを開封したか、リンクをクリックしたかで次のアクションを変更</li>
          <li><strong>期間条件</strong>：最終来院日からの経過日数に応じて配信内容を自動切替</li>
          <li><strong>A/Bテスト</strong>：2パターンのメッセージを自動で振り分けて効果を比較</li>
        </ul>

        <p><Link href="/lp/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化ガイド</Link>と合わせて活用することで、配信業務のほぼ全てを自動化できます。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <p>LINEステップ配信は、クリニックの患者フォローを自動化し、再診率の向上と離脱防止を同時に実現する強力な手法です。初診後の3段階フォローを基本に、診療科やオンライン診療の特性に合わせたシナリオを設計することで、手動では不可能だった個別最適なフォローが可能になります。</p>

        <Callout type="point" title="ステップ配信設計の3つのポイント">
          <ul className="space-y-1 text-gray-700">
            <li>起点と配信間隔は「患者行動のタイミング」に合わせる（処方日数・治療サイクル等）</li>
            <li>メッセージ内容は「なぜ来院が必要か」を患者目線で伝える</li>
            <li>A/Bテストで開封率・予約率を継続的に改善する</li>
          </ul>
        </Callout>

        <p>Lオペのフロービルダーとステップ配信機能を活用すれば、ノーコードでこれらのシナリオを構築・運用できます。まずは基本の3段階フォローシナリオから始めて、効果を見ながら段階的にシナリオを拡充していきましょう。</p>
      </section>
    </ArticleLayout>
  );
}
