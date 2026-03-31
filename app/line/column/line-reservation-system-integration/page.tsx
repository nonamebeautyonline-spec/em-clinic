import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-reservation-system-integration")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE予約システムの導入費用はどのくらいですか？", a: "LINE公式アカウントの標準予約機能は無料で利用できます。外部予約システムとの連携は月額3,000〜30,000円程度の費用がかかります。API開発による独自構築の場合は初期費用50万〜150万円が目安です。" },
  { q: "既存の予約システムとLINEは連携できますか？", a: "多くの予約システム（リザービア、サロンボード、STORES予約等）はLINE連携機能を提供しています。API対応のシステムであればLステップ等の拡張ツール経由で連携も可能です。まずは既存システムのLINE連携オプションを確認してください。" },
  { q: "電話予約からLINE予約への移行はスムーズにできますか？", a: "段階的な移行がおすすめです。まずはLINE予約を電話と併用で導入し、LINE予約の利便性を体験してもらいます。3〜6ヶ月でLINE予約比率が50%を超えるケースが多く、電話対応の負荷が大幅に軽減されます。" },
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
  "LINE連携予約システムの種類と選び方のポイント",
  "予約率を2倍にするUI設計とリマインド配信の設計",
  "導入から運用開始までのステップと電話予約からの移行方法",
];

