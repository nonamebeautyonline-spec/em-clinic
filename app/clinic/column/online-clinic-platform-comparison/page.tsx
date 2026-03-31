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

/* articles.ts に未登録の場合はインラインで定義 */
const self = articles.find((a) => a.slug === "online-clinic-platform-comparison") ?? {
  slug: "online-clinic-platform-comparison",
  title: "オンライン診療プラットフォーム比較 — CLINICS・curon・Lオペの機能・費用・特徴を徹底比較",
  description:
    "オンライン診療プラットフォームの主要3サービス（CLINICS、curon、Lオペ for CLINIC）を徹底比較。機能一覧・月額費用・LINE連携・予約管理・処方管理・患者CRM・配送管理の観点から、クリニックに最適なプラットフォームの選び方を解説します。",
  date: "2026-03-23",
  category: "ツール比較",
  readTime: "12分",
  tags: ["オンライン診療", "プラットフォーム比較", "CLINICS", "curon", "Lオペ"],
};

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: {
    title: self.title,
    description: self.description,
    url: `${SITE_URL}/lp/column/${self.slug}`,
    type: "article",
    publishedTime: self.date,
  },
};


const faqItems = [
  { q: "オンライン診療プラットフォーム比較で選ぶ際の最も重要な基準は何ですか？", a: "クリニック業務への適合性が最も重要です。汎用ツールは安価ですが医療ワークフローへの対応に大量のカスタマイズが必要です。クリニック専用ツールなら予約管理・問診・カルテ・決済が標準搭載されており、導入直後から運用できます。" },
  { q: "ツール移行時にデータは引き継げますか？", a: "LINE公式アカウントはそのまま維持し、連携ツールだけを切り替える形になります。友だちリストやトーク履歴はLINE公式側に残るため、患者への影響はありません。Lオペ for CLINICでは移行サポートも提供しています。" },
  { q: "無料で使えるツールではダメですか？", a: "無料ツールは基本的な配信機能のみで、予約管理・問診・カルテ連携・セグメント配信などクリニックに必要な機能が不足しています。月額費用をかけてでも専用ツールを導入した方が、業務効率化による人件費削減で十分に元が取れます。" },
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
  "CLINICS・curon・Lオペ for CLINICの機能・費用・特徴を15項目で比較",
  "LINE連携・患者CRM・配送管理など、オンライン診療特有の評価軸を解説",
  "クリニックの規模・診療形態別に最適なプラットフォームの選び方を提示",
];

