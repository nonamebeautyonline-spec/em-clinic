import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-ai-reply-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "AI返信でクリニック固有の情報を正確に回答 — 24時間対応を実現",
  "3ステップで始められる導入手順",
  "スタッフの修正から自動学習して精度が日々向上する「育つAI」",
  "運用フローと精度向上の5つのコツ",
];

const toc = [
  { id: "how-it-works", label: "AI返信でできること" },
  { id: "setup", label: "AI返信の導入手順" },
  { id: "learning", label: "使うほど賢くなる自己学習の仕組み" },
  { id: "accuracy", label: "精度向上の5つのコツ" },
  { id: "operation", label: "運用フローとベストプラクティス" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックのLINE公式アカウントにAI返信を導入することで、<strong>患者の問い合わせの70%を自動処理</strong>できます。本記事では、AI返信でできること・導入手順・自己学習の仕組み・精度を高めるコツまでを詳しく解説します。</p>

      {/* ── AI返信でできること ── */}
      <section>
        <h2 id="how-it-works" className="text-xl font-bold text-gray-800">AI返信でできること</h2>
        <p>Lオペ for CLINICのAI返信は、クリニック固有の情報を理解し、患者からの問い合わせに自然な日本語で回答するシステムです。一般的なチャットボットのような「決まったパターンにしか答えられない」制約はなく、想定外の質問にも柔軟に対応できます。</p>

        <FlowSteps steps={[
          { title: "患者からの質問を受信", desc: "LINEで患者から問い合わせメッセージが届く。AIが質問の意図を理解する。" },
          { title: "クリニックの情報を踏まえて回答を生成", desc: "登録されたクリニック情報や過去の対応履歴を踏まえ、AIが正確で自然な回答を生成。" },
          { title: "スタッフ確認後に送信（または自動送信）", desc: "スタッフが内容を確認して送信、または営業時間外は自動送信モードで即座に返信。" },
        ]} />

        <Callout type="info" title="定型チャットボットとの違い">
          定型チャットボットは事前に設定したQ&Aパターンにしか回答できません。Lオペ for CLINICのAI返信は、患者の多様な聞き方に柔軟に対応でき、情報の更新もナレッジベースを書き換えるだけで即座に反映されます。
        </Callout>

        <p><Link href="/lp/column/ai-auto-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI自動返信導入ガイド</Link>では、AI返信の基本的な導入メリットと概要を解説しています。本記事ではより実践的な活用方法に踏み込みます。</p>
      </section>

      {/* ── 導入手順 ── */}
      <section>
        <h2 id="setup" className="text-xl font-bold text-gray-800">AI返信の導入手順</h2>
        <p>AI返信は3つのステップで導入できます。技術的な知識は不要で、管理画面からノーコードで設定可能です。</p>

        <FlowSteps steps={[
          { title: "STEP 1：ナレッジベースの設定", desc: "クリニックの基本情報（診療時間・休診日・アクセス・診療科目・医師紹介・よくある質問）をナレッジベースに登録。テキスト入力するだけでAIの回答ベースが完成。" },
          { title: "STEP 2：AI返信の有効化", desc: "管理画面のAI返信設定から「AI自動返信を有効にする」をON。営業時間内のみ・営業時間外のみ・24時間の3パターンから動作モードを選択。" },
          { title: "STEP 3：テスト送信と微調整", desc: "テストアカウントから代表的な質問を送信し、回答の質を確認。必要に応じてナレッジベースの情報を追加・修正。" },
        ]} />

        <StatGrid stats={[
          { value: "30", unit: "分", label: "初期設定にかかる時間" },
          { value: "0", unit: "円", label: "追加の開発費用" },
          { value: "70", unit: "%", label: "初日からの自動回答率" },
          { value: "3", unit: "日", label: "精度安定までの期間" },
        ]} />
      </section>

      {/* ── 自己学習の仕組み ── */}
      <section>
        <h2 id="learning" className="text-xl font-bold text-gray-800">使うほど賢くなる自己学習の仕組み</h2>
        <p>Lオペ for CLINICのAI返信は、日々の運用を通じて<strong>自動的に賢くなっていく</strong>仕組みです。特別な設定は不要で、普段の業務がそのままAIのトレーニングになります。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>スタッフが修正すればAIが学ぶ</strong>：AIの回答をスタッフが修正して送信すると、その内容をAIが自動的に学習。次回から同じ質問に正しく答えられるようになる</li>
          <li><strong>手動返信も自動的に学習</strong>：AIが回答しなかった質問にスタッフが手動で返信すると、その内容もAIが学習。対応できる質問の範囲が自然に広がる</li>
          <li><strong>管理画面からQ&Aを直接追加</strong>：「こう聞かれたらこう答える」というパターンを管理画面から登録することもできる</li>
          <li><strong>学習例の管理・削除も簡単</strong>：蓄積された学習例は一覧で確認・削除でき、古い情報や不適切な学習を除外して精度を維持</li>
        </ul>

        <ResultCard
          before="導入初日：自動回答率 70%"
          after="1ヶ月後：自動回答率 90%"
          metric="日々の運用で学習データが蓄積され精度が向上"
          description="スタッフの修正回数が減少し、対応時間がさらに短縮"
        />
      </section>

      <InlineCTA />

      {/* ── 精度向上のコツ ── */}
      <section>
        <h2 id="accuracy" className="text-xl font-bold text-gray-800">精度向上の5つのコツ</h2>

        <FlowSteps steps={[
          { title: "ナレッジベースを具体的に書く", desc: "「診療時間は9:00〜18:00」だけでなく「受付は17:30まで」「初診の方は17:00まで」など、患者が実際に聞きそうな詳細を記載。" },
          { title: "よくある質問を事前登録", desc: "「駐車場はありますか」「予約なしでも受診できますか」「子連れでも大丈夫ですか」など、頻出質問の模範回答を先に登録しておく。" },
          { title: "修正はすぐに行う", desc: "AIの回答が不正確な場合、放置せずすぐに修正送信する。早期に修正するほど、同じ間違いの繰り返しを防げる。" },
          { title: "否定形の学習を意識する", desc: "「自費診療は行っていません」「○○科の診療は対応外です」など、できないことの学習も重要。誤案内のリスクを低減。" },
          { title: "定期的に学習例を見直す", desc: "月に1回、蓄積された学習例を確認。古い情報（旧住所・変更前の診療時間）がないかチェックし、不要な学習例を削除。" },
        ]} />

        <Callout type="warning" title="精度に影響する注意点">
          ナレッジベースに矛盾する情報が含まれていると、AIの回答が不安定になります。情報を更新する際は、古い情報を削除してから新しい情報を登録してください。
        </Callout>
      </section>

      {/* ── 運用フロー ── */}
      <section>
        <h2 id="operation" className="text-xl font-bold text-gray-800">運用フローとベストプラクティス</h2>
        <p>AI返信を効果的に運用するための日常フローを紹介します。<Link href="/lp/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化完全ガイド</Link>のAI返信セクションと合わせて参考にしてください。</p>

        <FlowSteps steps={[
          { title: "朝：未対応メッセージの確認", desc: "前日の営業時間外にAIが対応したメッセージの中で、エスカレーションされたものを確認・対応。" },
          { title: "随時：AIの回答品質チェック", desc: "AIが送信した回答をスポットチェック。不正確な場合は修正送信して学習データに反映。" },
          { title: "週次：自動回答率の確認", desc: "ダッシュボードで自動回答率・エスカレーション率・患者満足度を確認。目標は自動回答率85%以上。" },
          { title: "月次：学習例のメンテナンス", desc: "蓄積された学習例を見直し、古い情報や不適切なデータを削除。ナレッジベースも最新化。" },
        ]} />

        <p><Link href="/lp/column/clinic-patient-communication" className="text-sky-600 underline hover:text-sky-800">患者コミュニケーション改善のポイント</Link>で解説している双方向性と一貫性の原則は、AI返信の運用にもそのまま適用できます。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="AI返信活用のポイント">
          <ul className="mt-1 space-y-1">
            <li>1. クリニック固有の情報を正確に回答。定型チャットボットを超える柔軟性</li>
            <li>2. 初期設定30分・追加費用ゼロで導入可能。初日から自動回答率70%を実現</li>
            <li>3. スタッフの修正・手動返信からAIが自己学習し、1ヶ月で自動回答率90%に到達</li>
            <li>4. 5つの精度向上のコツを実践し、患者に正確で信頼性の高い回答を提供</li>
            <li>5. 日次・週次・月次の運用フローで、AI返信の品質を継続的に改善</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICのAI返信は、使えば使うほど賢くなる「育つAI」です。まずはナレッジベースの登録から始めて、日々の運用の中で精度を高めていきましょう。スタッフの対応品質を均一化しながら、24時間の問い合わせ対応を実現できます。業務効率化の全体的なDX戦略については<Link href="/lp/column/clinic-dx-complete-guide" className="text-sky-600 underline hover:text-sky-800">クリニックDX完全ガイド</Link>を、LINEのブロック率を抑える配信テクニックは<Link href="/lp/column/line-block-rate-reduction" className="text-sky-600 underline hover:text-sky-800">ブロック率を下げる5つの鉄則</Link>も併せてご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
