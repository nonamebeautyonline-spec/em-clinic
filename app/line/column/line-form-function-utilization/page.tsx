import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-form-function-utilization")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINEのフォーム機能は無料で使えますか？", a: "LINE公式アカウントの標準機能であるリサーチ機能（アンケート）は全プランで無料利用可能です。ただし回答者の特定や回答に基づくセグメント配信にはLステップ等の拡張ツールが必要で、月額3,000〜30,000円程度の費用がかかります。" },
  { q: "Googleフォームとの違いは何ですか？", a: "LINEフォームは回答者のLINEアカウントと紐づくため、回答後にセグメント配信や自動フォローが可能です。Googleフォームは汎用性が高いですが、LINE上でのフォローアップ自動化ができません。LINE運用と連動させるならLINEフォームが非常に有利です。" },
  { q: "フォームの回答率を上げるコツは？", a: "設問数を5問以内に抑え、選択式を中心にすることが最重要です。回答特典（クーポン等）をつけると回答率が2〜3倍になります。また、フォームのURLではなくLINE内のカルーセルやリッチメッセージで表示すると離脱率が大幅に下がります。" },
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
  "LINEフォーム機能の種類（リサーチ・拡張ツールのフォーム）と使い分け",
  "回答率を最大化するフォーム設計の5つのコツ",
  "収集データをセグメント配信・自動フォローに活用する方法",
];

