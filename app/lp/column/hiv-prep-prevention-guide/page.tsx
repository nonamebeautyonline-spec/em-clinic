import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  StatGrid,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "hiv-prep-prevention-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: `${self.date}T00:00:00+09:00`,
  dateModified: `${self.updatedDate || self.date}T00:00:00+09:00`,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "PrEP（曝露前予防）は正しく服用すればHIV感染リスクを99%低減できる",
  "デイリーPrEPとオンデマンドPrEP（2-1-1法）の2つの服用方法がある",
  "日本では自費診療で月額10,000〜25,000円程度。3ヶ月ごとの定期検査が必須",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「HIV予防って、コンドーム以外に方法あるの？」——実はあります。<strong>PrEP（プレップ）</strong>という、HIV陰性の方が事前に抗HIV薬を飲むことで感染を防ぐ方法です。WHOも推奨しているこの予防法について、デイリーPrEPとオンデマンドPrEPの違い、費用、処方の流れまで<strong>まるっと解説</strong>します。
      </p>

      {/* ── セクション1: PrEPとは ── */}
      <section>
        <h2 id="what-is-prep" className="text-xl font-bold text-gray-800">そもそもPrEPって何？ ワクチンとは違うの？</h2>

        <p>PrEPは「Pre-Exposure Prophylaxis」の略で、日本語にすると<strong>「曝露前予防」</strong>。HIV陰性の人が、感染リスクのある行為の<strong>前に</strong>抗HIV薬を服用しておくことで、ウイルスが体内に入ってきても増殖を防ぐという仕組みです。</p>

        <p>ワクチンのように免疫をつけるのではなく、薬の成分が粘膜や血液中に十分な濃度で存在することで、HIVの侵入をブロックします。2012年にアメリカFDAが承認して以降、<strong>WHOも「高リスク群に対するPrEPの提供」を強く推奨</strong>しています。</p>

        <StatGrid stats={[
          { value: "99", unit: "%", label: "正しい服用時のHIV感染リスク低減率" },
          { value: "2012", unit: "年", label: "米FDA承認" },
          { value: "78", unit: "カ国以上", label: "PrEPが利用可能な国（2025年時点）" },
        ]} />

        <p>日本では<strong>予防目的でのPrEPは国内未承認</strong>。つまり保険はきかず、全額自費診療になります。ただし、それでもHIV感染後の治療費（生涯で数千万円）と比べれば、予防のほうがはるかに合理的な選択です。</p>
      </section>

      {/* ── セクション2: デイリーPrEP ── */}
      <section>
        <h2 id="daily-prep" className="text-xl font-bold text-gray-800">デイリーPrEP——毎日1錠飲むだけで99%の予防効果</h2>

        <p>もっともスタンダードなPrEPが、<strong>ツルバダ（テノホビル／エムトリシタビン）</strong>またはデシコビを毎日1錠服用する方法です。食事の有無に関係なく飲めるので、生活リズムに組み込みやすいのが特長。</p>

        <FlowSteps steps={[
          { title: "処方開始", desc: "HIV検査で陰性を確認後、毎日1錠の服用をスタート。" },
          { title: "2〜3週間で血中濃度到達", desc: "直腸粘膜では約7日、膣粘膜では約20日で十分な予防濃度に。" },
          { title: "毎日継続", desc: "決まった時間に1錠。飲み忘れが増えると効果が下がるので習慣化が鍵。" },
          { title: "3ヶ月ごとにフォローアップ", desc: "HIV検査・腎機能チェック・STI検査を定期的に実施。" },
        ]} />

        <p>臨床試験（iPrEx試験）では、きちんと服用を続けた群で<strong>HIV感染リスクが99%低減</strong>されました。逆に言えば、飲み忘れが多いと効果は大きく下がります。だからこそ、LINEでの服薬リマインドのような<strong>アドヒアランス支援</strong>がとても重要です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション3: オンデマンドPrEP ── */}
      <section>
        <h2 id="on-demand-prep" className="text-xl font-bold text-gray-800">オンデマンドPrEP（2-1-1法）——必要なときだけ飲む選択肢</h2>

        <p>「毎日飲むのはちょっと……」という方に注目されているのが、<strong>オンデマンドPrEP（イベント駆動型PrEP）</strong>です。「2-1-1法」とも呼ばれるこの方法は、性行為のタイミングに合わせて短期間だけ服用します。</p>

        <FlowSteps steps={[
          { title: "性行為の2〜24時間前", desc: "ツルバダを2錠まとめて服用。これで粘膜に薬剤が行き渡る。" },
          { title: "最初の服用から24時間後", desc: "ツルバダ1錠を服用。" },
          { title: "最初の服用から48時間後", desc: "ツルバダ1錠を服用。合計4錠で完了。" },
        ]} />

        <p>この方法は2015年のIPERGAY試験で有効性が示され、<strong>プラセボ群と比較してHIV感染リスクを86%低減</strong>しました。ただし重要な注意点があります。</p>

        <Callout type="info" title="オンデマンドPrEPの制約">
          現時点でエビデンスがあるのは<strong>MSM（男性間性行為者）のみ</strong>です。シスジェンダー女性や膣を介した性行為については十分なデータがなく、推奨されていません。また、使用できるのは<strong>ツルバダのみ</strong>で、デシコビはオンデマンドでの使用は不可です。
        </Callout>
      </section>

      {/* ── セクション4: デイリー vs オンデマンド比較 ── */}
      <section>
        <h2 id="daily-vs-ondemand" className="text-xl font-bold text-gray-800">デイリー vs オンデマンド——どっちを選べばいい？</h2>

        <p>結論から言うと、<strong>ライフスタイルとリスクの頻度で決まります</strong>。頻繁にリスクがある方はデイリー、月に数回程度ならオンデマンドが合理的です。</p>

        <ComparisonTable
          headers={["比較項目", "デイリーPrEP", "オンデマンドPrEP（2-1-1法）"]}
          rows={[
            ["対象者", "全リスク群（性別問わず）", "MSMのみエビデンスあり"],
            ["使用薬剤", "ツルバダ or デシコビ", "ツルバダのみ"],
            ["服用方法", "毎日1錠", "行為前に2錠 → 24h後1錠 → 48h後1錠"],
            ["効果発現", "直腸7日 / 膣20日で十分濃度", "服用2〜24時間後から有効"],
            ["月額コスト目安", "10,000〜25,000円", "使用頻度による（数千円〜）"],
            ["メリット", "安定した予防効果・全対象", "コスト抑制・副作用の曝露期間短い"],
            ["デメリット", "毎日の服用が必要・コスト高", "計画性が必要・対象が限定的"],
          ]}
        />

        <p>迷ったらまずは医師に相談を。リスク行為の頻度や生活スタイルを踏まえて、<strong>無理なく続けられる方法を一緒に選ぶ</strong>のがベストです。</p>
      </section>

      {/* ── セクション5: PEPとの違い ── */}
      <section>
        <h2 id="prep-vs-pep" className="text-xl font-bold text-gray-800">PrEPとPEP——「事前」と「事後」で全然違う</h2>

        <p>PrEPと混同されやすいのが<strong>PEP（Post-Exposure Prophylaxis：曝露後予防）</strong>です。どちらも抗HIV薬を使う予防法ですが、タイミングと目的がまったく違います。</p>

        <ComparisonTable
          headers={["比較項目", "PrEP（曝露前予防）", "PEP（曝露後予防）"]}
          rows={[
            ["タイミング", "リスク行為の「前」から服用", "リスク行為の「後」72時間以内に開始"],
            ["服用期間", "継続的 or イベント時", "28日間"],
            ["薬剤", "ツルバダ / デシコビ", "抗HIV薬3剤併用（ツルバダ＋α）"],
            ["費用目安", "月10,000〜25,000円", "1回80,000〜120,000円"],
            ["位置づけ", "計画的な予防", "緊急対応（最後の手段）"],
          ]}
        />

        <p>PEPはあくまで「最後の手段」。<strong>72時間を超えると効果が期待できない</strong>ため、リスク行為後すぐの受診が必要です。計画的に予防できるPrEPのほうが、心理的にも費用的にも負担が少ないと言えます。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: 日本での現状 ── */}
      <section>
        <h2 id="japan-status" className="text-xl font-bold text-gray-800">日本でPrEPを始めるには？ 費用と入手方法のリアル</h2>

        <p>日本ではPrEPは<strong>予防目的での薬事承認がされていない</strong>ため、すべて自費診療です。ただし、2023年頃からジェネリック輸入の選択肢が広がり、費用面のハードルは確実に下がっています。</p>

        <StatGrid stats={[
          { value: "10,000〜25,000", unit: "円/月", label: "デイリーPrEPの費用目安" },
          { value: "3", unit: "ヶ月", label: "定期フォローアップの推奨間隔" },
          { value: "0", unit: "件", label: "日本国内での保険適用（2026年現在）" },
        ]} />

        <p>厚労省のPrEP研究班が保険適用に向けた検討を進めていますが、実現時期は未定です。現状では、<strong>オンライン診療で処方を受け、ジェネリック薬を利用する</strong>のがもっとも現実的なルートになっています。</p>
      </section>

      {/* ── セクション7: 処方時の注意 ── */}
      <section>
        <h2 id="prescription-notes" className="text-xl font-bold text-gray-800">処方前に必ずやること——検査とフォローアップが命綱</h2>

        <p>PrEPは「飲めば安心」ではありません。<strong>処方前と処方中の検査が絶対に必要</strong>です。特に重要なのが以下の4つ。</p>

        <FlowSteps steps={[
          { title: "HIV検査（陰性確認）", desc: "HIV陽性者がPrEPを飲むと薬剤耐性ウイルスを生むリスクがある。処方前の陰性確認は絶対条件。" },
          { title: "腎機能検査", desc: "テノホビルは腎臓に負担がかかるため、eGFRが60未満の場合は処方不可。定期的なモニタリングが必要。" },
          { title: "B型肝炎検査", desc: "テノホビルはB型肝炎にも効果があるため、PrEP中止時に肝炎が再燃するリスクがある。事前のスクリーニングが重要。" },
          { title: "STI併行検査", desc: "PrEPはHIVのみ予防。梅毒・淋菌・クラミジアなど他のSTIは防げないため、3ヶ月ごとの併行検査を推奨。" },
        ]} />

        <Callout type="point" title="オンライン診療とPrEPは相性がいい">
          3ヶ月ごとの定期フォローアップが必須のPrEPは、<strong>オンライン診療との相性が抜群</strong>です。検査キットを自宅に送付し、結果をオンラインで確認して処方を継続する——このフローなら、通院の負担を最小限に抑えつつ、必要な検査をしっかり実施できます。LINEでの予約リマインドや検査結果通知など、患者フォローの自動化も効果的です。
        </Callout>
      </section>

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ——PrEPは「知っている人だけが使える」予防法。だからこそ正しい情報を</h2>

        <p>PrEPは、正しく使えばHIV感染リスクを99%低減できる強力な予防手段です。デイリーPrEPは安定した効果が得られ、オンデマンドPrEPは必要なときだけ使えるコスト効率の良い選択肢。日本では自費診療となりますが、<strong>ジェネリックの普及で費用は着実に下がってきています</strong>。</p>

        <p>大切なのは、<strong>定期的な検査とフォローアップを欠かさないこと</strong>。PrEPはHIV以外のSTIは防げませんし、腎機能のモニタリングも必須です。オンライン診療を活用すれば、これらのフォローアップを無理なく継続できます。HIV予防の選択肢を広げることは、患者さんの人生を守ることにつながります。</p>
      </section>
    </ArticleLayout>
  );
}
