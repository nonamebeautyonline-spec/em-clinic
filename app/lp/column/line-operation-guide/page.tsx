import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  FlowSteps,
  StatGrid,
  BarChart,
  DonutChart,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-operation-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE公式アカウントの運用にかかる費用は？", a: "LINE公式アカウント自体は無料で開設できます。メッセージ配信数に応じた従量課金（月額0〜15,000円程度）に加え、Lオペ for CLINICのようなクリニック専用ツールを利用する場合は月額数万円からです。広告費を含めても、チラシやWeb広告より費用対効果が高いケースがほとんどです。" },
  { q: "クリニックでLINE公式アカウントを始めるのに必要な準備は？", a: "必要なのはLINEビジネスIDの取得とアカウント開設（所要時間約10分）だけです。その後、プロフィール設定・あいさつメッセージ・リッチメニューを整え、院内にQRコードを掲示すれば基本的な運用を開始できます。認証済みアカウントの申請もおすすめです。" },
  { q: "LINE友だち数は何人から効果が出ますか？", a: "一般的に500人を超えるとセグメント配信の効果が実感しやすくなります。ただし、100人程度でも予約リマインドや問診の自動送信など、業務効率化の効果は十分に得られます。まずは来院患者への声かけで月100人の追加を目指しましょう。" },
  { q: "配信頻度はどのくらいが適切ですか？", a: "月2〜4回が目安です。週1回を超えるとブロック率が上がる傾向があります。ただし、予約リマインドや問診送信などの個別通知は配信頻度にカウントされないため、一斉配信の頻度を抑えつつ個別通知で利便性を高めるのが効果的です。" },
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
  "LINE公式アカウントの基本設定から高度な自動化まで、クリニック運用の全体像を把握できる",
  "友だち集め・セグメント配信・リッチメニュー・AI自動返信など各施策の要点と関連記事リンク",
  "運用代行と自社運用の判断基準、ブロック率を抑えるコツ",
];

