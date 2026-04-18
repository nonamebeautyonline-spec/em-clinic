"use client";

import { MockWindow } from "./shared";

/* ──── CSS アニメーション用ユーティリティ（motion/react 不要） ──── */

function CSSFadeIn({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "right" | "none";
}) {
  const translate =
    direction === "up"
      ? "translateY(24px)"
      : direction === "right"
        ? "translateX(-24px)"
        : "none";
  return (
    <div
      className={`animate-[cssFadeIn_0.7s_ease-out_forwards] opacity-0 ${className}`}
      style={{
        animationDelay: `${delay}s`,
        ["--css-fade-translate" as string]: translate,
      }}
    >
      {children}
    </div>
  );
}

function CSSBlob({
  className = "",
  color = "bg-blue-100/40",
  size = 500,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-[100px] animate-[blobFloat_12s_ease-in-out_infinite] ${color} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function CSSPulseGlow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      <div className="absolute inset-0 animate-[pulseGlow_2.5s_ease-in-out_infinite] rounded-xl bg-blue-500/20 blur-xl" />
      <div className="relative transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98]">
        {children}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50" />
      <CSSBlob className="-top-40 right-0" color="bg-blue-100/40" size={500} />
      <CSSBlob className="-bottom-60 -left-40" color="bg-sky-100/30" size={600} />
      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <CSSFadeIn>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/60 px-4 py-1.5 text-[11px] font-semibold text-blue-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />クリニック・医療機関向けLINE公式アカウント運用プラットフォーム
              </div>
            </CSSFadeIn>
            <CSSFadeIn delay={0.1}>
              <h1 className="mb-6 text-[2.2rem] font-extrabold leading-[1.25] tracking-tight md:text-5xl lg:text-[3.2rem]">
                <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">クリニックのLINE公式アカウント運用</span><br />予約・問診・オンライン診療を<br />LINEで一元化
              </h1>
              <p className="sr-only">Lオペ（エルオペ）はクリニック・医療機関のLINE公式アカウント運用に特化したプラットフォームです。オンライン診療・予約管理・問診・AI自動返信をLINEで完結。</p>
            </CSSFadeIn>
            <CSSFadeIn delay={0.2}>
              <p className="mb-8 max-w-lg text-[15px] leading-[1.8] text-slate-500">
                クリニック向けLINE公式アカウント運用プラットフォーム「Lオペ」なら、患者CRM・セグメント配信・リッチメニュー・問診・予約管理・オンライン診療・会計・配送・AI自動返信まで。LINE公式アカウントを起点にクリニック運営のすべてをワンストップで実現します。
              </p>
            </CSSFadeIn>
            <CSSFadeIn delay={0.3}>
              <div className="flex flex-wrap gap-3">
                <CSSPulseGlow>
                  <a href="/clinic/contact" className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">無料で資料請求</a>
                </CSSPulseGlow>
                <a href="#features" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">機能を見る</a>
              </div>
            </CSSFadeIn>
            <CSSFadeIn delay={0.5}>
              <div className="mt-10 flex flex-wrap gap-6 text-[11px] text-slate-400">
                {["初期設定サポート無料", "最短2週間で導入", "専任スタッフが伴走"].map((t, i) => (
                  <span
                    key={t}
                    className="flex animate-[cssFadeIn_0.5s_ease-out_forwards] items-center gap-1.5 opacity-0"
                    style={{ animationDelay: `${0.6 + i * 0.08}s` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />{t}
                  </span>
                ))}
              </div>
            </CSSFadeIn>
          </div>
          <CSSFadeIn direction="right" delay={0.3}>
            <div className="relative" role="img" aria-label="Lオペ for CLINICのダッシュボード画面：予約管理、LINE友だち数推移、月間売上、リピート率、対応状況、配信結果を一覧表示">
              <MockWindow title="Lオペ for CLINIC — ダッシュボード">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "本日の予約", val: "24", unit: "件", bg: "bg-blue-50", text: "text-blue-600" },
                    { label: "LINE友だち", val: "1,847", unit: "人", bg: "bg-sky-50", text: "text-sky-600" },
                    { label: "月間売上", val: "3.2", unit: "M", bg: "bg-amber-50", text: "text-amber-600" },
                    { label: "リピート率", val: "68", unit: "%", bg: "bg-violet-50", text: "text-violet-600" },
                  ].map((k) => (
                    <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
                      <div className="text-[11px] text-slate-400">{k.label}</div>
                      <div className={`mt-0.5 text-lg font-bold leading-none ${k.text}`}>{k.val}<span className="text-[10px] font-normal text-slate-400">{k.unit}</span></div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold text-slate-500">LINE友だち推移（7日間）</div>
                    <div className="flex items-end gap-1" style={{ height: 60 }}>
                      {[35, 42, 38, 55, 48, 62, 70].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-400 to-sky-300" style={{ height: `${h}%` }} />)}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-300"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] font-semibold text-slate-500">対応状況</div>
                      <div className="mt-1.5 space-y-1">
                        {[{ c: "bg-red-400", l: "未対応", n: 3 }, { c: "bg-amber-400", l: "対応中", n: 7 }, { c: "bg-blue-400", l: "完了", n: 18 }].map((s) => (
                          <div key={s.l} className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className={`h-2 w-2 rounded-full ${s.c}`} />{s.l}<span className="ml-auto font-bold">{s.n}</span></div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2.5">
                      <div className="text-[11px] font-semibold text-blue-600">配信結果</div>
                      <div className="mt-1 text-[10px] text-blue-700">開封率 <span className="font-bold">78.3%</span></div>
                      <div className="text-[10px] text-blue-700">予約CV <span className="font-bold">12.1%</span></div>
                    </div>
                  </div>
                </div>
              </MockWindow>
              <div className="absolute right-2 -bottom-3 rounded-xl border border-blue-100 bg-white px-4 py-2.5 shadow-lg shadow-blue-100/40 md:-right-6 md:-bottom-5">
                <div className="text-[11px] text-slate-400">リマインド自動配信</div>
                <div className="text-[13px] font-bold text-blue-600">24件 送信完了</div>
              </div>
            </div>
          </CSSFadeIn>
        </div>
      </div>

      {/* CSS キーフレーム定義 */}
      <style jsx>{`
        @keyframes cssFadeIn {
          from { opacity: 0; transform: var(--css-fade-translate, translateY(24px)); }
          to { opacity: 1; transform: translateY(0) translateX(0); }
        }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -25px) scale(1.1); }
          50% { transform: translate(-20px, 15px) scale(0.95); }
          75% { transform: translate(10px, -10px) scale(1.05); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </section>
  );
}
