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
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";

const self: Article = {
  slug: "pms-online-prescription-guide",
  title: "PMS・月経困難症のオンライン処方ガイド — ピル・漢方の使い分けと継続処方の設計",
  description: "PMS（月経前症候群）・月経困難症のオンライン診療における診断・薬剤選択・継続処方の設計を徹底解説。低用量ピル（LEP/OC）・漢方薬・鎮痛薬の使い分け、保険適用の注意点、Lオペ for CLINICによるLINE問診・予約・服薬フォローの自動化まで網羅します。",
  date: "2026-03-26",
  category: "ガイド",
  readTime: "11分",
  tags: ["PMS", "月経困難症", "低用量ピル", "漢方", "オンライン診療"],
};

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
  { q: "PMS・月経困難症のオンライン処方ガイドでLINE導入の効果はどのくらいですか？", a: "導入クリニックの実績では、予約リマインドによる無断キャンセル60〜80%削減、セグメント配信によるリピート率20〜30%向上、AI自動返信による電話対応70%削減など、多面的な効果が報告されています。" },
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
  "PMSは月経のある女性の約70〜80%が何らかの症状を経験 — 日常生活に支障をきたす中等度以上は約5〜10%",
  "LEP（ヤーズ・フリウェル等）は月経困難症に保険適用、OC（マーベロン・トリキュラー等）は自費 — 適応の違いに注意",
  "Lオペ for CLINICで服薬リマインド・副作用フォロー・継続処方の予約リマインドをLINE上で自動化",
];

