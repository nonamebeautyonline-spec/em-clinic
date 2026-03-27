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

const SLUG = "doctor-side-business-online-clinic";
const SITE_URL = "https://l-ope.jp";

const meta = {
  slug: SLUG,
  title: "勤務医のオンライン副業開業ガイド — 本業を続けながら月200〜300万円の副収入を実現する方法",
  description: "勤務医が本業を続けながらオンライン自費クリニックを副業的に開業する方法を徹底解説。週末・夜間だけの診療でも月200〜300万円の副収入が可能な理由、開設届の手続き、DX活用による1人運営体制、税務・法人化のタイミングまで網羅。",
  date: "2026-03-23",
  category: "開業・経営",
  readTime: "14分",
  tags: ["勤務医 副業", "オンライン診療 副業", "医師 副業 開業", "自費クリニック", "オンライン診療"],
};

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${SLUG}` },
  openGraph: { title: meta.title, description: meta.description, url: `${SITE_URL}/lp/column/${SLUG}`, type: "article", publishedTime: meta.date },
};


const keyPoints = [
  "勤務医が本業を続けながらオンライン自費クリニックを開業し、月200〜300万円の副収入を得る具体的ロードマップ",
  "ワンルームマンション（月10万円程度）＋DX活用で初期投資を最小化し、Dr1人でも回る運営体制を構築",
  "保険点数削減が進む時代に自費オンライン診療で経済合理性を確保し、キャリアのリスクヘッジを実現",
];

const toc = [
  { id: "why-side-business", label: "なぜ今、勤務医の副業開業なのか" },
  { id: "economics", label: "保険 vs 自費 — 経済合理性の比較" },
  { id: "minimum-setup", label: "ミニマム開業に必要なもの" },
  { id: "regulations", label: "副業規定・開設届の手続き" },
  { id: "weekly-schedule", label: "1週間スケジュールモデル" },
  { id: "dx-operation", label: "DX活用でDr1人運営を実現" },
  { id: "revenue-simulation", label: "収益シミュレーション" },
  { id: "tax-corporate", label: "税務・法人化のタイミング" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={SLUG} breadcrumbLabel="開業・経営" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「本業の研鑽は続けたい。でも将来の収入に不安がある」——勤務医から最も多く寄せられる相談です。保険点数の引き下げが続く中、<strong>自費オンライン診療</strong>は勤務医にとって最も合理的な副業の選択肢になりつつあります。週末・夜間だけの診療でも<strong>月200〜300万円の副収入</strong>が見込め、ワンルームマンション1室とDXツールがあればDr1人で開業可能。本記事では、勤務医が本業を続けながらオンライン自費クリニックを副業的に開業するための具体的なロードマップを、法規制・税務・運営体制まで含めて徹底解説します。
      </p>

      {/* ── セクション1: なぜ今、勤務医の副業開業なのか ── */}
      <section>
        <h2 id="why-side-business" className="text-xl font-bold text-gray-800">なぜ今、勤務医の副業開業なのか</h2>

        <p>勤務医の平均年収は約1,200〜1,500万円。一見高収入に見えますが、長時間労働・当直・学会費用を考慮すると時給換算では決して高くありません。さらに、2024年4月施行の医師の働き方改革により、従来の「アルバイト当直」で稼ぐモデルにも限界が見え始めています。</p>

        <p>一方で、自費オンライン診療の市場は急拡大しています。AGA治療、ED治療、ダイエット処方（GLP-1）、ピル処方、不眠症治療——これらの領域は対面診察の必要性が低く、オンライン完結型の診療と極めて相性が良い分野です。</p>

        <StatGrid stats={[
          { value: "1,500", unit: "万円", label: "勤務医の平均年収上限" },
          { value: "200〜300", unit: "万円/月", label: "副業クリニックの収入目安" },
          { value: "10", unit: "万円/月", label: "ミニマム開業の固定費" },
          { value: "週2〜3", unit: "日", label: "必要な診療日数" },
        ]} />

        <p>重要なのは、副業開業が単なる「お金稼ぎ」ではないことです。<strong>本業で臨床の研鑽を積みながら、自費領域で経営スキルと収入源を同時に確保する</strong>——これはキャリア戦略としても極めて合理的です。将来的に独立開業する際のリスクヘッジにもなります。</p>

        <Callout type="point" title="副業開業が注目される3つの理由">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>保険点数の削減トレンド</strong> — 診療報酬改定のたびに点数は下がり、保険診療の収益性は構造的に低下</li>
            <li><strong>医師の働き方改革</strong> — 当直バイトの制限で従来の副収入モデルが崩壊しつつある</li>
            <li><strong>オンライン診療の規制緩和</strong> — 2022年の診療報酬改定で初診からのオンライン診療が解禁</li>
          </ol>
        </Callout>

        <p><Link href="/lp/column/online-clinic-complete-guide" className="text-emerald-700 underline">オンラインクリニック開業完全ガイド</Link>でもオンライン診療の全体像を解説していますが、本記事では特に「勤務医が本業を続けながら」という視点に特化して解説していきます。</p>
      </section>

      {/* ── セクション2: 保険 vs 自費の経済合理性 ── */}
      <section>
        <h2 id="economics" className="text-xl font-bold text-gray-800">保険 vs 自費 — 経済合理性の徹底比較</h2>

        <p>副業で開業するなら、保険診療と自費診療のどちらが合理的か。結論から言えば、<strong>副業開業においては自費診療一択</strong>です。その理由を数字で比較します。</p>

        <ComparisonTable
          headers={["項目", "保険診療", "自費診療（オンライン）"]}
          rows={[
            ["1件あたり単価", "3,000〜5,000円", "8,000〜25,000円"],
            ["診療時間/件", "10〜15分", "5〜10分（問診DX活用）"],
            ["レセプト業務", "必須（膨大な事務）", "不要"],
            ["施設基準", "厳格（設備投資大）", "最低限でOK"],
            ["スタッフ", "看護師・事務必須", "Dr1人で可能"],
            ["患者単価の上限", "点数で固定", "自由に設定可能"],
            ["開業初期投資", "2,000〜5,000万円", "50〜100万円"],
          ]}
        />

        <p>保険診療は施設基準を満たすための設備投資が莫大で、レセプト業務のための事務スタッフも必要です。副業として片手間で運営するには現実的ではありません。一方、自費オンライン診療は<strong>物理的な診療設備が最低限で済み、レセプト不要、Dr1人で完結</strong>します。</p>

        <BarChart
          data={[
            { label: "保険（初期投資）", value: 3000, color: "bg-gray-400" },
            { label: "自費対面（初期投資）", value: 1000, color: "bg-sky-400" },
            { label: "自費オンライン（初期投資）", value: 80, color: "bg-emerald-500" },
          ]}
          unit="万円"
        />

        <p>上記のように、自費オンライン診療の初期投資は保険診療の<strong>1/40以下</strong>。副業としてミニマムに始めるには圧倒的に低リスクです。「うまくいかなければ撤退する」という選択肢を持てること自体が、勤務医にとって大きなメリットです。</p>

        <Callout type="info" title="保険点数削減の現実">
          2024年度の診療報酬改定では本体部分が+0.88%とされたものの、薬価は-1.00%で実質マイナス改定。過去20年で見ると、保険診療の収益性は構造的に低下し続けています。勤務医としての本業収入が将来も安泰とは限らない中、<strong>自費の収入源を持つことはキャリアの保険</strong>です。
        </Callout>

        <p><Link href="/lp/column/online-medical-cost" className="text-emerald-700 underline">オンライン診療の費用と収益性</Link>についても合わせてご確認ください。</p>
      </section>

      <InlineCTA />

      {/* ── セクション3: ミニマム開業に必要なもの ── */}
      <section>
        <h2 id="minimum-setup" className="text-xl font-bold text-gray-800">ミニマム開業に必要なもの — 初期費用50〜100万円のリアル</h2>

        <p>「開業」と聞くと数千万円の投資を想像しがちですが、自費オンライン診療であれば驚くほどミニマムに始められます。必要なものを具体的にリストアップします。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 診療場所 — ワンルームマンション1室（月10万円程度）</h3>
        <p>医療法上、クリニックの開設には「診療所」としての届出が必要で、自宅住所では基本的に認められません。しかし、オンライン診療主体であれば、<strong>ワンルームマンション1室で十分</strong>です。都心部でも月10万円程度で確保可能。診療所としての構造設備基準（管理者室・診察室の区分）を満たす間取りを選びましょう。不動産契約時に「診療所」としての使用が可能か確認が必要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 通信環境・機材</h3>
        <p>高速インターネット回線（光回線推奨）、PC、Webカメラ、マイク。オンライン診療においてビデオ通話の品質は患者満足度に直結するため、カメラとマイクには1〜2万円程度投資する価値があります。合計で5万円程度です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. DXツール一式</h3>
        <p>LINE予約管理・オンライン問診・患者CRM・配送管理・決済連携——これらを個別に契約すると月額30万円以上かかりますが、<strong>Lオペ for CLINICならクリニック運営に必要な機能がオールインワンで月額10〜18万円</strong>。副業開業において固定費を抑えることは最重要課題であり、統合型ツールの選択は経営判断として合理的です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. 医薬品・配送体制</h3>
        <p>自費診療で処方する医薬品は医薬品卸から仕入れます。オンライン診療の場合、処方薬を患者宅に配送する必要があるため、配送オペレーションの構築が不可欠です。Lオペの配送管理機能を活用すれば、処方から配送手配・追跡番号の通知までをLINE上で一元管理できます。</p>

        <ComparisonTable
          headers={["項目", "費用（初期）", "費用（月額）"]}
          rows={[
            ["ワンルームマンション（敷金・礼金）", "30〜40万円", "10万円"],
            ["通信環境・機材", "5万円", "0.5万円"],
            ["DXツール（Lオペ for CLINIC）", "0円", "10〜18万円"],
            ["医薬品初回仕入れ", "10〜20万円", "売上連動"],
            ["開業届・各種届出費用", "5万円", "—"],
            ["合計", "50〜70万円", "20〜29万円"],
          ]}
        />

        <ResultCard
          before="従来の開業 初期投資2,000〜5,000万円"
          after="オンライン副業開業 初期投資50〜70万円"
          metric="初期投資を1/40以下に圧縮"
          description="固定費も月20〜29万円に抑制、損益分岐点が極めて低い"
        />

        <p>月額固定費が約25万円であれば、<strong>月10人の患者を診るだけで損益分岐</strong>を超えます。副業として始めるにはリスクが極めて低い水準です。</p>
      </section>

      {/* ── セクション4: 副業規定・開設届 ── */}
      <section>
        <h2 id="regulations" className="text-xl font-bold text-gray-800">副業規定・開設届の手続き — 法的にクリアすべきポイント</h2>

        <p>勤務医が副業として開業する際、最も慎重に対処すべきなのが法規制と勤務先との関係です。ここを疎かにするとキャリアリスクにつながるため、確実に押さえてください。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">勤務先の副業規定を確認する</h3>
        <p>まず最優先で確認すべきは、勤務先の就業規則における副業規定です。国公立病院の場合は公務員法の兼業規定が適用され、原則として許可が必要です。民間病院の場合は就業規則次第ですが、近年は副業を容認する方向に進んでいます。いずれにしても、<strong>事前に人事部門に確認し、必要であれば書面で許可を得る</strong>ことが鉄則です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">診療所開設届の提出</h3>
        <p>個人開設の場合、診療所の所在地を管轄する保健所に「診療所開設届」を提出します（開設後10日以内）。医師免許証の写し、履歴書、診療所の平面図、賃貸借契約書の写しなどが必要です。オンライン診療主体であっても、物理的な診療所としての届出は必須です。</p>

        <FlowSteps steps={[
          { title: "STEP 1: 勤務先の副業規定確認", desc: "就業規則を確認し、必要に応じて上長・人事に副業許可を申請。書面での許可取得を推奨" },
          { title: "STEP 2: 物件契約", desc: "診療所として使用可能なワンルームマンションを契約。管理組合の許可も確認" },
          { title: "STEP 3: 保健所への事前相談", desc: "管轄保健所に診療所開設の事前相談。構造設備基準の確認と必要書類のリストを入手" },
          { title: "STEP 4: 診療所開設届の提出", desc: "開設後10日以内に保健所へ届出。併せて厚生局へ保険医療機関の届出は不要（自費のみ）" },
          { title: "STEP 5: 税務署への届出", desc: "個人事業の開業届（開業後1ヶ月以内）+ 青色申告承認申請書の提出" },
        ]} />

        <Callout type="warning" title="国公立病院勤務の場合の注意点">
          国公立病院の医師は地方公務員法または国家公務員法の適用を受けるため、兼業には任命権者の許可が必要です。近年は「医業に関する兼業」は比較的許可されやすい傾向にありますが、<strong>無届での開業は懲戒処分の対象</strong>となり得ます。必ず事前に手続きを踏んでください。
        </Callout>

        <p>なお、自費診療のみの場合は保険医療機関の指定申請は不要です。これにより手続きが大幅に簡略化され、<strong>最短2〜3週間で開業</strong>することも可能です。<Link href="/lp/column/online-clinic-regulations" className="text-emerald-700 underline">オンライン診療の法規制ガイド</Link>も併せてご確認ください。</p>
      </section>

      <InlineCTA />

      {/* ── セクション5: 1週間スケジュールモデル ── */}
      <section>
        <h2 id="weekly-schedule" className="text-xl font-bold text-gray-800">実際の1週間スケジュールモデル — 本業と両立するリアルな運営</h2>

        <p>「本業を続けながら本当にクリニック運営ができるのか？」——最も多い疑問にお答えします。結論から言えば、<strong>オンライン診療＋DX活用であれば週2〜3日、1日2〜3時間の稼働で十分</strong>です。</p>

        <ComparisonTable
          headers={["曜日", "本業（勤務医）", "副業クリニック"]}
          rows={[
            ["月曜", "通常勤務 8:30-17:30", "—"],
            ["火曜", "通常勤務 8:30-17:30", "20:00-22:00 オンライン診療"],
            ["水曜", "通常勤務 8:30-17:30", "—"],
            ["木曜", "通常勤務 8:30-17:30", "20:00-22:00 オンライン診療"],
            ["金曜", "通常勤務 8:30-17:30", "—"],
            ["土曜", "—（休日）", "10:00-13:00 / 14:00-17:00 オンライン診療"],
            ["日曜", "—（休日）", "事務作業 1〜2時間（任意）"],
          ]}
        />

        <p>上記モデルでは、<strong>平日夜2日（各2時間）＋土曜1日（6時間）= 週10時間</strong>の稼働です。1回のオンライン診療は5〜10分程度なので、2時間で12〜15人の診察が可能。週に36〜45人、月に150〜180人の診療ができます。</p>

        <StatGrid stats={[
          { value: "10", unit: "時間/週", label: "副業クリニックの稼働時間" },
          { value: "150〜180", unit: "人/月", label: "月間診療可能患者数" },
          { value: "5〜10", unit: "分/件", label: "1件あたり診療時間" },
          { value: "0", unit: "時間", label: "レセプト業務" },
        ]} />

        <p>ポイントは、<strong>診療以外の業務がほぼゼロ</strong>であることです。予約管理はLINE予約で自動化、問診はオンライン問診で事前収集、決済はSquare連携で自動処理、処方薬の配送手配もシステムで管理。従来のクリニック経営では考えられないほど、<strong>Dr自身が診療だけに集中できる環境</strong>が構築できます。</p>

        <Callout type="info" title="患者は「夜間・土日」を求めている">
          日中仕事がある会社員にとって、平日夜や土日にオンラインで受診できるクリニックは極めて高いニーズがあります。勤務医の「本業の合間」というスケジュールは、実は<strong>患者のニーズと完璧に合致</strong>しているのです。
        </Callout>
      </section>

      {/* ── セクション6: DX活用でDr1人運営 ── */}
      <section>
        <h2 id="dx-operation" className="text-xl font-bold text-gray-800">DX活用でDr1人運営を実現 — Lオペ for CLINICの活用法</h2>

        <p>副業クリニックで最もやってはいけないのが「スタッフを雇う」ことです。人件費は固定費の中で最も重く、副業の利益を一気に圧迫します。<strong>DXツールを徹底活用し、Dr1人で回す体制</strong>を構築することが副業開業の成功条件です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE予約管理 — 受付スタッフ不要</h3>
        <p>Lオペ for CLINICのLINE予約管理機能を使えば、患者がLINEから24時間いつでも予約可能。予約確認・リマインドも自動送信されるため、電話対応や予約管理のスタッフは不要です。キャンセルや変更もLINE上で完結します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">オンライン問診 — 診療前の情報収集を自動化</h3>
        <p>予約完了と同時にLINEでオンライン問診が配信され、患者は診療前に回答を完了。診療時にはすでに問診結果が手元にある状態で診察を開始できるため、<strong>1件あたりの診療時間を5〜10分に短縮</strong>できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">AI自動返信・キーワード自動返信 — 問い合わせ対応の自動化</h3>
        <p>「料金はいくらですか？」「副作用はありますか？」といったよくある質問にはAI自動返信が対応。さらに、特定キーワードに対するテンプレートメッセージを設定しておけば、定型的な問い合わせは完全に自動化されます。Dr不在の時間帯でも患者からの問い合わせに即時対応が可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">配送管理・決済連携（Square） — バックオフィスの自動化</h3>
        <p>処方薬の配送手配はLオペの配送管理機能で一元管理。追跡番号の自動通知もLINEで完結します。決済はSquare連携により、クレジットカード決済がオンラインで完結。入金確認や請求書発行の手間が不要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">患者CRM・タグ管理 — リピート患者の管理</h3>
        <p>患者ごとの診療履歴・処方履歴・タグ情報をCRMで一元管理。再処方のタイミングが来た患者にはフォローアップルールに基づいてLINEで自動リマインド。セグメント配信で症状別の情報提供も可能です。</p>

        <FlowSteps steps={[
          { title: "予約", desc: "LINE予約管理で24時間自動受付。リマインドも自動配信" },
          { title: "問診", desc: "オンライン問診を予約時に自動配信。回答結果をDr画面に即時反映" },
          { title: "診療", desc: "ビデオ通話で5〜10分の診察。問診データ参照で効率的に対応" },
          { title: "決済", desc: "Square連携でクレジットカード決済をオンライン完結" },
          { title: "配送", desc: "配送管理で処方薬を手配。追跡番号をLINEで自動通知" },
          { title: "フォロー", desc: "フォローアップルールで再診リマインドを自動送信。リピートを促進" },
        ]} />

        <p>上記の6ステップのうち、Drが直接関与するのは「診療」の5〜10分だけ。残りはすべてDXツールが自動処理します。これが<strong>Dr1人でも月150〜180人の診療を実現</strong>できる仕組みです。</p>

        <ResultCard
          before="従来の開業: Dr + 看護師 + 受付 + 事務（人件費月80〜120万円）"
          after="DX副業開業: Dr1人 + Lオペ for CLINIC（月10〜18万円）"
          metric="人件費を1/6以下に圧縮"
          description="LINE予約・オンライン問診・AI自動返信・配送管理・決済連携で完全自動化"
        />

        <p><Link href="/lp/column/clinic-dx-complete-guide" className="text-emerald-700 underline">クリニックDX完全ガイド</Link>や<Link href="/lp/column/busy-doctor-efficiency" className="text-emerald-700 underline">多忙なドクターの業務効率化</Link>も参考にしてください。</p>
      </section>

      <InlineCTA />

      {/* ── セクション7: 収益シミュレーション ── */}
      <section>
        <h2 id="revenue-simulation" className="text-xl font-bold text-gray-800">収益シミュレーション — 月200〜300万円のリアルな数字</h2>

        <p>副業クリニックの収益性を具体的な数字でシミュレーションします。ここでは自費オンライン診療の代表的な領域であるAGA治療を例に計算します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">AGA治療のケース</h3>

        <ComparisonTable
          headers={["項目", "数値", "備考"]}
          rows={[
            ["月間新規患者", "30人", "広告+LINE集患"],
            ["月間リピート患者", "120人", "初月から6ヶ月後想定"],
            ["診療単価（初診）", "15,000円", "初回カウンセリング+処方"],
            ["診療単価（再診）", "12,000円", "処方のみ（3ヶ月分）"],
            ["月間売上", "189万円", "15,000×30 + 12,000×120 ÷ 3"],
            ["薬剤原価", "約40万円", "売上の約20%"],
            ["固定費（家賃+DX）", "28万円", "マンション10万+Lオペ18万"],
            ["広告費", "15万円", "LINE広告+リスティング"],
            ["その他経費", "5万円", "通信費・消耗品等"],
            ["月間利益", "約100万円", "開業6ヶ月目想定"],
          ]}
        />

        <p>これは控えめな見積もりです。開業12ヶ月後にはリピート患者が蓄積し、月間売上は300万円を超えるモデルとなります。</p>

        <BarChart
          data={[
            { label: "1ヶ月目", value: 45, color: "bg-gray-300" },
            { label: "3ヶ月目", value: 90, color: "bg-sky-300" },
            { label: "6ヶ月目", value: 150, color: "bg-sky-400" },
            { label: "9ヶ月目", value: 220, color: "bg-sky-500" },
            { label: "12ヶ月目", value: 300, color: "bg-emerald-500" },
          ]}
          unit="万円/月（売上推移）"
        />

        <p>この成長曲線のポイントは、<strong>リピート患者の積み上げ効果</strong>です。AGA治療は最低6ヶ月〜1年の継続が標準であるため、毎月の新規患者が蓄積してリピート患者数が右肩上がりに増加します。Lオペのフォローアップルール機能で処方タイミングのリマインドを自動化すれば、<strong>継続率は平均70〜80%</strong>を維持できます。</p>

        <StatGrid stats={[
          { value: "300", unit: "万円/月", label: "12ヶ月後の月間売上" },
          { value: "200", unit: "万円/月", label: "12ヶ月後の月間利益" },
          { value: "70〜80", unit: "%", label: "処方継続率" },
          { value: "3〜4", unit: "ヶ月", label: "損益分岐到達" },
        ]} />

        <Callout type="point" title="複数領域の展開で収益は加速">
          AGA単独でも月200万円以上の利益が見込めますが、ED治療やダイエット処方を追加すれば収益はさらに拡大します。オンライン問診のテンプレートとリッチメニューの診療メニューを追加するだけで、<strong>追加投資なしで複数領域</strong>に展開可能です。
        </Callout>
      </section>

      {/* ── セクション8: 税務・法人化 ── */}
      <section>
        <h2 id="tax-corporate" className="text-xl font-bold text-gray-800">税務・法人化のタイミング — 手取りを最大化する判断基準</h2>

        <p>副業クリニックの利益が増えてくると、税務戦略と法人化の判断が重要になります。ここを間違えると、本来手元に残るはずの利益が税金に消えていきます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">個人事業主として開始 — まずは青色申告</h3>
        <p>開業当初は個人事業主としてスタートし、<strong>青色申告の65万円控除</strong>を活用します。開業届と同時に「青色申告承認申請書」を税務署に提出してください（開業後2ヶ月以内）。帳簿はクラウド会計ソフト（freee、マネーフォワード等）で十分管理可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">法人化の判断基準 — 利益800万円がボーダーライン</h3>
        <p>個人事業の所得税は累進課税で、利益が増えるほど税率が上がります（最大55%）。一方、法人税は利益800万円以下が15%、800万円超が23.2%。<strong>副業クリニックの年間利益が800万円を超えたら法人化を検討</strong>すべきタイミングです。</p>

        <ComparisonTable
          headers={["年間利益", "個人の税負担（所得税+住民税）", "法人の税負担（法人税等）", "差額"]}
          rows={[
            ["500万円", "約150万円（30%）", "約125万円（25%）", "▲25万円"],
            ["800万円", "約280万円（35%）", "約200万円（25%）", "▲80万円"],
            ["1,200万円", "約480万円（40%）", "約310万円（26%）", "▲170万円"],
            ["2,000万円", "約900万円（45%）", "約520万円（26%）", "▲380万円"],
          ]}
        />

        <p>上記のように、年間利益2,000万円の場合、法人化するだけで<strong>年間380万円の節税効果</strong>があります。さらに、法人化すれば以下のメリットも享受できます。</p>

        <Callout type="success" title="法人化のメリット">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>役員報酬の給与所得控除</strong> — 利益を役員報酬として受け取ることで、給与所得控除が適用</li>
            <li><strong>経費の幅が広がる</strong> — 社宅、出張旅費日当、生命保険料など、個人では認められない経費が計上可能</li>
            <li><strong>社会保険の選択肢</strong> — 勤務先の社会保険との二重加入で将来の年金額が増加</li>
            <li><strong>事業承継・売却</strong> — 将来的にクリニックを売却する選択肢が生まれる</li>
          </ol>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">MS法人（メディカルサービス法人）の活用</h3>
        <p>クリニックとは別にMS法人を設立し、経営管理・マーケティング・物品販売などの業務をMS法人に委託する方法もあります。MS法人への業務委託費を通じた利益分散が可能ですが、税務調査で否認されないよう<strong>実態のある業務委託関係</strong>を構築する必要があります。税理士との相談が必須です。</p>

        <FlowSteps steps={[
          { title: "年間利益 〜500万円", desc: "個人事業主 + 青色申告で十分。経費計上と65万円控除を活用" },
          { title: "年間利益 500〜800万円", desc: "法人化を検討開始。税理士に相談し、シミュレーションを依頼" },
          { title: "年間利益 800万円〜", desc: "医療法人またはMS法人を設立。役員報酬設計で税負担を最適化" },
          { title: "年間利益 2,000万円〜", desc: "法人化は必須。節税だけでなく事業拡大（分院展開等）も視野に" },
        ]} />

        <p><Link href="/lp/column/clinic-fixed-cost-optimization" className="text-emerald-700 underline">クリニックの固定費最適化</Link>の記事も、経営の効率化に役立ちます。</p>
      </section>

      {/* ── セクション9: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 勤務医のオンライン副業開業は「今」始めるべき</h2>

        <p>本記事で解説した勤務医のオンライン副業開業のポイントを振り返ります。</p>

        <Callout type="success" title="副業開業の成功条件">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>自費オンライン診療を選択</strong> — 保険診療の10倍の利益率。レセプト不要、設備投資最小で副業に最適</li>
            <li><strong>ミニマム開業で固定費を抑える</strong> — ワンルーム1室+DXツールで初期50〜70万円、月額25万円以下</li>
            <li><strong>DXでDr1人運営を実現</strong> — LINE予約・AI自動返信・配送管理で診療以外を完全自動化</li>
            <li><strong>週10時間の稼働で月200〜300万円</strong> — リピート患者の積み上げで12ヶ月後に安定収益</li>
            <li><strong>利益800万円超で法人化</strong> — 税負担を最適化し、手取りを最大化</li>
          </ol>
        </Callout>

        <p>保険点数が削減され続ける時代に、本業の研鑽を続けながら自費の収入源を確保することは、勤務医にとって<strong>最も合理的なキャリア戦略</strong>です。オンライン診療の規制緩和、DXツールの進化、自費市場の拡大——これらの追い風が揃った「今」が副業開業の最適なタイミングです。</p>

        <p>Lオペ for CLINICは、副業開業に必要な機能（LINE予約管理・オンライン問診・AI自動返信・配送管理・決済連携・患者CRM・セグメント配信・ダッシュボード）を<strong>月額10〜18万円</strong>でオールインワン提供するクリニック専用プラットフォームです。Dr1人でも回る運営体制の構築を、技術面から全面サポートします。</p>

        <p>関連コラムもぜひご参照ください。<Link href="/lp/column/online-clinic-complete-guide" className="text-emerald-700 underline">オンラインクリニック開業完全ガイド</Link>では開業の全体像を、<Link href="/lp/column/online-clinic-regulations" className="text-emerald-700 underline">オンライン診療の法規制ガイド</Link>では規制面の詳細を、<Link href="/lp/column/self-pay-pricing-guide" className="text-emerald-700 underline">自費診療の価格設計ガイド</Link>では料金設定の考え方を、<Link href="/lp/column/clinic-dx-complete-guide" className="text-emerald-700 underline">クリニックDX完全ガイド</Link>ではDX導入の実践方法を解説しています。</p>

        <p>副業開業を本気で検討している勤務医の先生は、まずは<Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談</Link>からお気軽にお問い合わせください。現在の勤務状況に合わせた最適な開業プランを、具体的な収益シミュレーション付きでご提案いたします。</p>
      </section>
    </ArticleLayout>
  );
}
