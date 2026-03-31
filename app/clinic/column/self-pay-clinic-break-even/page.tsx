import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  InlineCTA,
  DonutChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";

const slug = "self-pay-clinic-break-even";
const title = "自費クリニックの損益分岐点と収支管理 — 月次で見るべき経営指標と改善アクション";
const description = "自費クリニックの損益分岐点の計算方法と月次で追うべき経営指標を解説。固定費・変動費の分解、客単価と患者数のバランス、改善アクションの優先順位を紹介します。";
const date = "2026-03-26";
const category = "経営戦略";
const readTime = "11分";
const tags = ["損益分岐点", "収支管理", "経営指標", "固定費", "変動費", "自費診療"];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${slug}` },
  openGraph: { title, description, url: `${SITE_URL}/clinic/column/${slug}`, type: "article", publishedTime: date },
};


const faqItems = [
  { q: "自費クリニックの損益分岐点と収支管理で最も重要なポイントは何ですか？", a: "資金計画と集患戦略の両立です。開業資金だけでなく、運転資金（最低6ヶ月分）の確保と、開業前からのLINE公式アカウントやWebサイトによる認知獲得が成功の鍵です。" },
  { q: "開業前から準備すべきことは何ですか？", a: "開業3ヶ月前からLINE公式アカウントの開設、Webサイトの公開、Googleビジネスプロフィールの登録を始めましょう。内覧会の案内や開業日のお知らせをLINEで配信することで、開業初月から安定した来院数を確保できます。" },
  { q: "クリニック経営で失敗しやすいポイントは？", a: "集患に過度に広告費をかけてしまうこと、リピート率を軽視すること、DX化を後回しにすることが代表的な失敗パターンです。既存患者のLTV（生涯価値）を最大化する仕組みを早期に構築することが重要です。" },
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
  "損益分岐点＝固定費÷限界利益率 — 自費クリニックは変動費率が低いため固定費管理が命",
  "月次で追うべき5指標: 新患数・客単価・リピート率・変動費率・固定費率",
  "客単価を10%上げるだけで損益分岐点の患者数が9%減少 — 改善アクションの優先順位を解説",
];

const toc = [
  { id: "bep-basics", label: "損益分岐点の基礎" },
  { id: "cost-structure", label: "自費クリニックのコスト構造" },
  { id: "bep-calculation", label: "損益分岐点の計算方法" },
  { id: "monthly-kpi", label: "月次で見るべき5つの指標" },
  { id: "improvement-actions", label: "改善アクションの優先順位" },
  { id: "simulation", label: "収支改善シミュレーション" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={slug} breadcrumbLabel="経営戦略" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        自費クリニックの経営は「売上＝正義」ではありません。<strong>どの売上水準で黒字になるか（損益分岐点）</strong>を正確に把握し、月次で収支を管理することが安定経営の基盤です。本記事では、損益分岐点の計算方法から月次で追うべき経営指標、改善アクションの優先順位まで、<strong>自費クリニックに特化した収支管理の実践法</strong>を解説します。固定費の最適化については<Link href="/clinic/column/clinic-fixed-cost-optimization" className="text-sky-600 underline hover:text-sky-800">固定費最適化ガイド</Link>もあわせてご覧ください。
      </p>

      {/* ── セクション1: 損益分岐点の基礎 ── */}
      <section>
        <h2 id="bep-basics" className="text-xl font-bold text-gray-800">損益分岐点の基礎 — 「いくら売れば赤字にならないか」</h2>

        <p>
          損益分岐点（BEP: Break-Even Point）とは、<strong>売上とコストがちょうど等しくなる点</strong>のことです。この点を超えれば利益が出て、下回れば赤字になります。公式は「<strong>損益分岐点売上＝固定費÷限界利益率</strong>」です。限界利益率とは「（売上−変動費）÷売上」で計算され、売上1円あたりいくらが固定費の回収に使えるかを示します。
        </p>

        <p>
          自費クリニックの大きな特徴は<strong>変動費率が低い</strong>点です。保険診療クリニックでは薬剤費が売上の30〜40%を占めることがありますが、自費クリニック（美容・AGA・ダイエットなど）では薬剤・材料費の比率が15〜25%程度に収まるケースが多いです。つまり限界利益率が75〜85%と高く、固定費をカバーする「稼ぐ力」が強い一方で、<strong>固定費が増えると損益分岐点が急激に上昇する</strong>リスクがあります。
        </p>

        <StatGrid stats={[
          { value: "75-85", unit: "%", label: "自費クリニックの限界利益率" },
          { value: "15-25", unit: "%", label: "変動費率の目安" },
          { value: "250-400", unit: "万円/月", label: "固定費の典型的な水準" },
          { value: "300-500", unit: "万円/月", label: "損益分岐点売上の目安" },
        ]} />
      </section>

      {/* ── セクション2: 自費クリニックのコスト構造 ── */}
      <section>
        <h2 id="cost-structure" className="text-xl font-bold text-gray-800">自費クリニックのコスト構造 — 固定費と変動費を分解する</h2>

        <p>
          収支管理の第一歩は<strong>すべてのコストを「固定費」と「変動費」に分類する</strong>ことです。固定費は患者数に関わらず毎月発生するコスト（家賃・人件費・設備リース・ツール月額等）、変動費は患者数に比例して増減するコスト（薬剤費・材料費・決済手数料等）です。クリニックのコストのうち固定費が70〜80%を占めるため、固定費の管理が経営の生命線です。なかでも最大の固定費項目である人件費の最適化は<Link href="/clinic/column/clinic-labor-cost-optimization" className="text-sky-600 underline hover:text-sky-800">人件費最適化ガイド</Link>で詳しく解説しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">自費クリニックのコスト内訳例（月間売上500万円）</h3>

        <BarChart
          data={[
            { label: "人件費（固定）", value: 180, color: "bg-red-400" },
            { label: "家賃（固定）", value: 60, color: "bg-sky-500" },
            { label: "広告費（半固定）", value: 50, color: "bg-violet-500" },
            { label: "薬剤・材料費（変動）", value: 75, color: "bg-green-500" },
            { label: "設備リース（固定）", value: 25, color: "bg-indigo-500" },
            { label: "ツール費用（固定）", value: 15, color: "bg-amber-400" },
            { label: "決済手数料（変動）", value: 15, color: "bg-teal-400" },
            { label: "その他", value: 10, color: "bg-gray-400" },
          ]}
          unit="万円/月"
        />

        <p>
          上記の例では、固定費合計が約330万円、変動費合計が約100万円です。広告費は「固定予算で運用する」場合は固定費に分類しますが、「売上連動で増減させる」場合は変動費に近い扱いになります。自院のコストをこのように分類し、<strong>毎月の変動を追跡する仕組み</strong>を作ることが重要です。
        </p>

        <DonutChart
          percentage={77}
          label="固定費比率"
          sublabel="自費クリニックの固定費比率は77% — 固定費管理が経営の命"
        />
      </section>

      {/* ── セクション3: 損益分岐点の計算方法 ── */}
      <section>
        <h2 id="bep-calculation" className="text-xl font-bold text-gray-800">損益分岐点の計算方法 — 具体例で理解する</h2>

        <p>
          実際に損益分岐点を計算してみましょう。月間固定費330万円、変動費率20%（限界利益率80%）の自費クリニックの場合、損益分岐点売上は<strong>330万円÷0.80＝412.5万円</strong>です。つまり月413万円以上の売上があれば黒字、それ以下なら赤字です。
        </p>

        <p>
          これを<strong>患者数に変換</strong>すると経営判断に使いやすくなります。客単価が2万円の場合、損益分岐点の患者数は412.5万円÷2万円＝<strong>約207人/月</strong>です。営業日数22日で割ると、1日あたり約9.4人。この「1日9.4人」が赤字にならないための最低ラインです。
        </p>

        <ComparisonTable
          headers={["シナリオ", "固定費", "限界利益率", "BEP売上", "BEP患者数（単価2万円）"]}
          rows={[
            ["現状", "330万円", "80%", "412.5万円", "207人/月"],
            ["固定費10%削減", "297万円", "80%", "371.3万円", "186人/月"],
            ["客単価2.5万円に", "330万円", "80%", "412.5万円", "165人/月"],
            ["変動費率を15%に", "330万円", "85%", "388.2万円", "194人/月"],
          ]}
        />

        <p>
          上の表から分かるように、<strong>固定費を10%削減すると損益分岐点が21人減少</strong>し、<strong>客単価を25%上げると42人減少</strong>します。経営改善のレバーとして「客単価の向上」が最もインパクトが大きいことが数字で明確になります。客単価の設計手法については<Link href="/clinic/column/self-pay-clinic-pricing-strategy" className="text-sky-600 underline hover:text-sky-800">自費クリニックの価格設定戦略</Link>も参考にしてください。
        </p>

        <Callout type="info" title="損益分岐点は「安全余裕率」とセットで使う">
          損益分岐点だけでなく<strong>安全余裕率</strong>（＝（実際売上−BEP売上）÷実際売上）も把握しましょう。安全余裕率20%以上が健全な経営の目安です。月間売上500万円でBEPが412万円なら安全余裕率は17.5% —— やや低めです。25%以上を目標に固定費削減や客単価向上に取り組むことをおすすめします。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション4: 月次で見るべき5つの指標 ── */}
      <section>
        <h2 id="monthly-kpi" className="text-xl font-bold text-gray-800">月次で見るべき5つの経営指標</h2>

        <p>
          損益分岐点を理解した上で、<strong>月次で追跡すべき5つのKPI</strong>を設定しましょう。これらの指標を毎月モニタリングすることで、問題の早期発見と迅速な対応が可能になります。
        </p>

        <FlowSteps steps={[
          { title: "指標1: 新患数", desc: "月間の新規患者数。広告ROIの指標でもある。目標は月30〜50人（規模による）。前月比で10%以上減少したら広告施策を見直す。" },
          { title: "指標2: 客単価", desc: "売上÷患者数。メニュー構成と提案力の指標。自費クリニックの目標は1.5〜3万円。低下傾向なら高単価メニューの提案を強化。" },
          { title: "指標3: リピート率", desc: "2回以上来院した患者の割合。LTV最大化の基盤。目標は60%以上。低下したらフォローアップ施策を見直す。" },
          { title: "指標4: 変動費率", desc: "変動費÷売上。原価管理の指標。目標は20%以下。上昇傾向なら仕入先の見直しやメニュー原価の再計算を行う。" },
          { title: "指標5: 固定費率", desc: "固定費÷売上。経営の安定度を示す。目標は65%以下。75%を超えたら固定費の即時見直しが必要。" },
        ]} />

        <p>
          これらの指標は<strong>単月の絶対値ではなく「推移（トレンド）」</strong>で見ることが重要です。客単価が2万円から1.8万円に下がった場合、単月の数字だけでは季節要因かもしれません。しかし3か月連続で下がっていれば構造的な問題です。<strong>少なくとも6か月分のトレンドをグラフ化</strong>し、変化の方向を常に把握しておきましょう。
        </p>

        <StatGrid stats={[
          { value: "30-50", unit: "人/月", label: "新患数の目標" },
          { value: "1.5-3", unit: "万円", label: "客単価の目標" },
          { value: "60", unit: "%以上", label: "リピート率の目標" },
          { value: "65", unit: "%以下", label: "固定費率の目標" },
        ]} />
      </section>

      {/* ── セクション5: 改善アクションの優先順位 ── */}
      <section>
        <h2 id="improvement-actions" className="text-xl font-bold text-gray-800">改善アクションの優先順位 — どこから手をつけるか</h2>

        <p>
          収支が目標を下回った場合、闇雲に施策を打つのではなく<strong>インパクトの大きい順</strong>に改善アクションを実行します。自費クリニックにおける改善インパクトの大きさは、一般的に「客単価向上 ＞ リピート率向上 ＞ 新患数増加 ＞ 固定費削減 ＞ 変動費削減」の順です。
        </p>

        <ComparisonTable
          headers={["アクション", "具体策", "効果の目安", "実行難易度"]}
          rows={[
            ["客単価向上", "カウンセリング強化・セット提案・アップセル", "売上+15〜25%", "中"],
            ["リピート率向上", "LINEフォロー・定期配送・リマインド配信", "LTV+30〜50%", "低〜中"],
            ["新患数増加", "広告強化・SEO・口コミ促進", "売上+10〜20%", "高"],
            ["固定費削減", "ツール統合・テナント交渉・人員最適化", "コスト▲5〜15%", "中"],
            ["変動費削減", "仕入先見直し・ロット交渉", "コスト▲2〜5%", "低"],
          ]}
        />

        <p>
          客単価の向上が最もインパクトが大きい理由は、<strong>追加コストがほとんどかからない</strong>からです。既に来院している患者に対してカウンセリングの質を高め、適切なメニュー提案を行うだけで単価は上がります。一方、新患数の増加は広告費という追加コストが発生するため、ROIを慎重に管理する必要があります。
        </p>

        <p>
          リピート率の向上も費用対効果が高い施策です。新患1人を獲得するコスト（CPA）は1〜3万円ですが、<strong>既存患者のリピートにかかるコストはLINEのフォロー配信で数十円</strong>です。LINEで定期的にフォローアップメッセージを送り、再来院のきっかけを作ることで、低コストでリピート率を向上させられます。リピート処方の仕組み化については<Link href="/clinic/column/self-pay-clinic-repeat-prescription-revenue" className="text-sky-600 underline hover:text-sky-800">リピート処方で安定収益を作る方法</Link>で詳しく解説しています。
        </p>
      </section>

      {/* ── セクション6: 収支改善シミュレーション ── */}
      <section>
        <h2 id="simulation" className="text-xl font-bold text-gray-800">収支改善シミュレーション — 3つの施策で利益2倍</h2>

        <p>
          ここまでの内容を踏まえて、<strong>具体的な収支改善シミュレーション</strong>を見てみましょう。月間売上500万円・固定費330万円・変動費率20%のクリニックが、3つの施策を同時に実行した場合の効果です。
        </p>

        <ResultCard
          before="改善前: 売上500万円 − 固定費330万円 − 変動費100万円 ＝ 利益70万円"
          after="改善後: 売上625万円 − 固定費310万円 − 変動費109万円 ＝ 利益206万円"
          metric="月間利益が70万円→206万円に（約3倍）"
          description="客単価15%UP＋リピート率10pt向上＋固定費6%削減の複合効果。"
        />

        <ComparisonTable
          headers={["項目", "改善前", "改善後", "変化"]}
          rows={[
            ["客単価", "2.0万円", "2.3万円", "+15%"],
            ["月間患者数", "250人", "272人", "+22人（リピート増）"],
            ["月間売上", "500万円", "625万円", "+125万円"],
            ["固定費", "330万円", "310万円", "▲20万円"],
            ["変動費", "100万円", "109万円", "+9万円"],
            ["月間利益", "70万円", "206万円", "+136万円"],
          ]}
        />

        <p>
          注目すべきは、<strong>どれか1つの施策だけでは利益2倍にはならない</strong>点です。客単価15%アップだけなら利益は120万円、リピート率向上だけなら利益は105万円。しかし3つを組み合わせると<strong>複合効果で利益206万円</strong>に達します。改善施策は個別ではなく組み合わせて実行することで、指数関数的な効果を生み出します。
        </p>

        <Callout type="point" title="月次PL（損益計算書）を必ず作成する">
          上記のような分析を毎月行うためには、<strong>月次PL（損益計算書）の作成</strong>が不可欠です。税理士に依頼すると翌月末〜翌々月になることもあるため、簡易的でもよいのでクリニック内部で月初に前月のPLを作成する習慣をつけましょう。固定費・変動費・限界利益率・安全余裕率を毎月チェックし、異変があれば即座にアクションを取る体制が理想です。
        </Callout>
      </section>

      {/* ── セクション7: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 数字で経営を可視化し、感覚経営から脱却する</h2>

        <Callout type="success" title="収支管理の4つの鉄則">
          <ul className="mt-1 space-y-1">
            <li>・<strong>損益分岐点を毎月計算</strong>し、安全余裕率20%以上を維持する</li>
            <li>・<strong>5つのKPI</strong>（新患数・客単価・リピート率・変動費率・固定費率）を月次追跡</li>
            <li>・改善は<strong>「客単価→リピート率→新患数→固定費→変動費」</strong>の順に着手</li>
            <li>・施策は<strong>組み合わせて実行</strong>し、複合効果を最大化する</li>
          </ul>
        </Callout>

        <p>
          自費クリニックの経営は「なんとなく黒字」では不十分です。<strong>いくらで黒字になるか、何人の患者で黒字になるか</strong>を常に数字で把握し、月次でモニタリングする仕組みを構築しましょう。数字に基づく経営判断は、感覚経営よりもはるかに精度が高く、再現性があります。開業初期の資金計画と合わせて管理したい方は<Link href="/clinic/column/clinic-opening-fund-guide" className="text-sky-600 underline hover:text-sky-800">開業資金の調達方法</Link>もあわせてご覧ください。
        </p>

        <p>
          LINEを活用したリピート率の向上やフォローアップの自動化は、収支改善に直結する施策です。Lオペ for CLINICの患者管理・セグメント配信機能を活用することで、手間をかけずにリピート率を高め、損益分岐点からの安全余裕を確保できます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連記事</h3>
        <ul className="space-y-1 text-gray-700">
          <li>
            <Link href="/clinic/column/clinic-fixed-cost-optimization" className="text-sky-600 underline hover:text-sky-800">固定費最適化ガイド</Link> — 固定費を構造的に削減する方法
          </li>
          <li>
            <Link href="/clinic/column/self-pay-clinic-revenue-triple" className="text-sky-600 underline hover:text-sky-800">自費クリニック売上3倍の秘訣</Link> — 客単価とLTV向上の実践法
          </li>
          <li>
            <Link href="/clinic/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">KPIダッシュボード構築</Link> — 経営指標の可視化方法
          </li>
          <li>
            <Link href="/clinic/column/self-pay-clinic-repeat-prescription-revenue" className="text-sky-600 underline hover:text-sky-800">リピート処方で安定収益を作る方法</Link> — ストック型収益の構築
          </li>
          <li>
            <Link href="/clinic/contact" className="text-sky-600 underline hover:text-sky-800">無料相談・お問い合わせ</Link> — 収支改善のご相談はこちら
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
