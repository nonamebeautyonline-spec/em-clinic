import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { StatGrid, ComparisonTable, Callout, FlowSteps, InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "cpap-therapy-complete-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

/* Article + FAQPage の複合 JSON-LD */
const jsonLd = [
  {
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
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "CPAPは一生使い続ける必要がありますか？",
        acceptedAnswer: { "@type": "Answer", text: "原則として、CPAP は根治療法ではなく対症療法です。睡眠時無呼吸症候群（SAS）の原因が肥満の場合は、減量に成功すれば離脱できるケースもあります。ただし多くの患者さんは長期的に継続使用が必要です。" },
      },
      {
        "@type": "Question",
        name: "CPAPの保険適用の条件は？",
        acceptedAnswer: { "@type": "Answer", text: "終夜睡眠ポリグラフ検査（PSG）で AHI（無呼吸低呼吸指数）が 20 以上、または簡易検査で AHI 40 以上の場合に保険適用となります。3 割負担で月額約 4,500〜5,000 円です。" },
      },
      {
        "@type": "Question",
        name: "CPAPの使用時間は1日どのくらい必要ですか？",
        acceptedAnswer: { "@type": "Answer", text: "一般的に1晩4時間以上の使用が効果的とされ、理想的には就寝中ずっと（6〜8時間）装着することが推奨されます。使用時間が長いほど、日中の眠気改善や心血管リスク低減の効果が高まります。" },
      },
      {
        "@type": "Question",
        name: "CPAP使用中に口が乾くのですが対策はありますか？",
        acceptedAnswer: { "@type": "Answer", text: "加温加湿器の使用が最も効果的です。多くの最新機種には内蔵加湿器が付属しています。また、チンストラップ（顎バンド）で口の開きを防ぐ方法や、フルフェイスマスクへの変更も有効です。" },
      },
      {
        "@type": "Question",
        name: "オンライン診療でCPAP管理はできますか？",
        acceptedAnswer: { "@type": "Answer", text: "はい、月1回のCPAP管理料算定のための再診はオンライン診療で対応可能です。リモートモニタリングで使用時間やAHI、リーク量を医師が事前に確認し、5〜10分程度の診察で完了するケースが一般的です。" },
      },
      {
        "@type": "Question",
        name: "CPAPを毎月通院しないと保険が使えなくなりますか？",
        acceptedAnswer: { "@type": "Answer", text: "CPAP管理料は月1回の受診が算定要件です。受診しない月は保険適用の管理料を算定できません。ただしオンライン診療も「受診」に含まれるため、通院負担を大幅に軽減できます。" },
      },
    ],
  },
];

const keyPoints = [
  "CPAPの仕組み・機器の種類・マスク選びの基礎知識を網羅",
  "保険適用・自費・機器購入それぞれの費用を詳細比較",
  "オンライン診療×リモートモニタリングでCPAP管理を効率化する方法",
];

