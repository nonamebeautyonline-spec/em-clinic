import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  BarChart,
  StatGrid,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-ad-friend-acquisition")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "LINE友だち追加広告（LAP）の運用ガイドの効果はどのくらいで実感できますか？", a: "施策にもよりますが、LINE配信やSEO対策は1〜3ヶ月で効果が出始めるケースが多いです。特にセグメント配信は導入直後から開封率・クリック率の改善が見られます。継続的な改善サイクルを回すことで、半年後には大きな成果に繋がります。" },
  { q: "集患施策にかかるコストはどのくらいですか？", a: "LINE公式アカウント自体は無料で開設でき、月額5,000〜15,000円程度で配信が可能です。Web広告と比較してCPA（獲得単価）が低く、既存患者のリピート促進にも効果的なため、費用対効果は非常に高いです。" },
  { q: "Web広告とLINE配信はどちらが効果的ですか？", a: "新規集患にはWeb広告、リピート促進にはLINE配信が効果的です。LINE配信はメッセージ開封率90%と圧倒的なリーチ力を持ち、既存患者への再来院促進・自費診療の訴求に適しています。両方を組み合わせるのが最も効率的です。" },
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
  "LINE友だち追加広告（LAP）の仕組みとクリニックでの活用メリット",
  "CPA目安とクリニック向けターゲティング設定の具体例",
  "クリエイティブの作り方と広告審査通過のポイント",
  "広告→リッチメニュー→予約の導線設計で費用対効果を最大化",
];

