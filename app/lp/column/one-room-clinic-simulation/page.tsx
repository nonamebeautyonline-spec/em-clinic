import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "one-room-clinic-simulation")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "ワンルームマンション（月10万円）でオンライン診療を開業する場合の初期費用は100万円以下",
  "月間固定費は20〜28万円（家賃+Lオペのみ）で、損益分岐点はわずか29人",
  "AGA・ED・ピル・美容内服・GLP-1など自費診療メニュー別の収益モデルを詳細に解説",
  "患者200人規模で月の追加所得200〜300万円が見込めるモデルケースを提示",
];

const toc = [
  { id: "initial-cost", label: "初期費用の内訳" },
  { id: "monthly-fixed", label: "月間固定費の内訳" },
  { id: "revenue-model", label: "自費診療メニュー別の収益モデル" },
  { id: "simulation", label: "患者数別 月間売上シミュレーション" },
  { id: "breakeven", label: "損益分岐点の計算" },
  { id: "scale-up", label: "スケールアップの道筋" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「クリニック開業には数千万円の資金が必要」——そんな常識が、オンライン診療の普及で変わりつつあります。ワンルームマンション（月10万円程度）を診察室として活用すれば、<strong>初期費用100万円以下、月間固定費20〜28万円</strong>でオンライン診療クリニックを開業できます。本記事では、AGA・ED・ピル・美容内服・メディカルダイエット（GLP-1）など<strong>自費診療メニュー別の収益モデルと、患者数に応じた詳細な収支シミュレーション</strong>を解説します。
      </p>

      {/* ── セクション1: 初期費用の内訳 ── */}
      <section>
        <h2 id="initial-cost" className="text-xl font-bold text-gray-800">初期費用の内訳 — 100万円以下で開業可能</h2>

        <p>
          対面診療のクリニック開業では、内装工事だけで1,000万円以上かかるケースが一般的です。しかしオンライン診療に特化する場合、高額な内装工事は不要。ワンルームマンションに最低限の設備を整えるだけで、<strong>開業に必要な初期費用は50〜90万円</strong>に抑えられます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">初期費用の詳細内訳</h3>

        <ComparisonTable
          headers={["項目", "費用目安", "備考"]}
          rows={[
            ["保証金・敷金（ワンルーム）", "20〜30万円", "家賃の2〜3か月分"],
            ["PC・モニター", "10〜15万円", "ビデオ通話に十分なスペック"],
            ["Webカメラ・マイク・照明", "2〜5万円", "患者に清潔感を伝える画質が重要"],
            ["診療所開設届・関連手続き", "3〜5万円", "保健所への届出費用等"],
            ["家具（デスク・チェア等）", "3〜5万円", "長時間診療に耐えるチェアを推奨"],
            ["医師賠償責任保険", "5〜10万円", "年額。オンライン診療対応プラン"],
            ["通信環境の整備", "1〜3万円", "光回線の工事費・ルーター等"],
            ["雑費（名刺・印鑑・消耗品）", "2〜3万円", "開業時の事務用品"],
            ["合計", "50〜90万円", "対面クリニックの1/20以下"],
          ]}
        />

        <BarChart
          data={[
            { label: "保証金・敷金", value: 250000, color: "bg-sky-500" },
            { label: "PC・モニター", value: 125000, color: "bg-blue-500" },
            { label: "カメラ・マイク・照明", value: 35000, color: "bg-indigo-500" },
            { label: "開設届・手続き", value: 40000, color: "bg-violet-500" },
            { label: "家具", value: 40000, color: "bg-purple-500" },
            { label: "賠償責任保険（年額）", value: 75000, color: "bg-fuchsia-500" },
            { label: "通信環境", value: 20000, color: "bg-pink-400" },
            { label: "雑費", value: 25000, color: "bg-rose-400" },
          ]}
          unit="円"
        />

        <Callout type="info" title="対面クリニックとの初期費用比較">
          対面クリニックの開業費用は一般的に2,000〜5,000万円（内装工事1,000〜2,000万円、医療機器500〜1,500万円、保証金・テナント料500万円〜）。オンライン診療特化型なら<strong>初期費用は対面の1/30〜1/50</strong>に圧縮可能です。医療機器・内装工事が不要な分、開業のハードルが大幅に下がります。
        </Callout>

        <StatGrid stats={[
          { value: "50〜90", unit: "万円", label: "初期費用の目安" },
          { value: "0", unit: "円", label: "内装工事費" },
          { value: "0", unit: "円", label: "医療機器費" },
          { value: "1/30", unit: "以下", label: "対面比の初期費用" },
        ]} />
      </section>

      {/* ── セクション2: 月間固定費の内訳 ── */}
      <section>
        <h2 id="monthly-fixed" className="text-xl font-bold text-gray-800">月間固定費の内訳 — 月20〜28万円の超低コスト運営</h2>

        <p>
          オンライン診療クリニックの最大のメリットは、<strong>月間固定費を極めて低く抑えられる</strong>点です。対面クリニックでは家賃・人件費・リース料だけで月100万円を超えることが珍しくありませんが、ワンルーム開業なら<strong>月20〜28万円</strong>に収まります。内装工事も高額な医療機器も不要なため、大きな固定費は家賃とLオペの月額だけです。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">固定費（患者数に関わらず毎月発生）</h3>

        <ComparisonTable
          headers={["項目", "月額費用", "内容"]}
          rows={[
            ["家賃（ワンルーム）", "10万円", "都心部でも10万円前後で確保可能"],
            ["Lオペ for CLINIC", "10〜18万円", "LINE予約管理・問診・CRM・配送管理・決済連携すべて込み"],
            ["人件費", "0円", "Dr1人で運営可能（スタッフ不要）"],
            ["合計", "20〜28万円", "対面クリニックの1/4〜1/5"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">変動費（患者数に応じて発生）</h3>

        <ComparisonTable
          headers={["項目", "1患者あたり費用", "内容"]}
          rows={[
            ["薬の仕入れ原価", "売上の30〜45%", "メニューにより異なる（GLP-1は高め）"],
            ["配送費", "500〜1,000円/回", "処方薬の患者宛発送費用"],
          ]}
        />

        <p>
          この固定費構造で特に重要なのが、<strong>Lオペ for CLINICによる業務の一元管理</strong>です。LINE予約管理、オンライン問診、セグメント配信、AI自動返信、リッチメニュー、患者CRM、配送管理、決済連携（Square）、ダッシュボード、フォローアップルール、タグ管理、テンプレートメッセージ——これらを月額10〜18万円で利用できます。個別にツールを契約する場合と比較して大幅なコスト削減になります。詳しくは<Link href="/lp/column/clinic-cost-reduction-30man" className="text-sky-600 underline hover:text-sky-800">クリニックの固定費を月30万円削減する方法</Link>をご覧ください。
        </p>

        <BarChart
          data={[
            { label: "家賃", value: 100000, color: "bg-sky-500" },
            { label: "Lオペ for CLINIC", value: 140000, color: "bg-blue-500" },
          ]}
          unit="円/月（固定費）"
        />

        <Callout type="point" title="人件費ゼロで運営可能な理由">
          Lオペ for CLINICのAI自動返信・LINE問診・自動リマインドにより、<strong>受付スタッフを雇わずに医師1人で運営</strong>できます。患者からの問い合わせはAIが自動応答し、予約・問診・フォローアップまでLINE上で完結。看護師も不要（オンライン診療のため処置なし）。人件費ゼロの運営体制が、ワンルーム開業の収益性を支えています。スタッフを1人雇う場合でも月20〜25万円程度で済みます。
        </Callout>

        <StatGrid stats={[
          { value: "20〜28", unit: "万円/月", label: "月間固定費の目安" },
          { value: "0", unit: "人", label: "必要スタッフ数" },
          { value: "10〜18", unit: "万円", label: "Lオペ月額" },
          { value: "1/4", unit: "以下", label: "対面比の固定費" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── セクション3: 自費診療メニュー別の収益モデル ── */}
      <section>
        <h2 id="revenue-model" className="text-xl font-bold text-gray-800">自費診療メニュー別の収益モデル</h2>

        <p>
          オンライン診療で取り扱える自費診療メニューは多岐にわたります。それぞれの<strong>患者単価・継続率・利益率</strong>を把握し、最適なメニュー構成を組むことが収益最大化のカギです。以下に主要メニューの収益モデルを整理します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">AGA（男性型脱毛症）治療</h3>
        <ComparisonTable
          headers={["項目", "数値", "備考"]}
          rows={[
            ["患者単価", "月8,000〜15,000円", "フィナステリド+ミノキシジルの処方"],
            ["平均継続期間", "8〜12か月", "効果実感まで3〜6か月が必要"],
            ["粗利率", "60〜70%", "薬剤原価は売上の30〜40%"],
            ["LTV（顧客生涯価値）", "8〜18万円", "継続率が収益を左右"],
          ]}
        />
        <p>
          AGA治療は<strong>月額課金型の安定収益</strong>が最大の魅力です。フィナステリド（月3,000〜5,000円）とミノキシジル（月5,000〜10,000円）のセット処方が主流。Lオペのフォローアップルール機能で<strong>処方タイミングに合わせた自動リマインド</strong>を送ることで、継続率を高められます。詳細は<Link href="/lp/column/aga-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">AGA治療のオンライン診療ガイド</Link>もご覧ください。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ED治療</h3>
        <ComparisonTable
          headers={["項目", "数値", "備考"]}
          rows={[
            ["患者単価", "1回4,000〜8,000円", "シルデナフィル・タダラフィル等"],
            ["購入頻度", "月1〜2回", "必要時処方が中心"],
            ["粗利率", "65〜75%", "ジェネリック活用で原価を抑制"],
            ["年間LTV", "5〜15万円", "リピート率が高い領域"],
          ]}
        />
        <p>
          ED治療は<strong>デリケートな悩みのためオンライン診療との親和性が極めて高い</strong>領域です。対面受診への心理的障壁が大きいため、オンラインでの需要が急速に拡大しています。Lオペのセグメント配信で<strong>前回処方から一定期間経過した患者に自動リマインド</strong>を送れば、リピート率が向上します。詳細は<Link href="/lp/column/ed-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">ED治療のオンライン診療ガイド</Link>もご参照ください。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ピル（低用量ピル・アフターピル）</h3>
        <ComparisonTable
          headers={["項目", "数値", "備考"]}
          rows={[
            ["患者単価", "月2,500〜4,000円", "低用量ピルの定期処方"],
            ["平均継続期間", "12〜24か月", "生活に組み込まれやすい"],
            ["粗利率", "50〜60%", "単価は低いが継続率が高い"],
            ["LTV（顧客生涯価値）", "3〜10万円", "長期継続が見込める"],
          ]}
        />
        <p>
          ピル処方は<strong>単価こそ低いものの継続率が非常に高い</strong>のが特徴です。月1回の定期処方として安定的な収益基盤になります。Lオペのタグ管理で処方サイクルを管理し、<strong>テンプレートメッセージで処方更新のタイミングを自動通知</strong>することで離脱を防げます。詳しくは<Link href="/lp/column/pill-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">ピルのオンライン診療ガイド</Link>をご覧ください。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">美容内服（美白・美肌サプリ等）</h3>
        <ComparisonTable
          headers={["項目", "数値", "備考"]}
          rows={[
            ["患者単価", "月5,000〜15,000円", "トラネキサム酸・ビタミンC等のセット"],
            ["平均継続期間", "6〜12か月", "効果を実感するまで2〜3か月"],
            ["粗利率", "55〜65%", "セット処方で単価アップが可能"],
            ["LTV（顧客生涯価値）", "3〜18万円", "クロスセルで拡大可能"],
          ]}
        />
        <p>
          美容内服は<strong>メニューの組み合わせで単価を上げやすい</strong>のが特徴。トラネキサム酸、ビタミンC、Lシステインなどのセット処方で月10,000〜15,000円のプランを提案できます。Lオペのリッチメニューを活用して<strong>患者自身がメニューを選択・追加できる導線</strong>を設計すれば、アップセルも自然に促進できます。詳細は<Link href="/lp/column/beauty-supplements-online-lope" className="text-sky-600 underline hover:text-sky-800">美容内服のオンライン診療ガイド</Link>もご参照ください。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">メディカルダイエット（GLP-1）</h3>
        <ComparisonTable
          headers={["項目", "数値", "備考"]}
          rows={[
            ["患者単価", "月30,000〜80,000円", "リベルサス・オゼンピック等"],
            ["平均継続期間", "3〜6か月", "目標体重達成で終了するケースが多い"],
            ["粗利率", "40〜55%", "薬剤原価が高めだが単価も高い"],
            ["LTV（顧客生涯価値）", "9〜48万円", "高単価×短期集中型"],
          ]}
        />
        <p>
          メディカルダイエット（GLP-1）は<strong>1患者あたりの単価が突出して高い</strong>カテゴリです。リベルサス（経口薬）は月30,000〜50,000円、オゼンピック・マンジャロ（注射薬）は月50,000〜80,000円が相場。薬剤原価は高めですが、<strong>少ない患者数でも大きな売上を確保</strong>できます。Lオペのダッシュボードで体重推移のフォローアップを行い、治療継続のモチベーション維持を支援できます。詳しくは<Link href="/lp/column/diet-glp1-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">メディカルダイエット（GLP-1）のオンライン診療ガイド</Link>をご覧ください。
        </p>

        <Callout type="point" title="複数メニューの組み合わせが収益安定のカギ">
          単一メニューに依存するとリスクが高まります。AGA＋ED、ピル＋美容内服など<strong>複数メニューを組み合わせる</strong>ことで、患者層の分散と売上の安定化を図れます。Lオペのセグメント配信で患者の属性（性別・年齢・診療メニュー）に応じた<strong>クロスセル提案</strong>を自動化することも可能です。
        </Callout>
      </section>

      {/* ── セクション4: 患者数別シミュレーション ── */}
      <section>
        <h2 id="simulation" className="text-xl font-bold text-gray-800">患者数別 月間売上シミュレーション</h2>

        <p>
          ここからは、実際にワンルームマンションでオンライン診療を行った場合の<strong>患者数別の月間収支シミュレーション</strong>を行います。メニューミックス（複数メニューの組み合わせ）を前提に、現実的な数値で試算しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">前提条件</h3>
        <ComparisonTable
          headers={["項目", "設定値"]}
          rows={[
            ["メニュー構成", "AGA 35%、ED 15%、ピル 20%、美容内服 15%、GLP-1 15%"],
            ["平均患者単価", "約15,000円/月（メニューミックス加重平均）"],
            ["薬仕入れ原価", "売上の約40%（メニューにより30〜45%）"],
            ["配送費", "1患者あたり約700円/回"],
            ["月間固定費", "24万円（家賃10万+Lオペ14万）"],
            ["人件費", "0円（Dr1人運営）"],
            ["診療時間", "1人あたり5〜10分（再診は5分程度）"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ケース1: 月間患者50人</h3>
        <ComparisonTable
          headers={["項目", "金額"]}
          rows={[
            ["月間売上", "75万円（50人 × 15,000円）"],
            ["薬仕入れ原価（40%）", "▲30万円"],
            ["配送費（50人 × 700円）", "▲3.5万円"],
            ["固定費（家賃+Lオペ）", "▲24万円"],
            ["営業利益", "17.5万円"],
          ]}
        />
        <p>
          患者50人の段階では営業利益は月17.5万円。<strong>開業初期（1〜3か月目）の現実的な数字</strong>です。固定費を十分に賄えており、ここから患者を増やしていくフェーズです。週に12〜13人の診療で達成できるため、<strong>副業や非常勤との兼業でも無理のない規模</strong>です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ケース2: 月間患者100人</h3>
        <ComparisonTable
          headers={["項目", "金額"]}
          rows={[
            ["月間売上", "150万円（100人 × 15,000円）"],
            ["薬仕入れ原価（40%）", "▲60万円"],
            ["配送費（100人 × 700円）", "▲7万円"],
            ["固定費（家賃+Lオペ）", "▲24万円"],
            ["営業利益", "59万円"],
          ]}
        />
        <p>
          患者100人で<strong>月59万円の営業利益</strong>。年間にすると708万円です。週25人のペース（1日5人×週5日）なので、1日の診療時間は1〜2時間程度。<strong>本業の合間に十分運営可能な規模</strong>であり、安定的な副収入源として機能します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ケース3: 月間患者200人</h3>
        <ComparisonTable
          headers={["項目", "金額"]}
          rows={[
            ["月間売上", "300万円（200人 × 15,000円）"],
            ["薬仕入れ原価（40%）", "▲120万円"],
            ["配送費（200人 × 700円）", "▲14万円"],
            ["固定費（家賃+Lオペ）", "▲24万円"],
            ["広告費（患者獲得用）", "▲20万円"],
            ["営業利益", "122万円"],
          ]}
        />
        <p>
          患者200人規模では<strong>月122万円の営業利益</strong>。広告費を月20万円投じて患者獲得を加速しても、十分な利益が残ります。1日10人×週5日のペースで、診療時間は1日2〜3時間。LTV向上の戦略については<Link href="/lp/column/self-pay-patient-ltv-maximize" className="text-sky-600 underline hover:text-sky-800">自費診療患者のLTV最大化戦略</Link>も参考にしてください。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">月の追加所得200〜300万円のモデルケース</h3>
        <ComparisonTable
          headers={["項目", "金額"]}
          rows={[
            ["月間患者数", "350〜450人"],
            ["月間売上", "525〜675万円"],
            ["薬仕入れ原価（40%）", "▲210〜270万円"],
            ["配送費", "▲24.5〜31.5万円"],
            ["固定費（家賃+Lオペ）", "▲24万円"],
            ["広告費", "▲30万円"],
            ["営業利益（月の追加所得）", "236〜319万円"],
          ]}
        />
        <p>
          メディカルダイエット（GLP-1）の比率を高めれば、<strong>より少ない患者数で200〜300万円の月間利益</strong>を実現できます。例えばGLP-1を30%（平均単価55,000円）に引き上げた場合、加重平均単価は約22,000円に上昇。患者250人でも営業利益200万円超が見込めます。
        </p>

        <BarChart
          data={[
            { label: "50人", value: 175000, color: "bg-sky-400" },
            { label: "100人", value: 590000, color: "bg-sky-500" },
            { label: "200人", value: 1220000, color: "bg-blue-500" },
            { label: "350人", value: 2360000, color: "bg-indigo-500" },
            { label: "450人", value: 3190000, color: "bg-violet-500" },
          ]}
          unit="円/月（営業利益）"
        />

        <StatGrid stats={[
          { value: "17.5", unit: "万円/月", label: "50人時の利益" },
          { value: "59", unit: "万円/月", label: "100人時の利益" },
          { value: "122", unit: "万円/月", label: "200人時の利益" },
          { value: "236〜319", unit: "万円/月", label: "350〜450人時の利益" },
        ]} />
      </section>

      {/* ── セクション5: 損益分岐点 ── */}
      <section>
        <h2 id="breakeven" className="text-xl font-bold text-gray-800">損益分岐点の計算</h2>

        <p>
          ワンルーム開業の損益分岐点（月間固定費を回収できる患者数）を算出します。<strong>この数字を把握しておくことで、開業前の事業計画に明確な目標値</strong>を設定できます。
        </p>

        <Callout type="info" title="損益分岐点の計算式">
          損益分岐点（患者数）＝ 月間固定費 ÷ 1患者あたり限界利益<br />
          <strong>24万円 ÷ 8,300円 ≒ 29人/月</strong><br />
          （1患者あたり限界利益 = 売上15,000円 − 薬原価6,000円 − 配送費700円 = 8,300円）
        </Callout>

        <p>
          つまり、<strong>月29人の患者を確保すれば黒字化</strong>します。週に約7人、1日1〜2人のペースです。オンライン診療はリピート処方が中心のため、一度患者を獲得すれば毎月の診療枠が積み上がっていく<strong>ストック型ビジネス</strong>の側面があります。
        </p>

        <ComparisonTable
          headers={["シナリオ", "月間固定費", "1患者限界利益", "損益分岐点"]}
          rows={[
            ["最小構成（Lオペ10万円）", "20万円", "8,300円", "25人/月"],
            ["標準構成（Lオペ14万円）", "24万円", "8,300円", "29人/月"],
            ["上位構成（Lオペ18万円）", "28万円", "8,300円", "34人/月"],
          ]}
        />

        <p>
          さらに注目すべきは、<strong>リピート患者の積み上げ効果</strong>です。AGA・ピルなど定期処方メニューは平均6〜12か月継続するため、新規患者を毎月10人ずつ獲得するだけで、3か月後には30人の定期患者基盤が形成されます。つまり、<strong>開業3か月目で損益分岐点を超える</strong>ことが十分に可能です。
        </p>

        <ResultCard
          before="開業初月: 新規患者10人・赤字15万円"
          after="3か月目: 定期患者30人＋新規10人 → 月利益9万円"
          metric="開業3か月目で黒字化"
          description="リピート型メニューの積み上げ効果により、早期に損益分岐点を突破"
        />

        <StatGrid stats={[
          { value: "29", unit: "人/月", label: "損益分岐点" },
          { value: "3", unit: "か月", label: "黒字化までの期間" },
          { value: "8,300", unit: "円", label: "1患者あたり限界利益" },
          { value: "80", unit: "%+", label: "リピート処方の継続率" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── セクション6: スケールアップ ── */}
      <section>
        <h2 id="scale-up" className="text-xl font-bold text-gray-800">スケールアップの道筋</h2>

        <p>
          ワンルーム開業は「ゴール」ではなく「スタートライン」です。患者数の増加に応じて段階的にスケールアップすることで、<strong>リスクを最小化しながら事業を拡大</strong>できます。
        </p>

        <FlowSteps steps={[
          { title: "フェーズ1: 副業開業（0〜100人/月）", desc: "ワンルーム+Lオペで最小構成スタート。本業の合間に週2〜3日でオンライン診療を実施。月の追加所得13〜57万円。Lオペのダッシュボードで患者数・売上推移を把握しながら成長の感触を掴む。" },
          { title: "フェーズ2: 本格運営（100〜300人/月）", desc: "患者数が安定してきたら本業を縮小し、オンライン診療に注力。広告投資（月10〜20万円）で新規患者獲得を加速。Lオペのセグメント配信でリピート率を最大化し、月の追加所得100〜250万円を目指す。" },
          { title: "フェーズ3: 拡大期（300人〜/月）", desc: "非常勤医師を雇用し、診療枠を拡大。Lオペの患者CRMとタグ管理で複数医師の診療を一元管理。オフィスの拡張やスタッフ採用を検討。月の追加所得250万円超。" },
          { title: "フェーズ4: 多拠点・多メニュー展開", desc: "2拠点目の開設や、対面診療との併用モデルへ。自費＋保険の混合診療、美容医療やメンズヘルスなど専門特化で差別化。Lオペのダッシュボードで複数拠点の経営指標を統合管理。" },
        ]} />

        <Callout type="point" title="Lオペの配送管理でオペレーションを効率化">
          患者数が増えても、Lオペの配送管理機能で処方薬の発送状況を一括管理できます。Square決済連携により入金確認も自動化されるため、<strong>事務作業の増加を最小限に抑えながらスケール</strong>できるのが強みです。
        </Callout>

        <StatGrid stats={[
          { value: "副業", unit: "から", label: "開業スタイル" },
          { value: "0", unit: "人", label: "初期の雇用者数" },
          { value: "段階的", unit: "に", label: "リスクを抑えた拡大" },
          { value: "250", unit: "万円+/月", label: "フェーズ3の目標利益" },
        ]} />
      </section>

      {/* ── セクション7: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — ワンルーム開業で実現する低リスク・高収益のオンライン診療</h2>

        <Callout type="success" title="ワンルーム開業の収支シミュレーション要約">
          <ul className="mt-1 space-y-1">
            <li>・<strong>初期費用</strong>: 50〜90万円（対面クリニックの1/30以下）</li>
            <li>・<strong>月間固定費</strong>: 20〜28万円（家賃10万+Lオペ10〜18万のみ）</li>
            <li>・<strong>損益分岐点</strong>: 月29人（開業3か月目で達成可能）</li>
            <li>・<strong>患者100人時</strong>: 月59万円の営業利益（年間708万円）</li>
            <li>・<strong>患者200人時</strong>: 月122万円の営業利益（年間1,464万円）</li>
            <li>・<strong>患者350〜450人時</strong>: 月236〜319万円の営業利益</li>
          </ul>
        </Callout>

        <p>
          ワンルームマンションでのオンライン診療開業は、<strong>従来のクリニック開業とは比較にならない低リスク</strong>で始められます。初期費用100万円以下、月間固定費20〜28万円という超低コスト構造に加え、AGA・ED・ピル・美容内服・メディカルダイエット（GLP-1）などの自費診療メニューは<strong>高い利益率とリピート率</strong>を誇ります。
        </p>

        <p>
          成功のカギは、<strong>Lオペ for CLINICを活用した業務の完全自動化</strong>です。LINE予約管理、オンライン問診、AI自動返信、セグメント配信、配送管理、決済連携（Square）——これらを一元化することで、医師1人・スタッフゼロでも質の高い患者体験を提供できます。まずは副業からスタートし、患者基盤が安定してからスケールアップする——この段階的なアプローチが、ワンルーム開業の最大の強みです。
        </p>

        <p>
          オンライン診療の開業をご検討中の方は、Lオペ for CLINICの無料相談で<strong>具体的な収支シミュレーション</strong>をお試しください。クリニックの診療メニューや目標に合わせた、より精密な事業計画をご提案いたします。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連記事</h3>
        <ul className="space-y-1 text-gray-700">
          <li>
            <Link href="/lp/column/online-clinic-complete-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療クリニック開業完全ガイド</Link> — 開設届から運営まで網羅的に解説
          </li>
          <li>
            <Link href="/lp/column/self-pay-pricing-guide" className="text-sky-600 underline hover:text-sky-800">自費診療の価格設定ガイド</Link> — メニュー別の最適な価格戦略
          </li>
          <li>
            <Link href="/lp/column/clinic-fixed-cost-optimization" className="text-sky-600 underline hover:text-sky-800">クリニック固定費の最適化ガイド</Link> — 固定費を徹底的に見直す手法
          </li>
          <li>
            <Link href="/lp/column/clinic-line-roi" className="text-sky-600 underline hover:text-sky-800">LINE導入ROIの計算方法</Link> — 投資対効果を定量的に算出
          </li>
          <li>
            <Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談・お問い合わせ</Link> — 収支シミュレーションのご相談はこちら
          </li>
        </ul>
      </section>
    </ArticleLayout>
  );
}
