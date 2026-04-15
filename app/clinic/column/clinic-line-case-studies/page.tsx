import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  ResultCard,
  StatGrid,
  BarChart,
  Callout,
  FlowSteps,
  DonutChart,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-case-studies")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE公式アカウントの導入にかかる期間は？", a: "基本的な設定は1〜2週間で完了します。アカウント開設・リッチメニュー設計・あいさつメッセージ設定を行い、院内QRコードを掲示すれば運用開始できます。Lオペ for CLINICなら初期設定サポートも含まれています。" },
  { q: "LINE公式アカウントの導入で患者からのクレームはありませんか？", a: "LINEは患者自身が友だち追加する仕組みのため、押し売り感がなくクレームはほぼありません。むしろ予約リマインドやフォローアップで『便利になった』という声が多いです。ブロック率を低く保つには月2〜4回の配信頻度が目安です。" },
  { q: "スタッフのITリテラシーが低くても運用できますか？", a: "クリニック専用ツールを使えばLINEの管理画面より直感的に操作できます。実際の事例でも、導入初月はサポートを受けながら、2ヶ月目以降はスタッフだけで運用できるケースがほとんどです。" },
  { q: "小規模クリニックでもLINE導入の効果はありますか？", a: "むしろ小規模クリニックほど効果を実感しやすいです。スタッフ数が少ない分、予約リマインド・問診自動送信・AI返信による業務削減のインパクトが大きく、受付1名分の工数を削減できた事例もあります。" },
  { q: "LINE公式アカウントの月額費用はいくらですか？", a: "LINE公式アカウント自体は無料プラン（月200通まで）から利用可能です。クリニックの場合、友だち数500〜1,000人規模ではライトプラン（月額5,000円・月5,000通）で十分です。1,000人以上の場合はスタンダードプラン（月額15,000円・月30,000通）を推奨します。これにクリニック専用ツールの月額費用（1〜3万円程度）が加算されます。" },
  { q: "開業前からLINE公式アカウントを準備すべきですか？", a: "はい、開業3ヶ月前からの準備を推奨します。開業前にアカウント開設・リッチメニュー設計・問診フォーム作成を済ませておけば、開院初日から新患の受付をLINEで自動化できます。内覧会の告知や予約受付にも活用でき、開院時点で友だち数100〜300人を確保した事例もあります。" },
  { q: "既存の患者をLINE友だちに移行する方法は？", a: "最も効果的なのは来院時の声かけ＋院内QRコードの掲示です。受付・待合室・診察室にQRコードを設置し、友だち追加で次回予約が簡単にできることを伝えると、移行率は来院患者の30〜50%に達します。初回特典（次回予約の優先案内など）を付けるとさらに効果的です。3〜6ヶ月で既存患者の60%以上をLINE友だちに移行できます。" },
];

/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */
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
  "LINE公式アカウントを活用した5つのクリニック事例と具体的な成果",
  "予約管理・再診促進・問診自動化・決済連携・AI返信の実践例",
  "クリニック専用ツールと汎用ツールの比較・選定ポイント",
  "導入3ステップとROI（投資回収2〜3ヶ月）の数値根拠",
];

