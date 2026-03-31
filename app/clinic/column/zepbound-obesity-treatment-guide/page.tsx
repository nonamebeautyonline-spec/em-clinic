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
const self = articles.find((a) => a.slug === "zepbound-obesity-treatment-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "ゼップバウンド完全ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "ゼップバウンドはマンジャロと同成分（チルゼパチド）の肥満症専用薬。2025年4月に国内発売",
  "処方には学会教育研修施設＋専門医＋管理栄養士の体制が必要で、一般クリニックではほぼ不可能",
  "SURMOUNT-5試験でウゴービに勝利（20.2% vs 13.7%）。ただし心血管エビデンスはウゴービが優位",
];

const toc = [
  { id: "what-is-zepbound", label: "ゼップバウンドとは" },
  { id: "approval-history", label: "承認・発売の経緯" },
  { id: "drug-price", label: "薬価と自己負担" },
  { id: "prescription-requirements", label: "処方できる施設と患者の条件" },
  { id: "vs-wegovy", label: "ウゴービとの比較" },
  { id: "vs-mounjaro", label: "マンジャロとの関係" },
  { id: "who-can-use", label: "結局誰が使えるの？" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「ゼップバウンドってマンジャロと何が違うの？」「保険で使えるなら使いたい！」と思っている方、多いですよね。結論から言うと、<strong>中身は同じチルゼパチドだけど、適応症と処方ルールがまったく違います</strong>。この記事では、2026年3月時点の最新情報をもとに、薬価・処方条件・ウゴービとの比較まで徹底解説します。
      </p>

      {/* ── セクション1: ゼップバウンドとは ── */}
      <section>
        <h2 id="what-is-zepbound" className="text-xl font-bold text-gray-800">ゼップバウンドとは — マンジャロの「肥満症バージョン」</h2>

        <p>ゼップバウンド（Zepbound）は、イーライリリー社が開発した<strong>チルゼパチドの肥満症適応版</strong>です。マンジャロと有効成分は同じGIP/GLP-1デュアル受容体作動薬ですが、こちらは<strong>肥満症の治療薬</strong>として承認されています。</p>

        <p>つまり、マンジャロが「2型糖尿病」、ゼップバウンドが「肥満症」という役割分担なんです。成分が同じなのに薬の名前が違うのは、適応症ごとに別製品として承認を取るルールがあるからですね。</p>

        <img src="/clinic/column/images/mounjaro/1823964357723877603-GVAF6B5agAAcslP.jpg" alt="ゼップバウンド（チルゼパチド）の概要" className="rounded-xl my-4 w-full" />

        <StatGrid stats={[
          { value: "20.2", unit: "%", label: "SURMOUNT-5での平均体重減少率" },
          { value: "6", unit: "段階", label: "用量バリエーション（2.5〜15mg）" },
          { value: "週1回", unit: "", label: "投与頻度（皮下注射）" },
          { value: "72", unit: "週", label: "最大投与期間" },
        ]} />
      </section>

      {/* ── セクション2: 承認・発売の経緯 ── */}
      <section>
        <h2 id="approval-history" className="text-xl font-bold text-gray-800">承認・発売の経緯 — 2024年末から2025年春へ</h2>

        <p>ゼップバウンドの日本での承認プロセスは、かなりスピーディでした。時系列で見てみましょう。</p>

        <ComparisonTable
          headers={["日付", "イベント"]}
          rows={[
            ["2024年12月27日", "製造販売承認を取得"],
            ["2025年3月19日", "薬価基準に収載（保険適用の価格が決定）"],
            ["2025年4月11日", "国内発売開始"],
          ]}
        />

        <p>製造販売元は<strong>日本イーライリリー</strong>、販売提携先は<strong>田辺ファーマ</strong>です。承認から発売まで約4ヶ月とかなり速いペースでしたが、後述する処方条件のハードルが高いため、「発売されたのに手に入らない」という状況が続いています。</p>
      </section>

      {/* ── セクション3: 薬価と自己負担 ── */}
      <section>
        <h2 id="drug-price" className="text-xl font-bold text-gray-800">薬価と自己負担 — 維持量で月1万〜1.5万円</h2>

        <p>ゼップバウンドは保険適用薬なので、薬価が公定されています。週1回投与で、1キットあたりの価格はこちら。</p>

        <ComparisonTable
          headers={["用量", "薬価（1キット）", "3割負担"]}
          rows={[
            ["2.5mg", "3,067円", "920円"],
            ["5mg", "5,797円", "1,739円"],
            ["7.5mg", "7,721円", "2,316円"],
            ["10mg", "8,999円", "2,700円"],
            ["12.5mg", "10,180円", "3,054円"],
            ["15mg", "11,242円", "3,373円"],
          ]}
        />

        <p>維持量（7.5mg〜15mg）で計算すると、<strong>月額の自己負担（3割）は概ね1万〜1.5万円</strong>程度。自費でマンジャロを使う場合の月3〜5万円に比べるとかなり安いですが、そもそも処方してもらえる人が限られているのが現実です。</p>

        <Callout type="info" title="最大投与期間は72週">
          ゼップバウンドの処方は最大72週（約1年4ヶ月）までと決められています。それ以降の継続投与については、現時点では明確なガイドラインがありません。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション4: 処方できる施設と患者の条件 ── */}
      <section>
        <h2 id="prescription-requirements" className="text-xl font-bold text-gray-800">処方できる施設と患者の条件 — ハードルがかなり高い</h2>

        <p>ゼップバウンドには<strong>最適使用推進ガイドライン</strong>が設けられていて、これが相当厳しいんです。処方できる施設と処方を受けられる患者、両方に条件があります。</p>

        <h3 className="text-lg font-bold text-gray-800 mt-6">施設の要件</h3>

        <ComparisonTable
          headers={["条件", "内容"]}
          rows={[
            ["施設認定", "日本内分泌学会・肥満学会・肥満症治療学会・糖尿病学会・循環器学会・内科学会の教育研修施設"],
            ["担当医師", "初期研修修了後5年以上の高血圧・脂質異常症・2型糖尿病・肥満症の臨床経験"],
            ["栄養指導体制", "常勤の管理栄養士を配置していること"],
          ]}
        />

        <p>事実上、<strong>大学病院や地域基幹病院</strong>に限定されます。街の内科クリニックや美容クリニックでの保険処方はほぼ不可能です。</p>

        <h3 className="text-lg font-bold text-gray-800 mt-6">患者の適応条件</h3>

        <ComparisonTable
          headers={["区分", "条件"]}
          rows={[
            ["パターンA", "BMI 35以上 ＋ 高血圧・脂質異常症・2型糖尿病のいずれか"],
            ["パターンB", "BMI 27以上35未満 ＋ 上記疾患 ＋ 肥満関連健康障害が2つ以上"],
            ["前提条件①", "食事療法・運動療法を6ヶ月以上継続して効果不十分"],
            ["前提条件②", "管理栄養士による2ヶ月に1回以上の栄養指導実績あり"],
          ]}
        />

        <Callout type="warning" title="「ちょっと太った」レベルでは使えない">
          BMI 27以上でも、合併症がなければ対象外です。さらに半年間の食事・運動療法と栄養指導の実績が前提なので、「今すぐ痩せたい」という目的では処方されません。
        </Callout>
      </section>

      {/* ── セクション5: ウゴービとの比較 ── */}
      <section>
        <h2 id="vs-wegovy" className="text-xl font-bold text-gray-800">ウゴービとの比較 — SURMOUNT-5の直接対決</h2>

        <p>2025年に発表されたSURMOUNT-5試験は、ゼップバウンドとウゴービを<strong>直接比較した</strong>非常に注目度の高い臨床試験です。結果を見てみましょう。</p>

        <StatGrid stats={[
          { value: "20.2", unit: "%", label: "ゼップバウンドの平均体重減少率（約22.8kg）" },
          { value: "13.7", unit: "%", label: "ウゴービの平均体重減少率（約15.0kg）" },
        ]} />

        <p>減量効果ではゼップバウンドが明確に優位です。ただし、ウゴービには<strong>SELECT試験で心血管イベントを20%低減</strong>したというエビデンスがあります。これはゼップバウンドにはまだないデータなんですよね。</p>

        <ComparisonTable
          headers={["項目", "ゼップバウンド", "ウゴービ"]}
          rows={[
            ["一般名", "チルゼパチド", "セマグルチド"],
            ["作用機序", "GIP/GLP-1デュアル", "GLP-1のみ"],
            ["平均減量率", "20.2%", "13.7%"],
            ["心血管エビデンス", "なし（試験進行中）", "SELECT試験で20%リスク低減"],
            ["投与頻度", "週1回皮下注射", "週1回皮下注射"],
            ["最大投与期間", "72週", "68週"],
          ]}
        />

        <p>「とにかく減量効果を重視するならゼップバウンド、心血管リスクも含めた総合管理ならウゴービ」という使い分けになりそうです。詳しくは<Link href="/clinic/column/wegovy-obesity-treatment-guide" className="text-sky-600 underline hover:text-sky-800">ウゴービ完全ガイド</Link>もあわせてどうぞ。</p>
      </section>

      {/* ── セクション6: マンジャロとの関係 ── */}
      <section>
        <h2 id="vs-mounjaro" className="text-xl font-bold text-gray-800">マンジャロとの関係 — 同じ成分、違う立ち位置</h2>

        <p>繰り返しになりますが、ゼップバウンドとマンジャロは<strong>有効成分がまったく同じチルゼパチド</strong>です。違いは適応症だけ。</p>

        <ComparisonTable
          headers={["項目", "マンジャロ", "ゼップバウンド"]}
          rows={[
            ["適応症", "2型糖尿病", "肥満症"],
            ["保険適用", "2型糖尿病患者のみ", "最適使用推進ガイドライン該当者のみ"],
            ["処方施設", "一般内科でも可", "教育研修施設に限定"],
            ["自費処方", "ダイエット目的で広く利用", "肥満症適応のため自費の需要は少ない"],
          ]}
        />

        <p>現実的には、ゼップバウンドの処方条件が厳しすぎて一般の方は保険で使えません。そのため、<strong>自費でマンジャロを使うという構図</strong>が依然として続いています。マンジャロについて詳しく知りたい方は<Link href="/clinic/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ完全ガイド</Link>をご覧ください。</p>
      </section>

      {/* ── セクション7: 結局誰が使えるの？ ── */}
      <section>
        <h2 id="who-can-use" className="text-xl font-bold text-gray-800">結局誰が使えるの？ — 現実的な選択肢を整理</h2>

        <p>正直なところ、ゼップバウンドを保険で使える人はかなり限られます。まとめるとこんな感じです。</p>

        <ComparisonTable
          headers={["あなたの状況", "選択肢"]}
          rows={[
            ["BMI 35以上＋合併症あり＋大学病院通院中", "ゼップバウンド（保険）が使える可能性あり"],
            ["BMI 27〜35＋合併症2つ以上＋栄養指導実績", "条件を満たせばゼップバウンド（保険）"],
            ["BMI 25〜27で合併症なし", "保険適用外。自費でマンジャロを検討"],
            ["とにかく減量したい（合併症なし）", "自費のマンジャロまたはオンライン診療"],
          ]}
        />

        <p>「保険で安く使えるらしい」というイメージで期待している方には残念ですが、現行ルールでは<strong>大半の方が保険処方の対象外</strong>です。ただ、同じチルゼパチドは自費であれば入手可能なので、オンライン診療を含めた選択肢を検討してみてください。</p>
      </section>

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>ゼップバウンドは、マンジャロと同じチルゼパチドを使った肥満症専用薬です。減量効果はウゴービを上回るSURMOUNT-5のデータがあり、薬として非常に優秀。ただし、最適使用推進ガイドラインによる処方条件が厳しく、<strong>一般の方が保険で使うのは現実的に難しい</strong>のが2026年時点の状況です。</p>

        <p>次世代の肥満症薬については<Link href="/clinic/column/next-generation-obesity-drugs" className="text-sky-600 underline hover:text-sky-800">次世代肥満症薬まとめ</Link>で詳しく解説しています。また、マンジャロの基本は<Link href="/clinic/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ完全ガイド</Link>をどうぞ。</p>
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
