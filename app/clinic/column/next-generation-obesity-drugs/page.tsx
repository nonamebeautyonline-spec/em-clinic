import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  StatGrid,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "next-generation-obesity-drugs")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "次世代肥満症薬まとめはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "レタトルチド（トリプル作動薬）が68週で28.7%減を達成し、現時点で最強の減量効果",
  "オルフォグリプロンは初の経口GLP-1肥満薬として2026年4月にFDA審査結果予定",
  "各薬剤は試験デザインが異なるため、単純な数字比較には限界がある点に注意",
];

const toc = [
  { id: "overview", label: "次世代肥満症薬の全体像" },
  { id: "retatrutide", label: "レタトルチド（トリプル作動薬）" },
  { id: "amycretin", label: "アミクレチン" },
  { id: "orforglipron", label: "オルフォグリプロン（経口）" },
  { id: "survodutide", label: "スルボデュチド" },
  { id: "pemvidutide", label: "ペムビデュチド" },
  { id: "comparison", label: "横断比較" },
  { id: "outlook", label: "今後の展望" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        マンジャロ・ウゴービ・ゼップバウンドの次に来る肥満症薬、気になりますよね。2026年現在、複数の次世代薬が臨床試験の最終段階に入っています。この記事では、<strong>最新のエビデンスをもとに5つの注目薬剤</strong>を横断比較します。
      </p>

      <Callout type="warning" title="臨床試験データの比較について">
        各薬剤は試験デザイン（対象患者・期間・プラセボ率など）が異なるため、<strong>数字の単純比較には限界があります</strong>。あくまで傾向を掴むための参考情報としてお読みください。
      </Callout>

      {/* ── セクション1: 全体像 ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">次世代肥満症薬の全体像 — 「注射の時代」から「選べる時代」へ</h2>

        <p>現在の肥満症薬は、セマグルチド（ウゴービ）とチルゼパチド（ゼップバウンド/マンジャロ）が主役です。どちらも週1回の皮下注射で、GLP-1またはGIP/GLP-1に作用します。</p>

        <p>次世代薬では、この流れがさらに進化しています。大きなトレンドは3つ。<strong>①受容体を3つ同時に叩くトリプル作動薬</strong>、<strong>②注射不要の経口薬</strong>、<strong>③肝臓や筋肉への効果も狙うマルチターゲット</strong>です。</p>

        <img src="/clinic/column/images/mounjaro/1823964357723877603-GVAF6B6bkAAWYaX.png" alt="次世代肥満症薬の開発パイプライン" className="rounded-xl my-4 w-full" />

        <StatGrid stats={[
          { value: "28.7", unit: "%", label: "レタトルチド12mgの減量率（最大）" },
          { value: "5", unit: "剤", label: "注目の次世代候補薬" },
          { value: "2027〜", unit: "", label: "次世代薬の承認が始まる見込み" },
          { value: "経口", unit: "", label: "オルフォグリプロンの投与形態" },
        ]} />
      </section>

      {/* ── セクション2: レタトルチド ── */}
      <section>
        <h2 id="retatrutide" className="text-xl font-bold text-gray-800">レタトルチド（Retatrutide）— 世界初のトリプル受容体作動薬</h2>

        <p>開発元はイーライリリー。マンジャロ・ゼップバウンドと同じ会社ですね。レタトルチドの最大の特徴は、<strong>GIP・GLP-1・グルカゴンの3つの受容体に同時に作用する</strong>こと。世界初のトリプル作動薬です。</p>

        <p>グルカゴンが加わることで何が変わるかというと、<strong>肝臓での脂肪燃焼とエネルギー消費の亢進</strong>が期待できるんです。GLP-1で食欲を抑え、GIPで脂肪代謝を変え、グルカゴンでエネルギー消費を増やす。三方向からのアプローチですね。</p>

        <StatGrid stats={[
          { value: "28.7", unit: "%", label: "12mg群の平均体重減少率（68週）" },
          { value: "26.4", unit: "%", label: "9mg群の平均体重減少率（68週）" },
          { value: "2.1", unit: "%", label: "プラセボ群（68週）" },
        ]} />

        <p>Phase 3のTRIUMPH-4試験で、12mg群が<strong>68週で平均28.7%の体重減少</strong>を達成しました。これは現在承認されているどの薬剤よりも高い数値です。</p>

        <p>ただし注意点もあります。最高用量では<strong>異常感覚（dysesthesia）が約20.9%</strong>に報告されており、新たな副作用プロファイルとして注視されています。NDA（新薬承認申請）は2026年Q4〜2027年Q1に提出される見込みで、承認は2027年後半〜2028年と予測されています。</p>

        <img src="/clinic/column/images/mounjaro/1823964357723877603-GVAF6B8a8AA_Iag.png" alt="レタトルチドのトリプル作用機序" className="rounded-xl my-4 w-full" />
      </section>

      {/* ── セクション3: アミクレチン ── */}
      <section>
        <h2 id="amycretin" className="text-xl font-bold text-gray-800">アミクレチン（Amycretin）— GLP-1×アミリンの新組み合わせ</h2>

        <p>開発元はノボ ノルディスク（ウゴービのメーカー）。アミクレチンはGLP-1に加えて、<strong>アミリン</strong>という膵臓から分泌されるホルモンにも作用します。</p>

        <p>アミリンは食欲抑制と胃排出遅延に働くホルモンで、GLP-1とは別の経路で満腹感を高めます。つまり、<strong>食欲抑制を二重にかける</strong>アプローチなんですね。</p>

        <ComparisonTable
          headers={["投与形態", "試験結果", "期間", "特記事項"]}
          rows={[
            ["皮下注射", "最大24.3%減", "36週", "プラトー未達（まだ効果が伸びていた）"],
            ["経口", "13.1%減", "12週", "経口でもこの効果は注目"],
          ]}
        />

        <p>特に注目なのは、皮下注射版が<strong>36週時点でプラトー（横ばい）に達していなかった</strong>こと。つまり、もっと長く投与すればさらに減量が進む可能性があるんです。また、経口版も同時に開発が進んでいるのはユニークですね。</p>

        <p>Phase 3は2026年Q1に開始予定で、承認は最速でも2028年後半〜2029年になる見込みです。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: オルフォグリプロン ── */}
      <section>
        <h2 id="orforglipron" className="text-xl font-bold text-gray-800">オルフォグリプロン（Orforglipron）— 注射なし・毎日1錠の経口GLP-1</h2>

        <p>これもイーライリリー開発。オルフォグリプロンの最大の売りは、<strong>注射不要の経口小分子GLP-1受容体作動薬</strong>であること。リベルサスもGLP-1の経口薬ですが、あちらはペプチド製剤で空腹時30分の服用ルールがあります。オルフォグリプロンは非ペプチドの小分子なので、そうした制約がありません。</p>

        <StatGrid stats={[
          { value: "12.4", unit: "kg", label: "ATTAIN-1の72週平均体重減少" },
          { value: "59.6", unit: "%", label: "10%以上の減量達成率" },
          { value: "毎日1回", unit: "", label: "投与頻度（経口）" },
        ]} />

        <p>Phase 3のATTAIN-1試験では、72週で約12.4kgの体重減少が報告されています。注射薬と比べると数字は控えめですが、<strong>「毎日飲むだけ」というハードルの低さ</strong>は圧倒的なアドバンテージです。</p>

        <p>さらに注目のATTAIN-MAINTAIN試験では、ウゴービやゼップバウンドで減量した患者がオルフォグリプロンに切り替えた後も<strong>減量をほぼ維持できた</strong>というデータが出ています。注射をやめたい人のスイッチ先として期待大ですね。</p>

        <Callout type="info" title="FDA審査が目前">
          PDUFA（FDA審査目標日）は<strong>2026年4月10日</strong>。初の経口GLP-1肥満薬として承認されれば、市場のゲームチェンジャーになる可能性があります。
        </Callout>
      </section>

      {/* ── セクション5: スルボデュチド ── */}
      <section>
        <h2 id="survodutide" className="text-xl font-bold text-gray-800">スルボデュチド（Survodutide）— グルカゴン×GLP-1のデュアル</h2>

        <p>開発元はベーリンガーインゲルハイム。スルボデュチドはグルカゴンとGLP-1のデュアル受容体作動薬です。レタトルチドがトリプルなのに対し、こちらはGIPを含まずグルカゴンとGLP-1の2つに作用します。</p>

        <p>Phase 2試験では46週で最大14.9%の体重減少を記録。Phase 3のSYNCHRONIZE-1 & 2が進行中で、結果は2026年Q1〜Q2に発表される予定です。</p>

        <p>グルカゴンとGLP-1の組み合わせは、<strong>肝臓の脂肪減少にも効果が期待される</strong>ため、MASH（脂肪肝炎）への応用も視野に入っています。承認見込みは2027年後半〜2028年です。</p>
      </section>

      {/* ── セクション6: ペムビデュチド ── */}
      <section>
        <h2 id="pemvidutide" className="text-xl font-bold text-gray-800">ペムビデュチド（Pemvidutide）— 筋肉を守りながら脂肪を落とす</h2>

        <p>開発元はAltimmune社。ペムビデュチドもGLP-1/グルカゴンのデュアル作動薬ですが、この薬のユニークな点は<strong>除脂肪体重（筋肉）の維持率が高い</strong>ことです。</p>

        <StatGrid stats={[
          { value: "15.6", unit: "%", label: "Phase 2（48週）の体重減少率" },
          { value: "78.1", unit: "%", label: "除脂肪体重の維持率" },
        ]} />

        <p>Phase 2のMOMENTUM試験で48週で15.6%の減量を達成しつつ、<strong>除脂肪体重維持率78.1%</strong>という数値が注目を集めています。GLP-1薬で体重が落ちると筋肉も一緒に落ちがちなのが課題でしたが、ペムビデュチドはその弱点を克服できる可能性があるんですね。</p>

        <p>さらにMASH（脂肪肝炎）適応では<strong>FDAのBreakthrough Therapy指定</strong>を取得しています。肥満適応でのPhase 3はまだ未定ですが、脂肪肝分野では先行して開発が進んでいます。</p>
      </section>

      {/* ── セクション7: 横断比較 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">横断比較 — 減量効果と開発ステージの一覧</h2>

        <p>ここまで紹介した5つの次世代薬と、すでに承認されている2剤を含めた横断比較です。</p>

        <ComparisonTable
          headers={["薬剤名", "減量率", "試験期間", "投与方法", "開発段階"]}
          rows={[
            ["レタトルチド 12mg", "28.7%", "68週", "週1回注射", "Phase 3"],
            ["アミクレチン（皮下注）", "24.3%", "36週（未達）", "週1回注射", "Phase 2"],
            ["ゼップバウンド 15mg", "20.2%", "72週", "週1回注射", "承認済"],
            ["ペムビデュチド 2.4mg", "15.6%", "48週", "週1回注射", "Phase 2"],
            ["スルボデュチド 4.8mg", "14.9%", "46週", "注射", "Phase 2"],
            ["ウゴービ 2.4mg", "13.7%", "68週", "週1回注射", "承認済"],
            ["オルフォグリプロン", "約12%", "72週", "毎日経口", "Phase 3"],
          ]}
        />

        <Callout type="info" title="単純比較にはご注意">
          アミクレチンの24.3%は36週（しかもプラトー未達）のデータなので、68〜72週のデータとは条件が異なります。各薬剤の対象患者の平均BMIや合併症の有無も試験ごとに異なるため、横並びの比較は参考程度にしてください。
        </Callout>

        <img src="/clinic/column/images/mounjaro/1823964357723877603-GVAF6Bfa4AQaUQ_.jpg" alt="次世代肥満症薬の減量効果比較" className="rounded-xl my-4 w-full" />
      </section>

      {/* ── セクション8: 今後の展望 ── */}
      <section>
        <h2 id="outlook" className="text-xl font-bold text-gray-800">今後の展望 — 2027年以降、肥満治療はどう変わる？</h2>

        <p>2026年後半〜2027年にかけて、いくつかの重要なマイルストーンが控えています。</p>

        <ComparisonTable
          headers={["時期", "イベント"]}
          rows={[
            ["2026年4月", "オルフォグリプロン FDA審査結果"],
            ["2026年Q1〜Q2", "スルボデュチド Phase 3結果発表"],
            ["2026年Q4〜2027年Q1", "レタトルチド NDA提出"],
            ["2027年後半〜", "レタトルチド・スルボデュチド承認見込み"],
            ["2028年後半〜", "アミクレチン承認見込み"],
          ]}
        />

        <p>今後の肥満治療のトレンドとして見えてくるのは、<strong>「注射vs経口の選択肢」「トリプル作動薬による減量効果のさらなる向上」「筋肉を温存しながら脂肪だけ落とすアプローチ」</strong>の3つです。</p>

        <p>特にオルフォグリプロンが承認されれば、「注射は嫌だけどGLP-1薬を使いたい」という膨大な潜在需要が一気に動く可能性があります。リベルサスと違って食事制限のルールもないので、日常に組み込みやすいのが大きいですよね。</p>

        <p>現時点で利用できる薬剤について知りたい方は、<Link href="/clinic/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ完全ガイド</Link>や<Link href="/clinic/column/zepbound-obesity-treatment-guide" className="text-sky-600 underline hover:text-sky-800">ゼップバウンド完全ガイド</Link>、<Link href="/clinic/column/wegovy-obesity-treatment-guide" className="text-sky-600 underline hover:text-sky-800">ウゴービ完全ガイド</Link>もあわせてチェックしてみてください。</p>
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
