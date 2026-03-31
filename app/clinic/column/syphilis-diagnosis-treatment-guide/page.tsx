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
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "syphilis-diagnosis-treatment-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "梅毒の診断と治療ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "日本の梅毒報告数は2023年に14,906件と過去最多——2013年の約12倍に急増",
  "第1期は痛みのない潰瘍が自然消失するため「治った」と誤解されやすい",
  "ステルイズ（筋注1回）の承認で、4週間の内服に代わる選択肢が登場",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「梅毒って昔の病気でしょ？」——そう思っていませんか？ 実は今、日本で梅毒の報告数が<strong>過去最多を更新し続けています</strong>。しかも20代女性を中心に急増中。この記事では、梅毒の症状・検査の読み方・最新の治療法まで、<strong>クリニックで患者さんに説明するときにも使える内容</strong>をわかりやすくまとめました。
      </p>

      {/* ── セクション1: なぜ今、梅毒が急増しているのか ── */}
      <section>
        <h2 id="syphilis-surge" className="text-xl font-bold text-gray-800">なぜ今、梅毒が急増しているのか——数字で見る現実</h2>

        <p>まず、この数字を見てください。日本の梅毒報告数は2013年にはわずか1,228件でした。それが2023年には<strong>14,906件</strong>。たった10年で約12倍に膨れ上がっています。</p>

        <BarChart
          data={[
            { label: "2013年", value: 1228, color: "bg-teal-300" },
            { label: "2015年", value: 2697, color: "bg-teal-400" },
            { label: "2018年", value: 7007, color: "bg-teal-500" },
            { label: "2020年", value: 5867, color: "bg-teal-400" },
            { label: "2022年", value: 13228, color: "bg-red-400" },
            { label: "2023年", value: 14906, color: "bg-red-500" },
          ]}
          unit="件"
        />

        <p>特に目立つのが<strong>20代女性の増加</strong>です。マッチングアプリの普及による不特定多数との接触機会の増加が一因とされていますが、それだけではなく、<strong>無症状の潜伏期に気づかず感染を広げてしまう</strong>梅毒特有の性質が拡大に拍車をかけています。</p>

        <StatGrid stats={[
          { value: "14,906", unit: "件", label: "2023年の報告数（過去最多）" },
          { value: "約12", unit: "倍", label: "2013年比の増加率" },
          { value: "20代", unit: "女性", label: "最も増加が顕著な層" },
        ]} />
      </section>

      {/* ── セクション2: 梅毒の4つの病期 ── */}
      <section>
        <h2 id="syphilis-stages" className="text-xl font-bold text-gray-800">梅毒の4つの病期——「治った」と思ったら大間違い</h2>

        <p>梅毒の厄介なところは、<strong>症状が出たり消えたりする</strong>こと。特に第1期の症状が自然に消えるため、「あれ、治ったかな？」と放置してしまう方が非常に多いんです。実際には治っていません。病期ごとに見ていきましょう。</p>

        <FlowSteps steps={[
          { title: "第1期（感染後約3週間）", desc: "感染部位に硬い潰瘍（硬性下疳）が出現。痛みがないため見逃されやすい。無治療でも3〜6週で自然消失するが、これは「治った」のではなく次のステージに進んだだけ。" },
          { title: "第2期（感染後4〜10週）", desc: "全身にバラ疹と呼ばれる発疹が広がる。口腔内の粘膜疹、脱毛、発熱、倦怠感も。最も感染力が強い時期で、パートナーへの感染リスクが非常に高い。" },
          { title: "潜伏期（症状なし）", desc: "症状が完全に消え、血液検査でしか判明しない。早期潜伏（感染後1年以内）と後期潜伏（1年以上）に分かれる。無症状でも体内では菌が生き続けている。" },
          { title: "第3期・第4期（現代では稀）", desc: "ゴム腫（肉芽腫）の形成、心血管梅毒、神経梅毒など。抗菌薬が普及した現代ではここまで進行するケースは稀だが、HIV合併例では進行が早いことがある。" },
        ]} />

        <Callout type="info" title="第1期の見逃しが感染拡大の最大要因">
          硬性下疳は<strong>痛みがなく、自然に消える</strong>という二重の罠があります。痛くないから病院に行かない、消えたから治ったと思う。この「サイレントな第1期」が、梅毒の感染拡大を止められない最大の理由です。少しでも心当たりがあれば、症状が消えた後でも検査を受けることが大切です。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション3: 検査方法 ── */}
      <section>
        <h2 id="syphilis-testing" className="text-xl font-bold text-gray-800">RPR？ TPHA？ 梅毒検査の「読み方」をスッキリ解説</h2>

        <p>梅毒の検査は2種類の血液検査を組み合わせるのが基本です。ただ、「RPR陽性・TPHA陰性」みたいな結果を見ても、何がなんだかわからないですよね。それぞれの特徴を整理しましょう。</p>

        <ComparisonTable
          headers={["検査名", "種類", "特徴", "用途"]}
          rows={[
            ["RPR / VDRL", "非トレポネーマ検査", "偽陽性あり（膠原病・妊娠等）。定量値が変動するため治療効果の判定に使える", "スクリーニング＋治療効果モニタリング"],
            ["TPHA / FTA-ABS", "トレポネーマ検査", "梅毒トレポネーマに特異的。一度陽性になると治療後も永続陽性", "確認検査（RPR陽性時の確定）"],
          ]}
        />

        <p>ポイントは、<strong>RPRは「今の活動性」、TPHAは「過去に感染したかどうか」</strong>を見る検査だということ。RPRが高ければ活動性の感染を示唆し、治療が効けば数値が下がっていきます。一方TPHAは一度陽性になると治っても陽性のまま。だから「TPHA陽性＝今も感染中」とは限りません。</p>

        <Callout type="info" title="ウインドウピリオドに注意">
          感染後約4週間は、RPRもTPHAも<strong>陰性になる可能性</strong>があります（ウインドウピリオド）。「検査で陰性だったから大丈夫」と安心するのは早計で、リスク行為から4週間以上経過してからの再検査が推奨されます。
        </Callout>
      </section>

      {/* ── セクション4: 治療 ── */}
      <section>
        <h2 id="syphilis-treatment" className="text-xl font-bold text-gray-800">アモキシシリン4週間 vs ステルイズ1回注射——どっちがいいの？</h2>

        <p>梅毒の治療は<strong>ペニシリン系抗菌薬</strong>が基本。日本では長年、アモキシシリン（サワシリン）の内服が標準治療でしたが、2022年にステルイズ（ベンザチンペニシリンG筋注）が承認され、選択肢が広がりました。</p>

        <ComparisonTable
          headers={["項目", "アモキシシリン内服", "ステルイズ筋注"]}
          rows={[
            ["投与方法", "1500mg/日を分3で内服", "臀部に筋肉注射1回"],
            ["治療期間", "4週間（早期梅毒の場合）", "1回で完了"],
            ["メリット", "注射不要、自宅で治療可能", "1回で確実に治療完了、服薬アドヒアランスの心配なし"],
            ["デメリット", "4週間毎日飲み続ける必要あり。飲み忘れリスク", "注射部位の痛み。医療機関での投与が必要"],
            ["WHO推奨", "代替治療の位置づけ", "第一選択（世界標準）"],
          ]}
        />

        <p>実は、<strong>世界的にはベンザチンペニシリン筋注が第一選択</strong>です。WHOもCDCもこれを推奨しています。日本だけが長年アモキシシリンの内服で対応してきたのは、ベンザチンペニシリン製剤が国内で承認されていなかったから。ステルイズの登場は、日本の梅毒治療をようやく世界標準に引き上げた出来事と言えます。</p>

        <Callout type="point" title="服薬アドヒアランスという現実的な問題">
          4週間毎日薬を飲み続けるのは、想像以上に大変です。特に症状が消えた後は「もう治ったのでは？」と自己判断で中断してしまう方が少なくありません。ステルイズなら<strong>来院して1回注射を受ければ治療完了</strong>。アドヒアランスの問題を根本的に解決できるのが最大の強みです。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション5: 治癒判定とフォローアップ ── */}
      <section>
        <h2 id="syphilis-followup" className="text-xl font-bold text-gray-800">「治った」の判断はどうする？ RPR定量値の読み方</h2>

        <p>治療が終わったら、次に大事なのが<strong>「本当に治ったのか」の確認</strong>です。ここで使うのがRPRの定量値。治療前のRPR値と比較して、<strong>6ヶ月後にRPR定量値が4倍以上低下</strong>（例: 32倍→8倍以下）していれば、治療が奏効したと判断します。</p>

        <p>ただし注意点があります。RPRが<strong>完全に陰性化しないケースもある</strong>ということ。特に治療開始が遅れた場合や、過去に再感染歴がある場合は、低い値で持続する「serofast」という状態になることがあります。これは再感染ではなく、<strong>免疫学的な記憶が残っている状態</strong>なので、TPHAが陽性のまま＋RPRが低値で安定していれば、基本的には経過観察で問題ありません。</p>
      </section>

      {/* ── セクション6: パートナー通知と再感染 ── */}
      <section>
        <h2 id="syphilis-prevention" className="text-xl font-bold text-gray-800">治っても免疫はつかない——再感染とパートナー通知の話</h2>

        <p>梅毒で意外と知られていないのが、<strong>治っても免疫がつかない</strong>という事実。つまり、一度治療して完治しても、再び感染すれば同じように発症します。「一回かかったからもう大丈夫」は完全な誤解です。</p>

        <p>だからこそ重要なのが<strong>パートナーへの検査の推奨</strong>。自分だけ治療しても、パートナーが未治療なら「ピンポン感染」（お互いにうつし合う）が起きてしまいます。再感染リスクを下げる手段として、性行為後に抗生物質を服用する<Link href="/clinic/column/doxy-pep-std-prevention" className="text-sky-600 underline hover:text-sky-800">ドキシペップ（Doxy-PEP）</Link>という予防法も注目されています。</p>

        <Callout type="point" title="梅毒は5類感染症——届出義務があります">
          梅毒は感染症法に基づく<strong>5類感染症</strong>に指定されており、診断した医師は7日以内に最寄りの保健所に届出する義務があります。患者さんには「届出は匿名ではないが、プライバシーは保護される」ことを丁寧に説明し、不安を和らげることが大切です。
        </Callout>
      </section>

      {/* ── セクション7: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ——早期発見・早期治療が梅毒対策のすべて</h2>

        <p>梅毒は年間15,000件に迫る勢いで増加しており、もはや「他人事」ではありません。第1期の無痛性潰瘍は自然消失するため見逃されやすく、それが感染拡大の最大の要因になっています。</p>

        <p>検査はRPRとTPHAの2本立てで行い、ウインドウピリオド（約4週間）に注意。治療はアモキシシリン4週間内服かステルイズ1回筋注の選択肢があり、服薬アドヒアランスの観点からはステルイズの優位性が際立ちます。そして何より、<strong>治っても免疫はつかないので再感染に注意</strong>。パートナーへの検査推奨と、コンドームの適切な使用が予防の基本です。</p>

        <Callout type="point" title="クリニックでの患者対応のポイント">
          梅毒はデリケートな疾患です。LINEを活用した<strong>匿名性の高い事前問診</strong>や、検査結果の<strong>セキュアな通知</strong>は、患者さんの心理的ハードルを大きく下げます。対面で聞きづらいことも、LINEなら正直に答えてくれる——性感染症診療こそ、デジタルコミュニケーションが力を発揮する領域です。STD診療のオンライン化については<Link href="/clinic/column/std-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">STDオンライン診療の始め方</Link>や<Link href="/clinic/column/std-online-winning-strategy" className="text-sky-600 underline hover:text-sky-800">STDオンライン診療の勝ち筋</Link>もあわせてお読みください。
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
