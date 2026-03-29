import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  StatGrid,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "dienogest-endometriosis-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "ジエノゲスト（ディナゲスト）処方ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "ジエノゲストは子宮内膜症の保険適用治療薬 — エストロゲンフリーでピルが使えない方にも処方可能",
  "GnRHaと異なり骨密度低下リスクが少なく、投与期間の制限がない",
  "不正出血は最初の3ヶ月がピーク — 事前説明と対処法の共有が服薬継続のカギ",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「子宮内膜症の痛みがつらいけど、ピルは飲めない」「GnRHaは骨密度が心配で長く使えない」——そんな悩みに応える薬が<strong>ジエノゲスト（ディナゲスト）</strong>です。日本で2008年に承認された第4世代プロゲスチンで、エストロゲンを含まないのが最大の特徴。この記事では、作用機序から臨床エビデンス、処方時の実践的なポイントまで、<strong>ガイドラインに基づいて</strong>まとめました。
      </p>

      {/* -- セクション1: ジエノゲストとは -- */}
      <section>
        <h2 id="what-is-dienogest" className="text-xl font-bold text-gray-800">ジエノゲストってどんな薬？ ピルとは何が違うのか</h2>

        <p>ジエノゲスト（商品名：ディナゲスト）は、<strong>子宮内膜症の治療に特化した第4世代プロゲスチン</strong>です。「プロゲスチン」は黄体ホルモン（プロゲステロン）と似た働きをする合成ホルモンの総称。低用量ピルにもプロゲスチンは含まれていますが、ピルはエストロゲン（卵胞ホルモン）とのセットで設計されています。</p>

        <p>ここが大きな分岐点です。<strong>ジエノゲストにはエストロゲンが入っていません</strong>。つまり、血栓リスクが高くてピルが使えない方、35歳以上のヘビースモーカー、片頭痛（前兆あり）の方など、エストロゲン含有製剤が禁忌の患者さんにも処方できるのです。ピルの種類と選び方については<Link href="/lp/column/pill-types-comparison" className="text-sky-600 underline hover:text-sky-800">ピル種類比較ガイド</Link>で詳しく解説しています。</p>

        <StatGrid stats={[
          { value: "2008", unit: "年", label: "日本での承認年（ディナゲスト錠1mg）" },
          { value: "2", unit: "mg/日", label: "標準用量（1mg×2回）" },
          { value: "0", unit: "", label: "エストロゲン含有量（完全フリー）" },
        ]} />

        <p>日本産科婦人科学会の「産婦人科診療ガイドライン」でも、子宮内膜症に伴う疼痛管理において<strong>推奨度の高い薬物療法</strong>として位置づけられています。保険適用で処方できるため、患者さんの経済的負担も比較的抑えられるのがポイントです。</p>
      </section>

      {/* -- セクション2: 作用機序 -- */}
      <section>
        <h2 id="mechanism" className="text-xl font-bold text-gray-800">なぜ効くのか？ 3つの作用メカニズムを解説</h2>

        <p>ジエノゲストが子宮内膜症に効く仕組みは、大きく分けて<strong>3つ</strong>あります。どれか1つではなく、複数のメカニズムが同時に働くのがこの薬の強みです。</p>

        <FlowSteps steps={[
          { title: "子宮内膜増殖の抑制", desc: "子宮内膜のプロゲステロン受容体に直接作用し、内膜の増殖を抑える。異所性の内膜組織（=子宮内膜症の病巣）も同様に縮小させる。" },
          { title: "排卵の抑制", desc: "視床下部-下垂体系に働きかけてFSH・LHの分泌を抑え、排卵を止める。ただしエストロゲンを「完全には」下げないのがGnRHaとの決定的な違い。" },
          { title: "抗炎症作用", desc: "子宮内膜症の病巣で産生される炎症性サイトカイン（IL-6、IL-8など）やプロスタグランジンの産生を抑制。これが疼痛の軽減に直結する。" },
        ]} />

        <Callout type="info" title="GnRHaとの最大の違い：エストロゲンを下げすぎない">
          GnRHa（リュープロレリンなど）はエストロゲンを閉経レベルまでガクンと下げるため、更年期様症状や骨密度低下が問題になります。一方、ジエノゲストはエストロゲンを<strong>卵胞初期レベル（30-50 pg/mL程度）</strong>に維持します。これは骨代謝に悪影響を与えにくい範囲。だから<strong>長期投与が可能</strong>なのです。
        </Callout>
      </section>

      {/* -- セクション3: 適応と用法 -- */}
      <section>
        <h2 id="dosage" className="text-xl font-bold text-gray-800">処方の基本 — 用法・用量・開始タイミング</h2>

        <p>ジエノゲストの処方は非常にシンプルです。<strong>1日2mg（1mg錠を1日2回、朝夕食後）</strong>が基本用量。用量調整の必要がほとんどなく、GLP-1受容体作動薬のような漸増プロトコルもありません。</p>

        <p>服用開始のタイミングは<strong>月経2〜5日目</strong>が推奨されています。これは妊娠を否定するためと、月経周期の早い段階から排卵を抑制するためです。なお、添付文書上は「子宮内膜症」が適応症であり、単なる月経困難症には保険適用されない点に注意が必要です（月経困難症にはLEPが第一選択）。</p>

        <Callout type="point" title="処方前に確認すべき3つのポイント">
          1. <strong>妊娠の可能性がないこと</strong>（妊娠中は禁忌）<br />
          2. <strong>不正性器出血の鑑別</strong>（悪性疾患の除外）<br />
          3. <strong>子宮内膜症の確定診断または臨床的診断</strong>（画像所見＋症状で臨床診断可）
        </Callout>
      </section>

      <InlineCTA />

      {/* -- セクション4: 臨床エビデンス -- */}
      <section>
        <h2 id="evidence" className="text-xl font-bold text-gray-800">エビデンスは十分？ 臨床試験データを読み解く</h2>

        <p>「本当に効くの？」と聞かれたら、<strong>「エビデンスは十分に蓄積されています」</strong>と答えられます。ジエノゲストは日本発の薬剤であり、日本での臨床試験データが豊富なのも特徴です。</p>

        <p>国内第III相試験（52週）では、ジエノゲスト2mg/日投与により<strong>VAS（Visual Analogue Scale）による疼痛スコアが有意に改善</strong>。投与12週時点で約60%の低下が確認され、52週まで効果が維持されました。さらに長期投与試験（5年間）のデータでも、<strong>疼痛改善効果が持続し、重篤な副作用の増加は認められていません</strong>。</p>

        <StatGrid stats={[
          { value: "約60", unit: "%", label: "VAS疼痛スコアの改善率（52週時）" },
          { value: "5", unit: "年", label: "長期投与試験の追跡期間" },
          { value: "同等", unit: "", label: "GnRHaとの疼痛改善効果比較" },
        ]} />

        <p>GnRHa（ブセレリン酢酸塩）との比較試験では、<strong>疼痛改善効果はほぼ同等</strong>という結果。しかし副作用プロファイルには大きな差があり、GnRHa群ではほてりや骨密度低下が顕著だったのに対し、ジエノゲスト群ではそれらが有意に少なかったのです。</p>
      </section>

      {/* -- セクション5: 副作用と対処 -- */}
      <section>
        <h2 id="side-effects" className="text-xl font-bold text-gray-800">避けて通れない副作用 — 不正出血への対処がカギ</h2>

        <p>ジエノゲストの副作用で<strong>最も頻度が高いのが不正出血</strong>です。臨床試験データでは投与初期（特に最初の3ヶ月）に約70-80%の患者さんで何らかの不正出血が報告されています。これは薬が「効いている」証拠でもあるのですが、患者さんにとっては不快で、<strong>服薬中断の最大の原因</strong>にもなります。</p>

        <ComparisonTable
          headers={["副作用", "発現頻度", "時期", "対処法"]}
          rows={[
            ["不正出血", "70-80%（初期）", "投与開始〜3ヶ月がピーク", "事前説明＋3ヶ月で軽快することを伝える"],
            ["頭痛", "約10-20%", "投与初期に多い", "鎮痛薬（NSAIDs）で対応可"],
            ["体重変化", "約5-10%", "長期投与で徐々に", "食事指導・定期的な体重測定"],
            ["うつ傾向", "まれ（1%未満）", "投与中いつでも", "早期発見が重要、精神科連携を検討"],
          ]}
        />

        <Callout type="info" title="不正出血をどう説明するか？ これが服薬継続率を左右する">
          処方時に<strong>「最初の2-3ヶ月は出血があるのが普通です」</strong>と具体的に伝えるだけで、脱落率は大きく変わります。「出血があって怖くなってやめた」というケースの多くは、事前説明の不足が原因。LINE等で定期的にフォローメッセージを送り、「3ヶ月を過ぎれば落ち着くケースがほとんどです」と伝えることが、継続率向上の実践的な施策です。
        </Callout>

        <p>なお、不正出血が長期間（6ヶ月以上）続く場合や、出血量が多い場合は、器質的疾患の除外が必要です。子宮筋腫や子宮内膜ポリープの合併がないか、超音波検査で確認しましょう。</p>
      </section>

      {/* -- セクション6: GnRHaとの比較 -- */}
      <section>
        <h2 id="vs-gnrha" className="text-xl font-bold text-gray-800">ジエノゲスト vs GnRHa — 何がどう違うのか一目でわかる比較表</h2>

        <p>子宮内膜症の薬物療法として、ジエノゲストとGnRHaはどちらもガイドラインで推奨されています。しかし、<strong>臨床的な使い勝手はかなり異なります</strong>。以下の比較表で整理してみましょう。</p>

        <ComparisonTable
          headers={["比較項目", "ジエノゲスト", "GnRHa（リュープロレリン等）"]}
          rows={[
            ["投与経路", "経口（1日2回）", "注射（4週または12週ごと）"],
            ["投与期間の制限", "なし（長期投与可能）", "原則6ヶ月（add-back療法で延長可）"],
            ["骨密度への影響", "ほぼなし", "有意に低下（2-6%/6ヶ月）"],
            ["更年期様症状", "軽微", "ほてり・発汗が高頻度"],
            ["不正出血", "高頻度（特に初期）", "少ない"],
            ["疼痛改善効果", "有効", "有効（同等）"],
            ["保険適用", "あり", "あり"],
            ["妊娠希望時の回復", "中止後1-2ヶ月で排卵回復", "中止後2-3ヶ月で排卵回復"],
          ]}
        />

        <p>一言でまとめると、<strong>短期集中なら GnRHa、長期管理ならジエノゲスト</strong>という使い分けがスタンダードです。特に閉経までの長い期間をカバーしなければならない若年患者では、骨密度を守りながら長期使用できるジエノゲストの価値が際立ちます。</p>
      </section>

      <InlineCTA />

      {/* -- セクション7: 処方時のポイント -- */}
      <section>
        <h2 id="prescribing-tips" className="text-xl font-bold text-gray-800">実践で役立つ処方のポイント — 見落としがちな注意事項</h2>

        <FlowSteps steps={[
          { title: "妊娠希望が出たら中止する", desc: "ジエノゲストは排卵を抑制するため、妊娠希望時は中止が必要。ただし中止後比較的早期（1-2ヶ月）に排卵が回復するのが利点。挙児希望のタイミングを定期的に確認しておく。" },
          { title: "チョコレート嚢胞は定期画像フォロー", desc: "ジエノゲスト投与中もチョコレート嚢胞（子宮内膜症性嚢胞）の経過観察は必須。6ヶ月ごとの超音波検査で嚢胞径の変化を追跡し、増大傾向があれば手術適応を再検討。" },
          { title: "保険適用の条件を再確認", desc: "適応症は「子宮内膜症」。月経困難症のみでは保険適用外。レセプト上、子宮内膜症の確定診断または臨床診断（画像所見＋症状）の記載が求められる。" },
          { title: "術後再発予防としての位置づけ", desc: "腹腔鏡手術後の再発予防にジエノゲストを使用するケースが増加。ガイドラインでも術後薬物療法として推奨されている。" },
        ]} />

        <Callout type="point" title="患者さんとの長期的な関係構築がこの薬の本質">
          ジエノゲストは「一度処方して終わり」の薬ではありません。長期にわたる服薬管理、副作用モニタリング、妊娠希望の変化に応じた治療計画の見直しが必要です。定期的なフォローアップのためのLINEリマインドや、服薬状況の確認は<strong>治療効果そのものに直結する</strong>重要なプロセスです。
        </Callout>
      </section>

      {/* -- セクション8: まとめ -- */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — ジエノゲストは「長く付き合える」子宮内膜症治療薬</h2>

        <p>ジエノゲストの最大の価値は、<strong>効果と安全性のバランスが良く、期間制限なく使い続けられる</strong>こと。GnRHaと同等の疼痛改善効果を持ちながら、骨密度低下や更年期様症状のリスクが大幅に低い。エストロゲンフリーのためピル禁忌の患者さんにも使える。これだけの条件を満たす薬剤は、現時点で他にありません。</p>

        <p>もちろん、不正出血という「避けて通れない副作用」はあります。しかし、事前の丁寧な説明と最初の3ヶ月を乗り越えるサポートがあれば、多くの患者さんが長期的な疼痛管理を実現できます。<strong>「正しい情報提供」と「継続的なフォロー」</strong>——この2つが揃ったとき、ジエノゲストは子宮内膜症治療の強力な武器になるのです。婦人科領域のオンライン診療については<Link href="/lp/column/gynecology-online-clinic-guide" className="text-sky-600 underline hover:text-sky-800">婦人科オンライン診療ガイド</Link>も参考にしてください。PMSへの処方アプローチについては<Link href="/lp/column/pms-online-prescription-guide" className="text-sky-600 underline hover:text-sky-800">PMSオンライン処方ガイド</Link>もあわせてご覧ください。</p>
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
