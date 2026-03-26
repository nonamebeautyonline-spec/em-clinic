import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-block-rate-reduction")!;

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
  "LINE配信のブロック率業界平均とクリニック経営への影響",
  "ブロック率を下げるための5つの鉄則と具体的な施策",
  "ブロック率5%から0.8%に改善した実際の事例",
];

const toc = [
  { id: "block-rate-impact", label: "ブロック率の業界平均と影響" },
  { id: "rule-1", label: "鉄則1: 配信頻度は月2〜4回" },
  { id: "rule-2", label: "鉄則2: セグメント活用で関連情報だけ送る" },
  { id: "rule-3", label: "鉄則3: 有益なコンテンツを混ぜる" },
  { id: "rule-4", label: "鉄則4: 配信時間帯を最適化" },
  { id: "rule-5", label: "鉄則5: ブロック分析とPDCA" },
  { id: "case-study", label: "ブロック率5%→0.8%の事例" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ブロック率対策" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックのLINEブロック率を下げるには、配信頻度を<strong>月2〜4回</strong>に抑える・セグメント配信で関連情報だけ送る・有益なコンテンツを混ぜる・配信時間帯を最適化する・ブロック分析でPDCAを回すの<strong>5つの鉄則</strong>が効果的です。本記事では、ブロック率<strong>5%から0.8%</strong>に改善した実際の事例と施策を紹介します。
      </p>

      {/* SEO用セマンティックリスト — Featured Snippet対策 */}
      <ol className="list-decimal pl-6 space-y-1 text-[14px] text-gray-700">
        <li>配信頻度は月2〜4回がベスト</li>
        <li>患者に関係のある情報だけ送る（セグメント活用）</li>
        <li>有益なコンテンツを混ぜる（健康Tips・季節の健康情報）</li>
        <li>配信時間帯を最適化（18〜20時がゴールデンタイム）</li>
        <li>ブロック分析を行い改善PDCAを回す</li>
      </ol>

      <section>
        <h2 id="block-rate-impact" className="text-xl font-bold text-gray-800">ブロック率の業界平均とクリニック経営への影響</h2>
        <p>LINE公式アカウントにおけるブロック率とは、友だち登録した後にブロックされた割合のことです。業界全体の平均ブロック率は<strong>20〜30%</strong>と言われていますが、クリニックの場合は配信内容の工夫次第で<strong>5%以下</strong>に抑えることが可能です。</p>

        <BarChart
          data={[
            { label: "業界平均", value: 25, color: "#ef4444" },
            { label: "クリニック平均", value: 10, color: "#f59e0b" },
            { label: "最適化済みクリニック", value: 3, color: "#22c55e" },
          ]}
          unit="%"
        />

        <Callout type="warning" title="ブロック率がもたらす機会損失">
          友だち数1,000人のクリニックでブロック率が10%上がると有効な配達数が100件減少し、月5件の予約を失います。1件あたりの平均診療単価が1万円なら、年間で60万円の機会損失です。さらに深刻なのは、ブロックされるとその患者との接点が完全に断たれる点です。
        </Callout>

        <StatGrid stats={[
          { value: "60", unit: "万円", label: "年間の機会損失（ブロック率10%増で）" },
          { value: "0%", label: "ブロック後のリーチ率" },
        ]} />
      </section>

      <section>
        <h2 id="rule-1" className="text-xl font-bold text-gray-800">鉄則1: 配信頻度は月2〜4回がベスト</h2>
        <p>ブロックの最大の原因は「配信が多すぎる」ことです。LINE公式アカウントの調査によると、ブロック理由の第1位は<strong>「通知が多い」</strong>で、全体の約50%を占めています。</p>

        <DonutChart percentage={50} label="ブロック理由第1位" sublabel="「通知が多い」" />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">頻度別のブロック率と反応率</h3>

        <ComparisonTable
          headers={["配信頻度", "ブロック率", "開封率", "評価"]}
          rows={[
            ["月1回以下", "低い", "低下傾向", "存在を忘れられやすい"],
            ["月2〜4回", "1〜3%", "60〜80%", "最も費用対効果が高い"],
            ["週2回以上", "10%超", "低下", "ブロック急上昇リスク"],
          ]}
        />

        <Callout type="point" title="個別自動配信はカウント外">
          月2〜4回はあくまで「一斉配信」の回数です。予約リマインドやアフターフォローなどの個別自動配信は含めません。患者が「自分宛の連絡」と認識するメッセージは、頻度が多くてもブロックに繋がりにくい傾向があります。
        </Callout>
      </section>

      <section>
        <h2 id="rule-2" className="text-xl font-bold text-gray-800">鉄則2: 患者に関係のある情報だけ送る — セグメント活用</h2>
        <p>ブロック理由の第2位は「自分に関係のない情報が送られてくる」です。この問題を解決するのが<strong>セグメント配信</strong>です。セグメント配信の具体的な設計手法やリピート率向上の事例は<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">LINEセグメント配信でリピート率を向上</Link>で詳しく解説しています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">効果的なセグメント例</h3>

        <ComparisonTable
          headers={["セグメント軸", "分類例", "配信内容"]}
          rows={[
            ["診療科目別", "内科・皮膚科・美容", "受診科目に基づいた情報"],
            ["最終来院日別", "1ヶ月以内 / 3ヶ月以上", "来院状況に応じたメッセージ"],
            ["年齢・性別", "世代別", "世代に合わせた施術案内"],
            ["施術履歴別", "過去の施術タイプ", "フォローアップ・関連施術提案"],
            ["興味関心", "タップ履歴から推測", "関心分野に基づく配信"],
          ]}
        />

        <Callout type="success" title="セグメント配信の効果">
          一斉配信と比較して開封率が1.5倍、クリック率が2倍に向上。「自分に必要な情報が届く」と患者が感じれば、ブロックどころかLINEを開くのが楽しみになります。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="rule-3" className="text-xl font-bold text-gray-800">鉄則3: 有益なコンテンツを混ぜる — 健康Tips・季節の健康情報</h2>

        <Callout type="warning" title="売り込みばかりはNG">
          配信内容が「キャンペーン告知」「予約の催促」ばかりでは、患者は「売り込み」と感じてブロックします。有益な情報コンテンツを織り交ぜましょう。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">有益コンテンツの例</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>季節の健康情報</strong> — 花粉症対策（2〜3月）、熱中症予防（7〜8月）、インフルエンザ予防（11〜12月）</li>
          <li><strong>セルフケアTips</strong> — 自宅でできるスキンケア方法、正しい薬の飲み方、ストレッチ方法</li>
          <li><strong>医師のコラム</strong> — よくある質問への回答、新しい治療法の解説、学会報告のダイジェスト</li>
          <li><strong>院内情報</strong> — 新しい機器の導入、スタッフ紹介、休診日のお知らせ</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">理想的な月4回配信のバランス</h3>

        <BarChart
          data={[
            { label: "有益コンテンツ", value: 2, color: "#22c55e" },
            { label: "クリニック情報", value: 1, color: "#3b82f6" },
            { label: "リマインド系", value: 1, color: "#8b5cf6" },
          ]}
          unit="回/月"
        />

        <Callout type="point" title="配信比率の鉄則">
          売り込み:有益情報の比率を1:2以上に保つことが、長期的な信頼関係構築のコツです。
        </Callout>
      </section>

      <section>
        <h2 id="rule-4" className="text-xl font-bold text-gray-800">鉄則4: 配信時間帯を最適化 — 18〜20時がゴールデンタイム</h2>
        <p>同じ内容の配信でも、送信時間帯によって開封率が大きく変わります。開封率が低い=通知だけ見てスルーされる=「意味のないメッセージ」と認識される=ブロック、という悪循環に陥ります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">クリニックの配信に最適な時間帯</h3>

        <ComparisonTable
          headers={["時間帯", "適性", "特徴"]}
          rows={[
            ["18:00〜20:00", true, "ゴールデンタイム。仕事終わりで開封率最高"],
            ["12:00〜13:00", true, "ランチタイム。短い内容向き"],
            ["8:00〜9:00", true, "通勤時間帯。テキスト中心の配信向き"],
            ["22時以降", false, "就寝前の通知は不快。ブロック率上昇リスク"],
            ["7時以前", false, "早朝の営業メッセージは印象が悪い"],
            ["9〜17時", false, "仕事中で開封されにくく通知が溜まる"],
          ]}
        />

        <Callout type="point" title="患者層に合わせた最適化を">
          主婦層が多いクリニックでは10時台の開封率が高い場合もあります。配信レポートを分析し、自院の患者に合った時間帯を見つけることが重要です。
        </Callout>
      </section>

      <section>
        <h2 id="rule-5" className="text-xl font-bold text-gray-800">鉄則5: ブロック分析を行い改善PDCAを回す</h2>
        <p>ブロック率を下げるためには、「なぜブロックされたのか」を分析し、継続的に改善する仕組みが必要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ブロック分析で見るべき指標</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>配信別ブロック数</strong> — どの配信の後にブロックが増えたかを特定</li>
          <li><strong>友だち追加後のブロックタイミング</strong> — 追加直後か一定期間後かを判別</li>
          <li><strong>セグメント別ブロック率</strong> — どの属性の患者がブロックしやすいかを分析</li>
          <li><strong>配信頻度とブロック率の相関</strong> — 配信回数を増やした月にブロック率が上がっていないかを確認</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">改善PDCAの回し方</h3>

        <FlowSteps steps={[
          { title: "Plan（仮説立案）", desc: "ブロック分析の結果から仮説を立てる（例: キャンペーン告知の翌日にブロックが増えている）" },
          { title: "Do（施策実行）", desc: "改善施策を実行（例: キャンペーン告知に健康情報を組み合わせて配信）" },
          { title: "Check（効果計測）", desc: "改善後のブロック率を計測。改善前と比較" },
          { title: "Act（標準化）", desc: "効果があれば標準化、なければ別の仮説を試す" },
        ]} />

        <Callout type="point" title="モニタリング体制が鍵">
          ブロック率を定期的にモニタリングする仕組みを作りましょう。ダッシュボードで週次・月次のブロック率推移を可視化し、異常があればすぐに原因を特定できる体制を整えることが重要です。
        </Callout>
      </section>

      <section>
        <h2 id="case-study" className="text-xl font-bold text-gray-800">ブロック率を5%から0.8%に改善した事例</h2>
        <p>ある皮膚科クリニック（友だち数3,200人）の事例をご紹介します。他のクリニックの成功事例は<Link href="/lp/column/clinic-line-case-studies" className="text-sky-600 underline hover:text-sky-800">クリニックのLINE公式アカウント活用事例5選</Link>でも紹介しています。LINE公式アカウント開設当初は一斉配信を週2回行っており、ブロック率は<strong>5%</strong>に達していました。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">実施した改善施策</h3>

        <FlowSteps steps={[
          { title: "配信頻度を月3回に削減", desc: "週2回から月3回に変更。1回あたりの内容を充実させた" },
          { title: "セグメント配信を導入", desc: "皮膚科・美容皮膚科・アレルギー科の3セグメントに分け、関連情報のみを配信" },
          { title: "有益コンテンツの比率を向上", desc: "月3回のうち2回をスキンケア情報・季節の肌トラブル対策に。売り込みは月1回のみ" },
          { title: "配信時間を19時に統一", desc: "過去のデータから開封率が最も高い時間帯を特定" },
          { title: "月次のブロック分析を開始", desc: "配信ごとのブロック数を計測し、問題のある配信パターンを改善" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">改善結果</h3>

        <ResultCard before="5%" after="0.8%" metric="ブロック率" description="3ヶ月間の改善施策で大幅改善" />

        <ResultCard before="月30件" after="月45件" metric="LINE経由の予約数" description="配信回数は減ったが、質の向上で1回あたりの配信効果が大幅に向上" />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: ブロック率を下げる5つの鉄則</h2>
        <p>クリニックのLINE配信でブロック率を下げるためのポイントを改めて整理します。</p>

        <StatGrid stats={[
          { value: "月2〜4回", label: "最適な配信頻度" },
          { value: "1:2+", label: "売り込み:有益情報の比率" },
          { value: "18〜20時", label: "ゴールデンタイム" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>配信頻度は月2〜4回</strong> — 多すぎず少なすぎない頻度で接点を維持</li>
          <li><strong>セグメント配信で関連情報だけ送る</strong> — 全員一斉ではなく、患者に合った情報を届ける</li>
          <li><strong>有益コンテンツを織り交ぜる</strong> — 売り込みばかりではブロックされる。情報提供で価値を感じてもらう</li>
          <li><strong>配信時間帯を最適化</strong> — 18〜20時のゴールデンタイムを活用し、開封率を最大化</li>
          <li><strong>ブロック分析でPDCAを回す</strong> — データに基づいた改善を継続し、ブロック率を最小化</li>
        </ol>
        <p className="mt-4">Lオペ for CLINICなら、<Link href="/lp/features#メッセージ配信" className="text-sky-600 underline hover:text-sky-800">セグメント配信</Link>・配信スケジュール管理・<Link href="/lp/features#分析・レポート" className="text-sky-600 underline hover:text-sky-800">ブロック率分析ダッシュボード</Link>までオールインワンで提供。患者に嫌われない配信運用を、すぐに始められます。ブロック率を含むクリニック経営のKPI管理については<Link href="/lp/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">KPI7選</Link>も参考にしてください。</p>
      </section>
    </ArticleLayout>
  );
}
