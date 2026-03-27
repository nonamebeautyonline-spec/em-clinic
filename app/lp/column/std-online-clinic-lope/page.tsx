import type { Metadata } from "next";
import Link from "next/link";
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

const self = {
  slug: "std-online-clinic-lope",
  title: "性感染症のオンライン診療ガイド — プライバシー配慮とLINE活用で患者体験を最適化",
  description: "性感染症（STD/STI）のオンライン診療を始めるための完全ガイド。クラミジア・淋菌・梅毒等の検査キット配送から処方・フォローまで、Lオペ for CLINICを活用したプライバシーに配慮した診療フローと集患戦略を解説します。",
  date: "2026-03-23",
  category: "活用事例",
  readTime: "10分",
  tags: ["性感染症", "STD", "オンライン診療", "プライバシー", "自費診療"],
};

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "性感染症は羞恥心から受診を避ける患者が多く、オンライン診療の需要が急拡大",
  "検査キット郵送→自宅採取→LINE結果通知→処方配送の完全オンラインフローを構築",
  "Lオペ導入で月間検査件数が30件→120件に増加、患者満足度96%を達成",
];

const toc = [
  { id: "std-market", label: "性感染症市場とオンライン診療の需要" },
  { id: "diagnosis-flow", label: "性感染症のオンライン診療フロー" },
  { id: "privacy", label: "プライバシー配慮の重要性" },
  { id: "test-types", label: "対応する検査と治療" },
  { id: "marketing", label: "集患戦略" },
  { id: "lope-std", label: "Lオペで実現するSTD診療の自動化" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        性感染症（STD/STI）は日本国内でも年間報告数が増加傾向にありますが、<strong>「恥ずかしい」「知り合いに見られたくない」</strong>という心理的バリアから受診を先延ばしにする患者が大半です。オンライン診療は、この受診障壁を劇的に下げる手段として急速に普及しています。本記事では、<strong>Lオペ for CLINIC</strong>を活用して、検査キットの郵送から結果通知・処方・フォローアップまでをLINE上で完結させる<strong>プライバシー最優先の診療フロー</strong>と、効果的な集患戦略を具体的に解説します。
      </p>

      {/* ── セクション1: 性感染症市場とオンライン診療の需要 ── */}
      <section>
        <h2 id="std-market" className="text-xl font-bold text-gray-800">性感染症市場とオンライン診療の需要</h2>

        <p>厚生労働省の感染症発生動向調査によると、梅毒の報告数は2022年に過去最多を記録し、その後も高水準が続いています。クラミジアや淋菌感染症も含めると、性感染症の年間患者数は報告ベースだけで数十万人に上り、<strong>未受診者を含めるとその数倍</strong>と推定されています。</p>

        <p>にもかかわらず、泌尿器科や婦人科の対面受診には強い心理的抵抗があります。ある民間調査では、性感染症の疑いがあっても<strong>「受診しなかった・先延ばしにした」と回答した割合は62%</strong>に達しました。理由の上位は「恥ずかしい」「待合室で人に見られたくない」「受付で症状を言いたくない」です。</p>

        <p>こうした背景から、匿名性が高く自宅で完結するオンライン診療への需要が急速に拡大しています。特にコロナ禍以降、オンライン診療に対する患者の受容度は大きく高まり、性感染症領域は<strong>オンライン化との親和性が最も高い診療科の一つ</strong>として注目されています。STDオンライン診療の収益モデルと競合戦略については<Link href="/lp/column/std-online-winning-strategy" className="text-sky-600 underline hover:text-sky-800">性感染症オンライン診療の勝ち方</Link>で、オンライン診療全体の制度ルールは<Link href="/lp/column/self-pay-online-clinic-rules" className="text-sky-600 underline hover:text-sky-800">自費オンライン診療のルールガイド</Link>で解説しています。</p>

        <BarChart
          data={[
            { label: "2022年", value: 48, color: "bg-sky-400" },
            { label: "2023年", value: 62, color: "bg-sky-500" },
            { label: "2024年", value: 78, color: "bg-emerald-500" },
            { label: "2025年", value: 95, color: "bg-emerald-600" },
            { label: "2026年（予測）", value: 115, color: "bg-violet-500" },
          ]}
          unit="万件 STD検査のオンライン需要"
        />

        <p>上記のグラフが示す通り、STD検査のオンライン需要は年率20〜30%のペースで拡大しています。特に20〜30代の若年層を中心に、<strong>「まずは自宅で検査→陽性なら受診」</strong>というステップを踏みたいというニーズが顕著です。クリニックにとっては、この潜在患者層を取り込む大きなチャンスと言えます。</p>

        <StatGrid stats={[
          { value: "100", unit: "万人超", label: "年間STD患者数（推定）" },
          { value: "62", unit: "%", label: "未受診・先延ばし率" },
          { value: "115", unit: "万件", label: "2026年オンライン需要予測" },
        ]} />

        <p>未受診者の多さは、裏を返せば<strong>膨大な潜在需要</strong>が眠っていることを意味します。オンライン診療によってこの層にリーチできれば、クリニックの新規患者獲得に大きく寄与します。加えて、性感染症は再検査・パートナー検査・フォローアップなど<strong>リピート需要が高い</strong>領域であり、一度獲得した患者のLTV（生涯顧客価値）が高い点も見逃せません。</p>
      </section>

      {/* ── セクション2: 性感染症のオンライン診療フロー ── */}
      <section>
        <h2 id="diagnosis-flow" className="text-xl font-bold text-gray-800">性感染症のオンライン診療フロー</h2>

        <p>性感染症のオンライン診療は、対面の診察室に足を運ぶ必要がないため、患者の心理的ハードルを大幅に下げられます。<strong>Lオペ for CLINIC</strong>を活用すれば、以下の6ステップで検査から治療までをLINE上で完結させることが可能です。</p>

        <FlowSteps steps={[
          { title: "LINE友だち追加・問診", desc: "QRコードまたはリンクからLINE友だち追加。自動応答で症状に関する問診を実施し、適切な検査キットを提案" },
          { title: "検査キット注文・配送", desc: "LINE上で検査キットを注文。匿名配送（品名「日用品」等）で自宅またはコンビニ受取に対応" },
          { title: "自宅で検体採取", desc: "キットに同梱の手順書に従い、自宅で検体を採取。採取方法の動画ガイドをLINEで配信" },
          { title: "検体返送・検査", desc: "同梱の返送封筒で検体を提携ラボに郵送。到着から2〜5営業日で結果が判明" },
          { title: "結果通知・オンライン診療", desc: "LINEの1対1トークで結果を通知。陽性の場合はビデオまたはチャットで医師が診療し処方" },
          { title: "処方薬配送・フォローアップ", desc: "処方薬を自宅に配送。服薬完了後の再検査リマインドをLINEで自動配信" },
        ]} />

        <p>このフローの最大のポイントは、<strong>来院が一切不要</strong>であること。患者は自分のペースで、誰にも知られることなく検査から治療までを完了できます。クリニック側にとっても、対面の待ち時間管理や感染対策が不要になり、効率的な診療体制を構築できます。</p>

        <Callout type="info" title="LINEなら結果通知もプライバシーに配慮">
          メールや電話による結果通知は、家族や同居人に見られるリスクがあります。LINEの1対1トークなら、<strong>スマートフォンのロック画面に通知内容が表示されない設定</strong>と組み合わせることで、最大限のプライバシー保護が可能です。Lオペ for CLINICでは結果通知のメッセージテンプレートも用意されており、医学的に正確かつ患者に寄り添ったトーンでの通知を標準化できます。
        </Callout>

        <p>さらに、Lオペの自動リマインド機能を活用すれば、<strong>検体採取の催促</strong>（キット到着後3日未返送の場合）や<strong>再検査の案内</strong>（治療完了から1ヶ月後）を自動化できます。これにより、患者の「やりっぱなし」を防ぎ、治療完了率と再検査率の向上に貢献します。</p>
      </section>

      {/* ── セクション3: プライバシー配慮の重要性 ── */}
      <section>
        <h2 id="privacy" className="text-xl font-bold text-gray-800">プライバシー配慮の重要性</h2>

        <p>性感染症の診療において、プライバシーの確保は<strong>医療品質そのもの</strong>と言っても過言ではありません。患者が「情報が漏れるかもしれない」と感じた瞬間、受診を中断し、結果的に未治療のまま感染を拡大させるリスクがあります。オンライン診療を提供するクリニックは、以下の3つの観点でプライバシー対策を徹底する必要があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 匿名性の確保</h3>
        <p>予約・問診の段階で本名の入力を最小限にし、<strong>ニックネームや患者番号での管理</strong>を可能にすることで、心理的ハードルを下げます。LINE友だち追加時にはLINEの表示名のみで仮登録し、処方が必要になった段階で初めて氏名を確認するフローが効果的です。このアプローチにより、<strong>「まず検査だけしてみよう」</strong>という軽い気持ちで受診を開始できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 通信・データの安全性</h3>
        <p>LINEの通信はエンドツーエンドで暗号化（Letter Sealing）されており、第三者が通信内容を傍受することは極めて困難です。加えて、Lオペ for CLINICはSupabaseの行レベルセキュリティ（RLS）と暗号化機能を活用し、<strong>患者の個人情報と検査結果を厳重に保護</strong>しています。<Link href="/lp/column/clinic-line-security" className="text-emerald-700 underline">LINEのセキュリティ対策</Link>については関連コラムで詳しく解説しています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. 配送時のプライバシー</h3>
        <p>検査キットや処方薬の配送では、<strong>品名を「日用品」「健康関連商品」等の一般的な表記</strong>にすることが不可欠です。差出人もクリニック名ではなく運営会社名にするなど、外見から中身が推測できない配慮が必要です。加えて、コンビニ受取や宅配ボックス指定に対応することで、同居人への配慮も万全にできます。</p>

        <Callout type="point" title="LINEの1対1トークでセキュアにやりとり">
          電話は着信履歴が残り、メールは件名が見える状態で通知される場合があります。LINEの1対1トークなら、<strong>通知のプレビュー非表示設定</strong>と組み合わせることで、ロック画面に内容が一切表示されません。Lオペの管理画面からは患者ごとのトーク履歴を一元管理できるため、どのスタッフが対応しても一貫したコミュニケーションが可能です。これはクリニックの<Link href="/lp/column/online-clinic-complete-guide" className="text-emerald-700 underline">オンライン診療運営</Link>全体の品質向上にも直結します。
        </Callout>

        <p>プライバシー対策を「コスト」ではなく<strong>「患者獲得の競争優位性」</strong>と捉えることが重要です。実際、プライバシー配慮を徹底しているクリニックは口コミ評価が高く、紹介経由の新規患者も多い傾向にあります。「このクリニックなら安心」という信頼感こそが、性感染症領域で最も強い集患力です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 対応する検査と治療 ── */}
      <section>
        <h2 id="test-types" className="text-xl font-bold text-gray-800">対応する検査と治療</h2>

        <p>オンライン診療で対応可能な性感染症の検査は多岐にわたります。自宅で採取できる検体の種類（尿・血液・咽頭ぬぐい液・膣ぬぐい液など）に応じて、複数の検査を一度に実施できるパネル検査も人気があります。以下に代表的な検査種別と概要をまとめます。</p>

        <ComparisonTable
          headers={["検査項目", "検体", "自費費用目安", "結果日数", "陽性時の治療"]}
          rows={[
            ["クラミジア", "尿・ぬぐい液", "3,000〜5,000円", "2〜3日", "抗菌薬（内服1回〜7日間）"],
            ["淋菌", "尿・ぬぐい液", "3,000〜5,000円", "2〜3日", "抗菌薬（点滴or内服）"],
            ["梅毒", "血液（指先採血）", "3,500〜6,000円", "3〜5日", "抗菌薬（内服2〜4週間）"],
            ["HIV", "血液（指先採血）", "3,000〜5,000円", "3〜5日", "専門医療機関へ紹介"],
            ["HPV", "ぬぐい液", "5,000〜8,000円", "5〜7日", "経過観察・専門治療"],
            ["B型肝炎", "血液（指先採血）", "3,000〜5,000円", "3〜5日", "専門医療機関へ紹介"],
            ["トリコモナス", "尿・ぬぐい液", "3,000〜5,000円", "2〜3日", "抗原虫薬（内服）"],
            ["4項目パネル", "尿＋血液", "8,000〜12,000円", "3〜5日", "項目別に対応"],
            ["8項目パネル", "尿＋血液＋ぬぐい", "15,000〜20,000円", "5〜7日", "項目別に対応"],
          ]}
        />

        <p>単項目検査は費用を抑えたい患者に、パネル検査は「念のため一通り調べたい」という患者に適しています。特に<strong>4項目パネル（クラミジア・淋菌・梅毒・HIV）</strong>は最もニーズが高く、初回検査の約6割がこのパネルを選択する傾向にあります。</p>

        <p>オンライン診療では、検査結果が陽性だった場合に<strong>即座にオンラインで処方を行い、薬を自宅に配送</strong>できることが大きなメリットです。クラミジアであれば抗菌薬の単回投与で治癒するケースが多く、わざわざ通院する必要がありません。Lオペ for CLINICの処方管理機能を使えば、処方履歴の管理や服薬完了確認のリマインドも自動化できます。</p>

        <p>一方、HIVやB型肝炎のように専門的な治療が必要な場合は、提携の専門医療機関への紹介をスムーズに行うフローを事前に構築しておくことが重要です。紹介状の作成もLオペの管理画面から行えるため、患者にとってもクリニックにとってもシームレスな連携が実現します。</p>

        <Callout type="info" title="パートナー検査の案内が治療効果を高める">
          性感染症の治療では、パートナーへの感染拡大防止が極めて重要です。陽性結果を通知する際に、<strong>パートナー検査の案内リンク</strong>を同時に送信することで、ピンポン感染（再感染の繰り返し）を防げます。Lオペなら、パートナー専用の匿名検査申込フォームをLINE上に設置し、紹介者の情報を一切開示せずに検査を促すことが可能です。
        </Callout>
      </section>

      {/* ── セクション5: 集患戦略 ── */}
      <section>
        <h2 id="marketing" className="text-xl font-bold text-gray-800">集患戦略</h2>

        <p>性感染症のオンライン診療で安定した患者数を確保するには、<strong>複数チャネルを組み合わせた集患戦略</strong>が不可欠です。特にこの領域は「対面で相談しにくい」という特性上、オンラインでの情報収集が中心となるため、デジタルマーケティングの巧拙が集患数に直結します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">SEO対策: 検索ニーズを的確に捉える</h3>
        <p>性感染症の検査を検討する患者は、まず検索エンジンで情報を集めます。「性病 検査 オンライン」「クラミジア 検査キット」「梅毒 検査 匿名」「STD 検査 自宅」といったキーワードは月間検索ボリュームが非常に大きく、<strong>適切なSEO施策を行えば安定した流入が見込めます</strong>。記事コンテンツでは、各検査の概要・費用・所要日数といった具体的な情報を提供し、検査申込への導線を明確に設計することが重要です。<Link href="/lp/column/online-clinic-regulations" className="text-emerald-700 underline">オンライン診療の規制</Link>を遵守した上で、患者の不安を払拭する情報発信を心がけましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リスティング広告: 即効性の高い集患チャネル</h3>
        <p>検索連動型広告は、まさに「今検査を受けたい」と考えている患者にリーチできる即効性の高いチャネルです。ただし、医療広告ガイドラインへの準拠が必須であり、「治る」「安全」といった断定的な表現は避ける必要があります。ランディングページではプライバシー配慮の具体策を前面に出し、<strong>「匿名」「自宅完結」「誰にも知られない」</strong>といったメッセージが最もコンバージョン率が高い傾向にあります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">SNS・匿名相談: 潜在層へのアプローチ</h3>
        <p>X（旧Twitter）やInstagramでの啓発投稿は、まだ検査を具体的に検討していない潜在層へのリーチに効果的です。「こんな症状があったら検査を」「梅毒の初期症状チェックリスト」といった<strong>教育型コンテンツ</strong>が反応を得やすく、プロフィール欄からLINE友だち追加への導線を整備することで、将来の検査申込につなげます。</p>

        <BarChart
          data={[
            { label: "SEO（自然検索）", value: 2800, color: "bg-emerald-500" },
            { label: "リスティング広告", value: 5500, color: "bg-sky-500" },
            { label: "SNS広告", value: 4200, color: "bg-violet-500" },
            { label: "LINE友だち経由", value: 1500, color: "bg-amber-500" },
          ]}
          unit="円 チャネル別CPA（患者獲得単価）"
        />

        <p>チャネル別の患者獲得単価（CPA）を見ると、<strong>LINE友だち経由が1,500円と最も効率的</strong>です。一度友だち追加されれば、定期的な検査リマインドやキャンペーン情報を配信でき、リピート検査にもつながります。Lオペ for CLINICのセグメント配信を活用すれば、前回の検査時期や検査項目に基づいた<strong>パーソナライズされたリマインド</strong>が可能です。</p>

        <StatGrid stats={[
          { value: "68", unit: "%", label: "LINE経由の予約率" },
          { value: "45", unit: "%", label: "3ヶ月以内リピート率" },
          { value: "1,500", unit: "円", label: "LINE経由CPA" },
        ]} />

        <p>特筆すべきは<strong>リピート率の高さ</strong>です。性感染症の検査は「1回受けて終わり」ではなく、定期的な検査が推奨されるケースが多く、3ヶ月以内のリピート率は45%に達します。LINEでつながり続けることで、この高いリピート率を維持・向上できます。</p>
      </section>

      {/* ── セクション6: Lオペで実現するSTD診療の自動化 ── */}
      <section>
        <h2 id="lope-std" className="text-xl font-bold text-gray-800">Lオペで実現するSTD診療の自動化</h2>

        <p><strong>Lオペ for CLINIC</strong>は、性感染症のオンライン診療に必要な機能をワンストップで提供するクリニック専用LINE運用プラットフォームです。匿名予約から検査キットの配送管理、結果通知、処方リマインドまで、診療フロー全体をLINE上で自動化できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">匿名LINE予約</h3>
        <p>LINE友だち追加後、患者はニックネームのみで検査を申し込めます。問診はLINEのトーク画面上で自動的に進行し、症状に応じた最適な検査キットを自動提案。スタッフが介在しないため、患者は<strong>24時間いつでも人目を気にせず</strong>申し込みが可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">検査キット配送管理</h3>
        <p>Lオペの管理画面から検査キットの在庫管理・配送状況をリアルタイムに把握できます。配送完了時には患者に自動でLINE通知が届き、検体採取の手順ガイド動画も合わせて配信。<strong>キット到着から検体返送までの期間</strong>を管理画面でモニタリングし、未返送の患者にはリマインドを自動送信します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">結果通知の自動化</h3>
        <p>検査結果がラボから返ってきたら、医師の確認を経てLINEで結果を通知。陰性の場合はテンプレートメッセージで自動通知、陽性の場合は医師のオンライン診療予約への導線を自動で表示します。これにより、<strong>結果通知にかかるスタッフの工数を90%以上削減</strong>できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">処方・フォローアップ配信</h3>
        <p>処方薬の配送後は、フォローアップルールに基づいた経過確認メッセージをLINEで自動配信。治療完了の1ヶ月後には再検査の案内を送信し、<strong>治癒確認を徹底</strong>します。パートナー検査の案内もワンタップで送信でき、感染拡大の防止にも貢献します。</p>

        <FlowSteps steps={[
          { title: "Lオペ導入・LINE連携", desc: "クリニックのLINE公式アカウントにLオペを連携し、STD診療フローを設定" },
          { title: "問診・検査キット自動提案", desc: "LINE上の自動問診で症状を把握し、最適な検査キットを提案" },
          { title: "配送・検体管理", desc: "キットの発送から検体返送まで、一元管理ダッシュボードで把握" },
          { title: "結果通知・オンライン診療", desc: "陰性は自動通知、陽性は医師の診療予約へ自動誘導" },
          { title: "処方・フォローアップ", desc: "処方薬配送＋再検査案内のフォローアップを自動化" },
        ]} />

        <ResultCard
          before="月間検査件数 30件"
          after="月間検査件数 120件"
          metric="Lオペ導入で検査件数が4倍に増加"
          description="スタッフ増員なしで対応可能な体制を構築"
        />

        <p>Lオペ導入クリニックの実績では、<strong>月間検査件数が30件から120件へと4倍に増加</strong>しました。これはスタッフを増やさずに達成した数字であり、自動化による業務効率化の効果が如実に表れています。</p>

        <StatGrid stats={[
          { value: "96", unit: "%", label: "患者満足度" },
          { value: "240", unit: "万円", label: "月間売上（自費）" },
          { value: "90", unit: "%削減", label: "結果通知の工数" },
          { value: "45", unit: "%", label: "リピート検査率" },
        ]} />

        <p>月間売上は自費ベースで240万円に達し、患者満足度は96%を記録。<strong>プライバシーが守られている安心感</strong>と、<strong>LINEで完結する利便性</strong>が高い満足度の要因です。</p>

        <p>Lオペ for CLINICの月額費用は<strong>10〜18万円</strong>。月間売上240万円に対して投資対効果は非常に高く、<strong>導入初月から黒字化</strong>を達成するクリニックがほとんどです。スタッフの採用・教育コストの削減効果も含めると、実質的なROIはさらに高くなります。</p>

        <InlineCTA />
      </section>

      {/* ── セクション7: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 性感染症オンライン診療はプライバシーとLINE活用がカギ</h2>

        <p>性感染症の診療は、患者の「恥ずかしさ」という心理的バリアをいかに取り除くかが集患のカギです。オンライン診療とLINEを組み合わせることで、<strong>匿名性・利便性・プライバシー保護</strong>のすべてを高い水準で実現し、これまで受診をためらっていた膨大な潜在患者層を取り込むことができます。</p>

        <Callout type="success" title="性感染症オンライン診療 成功の3要素">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>プライバシーファースト</strong> — 匿名予約・暗号化通信・配慮された配送で、患者が安心して検査を受けられる環境を構築</li>
            <li><strong>LINEで完結するフロー</strong> — 問診・検査申込・結果通知・処方・フォローアップまでをLINE上でシームレスに提供</li>
            <li><strong>自動化による効率化</strong> — Lオペ for CLINICで診療フロー全体を自動化し、スタッフ負荷なく検査件数を4倍に拡大</li>
          </ol>
        </Callout>

        <p>Lオペ for CLINICは、性感染症のオンライン診療に最適化されたLINE運用プラットフォームです。匿名予約・検査キット管理・結果通知・処方リマインドまで、すべてをワンストップで自動化できます。<Link href="/lp/column/online-clinic-complete-guide" className="text-emerald-700 underline">オンライン診療の始め方</Link>や、<Link href="/lp/column/online-clinic-regulations" className="text-emerald-700 underline">規制対応のポイント</Link>もあわせてご確認ください。</p>

        <p>性感染症のオンライン診療の立ち上げを検討されているクリニック様は、まずは<Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談</Link>からお気軽にお問い合わせください。プライバシーに配慮した診療フローの設計から、集患戦略の立案まで、Lオペチームが一貫してサポートいたします。</p>
      </section>
    </ArticleLayout>
  );
}