const toc = [
  { id: "basic-setup", label: "LINE公式アカウントの基本設定" },
  { id: "friends-growth", label: "友だち集めの施策" },
  { id: "segment-delivery", label: "セグメント配信戦略" },
  { id: "rich-menu", label: "リッチメニュー設計" },
  { id: "ai-auto-reply", label: "AI自動返信の活用" },
  { id: "block-rate", label: "ブロック率を下げるコツ" },
  { id: "outsource-vs-inhouse", label: "運用代行 vs 自社運用" },
  { id: "ad-guideline", label: "医療広告ガイドラインとLINE運用" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE運用ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINE公式アカウントの月間利用者数は<strong>9,700万人以上</strong>（2024年時点）。メールの開封率が10〜20%に対し、LINEメッセージの開封率は<strong>約90%</strong>と圧倒的です。クリニックがLINE公式アカウントを最大限に活用するには、アカウント開設からセグメント配信、AI自動返信まで一貫した運用設計が欠かせません。本記事では、導入手順から友だち集め・セグメント配信・ブロック率対策・医療広告ガイドライン対応まで8つのテーマを体系的に解説します。
      </p>

      <StatGrid stats={[
        { value: "9,700", unit: "万人", label: "LINE月間利用者数" },
        { value: "90", unit: "%", label: "LINEメッセージ開封率" },
        { value: "86", unit: "%", label: "日本人口カバー率" },
      ]} />

      {/* ── 1. 基本設定 ── */}
      <section>
        <h2 id="basic-setup" className="text-xl font-bold text-gray-800">1. LINE公式アカウントの基本設定</h2>
        <p>クリニックがLINE公式アカウントを開設する際、まず押さえるべきは<strong>Messaging APIの有効化</strong>と<strong>プロフィールの最適化</strong>です。Messaging APIを有効にすることで、自動応答・セグメント配信・リッチメニューなど高度な機能が利用可能になります。</p>

        <FlowSteps steps={[
          { title: "LINE公式アカウントの開設", desc: "LINE Official Account Managerからアカウントを作成。クリニック名・住所・診療科目を正確に設定し、認証済みアカウントの申請を行う。" },
          { title: "Messaging APIの有効化", desc: "LINE Developersコンソールでチャネルを作成し、Webhookを設定。外部システムとの連携基盤を構築する。" },
          { title: "プロフィール・あいさつメッセージの設定", desc: "友だち追加時の第一印象を決めるあいさつメッセージを設定。クリニックの特徴と「何ができるか」を簡潔に伝える。" },
          { title: "院内QRコードの掲示", desc: "受付・待合室・診察室にQRコードを設置。来院患者にその場で友だち追加を促す導線を整備する。" },
        ]} />

        <Callout type="info" title="開業前からのLINE活用がおすすめ">
          開業前からLINE公式アカウントを開設し、事前に友だちを集めておけば開業初日から集患に活用できます。詳しくは<Link href="/lp/column/clinic-opening-line" className="text-emerald-700 underline">クリニック開業時のLINE活用ガイド</Link>をご覧ください。
        </Callout>
      </section>

      {/* ── 2. 友だち集め ── */}
      <section>
        <h2 id="friends-growth" className="text-xl font-bold text-gray-800">2. 友だち集めの施策</h2>
        <p>LINE運用の成果は友だち数に比例します。月100人ペースで増やすためには、院内導線とWeb導線を組み合わせた複数の施策が必要です。</p>

        <StatGrid stats={[
          { value: "100", unit: "人/月", label: "目標友だち追加数" },
          { value: "70", unit: "%", label: "院内での追加割合" },
          { value: "30", unit: "%", label: "Web経由の追加割合" },
        ]} />

        <p>主な施策には、受付での声かけ、待合室のポスター・ポップ、ホームページへのバナー設置、初回特典（待ち時間短縮・事前問診）の提供などがあります。施策ごとの効果検証と改善サイクルが重要です。</p>

        <Callout type="success" title="友だち集めの詳細はこちら">
          具体的な7つの施策と実践のポイントは<Link href="/lp/column/clinic-line-friends-growth" className="text-emerald-700 underline">クリニックのLINE友だち集め -- 月100人増やす7つの施策</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 3. セグメント配信 ── */}
      <section>
        <h2 id="segment-delivery" className="text-xl font-bold text-gray-800">3. セグメント配信戦略</h2>
        <p>友だちが集まったら次はセグメント配信です。一斉配信では「自分に関係ない情報」と感じた患者がブロックしてしまいます。来院履歴・診療科・年齢層・最終来院日などでセグメントを分け、<strong>患者ごとに最適なメッセージ</strong>を届けることがリピート率向上の鍵です。</p>

        <BarChart
          data={[
            { label: "セグメント配信", value: 85, color: "bg-emerald-500" },
            { label: "一斉配信", value: 65, color: "bg-gray-400" },
          ]}
          unit="% 開封率"
        />

        <p>例えば「3ヶ月以上再来院のない美容施術患者」に対して、パーソナライズされたリマインドを送ると再診率が20〜30%向上するケースもあります。</p>

        <Callout type="point" title="セグメント配信の詳細はこちら">
          5つのセグメント分類と効果を最大化するコツは<Link href="/lp/column/segment-delivery-repeat" className="text-emerald-700 underline">LINEセグメント配信でリピート率を向上させる方法</Link>で詳しく解説しています。
        </Callout>

        <InlineCTA />
      </section>

      {/* ── 4. リッチメニュー ── */}
      <section>
        <h2 id="rich-menu" className="text-xl font-bold text-gray-800">4. リッチメニュー設計</h2>
        <p>リッチメニューは、患者がLINEのトーク画面を開いたときに常に表示されるナビゲーションです。「予約する」「問診票を記入」「アクセス」など、<strong>患者が最もよく使うアクションをワンタップで実行</strong>できるよう設計することで、利便性と来院率の両方が向上します。</p>

        <ComparisonTable
          headers={["設計ポイント", "悪い例", "良い例"]}
          rows={[
            ["ボタン数", "8個以上で情報過多", "4〜6個に厳選"],
            ["ラベル", "英語表記・専門用語", "患者目線の日本語"],
            ["優先配置", "お知らせが左上", "予約・問診が左上"],
            ["デザイン", "テキストのみ", "アイコン+テキスト"],
          ]}
        />

        <p>リッチメニューは一度設定したら終わりではなく、タップ率のデータを分析して定期的に改善することが重要です。</p>

        <Callout type="success" title="リッチメニュー設計の詳細はこちら">
          患者導線を最適化する5つのポイントは<Link href="/lp/column/rich-menu-design" className="text-emerald-700 underline">クリニックのLINEリッチメニュー設計ガイド</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 5. AI自動返信 ── */}
      <section>
        <h2 id="ai-auto-reply" className="text-xl font-bold text-gray-800">5. AI自動返信の活用</h2>
        <p>患者からの問い合わせは診療時間外にも発生します。AI自動返信を導入すれば、<strong>24時間365日</strong>、よくある質問（診療時間・アクセス・予約方法・料金等）に即座に回答できます。スタッフの電話対応を大幅に削減しながら、患者の利便性を高められるのが最大のメリットです。</p>

        <StatGrid stats={[
          { value: "24", unit: "時間", label: "対応可能時間" },
          { value: "70", unit: "%減", label: "電話問い合わせ" },
          { value: "3", unit: "秒以内", label: "平均応答時間" },
        ]} />

        <p>AI自動返信は「回答できない質問」をスタッフにエスカレーションする仕組みを組み合わせることで、患者満足度を維持しつつ自動化率を最大化できます。</p>

        <Callout type="info" title="AI自動返信の導入方法はこちら">
          導入ステップと運用のコツは<Link href="/lp/column/ai-auto-reply-guide" className="text-emerald-700 underline">クリニックのAI自動返信導入ガイド</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 6. ブロック率 ── */}
      <section>
        <h2 id="block-rate" className="text-xl font-bold text-gray-800">6. ブロック率を下げるコツ</h2>
        <p>せっかく集めた友だちも、ブロックされてしまえば意味がありません。クリニックのLINE運用において、<strong>ブロック率を月1%以下に抑える</strong>ことが長期的な成功の鍵です。</p>

        <DonutChart percentage={95} label="目標: ブロックされない率" sublabel="月間ブロック率1%以下を維持" />

        <Callout type="warning" title="ブロックされる主な原因">
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>配信頻度が多すぎる（週2回以上は要注意）</li>
            <li>自分に関係のない情報が届く（一斉配信の弊害）</li>
            <li>営業色が強すぎるメッセージ</li>
            <li>配信のタイミングが悪い（深夜・早朝の送信）</li>
          </ul>
        </Callout>

        <p>ブロック率対策は配信頻度・内容・タイミングの3つの観点から総合的に取り組む必要があります。</p>

        <Callout type="success" title="ブロック率対策の詳細はこちら">
          5つの鉄則は<Link href="/lp/column/line-block-rate-reduction" className="text-emerald-700 underline">LINE配信で患者に嫌われない -- ブロック率を下げる5つの鉄則</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 7. 運用代行 vs 自社運用 ── */}
      <section>
        <h2 id="outsource-vs-inhouse" className="text-xl font-bold text-gray-800">7. 運用代行 vs 自社運用の選択</h2>
        <p>LINE公式アカウントの運用を外部に委託するか、自社で行うかは多くのクリニックが悩むポイントです。判断基準は<strong>クリニックの規模・スタッフのリソース・予算</strong>の3つです。</p>

        <ComparisonTable
          headers={["比較項目", "運用代行", "自社運用"]}
          rows={[
            ["月額コスト", "10〜30万円", "ツール費用のみ"],
            ["立ち上げ速度", "即日〜1週間", "2週間〜1ヶ月"],
            ["ノウハウ蓄積", "外部に依存", "社内に蓄積"],
            ["柔軟性", "変更に時間がかかる", "即座に対応可能"],
            ["おすすめ規模", "開業直後・小規模", "中〜大規模"],
          ]}
        />

        <p>最初は運用代行で立ち上げ、ノウハウを学んでから自社運用に移行するハイブリッド型も有効な選択肢です。</p>

        <Callout type="point" title="運用代行と自社運用の詳細比較はこちら">
          規模別の最適な判断基準は<Link href="/lp/column/line-operation-outsource-vs-inhouse" className="text-emerald-700 underline">LINE運用代行 vs 自社運用 -- どちらが正解？</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 8. 医療広告ガイドライン ── */}
      <section>
        <h2 id="ad-guideline" className="text-xl font-bold text-gray-800">8. 医療広告ガイドラインとLINE運用</h2>
        <p>クリニックがLINE公式アカウントで情報発信する際は、<strong>医療広告ガイドライン</strong>への準拠が必須です。2018年の改正医療法により、Webサイトやソーシャルメディアも広告規制の対象となりました。LINE上のメッセージ配信やリッチメニューも例外ではありません。</p>

        <Callout type="warning" title="LINE配信で注意すべき医療広告ガイドラインのポイント">
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>ビフォーアフター写真</strong>: 一斉配信での使用は原則禁止。患者本人への経過報告（個別送信）は広告に該当しない</li>
            <li><strong>体験談・口コミの引用</strong>: 「痩せました」「効果ありました」等の体験談を広告として配信するのはNG</li>
            <li><strong>誇大表現の禁止</strong>: 「必ず治る」「最高の技術」「日本一」等の表現は使用不可</li>
            <li><strong>未承認医薬品の広告制限</strong>: 自費診療の薬剤についてはリスク・副作用を明示する必要がある</li>
            <li><strong>限定解除要件</strong>: 自費診療の費用・治療内容・リスクを記載すれば、一定の広告表現が可能になる</li>
          </ul>
        </Callout>

        <p>ただし、<strong>個別の患者に対する1対1のメッセージ</strong>（予約確認・フォローアップ・問診送信等）は広告規制の対象外です。セグメント配信であっても、不特定多数への一斉配信は広告に該当する可能性があるため、内容には十分注意しましょう。</p>

        <p>不安な場合は、各地方厚生局の医療広告相談窓口に事前確認することをおすすめします。Lオペ for CLINICでは、医療広告ガイドラインに配慮した配信テンプレートを標準で用意しています。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: LINE運用は「設計」が9割</h2>
        <p>クリニックのLINE公式アカウント運用は、場当たり的に始めても成果が出ません。<strong>基本設定 → 友だち集め → セグメント配信 → リッチメニュー → AI自動返信 → ブロック率対策</strong>という流れで段階的に設計・実行していくことが成功の鍵です。</p>

        <p>本ガイドで紹介した各テーマの詳細記事と合わせて、自院に合った運用プランを組み立ててみてください。LINE活用と合わせてクリニック全体のDXを進めたい方は、<Link href="/lp/column/clinic-dx-complete-guide" className="text-emerald-700 underline">クリニックDX完全ガイド</Link>も参考になります。また、LINE活用の具体的な成功事例は<Link href="/lp/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link>でご確認いただけます。</p>

        <p>Lオペ for CLINICは、本ガイドで解説したすべての機能をワンストップで提供するクリニック専用プラットフォームです。友だち管理・セグメント配信・リッチメニュー・AI自動返信・予約連携まで、LINE運用に必要な機能がすべて揃っています。</p>
      </section>

      {/* ── FAQ ── */}
      <section>
        <h2 className="text-xl font-bold text-gray-800">よくある質問</h2>
        <div className="mt-4 space-y-3">
          {faqItems.map((item) => (
            <details key={item.q} className="group rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-gray-800 select-none">
                {item.q}
                <span className="shrink-0 text-slate-400 transition group-open:rotate-180">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </summary>
              <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-gray-600">{item.a}</div>
            </details>
          ))}
        </div>
      </section>
    </ArticleLayout>
  );
}
