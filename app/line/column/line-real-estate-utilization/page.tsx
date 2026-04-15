import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-real-estate-utilization")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "不動産会社がLINE公式アカウントを導入するメリットは？", a: "物件情報をリアルタイムに配信でき、内見予約もLINE上で完結します。電話やメールと比較して顧客の心理的ハードルが低く、問い合わせ数が30〜50%増加した事例があります。長期検討の顧客との接点を維持しやすい点も大きなメリットです。" },
  { q: "物件情報をLINEで配信する際の注意点は？", a: "一斉配信で全物件を送るのではなく、顧客の希望条件（エリア・間取り・予算）に基づいたセグメント配信が必須です。条件に合わない物件の配信はブロック率上昇の原因になります。また、宅建業法に基づく必要事項の記載にも注意してください。" },
  { q: "追客メッセージはどのタイミングで送るべき？", a: "内見後24時間以内のフォロー、1週間後の検討状況確認、1ヶ月後の新着物件案内が基本パターンです。ただし、顧客の温度感に応じて頻度を調整し、しつこい印象を与えないよう注意が必要です。" },
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
  "不動産業界特有のLINE活用ニーズと物件情報配信のセグメント設計",
  "内見予約から成約までのLINE上での追客シナリオ構築方法",
  "長期検討顧客との接点維持とナーチャリングの具体的施策",
];