const toc = [
  { id: "why-line-reservation", label: "LINE予約が選ばれる理由" },
  { id: "system-types", label: "予約システムの種類" },
  { id: "selection-criteria", label: "システム選定の5基準" },
  { id: "ui-design", label: "予約率を上げるUI設計" },
  { id: "reminder", label: "リマインド配信の設計" },
  { id: "implementation", label: "導入ステップ" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="予約システム導入" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE上で予約が完結する仕組みを構築すると、<strong>予約率が平均2倍</strong>に向上します。ユーザーはアプリを切り替えることなく、トーク画面から数タップで予約を完了。本記事では、LINE連携予約システムの選び方から、予約率を最大化するUI設計、リマインド配信の設計まで実践的に解説します。</p>

      <section>
        <h2 id="why-line-reservation" className="text-xl font-bold text-gray-800">LINE予約が選ばれる理由</h2>

        <StatGrid stats={[
          { value: "2倍", label: "Web予約比の予約完了率" },
          { value: "80%減", label: "無断キャンセル率の低減" },
          { value: "70%減", label: "電話対応工数の削減" },
        ]} />

        <Callout type="point" title="LINE予約の4つのメリット">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>導線の短さ</strong> — トーク画面から2〜3タップで予約完了。Webフォーム入力より圧倒的に手軽</li>
            <li><strong>自動リマインド</strong> — 予約日前日にLINEで自動通知。無断キャンセルを大幅に削減</li>
            <li><strong>24時間受付</strong> — 営業時間外でも予約を受け付けられる</li>
            <li><strong>個人情報の再入力不要</strong> — LINE連携済みなら名前・連絡先の入力が不要</li>
          </ul>
        </Callout>

        <BarChart
          data={[
            { label: "電話予約", value: 100, color: "#94a3b8" },
            { label: "Web予約フォーム", value: 150, color: "#3b82f6" },
            { label: "LINE予約", value: 280, color: "#22c55e" },
          ]}
          unit="件/月"
        />
      </section>

      <section>
        <h2 id="system-types" className="text-xl font-bold text-gray-800">LINE連携予約システムの種類</h2>

        <ComparisonTable
          headers={["種類", "費用", "カスタマイズ性", "おすすめ対象"]}
          rows={[
            ["LINE公式の予約機能", "無料", "低", "シンプルな予約のみの店舗"],
            ["外部予約システム連携", "月3,000〜30,000円", "中〜高", "既存システムがある店舗"],
            ["拡張ツールの予約機能", "月5,000〜30,000円", "中", "LINE運用を一元管理したい店舗"],
            ["API開発（独自構築）", "初期50万〜150万円", "最高", "独自要件がある大規模企業"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">主要な外部予約システムのLINE連携対応</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>リザービア</strong> — 美容サロン特化。LINE予約+リマインド+顧客管理</li>
          <li><strong>STORES予約</strong> — 汎用型。月額無料プランあり。LINE連携はプレミアム以上</li>
          <li><strong>サロンボード</strong> — ホットペッパービューティー連携。美容業界の定番</li>
          <li><strong>RESERVA</strong> — 多業種対応。LINEミニアプリ連携に対応</li>
        </ul>
      </section>

      <section>
        <h2 id="selection-criteria" className="text-xl font-bold text-gray-800">予約システム選定の5つの基準</h2>

        <FlowSteps steps={[
          { title: "業種との適合性", desc: "美容・飲食・医療など、自社の業種に特化した機能があるかを確認。業種特化型は設定がスムーズ" },
          { title: "LINE連携の深度", desc: "単なる予約リンクか、トーク画面内完結か。リマインド・変更・キャンセルもLINE上でできるかを確認" },
          { title: "既存システムとの連携", desc: "POSシステム・顧客管理・決済サービスなど、既存の業務ツールとデータ連携が可能かを確認" },
          { title: "スタッフの管理機能", desc: "スタッフ別の予約枠設定、シフト管理、指名予約などの機能があるかを確認" },
          { title: "費用対効果", desc: "月額費用に対して、電話対応工数の削減効果と予約率向上効果が見合うかを試算" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="ui-design" className="text-xl font-bold text-gray-800">予約率を上げるUI設計</h2>
        <p>LINE予約のUI設計次第で、予約完了率は大きく変わります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">予約導線の最適化</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>リッチメニューに「予約」ボタンを左上配置</strong> — 最もタップされやすい位置に予約導線を設置</li>
          <li><strong>予約ステップは3ステップ以内</strong> — メニュー選択→日時選択→確認の最短フロー</li>
          <li><strong>カルーセルで空き枠を視覚化</strong> — 日付と空き状況を一覧表示して選択しやすく</li>
          <li><strong>確認画面で「予約確定」を明確に</strong> — 予約が完了したことを分かりやすく表示</li>
        </ul>

        <ResultCard before="Webフォーム型予約" after="LINE内完結型予約" metric="予約完了率" description="35% → 72%に向上。フォーム入力の離脱が大幅に減少" />

        <p>リッチメニューの設計については<Link href="/line/column/line-rich-menu-complete-guide" className="text-blue-600 underline">リッチメニュー作り方完全ガイド</Link>で詳しく解説しています。</p>
      </section>

      <section>
        <h2 id="reminder" className="text-xl font-bold text-gray-800">リマインド配信の設計</h2>
        <p>予約日前のリマインド配信は、無断キャンセルを防ぎ来店率を向上させる重要な施策です。</p>

        <ComparisonTable
          headers={["タイミング", "メッセージ内容", "効果"]}
          rows={[
            ["予約確定直後", "予約完了の確認メッセージ＋詳細情報", "予約内容の認識確認"],
            ["3日前", "来店準備の案内（持ち物・注意事項等）", "来店意欲の維持"],
            ["前日", "予約リマインド＋変更・キャンセルリンク", "無断キャンセル防止"],
            ["当日（2時間前）", "来店お待ちしています＋アクセス情報", "最後のリマインド"],
          ]}
        />

        <Callout type="success" title="リマインド配信で無断キャンセルを80%削減">
          前日のリマインド配信だけでも無断キャンセルを50%以上削減できます。さらに変更・キャンセルリンクを付けることで、直前の予定変更にも対応でき、枠の無駄をなくせます。
        </Callout>
      </section>

      <section>
        <h2 id="implementation" className="text-xl font-bold text-gray-800">導入ステップ</h2>

        <FlowSteps steps={[
          { title: "現状分析", desc: "現在の予約チャネル別件数・無断キャンセル率・電話対応工数を把握" },
          { title: "システム選定", desc: "業種・予算・必要機能を基に最適な予約システムを選定" },
          { title: "LINE連携設定", desc: "LINE公式アカウントと予約システムを連携。テスト予約で動作確認" },
          { title: "予約導線の構築", desc: "リッチメニュー・自動応答・あいさつメッセージに予約リンクを設置" },
          { title: "リマインド設定", desc: "予約確定後・前日・当日のリマインドメッセージを設定" },
          { title: "告知・移行", desc: "既存顧客にLINE予約の開始を告知。電話予約と並行運用しながら段階的に移行" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "2倍", label: "予約完了率の向上" },
          { value: "80%減", label: "無断キャンセルの削減" },
          { value: "70%減", label: "電話対応工数の削減" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>LINE予約はWeb予約の2倍の完了率</strong> — 入力の手軽さと導線の短さが鍵</li>
          <li><strong>リマインド配信で無断キャンセルを80%削減</strong> — 前日リマインド+変更リンクが効果的</li>
          <li><strong>業種に合った予約システムを選定</strong> — 美容・飲食・医療など特化型がおすすめ</li>
          <li><strong>予約ステップは3ステップ以内</strong> — シンプルなフローが高い完了率につながる</li>
          <li><strong>電話との並行運用から段階的に移行</strong> — 無理なくLINE予約比率を高める</li>
        </ol>
        <p className="mt-4">チャットボットと連携した予約受付については<Link href="/line/column/line-chatbot-creation-guide" className="text-blue-600 underline">チャットボットの作り方</Link>、フォーム機能を活用した予約申込については<Link href="/line/column/line-form-function-utilization" className="text-blue-600 underline">フォーム機能活用術</Link>もご参照ください。</p>
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
