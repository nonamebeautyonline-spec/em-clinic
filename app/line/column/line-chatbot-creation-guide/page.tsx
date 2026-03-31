import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-chatbot-creation-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINEチャットボットの構築にプログラミングは必要ですか？", a: "いいえ、Lステップやエルメなどの拡張ツールを使えばノーコードで構築できます。条件分岐やシナリオ設計はGUIで設定可能です。独自のカスタマイズが必要な場合はMessaging APIを使ったプログラミングが必要ですが、多くのケースではノーコードツールで十分です。" },
  { q: "チャットボットの構築費用はどのくらいですか？", a: "ノーコードツールを使う場合は月額3,000〜30,000円のツール費用のみで構築可能です。外注する場合はシナリオ設計+構築で10万〜50万円が相場です。API開発による独自構築は50万〜200万円以上になりますが、高いカスタマイズ性を得られます。" },
  { q: "チャットボットで対応できない質問はどうなりますか？", a: "適切に設計されたチャットボットでは、対応できない質問を検知してスタッフに自動エスカレーションします。「担当者が確認してご連絡いたします」と即座に返信した上で、管理画面やSlackにスタッフ向け通知を飛ばす仕組みが一般的です。" },
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
  "ノーコードで構築できるLINEチャットボットの仕組みと構築手法",
  "FAQ対応・予約受付・商品案内など目的別シナリオ設計のコツ",
  "構築から運用改善まで、チャットボットの効果を最大化する方法",
];