const toc = [
  { id: "pms-overview", label: "PMS・月経困難症とは？" },
  { id: "medication-comparison", label: "薬剤選択 — ピル・漢方・鎮痛薬の使い分け" },
  { id: "online-flow", label: "オンライン診療フロー" },
  { id: "lope-pms", label: "Lオペ for CLINICでPMS診療を運用" },
  { id: "revenue", label: "収益モデルと継続処方の設計" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        月経のある女性の約70〜80%が何らかのPMS（月経前症候群）症状を経験し、月経困難症は約25%の女性に影響を与えています。にもかかわらず、<strong>「生理痛は我慢するもの」という社会的通念</strong>から受診率は低く、適切な治療を受けていない患者が多数存在します。2020年のオンライン診療恒久化により、<strong>ピルの継続処方がオンラインで完結</strong>できるようになり、働く女性や通院が困難な患者にとって大きな福音となっています。PMS・月経困難症はオンライン診療と<Link href="/lp/column/femtech-clinic-online-strategy" className="text-sky-600 underline hover:text-sky-800">フェムテック戦略</Link>の重要な柱です。本記事では、低用量ピル・漢方薬の使い分け、保険適用LEPと自費OCの違い、そして<strong>Lオペ for CLINICによるLINE問診・服薬フォロー・継続処方リマインドの自動化</strong>まで徹底解説します。
      </p>

      {/* ── セクション1: 疾患概要 ── */}
      <section>
        <h2 id="pms-overview" className="text-xl font-bold text-gray-800">PMS・月経困難症とは？ — 定義・症状・疫学</h2>

        <p>
          PMS（月経前症候群: Premenstrual Syndrome）は、月経開始の3〜10日前から始まる身体的・精神的症状の総称です。月経開始とともに症状が軽減・消失する点が特徴で、<strong>排卵後のプロゲステロン（黄体ホルモン）の変動</strong>が主な原因と考えられています。一方、月経困難症は月経期間中の下腹部痛・腰痛・頭痛などの症状を指し、<strong>器質性（子宮内膜症・子宮筋腫等が原因）と機能性（器質的疾患のないもの）</strong>に分類されます。
        </p>

        <ComparisonTable
          headers={["項目", "PMS（月経前症候群）", "月経困難症"]}
          rows={[
            ["症状時期", "月経開始の3〜10日前", "月経期間中"],
            ["主な身体症状", "乳房張り・むくみ・頭痛・腹部膨満", "下腹部痛・腰痛・悪心・下痢"],
            ["精神症状", "イライラ・抑うつ・不安・集中力低下", "痛みによるイライラ・不安"],
            ["有病率", "70〜80%（中等度以上: 5〜10%）", "約25%"],
            ["重症型", "PMDD（月経前不快気分障害）", "器質性月経困難症"],
          ]}
        />

        <StatGrid stats={[
          { value: "70〜80", unit: "%", label: "PMS症状の経験率" },
          { value: "25", unit: "%", label: "月経困難症の有病率" },
          { value: "5〜10", unit: "%", label: "中等度以上のPMS" },
          { value: "72", unit: "万人", label: "子宮内膜症の推定患者" },
        ]} />

        <p>
          機能性月経困難症は10〜20代の若年女性に多く、年齢とともに軽快する傾向があります。一方、器質性月経困難症は子宮内膜症や子宮筋腫を背景とし、30代以降に増加します。<strong>器質性月経困難症が疑われる場合は、超音波検査等の対面での精査が必要</strong>であり、オンライン診療のみでの管理には限界がある点を明確にしておく必要があります。
        </p>

        <Callout type="warning" title="PMDDの鑑別に注意">
          PMS症状のうち、精神症状が著しく強い場合は<strong>PMDD（月経前不快気分障害）</strong>の可能性があります。PMDDは精神疾患としてDSM-5に記載されており、SSRI（選択的セロトニン再取り込み阻害薬）の有効性が示されています。希死念慮を伴うケースもあるため、精神症状が重度の場合は<strong>精神科との連携</strong>を検討してください。
        </Callout>
      </section>

      {/* ── セクション2: 薬剤選択 ── */}
      <section>
        <h2 id="medication-comparison" className="text-xl font-bold text-gray-800">薬剤選択 — ピル・漢方・鎮痛薬の使い分け</h2>

        <p>
          PMS・月経困難症の治療薬は、<strong>低用量ピル（LEP/OC）、漢方薬、鎮痛薬（NSAIDs）</strong>の3つが柱となります。患者の症状パターン・年齢・妊娠希望・喫煙歴・基礎疾患に応じた薬剤選択が重要です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LEP（保険適用）とOC（自費）の違い</h3>

        <ComparisonTable
          headers={["項目", "LEP（低用量エストロゲン・プロゲスチン配合剤）", "OC（経口避妊薬）"]}
          rows={[
            ["保険適用", "月経困難症に適用あり", "避妊目的のため自費"],
            ["代表薬", "ヤーズ配合錠・フリウェル配合錠LD/ULD・ジェミーナ配合錠", "マーベロン28・トリキュラー28・ラベルフィーユ28"],
            ["患者負担（3割）", "約1,500〜2,500円/月", "約2,000〜3,000円/月（自費）"],
            ["処方の前提", "月経困難症の診断が必要", "避妊を主目的として処方"],
            ["定期検査", "6〜12か月ごとの血液検査を推奨", "同左"],
          ]}
        />

        <Callout type="warning" title="LEPの適応外使用に注意">
          LEPの保険適用は<strong>「月経困難症」</strong>に限定されます。PMS（月経前症候群）のみを適応とした保険適用LEPは現時点で存在しません。PMSへのLEP処方は適応外使用となるため、患者への十分な説明と同意が必要です。なお、ヤーズ配合錠は月経困難症に加えて<strong>子宮内膜症に伴う疼痛</strong>にも適応があります。PMSが主訴の場合は漢方薬や自費OCを第一選択とすることも検討してください。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">漢方薬の選択指針</h3>

        <ComparisonTable
          headers={["漢方薬", "適応する証・症状", "特徴"]}
          rows={[
            ["当帰芍薬散（23番）", "虚証・冷え性・むくみ・貧血傾向", "PMSの第一選択として広く使用"],
            ["加味逍遙散（24番）", "イライラ・不安・のぼせ・肩こり", "精神症状が強いPMSに有効"],
            ["桂枝茯苓丸（25番）", "実証・のぼせ・下腹部痛・瘀血", "月経痛が強い場合に使用"],
            ["芍薬甘草湯（68番）", "急性の筋痙攣・月経痛の頓服", "即効性あり、甘草の長期使用に注意"],
            ["桃核承気湯（61番）", "実証・便秘・のぼせ・イライラ", "便秘を伴うPMS・月経困難症に"],
          ]}
        />

        <p>
          漢方薬はピルが使用できない患者（喫煙者・35歳以上でBMI30以上・血栓リスクが高い方・授乳中など）にとって<strong>重要な代替選択肢</strong>です。また、ピルとの併用も可能であり、ピルで月経痛をコントロールしつつ漢方薬でPMS症状を緩和する組み合わせも有効です。漢方薬はすべて保険適用があるため、<strong>患者負担を抑えた長期処方が可能</strong>です。ピルの種類ごとの特徴については<Link href="/lp/column/pill-types-comparison" className="text-sky-600 underline hover:text-sky-800">ピル比較ガイド</Link>で詳しく整理しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">NSAIDs（鎮痛薬）の位置づけ</h3>

        <p>
          ロキソプロフェン（ロキソニン）やイブプロフェンなどのNSAIDsは月経痛の対症療法として広く使用されます。プロスタグランジンの産生を抑制し、子宮収縮を緩和する作用があります。<strong>痛みが出始める前（月経開始直後）からの服用が効果的</strong>であることを患者に指導します。ただし、NSAIDsは対症療法であり、PMSの精神症状や月経困難症の根本治療にはならないため、ピルや漢方薬と併用する位置づけです。
        </p>

        <BarChart
          data={[
            { label: "LEP（保険ピル）", value: 35 },
            { label: "OC（自費ピル）", value: 25 },
            { label: "漢方薬", value: 22 },
            { label: "NSAIDs単独", value: 13 },
            { label: "その他", value: 5 },
          ]}
          unit="%"
        />
      </section>

      {/* ── セクション3: オンライン診療フロー ── */}
      <section>
        <h2 id="online-flow" className="text-xl font-bold text-gray-800">オンライン診療フロー — 初診から継続処方まで</h2>

        <p>
          PMS・月経困難症は問診を中心に診断でき、処方薬が内服薬のため配送対応可能であり、<strong>オンライン診療との親和性が非常に高い</strong>領域です。ただし、器質性月経困難症の除外や定期的な血液検査の必要性を考慮した診療フローの設計が重要です。
        </p>

        <FlowSteps steps={[
          { title: "Step 1: LINE問診で症状と既往歴を収集", desc: "月経周期・症状の種類と時期・重症度（VASスケール）・妊娠希望の有無・喫煙歴・血栓症リスク因子（BMI・家族歴）・現在の治療歴を事前収集。器質性疾患の既往（子宮内膜症・子宮筋腫等）も確認する。" },
          { title: "Step 2: ビデオ診察（10〜15分）", desc: "問診内容を確認し、機能性月経困難症/PMSの診断を行う。器質性疾患が疑われる場合は対面での超音波検査を推奨。ピルの禁忌事項（35歳以上の喫煙者・片頭痛（前兆あり）・血栓症既往等）を確認し、薬剤を選択する。" },
          { title: "Step 3: 処方・配送", desc: "初回処方は1〜3シート（1〜3か月分）が目安。LEP処方の場合は月経困難症の診断名での保険処方。OC処方は自費。漢方薬は14〜30日分からスタート。提携薬局から患者宅へ配送する。" },
          { title: "Step 4: 1か月後フォロー", desc: "副作用（不正出血・悪心・頭痛・気分変化等）の確認、症状改善度の評価を行う。ピルの場合、不正出血は服用開始後1〜3か月で改善することが多いため、早期の中断を防ぐ説明が重要。" },
          { title: "Step 5: 継続処方と定期検査", desc: "安定期は3シート（3か月分）の処方が可能。6〜12か月ごとに血液検査（血算・肝機能・脂質・凝固系）と血圧測定を推奨。血液検査は近医での実施結果をオンライン診察時に確認する運用が合理的。" },
        ]} />

        <Callout type="info" title="血栓症リスクのモニタリング">
          低用量ピル服用者の<strong>静脈血栓塞栓症（VTE）リスクは非服用者の3〜5倍</strong>に上昇します（ただし絶対リスクは年間1万人あたり3〜9人）。特に服用開始後3〜12か月が高リスク期間です。ふくらはぎの腫脹・疼痛、突然の胸痛・息切れ、激しい頭痛などの血栓症状が出現した場合は<strong>ただちに服用を中止し、対面での精査を指示</strong>してください。
        </Callout>
      </section>

      {/* ── セクション4: Lオペ活用 ── */}
      <section>
        <h2 id="lope-pms" className="text-xl font-bold text-gray-800">Lオペ for CLINICでPMS・月経困難症診療を運用する</h2>

        <p>
          Lオペ for CLINICは、PMS・月経困難症のオンライン診療に必要な<strong>問診・予約・服薬フォロー・継続処方リマインド</strong>をLINE上で一元管理できます。特にピルの継続処方は毎月〜3か月ごとのリピートが発生するため、<strong>自動化の効果が大きい領域</strong>です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 月経症状スクリーニング問診</h3>

        <p>
          PMS/月経困難症専用の問診テンプレートをLINE上で配信します。月経周期・症状のVAS評価・ピルの禁忌チェック（喫煙歴・片頭痛・血栓症既往等）を自動収集し、医師の診察前に情報が揃います。禁忌に該当する患者には対面受診を案内する動線を自動で提示可能です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 服薬リマインドとフォロー配信</h3>

        <p>
          ピルの飲み忘れは避妊効果の低下だけでなく、不正出血の原因にもなります。フォローアップルールを活用し、処方開始後1か月の副作用確認メッセージ、シート残量の確認リマインド、次回処方の予約案内をLINEで自動配信します。「ピルの残りが少なくなっていませんか？次回処方はこちらから」というワンタップ予約動線で、<strong>処方切れによる離脱を防止</strong>します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. セグメント配信で患者を適切にフォロー</h3>

        <p>
          「LEP処方中」「OC処方中」「漢方処方中」「新規相談」などのタグで患者を分類し、それぞれに最適なメッセージを配信します。LEP処方中の患者には定期検査のリマインドを、漢方処方中の患者には体質に合わせた生活アドバイスを、<strong>自動で出し分けて配信</strong>できます。
        </p>

        <ResultCard
          before="ピル継続処方の6か月継続率が低い"
          after="Lオペ導入後: 継続率が大幅に改善（服薬リマインド＋予約自動化）"
          metric="継続率の大幅改善が期待"
          description="フォローアップルール・処方リマインド・ワンタップ予約で離脱を防止"
        />

        <InlineCTA />
      </section>

      {/* ── セクション5: 収益モデル ── */}
      <section>
        <h2 id="revenue" className="text-xl font-bold text-gray-800">収益モデルと継続処方の設計</h2>

        <p>
          PMS・月経困難症のオンライン診療は、<strong>毎月の継続処方によるストック型収益</strong>が特徴です。ピルは長期服用が前提のため、一度処方が始まれば年単位での継続が見込めます。保険LEPと自費OCの組み合わせで安定した収益基盤を構築できます。
        </p>

        <ComparisonTable
          headers={["項目", "単価", "備考"]}
          rows={[
            ["オンライン初診料（自費）", "3,000〜5,000円", "保険初診も可"],
            ["LEP処方（保険・3割・1シート）", "約1,500〜2,500円（患者負担）", "再診料＋処方箋料＋薬剤費"],
            ["OC処方（自費・1シート）", "2,500〜3,500円", "薬剤費＋診察料込み"],
            ["漢方処方（保険・3割・30日）", "約800〜1,500円（患者負担）", "薬剤費"],
            ["オンライン再診料（自費）", "1,500〜2,500円", "継続処方時"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">月間収益シミュレーション（管理患者100人の場合）</h3>

        <BarChart
          data={[
            { label: "OC自費処方（60人）", value: 210000, color: "bg-pink-500" },
            { label: "LEP保険診療（30人）", value: 120000, color: "bg-rose-400" },
            { label: "漢方保険（20人）", value: 40000, color: "bg-amber-500" },
            { label: "新規初診（15件）", value: 60000, color: "bg-blue-500" },
          ]}
          unit="円"
        />

        <p>
          管理患者100人の場合、<strong>月間約43万円の収益</strong>が見込めます。ピル処方は患者の積み上げが容易であり、200人で月間80万円超、300人で120万円超と、<strong>規模に比例して安定収益が拡大</strong>します。ピルのオンライン処方は既存のピル処方クリニックとの競合もありますが、<strong>LINE上での利便性と丁寧なフォロー体制</strong>で差別化が可能です。ピルのオンライン診療の詳細は<Link href="/lp/column/pill-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">ピルのオンライン処方ガイド</Link>も併せてご覧ください。
        </p>
      </section>

      {/* ── セクション6: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — PMS・月経困難症オンライン診療の成功戦略</h2>

        <Callout type="success" title="PMS・月経困難症オンライン診療 成功の3つの柱">
          <ul className="mt-1 space-y-1">
            <li>・<strong>LEPとOCの適応を正確に区別</strong>: 月経困難症にはLEP（保険）、避妊・PMS主訴にはOC（自費）、ピル禁忌例には漢方を第一選択</li>
            <li>・<strong>継続処方の仕組みを自動化</strong>: 処方リマインド・ワンタップ再予約・副作用フォローで離脱を最小化</li>
            <li>・<strong>器質性疾患の除外と定期検査を忘れない</strong>: 年1回以上の超音波検査推奨・6〜12か月ごとの血液検査で安全性を担保</li>
          </ul>
        </Callout>

        <p>
          PMS・月経困難症は<strong>女性の日常生活に直結する疾患</strong>でありながら、受診率が低く十分な治療を受けていない患者が数多く存在します。オンライン診療でアクセスの障壁を下げ、LEP・OC・漢方から最適な薬剤を選択し、Lオペ for CLINICで服薬フォローと継続処方を自動化することで、<strong>患者のQOL向上とクリニックの安定収益を同時に実現</strong>できます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連記事</h3>
        <ul className="space-y-1 text-gray-700">
          <li>
            <Link href="/lp/column/pill-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">ピルのオンライン処方ガイド</Link> — ピルに特化したオンライン診療の運用ノウハウ
          </li>
          <li>
            <Link href="/lp/column/online-clinic-complete-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療完全ガイド</Link> — オンライン診療の始め方から運用まで
          </li>
          <li>
            <Link href="/lp/column/online-clinic-prescription-rules" className="text-sky-600 underline hover:text-sky-800">オンライン診療の処方ルール</Link> — 処方日数・薬剤制限の最新情報
          </li>
          <li>
            <Link href="/lp/column/clinic-repeat-rate-improvement" className="text-sky-600 underline hover:text-sky-800">リピート率改善ガイド</Link> — 継続処方の患者を離脱させないノウハウ
          </li>
          <li>
            <Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談・お問い合わせ</Link> — PMS・月経困難症オンライン外来の運用設計をご相談いただけます
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