const toc = [
  { id: "overview", label: "プラットフォーム選定の7つのポイント" },
  { id: "clinics", label: "CLINICS（クリニクス）" },
  { id: "curon", label: "curon（クロン）" },
  { id: "lope", label: "Lオペ for CLINIC" },
  { id: "comparison", label: "3サービス徹底比較" },
  { id: "use-cases", label: "クリニック別おすすめ" },
  { id: "migration", label: "乗り換え時の注意点" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="プラットフォーム比較" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ── イントロ ── */}
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        オンライン診療の導入を検討するとき、最初にぶつかるのが<strong>「どのプラットフォームを使うか」</strong>という問題です。
        本記事では、クリニック向けオンライン診療プラットフォームの中から<strong>CLINICS（クリニクス）</strong>、<strong>curon（クロン）</strong>、<strong>Lオペ for CLINIC</strong>の3サービスを取り上げ、
        機能・費用・LINE連携・患者CRM・配送管理など<strong>15項目</strong>で徹底比較します。
        自院に最適なプラットフォームを選ぶための判断材料として、ぜひ最後までお読みください。
      </p>

      <StatGrid stats={[
        { value: "1,200", unit: "億円", label: "2026年 オンライン診療市場規模" },
        { value: "3.5", unit: "万施設", label: "届出医療機関数" },
        { value: "15", unit: "項目", label: "本記事の比較項目数" },
      ]} />

      {/* ── セクション1: オンライン診療プラットフォームとは ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">オンライン診療プラットフォームとは — 選定で重要な7つのポイント</h2>

        <p>オンライン診療プラットフォームとは、ビデオ通話による診察・予約管理・問診・処方・決済・配送といった<strong>オンライン診療に必要な業務をワンストップで支援するシステム</strong>の総称です。2022年4月の診療報酬改定で初診からのオンライン診療が恒久化されて以降、対面診療と組み合わせるハイブリッド型のクリニックが急増し、プラットフォーム選定の重要性がこれまで以上に高まっています。</p>

        <p>しかし、各プラットフォームは得意領域がそれぞれ異なります。「ビデオ診察の安定性」に強いサービスもあれば、「LINE連携による集患・CRM」に強いサービスもあります。選定時に重視すべきポイントを7つに整理しました。</p>

        <Callout type="info" title="プラットフォーム選定で重視すべき7つのポイント">
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li><strong>LINE連携の深さ</strong> — 通知だけか、予約・問診・決済までLINE完結できるか</li>
            <li><strong>予約管理の柔軟性</strong> — 時間帯予約・順番予約・枠数制御への対応</li>
            <li><strong>問診のカスタマイズ性</strong> — 診療科ごとのテンプレート・条件分岐・画像添付への対応</li>
            <li><strong>ビデオ診察の品質</strong> — 通信安定性・録画・画面共有機能</li>
            <li><strong>処方・配送管理</strong> — 薬局連携・配送追跡・発送通知の自動化</li>
            <li><strong>患者CRM・セグメント配信</strong> — 再診促進・離脱防止のための患者管理と配信機能</li>
            <li><strong>費用体系の透明性</strong> — 初期費用・月額・従量課金の構造、隠れコストの有無</li>
          </ol>
        </Callout>

        <p>これら7つの観点は、オンライン診療の「導入」だけでなく「継続的な収益化」にも直結します。特にLINE連携と患者CRMは、オンライン診療で安定的にリピーターを獲得するうえで欠かせない機能です。オンライン診療の基本的な始め方については<Link href="/clinic/column/online-clinic-complete-guide" className="text-blue-600 underline">オンライン診療完全ガイド</Link>もあわせてご覧ください。</p>
      </section>

      {/* ── セクション2: CLINICS ── */}
      <section>
        <h2 id="clinics" className="text-xl font-bold text-gray-800">CLINICS（クリニクス） — メドレー社の総合プラットフォーム</h2>

        <p>CLINICSは、医療系IT企業メドレーが提供するオンライン診療プラットフォームです。電子カルテ「CLINICS カルテ」との一体化が最大の特徴で、<strong>対面診療とオンライン診療のシームレスな統合</strong>を実現しています。医療機関の導入実績が豊富で、信頼性の高さから大規模クリニックや病院での採用が多い傾向にあります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">CLINICSの主な特徴</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>電子カルテ一体型</strong> — CLINICS カルテとの連携で、オンライン診察中にカルテ記入が可能。対面とオンラインの診察記録が一元管理される</li>
          <li><strong>患者アプリの完成度</strong> — iOS/Android対応の患者向けアプリがあり、予約・問診・ビデオ通話・決済がアプリ内で完結する</li>
          <li><strong>安定したビデオ通話</strong> — 独自のWebRTC基盤で通信品質が安定。録画機能も利用可能</li>
          <li><strong>処方箋の電子送付</strong> — 薬局への処方箋FAX送信や、患者宅への郵送に対応</li>
          <li><strong>導入実績の豊富さ</strong> — 大手医療機関・病院グループでの採用実績があり、サポート体制も充実</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">費用</h3>
        <ComparisonTable
          headers={["項目", "内容"]}
          rows={[
            ["初期費用", "要問い合わせ（カルテ一体型は別途設定費）"],
            ["月額費用", "1.3万円〜4万円（プランによる）"],
            ["従量課金", "オンライン診察1件あたり課金あり"],
            ["患者アプリ", "無料（患者側の費用負担なし）"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">機能カバー率</h3>
        <BarChart
          data={[
            { label: "予約管理", value: 90, color: "#3b82f6" },
            { label: "ビデオ診察", value: 95, color: "#3b82f6" },
            { label: "問診", value: 80, color: "#3b82f6" },
            { label: "処方管理", value: 85, color: "#3b82f6" },
            { label: "決済", value: 85, color: "#3b82f6" },
            { label: "LINE連携", value: 20, color: "#94a3b8" },
            { label: "患者CRM", value: 40, color: "#94a3b8" },
            { label: "配送管理", value: 30, color: "#94a3b8" },
          ]}
          unit="%"
        />

        <p>CLINICSの強みは「電子カルテとの一体化」と「ビデオ診察の安定性」ですが、<strong>LINE連携や患者CRM・配送管理の機能は限定的</strong>です。対面診療がメインで、オンライン診療を補助的に活用するクリニックに適しています。</p>
      </section>

      {/* ── セクション3: curon ── */}
      <section>
        <h2 id="curon" className="text-xl font-bold text-gray-800">curon（クロン） — MICIN社の手軽なオンライン診療</h2>

        <p>curonは、医療AIスタートアップMICINが提供するオンライン診療プラットフォームです。<strong>シンプルさと導入しやすさ</strong>を最大の特徴とし、ITに不慣れなクリニックでもスムーズに導入できる設計になっています。特に小規模クリニックや、初めてオンライン診療を導入するクリニックからの支持が高いサービスです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">curonの主な特徴</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>導入ハードルの低さ</strong> — 医療機関側は初期費用無料で即日導入可能。専用機器不要で、既存のPC・タブレットで利用開始できる</li>
          <li><strong>シンプルな操作画面</strong> — 必要最小限の機能に絞った設計で、スタッフの教育コストが低い</li>
          <li><strong>処方薬配送連携</strong> — curonお薬サポートにより、処方薬の自宅配送に対応。薬局との連携が容易</li>
          <li><strong>患者の利便性</strong> — 患者はアプリまたはWebブラウザから利用可能。会員登録もシンプル</li>
          <li><strong>サポート体制</strong> — 導入時の設定代行サポートあり。初めてのオンライン診療でも安心して始められる</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">費用</h3>
        <ComparisonTable
          headers={["項目", "内容"]}
          rows={[
            ["初期費用", "無料"],
            ["月額費用", "無料〜（有料プランは要問い合わせ）"],
            ["従量課金", "オンライン診察1件あたり330円（税込）を患者が負担"],
            ["薬配送", "curonお薬サポート利用時は別途費用"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">curonの注意点</h3>
        <p>curonは導入コストの低さが魅力ですが、いくつかの制約があります。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>LINE連携が非対応</strong> — 予約や通知はcuronアプリ内で完結するため、LINE経由の集患やフォローアップは別途対応が必要</li>
          <li><strong>患者CRM機能が限定的</strong> — セグメント配信やリピート促進のための自動メッセージ機能は搭載されていない</li>
          <li><strong>カスタマイズ性</strong> — シンプルさの裏返しとして、問診の条件分岐やワークフローのカスタマイズには制約がある</li>
          <li><strong>従量課金モデル</strong> — 患者側が1回あたりの利用料を負担するため、患者体験に影響する可能性がある</li>
        </ul>

        <p>curonは「まずオンライン診療を試してみたい」という小規模クリニックに最適ですが、患者数が増え、LINE連携やCRMが必要になるフェーズでは機能面の制約が顕在化してきます。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: Lオペ for CLINIC ── */}
      <section>
        <h2 id="lope" className="text-xl font-bold text-gray-800">Lオペ for CLINIC — LINE完結型のクリニック特化プラットフォーム</h2>

        <p>Lオペ for CLINICは、<strong>LINE公式アカウントを基盤としたクリニック特化型のオンライン診療・運営プラットフォーム</strong>です。予約・問診・診察・処方管理・配送管理・患者CRM・セグメント配信・AI返信までをオールインワンで提供し、<strong>患者がLINEだけで全ての体験を完結できる</strong>点が最大の差別化ポイントです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Lオペの主な特徴</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>LINE完結の患者体験</strong> — 友だち追加から予約・問診・決済・診察・処方通知・配送追跡まで、患者はアプリのダウンロードやアカウント作成が一切不要。日常的に使っているLINEだけで完結する</li>
          <li><strong>高度な問診システム</strong> — 診療科ごとのテンプレート、条件分岐ロジック、画像添付対応。問診回答はそのまま簡易カルテに反映され、診察前の情報収集を効率化</li>
          <li><strong>配送管理の自動化</strong> — 処方後の配送手配・追跡番号の登録・患者への発送通知をLINE Flex Messageで自動送信。配送ステータスがダッシュボードで一元管理できる</li>
          <li><strong>患者CRM・セグメント配信</strong> — 来院履歴・処方内容・最終来院日などの条件でセグメントを作成し、リピート促進メッセージを自動配信。離脱防止のフォローアップも自動化</li>
          <li><strong>AI自動返信</strong> — 患者からのLINEメッセージに対し、ナレッジベースとAI自動学習で自動応答。スタッフの問い合わせ対応工数を大幅に削減</li>
          <li><strong>ダッシュボード・KPI管理</strong> — 予約数・売上・友だち数・メッセージ配信数・リピート率などの主要KPIをリアルタイムで可視化</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">費用</h3>
        <ComparisonTable
          headers={["項目", "内容"]}
          rows={[
            ["初期費用", "要問い合わせ"],
            ["月額費用", "10万円〜18万円（機能・規模に応じたプラン）"],
            ["従量課金", "なし（月額固定）"],
            ["LINE公式アカウント", "別途LINE社の配信プラン費用が必要"],
          ]}
        />

        <p>Lオペの月額費用は10〜18万円と他のプラットフォームに比べて高く見えますが、<strong>予約システム・問診システム・配送管理・CRM・配信ツール・AI返信を個別に導入した場合の合計コスト（月額20〜35万円）</strong>と比較すると、オールインワンの費用対効果は非常に高くなります。</p>

        <BarChart
          data={[
            { label: "個別SaaS合計", value: 35, color: "#ef4444" },
            { label: "Lオペ（上位プラン）", value: 18, color: "#22c55e" },
            { label: "Lオペ（標準プラン）", value: 10, color: "#22c55e" },
          ]}
          unit="万円/月"
        />

        <Callout type="point" title="LINE連携が「集患」と「定着」の両方に効く理由">
          オンライン診療は集患がボトルネックになりやすいですが、Lオペなら<strong>LINE広告→友だち追加→予約→診察→処方→フォロー</strong>を一気通貫で完結できます。患者の離脱ポイント（アプリDL、アカウント登録、決済画面遷移）を排除することで、<strong>予約完了率が従来比1.8倍</strong>に向上した事例もあります。Lステップなど汎用LINE配信ツールとの違いについては<Link href="/clinic/column/lstep-vs-clinic-tool" className="text-blue-600 underline">Lステップ vs クリニック専用ツール比較</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── セクション5: 3サービス徹底比較 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">3サービス徹底比較 — 15項目で見る機能・費用の違い</h2>

        <p>ここまで紹介した3つのプラットフォームを、オンライン診療で重要な<strong>15項目</strong>で一覧比較します。それぞれの強み・弱みが一目で分かるよう整理しました。</p>

        <ComparisonTable
          headers={["比較項目", "CLINICS", "curon", "Lオペ for CLINIC"]}
          rows={[
            ["LINE連携", "非対応", "非対応", "完全対応（LINE完結）"],
            ["予約管理", "アプリ内予約・Web予約", "アプリ内予約", "LINE予約・Web予約"],
            ["問診", "標準テンプレート", "シンプルな問診", "条件分岐・画像添付対応"],
            ["ビデオ診察", "独自WebRTC（高品質）", "アプリ内通話", "LINE通話 / 外部連携"],
            ["処方管理", "処方箋FAX・郵送", "curonお薬サポート", "処方〜配送一元管理"],
            ["配送管理", "非対応（外部連携）", "薬局経由", "配送手配・追跡・通知自動化"],
            ["患者CRM", "基本的な患者管理", "なし", "来院履歴・処方履歴ベースCRM"],
            ["セグメント配信", "非対応", "非対応", "条件別自動配信"],
            ["AI返信", "非対応", "非対応", "AI自動学習型応答"],
            ["決済", "クレジットカード", "クレジットカード", "クレジットカード"],
            ["リッチメニュー", "非対応", "非対応", "LINE公式と連動"],
            ["ダッシュボード", "基本的な統計", "簡易レポート", "KPIリアルタイム可視化"],
            ["初期費用", "要問い合わせ", "無料", "要問い合わせ"],
            ["月額費用", "1.3万〜4万円", "無料〜", "10万〜18万円"],
            ["サポート", "電話・メール", "メール・チャット", "専任サポート"],
          ]}
        />

        <p>比較表から明確に見えるのは、各プラットフォームの<strong>設計思想の違い</strong>です。CLINICSは「電子カルテ中心の対面+オンライン統合」、curonは「低コスト・シンプルなオンライン診療導入」、そしてLオペは「LINE中心のオンライン診療+患者CRM+マーケティング統合」をそれぞれ志向しています。</p>

        <p>特筆すべきは<strong>LINE連携・患者CRM・セグメント配信・AI返信・配送管理</strong>の5項目で、Lオペだけが対応している点です。これらは「診察する」という基本機能の先にある「集患し、リピートさせ、運営を効率化する」ための機能であり、オンライン診療で持続的に収益を上げるための要となります。</p>
      </section>

      {/* ── セクション6: クリニック別おすすめ ── */}
      <section>
        <h2 id="use-cases" className="text-xl font-bold text-gray-800">クリニック別のおすすめプラットフォーム</h2>

        <p>3つのプラットフォームは、それぞれ異なるクリニックの状況に適しています。自院のフェーズと診療スタイルに合わせた選択が重要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">対面診療メインで、オンラインを補助的に活用したいクリニック</h3>
        <p><strong>おすすめ: CLINICS</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>すでにCLINICSカルテを導入しているか、電子カルテの統合を重視するケース</li>
          <li>対面診療が中心で、再診や慢性疾患のフォローアップにオンラインを活用したいケース</li>
          <li>ビデオ診察の品質・安定性を最優先するケース</li>
          <li>大規模病院やクリニックグループでの導入を検討しているケース</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">まずは低コストでオンライン診療を試したい小規模クリニック</h3>
        <p><strong>おすすめ: curon</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>初期費用ゼロで、月額費用も抑えたい開業直後のクリニック</li>
          <li>ITスキルに不安があり、とにかくシンプルに始めたいケース</li>
          <li>月間オンライン診察件数が少なく（〜50件/月）、まずは需要を見極めたいケース</li>
          <li>処方薬の配送が不要、または薬局受け取りが中心のケース</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">オンライン診療を収益の柱にしたい、LINE集患を活用したいクリニック</h3>
        <p><strong>おすすめ: Lオペ for CLINIC</strong></p>
        <ul className="list-disc pl-6 space-y-1">
          <li>オンライン専業、またはオンライン診療の売上比率を高めたいクリニック</li>
          <li>AGA・美容皮膚科・ダイエット外来など、自費オンライン診療が中心のケース</li>
          <li>LINE広告やSNSからの集患に注力し、そのままLINE上で予約・診察まで完結させたいケース</li>
          <li>処方薬の自宅配送が多く、配送管理の自動化が必要なケース</li>
          <li>患者のリピート率向上とLTV最大化を重視するケース</li>
        </ul>

        <ComparisonTable
          headers={["クリニック像", "おすすめ", "理由"]}
          rows={[
            ["対面+オンライン両立型", "CLINICS", "電子カルテ一体化で対面・オンラインの統合管理"],
            ["低コスト試験導入型", "curon", "初期費用ゼロ・月額無料で最小リスクで開始"],
            ["オンライン専業・LINE集患型", "Lオペ", "LINE完結の患者体験+CRM+配送管理で収益最大化"],
            ["自費診療（AGA・美容）中心", "Lオペ", "LINE経由の集患→リピート定着の仕組みが強力"],
            ["複数院展開の大規模グループ", "CLINICS", "カルテ統合・導入実績・サポート体制の信頼性"],
            ["開業初年度の個人院", "curon→Lオペ", "curonで検証後、成長フェーズでLオペに乗り換え"],
          ]}
        />

        <p>予約システムの詳細な比較については<Link href="/clinic/column/reservation-system-comparison" className="text-blue-600 underline">クリニック予約システム比較10選</Link>もご参照ください。</p>
      </section>

      {/* ── セクション7: 乗り換え時の注意点 ── */}
      <section>
        <h2 id="migration" className="text-xl font-bold text-gray-800">プラットフォーム乗り換え時の注意点</h2>

        <p>すでに他のプラットフォームでオンライン診療を運用している場合、乗り換え時に注意すべきポイントがあります。データ移行と患者への通知を計画的に行うことで、スムーズな移行が可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">乗り換えの5ステップ</h3>

        <FlowSteps steps={[
          { title: "移行先の選定・契約", desc: "トライアル期間を活用して、実際の操作感と機能を検証する。スタッフへのデモを実施し、現場の意見を反映させる" },
          { title: "データ移行の準備", desc: "患者情報（氏名・連絡先・診療履歴）のエクスポート。CSVやAPI経由でのデータ移行が可能か事前に確認する" },
          { title: "並行運用期間の設定", desc: "旧プラットフォームと新プラットフォームを1〜2ヶ月間並行運用する。新規患者は新プラットフォームで受付し、既存患者は段階的に移行" },
          { title: "患者への通知・誘導", desc: "LINE・メール・院内掲示で移行の案内を行う。新しい予約方法を分かりやすく説明した案内を配信する" },
          { title: "旧プラットフォームの停止", desc: "全患者の移行完了を確認後、旧プラットフォームを停止。データのバックアップを忘れずに保管する" },
        ]} />

        <Callout type="point" title="Lオペへの移行はLINE友だち追加で完了">
          Lオペへの乗り換えの場合、患者にLINE公式アカウントの友だち追加をしてもらうだけで移行が完了します。専用アプリのダウンロードやアカウント再登録が不要なため、<strong>患者側の移行ハードルが極めて低い</strong>のが特徴です。データ移行の詳細な手順については<Link href="/clinic/column/clinic-data-migration" className="text-blue-600 underline">クリニックのデータ移行ガイド</Link>で解説しています。
        </Callout>
      </section>

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 自院に最適なプラットフォームの選び方</h2>

        <Callout type="success" title="プラットフォーム選定の結論">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>CLINICS</strong> — 電子カルテ一体型で、対面診療との統合を重視するクリニックに最適。ビデオ診察の品質と導入実績の安心感が魅力</li>
            <li><strong>curon</strong> — 初期費用ゼロで始められる手軽さが魅力。小規模クリニックの試験導入に最適だが、成長フェーズではCRM・LINE連携の不足が課題に</li>
            <li><strong>Lオペ for CLINIC</strong> — LINE完結の患者体験と、集患・CRM・配送管理・AI返信までカバーするオールインワンの機能が強み。オンライン診療を収益の柱にしたいクリニックに最適</li>
          </ul>
        </Callout>

        <p>オンライン診療プラットフォームの選定は、単なるシステム導入の判断ではなく、<strong>クリニックのビジネスモデルそのものを左右する戦略的な意思決定</strong>です。「どう診察するか」だけでなく、「どう集患し、どうリピートさせ、どう患者との関係を築くか」まで見据えた選択が、長期的な成功につながります。</p>

        <p>特にオンライン診療の比率を高めていくクリニックにとっては、<strong>LINE連携による集患力と患者CRMによる定着力</strong>が不可欠です。Lオペ for CLINICは、この両方をLINE上で実現するクリニック特化プラットフォームとして、オンライン診療の収益最大化を支援します。</p>

        <p>Lオペ for CLINICの全機能については<Link href="/clinic/column/lope-complete-introduction" className="text-blue-600 underline">Lオペ for CLINIC完全ガイド</Link>で詳しく解説しています。導入をご検討の方は、お気軽にお問い合わせください。</p>

        <InlineCTA />

        <div className="mt-6 space-y-2 text-sm text-gray-500">
          <p>関連記事:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><Link href="/clinic/column/online-clinic-complete-guide" className="text-blue-600 underline">オンライン診療完全ガイド — 開業・届出・システム選定・運用の全知識</Link></li>
            <li><Link href="/clinic/column/lstep-vs-clinic-tool" className="text-blue-600 underline">Lステップ vs クリニック専用ツール — LINE配信ツール選びの落とし穴</Link></li>
            <li><Link href="/clinic/column/reservation-system-comparison" className="text-blue-600 underline">クリニック予約システム比較10選 — LINE連携できるツールの選び方</Link></li>
            <li><Link href="/clinic/column/lope-complete-introduction" className="text-blue-600 underline">Lオペ for CLINIC完全ガイド — 全機能・費用・導入事例</Link></li>
          </ul>
        </div>
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
