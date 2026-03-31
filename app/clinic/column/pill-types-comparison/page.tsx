import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  BarChart,
  Callout,
  FlowSteps,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "pill-types-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "低用量ピルの種類と選び方はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
  { q: "副作用が出た場合はどうすればいいですか？", a: "軽度の副作用であれば経過観察で改善することが多いですが、症状が強い場合は速やかに処方医に相談してください。LINEでの個別相談に対応しているクリニックであれば、気軽に症状を報告できます。" },
  { q: "オンラインクリニックでの処方薬の配送はどうなりますか？", a: "多くのオンラインクリニックでは決済後、最短翌日〜数日で発送されます。温度管理が必要な薬剤はクール便での配送に対応しているクリニックを選びましょう。Lオペ for CLINICでは配送管理・追跡番号の自動配信機能も搭載しています。" },
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
  "低用量ピルを第1〜4世代まで体系的に分類し各製品を比較",
  "LEP（保険適用）とOC（自費）の違い・使い分けを整理",
  "オンライン処方の条件・注意点と定期処方のLINE活用法を解説",
];

const toc = [
  { id: "pill-generations", label: "ピルの種類と世代分類" },
  { id: "first-gen", label: "第1世代（シンフェーズ等）" },
  { id: "second-gen", label: "第2世代（トリキュラー・ラベルフィーユ）" },
  { id: "third-gen", label: "第3世代（マーベロン・ファボワール）" },
  { id: "fourth-gen", label: "第4世代（ヤーズ・ドロエチ）" },
  { id: "how-to-choose", label: "目的別の選び方" },
  { id: "insurance-vs-selfpay", label: "保険適用ピル（LEP）vs自費ピル（OC）" },
  { id: "online-caution", label: "オンライン処方の注意点" },
  { id: "subscription", label: "定期処方の仕組み化" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        低用量ピルは含有するプロゲスチン（黄体ホルモン）の種類によって<strong>第1世代〜第4世代</strong>に分類され、それぞれ特徴が異なります。避妊目的の<strong>OC（経口避妊薬）</strong>は自費、月経困難症治療の<strong>LEP（低用量エストロゲン・プロゲスチン配合薬）</strong>は保険適用と、処方の枠組みも異なるため正確な理解が必要です。本記事では、主要なピル製品を世代別に整理し、副作用・価格・オンライン処方の注意点まで解説します。処方は必ず医師の判断のもとで行ってください。
      </p>

      {/* ── セクション1: ピルの種類と世代分類 ── */}
      <section>
        <h2 id="pill-generations" className="text-xl font-bold text-gray-800">ピルの種類と世代分類 — 何が違うのかを理解する</h2>

        <p>低用量ピルは、含有するエストロゲン量が<strong>50μg未満</strong>のものを指します（50μg以上は中用量ピル）。現在日本で使用される低用量ピルのエストロゲンはすべて<strong>エチニルエストラジオール（EE）</strong>で、世代の違いは配合されるプロゲスチンの種類によって決まります。</p>

        <p>世代が新しいほど「優れている」というわけではありません。各世代にはそれぞれ特有のメリット・デメリットがあり、患者の目的・体質・既往歴に応じて最適な薬剤が異なります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1相性 vs 3相性</h3>
        <p>低用量ピルは、すべての実薬に同量のホルモンが含まれる<strong>1相性</strong>と、3段階でホルモン量が変化する<strong>3相性</strong>に分かれます。1相性は服用がシンプルで飲み間違いが少なく、3相性は自然なホルモン変動に近いため不正出血が起こりにくい傾向があります。</p>

        <StatGrid stats={[
          { value: "4", unit: "世代", label: "プロゲスチンの分類" },
          { value: "99.7", unit: "%", label: "正しい服用での避妊率" },
          { value: "930", unit: "万人", label: "世界のピル使用者数" },
          { value: "3", unit: "%", label: "日本のピル使用率（低い）" },
        ]} />

        <p>日本のピル使用率は約3%で、フランス（33%）やドイツ（27%）などの欧米諸国と比較して著しく低い水準です。しかし近年のオンライン診療の普及により、<strong>処方件数は急増</strong>しています。特に20〜30代女性のオンラインピル処方ニーズは高く、クリニックにとって重要な診療領域となっています。</p>
      </section>

      {/* ── セクション2: 第1世代 ── */}
      <section>
        <h2 id="first-gen" className="text-xl font-bold text-gray-800">第1世代（ノルエチステロン系） — シンフェーズ・ルナベルLD</h2>

        <p>第1世代ピルは、プロゲスチンとして<strong>ノルエチステロン（NET）</strong>を含有します。日本で使用可能な代表的製品は<strong>シンフェーズT28（3相性OC）</strong>と<strong>ルナベルLD/ULD（1相性LEP）</strong>です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">シンフェーズT28</h3>
        <p>3相性の自費OCで、日曜日から服用を開始する「サンデースタート」方式が特徴です。消退出血が週末に重ならないよう設計されており、平日の仕事に影響を受けたくない女性に好まれます。ただし、他のピルと服用開始のタイミングが異なるため、切り替え時には注意が必要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ルナベルLD/ULD</h3>
        <p>月経困難症に対する<strong>保険適用（LEP）</strong>の薬剤です。LD（EE 35μg）とULD（EE 20μg）があり、ULDの方がエストロゲン量が少ないため副作用が少ない傾向にあります。月経困難症で受診する患者に対して、保険適用の範囲内で処方できるため<strong>患者の自己負担が少ない</strong>のがメリットです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">第1世代の特徴</h3>
        <p>ノルエチステロンは<strong>アンドロゲン活性が比較的低い</strong>プロゲスチンで、ニキビや多毛などのアンドロゲン関連副作用が起こりにくい特徴があります。一方、不正出血が他の世代に比べてやや起こりやすいとされています。</p>
      </section>

      {/* ── セクション3: 第2世代 ── */}
      <section>
        <h2 id="second-gen" className="text-xl font-bold text-gray-800">第2世代（レボノルゲストレル系） — トリキュラー・ラベルフィーユ</h2>

        <p>第2世代ピルは、プロゲスチンとして<strong>レボノルゲストレル（LNG）</strong>を含有します。レボノルゲストレルは世界で最も広く使用されているプロゲスチンで、<strong>不正出血が少なく周期コントロールに優れる</strong>のが最大の特徴です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">トリキュラー28/21</h3>
        <p>バイエル社の先発品で、日本で最も処方実績が多い低用量ピルの一つです。<strong>3相性</strong>で、3段階にホルモン量を変化させることで自然な月経周期に近いパターンを再現しています。不正出血が少なく、初めてピルを服用する患者にも使いやすい設計です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ラベルフィーユ28/21</h3>
        <p>トリキュラーの<strong>ジェネリック</strong>で、富士製薬工業が製造しています。有効成分・配合量はトリキュラーと同一であり、効果・安全性に差はありません。価格はトリキュラーの<strong>約60〜70%</strong>で、コスト重視の患者やクリニックの利益率向上に寄与します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">第2世代の特徴</h3>
        <p>レボノルゲストレルは<strong>アンドロゲン活性がやや高い</strong>プロゲスチンです。このため、ニキビや肌荒れが気になる患者には不向きな場合があります。一方で、不正出血の少なさと周期の安定性に優れるため、<strong>「まず周期を安定させたい」</strong>という目的には最適です。日本のガイドラインでも低用量ピルの第一選択として推奨されることが多い世代です。</p>

        <Callout type="info" title="血栓リスクについて">
          低用量ピルの重大な副作用として<strong>静脈血栓塞栓症（VTE）</strong>があります。第2世代（レボノルゲストレル系）のVTEリスクは<strong>ピル非使用者の約3倍</strong>とされ、第3世代・第4世代に比べて相対的にリスクが低い傾向にあるとの報告があります。ただし、いずれの世代も非使用者と比較するとリスクは上昇するため、喫煙・肥満・血栓の既往歴など危険因子を必ず確認してください。
        </Callout>
      </section>

      {/* ── セクション4: 第3世代 ── */}
      <section>
        <h2 id="third-gen" className="text-xl font-bold text-gray-800">第3世代（デソゲストレル系） — マーベロン・ファボワール</h2>

        <p>第3世代ピルは、プロゲスチンとして<strong>デソゲストレル（DSG）</strong>を含有します。デソゲストレルは<strong>アンドロゲン活性が非常に低い</strong>のが特徴で、ニキビや肌荒れの改善効果が期待できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">マーベロン28/21</h3>
        <p>MSD社の先発品で、<strong>1相性</strong>の低用量OCです。すべての実薬が同一成分量のため、飲み間違いの心配がなく服薬管理がシンプルです。アンドロゲン活性の低さから<strong>ニキビ改善目的</strong>でも広く処方されており、特に美容意識の高い20〜30代女性に人気があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ファボワール28/21</h3>
        <p>マーベロンの<strong>ジェネリック</strong>で、富士製薬工業が製造しています。有効成分・配合量はマーベロンと同一です。価格はマーベロンの<strong>約50〜60%</strong>と安く、オンライン診療での処方では価格競争力の面から<strong>ファボワールが選ばれるケースが増加</strong>しています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">第3世代の特徴</h3>
        <p>「ニキビを改善したい」「肌をきれいにしたい」という副次的な効果を求める患者には最も適した世代です。1相性で飲みやすく、ジェネリック（ファボワール）も充実しているため、<strong>オンラインピル処方で最も人気のある世代</strong>と言えます。一方、第2世代と比較してVTEリスクがわずかに高いとする報告もあるため、リスク因子のある患者には注意が必要です。</p>
      </section>

      {/* ── セクション5: 第4世代 ── */}
      <section>
        <h2 id="fourth-gen" className="text-xl font-bold text-gray-800">第4世代（ドロスピレノン系） — ヤーズ・ドロエチ・ヤーズフレックス</h2>

        <p>第4世代ピルは、プロゲスチンとして<strong>ドロスピレノン（DRSP）</strong>を含有します。ドロスピレノンは抗アンドロゲン作用に加えて<strong>抗ミネラルコルチコイド作用</strong>（利尿作用）を持つ唯一のプロゲスチンで、むくみや体重増加が起こりにくい特徴があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ヤーズ配合錠</h3>
        <p>バイエル社の製品で、EE 20μg＋DRSP 3mgの<strong>超低用量LEP</strong>です。月経困難症に対する<strong>保険適用</strong>があります。24日間の実薬＋4日間の休薬という独自の配合パターン（24/4レジメン）で、従来の21/7レジメンに比べて<strong>ホルモン変動が少なく</strong>、休薬期間の頭痛や下腹部痛が軽減されるとされています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ヤーズフレックス配合錠</h3>
        <p>ヤーズと同じ成分ですが、<strong>最長120日間の連続服用</strong>が可能な「フレックス投与」が認められたLEPです。月経の回数を年間3〜4回に減らすことができ、月経困難症や子宮内膜症の症状コントロールに優れています。消退出血をコントロールしたい患者にとって大きなメリットがあります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ドロエチ配合錠</h3>
        <p>ヤーズのジェネリック相当品（AG=オーソライズドジェネリック）で、あすか製薬が製造しています。有効成分・配合量はヤーズと同一で、保険適用もあります。価格面でヤーズより安く、<strong>コストを抑えて第4世代LEPを処方したい場合</strong>の選択肢となります。</p>

        <Callout type="warning" title="第4世代ピルのVTEリスク">
          ドロスピレノン含有ピル（ヤーズ・ヤーズフレックス・ドロエチ）は、第2世代のレボノルゲストレル含有ピルと比較してVTEリスクが<strong>やや高い</strong>とする疫学研究があります。日本でもヤーズ発売後に血栓症の副作用報告が相次ぎ、添付文書に<strong>血栓リスクの注意喚起</strong>が追記されました。処方時にはBMI・喫煙・年齢・血栓既往歴を必ず確認し、初回処方後の経過観察を慎重に行ってください。
        </Callout>
      </section>

      {/* ── セクション6: 目的別の選び方 ── */}
      <section>
        <h2 id="how-to-choose" className="text-xl font-bold text-gray-800">目的別の選び方 — 患者の主訴に合わせた薬剤選択</h2>

        <p>低用量ピルの選択は、患者の<strong>主な目的</strong>に応じて決まります。以下に目的別の推奨パターンを整理します。</p>

        <ComparisonTable
          headers={["目的", "推奨薬剤", "理由"]}
          rows={[
            ["避妊（初めて）", "トリキュラー / ラベルフィーユ", "不正出血が少なく周期が安定しやすい"],
            ["避妊 + ニキビ改善", "マーベロン / ファボワール", "低アンドロゲンでニキビ改善効果あり"],
            ["月経困難症（保険希望）", "ルナベルULD / ヤーズ / ドロエチ", "保険適用LEPで自己負担が少ない"],
            ["月経回数を減らしたい", "ヤーズフレックス", "最長120日連続服用で月経3〜4回/年"],
            ["むくみが気になる", "ヤーズ / ドロエチ", "抗ミネラルコルチコイド作用で浮腫軽減"],
            ["コスト重視", "ファボワール / ラベルフィーユ", "ジェネリックで先発品の50〜70%の価格"],
            ["服薬管理をシンプルに", "マーベロン / ファボワール", "1相性で全錠同一成分、飲み間違いなし"],
          ]}
        />

        <p>初診時の問診で「何を最も重視するか」を明確にすることが、適切な薬剤選択の第一歩です。避妊と副次的効果（ニキビ改善、月経量の減少、むくみの軽減など）のどちらを優先するかで、最適な薬剤が変わります。</p>

        <p>また、1つの薬剤で不満（不正出血、頭痛、吐き気など）が出た場合は、<strong>別の世代の薬剤に変更することで改善するケース</strong>が多いため、「ピルは合わない」と早期に判断するのではなく、薬剤変更を検討することが重要です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション7: 保険適用ピル（LEP）vs自費ピル（OC） ── */}
      <section>
        <h2 id="insurance-vs-selfpay" className="text-xl font-bold text-gray-800">保険適用ピル（LEP）vs 自費ピル（OC） — 処方の枠組みの違い</h2>

        <p>低用量ピルの処方は、<strong>保険適用の LEP</strong> と <strong>自費の OC</strong> で制度的な違いがあります。この区分を理解していないと、適切な処方や請求ができなくなるため注意が必要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LEP（Low dose Estrogen Progestin）</h3>
        <p>月経困難症や子宮内膜症の治療薬として<strong>保険適用</strong>が認められた薬剤です。ルナベルLD/ULD、ヤーズ、ヤーズフレックス、ドロエチ、ジェミーナなどが該当します。3割負担の場合、<strong>1シートあたり600〜1,500円程度</strong>の自己負担で処方可能です（薬剤により異なる）。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">OC（Oral Contraceptive）</h3>
        <p>避妊を目的とした経口避妊薬で、<strong>100%自費</strong>です。トリキュラー、マーベロン、ラベルフィーユ、ファボワールなどが該当します。クリニック自由価格のため、<strong>1シートあたり2,000〜3,500円</strong>が相場です。</p>

        <ComparisonTable
          headers={["項目", "LEP（保険適用）", "OC（自費）"]}
          rows={[
            ["適応症", "月経困難症・子宮内膜症", "避妊"],
            ["保険適用", "あり（3割負担）", "なし（全額自費）"],
            ["患者自己負担（1シート）", "600〜1,500円", "2,000〜3,500円"],
            ["処方の柔軟性", "適応病名が必要", "自由処方"],
            ["代表的薬剤", "ルナベル、ヤーズ、ドロエチ", "トリキュラー、マーベロン"],
            ["オンライン処方", "可能（保険診療対応が必要）", "可能（自費のためシンプル）"],
          ]}
        />

        <p>クリニック経営の観点では、<strong>LEPは保険請求の手間があるものの患者の自己負担が少なく</strong>集患力が高い一方、<strong>OCは自由価格設定が可能で利益率が高い</strong>というメリットがあります。オンライン診療では自費OCの処方が中心ですが、月経困難症の診断がある患者にはLEPの処方も検討すべきです。</p>

        <p><Link href="/clinic/column/pill-online-clinic-lope" className="text-emerald-700 underline">ピル処方のオンライン診療ガイド</Link>で詳しく解説している通り、ピル処方はオンライン診療と非常に相性が良い領域であり、LEP・OCの両方を取り扱える体制を構築することが収益最大化のポイントです。</p>
      </section>

      {/* ── セクション8: オンライン処方の注意点 ── */}
      <section>
        <h2 id="online-caution" className="text-xl font-bold text-gray-800">オンライン処方の注意点 — 安全な処方のために</h2>

        <p>低用量ピルのオンライン処方は近年急速に普及していますが、対面と同等の安全性を担保するためにいくつかの注意点があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">初回処方時の確認事項</h3>
        <p>初回処方では、以下の項目を必ず問診で確認します。</p>

        <FlowSteps steps={[
          { title: "血栓リスク評価", desc: "35歳以上で1日15本以上の喫煙、BMI30以上、片頭痛（前兆あり）、VTE既往歴などの禁忌事項を確認。" },
          { title: "血圧確認", desc: "高血圧（収縮期140mmHg以上）は禁忌。自宅測定値を問診で聴取する。" },
          { title: "既往歴の確認", desc: "乳がん、子宮体がん、肝機能障害、心臓弁膜症などの既往を確認。" },
          { title: "現在の服薬状況", desc: "抗てんかん薬、リファンピシン、セイヨウオトギリソウなど相互作用のある薬剤を確認。" },
          { title: "月経状況のヒアリング", desc: "月経周期、月経痛の程度、経血量、月経困難症の有無を確認し、LEP vs OCの判断材料とする。" },
        ]} />

        <Callout type="warning" title="オンライン処方で見落としやすいリスク">
          オンライン診療では<strong>血圧の直接測定ができない</strong>ため、患者の自己申告に依存します。家庭血圧計での測定を推奨し、血圧値を問診票に記載してもらう運用が必要です。また、<strong>初回処方は原則として1〜3シート</strong>に留め、服薬開始後1〜3ヶ月での副作用確認（頭痛、不正出血、下肢の腫脹・疼痛など）を行った上で継続処方に移行すべきです。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">継続処方のルール</h3>
        <p>初回処方後、副作用の問題がなければ2回目以降は<strong>問診ベースでの継続処方</strong>が可能です。ただし、<strong>年1回の血液検査（凝固系含む）</strong>と<strong>年1回の対面診察</strong>を推奨するガイドラインもあり、オンライン完結と安全性のバランスを取る必要があります。子宮頸がん検診（20歳以上は2年に1回）の受診勧奨も忘れずに行いましょう。</p>
      </section>

      {/* ── セクション9: 定期処方の仕組み化 ── */}
      <section>
        <h2 id="subscription" className="text-xl font-bold text-gray-800">定期処方の仕組み化 — LINEで継続率を最大化する</h2>

        <p>低用量ピルは毎日服用する薬剤であり、<strong>定期処方（サブスクリプション）</strong>との相性が極めて高い領域です。28日周期で1シートを消費するため、毎月の処方タイミングが明確であり、自動リマインド配信との組み合わせで高い継続率を実現できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">月1シート定期便</h3>
        <p>毎月自動で1シートを配送する定期便モデルが最も一般的です。<strong>1シートあたり100〜200円の割引</strong>を設定することで、都度購入よりも定期便を選ぶインセンティブを与えます。3ヶ月分まとめ配送はさらに割引率を上げることで長期コミットメントを引き出せます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINEリマインドの活用</h3>
        <p>Lオペ for CLINICなどのLINE運用ツールを活用すると、<strong>シートが切り替わるタイミング（28日後）に自動で問診を送信</strong>し、副作用の有無を確認した上で次の処方に進む流れを構築できます。患者が能動的に予約・問い合わせをする必要がなく、「LINEに答えるだけで薬が届く」体験を提供できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">離脱防止のフォロー</h3>
        <p>ピルの服用を中断する理由として多いのは、「副作用が気になった」「飲み忘れが続いた」「費用が負担」の3つです。LINEでの副作用相談対応、服薬リマインド通知、まとめ処方による費用最適化の3つの施策を組み合わせることで、継続率を90%以上に維持しているクリニックもあります。</p>

        <StatGrid stats={[
          { value: "90", unit: "%以上", label: "LINE定期便の継続率" },
          { value: "12", unit: "シート/年", label: "平均年間処方数" },
          { value: "3.6", unit: "万円", label: "患者LTV（年間・OC）" },
          { value: "28", unit: "日", label: "リマインド配信間隔" },
        ]} />

        <p><Link href="/clinic/column/pill-online-clinic-winning-strategy" className="text-emerald-700 underline">ピル処方オンラインクリニックの運営戦略</Link>でも詳述しているように、ピルの定期処方は安定したリカーリング収益の源泉です。LINEフォローによる継続率向上は、収益と患者満足度の両方を高める最も効果的な施策の一つです。</p>
      </section>

      {/* ── セクション10: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 世代の特徴を理解し、患者に合ったピルを選ぶ</h2>

        <p>低用量ピルは世代ごとに特徴が異なり、患者の目的・体質・ライフスタイルに応じた<strong>最適な薬剤選択</strong>が治療満足度と継続率を左右します。不正出血が少ない第2世代（トリキュラー/ラベルフィーユ）、ニキビ改善効果のある第3世代（マーベロン/ファボワール）、むくみが少なくLEP保険適用の第4世代（ヤーズ/ドロエチ）のそれぞれの強みを理解した上で、患者の主訴に合わせて提案することが重要です。</p>

        <p>オンライン処方では、血栓リスクの評価や血圧確認を問診で確実に行い、初回は少量処方から開始する安全設計が不可欠です。その上で、LINE活用による定期処方の仕組み化を構築すれば、<strong>高い継続率と安定した収益</strong>を同時に実現できます。</p>

        <Callout type="point" title="処方は必ず医師の判断で">
          本記事は低用量ピルの一般的な薬剤情報を整理したものであり、個別の処方を推奨するものではありません。ピルには血栓症などの重大な副作用リスクがあり、禁忌事項の確認が不可欠です。処方・薬剤変更は、必ず医師の診察と判断のもとで行ってください。
        </Callout>
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
