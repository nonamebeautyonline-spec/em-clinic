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
const self = articles.find((a) => a.slug === "smoking-cessation-drugs-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "禁煙治療薬ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "チャンピックス（バレニクリン）は禁煙成功率約50%で最も高い",
  "保険適用の禁煙外来は12週間・計5回の通院プログラム",
  "オンライン禁煙外来＋LINEフォローで継続率向上が期待できる",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「タバコをやめたいけど、意志の力だけじゃ無理だった」——その感覚、正しいです。ニコチン依存症は<strong>脳の報酬系に作用する立派な薬物依存</strong>であり、「気合い」で治るものではありません。幸い、日本には<strong>保険適用の禁煙治療薬が3種類</strong>あります。この記事では、それぞれの仕組み・効果・選び方と、12週間の禁煙外来プログラムの流れを解説します。
      </p>

      {/* ── セクション1: 禁煙治療の現状 ── */}
      <section>
        <h2 id="current-status" className="text-xl font-bold text-gray-800">「気合いでやめろ」はもう古い — 禁煙治療は医療の時代</h2>

        <p>日本では毎年<strong>約13万人</strong>が喫煙関連の疾患で命を落としています。肺がん、COPD、心筋梗塞、脳卒中——喫煙が引き起こす病気のリストは長い。そして厄介なのは、喫煙者の約7割が「やめたい」と思っているのに、自力での禁煙成功率はわずか<strong>3〜5%</strong>だということ。</p>

        <p>でも、薬物療法を使えば成功率は<strong>2〜3倍</strong>に跳ね上がります。2006年から保険適用になった禁煙外来では、12週間のプログラムで<strong>約30〜50%の患者が1年後も禁煙を継続</strong>しています。</p>

        <StatGrid stats={[
          { value: "13", unit: "万人/年", label: "喫煙関連疾患による死亡者数" },
          { value: "3〜5", unit: "%", label: "自力での禁煙成功率" },
          { value: "2〜3", unit: "倍", label: "薬物療法による成功率向上" },
        ]} />
      </section>

      {/* ── セクション2: 保険適用の条件 ── */}
      <section>
        <h2 id="insurance-conditions" className="text-xl font-bold text-gray-800">禁煙外来の保険適用 — 5つの条件をチェック</h2>

        <p>禁煙治療を保険で受けるには、以下の<strong>すべて</strong>を満たす必要があります。</p>

        <ComparisonTable
          headers={["条件", "内容"]}
          rows={[
            ["ニコチン依存度テスト（TDS）", "5点以上（10問の質問票）"],
            ["ブリンクマン指数", "1日の本数 × 喫煙年数 ≧ 200（35歳未満は不要）"],
            ["禁煙の意思", "直ちに禁煙を希望していること"],
            ["同意書", "禁煙治療の説明を受け、文書で同意していること"],
            ["前回の治療", "過去1年以内に保険適用の禁煙治療を受けていないこと"],
          ]}
        />

        <Callout type="info" title="35歳未満はブリンクマン指数が不要に">
          2016年の改定で、<strong>35歳未満の方はブリンクマン指数の基準が撤廃</strong>されました。若年層の喫煙者でも保険適用の禁煙治療を受けやすくなっています。1日5本を2年吸っている大学生でもOKです。
        </Callout>
      </section>

      {/* ── セクション3: チャンピックス ── */}
      <section>
        <h2 id="champix" className="text-xl font-bold text-gray-800">チャンピックス（バレニクリン）——「吸いたい」を消す最強の禁煙薬</h2>

        <p>チャンピックスは、<strong>ニコチン受容体部分作動薬</strong>という独特な作用機序を持つ禁煙治療薬です。「部分作動薬」がポイントで、これは2つの効果を同時に発揮します。</p>

        <p><strong>効果1: 吸いたい気持ちを和らげる。</strong>ニコチン受容体に結合して少量のドパミンを放出させるため、ニコチンがなくても離脱症状（イライラ、集中力低下、不安感）が軽くなります。</p>

        <p><strong>効果2: 吸っても美味しくなくなる。</strong>受容体をバレニクリンが占拠しているため、タバコを吸ってもニコチンが作用しにくくなり、「吸っても全然満足感がない」状態になります。</p>

        <StatGrid stats={[
          { value: "約50", unit: "%", label: "12週間投与後の禁煙成功率" },
          { value: "12", unit: "週間", label: "標準的な投与期間" },
          { value: "0→1", unit: "mg", label: "1週目0.5mg→2週目以降1mg×2回/日" },
        ]} />

        <Callout type="warning" title="チャンピックスの供給状況">
          チャンピックスは2021年にN-ニトロソバレニクリン（発がん性の不純物）混入問題で<strong>世界的に出荷停止</strong>となりました。日本では2024年から<strong>供給が再開</strong>されていますが、医療機関によっては在庫が限定的な場合があります。処方前に在庫状況の確認をお勧めします。
        </Callout>

        <p>副作用は<strong>吐き気</strong>が最も多く（約30%）、異常な夢、頭痛、不眠が続きます。かつてFDAが精神症状（うつ、自殺念慮）に関する黒枠警告を出しましたが、2016年の大規模RCT（EAGLES試験）の結果を受けて<strong>警告は撤回</strong>されています。ただし精神疾患の既往がある患者さんへの処方は慎重に行ってください。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: ニコチンパッチ ── */}
      <section>
        <h2 id="nicotine-patch" className="text-xl font-bold text-gray-800">ニコチンパッチ —— 貼るだけ簡単、でも使い方にコツあり</h2>

        <p>ニコチンパッチは皮膚からニコチンをゆっくり吸収させることで、離脱症状を抑えるニコチン置換療法（NRT）です。処方薬の<strong>ニコチネルTTS</strong>（30・20・10の3段階）は保険適用。市販薬としてもニコチネルパッチが購入できます。</p>

        <FlowSteps steps={[
          { title: "第1段階（1〜4週）", desc: "ニコチネルTTS 30を毎日1枚、上腕・腹部・背中に貼付。24時間ごとに貼り替え。" },
          { title: "第2段階（5〜6週）", desc: "ニコチネルTTS 20に減量。離脱症状が出なければそのまま継続。" },
          { title: "第3段階（7〜8週）", desc: "ニコチネルTTS 10にさらに減量。段階的にニコチンから離脱。" },
        ]} />

        <p>副作用は<strong>貼付部位の皮膚刺激</strong>（かぶれ、かゆみ）が最も多い。貼る場所を毎日変えることで軽減できます。就寝中に貼ったままだと不眠や異常な夢が出やすいため、夜はがす方法もあります（ただし朝の離脱症状が強くなる可能性）。</p>
      </section>

      {/* ── セクション5: ニコチンガム ── */}
      <section>
        <h2 id="nicotine-gum" className="text-xl font-bold text-gray-800">ニコチンガム（ニコレット）—— 「吸いたい瞬間」に即効で対抗</h2>

        <p>ニコレット等のニコチンガムは<strong>OTC（市販薬）のみ</strong>で処方薬はありません。保険適用外ですが、薬局で手軽に購入できるのがメリット。「吸いたい！」と思った瞬間にガムを噛むことで、<strong>数分以内にニコチンが口腔粘膜から吸収</strong>されて離脱症状を抑えます。</p>

        <Callout type="point" title="ニコチンガムの正しい噛み方 ——「噛み続ける」のはNG">
          普通のガムのように噛み続けると、ニコチンが唾液に溶けて飲み込まれ、<strong>効果が激減する上に胃がムカムカ</strong>します。正しくは「ゆっくり15回ほど噛む → ピリッとしたら歯茎と頬の間に寄せる → 味がなくなったらまた噛む」のサイクル。1回約30分かけて使います。
        </Callout>
      </section>

      {/* ── セクション6: 3薬剤比較 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">結局どれがいい？ — 3つの禁煙薬を一覧比較</h2>

        <ComparisonTable
          headers={["", "チャンピックス", "ニコチンパッチ（処方）", "ニコチンガム"]}
          rows={[
            ["分類", "ニコチン受容体部分作動薬", "ニコチン置換療法（NRT）", "ニコチン置換療法（NRT）"],
            ["保険適用", "○（処方箋）", "○（処方箋）/ OTCもあり", "×（OTCのみ）"],
            ["投与期間", "12週間", "8週間", "個人のペースで漸減"],
            ["禁煙成功率", "約50%（最も高い）", "約25〜35%", "約20〜30%"],
            ["ニコチン含有", "なし", "あり", "あり"],
            ["主な副作用", "吐き気、異常な夢", "皮膚刺激、不眠", "口腔刺激、顎の疲れ"],
            ["特徴", "「吸いたい」+「美味しくない」のダブル効果", "貼るだけで簡単", "即効性、自分でコントロール"],
            ["3割負担の費用目安", "約13,000円/12週", "約12,000円/8週", "約12,000〜15,000円（自費）"],
          ]}
        />

        <p>迷ったら<strong>チャンピックスを第一選択</strong>として勧めるのが一般的です。成功率が最も高く、ニコチンを含まないため「ニコチンに頼らず禁煙する」という本来の目的に合致します。ただし、吐き気が辛い方や精神疾患の既往がある方にはニコチンパッチが選ばれます。</p>
      </section>

      <InlineCTA />

      {/* ── セクション7: 12週間プログラム ── */}
      <section>
        <h2 id="program" className="text-xl font-bold text-gray-800">保険適用の12週間プログラム — 5回の受診で禁煙完了</h2>

        <FlowSteps steps={[
          { title: "初回（0週）", desc: "ニコチン依存度テスト、呼気CO濃度測定、治療薬の選択、禁煙開始日の設定（通常1週間後）。" },
          { title: "2回目（2週後）", desc: "禁煙開始。離脱症状の確認、副作用チェック、呼気CO測定。「最初の2週間が最も辛い」ことを伝える。" },
          { title: "3回目（4週後）", desc: "禁煙継続の確認。多くの患者が「峠を越えた」と感じる時期。副作用の再評価。" },
          { title: "4回目（8週後）", desc: "禁煙の定着確認。ニコチンパッチは減量段階。生活習慣の変化を振り返る。" },
          { title: "5回目（12週後）", desc: "プログラム終了。再喫煙リスクの高い場面（飲酒、ストレス）への対処法を確認。" },
        ]} />

        <Callout type="info" title="費用の目安">
          12週間の禁煙外来は、3割負担で<strong>合計約13,000〜20,000円</strong>程度です。タバコ代と比較すると、1日1箱（約600円）×84日＝約50,000円。つまり<strong>禁煙治療のほうが圧倒的に安い</strong>計算になります。
        </Callout>
      </section>

      {/* ── セクション8: オンライン禁煙外来 ── */}
      <section>
        <h2 id="online" className="text-xl font-bold text-gray-800">オンライン禁煙外来 — 通院のハードルを下げて継続率アップ</h2>

        <p>2020年の規制緩和で、禁煙外来は<strong>初診からオンライン対応が可能</strong>になりました。5回の受診のうち、初回と最終回以外はオンラインで完結できるため、「仕事が忙しくて通えない」という脱落を防げます。オンライン診療の導入手順や法規制については<Link href="/lp/column/online-clinic-complete-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療完全ガイド</Link>で詳しく解説しています。</p>

        <p>さらに効果的なのは、<strong>LINEを活用した受診間のフォローアップ</strong>です。「吸いたくなったときのメッセージ」「禁煙○日目おめでとうの自動配信」「副作用の相談窓口」をLINEで提供することで、患者の禁煙継続をサポートできます。</p>

        <p>禁煙外来の課題は<strong>脱落率の高さ</strong>。5回すべて通院する患者は約50%にとどまります。オンライン＋LINEフォローの組み合わせで、この脱落率を改善することが、禁煙外来の収益と患者満足の両方につながります。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 禁煙治療は「意志」ではなく「医療」で解決する時代</h2>

        <p>ニコチン依存症は脳の病気であり、薬物療法は科学的に有効な治療法です。チャンピックスの供給再開により、最も成功率の高い治療選択肢が再び使えるようになりました。保険適用の12週間プログラムはタバコ代より安く、オンライン対応で通院の負担も軽くなっています。</p>

        <p>クリニックとしては、禁煙外来は<strong>初期投資が少なく、定期受診が組み込まれた収益安定型の診療メニュー</strong>です。LINEでの服薬リマインドと禁煙応援メッセージを組み合わせれば、脱落率の改善と患者満足度の向上を同時に実現できます。禁煙と並行して取り組むべき生活習慣病管理のオンライン化については<Link href="/lp/column/lifestyle-disease-online-management" className="text-sky-600 underline hover:text-sky-800">生活習慣病オンライン管理ガイド</Link>も参考にしてください。また、オンライン診療での処方ルールについては<Link href="/lp/column/online-clinic-prescription-rules" className="text-sky-600 underline hover:text-sky-800">オンライン処方ルール解説</Link>をご覧ください。</p>
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
