import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-clinic-marketing-guide")!;

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
  datePublished: self.date,
  dateModified: self.updatedDate || self.date,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "SEO・リスティング広告・SNS・LINE・MEOなど主要チャネル別の集患戦略を網羅的に解説",
  "チャネル別CPA（患者獲得コスト）比較で費用対効果の高い施策を明確化",
  "医療広告ガイドライン・薬機法を遵守しながら効果的に集患する具体的な方法を紹介",
];

const toc = [
  { id: "marketing-overview", label: "オンライン診療の集患が難しい理由" },
  { id: "seo-strategy", label: "SEO対策 — 医療系コンテンツマーケティングとE-E-A-T" },
  { id: "listing-ads", label: "リスティング広告 — Google・Yahoo!広告の運用" },
  { id: "sns-marketing", label: "SNSマーケティング — Instagram・X・TikTok活用" },
  { id: "line-acquisition", label: "LINE公式アカウントを活用した集患戦略" },
  { id: "review-meo", label: "口コミ対策・MEO — Googleビジネスプロフィール最適化" },
  { id: "cpa-comparison", label: "チャネル別CPA比較と予算配分の最適解" },
  { id: "compliance", label: "医療広告ガイドライン・薬機法の遵守ポイント" },
  { id: "roadmap", label: "初期集患から安定期までのロードマップ" },
  { id: "lope-retention", label: "Lオペで実現するリピート戦略" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleLayout slug={self.slug} breadcrumbLabel="オンライン診療の集患・マーケティング完全ガイド" keyPoints={keyPoints} toc={toc}>

        <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
          オンライン診療クリニックの集患は、対面クリニックとは異なる戦略が求められます。本記事では、<strong>SEO・リスティング広告・SNS・LINE・MEO・口コミ</strong>の各チャネルを横断的にカバーし、<strong>医療広告ガイドライン・薬機法を遵守</strong>しながら効率的に患者を獲得する方法を解説します。チャネル別のCPA比較や、開業初期から安定期までの実践的なロードマップも紹介します。
        </p>

        {/* ── セクション1: オンライン診療の集患が難しい理由 ── */}
        <section>
          <h2 id="marketing-overview" className="text-xl font-bold text-gray-800">オンライン診療の集患が難しい理由</h2>

          <p>オンライン診療は2020年以降に急速に普及しましたが、集患においては対面クリニックとは異なる独自の課題を抱えています。商圏が全国に広がる反面、競合も全国規模となるため、<strong>マーケティング戦略の巧拙が経営を直接左右</strong>します。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">オンライン診療クリニックが直面する3つの課題</h3>

          <Callout type="point" title="集患の3大課題">
            <ol className="mt-2 space-y-2 list-decimal pl-4">
              <li><strong>認知獲得の難しさ</strong> — 物理的な看板や立地による集患ができないため、Web上での認知獲得が不可欠</li>
              <li><strong>信頼構築のハードル</strong> — 対面で医師の顔が見えないオンライン診療は、患者が「本当に大丈夫か」と不安を感じやすい</li>
              <li><strong>広告規制の厳しさ</strong> — 医療広告ガイドラインと薬機法により、訴求できる表現に制約がある</li>
            </ol>
          </Callout>

          <p>これらの課題を乗り越えるには、<strong>複数チャネルを組み合わせた統合的なマーケティング戦略</strong>が必要です。1つのチャネルに依存するのではなく、SEO・広告・SNS・LINEを有機的に連携させることで、安定的な集患基盤を構築できます。</p>

          <StatGrid stats={[
            { value: "47", unit: "%", label: "オンライン診療経験率（2025年）" },
            { value: "3.2", unit: "倍", label: "2020年比の市場成長率" },
            { value: "72", unit: "%", label: "「Web検索から受診」の割合" },
          ]} />

          <p>以下では、各チャネルの具体的な戦略と運用方法を順に解説していきます。</p>
        </section>

        {/* ── セクション2: SEO対策 ── */}
        <section>
          <h2 id="seo-strategy" className="text-xl font-bold text-gray-800">SEO対策 — 医療系コンテンツマーケティングとE-E-A-T</h2>

          <p>オンライン診療の集患において、<strong>SEO（検索エンジン最適化）は最も費用対効果の高い中長期施策</strong>です。「オンライン診療 AGA」「ピル オンライン処方」などの検索キーワードで上位表示できれば、広告費ゼロで継続的に新規患者を獲得できます。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">医療系SEOで重要なE-E-A-T対策</h3>

          <p>Googleは医療・健康に関するコンテンツを<strong>YMYL（Your Money or Your Life）</strong>領域と分類し、特に厳しい品質基準を適用しています。上位表示には<strong>E-E-A-T（経験・専門性・権威性・信頼性）</strong>の証明が不可欠です。</p>

          <FlowSteps steps={[
            { title: "経験（Experience）の証明", desc: "医師が実際の診療経験に基づいて記事を執筆。症例数や治療実績を具体的に記載する" },
            { title: "専門性（Expertise）の明示", desc: "著者プロフィールに医師免許・専門医資格・所属学会を記載。構造化データ（schema.org）でマークアップ" },
            { title: "権威性（Authoritativeness）の構築", desc: "医療系メディアからの被リンク獲得、学会発表歴の掲載、メディア掲載実績の紹介" },
            { title: "信頼性（Trustworthiness）の担保", desc: "参考文献の明記、最終更新日の表示、運営者情報・所在地の明確な開示" },
          ]} />

          <h3 className="text-lg font-semibold text-gray-700 mt-4">コンテンツ戦略の具体例</h3>

          <p>オンライン診療クリニックが狙うべきSEOキーワードは、大きく3つのカテゴリに分類できます。</p>

          <ComparisonTable
            headers={["キーワードカテゴリ", "例", "検索ボリューム", "CVR（予約率）", "優先度"]}
            rows={[
              ["診療科目 × オンライン", "AGA オンライン診療、ピル 処方 オンライン", "月間1,000〜10,000", "3〜5%", "最優先"],
              ["症状 × 相談", "抜け毛 相談、肌荒れ 治らない", "月間5,000〜50,000", "0.5〜1%", "中長期"],
              ["比較・口コミ系", "オンライン診療 おすすめ、〇〇クリニック 口コミ", "月間500〜5,000", "5〜8%", "高"],
              ["お悩み・知識系", "AGA 原因、ピル 副作用", "月間10,000〜100,000", "0.1〜0.5%", "認知獲得"],
            ]}
          />

          <Callout type="success" title="SEO成功のための5つのポイント">
            <ol className="mt-2 space-y-2 list-decimal pl-4">
              <li><strong>医師監修の記事を月4〜8本</strong>定期公開し、専門性を蓄積する</li>
              <li><strong>構造化データ</strong>（MedicalWebPage、FAQPage）を実装し、検索結果での表示を強化</li>
              <li><strong>内部リンク設計</strong>で診療科目ページ→コラム記事→予約ページへの導線を構築</li>
              <li><strong>定期的なリライト</strong>で最新のガイドライン・薬剤情報を反映し、鮮度を維持</li>
              <li><strong>患者の実体験</strong>（匿名化済み）を盛り込み、Experience要素を強化</li>
            </ol>
          </Callout>

          <p>SEOは効果が出るまで3〜6ヶ月かかりますが、一度上位表示されれば広告費不要で安定的に集患できるため、<strong>中長期の投資として最もROIが高い施策</strong>です。</p>
        </section>

        <InlineCTA />

        {/* ── セクション3: リスティング広告 ── */}
        <section>
          <h2 id="listing-ads" className="text-xl font-bold text-gray-800">リスティング広告 — Google・Yahoo!広告の運用</h2>

          <p>SEOが中長期施策であるのに対し、<strong>リスティング広告は即効性のある集患チャネル</strong>です。特に開業初期や新しい診療メニューの立ち上げ時には、広告で認知を獲得しながらSEOの効果を待つのが定石です。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">Google広告の運用ポイント</h3>

          <p>オンライン診療クリニックがGoogle広告で成果を出すには、以下の戦略が有効です。</p>

          <ul className="list-disc pl-6 space-y-2">
            <li><strong>検索キャンペーン</strong> — 「AGA オンライン診療」「ピル 処方 ネット」など、予約意欲の高いキーワードに集中投下</li>
            <li><strong>除外キーワードの徹底</strong> — 「無料」「自分で」「市販」など、受診につながらない検索語を除外しCPAを改善</li>
            <li><strong>広告文に差別化要素</strong> — 「初診からオンライン対応」「最短翌日配送」「医師が直接診察」など具体的な強みを記載</li>
            <li><strong>LP（ランディングページ）の最適化</strong> — 広告クリック後の離脱率を下げるため、診療メニュー別のLPを用意</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">Yahoo!広告の活用</h3>

          <p>Yahoo!広告はGoogle広告に比べてCPCが低い傾向にあり、<strong>40代以上のユーザーへのリーチに強み</strong>があります。生活習慣病・更年期障害・AGAなど、中高年層がターゲットの診療科目では、Yahoo!広告の方が費用対効果が高いケースも多くあります。</p>

          <BarChart
            data={[
              { label: "Google検索広告", value: 8000, color: "bg-blue-500" },
              { label: "Yahoo!検索広告", value: 5500, color: "bg-red-400" },
              { label: "Googleディスプレイ", value: 12000, color: "bg-sky-400" },
              { label: "P-MAXキャンペーン", value: 7000, color: "bg-emerald-500" },
            ]}
            unit="円/CPA"
          />

          <Callout type="warning" title="医療広告における注意点">
            Google・Yahoo!ともに医療系広告には独自の審査基準があります。「最安」「No.1」「絶対治る」などの表現は審査NGとなるため、<strong>エビデンスに基づいた客観的な表現</strong>を使用してください。詳しくは本記事の<a href="#compliance" className="text-emerald-700 underline">医療広告ガイドラインの章</a>で解説します。
          </Callout>

          <StatGrid stats={[
            { value: "5,500", unit: "円", label: "Yahoo!広告の平均CPA" },
            { value: "8,000", unit: "円", label: "Google広告の平均CPA" },
            { value: "2〜3", unit: "ヶ月", label: "最適化に必要な期間" },
          ]} />
        </section>

        {/* ── セクション4: SNSマーケティング ── */}
        <section>
          <h2 id="sns-marketing" className="text-xl font-bold text-gray-800">SNSマーケティング — Instagram・X・TikTok活用</h2>

          <p>SNSは<strong>認知拡大とブランディング</strong>に最も効果的なチャネルです。直接的な予約獲得には向きませんが、「このクリニックなら信頼できる」という印象を形成し、検索行動やLINE友だち追加につなげる役割を果たします。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">Instagram — ビジュアルで信頼を構築</h3>

          <p>Instagramは美容皮膚科・ダイエット外来など<strong>ビジュアル訴求が効果的な診療科目</strong>に最適です。</p>

          <ul className="list-disc pl-6 space-y-1">
            <li><strong>投稿コンテンツ</strong>: 医師による症状解説カルーセル、診療の流れ紹介、患者の声（匿名）</li>
            <li><strong>リール</strong>: 30秒〜60秒の「よくある質問に医師が回答」シリーズでリーチを拡大</li>
            <li><strong>ストーリーズ</strong>: 診療時間のお知らせ、季節のキャンペーン告知、Q&Aスタンプで双方向交流</li>
            <li><strong>プロフィールリンク</strong>: LINE友だち追加リンクを設置し、フォロワーをLINEに誘導</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">X（旧Twitter） — 速報性と拡散力</h3>

          <p>Xは<strong>最新の医療情報や健康トピックの発信</strong>に適しています。医師アカウントでの発信は専門性のアピールになり、リポストによる拡散で広い認知獲得が期待できます。</p>

          <ul className="list-disc pl-6 space-y-1">
            <li>最新の研究論文やガイドライン改定の解説</li>
            <li>季節の健康情報（花粉症、インフルエンザなど）のタイムリーな発信</li>
            <li>患者からの匿名質問に回答する「#医師が回答」シリーズ</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">TikTok — 若年層への圧倒的リーチ</h3>

          <p>TikTokは<strong>10〜30代へのリーチ</strong>に圧倒的な強みがあります。ピル処方・ニキビ治療・ダイエット外来など若年層がターゲットの診療科目では、TikTokからの流入が最大チャネルになるケースも増えています。</p>

          <ComparisonTable
            headers={["SNS", "主要ユーザー層", "適した診療科目", "投稿頻度の目安", "集患への貢献"]}
            rows={[
              ["Instagram", "20〜40代女性", "美容皮膚科、婦人科、ダイエット外来", "週3〜5投稿", "ブランディング + LINE誘導"],
              ["X（旧Twitter）", "20〜40代男女", "AGA、ED、内科全般", "毎日1〜3投稿", "認知拡大 + 専門性アピール"],
              ["TikTok", "10〜30代男女", "ピル、ニキビ、ダイエット", "週2〜3本", "認知拡大 + LP誘導"],
            ]}
          />

          <p>SNSは直接的なCPA管理が難しいチャネルですが、<strong>他チャネル（SEO・LINE）との連携</strong>で大きな相乗効果を発揮します。SNSで認知→Google検索で比較→LINE友だち追加→予約という導線を意識した運用が重要です。</p>
        </section>

        <InlineCTA />

        {/* ── セクション5: LINE公式アカウント活用 ── */}
        <section>
          <h2 id="line-acquisition" className="text-xl font-bold text-gray-800">LINE公式アカウントを活用した集患戦略</h2>

          <p>LINE公式アカウントは、オンライン診療の集患において<strong>最も重要なチャネル</strong>と言えます。その理由は、友だち追加から予約・問診・決済・フォローアップまで<strong>患者体験のすべてをLINE上で完結</strong>できるからです。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">友だち追加→予約の導線設計</h3>

          <FlowSteps steps={[
            { title: "友だち追加", desc: "Web広告・SNS・検索結果からLINE友だち追加。追加直後にあいさつメッセージで診療メニューを案内" },
            { title: "リッチメニューで導線提示", desc: "「予約する」「問診を始める」「料金を見る」など、患者が迷わず次のアクションに進めるメニュー設計" },
            { title: "オンライン問診", desc: "LINE上で事前問診を完了。来院前に症状を把握できるため、診察の質と効率が向上" },
            { title: "予約確定・リマインド", desc: "予約完了メッセージとリマインド通知を自動送信。無断キャンセルを大幅に削減" },
          ]} />

          <h3 className="text-lg font-semibold text-gray-700 mt-4">LINEが集患に強い3つの理由</h3>

          <StatGrid stats={[
            { value: "80", unit: "%", label: "LINEメッセージ開封率" },
            { value: "9,600", unit: "万人", label: "LINEの国内月間利用者数" },
            { value: "1/5", unit: "", label: "広告比のCPA" },
          ]} />

          <p><strong>理由1: 圧倒的なリーチ力</strong><br />
          LINEの国内月間利用者数は9,600万人以上。メール開封率が20%前後なのに対し、LINEメッセージの開封率は80%を超えます。配信した情報がほぼ確実に患者の目に届くため、集患施策の効果が格段に高くなります。</p>

          <p><strong>理由2: 友だち追加のハードルが低い</strong><br />
          メールアドレス登録やアプリインストールに比べ、LINEの友だち追加はワンタップで完了します。この手軽さが、潜在患者の取りこぼしを防ぎます。Web広告のCV地点を「友だち追加」に設定することで、CVRを大幅に改善できます。</p>

          <p><strong>理由3: ナーチャリング（育成）に最適</strong><br />
          友だち追加した直後に予約する患者は全体の約20%です。残り80%の「今すぐではないが興味はある」層に対して、定期的な情報配信でナーチャリングし、適切なタイミングで予約に導くことがLINEの真骨頂です。</p>

          <ResultCard
            before="Web広告→LP→予約フォーム（CVR 2%）"
            after="Web広告→LINE友だち追加→ナーチャリング→予約（CVR 12%）"
            metric="予約転換率 6倍"
            description="友だち追加をCV地点にすることで離脱を防ぎ、段階的に予約に導く"
          />

          <Callout type="point" title="AI自動返信で24時間対応">
            Lオペ for CLINICのAI自動返信機能を活用すれば、深夜や休日の問い合わせにも即座に対応可能です。「診察時間は？」「料金はいくら？」「副作用は？」といったよくある質問に自動回答し、予約への導線を途切れさせません。
          </Callout>
        </section>

        {/* ── セクション6: 口コミ・MEO対策 ── */}
        <section>
          <h2 id="review-meo" className="text-xl font-bold text-gray-800">口コミ対策・MEO — Googleビジネスプロフィール最適化</h2>

          <p>オンライン診療クリニックでも<strong>Googleビジネスプロフィール（GBP）</strong>の最適化は重要です。「オンライン診療 〇〇科」で検索した際にGBPが上位表示されると、クリニックの信頼性が大幅に向上します。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">MEO対策の基本施策</h3>

          <ul className="list-disc pl-6 space-y-2">
            <li><strong>GBPの情報を完全に埋める</strong> — 診療科目、診療時間、対応エリア、オンライン診療対応の旨を明記</li>
            <li><strong>写真・動画の定期投稿</strong> — クリニック内の様子、医師の写真、診療風景（許可済み）をアップロード</li>
            <li><strong>投稿機能の活用</strong> — 新しい診療メニューやキャンペーン情報をGBPの投稿機能で定期的に発信</li>
            <li><strong>Q&A機能の活用</strong> — よくある質問を事前に登録し、患者の疑問を解消</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">口コミ対策の具体策</h3>

          <p>Googleの口コミは<strong>患者の意思決定に最も影響を与える要素</strong>のひとつです。星評価4.0以上のクリニックは、3.5以下のクリニックと比較して予約率が約2倍というデータもあります。</p>

          <FlowSteps steps={[
            { title: "診察後のフォローメッセージ", desc: "LINEで「本日の診察はいかがでしたか？」と送信。満足度が高い患者に口コミ投稿を依頼" },
            { title: "口コミ投稿の導線を用意", desc: "Googleレビューの直接リンクをLINEメッセージに添付し、投稿のハードルを下げる" },
            { title: "ネガティブレビューへの丁寧な返信", desc: "低評価の口コミにも誠実に返信。改善姿勢を示すことで、第三者からの信頼を獲得" },
          ]} />

          <Callout type="warning" title="口コミ対策の注意点">
            口コミの自作自演や、金銭的報酬と引き換えの口コミ依頼は<strong>Googleのガイドライン違反</strong>であり、医療広告ガイドラインにも抵触します。あくまで自然な口コミを促す施策に留めてください。
          </Callout>
        </section>

        {/* ── セクション7: チャネル別CPA比較 ── */}
        <section>
          <h2 id="cpa-comparison" className="text-xl font-bold text-gray-800">チャネル別CPA比較と予算配分の最適解</h2>

          <p>限られたマーケティング予算を最大限活用するために、各チャネルの<strong>CPA（患者獲得コスト）</strong>を正確に把握することが重要です。以下は、オンライン診療クリニックにおける一般的なCPA比較です。</p>

          <ComparisonTable
            headers={["チャネル", "CPA目安", "初期費用", "効果発現", "スケーラビリティ"]}
            rows={[
              ["SEO（コンテンツマーケティング）", "1,500〜3,000円", "月10〜30万円（記事制作費）", "3〜6ヶ月", "高（資産蓄積型）"],
              ["Google検索広告", "6,000〜10,000円", "月20〜50万円", "即日", "高（予算に比例）"],
              ["Yahoo!検索広告", "4,000〜7,000円", "月10〜30万円", "即日", "中"],
              ["Instagram広告", "5,000〜8,000円", "月10〜30万円", "1〜2週間", "中"],
              ["LINE友だち追加広告", "300〜800円/友だち", "月5〜20万円", "即日", "高"],
              ["SNS運用（オーガニック）", "測定困難", "月5〜15万円（運用工数）", "3〜6ヶ月", "中"],
              ["MEO・口コミ", "実質0円", "初期設定のみ", "1〜3ヶ月", "低"],
            ]}
          />

          <BarChart
            data={[
              { label: "SEO", value: 2000, color: "bg-emerald-500" },
              { label: "LINE友だち追加→予約", value: 3000, color: "bg-green-500" },
              { label: "Yahoo!検索広告", value: 5500, color: "bg-amber-400" },
              { label: "Google検索広告", value: 8000, color: "bg-blue-500" },
              { label: "Instagram広告", value: 7000, color: "bg-pink-400" },
              { label: "Googleディスプレイ", value: 12000, color: "bg-red-400" },
            ]}
            unit="円/CPA"
          />

          <h3 className="text-lg font-semibold text-gray-700 mt-4">推奨予算配分（月間50万円の場合）</h3>

          <StatGrid stats={[
            { value: "40", unit: "%", label: "リスティング広告（20万円）" },
            { value: "25", unit: "%", label: "SEO・コンテンツ制作（12.5万円）" },
            { value: "20", unit: "%", label: "LINE友だち追加広告（10万円）" },
            { value: "15", unit: "%", label: "SNS運用（7.5万円）" },
          ]} />

          <p>開業初期はリスティング広告の比率を高めて即効性のある集患を確保し、SEOの効果が出始めたら徐々に広告費を削減していくのが最適なアプローチです。LINE友だち追加広告は、<strong>CPA 300〜800円と圧倒的に低コスト</strong>でリードを獲得できるため、常に一定の予算を確保することを推奨します。</p>
        </section>

        <InlineCTA />

        {/* ── セクション8: 医療広告ガイドライン・薬機法 ── */}
        <section>
          <h2 id="compliance" className="text-xl font-bold text-gray-800">医療広告ガイドライン・薬機法の遵守ポイント</h2>

          <p>オンライン診療クリニックのマーケティングでは、<strong>医療広告ガイドラインと薬機法の遵守</strong>が必須です。違反した場合、是正命令・罰金だけでなく、社会的信頼の失墜による致命的なダメージを受けます。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">禁止される広告表現</h3>

          <ComparisonTable
            headers={["禁止事項", "NG例", "OK例（修正後）"]}
            rows={[
              ["虚偽広告", "「治癒率100%」「絶対に治る」", "「多くの患者様にご満足いただいています」"],
              ["比較優良広告", "「日本一の実績」「他院より優れた治療」", "「累計〇〇名の診療実績」（客観的事実）"],
              ["誇大広告", "「最新の画期的治療」「夢の新薬」", "「〇〇学会ガイドラインに基づく治療」"],
              ["体験談の広告利用", "「飲んだら3日で効果を実感！」", "医師による治療内容の客観的説明"],
              ["ビフォーアフター写真", "施術前後の写真のみ掲載", "写真 + 治療内容・リスク・費用の詳細併記"],
            ]}
          />

          <h3 className="text-lg font-semibold text-gray-700 mt-4">薬機法の注意点</h3>

          <Callout type="warning" title="薬機法違反で多い事例">
            <ul className="mt-2 space-y-2 list-disc pl-4">
              <li><strong>未承認薬の効能効果の広告</strong> — 海外製サプリメントや未承認薬の具体的な効果を謳うのは薬機法違反</li>
              <li><strong>医薬品の誇大表現</strong> — 「飲むだけで痩せる」「塗るだけで若返る」などの表現は禁止</li>
              <li><strong>健康食品を医薬品的に表現</strong> — サプリメントに疾病の治療・予防効果を表記するのは違法</li>
            </ul>
          </Callout>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">安全にマーケティングを行うための対策</h3>

          <ul className="list-disc pl-6 space-y-2">
            <li><strong>広告審査体制の構築</strong> — 配信前に医師と法務担当（または顧問弁護士）のダブルチェックを実施</li>
            <li><strong>チェックリストの運用</strong> — 禁止表現リストを作成し、広告文・LP・SNS投稿すべてに適用</li>
            <li><strong>定期的なガイドライン確認</strong> — 厚労省のガイドラインは定期的に改定されるため、最新版を常に確認</li>
            <li><strong>限定解除要件の活用</strong> — 自由診療の広告は、治療内容・費用・リスク・副作用を詳細に記載することで掲載可能</li>
          </ul>

          <p>医療広告ガイドラインの詳細については、<Link href="/lp/column/clinic-ad-yakki-ho-guide" className="text-emerald-700 underline">クリニック広告と薬機法ガイド</Link>や<Link href="/lp/column/online-clinic-regulations" className="text-emerald-700 underline">オンライン診療の法規制と薬機法</Link>でさらに詳しく解説しています。</p>
        </section>

        {/* ── セクション9: ロードマップ ── */}
        <section>
          <h2 id="roadmap" className="text-xl font-bold text-gray-800">初期集患から安定期までのロードマップ</h2>

          <p>オンライン診療クリニックのマーケティングは、<strong>フェーズごとに注力すべき施策が異なります</strong>。以下のロードマップに沿って段階的に施策を展開することで、無駄なく効率的に集患基盤を構築できます。</p>

          <FlowSteps steps={[
            { title: "開業前（-3〜-1ヶ月）: 基盤構築", desc: "LINE公式アカウント開設、Webサイト・LP制作、Googleビジネスプロフィール登録、SNSアカウント開設。SEO記事の初期コンテンツ（10〜15本）を準備" },
            { title: "開業初期（1〜3ヶ月目）: 認知獲得フェーズ", desc: "リスティング広告を最優先で出稿。LINE友だち追加広告を並行運用。SNS投稿を開始し認知を拡大。月間50〜100人の友だち追加を目標に" },
            { title: "成長期（4〜6ヶ月目）: 最適化フェーズ", desc: "広告データを分析しCPAの高いキーワード・クリエイティブを改善。SEO記事の効果が出始め、オーガニック流入が増加。LINEのナーチャリング施策（セグメント配信・フォローアップ）を本格稼働" },
            { title: "安定期（7〜12ヶ月目）: 効率化フェーズ", desc: "SEOからの流入が安定し広告費比率を段階的に削減。口コミ・紹介経由の新患が増加。LTV最大化のためリピート戦略を強化。月間新患数100人以上を安定的に維持" },
          ]} />

          <ResultCard
            before="開業初期: 月間新患20人（広告費CPA 10,000円）"
            after="安定期: 月間新患120人（平均CPA 3,500円）"
            metric="CPA 65%削減、新患数 6倍"
            description="12ヶ月のロードマップ実行で、広告依存から脱却し安定的な集患基盤を構築"
          />

          <StatGrid stats={[
            { value: "120", unit: "人/月", label: "安定期の月間新患数" },
            { value: "3,500", unit: "円", label: "安定期の平均CPA" },
            { value: "65", unit: "%", label: "CPA削減率" },
          ]} />
        </section>

        {/* ── セクション10: Lオペのリピート戦略 ── */}
        <section>
          <h2 id="lope-retention" className="text-xl font-bold text-gray-800">Lオペで実現するリピート戦略</h2>

          <p>集患は「新規患者の獲得」だけでは完結しません。オンライン診療の収益を安定させるには、<strong>獲得した患者にリピート受診してもらう仕組み</strong>が不可欠です。Lオペ for CLINICは、集患から定着までをワンストップで実現するクリニック専用のLINE運用プラットフォームです。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">セグメント配信によるパーソナライズドフォロー</h3>

          <p>Lオペのセグメント配信機能では、患者を<strong>診療科目・処方内容・最終受診日・受診回数</strong>などの条件で絞り込み、それぞれに最適なメッセージを自動配信できます。</p>

          <ul className="list-disc pl-6 space-y-1">
            <li><strong>処方薬の残量リマインド</strong> — 処方日数から逆算し、薬が切れる前に再診を促進</li>
            <li><strong>定期受診のスケジュール管理</strong> — AGA・ピルなど継続処方が必要な診療の定期リマインド</li>
            <li><strong>離脱患者の掘り起こし</strong> — 一定期間受診がない患者に再来院を促すメッセージを自動配信</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">フォローアップルールによる自動化</h3>

          <p>Lオペのフォローアップルール機能では、<strong>特定の条件を満たした患者に対して自動的にアクションを実行</strong>できます。</p>

          <FlowSteps steps={[
            { title: "条件設定", desc: "「最終受診から30日経過」「AGA処方患者」「2回目の受診完了」など、任意の条件をルールとして設定" },
            { title: "アクション実行", desc: "条件を満たした患者に対し、テンプレートメッセージの自動送信やタグの自動付与を実行" },
            { title: "効果測定", desc: "ダッシュボードでフォローアップの反応率・再診率をリアルタイムで確認し、ルールを最適化" },
          ]} />

          <h3 className="text-lg font-semibold text-gray-700 mt-4">Lオペの主要機能と集患・リピートへの貢献</h3>

          <ComparisonTable
            headers={["機能", "集患への貢献", "リピートへの貢献"]}
            rows={[
              ["LINE予約管理", "友だち追加→予約の導線を自動化", "再予約をLINEからワンタップで完了"],
              ["オンライン問診", "事前問診で予約のハードルを低減", "前回の問診データを活用し診察を効率化"],
              ["セグメント配信", "属性別のターゲティング配信で集患", "診療履歴に基づくパーソナライズドフォロー"],
              ["AI自動返信", "24時間対応で問い合わせの取りこぼし防止", "よくある質問への即時回答で患者満足度向上"],
              ["リッチメニュー", "直感的なUIで予約・問診への導線を最適化", "再予約・お知らせ確認がワンタップで完了"],
              ["患者CRM", "友だちの属性・行動を一元管理", "患者ごとの対応履歴でフォローの質を向上"],
              ["配送管理", "処方薬の迅速な配送で患者体験を向上", "配送ステータスの自動通知で安心感を提供"],
              ["決済連携（Square）", "オンライン決済で受診完了までの離脱を防止", "次回決済もスムーズに完了"],
              ["ダッシュボード", "集患チャネル別の効果を可視化", "リピート率・LTVをリアルタイムで把握"],
              ["フォローアップルール", "友だち追加後の自動ナーチャリング", "処方リマインド・離脱検知の自動化"],
              ["タグ管理", "流入チャネル別のタグで分析精度を向上", "診療履歴タグでセグメント配信の精度向上"],
              ["テンプレートメッセージ", "初回案内メッセージの品質を統一", "フォローアップメッセージの効率的な運用"],
            ]}
          />

          <Callout type="point" title="月額10〜18万円で集患とリピートを同時に実現">
            Lオペ for CLINICは月額10〜18万円で、上記の全機能を利用できます。リスティング広告1ヶ月分のコストで、集患からリピート定着までの仕組みを構築できるため、<strong>投資回収は平均2〜3ヶ月</strong>です。
          </Callout>

          <InlineCTA />
        </section>

        {/* ── セクション11: まとめ ── */}
        <section>
          <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: オンライン診療クリニックの集患・マーケティング戦略</h2>

          <p>オンライン診療クリニックの集患は、<strong>複数チャネルの統合運用</strong>と<strong>医療広告ガイドライン・薬機法の遵守</strong>が成功の鍵です。単一チャネルに依存せず、それぞれの特性を活かした施策を段階的に展開することで、安定的な集患基盤を構築できます。</p>

          <Callout type="success" title="本記事のまとめ">
            <ol className="mt-2 space-y-2 list-decimal pl-4">
              <li><strong>SEO</strong> — E-E-A-T対策を徹底した医師監修コンテンツで中長期の集患基盤を構築（CPA 1,500〜3,000円）</li>
              <li><strong>リスティング広告</strong> — 即効性のある集患チャネルとして開業初期に最注力（CPA 5,500〜10,000円）</li>
              <li><strong>SNS</strong> — Instagram・X・TikTokで認知を拡大し、LINE友だち追加に誘導</li>
              <li><strong>LINE公式アカウント</strong> — 友だち追加→ナーチャリング→予約の導線で予約転換率を最大6倍に改善</li>
              <li><strong>MEO・口コミ</strong> — Googleビジネスプロフィールの最適化と自然な口コミ促進で信頼性を向上</li>
              <li><strong>法令遵守</strong> — 医療広告ガイドライン・薬機法に準拠した広告運用で持続可能なマーケティングを実現</li>
              <li><strong>ロードマップ</strong> — 12ヶ月でCPA 65%削減、新患数6倍を達成する段階的な戦略を実行</li>
            </ol>
          </Callout>

          <BarChart
            data={[
              { label: "SEO", value: 2000, color: "bg-emerald-500" },
              { label: "LINE経由", value: 3000, color: "bg-green-500" },
              { label: "口コミ・紹介", value: 2500, color: "bg-teal-500" },
              { label: "Yahoo!広告", value: 5500, color: "bg-amber-400" },
              { label: "Google広告", value: 8000, color: "bg-blue-500" },
              { label: "SNS広告", value: 7000, color: "bg-pink-400" },
            ]}
            unit="円/CPA"
          />

          <p>Lオペ for CLINICは、LINE公式アカウントを核にした<strong>集患→予約→診察→フォローアップ→リピート</strong>の全工程をワンストップで自動化するクリニック専用プラットフォームです。月額10〜18万円で、上記の集患戦略を強力にサポートします。</p>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">関連コラム</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><Link href="/lp/column/online-clinic-complete-guide" className="text-emerald-700 underline">オンライン診療完全ガイド — 開業準備・システム選定・集患・運用まで</Link></li>
            <li><Link href="/lp/column/online-clinic-regulations" className="text-emerald-700 underline">オンライン診療の法規制と薬機法 — 最新ルールと注意点</Link></li>
            <li><Link href="/lp/column/clinic-ad-yakki-ho-guide" className="text-emerald-700 underline">クリニック広告と薬機法ガイド</Link></li>
            <li><Link href="/lp/column/clinic-line-friends-growth" className="text-emerald-700 underline">クリニックのLINE友だち集め — 月100人増やす7つの施策</Link></li>
            <li><Link href="/lp/column/segment-delivery-repeat" className="text-emerald-700 underline">LINEセグメント配信でリピート率を向上させる方法</Link></li>
            <li><Link href="/lp/column/clinic-google-review" className="text-emerald-700 underline">クリニックのGoogle口コミ対策</Link></li>
          </ul>
        </section>
      </ArticleLayout>
    </>
  );
}
