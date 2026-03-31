"use client";

import { Section, Label, Title, Sub, MockWindow } from "./shared";
import { FadeIn } from "./animations";

/* ═══════════════════════════════════════════════════════════ USE CASES ═══ */
export default function UseCases() {
  return (
    <Section id="usecases" className="bg-slate-50/50">
      <div className="text-center"><Label>USE CASES</Label><Title>現場のリアルな1日で見る活用シーン</Title><Sub>クリニックの日常業務がどう変わるのか、場面ごとに具体的にご紹介します。</Sub></div>
      <div className="space-y-20">

        {/* ── シーン1: 朝の業務開始 ── */}
        <FadeIn>
          <article>
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">01</span>
              <div><h3 className="text-xl font-extrabold text-slate-900">朝の業務開始</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">ダッシュボード</span></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 課題 */}
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">予約台帳・売上表・LINE管理画面を3つ開いて確認。毎朝15分のロスが発生している。</p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {["予約台帳.xlsx", "売上表.xlsx", "LINE公式"].map((t) => (
                      <div key={t} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-[14px]">{t.includes("LINE") ? "💬" : "📄"}</div>
                        <div className="text-[11px] text-slate-500">{t}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-[12px] text-rose-400">3つのツールを行き来して毎朝確認...</p>
                </div>
              </div>
              {/* 変化 */}
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">ダッシュボード1画面で予約数・売上・対応状況を一覧。1分で業務スタート。</p>
                <MockWindow title="ダッシュボード">
                  <div className="grid grid-cols-3 gap-2">
                    {[{ l: "本日の予約", v: "24件", c: "text-blue-600", bg: "bg-blue-50" }, { l: "月間売上", v: "¥3.2M", c: "text-amber-600", bg: "bg-amber-50" }, { l: "未対応", v: "3件", c: "text-rose-600", bg: "bg-rose-50" }].map((k) => (
                      <div key={k.l} className={`rounded-lg ${k.bg} p-2.5 text-center`}>
                        <div className="text-[10px] text-slate-400">{k.l}</div>
                        <div className={`text-[15px] font-bold ${k.c}`}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                    <div className="mb-1 text-[10px] font-semibold text-slate-400">月間売上推移</div>
                    <div className="flex items-end gap-0.5" style={{ height: 40 }}>
                      {[30, 45, 35, 55, 50, 65, 72, 58, 68, 75, 62, 80].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                    </div>
                  </div>
                </MockWindow>
              </div>
            </div>
          </article>
        </FadeIn>

        {/* ── シーン2: 新患の友だち追加 ── */}
        <FadeIn>
          <article>
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">02</span>
              <div><h3 className="text-xl font-extrabold text-slate-900">新患の友だち追加</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">アクション自動化</span></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">友だち追加後に手動で挨拶メッセージを送り、問診票URLを別途送付する手間がかかる。</p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="space-y-2">
                    {["① 友だち追加を確認", "② 手動で挨拶メッセージ送信", "③ 問診票URLをコピーして送付", "④ 対応済みをメモに記録"].map((s) => (
                      <div key={s} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12px] text-slate-500">
                        <span className="text-rose-400">→</span>{s}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-[12px] text-rose-400">すべて手作業で対応漏れのリスクあり</p>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">友だち追加と同時に挨拶・問診フォーム案内・リッチメニュー切替が全自動で実行。</p>
                <MockWindow title="アクション自動化">
                  <div className="space-y-1.5">
                    {[
                      { s: "1", l: "挨拶メッセージ送信", d: "友だち追加直後", c: "border-blue-200 bg-blue-50" },
                      { s: "2", l: "問診フォーム案内", d: "30秒後", c: "border-sky-200 bg-sky-50" },
                      { s: "3", l: "タグ「新規」付与", d: "即時", c: "border-violet-200 bg-violet-50" },
                      { s: "4", l: "リッチメニュー切替", d: "即時", c: "border-pink-200 bg-pink-50" },
                    ].map((a, i) => (
                      <div key={a.s}>
                        <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${a.c}`}>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 shadow-sm">{a.s}</span>
                          <div><div className="text-[12px] font-semibold text-slate-700">{a.l}</div><div className="text-[10px] text-slate-400">{a.d}</div></div>
                        </div>
                        {i < 3 && <div className="ml-6 flex h-2 items-center"><div className="h-full w-px bg-slate-200" /></div>}
                      </div>
                    ))}
                  </div>
                </MockWindow>
              </div>
            </div>
          </article>
        </FadeIn>

        {/* ── シーン3: 再診促進の配信 ── */}
        <FadeIn>
          <article>
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">03</span>
              <div><h3 className="text-xl font-extrabold text-slate-900">再診促進の配信</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">セグメント配信</span></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">Excelで該当患者を手動抽出し、一人ずつLINE送信。半日がかりの作業。</p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="grid grid-cols-4 gap-px bg-slate-100 text-[10px] font-semibold text-slate-400">{["名前", "最終来院", "タグ", "送信"].map((h) => <div key={h} className="bg-slate-50 px-2 py-1.5">{h}</div>)}</div>
                    {[{ n: "A様", d: "11/5", t: "美容", s: "未送信" }, { n: "B様", d: "10/20", t: "美容", s: "未送信" }, { n: "C様", d: "10/8", t: "美容", s: "未送信" }].map((r) => (
                      <div key={r.n} className="grid grid-cols-4 gap-px border-t border-slate-100 text-[10px] text-slate-500">{[r.n, r.d, r.t, r.s].map((v, vi) => <div key={vi} className="bg-white px-2 py-1.5">{v}</div>)}</div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-[12px] text-rose-400">142人を1件ずつ手動で送信...</p>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">セグメント条件を設定しテンプレートで一括配信。わずか10分で完了。</p>
                <MockWindow title="セグメント配信">
                  <div className="mb-3 rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-500">配信条件</div>
                    <div className="flex flex-wrap gap-2">
                      {["最終来院: 3ヶ月以上前", "タグ: 美容"].map((t) => <span key={t} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600">{t}</span>)}
                    </div>
                  </div>
                  <div className="mb-3 rounded-lg bg-blue-50 p-3">
                    <div className="flex items-center justify-between">
                      <div><div className="text-[11px] text-slate-400">対象</div><div className="text-lg font-bold text-blue-600">142人</div></div>
                      <div><div className="text-[11px] text-slate-400">テンプレート</div><div className="text-[12px] font-medium text-slate-600">再診のご案内</div></div>
                    </div>
                  </div>
                  <button className="w-full rounded-lg bg-blue-500 py-2.5 text-[12px] font-bold text-white">配信を実行する</button>
                </MockWindow>
              </div>
            </div>
          </article>
        </FadeIn>

        {/* ── シーン4: 予約前日のリマインド ── */}
        <FadeIn>
          <article>
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">04</span>
              <div><h3 className="text-xl font-extrabold text-slate-900">予約前日のリマインド</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">リマインド配信</span></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">受付スタッフが電話で1件ずつリマインド連絡。1時間以上のルーティン作業。</p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="rounded-full bg-white p-3 shadow"><span className="text-2xl">📞</span></div>
                    <div className="text-[13px] text-slate-500">
                      <div>星野 さくら様 → 電話 → 不在</div>
                      <div>青山 はるか様 → 電話 → 確認OK</div>
                      <div>緑川 大輝様 → 電話 → 留守電</div>
                      <div className="text-rose-400">...あと21件</div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[12px] text-rose-400">電話が繋がらず何度もかけ直し...</p>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">予約患者へLINEリマインドを一括送信。送信結果もリアルタイムで確認。</p>
                <MockWindow title="リマインド一括送信">
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5">
                    <span className="text-[12px] font-semibold text-blue-700">明日の予約: 24件</span>
                    <span className="rounded bg-blue-500 px-3 py-1 text-[11px] font-bold text-white">一括送信</span>
                  </div>
                  <div className="space-y-1.5">
                    {[{ n: "星野 さくら", t: "10:00", s: "送信済み" }, { n: "青山 はるか", t: "10:30", s: "送信済み" }, { n: "緑川 大輝", t: "11:00", s: "送信済み" }, { n: "白石 あおい", t: "11:30", s: "送信済み" }].map((r) => (
                      <div key={r.n} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-3"><span className="text-[12px] font-medium text-slate-700">{r.n}</span><span className="text-[10px] text-slate-400">{r.t}</span></div>
                        <span className="text-[11px] font-bold text-blue-600">{r.s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-center text-[13px] font-bold text-blue-600">24件 送信完了</div>
                </MockWindow>
              </div>
            </div>
          </article>
        </FadeIn>

        {/* ── シーン5: 処方後の配送 ── */}
        <FadeIn>
          <article>
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">05</span>
              <div><h3 className="text-xl font-extrabold text-slate-900">処方後の配送</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">配送管理</span></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">配送業者サイトで送り状を個別作成し、追跡番号を手動でLINE送信。</p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="space-y-2">
                    {["① 配送業者サイトで送り状を1件ずつ入力", "② 追跡番号をメモにコピー", "③ LINEで患者に追跡番号を個別送信"].map((s) => (
                      <div key={s} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12px] text-slate-500">
                        <span className="text-rose-400">→</span>{s}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-[12px] text-rose-400">コピペミスで追跡番号の取り違えリスク</p>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">配送CSVをワンクリック出力 → 追跡番号一括登録 → 患者へ自動通知。</p>
                <MockWindow title="配送管理">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-slate-700">本日出荷予定: 8件</span>
                    <span className="rounded bg-blue-500 px-3 py-1 text-[11px] font-bold text-white">配送CSV出力</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { n: "星野 さくら", s: "出荷待ち", sc: "text-amber-600 bg-amber-50" },
                      { n: "青山 はるか", s: "出荷済み", sc: "text-blue-600 bg-blue-50", tr: "4912-3456-7890" },
                      { n: "朝日 翔太", s: "配達完了", sc: "text-emerald-600 bg-emerald-50", tr: "4912-1234-5678" },
                    ].map((r) => (
                      <div key={r.n} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-[12px] font-medium text-slate-700">{r.n}</span>
                        <div className="flex items-center gap-2">
                          {r.tr && <span className="text-[10px] text-slate-400">{r.tr}</span>}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.sc}`}>{r.s}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 text-center">追跡番号登録時にLINE自動通知</div>
                </MockWindow>
              </div>
            </div>
          </article>
        </FadeIn>

        {/* ── シーン6: 月末の経営分析 ── */}
        <FadeIn>
          <article>
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[15px] font-bold text-white shadow">06</span>
              <div><h3 className="text-xl font-extrabold text-slate-900">月末の経営分析</h3><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">売上管理</span></div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] text-rose-500">&#10005;</span><span className="text-[15px] font-bold text-rose-600">課題</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">クレカ管理・銀行口座・予約台帳を突き合わせてExcelで集計。丸1日の作業。</p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {["クレカ管理画面", "銀行口座明細", "予約台帳Excel"].map((t) => (
                      <div key={t} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
                        <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-[12px]">📄</div>
                        <div className="text-[10px] text-slate-500">{t}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-1 text-[12px] text-rose-400">
                    <span>→ 手動で突き合わせ →</span><span className="font-bold">丸1日</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] text-blue-600">&#10003;</span><span className="text-[15px] font-bold text-blue-600">変化</span></div>
                <p className="mb-4 text-[15px] leading-relaxed text-slate-600">売上ダッシュボードで月間KPIを即確認。CSVエクスポートもワンクリック。</p>
                <MockWindow title="売上管理 — 月次レポート">
                  <div className="grid grid-cols-3 gap-2">
                    {[{ l: "月間売上", v: "¥4.8M", c: "text-blue-600", bg: "bg-blue-50" }, { l: "前月比", v: "+12%", c: "text-emerald-600", bg: "bg-emerald-50" }, { l: "リピート率", v: "68%", c: "text-violet-600", bg: "bg-violet-50" }].map((k) => (
                      <div key={k.l} className={`rounded-lg ${k.bg} p-2.5 text-center`}>
                        <div className="text-[10px] text-slate-400">{k.l}</div>
                        <div className={`text-[15px] font-bold ${k.c}`}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                    <div className="mb-1 text-[10px] font-semibold text-slate-400">月間売上推移</div>
                    <div className="flex items-end gap-0.5" style={{ height: 48 }}>
                      {[40, 55, 48, 62, 58, 70, 65, 75, 68, 80, 72, 85].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end"><span className="rounded bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">CSV出力</span></div>
                </MockWindow>
              </div>
            </div>
          </article>
        </FadeIn>

      </div>
    </Section>
  );
}
