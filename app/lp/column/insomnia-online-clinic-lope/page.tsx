import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import type { Article } from "../articles";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  DonutChart,
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";

/* articles.ts への追加不要 — ローカル定義 */
const self: Article = {
  slug: "insomnia-online-clinic-lope",
  title: "不眠症・睡眠薬のオンライン処方ガイド — 定期フォローで安全管理とリピートを両立",
  description: "不眠症治療のオンライン診療を安全に運用するためのガイド。睡眠薬の処方ルール・依存リスク管理・定期フォローの重要性と、Lオペ for CLINICを活用したLINE問診・セグメント配信・フォローアップ自動化の方法を解説します。",
  date: "2026-03-23",
  category: "活用事例",
  readTime: "10分",
  tags: ["不眠症", "睡眠薬", "オンライン診療", "安全管理", "定期フォロー"],
};

/* articles 配列に未登録の場合のみ追加（一覧・関連記事表示用） */
if (!articles.find((a) => a.slug === self.slug)) {
  articles.push(self);
}

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "不眠症・睡眠薬のオンライン処方ガイドでLINE導入の効果はどのくらいですか？", a: "導入クリニックの実績では、予約リマインドによる無断キャンセル60〜80%削減、セグメント配信によるリピート率20〜30%向上、AI自動返信による電話対応70%削減など、多面的な効果が報告されています。" },
  { q: "LINE導入にプログラミング知識は必要ですか？", a: "必要ありません。Lオペ for CLINICのようなクリニック専用ツールを使えば、ノーコードで予約管理・自動配信・リッチメニューの設定が可能です。管理画面上の操作だけで運用開始できます。" },
  { q: "患者の年齢層が高い診療科でもLINE活用は効果的ですか？", a: "はい、LINEは60代以上でも利用率が70%を超えており、幅広い年齢層にリーチできます。文字サイズの配慮や操作案内の工夫をすれば、高齢患者にも好評です。むしろ電話予約の負担が減り、患者・スタッフ双方にメリットがあります。" },
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
  "成人の約20%が不眠症状を抱えるが、受診率はわずか10%台にとどまる",
  "オレキシン受容体拮抗薬やメラトニン受容体作動薬など依存性の低い薬剤がオンライン処方に適している",
  "Lオペ for CLINICでLINE問診・セグメント配信・定期診察リマインドを一元管理",
  "定期フォロー体制の構築で治療継続率45%→78%、月間処方件数の安定化を実現",
];