const toc = [
  { id: "what-is-chatbot", label: "LINEチャットボットとは" },
  { id: "build-methods", label: "3つの構築方法" },
  { id: "scenario-design", label: "シナリオ設計の基本" },
  { id: "use-cases", label: "目的別シナリオ例" },
  { id: "nocode-steps", label: "ノーコード構築手順" },
  { id: "escalation", label: "エスカレーション設計" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="チャットボット" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEチャットボットは、ユーザーのメッセージに対して<strong>自動的に会話形式で応答するプログラム</strong>です。FAQ対応・予約受付・商品案内などをチャットボットで自動化すれば、24時間対応と人件費削減を同時に実現できます。本記事では、ノーコードで構築する方法からシナリオ設計、運用改善まで包括的に解説します。</p>

      <section>
        <h2 id="what-is-chatbot" className="text-xl font-bold text-gray-800">LINEチャットボットとは</h2>
        <p>LINEチャットボットは、LINE上でユーザーとの会話を自動化する仕組みです。単純な一問一答型から、複数の選択肢を提示して会話を分岐させるシナリオ型、自然言語を理解して回答するAI型まで、さまざまなタイプがあります。</p>

        <ComparisonTable
          headers={["タイプ", "仕組み", "対応範囲", "構築難易度"]}
          rows={[
            ["一問一答型", "キーワード→定型回答", "限定的", "簡単"],
            ["シナリオ型", "選択肢→分岐→回答", "中程度", "やや複雑"],
            ["AI型", "自然言語理解→回答生成", "広い", "高度"],
            ["ハイブリッド型", "シナリオ+AI+人間", "最も広い", "やや複雑"],
          ]}
        />

        <StatGrid stats={[
          { value: "70%", label: "チャットボットで自動対応可能な問い合わせ" },
          { value: "60%削減", label: "スタッフの対応工数" },
          { value: "24時間", label: "対応可能時間" },
        ]} />
      </section>

      <section>
        <h2 id="build-methods" className="text-xl font-bold text-gray-800">3つの構築方法</h2>

        <ComparisonTable
          headers={["方法", "費用", "カスタマイズ性", "おすすめ対象"]}
          rows={[
            ["ノーコードツール", "月額3,000〜30,000円", "中", "中小企業・個人事業主"],
            ["外注（制作会社）", "10万〜50万円", "高", "自社リソースがない企業"],
            ["API開発（自社開発）", "50万〜200万円", "最高", "大企業・独自要件がある企業"],
          ]}
        />

        <Callout type="success" title="8割以上のケースでノーコードツールが最適">
          FAQ対応・予約受付・商品案内などの一般的なユースケースは、ノーコードツールで十分に実現できます。まずはノーコードで構築し、必要に応じてAPI連携で機能を拡張するのがおすすめです。
        </Callout>
      </section>

      <section>
        <h2 id="scenario-design" className="text-xl font-bold text-gray-800">シナリオ設計の基本</h2>
        <p>チャットボットの成否はシナリオ設計にかかっています。ユーザーの目的を素早く特定し、最短ステップでゴールに導くことが重要です。</p>

        <FlowSteps steps={[
          { title: "ゴールを定義", desc: "「予約完了」「FAQ解決」「商品購入」など、チャットボットで達成したいゴールを明確にする" },
          { title: "ユーザーフローを設計", desc: "ゴールまでの会話フローを設計。分岐は3段階以内、選択肢は4つ以内に収める" },
          { title: "メッセージを作成", desc: "各ステップのメッセージを作成。親しみやすいトーンで、1メッセージ100文字以内を目安に" },
          { title: "例外パターンを設計", desc: "想定外の入力に対するフォールバック応答と、エスカレーションのトリガーを設定" },
        ]} />

        <Callout type="warning" title="シナリオ設計の3つのNG">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>分岐が深すぎる</strong> — 4段階以上の分岐はユーザーが離脱する</li>
            <li><strong>選択肢が多すぎる</strong> — 1ステップの選択肢は4つ以内に</li>
            <li><strong>テキストが長すぎる</strong> — 1メッセージは100文字以内。長い場合は複数に分ける</li>
          </ul>
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="use-cases" className="text-xl font-bold text-gray-800">目的別シナリオ例</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">FAQ対応シナリオ</h3>
        <p>「よくある質問」をカテゴリ別に分類し、選択肢で絞り込んでいく形式。「営業時間」「料金」「アクセス」などのカテゴリをカルーセルで提示し、選択に応じて回答を表示します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">予約受付シナリオ</h3>
        <p>「予約したい」のキーワードをトリガーに、日時→メニュー→確認の3ステップで予約を完了。予約システムとAPI連携すれば、空き状況の確認から予約確定まで自動化できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">商品レコメンドシナリオ</h3>
        <p>「おすすめを教えて」をトリガーに、肌タイプ→悩み→予算の3問で絞り込み、最適な商品を提案。コスメ・サプリ・食品ECで高い成約率を記録しています。</p>

        <ResultCard before="商品一覧ページへのリンク" after="チャットボット型レコメンド" metric="商品購入CVR" description="2.1% → 8.7%に向上（約4倍）" />
      </section>

      <section>
        <h2 id="nocode-steps" className="text-xl font-bold text-gray-800">ノーコード構築手順（Lステップの場合）</h2>

        <FlowSteps steps={[
          { title: "Lステップのアカウント開設", desc: "LINE公式アカウントとLステップを連携。API設定を完了させる" },
          { title: "テンプレートを選択", desc: "FAQ・予約・商品案内など、目的に合ったシナリオテンプレートを選択" },
          { title: "シナリオをカスタマイズ", desc: "テンプレートをベースに、自社の情報・メニュー・回答に合わせてカスタマイズ" },
          { title: "キーワードトリガーを設定", desc: "シナリオを起動するキーワードやリッチメニューのタップアクションを設定" },
          { title: "テスト実行", desc: "全ての分岐パターンをテストし、回答内容とフロー遷移が正しいことを確認" },
          { title: "公開・運用開始", desc: "シナリオを公開し、ユーザーの反応を見ながら改善を進める" },
        ]} />
      </section>

      <section>
        <h2 id="escalation" className="text-xl font-bold text-gray-800">エスカレーション設計</h2>
        <p>チャットボットが対応できない質問を、適切にスタッフに引き継ぐ仕組みは最も重要です。</p>

        <BarChart
          data={[
            { label: "ボット完結", value: 70, color: "#22c55e" },
            { label: "スタッフ対応", value: 20, color: "#3b82f6" },
            { label: "エスカレーション失敗", value: 10, color: "#ef4444" },
          ]}
          unit="%"
        />

        <Callout type="warning" title="エスカレーション失敗を0%に近づける">
          ユーザーが「人に聞きたい」と思ったとき、すぐにスタッフにつながる導線を用意します。「スタッフに聞く」ボタンを常に表示し、3回以上分岐しても解決しない場合は自動でスタッフに通知する設計が有効です。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "70%", label: "自動対応可能な問い合わせ比率" },
          { value: "60%", label: "スタッフ工数削減" },
          { value: "4倍", label: "レコメンドシナリオのCVR向上" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>ノーコードツールで8割以上のケースに対応可能</strong> — まずはLステップやエルメで構築</li>
          <li><strong>シナリオは3段階以内・選択肢は4つ以内</strong> — シンプルなフローが高い完了率につながる</li>
          <li><strong>FAQ・予約・商品案内がチャットボットの3大用途</strong> — 目的に応じたシナリオを設計</li>
          <li><strong>エスカレーション設計が成功の鍵</strong> — ボットで解決できないケースの導線を確保</li>
          <li><strong>継続的な改善でボット完結率を向上</strong> — ログ分析→シナリオ改善のサイクルを回す</li>
        </ol>
        <p className="mt-4">チャットボットと組み合わせて効果を発揮する自動応答設定については<Link href="/line/column/line-auto-reply-setup-guide" className="text-blue-600 underline">自動応答設定ガイド</Link>、予約システム連携は<Link href="/line/column/line-reservation-system-integration" className="text-blue-600 underline">LINE予約システム導入ガイド</Link>もご参照ください。</p>
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
