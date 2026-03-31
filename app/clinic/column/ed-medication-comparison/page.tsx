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
const self = articles.find((a) => a.slug === "ed-medication-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "ED治療薬の種類と効果比較はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "バイアグラ・シアリス・レビトラの3大PDE5阻害薬を効果発現・持続時間で比較",
  "食事の影響・副作用・併用禁忌薬の違いを整理",
  "ジェネリック活用とオンライン定期処方のLINE運用を解説",
];

const toc = [
  { id: "basics", label: "ED治療薬の基本知識" },
  { id: "viagra", label: "バイアグラ（シルデナフィル）" },
  { id: "cialis", label: "シアリス（タダラフィル）" },
  { id: "levitra", label: "レビトラ（バルデナフィル）" },
  { id: "comparison", label: "3薬剤の比較表" },
  { id: "generic-pricing", label: "ジェネリック薬の価格帯" },
  { id: "online-flow", label: "オンライン処方の流れ" },
  { id: "line-followup", label: "定期処方とLINEフォロー" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        ED（勃起不全）治療薬は<strong>PDE5阻害薬</strong>と呼ばれ、バイアグラ（シルデナフィル）・シアリス（タダラフィル）・レビトラ（バルデナフィル）の3種類が主流です。それぞれ効果発現時間・持続時間・食事の影響が異なり、患者のライフスタイルに合った薬剤選択が重要です。本記事では各薬剤の特徴・副作用・価格帯に加え、<strong>ジェネリックの選択肢やオンライン処方の活用法</strong>を解説します。処方は必ず医師の判断のもとで行ってください。
      </p>

      {/* ── セクション1: ED治療薬の基本知識 ── */}
      <section>
        <h2 id="basics" className="text-xl font-bold text-gray-800">ED治療薬の基本知識 — PDE5阻害薬の作用機序</h2>

        <p>ED治療薬はすべて<strong>PDE5（ホスホジエステラーゼ5型）阻害薬</strong>に分類されます。性的興奮により陰茎海綿体でcGMP（環状グアノシン一リン酸）が産生され、血管平滑筋が弛緩して血流が増加することで勃起が起こります。PDE5はこのcGMPを分解する酵素であり、PDE5阻害薬はcGMPの分解を抑制することで<strong>勃起の維持を助ける</strong>役割を果たします。</p>

        <p>重要なのは、PDE5阻害薬は<strong>性的興奮がなければ勃起を引き起こさない</strong>という点です。あくまで自然な勃起メカニズムを補助する薬剤であり、催淫剤ではありません。この点は患者への説明で必ず伝えるべきポイントです。</p>

        <p>日本では1999年にバイアグラ（シルデナフィル）が承認されて以降、レビトラ（2004年）、シアリス（2007年）と3種類のPDE5阻害薬が使用可能です。いずれも<strong>自費診療</strong>であり、保険適用はありません（2022年4月から不妊治療目的に限りシルデナフィル・タダラフィルの保険適用あり）。</p>

        <StatGrid stats={[
          { value: "1,130", unit: "万人", label: "日本のED推定患者数" },
          { value: "3", unit: "種類", label: "承認済みPDE5阻害薬" },
          { value: "70〜80", unit: "%", label: "PDE5阻害薬の有効率" },
          { value: "100", unit: "%自費", label: "ED治療の保険適用外" },
        ]} />

        <p>ED患者数は加齢とともに増加し、40代で約20%、50代で約40%、60代で約60%がEDを有するとされています。一方で実際に治療を受けている患者は全体の<strong>1割程度</strong>にとどまり、「恥ずかしい」「相談しにくい」という心理的障壁が受診を妨げています。オンライン診療はこの壁を大きく下げることができます。</p>
      </section>

      {/* ── セクション2: バイアグラ（シルデナフィル） ── */}
      <section>
        <h2 id="viagra" className="text-xl font-bold text-gray-800">バイアグラ（シルデナフィル） — ED治療のパイオニア</h2>

        <p>バイアグラは1998年にFDA承認、日本では1999年に承認されたED治療薬の先駆けです。有効成分シルデナフィルは、性的興奮時に陰茎海綿体のcGMP分解を抑制し、十分な血流を確保して勃起を維持します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">効果と服用方法</h3>
        <p>効果発現は服用後<strong>30分〜1時間</strong>で、持続時間は<strong>4〜6時間</strong>です。空腹時の服用が推奨されており、食後（特に高脂肪食後）に服用すると吸収が遅れ、効果が減弱する可能性があります。用量は25mg・50mgがあり、日本では<strong>50mgが最大用量</strong>です（海外では100mgあり）。</p>

        <p>臨床試験では、シルデナフィル50〜100mgの投与で<strong>約70〜80%の患者に勃起の改善</strong>が認められています。糖尿病や脊髄損傷に伴うEDにも有効性が示されており、幅広い原因のEDに対応可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">副作用</h3>
        <p>主な副作用は血管拡張に起因するもので、<strong>頭痛（12.8%）</strong>、<strong>ほてり（10.2%）</strong>、<strong>消化不良（4.6%）</strong>、<strong>鼻閉（2.6%）</strong>、<strong>視覚異常（色覚変化、1.9%）</strong>が報告されています。これらは一過性であり、薬効消失とともに改善します。</p>

        <Callout type="warning" title="バイアグラの併用禁忌">
          <strong>硝酸薬（ニトログリセリン等）との併用は絶対禁忌</strong>です。重篤な低血圧を引き起こし、生命に関わる可能性があります。狭心症などで硝酸薬を使用している患者には処方できません。また、重度の肝障害・低血圧（収縮期90mmHg未満）・最近6ヶ月以内の脳卒中や心筋梗塞の既往がある場合も禁忌です。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">処方のポイント</h3>
        <p>「即効性がある」「効果実感がわかりやすい」という特徴から、<strong>ED治療の第一選択として最も処方されている薬剤</strong>です。食事の影響を受けやすい点がデメリットですが、「空腹時に服用する」という明確なルールがあるため、患者指導はシンプルです。初めてED治療薬を試す患者には25mgから開始し、効果を確認した上で50mgへの増量を検討するのが安全です。</p>
      </section>

      {/* ── セクション3: シアリス（タダラフィル） ── */}
      <section>
        <h2 id="cialis" className="text-xl font-bold text-gray-800">シアリス（タダラフィル） — 最長36時間の持続力</h2>

        <p>シアリスは2003年にFDA承認、日本では2007年に承認されたED治療薬です。最大の特徴は<strong>最長36時間という圧倒的な持続時間</strong>で、「ウィークエンドピル」とも呼ばれています。世界的にはED治療薬の中で<strong>シェアNo.1</strong>の薬剤です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">効果と服用方法</h3>
        <p>効果発現は服用後<strong>1〜3時間</strong>で、バイアグラよりやや遅い一方、持続時間は<strong>最長36時間</strong>と圧倒的に長いのが最大の特徴です。金曜夜に服用すれば日曜夕方まで効果が持続するため、パートナーとの自然なタイミングで性行為に臨めます。</p>

        <p>食事の影響が<strong>極めて少ない</strong>のも大きなメリットです。高脂肪食でもAUC（薬物血中濃度-時間曲線下面積）に有意な変化は認められていません。「食事を気にせず服用できる」点は、患者の日常生活への影響を最小限に抑えます。用量は5mg・10mg・20mgがあり、必要に応じて使い分けます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">副作用</h3>
        <p>主な副作用は<strong>頭痛（11.3%）</strong>、<strong>消化不良（5.6%）</strong>、<strong>背部痛（3.1%）</strong>、<strong>ほてり（3.0%）</strong>、<strong>筋痛（2.5%）</strong>です。背部痛・筋痛はシアリスに特徴的な副作用で、PDE5がPDE11と構造的に類似しているため、PDE11が多く発現する骨格筋に影響するとされています。通常24〜48時間で自然軽快します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">処方のポイント</h3>
        <p>「タイミングを計りにくい」「食事の影響が心配」という患者には最適な選択肢です。持続時間が長いため、<strong>1錠あたりのコストパフォーマンスが最も高い</strong>とも言えます。また、低用量（5mg）の連日服用により、常にPDE5阻害状態を維持する「デイリーシアリス」という処方パターンもあり、BPH（前立腺肥大症）の随伴症状改善も期待できます。</p>
      </section>

      {/* ── セクション4: レビトラ（バルデナフィル） ── */}
      <section>
        <h2 id="levitra" className="text-xl font-bold text-gray-800">レビトラ（バルデナフィル） — 速効性と糖尿病EDへの有効性</h2>

        <p>レビトラは2003年にFDA承認、日本では2004年に承認されたED治療薬です。バイアグラと同様のPDE5阻害薬ですが、<strong>効果発現が最も早い</strong>のが特徴です。なお、先発品のレビトラ錠は2021年に販売中止となっていますが、ジェネリック（バルデナフィル錠）は引き続き処方可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">効果と服用方法</h3>
        <p>効果発現は服用後<strong>15〜30分</strong>で、3種の中で最速です。持続時間は<strong>5〜8時間</strong>でバイアグラとシアリスの中間に位置します。食事の影響はバイアグラほど顕著ではありませんが、<strong>高脂肪食はCmaxを約18%低下</strong>させるため、軽食程度であれば影響は小さいものの、できれば空腹〜軽食後の服用が推奨されます。</p>

        <p>用量は5mg・10mg・20mgがあり、<strong>10mgで開始し、効果に応じて20mgへ増量</strong>するのが一般的です。特筆すべきは<strong>糖尿病患者のED</strong>に対する高い有効性で、複数の臨床試験で糖尿病性EDに対して72%の改善率が報告されています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">副作用</h3>
        <p>主な副作用は<strong>ほてり（10.4%）</strong>、<strong>頭痛（8.4%）</strong>、<strong>鼻閉（4.2%）</strong>、<strong>消化不良（2.1%）</strong>です。副作用プロファイルはバイアグラと類似しています。シアリスで見られる背部痛・筋痛は少ない傾向にあります。</p>

        <Callout type="warning" title="レビトラの注意事項">
          レビトラは<strong>QT延長</strong>のリスクがわずかに報告されています。QT延長症候群の既往がある患者や、QT延長を引き起こす薬剤（クラスIA・III抗不整脈薬等）との併用には注意が必要です。バイアグラ・シアリスと同様に硝酸薬との併用は絶対禁忌です。先発品「レビトラ錠」は販売中止のため、現在はジェネリックのバルデナフィル錠での処方となります。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">処方のポイント</h3>
        <p>「すぐに効果がほしい」「計画的に服用するのが難しい」という患者には速効性がメリットとなります。また、糖尿病を合併するED患者にも第一選択として検討できます。先発品販売中止によりジェネリックのみの供給となっていますが、処方に支障はなく、価格面でむしろメリットがあります。</p>
      </section>

      {/* ── セクション5: 3薬剤の比較表 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">3薬剤の比較表 — 効果・持続・食事の影響を一覧で確認</h2>

        <p>3種類のPDE5阻害薬を主要な項目で横並び比較します。患者のライフスタイルや求める効果に応じた薬剤選択の参考にしてください。</p>

        <ComparisonTable
          headers={["項目", "バイアグラ（シルデナフィル）", "シアリス（タダラフィル）", "レビトラ（バルデナフィル）"]}
          rows={[
            ["効果発現", "30分〜1時間", "1〜3時間", "15〜30分"],
            ["持続時間", "4〜6時間", "最長36時間", "5〜8時間"],
            ["食事の影響", "大きい（空腹時推奨）", "ほぼなし", "軽度あり（軽食は可）"],
            ["最大用量（日本）", "50mg", "20mg", "20mg"],
            ["有効率", "約70〜80%", "約70〜80%", "約72〜80%"],
            ["主な副作用", "頭痛・ほてり・視覚異常", "頭痛・消化不良・背部痛", "ほてり・頭痛・鼻閉"],
            ["特徴", "即効性・知名度高い", "持続時間最長・食事影響少", "最速の効果発現"],
            ["先発品の状況", "販売中", "販売中", "販売中止（2021年）"],
            ["ジェネリック", "あり（多数）", "あり（多数）", "あり（多数）"],
            ["向いている人", "初めて使う人", "タイミングを気にしたくない人", "速効性を求める人"],
          ]}
        />

        <p>3薬剤はいずれもPDE5阻害薬であり、基本的な有効率に大きな差はありません。薬剤選択のポイントは<strong>「効果発現時間」「持続時間」「食事の影響」</strong>の3つです。初診時に患者の生活パターンやニーズを聞き取り、最適な薬剤を提案する問診設計が重要です。</p>

        <p>なお、1種類のPDE5阻害薬で十分な効果が得られなかった場合でも、<strong>別の薬剤に変更すると効果が得られるケース</strong>があります（PDE5阻害薬間での交差耐性は完全ではない）。このため、1剤で効果不十分でもED治療を諦める必要はなく、薬剤変更を試みる価値があることを患者に伝えることが大切です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: ジェネリック薬の価格帯 ── */}
      <section>
        <h2 id="generic-pricing" className="text-xl font-bold text-gray-800">ジェネリック薬の価格帯 — コストを抑えて治療へのハードルを下げる</h2>

        <p>ED治療は100%自費のため、薬剤費が患者の経済的負担に直結します。3種のPDE5阻害薬はいずれもジェネリック化が進んでおり、先発品の<strong>40〜60%程度</strong>の価格で処方可能です。ジェネリックの活用は患者のコスト負担を下げるだけでなく、クリニックの利益率向上にも寄与します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">シルデナフィル（バイアグラGE）</h3>
        <p>東和薬品、キッセイ薬品、武田テバなど多数のメーカーから発売されています。クリニック仕入れ価格は<strong>1錠（50mg）あたり150〜300円</strong>程度で、患者への提供価格は<strong>1錠700〜1,200円</strong>が相場です。先発品のバイアグラ50mgが1錠1,300〜1,800円程度であることを考えると、約半額での処方が可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">タダラフィル（シアリスGE）</h3>
        <p>沢井製薬、東和薬品などからジェネリックが発売されています。1錠（20mg）あたりのクリニック仕入れ価格は<strong>200〜400円</strong>程度で、患者への提供価格は<strong>1錠900〜1,500円</strong>が相場です。シアリスの持続時間36時間を考慮すると、1時間あたりのコストは3種の中で最も安くなります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">バルデナフィル（レビトラGE）</h3>
        <p>先発品のレビトラ錠が2021年に販売中止となったため、現在はジェネリックのみの流通です。1錠（20mg）あたりの仕入れ価格は<strong>200〜350円</strong>程度で、患者への提供価格は<strong>1錠800〜1,300円</strong>が相場です。</p>

        <BarChart
          data={[
            { label: "バイアグラ先発品", value: 1500, color: "bg-gray-400" },
            { label: "シルデナフィルGE", value: 900, color: "bg-emerald-400" },
            { label: "シアリス先発品", value: 1800, color: "bg-gray-400" },
            { label: "タダラフィルGE", value: 1100, color: "bg-emerald-400" },
            { label: "バルデナフィルGE", value: 1000, color: "bg-sky-400" },
          ]}
          unit="円/錠"
        />

        <p>ジェネリックを積極的に採用しているクリニックでは、<strong>「4錠セット」「10錠セット」</strong>などまとめ処方による割引を提供するケースが多く見られます。まとめ買いにより1錠あたりの単価を下げることで、患者の経済的負担を軽減しながら継続的な処方につなげる戦略です。</p>
      </section>

      {/* ── セクション7: オンライン処方の流れ ── */}
      <section>
        <h2 id="online-flow" className="text-xl font-bold text-gray-800">オンライン処方の流れ — プライバシーを守りながらスムーズに受診</h2>

        <p>ED治療は「恥ずかしい」「対面で話しにくい」という心理的障壁が非常に高い領域です。オンライン診療であれば、自宅からスマートフォン1台で受診でき、薬も中身がわからない梱包で届くため、<strong>プライバシーが完全に守られます</strong>。この点がED治療でオンライン処方が急速に普及している最大の理由です。</p>

        <FlowSteps steps={[
          { title: "LINE予約・事前問診", desc: "ED歴・既往歴・服薬状況・硝酸薬使用の有無を事前問診で収集。24時間受付。" },
          { title: "ビデオ診察（5分程度）", desc: "医師が問診内容を確認し、禁忌事項のチェック。希望する薬剤と用量を決定。" },
          { title: "オンライン決済", desc: "診察後すぐにクレジットカード等で決済完了。" },
          { title: "即日発送・匿名梱包", desc: "品名を「サプリメント」「健康食品」等として匿名梱包で発送。最短翌日到着。" },
          { title: "2回目以降は問診のみ", desc: "LINEで体調変化・副作用を確認し、医師承認で即配送。来院不要。" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">処方前の確認事項</h3>
        <p>ED治療薬のオンライン処方では、<strong>硝酸薬の使用有無</strong>の確認が最重要です。併用禁忌に該当する場合は処方不可であり、これを見逃すと生命に関わる事故につながります。問診票に硝酸薬チェック項目を必ず設け、ビデオ診察でも口頭で再確認するダブルチェック体制が推奨されます。</p>

        <p>また、心血管系疾患の既往、血圧値、網膜色素変性症の有無なども確認が必要です。<Link href="/clinic/column/ed-online-clinic-lope" className="text-emerald-700 underline">ED治療のオンライン診療ガイド</Link>で詳しく解説している通り、安全な処方体制の構築がオンラインED診療の基盤となります。</p>
      </section>

      {/* ── セクション8: 定期処方とLINEフォロー ── */}
      <section>
        <h2 id="line-followup" className="text-xl font-bold text-gray-800">定期処方とLINEフォロー — リピート率を高める仕組み</h2>

        <p>ED治療薬は「必要なときに使う」薬剤であり、AGA治療のような毎日服用型ではありません。そのため、患者の購買サイクルが不規則になりやすく、「必要になったときに別のクリニックで処方してもらう」という離脱が起こりやすい領域です。これを防ぐには、<strong>患者との継続的な接点を持ち続ける仕組み</strong>が必要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">定期便モデル</h3>
        <p>「月4錠」「月8錠」などの定期便を設定し、毎月自動配送する仕組みを導入するクリニックが増えています。定期便は<strong>1錠あたりの単価を5〜10%割引</strong>に設定することで、まとめ購入よりも心理的ハードルが低く、安定した売上につながります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINEリマインド配信</h3>
        <p>前回処方から1ヶ月後に「お薬の残りは十分ですか？」とLINEで自動配信するだけでも、再処方率が大きく向上します。Lオペ for CLINICなどのLINE運用ツールでは、処方日を起点としたステップ配信を設定できるため、患者ごとに最適なタイミングでリマインドを送ることが可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">薬剤変更提案</h3>
        <p>「バイアグラを使っているが、食事の影響が気になる」という患者にシアリスを提案するなど、<strong>LINEを通じた薬剤変更の案内</strong>も有効です。1種類の薬剤で満足度が低い場合に別の薬剤を試す選択肢があることを伝えるだけで、他院への流出を防ぐことができます。</p>

        <StatGrid stats={[
          { value: "85", unit: "%", label: "LINE定期便のリピート率" },
          { value: "3.5", unit: "倍", label: "LTV向上効果" },
          { value: "30", unit: "秒", label: "LINE再処方の所要時間" },
          { value: "0", unit: "円", label: "追加の来院コスト" },
        ]} />

        <p><Link href="/clinic/column/ed-online-clinic-winning-strategy" className="text-emerald-700 underline">ED治療オンラインクリニックの運営戦略</Link>においても解説している通り、ED治療の収益最大化には「初回処方で終わらない」リピート導線の設計が不可欠です。LINEを活用した定期的な接触が、患者ロイヤルティの構築と安定収益の両方を実現します。</p>
      </section>

      {/* ── セクション9: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 患者のライフスタイルに合った薬剤選択を</h2>

        <p>ED治療薬の選択は、薬剤の効果の大小ではなく<strong>患者のライフスタイルとの適合性</strong>で決まります。即効性を求めるならバルデナフィル（レビトラGE）、持続時間と食事の自由度を重視するならタダラフィル（シアリスGE）、定番の安心感を求めるならシルデナフィル（バイアグラGE）が第一候補です。</p>

        <p>いずれの薬剤も有効率70〜80%と高い効果が期待でき、ジェネリックの活用により<strong>1錠700〜1,500円</strong>で処方可能です。オンライン診療との相性が非常に良い領域であり、プライバシーを守りながらスムーズに治療を受けられる環境を整備することが、患者獲得と継続率向上の鍵となります。</p>

        <Callout type="point" title="処方は必ず医師の判断で">
          本記事はED治療薬の一般的な情報を整理したものであり、個別の処方を推奨するものではありません。ED治療薬は併用禁忌薬が存在し、心血管系リスクの評価が必要です。処方・用量変更は、必ず医師の診察と判断のもとで行ってください。
        </Callout>
        <p>関連記事: <Link href="/clinic/column/aga-medication-comparison" className="text-blue-600 underline">AGA治療薬の種類と効果比較</Link></p>
        <p>関連記事: <Link href="/clinic/column/mens-health-online-clinic" className="text-blue-600 underline">メンズヘルスオンラインクリニックの作り方</Link></p>
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