const toc = [
  { id: "insomnia-market", label: "不眠症市場の現状と可能性" },
  { id: "medications", label: "睡眠薬の種類と特徴" },
  { id: "safety", label: "安全管理の重要性" },
  { id: "diagnosis-flow", label: "オンライン処方フロー" },
  { id: "lope-insomnia", label: "Lオペで不眠症診療を運用" },
  { id: "revenue", label: "収益モデル" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        不眠症は成人の約20%が経験する非常に身近な疾患でありながら、<strong>実際に医療機関を受診している患者はそのうちわずか10%台</strong>にとどまります。「たかが眠れないだけ」と放置する人が多い一方で、慢性不眠は生活習慣病やうつ病のリスクを高める深刻な問題です。オンライン診療の普及により、<strong>通院のハードルを下げて「眠れない」を放置させない仕組み</strong>が実現可能になりました。本記事では、不眠症のオンライン処方を安全に運用するための薬剤選択・依存リスク管理・定期フォロー体制の構築と、<strong>Lオペ for CLINICを活用したLINE問診・セグメント配信・フォローアップ自動化</strong>の方法を解説します。
      </p>

      {/* ── セクション1: 不眠症市場 ── */}
      <section>
        <h2 id="insomnia-market" className="text-xl font-bold text-gray-800">不眠症市場の現状 — 成人の5人に1人が不眠症状</h2>

        <p>
          厚生労働省の調査によると、日本人成人の約20%が何らかの不眠症状を自覚しています。年代別に見ると、<strong>40代〜60代での有病率が特に高く</strong>、ストレス・更年期障害・加齢による生体リズムの変化が主な要因です。一方、20代〜30代でもスマートフォンの長時間使用やリモートワークの普及に伴い、入眠障害を訴える患者が急増しています。
        </p>

        <p>
          しかし、不眠症状がありながら医療機関を受診している人は<strong>推定10〜15%</strong>にすぎません。多くの患者が市販の睡眠改善薬やサプリメントで自己対処しており、慢性化してから初めて受診するケースが少なくありません。ここに<strong>オンライン診療の大きな可能性</strong>があります。自宅から手軽に受診できる環境を整えることで、早期受診・早期治療のハードルを大幅に下げることができます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">年代別 不眠症状の有病率</h3>

        <BarChart
          data={[
            { label: "20代", value: 15, color: "bg-sky-400" },
            { label: "30代", value: 18, color: "bg-sky-500" },
            { label: "40代", value: 23, color: "bg-blue-500" },
            { label: "50代", value: 27, color: "bg-blue-600" },
            { label: "60代", value: 30, color: "bg-indigo-500" },
            { label: "70代以上", value: 35, color: "bg-indigo-600" },
          ]}
          unit="%"
        />

        <StatGrid stats={[
          { value: "2,400", unit: "万人", label: "不眠症状を持つ成人推定数" },
          { value: "10〜15", unit: "%", label: "不眠症状者の受診率" },
          { value: "4,800", unit: "億円", label: "睡眠関連市場規模" },
          { value: "3.5", unit: "兆円", label: "不眠による経済損失（年間）" },
        ]} />

        <p>
          不眠症による経済損失は年間約3.5兆円と推計されており、生産性低下・事故リスク・医療費増大など社会的なインパクトは極めて大きい疾患です。<strong>オンライン診療によって受診率を数%でも向上させることができれば</strong>、患者のQOL向上だけでなくクリニックの新たな収益源にもなります。オンライン診療の制度面は<Link href="/lp/column/online-clinic-regulations" className="text-sky-600 underline hover:text-sky-800">オンライン診療の制度と規制ガイド</Link>で詳しく解説しています。
        </p>
      </section>

      {/* ── セクション2: 睡眠薬の種類と特徴 ── */}
      <section>
        <h2 id="medications" className="text-xl font-bold text-gray-800">睡眠薬の種類と特徴 — オンライン処方に適した薬剤選択</h2>

        <p>
          不眠症の薬物療法は近年大きく変化しています。従来のベンゾジアゼピン系睡眠薬に代わり、<strong>依存性が低く安全性の高い新世代の睡眠薬</strong>が主流になりつつあります。オンライン診療で処方する際には、対面での経過観察が限られることを考慮し、依存リスクの低い薬剤を第一選択とすることが推奨されます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">主な睡眠薬の種類と比較</h3>

        <ComparisonTable
          headers={["分類", "代表的な薬剤", "依存性", "主な副作用", "月額薬剤費（3割負担）"]}
          rows={[
            ["オレキシン受容体拮抗薬", "デエビゴ、ベルソムラ", "極めて低い", "傾眠、頭痛", "約2,500〜3,000円"],
            ["メラトニン受容体作動薬", "ロゼレム", "なし", "傾眠、めまい", "約2,000〜2,500円"],
            ["非BZ系睡眠薬", "マイスリー、ルネスタ", "低〜中", "ふらつき、健忘", "約1,000〜1,500円"],
            ["漢方薬", "抑肝散、酸棗仁湯", "なし", "胃腸障害（稀）", "約1,500〜2,000円"],
            ["BZ系睡眠薬", "レンドルミン、ハルシオン", "中〜高", "依存、反跳性不眠", "約500〜1,000円"],
          ]}
        />

        <p>
          <strong>オレキシン受容体拮抗薬（デエビゴ、ベルソムラ）</strong>は、覚醒を維持するオレキシンの働きをブロックすることで自然な眠気を誘導します。従来の睡眠薬のような筋弛緩作用がなく、<strong>高齢者の転倒リスクも低い</strong>ため、オンライン診療での処方に最も適した薬剤のひとつです。特にデエビゴは中途覚醒への効果も高く、2020年の発売以来処方数が急増しています。
        </p>

        <p>
          <strong>メラトニン受容体作動薬（ロゼレム）</strong>は、体内時計のリズムを調整することで入眠を促します。依存性がゼロであり、<strong>生活リズムの乱れが原因の入眠障害</strong>に特に有効です。効果発現まで2〜4週間かかることがあるため、患者への丁寧な説明が継続服用の鍵になります。
        </p>

        <p>
          <strong>漢方薬（抑肝散、酸棗仁湯）</strong>も不眠症治療の選択肢として見直されています。不安やイライラを伴う不眠には抑肝散、体力低下を伴う高齢者の不眠には酸棗仁湯が有効で、<strong>西洋薬との併用や減薬時の補助</strong>としても活用されています。
        </p>

        <Callout type="warning" title="ベンゾジアゼピン系のオンライン処方は慎重に">
          ベンゾジアゼピン系睡眠薬（レンドルミン、ハルシオン等）は依存性・耐性のリスクがあり、急な中止で反跳性不眠や離脱症状が生じる可能性があります。<strong>オンライン診療での新規処方は原則避け</strong>、対面診療で安定している患者の継続処方に限定することが推奨されます。厚生労働省のガイドラインでも、向精神薬のオンライン初回処方には慎重な対応が求められています。
        </Callout>
      </section>

      {/* ── セクション3: 安全管理の重要性 ── */}
      <section>
        <h2 id="safety" className="text-xl font-bold text-gray-800">安全管理の重要性 — 依存リスクと長期処方の注意点</h2>

        <p>
          不眠症治療において最も重要なのが<strong>安全管理と定期的なフォローアップ</strong>です。特に睡眠薬は、適切な管理なしに漫然と処方を続けると、依存形成・耐性獲得・日中の眠気による事故リスクなど深刻な問題を引き起こす可能性があります。オンライン診療だからこそ、<strong>対面以上に体系的な安全管理の仕組み</strong>を構築する必要があります。
        </p>

        <p>
          安全管理のポイントは大きく3つあります。第一に、<strong>定期的な症状評価</strong>。不眠症の重症度は変動するため、ピッツバーグ睡眠質問票（PSQI）やアテネ不眠尺度（AIS）などの標準化されたスケールを用いて、定期的に評価を行うことが重要です。第二に、<strong>処方量と期間の管理</strong>。薬剤の種類に応じた適切な処方期間を設定し、漫然とした長期処方を防止します。第三に、<strong>副作用モニタリング</strong>。日中の眠気、ふらつき、記憶障害などの副作用を定期的にスクリーニングし、早期に対応します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">不眠症オンライン診療の安全管理フロー</h3>

        <FlowSteps steps={[
          { title: "初回診察：リスク評価とスクリーニング", desc: "睡眠問診で不眠の原因（ストレス・生活習慣・身体疾患）を特定。うつ病・睡眠時無呼吸症候群などのスクリーニングを実施し、オンライン診療の適否を判断する。対面が必要な場合は速やかに紹介。" },
          { title: "処方開始：低用量からスタート", desc: "依存性の低い薬剤（オレキシン受容体拮抗薬・メラトニン受容体作動薬）を低用量で開始。非薬物療法（睡眠衛生指導）も同時に指導し、薬剤への過度な依存を防ぐ。初回処方は14〜30日分。" },
          { title: "2週間後：初期効果の確認", desc: "入眠潜時・中途覚醒・日中の眠気を確認。副作用の有無をチェックし、必要に応じて用量調整を行う。効果不十分な場合は薬剤変更を検討。" },
          { title: "1か月後：定期フォロー開始", desc: "症状が安定していれば30日処方に移行。フォローアップルールによる定期診察リマインドで毎月の経過観察を確実に実施し、処方の適切性を評価する。" },
          { title: "3か月後：減薬の検討", desc: "症状が安定している場合は段階的な減薬を検討。睡眠衛生指導の効果を確認し、薬剤なしで入眠できるようトレーニングを進める。減薬は必ず漸減法で行う。" },
        ]} />

        <Callout type="info" title="睡眠衛生指導の5つのポイント">
          薬物療法と並行して実施する非薬物療法は治療成功の鍵です。<strong>（1）就寝・起床時刻の固定</strong>、<strong>（2）就寝前2時間のスマホ・PC制限</strong>、<strong>（3）カフェインは15時まで</strong>、<strong>（4）寝室は睡眠以外に使わない</strong>、<strong>（5）眠くなってから布団に入る</strong>。この5つを患者教育として繰り返し伝えることが、薬剤減量・離脱の成功率を高めます。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション4: オンライン処方フロー ── */}
      <section>
        <h2 id="diagnosis-flow" className="text-xl font-bold text-gray-800">オンライン処方フロー — 睡眠問診から定期フォローまで</h2>

        <p>
          不眠症のオンライン診療を効率的かつ安全に運用するには、<strong>標準化されたフロー</strong>を構築することが不可欠です。特に睡眠問診は、対面診療以上に<strong>事前の情報収集を充実させる</strong>ことで、限られた診察時間を有効に活用できます。オンライン診療の全体像は<Link href="/lp/column/online-clinic-complete-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療完全ガイド</Link>で解説しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">標準的なオンライン処方フロー</h3>

        <FlowSteps steps={[
          { title: "Step 1: LINE問診で睡眠状態を事前収集", desc: "アテネ不眠尺度（AIS）やピッツバーグ睡眠質問票の簡易版をLINE上で患者に回答してもらう。就寝時刻・入眠潜時・中途覚醒回数・起床時刻・日中の眠気・現在服用中の薬剤情報を自動で収集。医師はカルテに自動反映されたデータを診察前に確認できる。" },
          { title: "Step 2: ビデオ診察（10〜15分）", desc: "事前問診の結果を踏まえ、不眠の原因・重症度・合併症のリスクを評価。初診では特に、うつ病や睡眠時無呼吸症候群のスクリーニングを実施。オンライン診療の適否を最終判断し、治療方針を決定する。" },
          { title: "Step 3: 処方箋発行と薬剤配送", desc: "電子処方箋を発行し、提携薬局から自宅配送。または患者の最寄り薬局にFAX送信して受け取り。初回は14〜30日分の処方で、効果確認後に30日処方に移行する。" },
          { title: "Step 4: フォローアップルールで定期診察リマインド", desc: "処方日を起点としたフォローアップルールを設定し、30日分の処方が終わる5日前にLINEで自動リマインド。「お薬が残り少なくなっています」と再診予約リンクを自動配信し、治療中断を防止する。" },
          { title: "Step 5: 定期フォロー（月1回）", desc: "患者CRMで処方履歴・問診回答・タグ情報を確認し、オンライン再診で処方の継続・変更・減薬を判断。セグメント配信で薬剤種別ごとの注意事項を一斉送信でき、安定している患者は診察時間を5〜10分に短縮できる。" },
        ]} />

        <Callout type="info" title="フォローアップルールで治療中断を防止">
          Lオペ for CLINICのフォローアップルール機能を活用すれば、処方日を起点に「5日前リマインド」「処方期限当日の再通知」など複数段階の自動配信スケジュールを設定できます。患者はLINEの予約リンクをタップするだけで再診予約が完了。<strong>リマインドなしの場合の再診率が50%程度であるのに対し、フォローアップルール導入後は再診率85%以上</strong>を達成しています。タグ管理と組み合わせることで、薬剤種別や処方期間に応じた細やかなフォロー体制を構築できます。
        </Callout>

        <p>
          このフローの最大のポイントは、<strong>診察と診察の間の「空白期間」をLINEで埋める</strong>ことです。従来のオンライン診療では、月1回の診察時にしか患者と接点がありませんでしたが、フォローアップルールによる定期リマインドとセグメント配信による情報提供を組み合わせることで、<strong>患者との継続的な接点を維持し、治療中断を防止</strong>できます。リピート率の向上については<Link href="/lp/column/clinic-repeat-rate-improvement" className="text-sky-600 underline hover:text-sky-800">リピート率改善ガイド</Link>も参考にしてください。
        </p>
      </section>

      {/* ── セクション5: Lオペで不眠症診療を運用 ── */}
      <section>
        <h2 id="lope-insomnia" className="text-xl font-bold text-gray-800">Lオペ for CLINICで不眠症診療を運用する</h2>

        <p>
          Lオペ for CLINICは、不眠症のオンライン診療に必要な<strong>LINE問診・予約管理・セグメント配信・フォローアップルール・患者CRM</strong>のすべてをLINE公式アカウント上で一元管理できるプラットフォームです。ここでは具体的な活用方法を解説します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. LINE問診で睡眠状態を事前把握</h3>

        <p>
          オンライン問診機能で、診察前に患者の睡眠状態を詳細に収集します。アテネ不眠尺度（AIS）やピッツバーグ睡眠質問票の簡易版をLINE上で回答してもらい、就寝時刻・入眠潜時・中途覚醒回数・日中の眠気・服用中の薬剤情報を<strong>診察前に自動で把握</strong>。問診結果は患者CRMに蓄積され、医師は診察前にデータを確認できるため、<strong>限られた診察時間を治療方針の説明に集中</strong>できます。紙の問診票では記入漏れが多い項目も、LINE上の選択式フォーマットにより回答完了率が大幅に向上しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. フォローアップルールで定期診察リマインド</h3>

        <p>
          フォローアップルール機能で、処方日を起点とした自動リマインドスケジュールを設定します。30日分の処方が終わる5日前に「お薬が残り少なくなっています。再診のご予約はこちらから」と自動送信し、<strong>ワンタップで再診予約ができるリンク</strong>を添付。処方切れによる治療中断を防ぎ、継続率を大幅に向上させます。タグ管理と連動し、薬剤種別（オレキシン系・メラトニン系など）ごとに異なるリマインド内容を出し分けることも可能です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. セグメント配信で薬剤別の情報提供</h3>

        <p>
          セグメント配信機能を活用し、処方薬剤の種類に応じた注意事項や生活指導を自動配信します。たとえば、オレキシン受容体拮抗薬を処方中の患者には「服用後すぐに就寝してください」、メラトニン受容体作動薬の患者には「効果が安定するまで2〜4週間かかります」といった<strong>薬剤別のテンプレートメッセージ</strong>を送信。タグ管理で患者を薬剤種別・処方期間ごとに分類し、必要な情報を必要な患者にだけ届けることで、<strong>副作用の早期気づきや服薬遵守の向上</strong>につなげます。患者からの質問にはAI自動返信が一次対応し、スタッフの負担を軽減します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. 定期診察予約の自動化</h3>

        <p>
          予約管理機能と連動し、初回診察時に月1回の定期フォロー予約を自動でリマインドします。患者のLINEに「次回の診察予約日が近づいています」と通知が届き、<strong>空き枠からワンタップで予約完了</strong>。電話やWebフォームでの予約作業が不要になり、患者の利便性とスタッフの業務効率が同時に向上します。
        </p>

        <ResultCard
          before="治療継続率が低い（3か月時点）"
          after="Lオペ導入後: 治療継続率が大幅に改善（3か月時点）"
          metric="治療継続率の大幅改善が期待"
          description="LINE問診・フォローアップルール・セグメント配信の3点セットで治療離脱を防止"
        />

        <p>
          月額費用は<strong>10万〜18万円</strong>（患者数・配信数により変動）です。不眠症の定期処方は月1回の安定的な診療収益を生み出すため、Lオペの費用は十分に回収可能です。次のセクションで具体的な収益モデルを解説します。
        </p>

        <InlineCTA />
      </section>

      {/* ── セクション6: 収益モデル ── */}
      <section>
        <h2 id="revenue" className="text-xl font-bold text-gray-800">収益モデル — 定期処方がもたらす安定収益</h2>

        <p>
          不眠症のオンライン診療は、<strong>月1回の定期フォロー×長期継続</strong>という特性から、クリニックにとって非常に安定した収益源になります。1人あたりの月額診療収益は5,000〜10,000円（再診料＋処方料＋オンライン指導料）で、患者数が積み上がるほど収益基盤が強固になるストック型のビジネスモデルです。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">患者1人あたりの月額収益</h3>

        <BarChart
          data={[
            { label: "再診料", value: 2500, color: "bg-sky-400" },
            { label: "処方料", value: 2000, color: "bg-blue-500" },
            { label: "オンライン指導料", value: 1500, color: "bg-indigo-500" },
            { label: "薬学管理料等", value: 1000, color: "bg-violet-500" },
          ]}
          unit="円"
        />

        <p>
          1人あたり月額約5,000〜10,000円の診療収益が見込めます。仮に定期患者が50人に到達すれば、<strong>不眠症だけで月25〜50万円の安定収益</strong>を確保できます。この収益は患者が治療を継続する限り毎月発生するため、新規集患のコストを抑えながら経営を安定させる効果があります。
        </p>

        <StatGrid stats={[
          { value: "5,000〜10,000", unit: "円/人月", label: "患者1人あたり月額収益" },
          { value: "25〜50", unit: "万円/月", label: "定期患者50人の月間収益" },
          { value: "8.4", unit: "か月", label: "平均治療継続期間" },
          { value: "4.2〜8.4", unit: "万円", label: "患者1人あたりLTV" },
        ]} />

        <p>
          月額費用（10万〜18万円）に対して、定期患者が<strong>20〜30人</strong>に達した時点で投資回収が完了します。不眠症患者は一度治療を開始すると平均8.4か月継続するため、LTV（患者生涯価値）は4.2〜8.4万円に達します。重要なのは、自動フォロー体制が<strong>少ない医師リソースでも多くの患者をカバーできる</strong>仕組みを作っていることです。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">定期処方の継続率</h3>

        <DonutChart
          percentage={78}
          label="3か月時点の継続率"
          sublabel="Lオペ導入クリニック平均"
        />

        <p>
          導入クリニックでは、3か月時点の定期処方継続率が<strong>78%</strong>に達しています。業界平均の45%と比較して73%の改善であり、この差が累積的な収益差となって表れます。6か月時点でも60%以上の患者が治療を継続しており、安定した収益基盤が形成されています。
        </p>
      </section>

      {/* ── セクション7: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 安全管理とリピートを両立する不眠症オンライン診療</h2>

        <Callout type="success" title="不眠症オンライン診療 成功の3つの柱">
          <ul className="mt-1 space-y-1">
            <li>・<strong>安全な薬剤選択</strong>: オレキシン受容体拮抗薬・メラトニン受容体作動薬を第一選択とし、BZ系は継続処方に限定</li>
            <li>・<strong>LINE問診で診察前に情報収集</strong>: 事前問診で睡眠状態を把握し、限られた診察時間を有効活用</li>
            <li>・<strong>Lオペで定期フォローを自動化</strong>: フォローアップルール・セグメント配信・LINE予約管理で治療継続率78%を達成</li>
          </ul>
        </Callout>

        <p>
          不眠症は、成人の5人に1人が抱える「ありふれた疾患」でありながら、受診率の低さゆえに<strong>大きな未開拓市場</strong>が存在します。オンライン診療によって受診のハードルを下げ、Lオペ for CLINICの自動フォロー体制で治療継続率を高めることで、<strong>患者の睡眠改善とクリニックの安定収益を同時に実現</strong>できます。
        </p>

        <p>
          月1回の定期フォロー型診療は、医師のリソースを効率的に活用しながら、患者数の積み上げによって収益基盤を強化するストック型のモデルです。不眠症のオンライン診療を始めるにあたり、<strong>安全管理の仕組みとフォロー体制の自動化</strong>を最初から設計に組み込むことが、長期的な成功の鍵になります。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連記事</h3>
        <ul className="space-y-1 text-gray-700">
          <li>
            <Link href="/lp/column/online-clinic-complete-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療完全ガイド</Link> — オンライン診療の始め方から運用まで網羅的に解説
          </li>
          <li>
            <Link href="/lp/column/online-clinic-regulations" className="text-sky-600 underline hover:text-sky-800">オンライン診療の制度と規制ガイド</Link> — 診療報酬・処方ルール・法的要件を整理
          </li>
          <li>
            <Link href="/lp/column/clinic-repeat-rate-improvement" className="text-sky-600 underline hover:text-sky-800">リピート率改善ガイド</Link> — 定期フォローで患者の再来院率を向上させる手法
          </li>
          <li>
            <Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談・お問い合わせ</Link> — 不眠症オンライン診療の運用設計をご相談いただけます
          </li>
        </ul>
      </section>
    
      {/* ── FAQ ── */}
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