const toc = [
  { id: "what-is-lap", label: "LINE友だち追加広告（LAP）とは" },
  { id: "ad-types", label: "LINE広告の種類と特徴" },
  { id: "targeting", label: "クリニック向けターゲティング設定" },
  { id: "creative", label: "クリエイティブの作り方" },
  { id: "funnel-design", label: "広告→リッチメニュー→予約の導線設計" },
  { id: "online-nationwide", label: "オンライン診療の広域集患" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINE友だち追加広告（LAP: LINE Ads Platform）は、LINE上で直接友だち追加を促す広告フォーマットです。Google広告やSNS広告と異なり、<strong>獲得した友だちにLINEで継続的にアプローチできる</strong>のが最大の特徴です。本記事では、クリニックがLAP広告を活用して費用対効果の高い集患を行う方法を解説します。
      </p>

      {/* ── LAPとは ── */}
      <section>
        <h2 id="what-is-lap" className="text-xl font-bold text-gray-800">LINE友だち追加広告（LAP）とは</h2>
        <p>LINE友だち追加広告は、LINEアプリ内のタイムラインやトークリストなどに表示される広告で、タップするだけでLINE公式アカウントの友だち追加が完了する仕組みです。ランディングページへの遷移が不要なため、コンバージョンまでのステップが少なく、高い友だち追加率が期待できます。</p>

        <StatGrid stats={[
          { value: "9,700", unit: "万人", label: "LINEの月間利用者数" },
          { value: "86", unit: "%", label: "日本人口カバー率" },
          { value: "150〜400", unit: "円", label: "友だち追加CPA目安" },
          { value: "1", unit: "タップ", label: "友だち追加完了" },
        ]} />

        <p>クリニック業界では、友だち追加後にリッチメニューや自動応答で予約や問診へ誘導できるため、Web広告よりも高いコンバージョン率が期待できます。特にLINEを日常的に利用する幅広い年齢層にリーチできる点が、Google検索広告との大きな違いです。</p>
      </section>

      {/* ── 広告の種類 ── */}
      <section>
        <h2 id="ad-types" className="text-xl font-bold text-gray-800">LINE広告の種類と特徴</h2>
        <p>LINE広告にはいくつかの配信面（掲載場所）があります。友だち追加広告として利用できる主な配信面を把握しておきましょう。</p>

        <ComparisonTable
          headers={["配信面", "特徴", "クリニック向け適性"]}
          rows={[
            ["トークリスト", "最上部に表示、視認性が高い", "◎"],
            ["LINE NEWS", "ニュース閲覧中に表示", "○"],
            ["LINE VOOM", "動画・画像フィード内に表示", "○"],
            ["ホーム", "LINEホーム画面に表示", "△"],
            ["LINE広告ネットワーク", "外部アプリにも配信", "△"],
          ]}
        />

        <Callout type="info" title="トークリスト広告がおすすめ">
          クリニックの友だち追加広告では、トークリスト上部に表示される広告が最も費用対効果が高い傾向があります。LINEを開くたびに目に入る位置のため、認知→友だち追加の転換率が高くなります。
        </Callout>
      </section>

      {/* ── ターゲティング ── */}
      <section>
        <h2 id="targeting" className="text-xl font-bold text-gray-800">クリニック向けターゲティング設定</h2>
        <p>LINE広告のターゲティングは、年齢・性別・地域・興味関心などを組み合わせて設定できます。クリニックの診療科目とターゲット患者層に合わせて最適化しましょう。</p>

        <h3 className="text-lg font-bold text-gray-800 mt-6">対面診療クリニックの場合</h3>
        <FlowSteps steps={[
          { title: "エリア設定", desc: "クリニック所在地から半径3〜10km圏内に絞り込み。通勤圏を考慮して、最寄り駅の周辺エリアも含めると効果的です。" },
          { title: "年齢・性別設定", desc: "診療科に合わせて調整。美容皮膚科なら20〜40代女性、AGA治療なら30〜50代男性など。" },
          { title: "興味関心設定", desc: "「美容・健康」「ヘルスケア」などの興味関心カテゴリを活用。ただし絞りすぎるとリーチが減るため、初期は広めに設定して効果を見ながら調整します。" },
        ]} />

        <h3 className="text-lg font-bold text-gray-800 mt-6">CPA目安（診療科別）</h3>
        <BarChart data={[
          { label: "美容皮膚科", value: 250, color: "#ec4899" },
          { label: "AGA・ED", value: 300, color: "#3b82f6" },
          { label: "一般内科", value: 200, color: "#22c55e" },
          { label: "オンライン診療", value: 180, color: "#6366f1" },
          { label: "歯科", value: 350, color: "#f59e0b" },
        ]} unit="円/友だち追加" />

        <Callout type="warning" title="CPAはあくまで目安">
          上記のCPA（友だち追加1件あたりの広告費）は一般的な目安です。エリアの競合状況やクリエイティブの質によって大きく変動します。まずは少額（月5〜10万円）でテスト配信を行い、自院のCPAを把握することが重要です。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── クリエイティブ ── */}
      <section>
        <h2 id="creative" className="text-xl font-bold text-gray-800">クリエイティブの作り方</h2>
        <p>LINE友だち追加広告のクリエイティブは、限られたスペースで「友だち追加するメリット」を瞬時に伝える必要があります。クリニック向け広告で効果の高いクリエイティブのパターンを紹介します。</p>

        <h3 className="text-lg font-bold text-gray-800 mt-6">効果の高いクリエイティブ要素</h3>
        <ul className="space-y-2 text-gray-700">
          <li><strong>友だち追加特典の明示</strong>：「LINE限定クーポン」「初回カウンセリング無料」など、追加するメリットを明確に提示</li>
          <li><strong>診療内容の分かりやすい訴求</strong>：「オンライン診療30分で完了」「AGA治療 月額○○円〜」など具体的な情報</li>
          <li><strong>安心感の演出</strong>：院内写真や医師の顔写真（許可取得済み）、「医師が直接対応」等のコピー</li>
          <li><strong>行動喚起</strong>：「今すぐ友だち追加」「LINEで簡単予約」など明確なCTA</li>
        </ul>

        <Callout type="warning" title="医療広告ガイドラインに注意">
          クリニックの広告は医療広告ガイドラインの対象です。「最安値」「日本一」などの比較優良広告、治療効果を保証する表現、ビフォーアフター写真の安易な使用は禁止されています。LINE広告の審査でもリジェクトの原因になるため、ガイドラインを遵守したクリエイティブを作成してください。
        </Callout>

        <StatGrid stats={[
          { value: "1.5", unit: "倍", label: "特典ありのCTR向上" },
          { value: "0.8", unit: "%", label: "平均クリック率" },
          { value: "30", unit: "%", label: "友だち追加転換率" },
          { value: "3", unit: "種類", label: "同時テスト推奨数" },
        ]} />
      </section>

      {/* ── 導線設計 ── */}
      <section>
        <h2 id="funnel-design" className="text-xl font-bold text-gray-800">広告→リッチメニュー→予約の導線設計</h2>
        <p>友だち追加はゴールではなく、スタートです。広告で獲得した友だちを予約・来院につなげるための導線設計が、費用対効果を左右する最大のポイントです。</p>

        <FlowSteps steps={[
          { title: "友だち追加直後：あいさつメッセージ", desc: "広告経由の友だちには専用のあいさつメッセージを設定。広告で訴求した特典や、次のアクション（予約・問診）への誘導リンクを含めます。" },
          { title: "リッチメニュー表示：メインの導線", desc: "予約ボタン・問診開始・クーポン確認などをリッチメニューに配置。広告で訴求した内容と一貫性のあるデザインで、迷わず次のステップに進めるようにします。" },
          { title: "ステップ配信：フォローアップ", desc: "友だち追加後3日以内に予約がなかった場合、リマインドメッセージを自動送信。段階的にクリニックの特徴や患者の声を伝えて、予約への動機づけを行います。" },
          { title: "予約完了→来院：LTV最大化", desc: "来院後はフォローアップ配信で再診を促進。1人の友だちから長期的な売上につなげる設計が、広告投資のROIを高めます。" },
        ]} />

        <ResultCard
          before="広告CPA 300円 × 予約率 10% = 予約CPA 3,000円"
          after="広告CPA 250円 × 予約率 25% = 予約CPA 1,000円"
          metric="導線最適化で予約CPAが3分の1に改善"
          description="リッチメニュー＋ステップ配信の導線設計が鍵"
        />

        <p>友だち追加後の導線設計については<Link href="/lp/column/clinic-line-friends-growth" className="text-sky-600 underline hover:text-sky-800">LINE友だち増加施策の記事</Link>でも詳しく解説しています。</p>
      </section>

      {/* ── オンライン診療の広域集患 ── */}
      <section>
        <h2 id="online-nationwide" className="text-xl font-bold text-gray-800">オンライン診療の広域集患</h2>
        <p>オンライン診療を提供するクリニックにとって、LINE友だち追加広告は全国から患者を集患できる強力なチャネルです。対面クリニックのようなエリア制限がないため、広域ターゲティングで効率的に友だちを獲得できます。</p>

        <BarChart data={[
          { label: "対面（半径5km）", value: 35, color: "#f59e0b" },
          { label: "対面（半径10km）", value: 60, color: "#3b82f6" },
          { label: "オンライン（都道府県）", value: 120, color: "#6366f1" },
          { label: "オンライン（全国）", value: 250, color: "#22c55e" },
        ]} unit="万人 リーチ可能数（目安）" />

        <h3 className="text-lg font-bold text-gray-800 mt-6">オンライン診療広告のポイント</h3>
        <ul className="space-y-2 text-gray-700">
          <li><strong>広域×興味関心で絞り込み</strong>：全国配信でも興味関心（ダイエット、薄毛対策等）で絞ることでCPAを適正化</li>
          <li><strong>「自宅で完結」を訴求</strong>：来院不要・スマホで診察・薬は自宅配送、というオンライン診療のメリットを明確に伝える</li>
          <li><strong>類似オーディエンス活用</strong>：既存の友だちリストをもとに、類似ユーザーへ広告を配信して質の高い友だちを獲得</li>
        </ul>

        <Callout type="success" title="オンライン診療×LAPの好相性">
          オンライン診療はLINE上で予約・問診・決済・配送通知まで完結できるため、友だち追加からの患者体験がシームレスです。<Link href="/lp/column/self-pay-clinic-ad-roi" className="text-sky-600 underline hover:text-sky-800">自費クリニックの広告ROI改善</Link>や<Link href="/lp/column/online-clinic-marketing-guide" className="text-sky-600 underline hover:text-sky-800">オンラインクリニックのマーケティング戦略</Link>と併せて、広告投資の全体最適を図りましょう。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <p>LINE友だち追加広告（LAP）は、クリニックの新規患者獲得において高い費用対効果が期待できる広告手法です。友だち追加がゴールではなく、その後のリッチメニュー・ステップ配信による予約導線の設計が、投資回収の鍵を握ります。</p>

        <Callout type="point" title="LAP運用成功の3つのポイント">
          <ul className="space-y-1 text-gray-700">
            <li>まず少額（月5〜10万円）でテストし、自院のCPAと予約率を把握する</li>
            <li>友だち追加後の導線（あいさつメッセージ→リッチメニュー→予約）を事前に整備する</li>
            <li>クリエイティブは3パターン以上を同時テストし、効果の高いものに予算を集中する</li>
          </ul>
        </Callout>

        <p>Lオペのリッチメニュー機能・ステップ配信・予約管理・患者CRMを活用すれば、広告で獲得した友だちを来院・リピートにつなげる導線を効率的に構築できます。広告の「獲得」だけでなく「育成→来院→リピート」まで一気通貫で設計しましょう。</p>
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