const toc = [
  { id: "form-types", label: "LINEフォーム機能の種類" },
  { id: "use-cases", label: "活用シーン5選" },
  { id: "design-tips", label: "回答率を上げるフォーム設計" },
  { id: "data-utilization", label: "収集データの活用方法" },
  { id: "creation-steps", label: "フォーム作成手順" },
  { id: "comparison", label: "Google Formsとの比較" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="フォーム機能活用" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEのフォーム機能を活用すれば、<strong>アンケート・申込み・問い合わせフォームをLINEトーク画面内で完結</strong>させることができます。回答データはユーザーのLINEアカウントに紐づくため、セグメント配信や自動フォローに直結。本記事では、フォームの種類・設計のコツ・データ活用法まで実践的に解説します。</p>

      <section>
        <h2 id="form-types" className="text-xl font-bold text-gray-800">LINEフォーム機能の種類</h2>

        <ComparisonTable
          headers={["種類", "提供元", "特徴", "費用"]}
          rows={[
            ["リサーチ（アンケート）", "LINE公式標準", "選択式・自由記述。回答者の特定は不可", "無料"],
            ["Lステップ回答フォーム", "Lステップ", "回答者特定可。タグ自動付与。条件分岐対応", "月5,000円〜"],
            ["エルメフォーム", "エルメ", "回答者特定可。デザインカスタマイズ可能", "無料〜"],
            ["LINEミニアプリ", "LINE", "アプリ内フォーム。高いUI自由度", "開発費が必要"],
          ]}
        />

        <Callout type="point" title="回答者の特定が最重要">
          LINE公式のリサーチ機能では回答者を特定できないため、回答に基づくセグメント配信ができません。マーケティング目的で使うなら、回答者を特定できる拡張ツールのフォーム機能がおすすめです。
        </Callout>
      </section>

      <section>
        <h2 id="use-cases" className="text-xl font-bold text-gray-800">フォーム機能の活用シーン5選</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 顧客満足度アンケート</h3>
        <p>来店後・購入後にフォームを自動送信し、満足度を5段階で収集。低評価者にはフォローメッセージを、高評価者には口コミ投稿を依頼する自動フローが構築できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 属性ヒアリング（セグメント用）</h3>
        <p>友だち追加直後に「お住まいの地域」「興味のあるカテゴリ」を選択式で質問。回答に応じてタグを自動付与し、セグメント配信に活用します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. イベント・セミナー申込み</h3>
        <p>イベント告知メッセージ内に申込みフォームリンクを埋め込み、氏名・参加日程・参加人数を収集。申込完了後にリマインドメッセージを自動配信します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. 問い合わせ受付</h3>
        <p>問い合わせ内容をカテゴリ別に構造化して受け付け。カテゴリに応じて担当者に自動通知するフローを構築すれば、対応漏れを防げます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">5. 商品リクエスト・要望収集</h3>
        <p>新商品のアイデアや改善要望を定期的に収集。回答者に「ご意見ありがとうクーポン」を自動配信し、回答率と顧客満足度を同時に向上させます。</p>

        <BarChart
          data={[
            { label: "顧客満足度調査", value: 85, color: "#22c55e" },
            { label: "属性ヒアリング", value: 72, color: "#3b82f6" },
            { label: "イベント申込み", value: 68, color: "#3b82f6" },
            { label: "問い合わせ受付", value: 55, color: "#94a3b8" },
            { label: "要望収集", value: 45, color: "#94a3b8" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="design-tips" className="text-xl font-bold text-gray-800">回答率を最大化するフォーム設計の5つのコツ</h2>

        <FlowSteps steps={[
          { title: "設問数は5問以内", desc: "設問が多いほど離脱率が上昇。5問以内に抑え、本当に必要な情報だけを聞く" },
          { title: "選択式を中心にする", desc: "自由記述よりも選択式の方が回答負荷が低い。自由記述は最後に1問だけ設置" },
          { title: "回答特典をつける", desc: "クーポン・ポイント・限定コンテンツなどのインセンティブで回答率が2〜3倍に向上" },
          { title: "フォームの見た目を整える", desc: "質問文は簡潔に。プログレスバーで進捗を表示すると離脱率が低下" },
          { title: "配信タイミングを最適化", desc: "来店直後・購入直後など体験が鮮明なうちにフォームを送信。時間が経つと回答率が低下" },
        ]} />

        <ResultCard before="10問・自由記述多め" after="5問・選択式中心+クーポン特典" metric="フォーム回答率" description="フォーム回答率が大幅に向上" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="data-utilization" className="text-xl font-bold text-gray-800">収集データの活用方法</h2>
        <p>フォームで収集したデータは、そのままセグメント配信や自動フォローに活用できます。</p>

        <ComparisonTable
          headers={["収集データ", "活用方法", "期待効果"]}
          rows={[
            ["興味カテゴリ", "カテゴリ別セグメント配信", "開封率・クリック率の向上"],
            ["居住エリア", "地域限定キャンペーン配信", "来店率の向上"],
            ["満足度スコア", "低評価者へのフォロー、高評価者への口コミ依頼", "満足度改善・口コミ増加"],
            ["誕生月", "誕生日クーポン自動配信", "リピート率の向上"],
            ["購入頻度", "VIP向け特典配信", "LTV（顧客生涯価値）向上"],
          ]}
        />

        <Callout type="success" title="データ収集→配信最適化の好循環">
          フォームでデータを収集し、そのデータでセグメント配信を最適化する。配信の精度が上がるとエンゲージメントが向上し、次のフォームの回答率も上がるという好循環が生まれます。セグメント配信の詳細は<Link href="/line/column/line-broadcast-vs-segment-delivery" className="text-blue-600 underline">一斉配信vsセグメント配信</Link>をご覧ください。
        </Callout>
      </section>

      <section>
        <h2 id="creation-steps" className="text-xl font-bold text-gray-800">フォーム作成手順</h2>

        <FlowSteps steps={[
          { title: "目的を明確にする", desc: "何のためにフォームを作成するのか（属性ヒアリング・満足度調査等）を明確にする" },
          { title: "設問を設計", desc: "目的に必要な最小限の設問を設計。選択肢は5個以内、設問数は5問以内を目安に" },
          { title: "ツールでフォームを作成", desc: "Lステップ/エルメの回答フォーム機能で作成。デザインをブランドに合わせてカスタマイズ" },
          { title: "回答後のアクションを設定", desc: "タグ自動付与・サンクスメッセージ・クーポン配信などの回答後アクションを設定" },
          { title: "配信設定", desc: "友だち追加時・来店後・購入後など、最適なタイミングでフォームを自動送信するトリガーを設定" },
        ]} />
      </section>

      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">Google FormsとLINEフォームの比較</h2>

        <ComparisonTable
          headers={["比較項目", "Google Forms", "LINEフォーム（拡張ツール）"]}
          rows={[
            ["費用", "無料", "月額3,000円〜"],
            ["回答者特定", "メールアドレスで可", "LINEアカウントに紐づけ"],
            ["回答後のフォロー", "手動", "自動配信・タグ付与が可能"],
            ["回答率", "低い（外部URL遷移が必要）", "高い（LINE内で完結）"],
            ["デザイン自由度", "低い", "中〜高"],
            ["データ連携", "スプレッドシート", "LINE配信・CRMと直接連携"],
          ]}
        />

        <Callout type="point" title="LINE運用にはLINEフォームが圧倒的に有利">
          Google Formsは汎用ツールとしては優秀ですが、LINE運用との連携を考えるとLINEフォームの方が非常に効率的です。回答データの自動タグ付けとセグメント配信への即時活用が最大のメリットです。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "3.5倍", label: "フォーム設計改善による回答率向上" },
          { value: "5問以内", label: "推奨設問数" },
          { value: "自動化", label: "回答→タグ→配信のフロー" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>回答者特定ができる拡張ツールのフォームが最適</strong> — セグメント配信に直結</li>
          <li><strong>設問は5問以内・選択式中心</strong> — 回答負荷を下げて回答率を最大化</li>
          <li><strong>回答特典（クーポン等）で回答率2〜3倍</strong> — インセンティブが効果的</li>
          <li><strong>収集データはセグメント配信に即活用</strong> — データ収集→配信最適化の好循環を作る</li>
          <li><strong>配信タイミングの最適化も重要</strong> — 体験直後にフォームを送信して鮮度の高い回答を得る</li>
        </ol>
        <p className="mt-4">自動応答との連携については<Link href="/line/column/line-auto-reply-setup-guide" className="text-blue-600 underline">自動応答設定ガイド</Link>、予約システムとの組み合わせは<Link href="/line/column/line-reservation-system-integration" className="text-blue-600 underline">LINE予約システム導入ガイド</Link>もご参照ください。</p>
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