const toc = [
  { id: "real-estate-line-needs", label: "不動産業界のLINE活用が注目される理由" },
  { id: "property-delivery", label: "物件情報のセグメント配信" },
  { id: "viewing-reservation", label: "内見予約のLINE化" },
  { id: "follow-up", label: "内見後の追客シナリオ" },
  { id: "long-term-nurturing", label: "長期検討顧客のナーチャリング" },
  { id: "contract-support", label: "契約手続きのサポート" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <ArticleLayout slug={self.slug} breadcrumbLabel="不動産活用" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        不動産業界は「検討期間が長い」「物件選びが個別性の高い」という特徴があり、顧客との継続的なコミュニケーションが成約率を大きく左右します。メールの開封率が低下する中、LINEの開封率<strong>約60〜80%</strong>は不動産営業にとって強力な武器です。内見予約のオンライン化、希望条件に基づく物件情報のセグメント配信、内見後のフォローアップ自動化など、不動産会社がLINEを活用して成約率を向上させる具体的な戦略を解説します。
      </p>

      <section>
        <h2 id="real-estate-line-needs" className="text-xl font-bold text-gray-800">不動産業界のLINE活用が注目される理由</h2>
        <p>不動産取引は顧客にとって人生の大きな決断であり、物件の検討期間は数週間から数ヶ月に及びます。この間に顧客との接点を維持し、適切な情報を提供し続けることが成約の鍵となります。</p>

        <StatGrid stats={[
          { value: "3〜6ヶ月", label: "平均的な物件検討期間" },
          { value: "30〜50%", label: "LINE導入後の問い合わせ増加率" },
          { value: "80%+", label: "LINEメッセージ開封率" },
        ]} />

        <Callout type="warning" title="従来の追客手法の限界">
          電話は出てもらえず、メールは開封されない。不動産営業の追客は「連絡がつかない」との戦いです。LINEなら既読確認も可能で、顧客の反応を見ながらアプローチのタイミングを最適化できます。
        </Callout>

        <ul className="list-disc pl-6 space-y-1">
          <li><strong>即時性</strong> — 新着物件をリアルタイムに通知。人気物件の先行案内が可能</li>
          <li><strong>ビジュアル訴求</strong> — 間取り図・内装写真・周辺環境をリッチメッセージで訴求</li>
          <li><strong>心理的ハードル低減</strong> — 電話よりも気軽に問い合わせ可能</li>
          <li><strong>長期フォロー</strong> — シナリオ配信で数ヶ月にわたる自動フォロー</li>
        </ul>
      </section>

      <section>
        <h2 id="property-delivery" className="text-xl font-bold text-gray-800">物件情報のセグメント配信</h2>
        <p>不動産のLINE活用で最も重要なのが、顧客の希望条件に合った物件情報のセグメント配信です。全物件を一斉配信すると、興味のない情報が多くなりブロック率が急上昇します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">セグメント条件の設計例</h3>
        <ComparisonTable
          headers={["セグメント項目", "分類例", "配信内容"]}
          rows={[
            ["希望エリア", "○○区 / △△駅徒歩10分", "エリア限定の新着物件"],
            ["間取り", "1LDK / 2LDK / 3LDK以上", "条件合致の物件のみ"],
            ["予算帯", "〜3,000万 / 〜5,000万", "予算内の物件＋少し上の掘り出し物"],
            ["物件種別", "賃貸 / 売買 / 投資用", "種別に応じた情報提供"],
            ["検討段階", "情報収集 / 内見希望 / 契約検討", "段階に応じたコンテンツ"],
          ]}
        />

        <p>セグメント配信の詳しい設計方法は<Link href="/line/column/line-segment-delivery-design-guide" className="text-sky-600 underline hover:text-sky-800">LINEセグメント配信設計ガイド</Link>で解説しています。</p>
      </section>

      <section>
        <h2 id="viewing-reservation" className="text-xl font-bold text-gray-800">内見予約のLINE化</h2>
        <p>内見予約をLINE上で完結させることで、予約のハードルを大幅に下げることができます。電話予約の場合は営業時間内しか対応できませんが、LINEなら24時間いつでも予約が可能です。</p>

        <FlowSteps steps={[
          { title: "物件選択", desc: "配信された物件情報から気になる物件をタップ" },
          { title: "希望日時入力", desc: "カレンダーから第1〜第3希望の日時を選択" },
          { title: "自動確認", desc: "営業担当の空き状況と照合し、確定日時を自動返信" },
          { title: "リマインド", desc: "内見前日にアクセス方法と持ち物を自動送信" },
        ]} />

        <ResultCard before="月25件" after="月42件" metric="内見予約数" description="LINE予約導入で内見予約数が68%増加。夜間・休日の予約が全体の45%を占める" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="follow-up" className="text-xl font-bold text-gray-800">内見後の追客シナリオ</h2>
        <p>内見後の追客は成約率を左右する最重要プロセスです。「検討します」と帰った顧客にいつ、どのような内容で連絡するかをシナリオ化しておくことで、属人的な営業スキルに依存しない追客が実現します。</p>

        <FlowSteps steps={[
          { title: "内見当日", desc: "お礼メッセージ＋内見物件の詳細資料（PDF）を送信" },
          { title: "翌日", desc: "「ご不明点はございませんか？」と質問を促すメッセージ" },
          { title: "3日後", desc: "類似条件の別物件を2〜3件提案" },
          { title: "1週間後", desc: "検討状況をヒアリング。条件変更があれば再提案" },
          { title: "2週間後", desc: "周辺エリアの相場情報や住環境コンテンツを配信" },
        ]} />

        <Callout type="success" title="自動追客の成果">
          不動産仲介B社では、LINE自動追客シナリオの導入により、内見から成約までの期間が平均45日から32日に短縮。営業1人あたりの月間成約数が1.5倍に向上しました。
        </Callout>
      </section>

      <section>
        <h2 id="long-term-nurturing" className="text-xl font-bold text-gray-800">長期検討顧客のナーチャリング</h2>
        <p>不動産購入は「いつかは買いたい」という潜在層が多く、すぐには成約に至らない顧客も数多くいます。こうした長期検討層に対して、定期的に有益な情報を提供し続けることが将来の成約につながります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">長期ナーチャリングの配信コンテンツ例</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>エリア情報</strong> — 希望エリアの再開発情報、新駅計画、商業施設オープン情報</li>
          <li><strong>相場レポート</strong> — 月次の価格動向や金利情報</li>
          <li><strong>住まいコラム</strong> — 住宅ローンの選び方、内見チェックリスト、引越しTips</li>
          <li><strong>成約事例</strong> — 同条件で物件を見つけた顧客のストーリー</li>
        </ul>

        <p className="text-sm font-semibold text-gray-600 mb-1">ナーチャリング期間別の成約率</p>
        <BarChart
          data={[
            { label: "1ヶ月以内", value: 15 },
            { label: "1〜3ヶ月", value: 35 },
            { label: "3〜6ヶ月", value: 28 },
            { label: "6ヶ月以上", value: 22 },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="contract-support" className="text-xl font-bold text-gray-800">契約手続きのサポート</h2>
        <p>物件が決まった後も、契約に至るまでには多くの手続きが必要です。必要書類の案内、審査状況の共有、契約日程の調整など、LINEでこまめにコミュニケーションを取ることで顧客の不安を解消し、契約キャンセルのリスクを低減できます。</p>

        <ComparisonTable
          headers={["手続き", "従来の連絡方法", "LINE活用"]}
          rows={[
            ["書類案内", "電話で口頭説明", "画像付きチェックリストを送信"],
            ["審査状況", "顧客から電話で問い合わせ", "進捗をリアルタイムに通知"],
            ["日程調整", "電話で何度もやりとり", "カレンダー機能で一発確定"],
            ["入居前情報", "書面で郵送", "ライフライン手続きリンク集を配信"],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 不動産×LINEで成約率を向上させる</h2>
        <p>不動産業界におけるLINE活用は、物件情報の配信から契約サポートまで、顧客との全てのタッチポイントを最適化します。特に長期検討が前提の業界では、LINEによる継続的なコミュニケーションが競合との差別化につながります。</p>

        <FlowSteps steps={[
          { title: "集客", desc: "ポータルサイト・チラシからLINE友だち追加を誘導" },
          { title: "物件提案", desc: "希望条件に基づくセグメント配信で的確な物件案内" },
          { title: "内見", desc: "LINE上で予約完結。前日リマインドで来場率UP" },
          { title: "追客", desc: "自動シナリオで属人化しない追客を実現" },
          { title: "成約", desc: "契約手続きもLINEでサポートし不安を解消" },
        ]} />

        <p className="mt-4">LINE運用のKPI管理方法については<Link href="/line/column/line-kpi-dashboard-analytics-guide" className="text-sky-600 underline hover:text-sky-800">LINE分析KPIダッシュボードガイド</Link>もあわせてご覧ください。</p>
      </section>

      <p className="text-xs text-gray-400 mt-8 mb-2">※本記事の事例は、複数の導入実績をもとに再構成したものです。実際の効果はご利用状況により異なります。</p>

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
    </>
  );
}
