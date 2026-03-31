import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  FlowSteps,
  StatGrid,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "mounjaro-complete-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "マンジャロとは？はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "マンジャロは世界初のGIP/GLP-1デュアル受容体作動薬で、従来のGLP-1薬より強い減量効果",
  "用量は2.5mg〜15mgの6段階。初回は2.5mgから開始し、4週間ごとに調整",
  "よくある勘違い12選を整理 — ピル併用可能、低血糖リスク低い、やめても使用前には戻らない",
];

const toc = [
  { id: "what-is-mounjaro", label: "マンジャロとは" },
  { id: "dual-mechanism", label: "GIP/GLP-1デュアルの仕組み" },
  { id: "dosage", label: "用量の選び方" },
  { id: "comparison", label: "他薬との違い" },
  { id: "myths", label: "よくある勘違い12選" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「マンジャロって名前は聞くけど、結局なにがスゴいの？」と思っている方、多いですよね。マンジャロ（チルゼパチド）は、従来のGLP-1薬とは<strong>構造からして別モノ</strong>の新世代ダイエット薬です。この記事では、仕組み・用量の選び方・他薬との違い・よくある勘違いまで、初めての方にもわかるようにまとめました。
      </p>

      <Callout type="warning" title="適応外使用に関する注意">
        マンジャロは日本では<strong>2型糖尿病の治療薬</strong>として承認されています。ダイエット目的での使用は適応外であり、医師の判断のもとで処方を受けてください。
      </Callout>

      {/* ── セクション1: マンジャロとは ── */}
      <section>
        <h2 id="what-is-mounjaro" className="text-xl font-bold text-gray-800">マンジャロとは — 世界初のデュアル受容体作動薬</h2>

        <p>マンジャロ（一般名: チルゼパチド）は、イーライリリー社が開発した<strong>世界初のGIP/GLP-1デュアル受容体作動薬</strong>です。日本では2023年に2型糖尿病治療薬として承認されました。</p>

        <p>「GLP-1ダイエット薬」というカテゴリで語られることが多いんですが、実はマンジャロはGLP-1だけじゃなく<strong>GIP（グルコース依存性インスリン分泌刺激ポリペプチド）</strong>にも同時に作用します。つまり、リベルサスやオゼンピックが「シングル」だとすれば、マンジャロは「ダブル」。この違いが、圧倒的な減量データにつながっているんです。</p>

        <img src="/clinic/column/images/mounjaro/1802701961789309137-GQR74M_asAAzs40.jpg" alt="マンジャロ（チルゼパチド）の基本解説" className="rounded-xl my-4 w-full" />

        <StatGrid stats={[
          { value: "22.5", unit: "%", label: "15mg投与72週の体重減少率" },
          { value: "6", unit: "段階", label: "用量バリエーション（2.5〜15mg）" },
          { value: "週1回", unit: "", label: "投与頻度（皮下注射）" },
          { value: "2023年", unit: "", label: "日本での承認年" },
        ]} />
      </section>

      {/* ── セクション2: GIP/GLP-1デュアルの仕組み ── */}
      <section>
        <h2 id="dual-mechanism" className="text-xl font-bold text-gray-800">GIP/GLP-1デュアルの仕組み — なぜ「ダブル」が強いのか</h2>

        <p>まず、GLP-1の働きをざっくり整理しましょう。GLP-1は食事をとると小腸から出るホルモンで、<strong>脳の食欲中枢に「もうお腹いっぱい」と伝える</strong>役割があります。さらに胃の動きをゆっくりにして、食後の血糖値の急上昇も抑えてくれます。</p>

        <p>一方のGIPは、脂肪組織に直接作用して<strong>インスリン感受性を改善し、脂肪分解を促進する</strong>と考えられています。GLP-1が「食欲を抑える」なら、GIPは「脂肪の代謝を変える」イメージですね。</p>

        <p>マンジャロはこの2つを同時に叩くから、食欲抑制と脂肪代謝改善の<strong>ダブル効果</strong>が得られるわけです。SURMOUNT-1試験では、マンジャロ15mgでセマグルチド2.4mg（ウゴービ）を大きく上回る<strong>-22.5%の体重減少</strong>が報告されています。</p>

        <img src="/clinic/column/images/mounjaro/1802701961789309137-GQR74M8bMAAtAt4.jpg" alt="GIP/GLP-1デュアルの作用機序" className="rounded-xl my-4 w-full" />
      </section>

      {/* ── セクション3: 用量の選び方 ── */}
      <section>
        <h2 id="dosage" className="text-xl font-bold text-gray-800">用量の選び方 — 2.5mgから15mgまでの6段階</h2>

        <p>マンジャロには<strong>2.5mg・5mg・7.5mg・10mg・12.5mg・15mg</strong>の6段階の用量があります。他のGLP-1薬が3段階程度なのに比べると、かなり細かく調整できるのが特徴です。</p>

        <FlowSteps steps={[
          { title: "2.5mg（4週間）", desc: "全員ここからスタート。体を慣らす期間。この段階で十分効果が出て終了する人もいる" },
          { title: "5mg（4週間〜）", desc: "他薬経験者は医師と相談の上ここから開始も。多くの人が実感する用量" },
          { title: "7.5mg〜15mg", desc: "効果が頭打ちになったら段階的に増量。必ず4週間以上の間隔を空ける" },
        ]} />

        <p>ここで大事なのは、<strong>「とにかく上げればいい」ではない</strong>ということ。2.5mgで十分に体重が落ちているなら、わざわざ増量する必要はありません。副作用は用量に比例して出やすくなるので、「最小有効量を探る」のが賢い使い方なんです。</p>

        <Callout type="info" title="他薬からの切り替え目安">
          リベルサス7mg ≒ オゼンピック0.5mg ＜ <strong>マンジャロ2.5mg</strong> ＜ リベルサス14mg ≒ オゼンピック1mg ＜ <strong>マンジャロ5mg</strong>。つまり、マンジャロは最低用量の2.5mgでもリベルサス7mg以上の効果が期待できます。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション4: 他薬との違い ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">他薬との違い — リベルサス・オゼンピックとの比較</h2>

        <p>「結局どれがいいの？」これが一番多い質問ですよね。ざっくり言うと、<strong>注射が嫌ならリベルサス、注射OKならマンジャロ</strong>がシンプルな選び方です。</p>

        <ComparisonTable
          headers={["項目", "リベルサス", "オゼンピック", "マンジャロ"]}
          rows={[
            ["作用機序", "GLP-1のみ", "GLP-1のみ", "GIP + GLP-1"],
            ["投与方法", "毎日内服", "週1回注射", "週1回注射"],
            ["最大減量率", "約5〜10%", "約10〜12%", "約22.5%"],
            ["用量段階", "3段階", "3段階", "6段階"],
            ["注射の手軽さ", "—（内服）", "ペン型", "オートインジェクター"],
            ["食事制限", "空腹時30分ルール", "なし", "なし"],
          ]}
        />

        <p>マンジャロの大きなアドバンテージは<strong>減量効果の圧倒的な差</strong>です。ただし、「まず注射なしで試したい」という方にはリベルサスが合っていますし、セマグルチドで安定した実績を重視するならオゼンピックも良い選択肢です。詳しくは<Link href="/clinic/column/glp1-medication-comparison" className="text-sky-600 underline hover:text-sky-800">GLP-1受容体作動薬の種類比較</Link>も参考にしてください。</p>

        <img src="/clinic/column/images/mounjaro/1802701961789309137-GQR74NIaIAAbs-a.jpg" alt="GLP-1薬の比較" className="rounded-xl my-4 w-full" />
      </section>

      {/* ── セクション5: よくある勘違い12選 ── */}
      <section>
        <h2 id="myths" className="text-xl font-bold text-gray-800">よくある勘違い12選 — SNSの誤情報に惑わされないで</h2>

        <p>SNSやネット上にはマンジャロに関する誤情報がかなり出回っています。ここでは特に多い勘違いを12個ピックアップして、正しい情報を整理しますね。</p>

        <ComparisonTable
          headers={["勘違い", "実際のところ"]}
          rows={[
            ["ピルと併用できない", "併用可能。ただし胃排出遅延の影響で吸収タイミングがずれることがあるので医師に相談"],
            ["低血糖になる", "血糖依存性なので、正常血糖の人では低血糖はほぼ起きない"],
            ["膵炎になる", "リスクが高いというエビデンスは乏しい。既往歴がある場合は要相談"],
            ["糖尿病になる", "むしろインスリン感受性を改善するので予防方向に働く"],
            ["やめたら全部戻る", "戻りはあるが、使用前の体重ほどは戻らないデータが多い"],
            ["筋肉がごっそり落ちる", "体重減少に比例して筋肉も落ちるが、脂肪との比率は通常のダイエットと同程度"],
            ["髪が抜ける", "マンジャロの直接作用ではなく、急激な減量による栄養不足が原因。対策可能"],
            ["用量を上げ続けないといけない", "2.5mgで十分効果が出て、そのまま終了する人もいる"],
            ["注射部位で効果が変わる", "科学的根拠なし。個人差やプラセボの影響"],
            ["副作用がない＝効いてない", "副作用の有無と減量効果は関係なし"],
            ["鬱になる", "因果関係は不明。素因がある方は医師に事前相談"],
            ["脂肪溶解注射の方がピンポイントで効く", "マンジャロは全身の脂肪減少に最も効果的。部分痩せのエビデンスは脂肪溶解注射も限定的"],
          ]}
        />

        <p>特に「やめたら太る」「筋肉が落ちる」「髪が抜ける」あたりは心配される方が多いですが、いずれも<strong>正しく理解すれば対策できる</strong>ものです。副作用について詳しく知りたい方は<Link href="/clinic/column/mounjaro-side-effects-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロの副作用と対処法</Link>をご覧ください。</p>
      </section>

      {/* ── セクション6: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>マンジャロは、GIPとGLP-1のダブルで効く新世代の薬です。最大-22.5%という従来薬を大きく上回る減量データがあり、6段階の用量で細かく調整できるのも強み。ただし、適応外使用であることを理解し、<strong>必ず医師の管理のもとで使う</strong>ことが大前提です。</p>

        <p>打ち方の具体的な手順は<Link href="/clinic/column/mounjaro-injection-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロの正しい打ち方ガイド</Link>で解説しています。GLP-1薬全体の比較は<Link href="/clinic/column/glp1-medication-comparison" className="text-sky-600 underline hover:text-sky-800">GLP-1受容体作動薬の種類比較</Link>もあわせてどうぞ。</p>
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