const toc = [
  { id: "what-is-cpap", label: "CPAPとは" },
  { id: "device-types", label: "機器の種類と比較" },
  { id: "mask-types", label: "マスクの種類と選び方" },
  { id: "cost", label: "費用の全体像" },
  { id: "effects", label: "CPAPの効果" },
  { id: "adherence", label: "遵守率の課題と対策" },
  { id: "online-management", label: "オンラインでのCPAP管理" },
  { id: "alternatives", label: "CPAP以外の治療選択肢" },
  { id: "faq", label: "よくある質問" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="CPAP療法完全ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── イントロ ── */}
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        CPAP（シーパップ）は、睡眠時無呼吸症候群（SAS）の治療において<strong>第一選択とされる標準治療</strong>です。
        しかし「機器の種類が多くて違いがわからない」「毎月の通院が負担」「費用はどのくらいかかるのか」といった疑問を抱える患者さんは少なくありません。
        本記事では、CPAPの基礎知識から機器比較、費用、効果、そして<strong>オンライン診療を活用した効率的なCPAP管理</strong>まで、必要な情報を網羅的に解説します。
      </p>

      <StatGrid stats={[
        { value: "300〜500", unit: "万人", label: "日本の推定SAS患者数" },
        { value: "50", unit: "万人", label: "CPAP治療中の患者数" },
        { value: "4,500", unit: "円/月〜", label: "保険適用時の自己負担" },
      ]} />

      {/* ── セクション1: CPAPとは ── */}
      <section>
        <h2 id="what-is-cpap" className="text-xl font-bold text-gray-800">CPAPとは — 仕組みと適応</h2>
        <p>CPAP（Continuous Positive Airway Pressure：持続陽圧呼吸療法）は、睡眠中に鼻や口に装着したマスクから一定の圧力で空気を送り込み、<strong>気道の閉塞を物理的に防ぐ治療法</strong>です。睡眠時無呼吸症候群（SAS）の中でも、上気道の閉塞が原因となる<strong>閉塞性睡眠時無呼吸症候群（OSAS）</strong>に対して高い効果を発揮します。</p>

        <p>SASの重症度は<strong>AHI（Apnea Hypopnea Index：無呼吸低呼吸指数）</strong>で評価されます。AHIは1時間あたりの無呼吸・低呼吸の回数を示し、この値が高いほど重症です。</p>

        <ComparisonTable
          headers={["重症度", "AHI", "主な症状", "治療方針"]}
          rows={[
            ["軽症", "5〜15回/時", "軽度のいびき・日中の軽い眠気", "生活指導・体位療法・マウスピース"],
            ["中等症", "15〜30回/時", "明確ないびき・日中の眠気", "マウスピース or CPAP"],
            ["重症", "30回以上/時", "強いいびき・強い眠気・起床時の頭痛", "CPAP（第一選択）"],
          ]}
        />

        <Callout type="info" title="CPAPの保険適用基準">
          終夜睡眠ポリグラフ検査（PSG）で<strong>AHI 20以上</strong>、または簡易検査で<strong>AHI 40以上</strong>の場合に保険適用となります。
          中等症（AHI 15〜20）の場合は、日中の眠気や合併症の有無により医師の判断で適用されるケースもあります。
        </Callout>

        <p>CPAPの仕組みはシンプルです。装置本体が室内の空気を取り込み、設定された圧力（通常4〜20cmH₂O）でチューブを通してマスクに送り込みます。この陽圧が上気道を「空気のスプリント（添え木）」のように内側から支え、舌根や軟口蓋が気道を塞ぐのを防ぎます。</p>
      </section>

      {/* ── セクション2: 機器の種類と比較 ── */}
      <section>
        <h2 id="device-types" className="text-xl font-bold text-gray-800">CPAP機器の種類と比較</h2>
        <p>CPAP機器は大きく3タイプに分かれます。それぞれの特徴を理解し、患者さんの状態に合った機器を選択することが治療の継続率を左右します。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">固定圧CPAP</h3>
        <p>医師が設定した一定の圧力で空気を送り続けるタイプです。構造がシンプルで価格も比較的安価ですが、必要以上の圧力がかかる場面もあるため、圧力に慣れない患者さんにはやや負担となるケースがあります。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">Auto CPAP（APAP）</h3>
        <p>呼吸状態をリアルタイムで検知し、<strong>必要な圧力を自動的に調整</strong>するタイプです。仰向けで気道が塞がりやすい時は圧力を上げ、横向きで安定している時は圧力を下げるなど、常に最適な圧力を供給します。現在のCPAP治療では<strong>最も主流</strong>となっています。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">BiPAP（BiLevel PAP）</h3>
        <p>吸気時と呼気時で異なる圧力を設定できるタイプです。呼気時の圧力を下げることで息を吐きやすくなり、<strong>高圧が必要な重症患者や肥満低換気症候群</strong>の患者さんに適しています。通常のCPAPで効果が不十分な場合の次のステップとして選択されます。</p>

        <ComparisonTable
          headers={["項目", "固定圧CPAP", "Auto CPAP（APAP）", "BiPAP"]}
          rows={[
            ["圧力制御", "一定圧", "自動調整（4〜20cmH₂O）", "吸気・呼気で独立設定"],
            ["快適性", "△ 圧力に慣れが必要", "◎ 常に最適圧", "◎ 呼気が楽"],
            ["適応", "軽〜中等症", "軽〜重症（最も汎用的）", "重症・高圧が必要な場合"],
            ["データ記録", "基本的な使用時間", "AHI・リーク量・圧力推移", "詳細な圧力・換気データ"],
            ["保険レンタル", "○", "○", "○（別途算定あり）"],
            ["購入価格目安", "15〜20万円", "20〜30万円", "30〜50万円"],
          ]}
        />

        <h3 className="text-lg font-bold text-gray-700 mt-6">主要メーカーと代表機種</h3>
        <p>日本のCPAP市場では、以下の3メーカーが主要なシェアを占めています。いずれもクラウド連携によるリモートモニタリング機能を搭載しており、オンライン診療との親和性が高い設計となっています。</p>

        <ComparisonTable
          headers={["メーカー", "代表機種", "特徴", "クラウドシステム"]}
          rows={[
            ["ResMed（レスメド）", "AirSense 11", "静音性に優れ、自動圧調整の精度が高い。世界シェアNo.1", "myAir / AirView"],
            ["Philips（フィリップス）", "DreamStation 2", "コンパクト設計。加湿一体型で持ち運びに便利", "DreamMapper / Care Orchestrator"],
            ["Fisher & Paykel", "SleepStyle", "独自の加温加湿技術。結露防止機能に定評", "InfoSmart Web"],
          ]}
        />
      </section>

      {/* ── セクション3: マスクの種類と選び方 ── */}
      <section>
        <h2 id="mask-types" className="text-xl font-bold text-gray-800">マスクの種類と選び方</h2>
        <p>CPAP治療の継続率を最も大きく左右するのが<strong>マスクの選択</strong>です。「マスクが合わない」はCPAP中断理由の第1位であり、患者さんの顔の形・呼吸の癖・睡眠姿勢に合ったマスクを見つけることが治療成功の鍵となります。</p>

        <ComparisonTable
          headers={["タイプ", "装着部位", "メリット", "デメリット", "適する患者"]}
          rows={[
            ["鼻マスク（ナーサル）", "鼻全体を覆う", "安定した装着感・種類が豊富", "口呼吸には非対応", "鼻呼吸ができる方（最も一般的）"],
            ["鼻ピロー（ナーサルピロー）", "鼻孔に直接挿入", "視界を遮らない・軽量・圧迫感が少ない", "高圧では不快感あり", "低〜中圧の方・閉所恐怖感がある方"],
            ["フルフェイス", "鼻と口を覆う", "口呼吸でも使用可能", "大きく重い・リーク発生しやすい", "口呼吸の方・高圧が必要な方"],
          ]}
        />

        <Callout type="info" title="マスク選びの3つのポイント">
          <strong>1. フィッティング：</strong>顔の形に合ったサイズを選ぶ。各メーカーがS/M/Lサイズを用意しており、試着が重要です。<br />
          <strong>2. 睡眠姿勢：</strong>横向き寝が多い方は鼻ピローやコンパクトな鼻マスクが適しています。<br />
          <strong>3. 口呼吸の有無：</strong>口を開けて寝る癖がある方はフルフェイスマスクか、鼻マスク＋チンストラップの組み合わせを検討します。
        </Callout>
      </section>

      {/* ── セクション4: 費用の全体像 ── */}
      <section>
        <h2 id="cost" className="text-xl font-bold text-gray-800">CPAP療法の費用 — 保険・自費・購入の比較</h2>
        <p>CPAP療法の費用は、保険適用の有無と利用形態（レンタル or 購入）によって大きく異なります。それぞれのパターンを詳しく見ていきましょう。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">保険適用の場合（レンタル）</h3>
        <p>PSG検査でAHI 20以上（簡易検査でAHI 40以上）の診断を受けた場合、CPAPは保険適用となります。機器はレンタル扱いとなり、毎月の再診時にCPAP管理料として算定されます。</p>

        <ComparisonTable
          headers={["費目", "保険点数", "3割負担額（目安）"]}
          rows={[
            ["在宅持続陽圧呼吸療法指導管理料", "250点", "750円"],
            ["CPAP装置加算", "1,100点", "3,300円"],
            ["再診料 + 外来管理加算", "約120点", "約360円"],
            ["合計（月額）", "約1,470点", "約4,500円"],
          ]}
        />

        <h3 className="text-lg font-bold text-gray-700 mt-6">自費診療の場合（レンタル）</h3>
        <p>保険適用の基準を満たさない場合や、月1回の受診が難しい場合は自費でのCPAPレンタルも選択肢となります。自費の場合、クリニックにより料金設定は異なります。</p>

        <ComparisonTable
          headers={["項目", "保険適用（3割負担）", "自費レンタル", "機器購入"]}
          rows={[
            ["初期費用", "なし", "0〜30,000円", "150,000〜300,000円"],
            ["月額費用", "約4,500〜5,000円", "5,000〜15,000円", "消耗品代のみ（2,000〜5,000円）"],
            ["年間費用", "約54,000〜60,000円", "60,000〜180,000円", "24,000〜60,000円"],
            ["通院頻度", "月1回（オンライン可）", "クリニックによる", "3〜6ヶ月に1回"],
            ["機器の交換", "故障時は無料交換", "契約による", "自己負担"],
            ["消耗品", "レンタル料に含む", "含む場合と別途の場合あり", "自己購入"],
          ]}
        />

        <Callout type="info" title="長期的なコスト比較">
          保険適用のレンタルは月額負担が少ない一方、毎月の通院（またはオンライン受診）が必要です。
          機器購入は初期費用が高いものの、<strong>3〜5年以上の長期利用</strong>ではトータルコストが安くなるケースがあります。
          ただし購入の場合、故障時の修理費用やモデル更新への対応は自己負担となる点に注意が必要です。
        </Callout>

        <h3 className="text-lg font-bold text-gray-700 mt-6">消耗品の交換サイクルと費用</h3>
        <ComparisonTable
          headers={["消耗品", "交換目安", "購入費用（目安）"]}
          rows={[
            ["マスククッション（シリコン部分）", "1〜3ヶ月", "2,000〜4,000円"],
            ["マスクフレーム", "6〜12ヶ月", "5,000〜10,000円"],
            ["ヘッドギア（バンド）", "6ヶ月", "2,000〜3,000円"],
            ["エアチューブ", "3〜6ヶ月", "2,000〜4,000円"],
            ["フィルター（使い捨て）", "2週間〜1ヶ月", "500〜1,000円（複数枚）"],
            ["加湿チャンバー", "6ヶ月", "3,000〜5,000円"],
          ]}
        />
      </section>

      {/* ── セクション5: CPAPの効果 ── */}
      <section>
        <h2 id="effects" className="text-xl font-bold text-gray-800">CPAPの効果 — エビデンスに基づく改善効果</h2>
        <p>CPAP療法は多くの臨床研究でその効果が実証されています。単に「いびきが止まる」だけでなく、全身の健康に広範なポジティブな影響をもたらします。</p>

        <StatGrid stats={[
          { value: "95", unit: "%以上", label: "いびき改善率" },
          { value: "60", unit: "%", label: "日中の眠気改善" },
          { value: "2〜3", unit: "倍", label: "未治療SASの交通事故リスク" },
        ]} />

        <h3 className="text-lg font-bold text-gray-700 mt-6">主要な改善効果</h3>
        <p><strong>1. いびきの消失・軽減：</strong>CPAP使用中は気道が開存するため、いびきはほぼ完全に消失します。パートナーの睡眠の質も大幅に改善されます。</p>
        <p><strong>2. 日中の眠気改善：</strong>無呼吸による覚醒反応がなくなることで深い睡眠が確保され、日中の過度な眠気（EDS）が改善します。エプワース眠気尺度（ESS）スコアの有意な改善が多くの研究で報告されています。</p>
        <p><strong>3. 血圧の低下：</strong>SASは夜間の低酸素血症を通じて交感神経を活性化させ、高血圧の原因となります。CPAPの継続使用により<strong>収縮期血圧が平均2〜10mmHg低下</strong>することが示されています。治療抵抗性高血圧の患者では特に効果が顕著です。</p>
        <p><strong>4. 心血管イベントリスクの低減：</strong>重症SASの未治療群と比較し、CPAP治療群では心筋梗塞・脳卒中の発症リスクが有意に低下するとの報告があります。</p>
        <p><strong>5. 交通事故リスクの低減：</strong>未治療の中等症〜重症SAS患者は交通事故リスクが2〜3倍とされますが、CPAP使用により健常者と同等レベルまで低下します。</p>
        <p><strong>6. QOL（生活の質）の向上：</strong>集中力の回復、うつ症状の改善、夜間頻尿の減少など、幅広い生活の質の向上が期待できます。</p>

        <ComparisonTable
          headers={["改善項目", "効果の程度", "エビデンスレベル"]}
          rows={[
            ["いびき", "ほぼ完全消失", "★★★（確立）"],
            ["日中の眠気（ESS）", "ESS 4〜6ポイント改善", "★★★（確立）"],
            ["血圧", "収縮期 2〜10mmHg低下", "★★★（確立）"],
            ["交通事故リスク", "健常者レベルまで低下", "★★☆（強い）"],
            ["心血管イベント", "リスク低減（特に重症例）", "★★☆（強い）"],
            ["うつ症状", "改善傾向", "★☆☆（中程度）"],
            ["夜間頻尿", "回数減少", "★★☆（強い）"],
          ]}
        />
      </section>

      {/* ── セクション6: 遵守率の課題と対策 ── */}
      <section>
        <h2 id="adherence" className="text-xl font-bold text-gray-800">CPAP遵守率の課題と対策</h2>
        <p>CPAPは効果が高い一方で、<strong>治療の継続率（アドヒアランス）が大きな課題</strong>です。国内外の研究によると、CPAP導入後<strong>30〜50%の患者が1年以内に使用を中断</strong>するとされています。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">中断の主な理由</h3>
        <ComparisonTable
          headers={["中断理由", "割合（概算）", "対策"]}
          rows={[
            ["マスクの不快感・フィット不良", "30〜40%", "マスク変更・フィッティング調整"],
            ["圧力への不慣れ・息苦しさ", "20〜30%", "ランプ機能・Auto CPAPへの変更"],
            ["鼻閉・口渇・鼻出血", "15〜25%", "加湿器使用・耳鼻科的治療"],
            ["騒音（本体・エアリーク）", "10〜15%", "新型機種への変更・リーク対策"],
            ["毎月の通院負担", "15〜20%", "オンライン診療の活用"],
            ["効果を実感できない", "10〜15%", "データを用いた客観的な説明"],
          ]}
        />

        <Callout type="info" title="アドヒアランス向上の5つの施策">
          <strong>1. 導入初期の集中フォロー：</strong>最初の1〜2週間が最も離脱しやすい時期。導入3日後・1週間後・2週間後にフォローアップの連絡を入れることが効果的です。<br />
          <strong>2. マスクフィッティングの最適化：</strong>複数タイプのマスクを試着し、最適なものを選ぶ。合わなければ早期に変更。<br />
          <strong>3. ランプ機能の活用：</strong>就寝時は低圧からスタートし、徐々に治療圧まで上げることで圧力への不慣れを軽減。<br />
          <strong>4. データフィードバック：</strong>使用時間やAHIの推移を患者と共有し、改善を「見える化」する。<br />
          <strong>5. オンライン診療の導入：</strong>通院負担を軽減し、受診の継続率を向上させる。
        </Callout>
      </section>

      {/* ── セクション7: オンラインでのCPAP管理 ── */}
      <section>
        <h2 id="online-management" className="text-xl font-bold text-gray-800">オンライン診療を活用したCPAP管理</h2>
        <p>CPAP管理は毎月の受診が保険算定の要件ですが、診察内容は「使用状況の確認と指導」が中心であり、<strong>オンライン診療と非常に親和性が高い領域</strong>です。実際、多くのCPAP管理クリニックがオンライン対応を進めています。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">リモートモニタリングの活用</h3>
        <p>最新のCPAP機器はクラウド経由で使用データを自動送信する機能を備えています。医師は診察前に以下のデータを確認できます。</p>

        <ComparisonTable
          headers={["モニタリング項目", "確認内容", "臨床的な意義"]}
          rows={[
            ["使用時間", "1日の装着時間・使用日数", "アドヒアランスの評価"],
            ["AHI（残存AHI）", "CPAP使用下の無呼吸指数", "治療効果の評価・圧力調整の必要性"],
            ["リーク量", "マスクからの空気漏れ量", "マスクフィットの評価"],
            ["圧力推移", "実際に適用された圧力パターン", "圧力設定の最適化"],
            ["使用開始・終了時刻", "就寝・起床パターン", "睡眠習慣の評価"],
          ]}
        />

        <h3 className="text-lg font-bold text-gray-700 mt-6">オンライン再診の流れ</h3>
        <FlowSteps steps={[
          { title: "データ事前確認", desc: "医師がリモートモニタリングデータ（使用時間・AHI・リーク量）を診察前に確認" },
          { title: "オンライン問診", desc: "患者がLINE上で「日中の眠気」「マスクの不快感」「困りごと」を事前に回答" },
          { title: "ビデオ診察（5〜10分）", desc: "データに基づく説明、困りごとへの対応、必要に応じて圧力・マスクの変更指示" },
          { title: "処方・次回予約", desc: "必要に応じて睡眠薬等の処方。消耗品の手配。次回のオンライン予約を確定" },
        ]} />

        <Callout type="info" title="オンラインCPAP管理のメリット">
          患者にとっては<strong>毎月の通院が5〜10分のオンライン診察に置き換わる</strong>ため、仕事や家事への影響が最小限に。
          クリニック側も1件あたりの診察時間を短縮でき、1時間あたりの診察数を増やすことが可能です。
          CPAP管理料はオンライン診療でも算定可能です（情報通信機器を用いた場合、対面と算定額が異なる場合があるため最新の診療報酬を確認してください）。<strong>通院負担の軽減により患者満足度の向上</strong>が期待できます。
        </Callout>

        <h3 className="text-lg font-bold text-gray-700 mt-6">消耗品の定期配送</h3>
        <p>CPAP治療では、マスクやフィルターなどの消耗品の定期的な交換が必要です。オンライン管理と組み合わせることで、<strong>来院不要で消耗品を患者の自宅に配送</strong>する仕組みが構築できます。</p>
        <p>配送のタイミングは消耗品の交換サイクル（マスククッション1〜3ヶ月、フィルター2週間〜1ヶ月）に合わせて自動化すると、患者の利便性が格段に向上します。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">LINEを活用したフォローアップ</h3>
        <p>CPAP管理においてLINE公式アカウントは強力なフォローアップツールとなります。具体的な活用例をいくつか紹介します。</p>
        <p><strong>導入初期のフォロー：</strong>CPAP導入後3日目・1週間後・2週間後にLINEで自動メッセージを配信し、困りごとがないか確認。返信があれば医師やスタッフが対応します。</p>
        <p><strong>受診リマインド：</strong>月1回の受診日の前日にLINEでリマインド通知を送信。オンライン診療の場合は接続URLもあわせて案内します。</p>
        <p><strong>消耗品交換の通知：</strong>前回の配送日を起点に、交換時期が近づいたらLINEで通知。そのままLINE上で再注文を受け付けます。</p>

        <InlineCTA />
      </section>

      {/* ── セクション8: CPAP以外の治療選択肢 ── */}
      <section>
        <h2 id="alternatives" className="text-xl font-bold text-gray-800">CPAP以外の治療選択肢</h2>
        <p>CPAPが合わない、または軽症でCPAPの適応とならない場合には、以下の治療選択肢が検討されます。</p>

        <ComparisonTable
          headers={["治療法", "適応", "メリット", "デメリット", "費用目安"]}
          rows={[
            ["口腔内装置（マウスピース）", "軽〜中等症（AHI 5〜20）", "手軽・旅行時に便利", "重症には効果不十分", "保険: 1〜2万円 / 自費: 5〜15万円"],
            ["UPPP（口蓋垂軟口蓋咽頭形成術）", "口蓋垂・扁桃肥大が原因", "根治の可能性", "手術リスク・再発あり", "保険: 10〜15万円"],
            ["鼻中隔矯正術", "鼻閉がSASの一因", "鼻呼吸の改善", "SASの根本治療にはならない", "保険: 5〜10万円"],
            ["舌下神経刺激療法", "CPAPが使えない中〜重症", "マスク不要", "高額・実施施設が限定的", "自費: 300〜500万円"],
            ["減量（生活習慣改善）", "肥満が原因のSAS", "根治の可能性", "達成・維持が困難", "ほぼ無料"],
            ["体位療法", "仰臥位で悪化する軽症", "簡単・費用ゼロ", "重症には効果不十分", "ほぼ無料"],
          ]}
        />

        <p>実際の治療ではこれらの選択肢を<strong>組み合わせる</strong>ケースも多くあります。たとえば「CPAP＋減量指導」や「マウスピース＋体位療法」といった複合的なアプローチが効果的です。治療法の選択は、SASの重症度・原因・患者のライフスタイルを総合的に考慮して医師と相談の上で決定しましょう。</p>

        <p className="text-sm text-gray-500 mt-4">
          関連記事: <Link href="/lp/column/insomnia-online-clinic-lope" className="text-blue-600 hover:underline">不眠症・睡眠薬のオンライン処方ガイド</Link>
        </p>
      </section>

      {/* ── セクション9: よくある質問 ── */}
      <section>
        <h2 id="faq" className="text-xl font-bold text-gray-800">よくある質問（FAQ）</h2>

        <div className="space-y-6 mt-4">
          <div>
            <h3 className="text-base font-bold text-gray-700">Q. CPAPは一生使い続ける必要がありますか？</h3>
            <p>原則として、CPAPは根治療法ではなく対症療法です。SASの原因が肥満の場合は、減量に成功すれば離脱できるケースもあります。ただし骨格的な要因（小顎症など）が原因の場合は長期的な継続使用が必要です。</p>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-700">Q. CPAPの保険適用の条件は？</h3>
            <p>終夜睡眠ポリグラフ検査（PSG）で<strong>AHI 20以上</strong>、または簡易検査で<strong>AHI 40以上</strong>の場合に保険適用となります。3割負担で月額約4,500〜5,000円です。</p>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-700">Q. CPAPの使用時間は1日どのくらい必要ですか？</h3>
            <p>一般的に<strong>1晩4時間以上</strong>の使用が効果的とされ、理想的には就寝中ずっと（6〜8時間）装着することが推奨されます。使用時間が長いほど効果が高まります。</p>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-700">Q. CPAP使用中に口が乾くのですが対策はありますか？</h3>
            <p>加温加湿器の使用が最も効果的です。多くの最新機種には内蔵加湿器が付属しています。チンストラップ（顎バンド）で口の開きを防ぐ方法や、フルフェイスマスクへの変更も有効です。</p>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-700">Q. オンライン診療でCPAP管理はできますか？</h3>
            <p>はい、月1回のCPAP管理料算定のための再診はオンライン診療で対応可能です。リモートモニタリングで使用データを医師が事前に確認し、<strong>5〜10分程度の診察で完了</strong>するケースが一般的です。</p>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-700">Q. CPAPを毎月通院しないと保険が使えなくなりますか？</h3>
            <p>CPAP管理料は月1回の受診が算定要件です。受診しない月は保険適用の管理料を算定できません。ただし<strong>オンライン診療も「受診」に含まれる</strong>ため、通院負担を大幅に軽減できます。</p>
          </div>
        </div>
      </section>

      {/* ── セクション10: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — CPAP治療を継続するために</h2>
        <p>CPAP療法は睡眠時無呼吸症候群に対する<strong>最も効果的な標準治療</strong>であり、いびきの改善だけでなく、日中の眠気・高血圧・心血管リスク・交通事故リスクの低減など、多方面にわたる健康効果が実証されています。</p>

        <p>一方で、マスクの不快感や毎月の通院負担などが原因で<strong>30〜50%の患者が1年以内に中断</strong>してしまうという課題があります。この課題を解決する鍵が、<strong>オンライン診療とリモートモニタリングの活用</strong>です。</p>

        <p>クリニック側にとっても、CPAP管理は「毎月の定期受診が保険算定要件」という特性上、<strong>安定した継続収入が見込める領域</strong>です。オンライン診療を導入することで1件あたりの診察時間を短縮しつつ、患者の通院負担を減らしてアドヒアランスを向上させる — まさにクリニックと患者の双方にメリットのある運用が実現できます。</p>

        <Callout type="info" title="CPAP管理のポイント">
          <strong>患者向け：</strong>マスクが合わない場合は我慢せず早めに相談を。オンライン診療対応のクリニックなら毎月の通院負担も最小限に。<br />
          <strong>クリニック向け：</strong>CPAP管理はオンライン診療と最も相性が良い領域の一つ。LINE活用でフォローアップを自動化すれば、離脱防止と業務効率化を両立できます。
        </Callout>

        <p className="text-sm text-gray-500 mt-6">
          関連記事:
          <Link href="/lp/column/insomnia-online-clinic-lope" className="text-blue-600 hover:underline ml-2">不眠症・睡眠薬のオンライン処方ガイド</Link>
          <span className="mx-1">|</span>
          <Link href="/lp/column/online-clinic-complete-guide" className="text-blue-600 hover:underline">オンライン診療完全ガイド</Link>
        </p>
      </section>
    </ArticleLayout>
  );
}
