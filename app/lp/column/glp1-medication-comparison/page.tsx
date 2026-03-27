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
const self = articles.find((a) => a.slug === "glp1-medication-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "リベルサス・オゼンピック・マンジャロの作用機序と減量エビデンスを比較",
  "消化器系副作用の発現率と対処法、適応外使用の注意点を整理",
  "自費処方の価格設計とオンライン処方のLINE運用を解説",
];

const toc = [
  { id: "what-is-glp1", label: "GLP-1受容体作動薬とは（適応外使用の注意）" },
  { id: "rybelsus", label: "リベルサス（セマグルチド内服）" },
  { id: "ozempic", label: "オゼンピック（セマグルチド注射）" },
  { id: "mounjaro", label: "マンジャロ（チルゼパチド）" },
  { id: "comparison", label: "3薬剤の比較表" },
  { id: "side-effects", label: "副作用と注意点" },
  { id: "pricing", label: "自費処方の価格設計" },
  { id: "online-operation", label: "オンライン処方の運用" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        GLP-1受容体作動薬は、2型糖尿病の治療薬として開発された薬剤ですが、強力な<strong>食欲抑制・体重減少効果</strong>から、メディカルダイエットの中核薬剤として注目を集めています。本記事では、リベルサス（内服）・オゼンピック（注射）・マンジャロ（GIP/GLP-1、注射）の3薬剤について、作用機序・減量エビデンス・副作用・価格帯を比較します。<strong>ダイエット目的でのGLP-1使用は日本では適応外</strong>であり、処方は必ず医師の判断のもとで行ってください。
      </p>

      <Callout type="warning" title="重要: GLP-1のダイエット目的使用は適応外です">
        リベルサス・オゼンピック・マンジャロは日本では<strong>2型糖尿病の治療薬</strong>として承認されています。肥満症治療としてはウゴービ（セマグルチド2.4mg）のみが2023年に承認されましたが、BMI35以上等の厳格な適応基準があります。<strong>ダイエット目的でのGLP-1処方は適応外使用</strong>であり、患者に適応外である旨を十分に説明し、同意を得た上で処方する必要があります。また、2型糖尿病患者への薬剤供給不足が社会問題化しており、医療倫理上の配慮も求められます。
      </Callout>

      {/* ── セクション1: GLP-1受容体作動薬とは（適応外使用の注意） ── */}
      <section>
        <h2 id="what-is-glp1" className="text-xl font-bold text-gray-800">GLP-1受容体作動薬とは（適応外使用の注意） — 作用機序と注目される背景</h2>

        <p>GLP-1（グルカゴン様ペプチド-1）は、食事摂取に応じて小腸から分泌される<strong>インクレチンホルモン</strong>です。膵臓β細胞に作用してインスリン分泌を促進するほか、<strong>視床下部の食欲中枢に作用して満腹感を増強</strong>し、胃排出を遅延させることで食欲を抑制します。</p>

        <p>GLP-1受容体作動薬は、天然のGLP-1と比較して<strong>半減期が長い</strong>ため、持続的な食欲抑制効果が得られます。本来は2型糖尿病の血糖コントロール薬として開発されましたが、臨床試験で顕著な体重減少効果が確認されたことから、肥満治療への応用が世界的に進んでいます。</p>

        <p>2023年にはセマグルチド2.4mg（ウゴービ）が日本で肥満症治療薬として承認されましたが、<strong>BMI35以上</strong>（肥満に関連する2つ以上の健康障害を有する場合はBMI27以上）という厳格な適応基準が設けられています。「少し痩せたい」程度の目的での使用は適応外となります。</p>

        <StatGrid stats={[
          { value: "15〜20", unit: "%", label: "セマグルチド2.4mgの体重減少率" },
          { value: "22.5", unit: "%", label: "チルゼパチド15mgの体重減少率" },
          { value: "68", unit: "週", label: "主要臨床試験の投与期間" },
          { value: "BMI35以上", unit: "", label: "日本のウゴービ適応基準" },
        ]} />

        <p>なお、マンジャロ（チルゼパチド）はGLP-1受容体に加えて<strong>GIP（グルコース依存性インスリン分泌刺激ポリペプチド）受容体</strong>にも作用する「デュアルアゴニスト」であり、GLP-1単独作動薬を上回る体重減少効果が報告されています。以下、各薬剤の詳細を見ていきましょう。</p>
      </section>

      {/* ── セクション2: リベルサス ── */}
      <section>
        <h2 id="rybelsus" className="text-xl font-bold text-gray-800">リベルサス（セマグルチド内服） — 唯一の経口GLP-1</h2>

        <p>リベルサスはノボ ノルディスク社が開発した<strong>世界初の経口GLP-1受容体作動薬</strong>です。日本では2020年に2型糖尿病治療薬として承認されました。有効成分のセマグルチドをSNAC（サルカプロザートナトリウム）という吸収促進剤と組み合わせることで、胃からの経口吸収を実現しています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">用量と服用方法</h3>
        <p>3mg・7mg・14mgの3用量があり、3mgから開始して4週間以上ごとに増量するステップアップ方式です。服用方法に独特のルールがあり、<strong>起床時の空腹状態でコップ半分（約120mL）以下の水</strong>で服用し、服用後<strong>少なくとも30分は飲食・他の薬の服用を避ける</strong>必要があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">減量エビデンス</h3>
        <p>OASIS 1試験（肥満・過体重患者対象、非糖尿病）では、セマグルチド経口50mg（リベルサスの承認用量超）の投与68週で<strong>体重が平均-15.1%減少</strong>（プラセボ群-2.4%）という結果が報告されています。ただし、日本で承認されているリベルサスの最大用量は14mgであり、この試験の用量とは異なります。リベルサス14mgの減量効果は<strong>5〜10%程度</strong>とされています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">メディカルダイエットでの位置づけ</h3>
        <p>リベルサスの最大の利点は<strong>注射が不要</strong>という点です。注射への抵抗感がある患者にとってのハードルが大きく下がり、「まずは内服から試したい」というニーズに応えられます。一方、経口バイオアベイラビリティが約1%と低く、食事のタイミングに厳格な制約がある点は患者指導のポイントとなります。</p>

        <Callout type="info" title="リベルサスの服用ルール">
          リベルサスの効果を最大限に発揮するためには、<strong>空腹時に少量の水で服用し、30分間は飲食を避ける</strong>というルールの遵守が不可欠です。これはSNACによる胃内吸収が食物や多量の水で阻害されるためです。服用ルールの遵守率が効果に直結するため、LINEでの服薬リマインドが特に有効な薬剤です。
        </Callout>
      </section>

      {/* ── セクション3: オゼンピック ── */}
      <section>
        <h2 id="ozempic" className="text-xl font-bold text-gray-800">オゼンピック（セマグルチド注射） — 週1回の皮下注射</h2>

        <p>オゼンピックはリベルサスと同じセマグルチドを有効成分とする<strong>週1回の皮下注射製剤</strong>です。日本では2020年に2型糖尿病治療薬として承認されました。注射製剤はバイオアベイラビリティが高く、経口剤よりも確実な血中濃度が得られるため、<strong>効果の安定性</strong>に優れています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">用量と投与方法</h3>
        <p>0.25mg・0.5mg・1.0mgの3用量があり、0.25mgで4週間開始した後、0.5mgに増量し、効果不十分な場合は1.0mgまで増量可能です。<strong>週1回、同じ曜日に皮下注射</strong>します。腹部・大腿部・上腕部のいずれかに自己注射します。専用のペン型注入器（フレックスタッチ）を使用し、極細の針（34G）のため痛みはほとんどありません。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">減量エビデンス</h3>
        <p>STEP 1試験（BMI30以上の非糖尿病肥満患者対象）では、セマグルチド2.4mg（ウゴービの用量）の投与68週で<strong>体重が平均-14.9%減少</strong>（プラセボ群-2.4%）という結果が得られています。オゼンピックの承認最大用量は1.0mgであり、この用量での減量効果は<strong>10〜12%程度</strong>と推定されます。</p>

        <p>また、STEP 2試験（2型糖尿病患者対象）では、セマグルチド2.4mgで<strong>-9.6%</strong>の体重減少が報告されており、糖尿病の有無で効果に差があることが示されています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リベルサスとの使い分け</h3>
        <p>同じセマグルチドでも、注射製剤のオゼンピックは<strong>食事タイミングの制約がない</strong>点がリベルサスとの大きな違いです。週1回の注射のみで済むため、むしろリベルサスの毎朝の服薬ルールより簡便と感じる患者も少なくありません。リベルサスで効果不十分な場合のステップアップとしても使用されます。</p>
      </section>

      {/* ── セクション4: マンジャロ ── */}
      <section>
        <h2 id="mounjaro" className="text-xl font-bold text-gray-800">マンジャロ（チルゼパチド） — GIP/GLP-1デュアルアゴニスト</h2>

        <p>マンジャロはイーライリリー社が開発した<strong>世界初のGIP/GLP-1デュアル受容体作動薬</strong>です。日本では2023年に2型糖尿病治療薬として承認されました。GLP-1受容体に加えてGIP受容体にも作用することで、<strong>単独のGLP-1作動薬を上回る体重減少効果</strong>が報告されています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">用量と投与方法</h3>
        <p>2.5mg・5mg・7.5mg・10mg・12.5mg・15mgの6用量があり、2.5mgで4週間開始した後、4週間以上の間隔で段階的に増量します。オゼンピックと同様に<strong>週1回の皮下注射</strong>で、専用のオートインジェクター（アテオス）を使用します。注射操作はワンステップで非常にシンプルです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">減量エビデンス</h3>
        <p>SURMOUNT-1試験（BMI30以上の非糖尿病肥満患者対象）では、チルゼパチドの投与72週で以下の体重減少が報告されています。</p>

        <BarChart
          data={[
            { label: "チルゼパチド 5mg", value: 15.0, color: "bg-sky-300" },
            { label: "チルゼパチド 10mg", value: 19.5, color: "bg-sky-500" },
            { label: "チルゼパチド 15mg", value: 22.5, color: "bg-emerald-500" },
            { label: "セマグルチド 2.4mg", value: 14.9, color: "bg-amber-400" },
            { label: "プラセボ", value: 3.1, color: "bg-gray-300" },
          ]}
          unit="%減"
        />

        <p>最大用量の15mgでは<strong>体重が平均-22.5%減少</strong>（約24kg減）という驚異的な結果で、セマグルチド2.4mgの-14.9%を大きく上回っています。チルゼパチド15mg群では、<strong>BMI30以上の患者の約40%がBMI25未満</strong>（日本基準の「標準体重」）を達成しています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">GIP受容体への作用の意義</h3>
        <p>GIPは脂肪組織に直接作用してインスリン感受性を改善し、脂肪分解を促進すると考えられています。GLP-1による食欲抑制に加えて、GIPの<strong>脂肪代謝改善作用</strong>が上乗せされることで、セマグルチド単独を上回る体重減少効果が得られるというのが現在の理解です。</p>

        <Callout type="info" title="マンジャロの供給状況">
          マンジャロは2型糖尿病患者への供給を優先するため、<strong>限定出荷</strong>が続いている状況です。ダイエット目的での処方が供給不足を悪化させているとの指摘もあり、処方にあたっては薬剤供給の社会的影響への配慮も必要です。
        </Callout>
      </section>

      {/* ── セクション5: 3薬剤の比較表 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">3薬剤の比較表 — 投与方法・効果・価格を一覧で確認</h2>

        <p>3種類のGLP-1関連薬剤を主要な項目で横並び比較します。</p>

        <ComparisonTable
          headers={["項目", "リベルサス", "オゼンピック", "マンジャロ"]}
          rows={[
            ["一般名", "セマグルチド（経口）", "セマグルチド（注射）", "チルゼパチド"],
            ["作用機序", "GLP-1受容体作動薬", "GLP-1受容体作動薬", "GIP/GLP-1デュアル作動薬"],
            ["投与方法", "1日1回内服", "週1回皮下注射", "週1回皮下注射"],
            ["日本承認", "2020年", "2020年", "2023年"],
            ["日本での適応", "2型糖尿病", "2型糖尿病", "2型糖尿病"],
            ["最大用量", "14mg/日", "1.0mg/週", "15mg/週"],
            ["減量効果（承認用量域）", "約5〜10%", "約10〜12%", "約15〜22.5%"],
            ["食事制限", "空腹時服用・30分飲食不可", "なし", "なし"],
            ["主な副作用", "悪心・下痢・便秘", "悪心・下痢・便秘", "悪心・下痢・便秘"],
            ["自費月額費用（目安）", "8,000〜20,000円", "15,000〜35,000円", "20,000〜80,000円"],
            ["メリット", "注射不要、始めやすい", "効果安定、週1回で完結", "最も強力な減量効果"],
            ["デメリット", "服用ルールが厳格", "自己注射への抵抗", "高価格・供給制限"],
          ]}
        />

        <p>薬剤選択は、<strong>患者の予算・注射への抵抗感・目標体重減少量</strong>の3つを総合的に考慮して決定します。「まずは内服で試したい」ならリベルサス、「確実な効果を求める」ならオゼンピック、「最大限の減量効果を期待する」ならマンジャロが候補となります。GLP-1受容体作動薬の基本的な仕組みについては<Link href="/lp/column/glp1-medication-guide" className="text-sky-600 underline hover:text-sky-800">GLP-1受容体作動薬とは — 仕組みをわかりやすく解説</Link>もあわせてご覧ください。</p>

        <p>ただし、いずれの薬剤も<strong>投与中止後にリバウンドが起こる</strong>ことが臨床試験で示されています。STEP 1の延長試験では、セマグルチド中止後1年間で失った体重の約2/3が戻ったとの報告があり、「一時的に薬を使って痩せる」だけでは持続的な効果は得られません。食事・運動習慣の改善と併せた包括的アプローチが不可欠です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: 副作用と注意点 ── */}
      <section>
        <h2 id="side-effects" className="text-xl font-bold text-gray-800">副作用と注意点 — 安全な処方のために</h2>

        <p>GLP-1受容体作動薬の最も一般的な副作用は<strong>消化器症状</strong>です。胃排出遅延と食欲抑制という薬理作用そのものに起因するため、ある程度の発現は避けられません。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">消化器系副作用</h3>
        <p>最も多い副作用は<strong>悪心（吐き気）</strong>で、セマグルチドで約20〜40%、チルゼパチドで約12〜33%に発現します。多くは投与開始初期や増量時に出現し、<strong>数週間で自然に軽減</strong>します。下痢（約10〜20%）、便秘（約8〜15%）、嘔吐（約5〜15%）も報告されています。</p>

        <BarChart
          data={[
            { label: "悪心", value: 35, color: "bg-red-400" },
            { label: "下痢", value: 18, color: "bg-orange-400" },
            { label: "便秘", value: 12, color: "bg-amber-400" },
            { label: "嘔吐", value: 10, color: "bg-yellow-400" },
            { label: "腹痛", value: 8, color: "bg-lime-400" },
          ]}
          unit="%"
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">重大な副作用</h3>
        <p>頻度は低いものの、以下の重大な副作用に注意が必要です。</p>

        <Callout type="warning" title="GLP-1受容体作動薬の重大な副作用">
          <strong>急性膵炎</strong>: 激しい腹痛・背部痛が出現した場合は直ちに投与を中止し、適切な処置を行う必要があります。膵炎の既往歴がある患者への投与は慎重に判断してください。<br />
          <strong>胆石症・胆嚢炎</strong>: 急激な体重減少に伴い胆石が形成されるリスクがあります。<br />
          <strong>低血糖</strong>: 単剤では稀ですが、SU剤やインスリンとの併用で発現リスクが上昇します。<br />
          <strong>甲状腺髄様がん</strong>: 動物実験（げっ歯類）で甲状腺C細胞腫瘍の発現増加が認められています。甲状腺髄様がんの既往・家族歴がある患者には禁忌です。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">副作用マネジメントのポイント</h3>
        <p>消化器症状への対処として、<strong>低用量から開始し段階的に増量する</strong>ことが最も重要です。「効果を早く出したい」と増量を急ぐと副作用が強く出て治療中断に至るケースが少なくありません。食事は少量頻回とし、脂肪分の多い食事を避けることも悪心の軽減に有効です。</p>

        <p>患者フォローでは、増量前に必ず副作用の有無を確認し、消化器症状が持続している場合は増量を見送る判断が必要です。LINEでの定期フォローにより、「悪心がひどいので自己判断で中止した」というケースを防ぎ、適切な対処（増量見送り、制吐剤の処方等）を提案できます。リベルサスの副作用と対処法の詳細は<Link href="/lp/column/rybelsus-side-effects-guide" className="text-sky-600 underline hover:text-sky-800">リベルサスの副作用ガイド</Link>を参照してください。</p>
      </section>

      {/* ── セクション7: 自費処方の価格設計 ── */}
      <section>
        <h2 id="pricing" className="text-xl font-bold text-gray-800">自費処方の価格設計 — 適正な価格帯と収益モデル</h2>

        <p>GLP-1受容体作動薬のダイエット目的処方は100%自費であり、クリニックが自由に価格を設定できます。ただし、薬剤の仕入れコストが高いため、適切な価格設計が利益率に直結します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">薬剤原価と販売価格の目安</h3>

        <ComparisonTable
          headers={["薬剤", "仕入れ目安（月額）", "患者提供価格（月額）", "利益率"]}
          rows={[
            ["リベルサス 3mg", "3,000〜5,000円", "8,000〜12,000円", "55〜70%"],
            ["リベルサス 7mg", "5,000〜8,000円", "12,000〜18,000円", "55〜65%"],
            ["リベルサス 14mg", "8,000〜12,000円", "18,000〜25,000円", "50〜60%"],
            ["オゼンピック 0.5mg", "6,000〜10,000円", "15,000〜25,000円", "55〜65%"],
            ["オゼンピック 1.0mg", "10,000〜15,000円", "25,000〜35,000円", "50〜60%"],
            ["マンジャロ 2.5mg", "8,000〜12,000円", "20,000〜30,000円", "55〜65%"],
            ["マンジャロ 5mg", "15,000〜22,000円", "35,000〜50,000円", "50〜60%"],
            ["マンジャロ 10mg以上", "25,000〜40,000円", "50,000〜80,000円", "45〜55%"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">価格設計のポイント</h3>
        <p>メディカルダイエット（GLP-1）の患者は<strong>月額2〜5万円</strong>の価格帯に最もボリュームゾーンがあるとされています。リベルサス7mg（月額12,000〜18,000円）が「まず試してみる」層の入り口として最も選ばれやすく、効果を実感した患者がオゼンピックやマンジャロにステップアップするパターンが一般的です。</p>

        <p>まとめ購入割引（3ヶ月パックで5〜10%オフ）や、初回トライアル価格の設定も有効です。ただし、安売り競争に巻き込まれると利益率が急速に悪化するため、<strong>フォロー体制の充実で差別化</strong>する戦略が長期的に有効です。</p>
      </section>

      {/* ── セクション8: オンライン処方の運用 ── */}
      <section>
        <h2 id="online-operation" className="text-xl font-bold text-gray-800">オンライン処方の運用 — LINE活用で継続フォローを自動化</h2>

        <p>GLP-1受容体作動薬のオンライン処方は、<strong>初回診察での禁忌確認</strong>と<strong>増量フェーズのフォロー</strong>が運用の要です。対面と同等の安全性を担保しながら、LINEを活用して効率的なフォロー体制を構築します。</p>

        <FlowSteps steps={[
          { title: "LINE予約・事前問診", desc: "BMI・既往歴・膵炎歴・甲状腺疾患歴・服薬状況・ダイエット目的を事前収集。" },
          { title: "ビデオ診察（初回15分）", desc: "禁忌確認、適応外使用の説明、薬剤選択、副作用説明、同意取得。体重・血液検査値を確認。" },
          { title: "低用量から処方開始", desc: "リベルサス3mgまたはオゼンピック0.25mgで開始。1ヶ月分を処方・配送。" },
          { title: "2週間後LINEフォロー", desc: "副作用（悪心・下痢等）の有無を自動問診で確認。問題なければ継続、問題あれば医師介入。" },
          { title: "4週間後に増量判断", desc: "体重変化・副作用を確認し、増量可否を判断。LINE問診+医師承認で次のステップへ。" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">体重記録のLINE報告</h3>
        <p>週1回の体重報告をLINEで行ってもらう仕組みを設けると、患者のモチベーション維持と治療効果のモニタリングを同時に実現できます。Lオペ for CLINICなどのLINE運用ツールでは、患者が報告した体重データを管理画面で一覧確認できるため、診察効率も向上します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リバウンド防止のフォロー</h3>
        <p>GLP-1投与中止後のリバウンドが課題であることは前述の通りです。減量目標に近づいた段階で、<strong>漸減スケジュール</strong>（徐々に用量を減らす）と<strong>食事・運動指導の強化</strong>を組み合わせたプログラムを提供することで、リバウンドリスクを軽減し、患者との長期的な関係性を構築できます。</p>

        <StatGrid stats={[
          { value: "85", unit: "%", label: "LINEフォロー導入後の継続率" },
          { value: "3〜6", unit: "ヶ月", label: "平均治療期間" },
          { value: "15〜40", unit: "万円", label: "患者LTV" },
          { value: "5", unit: "分/人", label: "フォロー1回の所要時間" },
        ]} />

        <p><Link href="/lp/column/diet-glp1-online-clinic-lope" className="text-emerald-700 underline">メディカルダイエット（GLP-1）のオンライン診療ガイド</Link>や<Link href="/lp/column/diet-online-clinic-winning-strategy" className="text-emerald-700 underline">メディカルダイエットクリニックの運営戦略</Link>も参考に、安全性と効率性を両立するオンライン処方体制を構築してください。</p>
      </section>

      {/* ── セクション9: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 適応外使用を正しく理解し、安全な処方体制を構築する</h2>

        <p>GLP-1受容体作動薬は強力な体重減少効果を持つ薬剤であり、メディカルダイエット市場で中核的な存在です。<strong>内服で始めやすいリベルサス、効果が安定するオゼンピック、最も強力なマンジャロ</strong>と、患者のニーズと予算に応じた選択肢が揃っています。</p>

        <p>一方で、ダイエット目的での使用は日本では<strong>適応外</strong>であり、消化器系副作用のマネジメント、膵炎・胆石症のリスク管理、投与中止後のリバウンド対策など、<strong>安全管理の負荷が高い領域</strong>でもあります。オンライン処方ではLINEを活用した定期フォローを組み込み、増量判断・副作用管理・体重モニタリングを効率的に行うことが成功の鍵です。</p>

        <Callout type="point" title="処方は必ず医師の判断で">
          本記事はGLP-1受容体作動薬の一般的な薬剤情報を整理したものであり、個別の処方を推奨するものではありません。ダイエット目的でのGLP-1使用は適応外であることを患者に十分説明し、禁忌事項の確認・副作用モニタリングを行った上で、必ず医師の判断で処方してください。2型糖尿病患者への薬剤供給への影響にも十分配慮してください。
        </Callout>
      </section>
    </ArticleLayout>
  );
}