const toc = [
  { id: "why-line", label: "なぜLINE公式アカウントが必要か" },
  { id: "introduction-steps", label: "LINE公式アカウント導入の3ステップ" },
  { id: "line-effect", label: "LINE導入で何が変わるか" },
  { id: "case-1", label: "事例1: 問診→予約を完全自動化" },
  { id: "case-2", label: "事例2: セグメント配信で再診率向上" },
  { id: "case-3", label: "事例3: 自動リマインドでキャンセル削減" },
  { id: "case-4", label: "事例4: オンライン決済+配送" },
  { id: "case-5", label: "事例5: AI自動返信で24時間対応" },
  { id: "five-cases-comparison", label: "5事例の成果比較" },
  { id: "tool-selection", label: "クリニック向けLINEツールの選び方" },
  { id: "roi", label: "導入効果の数値まとめ — ROIの考え方" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Featured Snippet対策: 要約 */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-[14px] leading-relaxed text-slate-700">
        <p className="font-bold text-slate-900 mb-2">【結論】</p>
        <p>クリニックのLINE公式アカウント活用で成果を出すには、問診自動化・セグメント配信・自動リマインド・オンライン決済・AI返信の5施策が有効です。導入クリニックでは受付工数87%削減、再診率1.5倍、無断キャンセル80%減を実現しています。</p>
      </div>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックのLINE公式アカウント活用で成果を出すには、問診自動化・セグメント配信・自動リマインド・オンライン決済・AI返信の<strong>5施策</strong>が効果的です。本記事では、実際に成果を上げた<strong>5つのクリニック事例</strong>と、汎用ツールではなくクリニック専用ツールを選ぶべき理由を具体的なデータとともに解説します。
      </p>

      {/* ── なぜLINE ── */}
      <section>
        <h2 id="why-line" className="text-xl font-bold text-gray-800">なぜクリニックにLINE公式アカウントが必要なのか</h2>
        <p>日本国内のLINEユーザーは9,700万人超。患者の大半がすでに日常的にLINEを利用しています。</p>

        <BarChart
          data={[
            { label: "LINE", value: 80, color: "bg-sky-500" },
            { label: "メール", value: 25, color: "bg-gray-300" },
            { label: "DM/ハガキ", value: 12, color: "bg-gray-300" },
            { label: "電話", value: 8, color: "bg-gray-300" },
          ]}
          unit="%"
        />

        <Callout type="point" title="開封率80%の圧倒的リーチ">
          メールの約3倍、DMハガキの約7倍。LINEは患者に確実に届くコミュニケーションチャネルです。
        </Callout>

        <p>しかし、多くのクリニックではLINE公式アカウントを開設しただけで活用しきれていないのが実情です。ツール選定で迷っている方は<Link href="/clinic/column/lstep-vs-clinic-tool" className="text-emerald-700 underline">Lステップ・Liny vs クリニック専用ツール比較</Link>も参考にしてください。ここでは、LINE公式アカウントを効果的に活用しているクリニックの事例を5つご紹介します。</p>
      </section>

      {/* ── LINE公式アカウント導入の3ステップ ── */}
      <section>
        <h2 id="introduction-steps" className="text-xl font-bold text-gray-800">LINE公式アカウント導入の3ステップ</h2>
        <p>「導入が難しそう」と感じるクリニックは多いですが、実際の工程はシンプルです。以下の3ステップで、最短2週間で運用開始できます。</p>

        <FlowSteps steps={[
          { title: "STEP1: アカウント開設（所要時間: 30分）", desc: "LINE公式アカウントを開設し、クリニック名・ロゴ・営業時間を設定。必要なものはメールアドレスとクリニック情報のみ。認証済みアカウントの申請もこの段階で行います。" },
          { title: "STEP2: 初期設定（所要時間: 1〜3日）", desc: "リッチメニューのデザイン作成、あいさつメッセージの設定、問診フォームの作成、予約カレンダーとの連携を行います。クリニック専用ツールならテンプレートが用意されており、設定工数を大幅に短縮できます。" },
          { title: "STEP3: 運用開始（所要時間: 1〜2週間）", desc: "院内にQRコードを掲示し、受付で友だち追加を案内。既存患者への告知と並行して自動応答・リマインドなどの自動化フローを段階的に有効化します。" },
        ]} />

        <Callout type="success" title="最短2週間で導入可能">
          開業前のクリニックなら準備期間に組み込むことで、開院初日からLINE運用をスタートできます。詳しくは<Link href="/clinic/column/clinic-opening-line" className="text-emerald-700 underline">開業時のLINE公式アカウント準備ガイド</Link>をご覧ください。
        </Callout>

        <StatGrid stats={[
          { value: "30", unit: "分", label: "アカウント開設" },
          { value: "1〜3", unit: "日", label: "初期設定" },
          { value: "2", unit: "週間", label: "運用安定まで" },
        ]} />
      </section>

      {/* ── LINE導入で何が変わるか ── */}
      <section>
        <h2 id="line-effect" className="text-xl font-bold text-gray-800">クリニックにLINEを導入すると何が変わるのか？</h2>
        <p>LINE公式アカウントを本格活用したクリニックで実現できる改善効果を一覧で示します。</p>
        <ul className="list-disc pl-6 space-y-1 text-[14px] text-gray-700">
          <li>受付スタッフの電話対応時間を<strong>87%削減</strong></li>
          <li>セグメント配信で再診率が<strong>23ポイント向上</strong></li>
          <li>自動リマインドで無断キャンセルを<strong>80%削減</strong></li>
          <li>LINE上の決済で決済完了率が<strong>65%→95%</strong>に改善</li>
          <li>AI自動返信で夜間問い合わせの<strong>85%に即時対応</strong></li>
        </ul>
      </section>

      {/* ── 事例1 ── */}
      <section>
        <h2 id="case-1" className="text-xl font-bold text-gray-800">事例1: 友だち追加→問診→予約を完全自動化（美容皮膚科）</h2>

        <Callout type="warning" title="導入前の課題">
          新患の問い合わせ対応に受付スタッフが1日2時間以上を費やしていた。電話で問診内容を確認し、空き枠を案内し、予約を手動登録する作業が大きな負担に。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "友だち追加で自動問診", desc: "友だち追加時に挨拶メッセージ＋問診フォームを自動送信" },
          { title: "予約カレンダー自動配信", desc: "問診完了後に空き枠カレンダーのリンクをLINEで自動配信" },
          { title: "リッチメニュー自動切替", desc: "予約確定時にリッチメニューを「予約済み」デザインに自動変更" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <ResultCard
          before="1日2時間"
          after="1日15分"
          metric="受付スタッフの電話対応時間を87%削減"
          description="新患の予約完了率も30%向上"
        />

        <DonutChart percentage={87} label="電話対応87%削減" sublabel="1日2時間→15分に短縮" />
      </section>

      {/* ── 事例2 ── */}
      <section>
        <h2 id="case-2" className="text-xl font-bold text-gray-800">事例2: セグメント配信で再診率25%向上（内科クリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          慢性疾患の患者が通院を中断してしまうケースが多く、再診率の低下が経営課題に。DMハガキでフォローしていたが、コストが高く反応率も低かった。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "離脱患者の自動検出", desc: "最終来院日から3ヶ月以上経過した患者をセグメントで自動抽出" },
          { title: "パーソナル配信", desc: "「その後の体調はいかがですか？」と個別感のあるメッセージで再来院を促進" },
          { title: "配信時間の最適化", desc: "反応率データを分析し、最適な曜日・時間帯に配信を調整" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <p>セグメント配信の具体的なノウハウは<Link href="/clinic/column/segment-delivery-repeat" className="text-emerald-700 underline">LINEセグメント配信でリピート率を向上させる方法</Link>で詳しく解説しています。</p>

        <ResultCard before="再診率 45%" after="再診率 68%" metric="再診率23ポイント向上" description="DMハガキの月額5万円コスト削減" />

        <DonutChart percentage={68} label="再診率 68%達成" sublabel="導入前45%から大幅に改善" />
      </section>

      <InlineCTA />

      {/* ── 事例3 ── */}
      <section>
        <h2 id="case-3" className="text-xl font-bold text-gray-800">事例3: 自動リマインドで無断キャンセル80%削減（歯科クリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          月平均30件の無断キャンセルが発生。受付スタッフが前日に電話でリマインドしていたが、不在で繋がらないケースが半数以上だった。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "前日自動リマインド", desc: "予約日前日18時にLINEでリマインドメッセージを自動配信" },
          { title: "簡単リスケ機能", desc: "メッセージ内に「変更・キャンセル」ボタンを設置。タップだけで予約変更可能" },
          { title: "キャンセル待ち自動通知", desc: "キャンセル発生時、キャンセル待ちの患者にLINEで即座に空き通知" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <p>リマインド配信によるキャンセル対策の詳細は<Link href="/clinic/column/line-reservation-no-show" className="text-emerald-700 underline">LINE予約管理で無断キャンセルを削減する方法</Link>をご覧ください。</p>

        <ResultCard before="月30件" after="月6件" metric="無断キャンセルを80%削減" description="空き枠の稼働率向上で月間売上12%増加" />

        <DonutChart percentage={80} label="無断キャンセル80%削減" sublabel="月30件→6件に改善" />

        <StatGrid stats={[
          { value: "80", unit: "%", label: "キャンセル削減" },
          { value: "12", unit: "%", label: "月間売上増加" },
          { value: "0", unit: "分", label: "電話リマインド工数" },
        ]} />
      </section>

      {/* ── 事例4 ── */}
      <section>
        <h2 id="case-4" className="text-xl font-bold text-gray-800">事例4: オンライン決済+配送でオンライン診療を完結（オンラインクリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          オンライン診療後の決済を銀行振込で運用。未入金の催促や入金確認が手作業で、処方薬の配送管理も別システムで二重管理。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "LINE上でカード決済", desc: "診察後にLINE上でクレジットカード決済リンクを自動送信" },
          { title: "決済→配送を自動連携", desc: "決済完了で配送手配が自動スタート。追跡番号もLINE通知" },
          { title: "ステータス自動通知", desc: "出荷・配達完了をLINEでリアルタイム通知" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <ResultCard before="決済完了率 65%" after="決済完了率 95%" metric="決済完了率30ポイント向上" description="未入金催促業務がほぼゼロに" />

        <BarChart
          data={[
            { label: "銀行振込", value: 65, color: "bg-gray-300" },
            { label: "LINE決済", value: 95, color: "bg-sky-500" },
          ]}
          unit="%"
        />

        <p>オンライン決済の導入方法については<Link href="/clinic/column/clinic-payment-guide" className="text-sky-600 underline hover:text-sky-800">オンライン決済導入ガイド</Link>で詳しく解説しています。</p>
      </section>

      {/* ── 事例5 ── */}
      <section>
        <h2 id="case-5" className="text-xl font-bold text-gray-800">事例5: AI自動返信で夜間問い合わせに24時間対応（皮膚科クリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          LINEの問い合わせの40%が診療時間外に集中。翌営業日まで返信できず、他院に流れてしまう患者が多かった。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "AI自動返信を設定", desc: "診療内容・予約方法・アクセス情報への問い合わせにAIが即座に回答" },
          { title: "自動エスカレーション", desc: "AIが対応しきれない質問は翌営業日にスタッフへ自動通知" },
          { title: "学習による精度向上", desc: "スタッフの修正内容をAIが継続学習し、回答精度が日々向上" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <ResultCard before="夜間対応 0%" after="夜間対応 85%" metric="夜間問い合わせ即時対応率85%達成" />

        <DonutChart percentage={85} label="夜間即時対応率85%" sublabel="導入前0%から劇的改善" />

        <p>AI自動返信の導入方法は<Link href="/clinic/column/ai-auto-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI自動返信導入ガイド</Link>で詳しく解説しています。</p>

        <StatGrid stats={[
          { value: "85", unit: "%", label: "夜間即時対応率" },
          { value: "15", unit: "%", label: "新患獲得増加" },
          { value: "30", unit: "%", label: "問い合わせ工数削減" },
        ]} />
      </section>

      {/* ── 5事例の成果比較 ── */}
      <section>
        <h2 id="five-cases-comparison" className="text-xl font-bold text-gray-800">5事例の成果を一覧比較</h2>
        <p>5つの事例の導入前後の成果を比較表でまとめます。</p>
        <ComparisonTable
          headers={["事例", "診療科", "導入前", "導入後", "改善率"]}
          rows={[
            ["問診→予約自動化", "美容皮膚科", "電話対応1日2時間", "1日15分", "87%削減"],
            ["セグメント配信", "内科", "再診率45%", "再診率68%", "+23pt"],
            ["自動リマインド", "歯科", "月30件キャンセル", "月6件", "80%削減"],
            ["オンライン決済", "オンライン", "決済完了率65%", "決済完了率95%", "+30pt"],
            ["AI自動返信", "皮膚科", "夜間対応0%", "夜間対応85%", "85%達成"],
          ]}
        />
      </section>

      {/* ── クリニック向けLINEツールの選び方 ── */}
      <section>
        <h2 id="tool-selection" className="text-xl font-bold text-gray-800">クリニック向けLINEツールの選び方</h2>
        <p>LINE公式アカウントの運用ツールは大きく「汎用ツール」と「クリニック専用ツール」に分かれます。導入を検討する際は、クリニック業務に必要な機能が標準搭載されているかを確認することが重要です。</p>

        <ComparisonTable
          headers={["機能", "Lステップ", "Liny", "Lオペ for CLINIC", "L Message"]}
          rows={[
            ["予約管理", "△（外部連携）", "△（外部連携）", "◎（標準搭載）", "×"],
            ["LINE問診", "△（カスタム構築）", "△（カスタム構築）", "◎（テンプレ付き）", "×"],
            ["カルテ連携", "×", "×", "◎（標準搭載）", "×"],
            ["オンライン決済", "×", "×", "◎（Square/GMO）", "×"],
            ["配送管理", "×", "×", "◎（自動連携）", "×"],
            ["AI自動返信", "×", "×", "◎（自動学習型）", "×"],
            ["セグメント配信", "◎", "◎", "◎", "○"],
            ["月額費用", "2,980円〜", "5,000円〜", "要問合せ", "無料〜"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">ツール選定の3つのポイント</h3>
        <ol className="list-decimal pl-6 space-y-3 text-[14px] text-gray-700 mt-3">
          <li><strong>医療業務フローとの適合性</strong> — 予約・問診・カルテ・決済・配送がワンストップで完結するかを最重要視する。汎用ツールでは複数SaaSを組み合わせる必要があり、運用コストと連携障害リスクが増大します。</li>
          <li><strong>導入サポートの有無</strong> — クリニック運営を理解したサポート体制があるか。初期設定テンプレート・リッチメニューデザインの提供有無で導入スピードが大きく変わります。</li>
          <li><strong>総コストで比較する</strong> — 月額費用だけでなく、初期構築費用・外部連携の追加費用・カスタマイズ工数を含めたトータルコストで判断すること。安価な汎用ツールでも、カスタム構築費用を含めると専用ツールより高額になるケースが多いです。</li>
        </ol>

        <p className="mt-4">ツール比較の詳細は<Link href="/clinic/column/lstep-vs-clinic-tool" className="text-emerald-700 underline">Lステップ・Liny vs クリニック専用ツール徹底比較</Link>で解説しています。</p>
      </section>

      <InlineCTA />

      {/* ── 導入効果の数値まとめ — ROIの考え方 ── */}
      <section>
        <h2 id="roi" className="text-xl font-bold text-gray-800">導入効果の数値まとめ — ROIの考え方</h2>
        <p>LINE公式アカウント＋専用ツールの導入は「コスト」ではなく「投資」です。実際のクリニックのデータをもとに、投資回収の目安を示します。</p>

        <StatGrid stats={[
          { value: "3〜5", unit: "万円", label: "月額コスト目安" },
          { value: "40", unit: "時間", label: "月間削減工数" },
          { value: "2〜3", unit: "ヶ月", label: "投資回収期間" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">費用対効果の計算例（月間）</h3>
        <ComparisonTable
          headers={["項目", "金額", "内訳"]}
          rows={[
            ["投資コスト", "約5万円/月", "LINE公式: 5,000〜15,000円 + 専用ツール: 1〜3万円"],
            ["人件費削減", "約15万円/月", "受付スタッフ工数 約40時間削減（時給1,500円×40h）"],
            ["売上増加", "約20万円/月", "再診率向上+キャンセル削減+新患増加の合算"],
            ["月間ROI", "+約30万円/月", "削減額+売上増 − 投資コスト"],
          ]}
        />

        <BarChart
          data={[
            { label: "投資コスト", value: 5, color: "bg-red-400" },
            { label: "人件費削減", value: 15, color: "bg-emerald-500" },
            { label: "売上増加", value: 20, color: "bg-sky-500" },
          ]}
          unit="万円/月"
        />

        <Callout type="point" title="ROIは導入2〜3ヶ月目で黒字化">
          初月は設定・運用定着の期間ですが、2ヶ月目以降は自動化の効果が本格化します。友だち数500人を超えるとセグメント配信の効果も顕在化し、ROIはさらに改善します。投資対効果の詳しい計算方法は<Link href="/clinic/column/clinic-line-roi" className="text-emerald-700 underline">クリニックLINE導入のROI計算ガイド</Link>をご覧ください。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: クリニックのLINE活用を成功させるポイント</h2>

        <p>5つの事例に共通するポイントは以下の3つです。</p>

        <Callout type="success" title="成功の3原則">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>自動化を徹底する</strong> — 手作業をなくし、友だち追加から予約・決済・フォローまで自動フローを構築</li>
            <li><strong>パーソナライズする</strong> — 全員一斉配信ではなく、患者の状態に合わせたセグメント配信で反応率を最大化</li>
            <li><strong>クリニック専用ツールを使う</strong> — 汎用LINE配信ツールではなく、医療業務フローに特化したツールで運用効率を最大化</li>
          </ol>
        </Callout>

        <BarChart
          data={[
            { label: "受付工数", value: 87, color: "bg-sky-500" },
            { label: "キャンセル", value: 80, color: "bg-emerald-500" },
            { label: "決済完了率", value: 46, color: "bg-violet-500" },
            { label: "再診率", value: 56, color: "bg-amber-500" },
          ]}
          unit="% 改善"
        />

        <p>Lオペ for CLINICは、これら5つの事例で紹介した施策をすべて実現できるクリニック専用のLINE運用プラットフォームです。予約管理・セグメント配信・AI自動返信・決済連携など、搭載している<Link href="/clinic/features" className="text-sky-600 underline hover:text-sky-800">全機能の一覧はこちら</Link>でご確認いただけます。LINE運用の始め方から自動化まで体系的に知りたい方は<Link href="/clinic/column/line-operation-guide" className="text-emerald-700 underline">LINE公式アカウント運用完全ガイド</Link>をご覧ください。</p>
        <p className="text-sm text-gray-600 mt-4">関連記事:</p>
        <ul className="text-sm space-y-1 mt-1">
          <li><Link href="/clinic/column/clinic-line-automation-complete" className="text-blue-600 underline">クリニックLINE自動化完全ガイド — 8つの業務を自動化して月40時間削減</Link></li>
          <li><Link href="/clinic/column/clinic-line-revisit-guide" className="text-blue-600 underline">再来院率をLINEで向上させる7つの施策</Link></li>
          <li><Link href="/clinic/column/clinic-line-questionnaire-complete" className="text-blue-600 underline">クリニックLINE問診完全ガイド — 受付業務を70%削減</Link></li>
          <li><Link href="/clinic/column/line-doctor-alternative-guide" className="text-blue-600 underline">LINEドクター代替サービス7選 — 終了後の乗り換え先</Link></li>
          <li><a href="/clinic/column/clinic-opening-line" className="text-blue-600 underline">開業時のLINE公式アカウント準備ガイド</a></li>
          <li><a href="/clinic/column/clinic-line-roi" className="text-blue-600 underline">クリニックLINE導入のROI計算ガイド</a></li>
        </ul>
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
