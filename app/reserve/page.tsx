// app/reserve/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type ReserveStep = 1 | 2;

type SlotInfo = {
  start: string;
  end: string;
};

type ApiSlot = {
  time: string;
  count: number; // 残枠（0..2）
};

type WeeklySlotsResponse = {
  start: string;
  end: string;
  slots: { date: string; time: string; count: number }[];
};

const weekdayLabel = ["日", "月", "火", "水", "木", "金", "土"];

const getNext7Days = (start: Date) => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
};

const formatDateKey = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const buildDateTime = (dateStr: string, timeStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
};

const generateSlots = (start = "09:00", end = "22:00"): SlotInfo[] => {
  const slots: SlotInfo[] = [];
  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  while (h < endH || (h === endH && m < endM)) {
    const startStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    m += 15;
    if (m >= 60) {
      h++;
      m -= 60;
    }
    const endStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push({ start: startStr, end: endStr });
  }
  return slots;
};

// 表の行は 09:00〜23:00（APIが返す枠が無い時間は count=0 なので×になる）
const SLOTS_9_23 = generateSlots("09:00", "23:00");

const isPastSlot = (dateStr: string, startTime: string) => {
  const now = new Date();
  const slotDateTime = buildDateTime(dateStr, startTime);
  return slotDateTime.getTime() <= now.getTime();
};

const getCellClass = (selected: boolean, disabled: boolean) => {
  if (disabled) return "text-slate-400 cursor-not-allowed";
  if (selected) return "text-pink-700 font-bold";
  return "text-pink-500 font-semibold";
};

type PatientBasic = {
  patient_id: string;
  name: string;
  kana: string;
  sex: string;
  birth: string;
  phone: string;
};

const ReserveInner: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 編集モード（日時変更）かどうか
  const isEdit = searchParams.get("edit") === "1";
  const editingReserveId = searchParams.get("reserveId") || "";

  // 変更前の日時（マイページから渡される）
  const originalDateKey = searchParams.get("prevDate") || "";
  const originalTime = searchParams.get("prevTime") || "";

  const originalDateObj = useMemo(() => {
    if (!originalDateKey) return null;
    const [y, m, d] = originalDateKey.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [originalDateKey]);

  // 患者基本情報（クエリ + localStorage からマージ）
  const [patientInfo, setPatientInfo] = useState<PatientBasic>({
    patient_id: "",
    name: "",
    kana: "",
    sex: "",
    birth: "",
    phone: "",
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const [step, setStep] = useState<ReserveStep>(1);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, ApiSlot[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ▼ 患者情報をURL + localStorageから取得してマージ


  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const days = useMemo(() => getNext7Days(baseDate), [baseDate]);

  const rangeLabel = useMemo(() => {
    if (!days.length) return "";
    const first = days[0];
    const last = days[days.length - 1];
    const firstStr = `${first.getFullYear()}年${first.getMonth() + 1}月${first.getDate()}日`;
    const lastStr = `${last.getMonth() + 1}月${last.getDate()}日`;
    return `${firstStr} ~ ${lastStr}`;
  }, [days]);

  const selectedDateObj = useMemo(() => {
    if (!selectedDateKey) return baseDate;
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [selectedDateKey, baseDate]);

  // ★ 予約枠再取得（slot_full 時にも使う）
  const refetchSlots = useCallback(
    async (daysArg: Date[], options?: { keepSelectedDate?: boolean }) => {
      if (!daysArg.length) return;

      setLoadingSlots(true);
      setSlotsError(null);

      const firstKey = formatDateKey(daysArg[0]);
      const lastKey = formatDateKey(daysArg[daysArg.length - 1]);

      // 初回のみ先頭日を選択（週移動時など）
      if (!options?.keepSelectedDate) {
        setSelectedDateKey(firstKey);
      }

      try {
        const res = await fetch(`/api/reservations?start=${firstKey}&end=${lastKey}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("failed");

        const data: WeeklySlotsResponse = await res.json();

        const map: Record<string, ApiSlot[]> = {};
        daysArg.forEach((d) => {
          const key = formatDateKey(d);
          map[key] = [];
        });

        (data.slots || []).forEach((s) => {
          const { date, time, count } = s;
          if (!map[date]) map[date] = [];
          map[date].push({ time, count });
        });

        setSlotsByDate(map);
      } catch (e) {
        console.error(e);
        setSlotsError("予約枠の取得に失敗しました。時間をおいて再度お試しください。");
      } finally {
        setLoadingSlots(false);
      }
    },
    []
  );

  // ▼ 1週間分の予約枠を取得（週が変わるたびに）
  useEffect(() => {
    setSelectedSlot(null);
    setStep(1);
    refetchSlots(days, { keepSelectedDate: false });
  }, [days, refetchSlots]);

  // ▼ 自動更新（他ユーザーが埋めても×に追従）
  useEffect(() => {
    if (!days.length) return;
    const id = window.setInterval(() => {
      // 選択日を維持したいので keepSelectedDate:true
      refetchSlots(days, { keepSelectedDate: true });
    }, 30000);
    return () => window.clearInterval(id);
  }, [days, refetchSlots]);

  const getCountForSlot = (dateKey: string, time: string) => {
    const list = slotsByDate[dateKey];
    if (!list) return 0;
    const found = list.find((s) => s.time === time);
    return found?.count ?? 0;
  };

  const handleBackToStep1 = () => {
    setStep(1);
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    if (booking) return;

    setBooking(true);

    try {
      // ★ 編集モード：予約の日時だけ更新（問診はそのまま）
      if (isEdit && editingReserveId) {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "updateReservation",
            reserveId: editingReserveId,
            date: selectedDateKey,
            time: selectedSlot.start,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as any;

        if (!res.ok || !data.ok) {
          if (data.error === "slot_full") {
            alert("この時間帯はすでに予約が埋まりました。別の時間帯をお選びください。");
            await refetchSlots(days, { keepSelectedDate: true });
            setStep(1);
            setSelectedSlot(null);
            return;
          }
          if (data.error === "outside_hours") {
            alert("この時間は受付時間外です。別の時間帯をお選びください。");
            await refetchSlots(days, { keepSelectedDate: true });
            setStep(1);
            setSelectedSlot(null);
            return;
          }
          alert("予約の変更に失敗しました。時間をおいて再度お試しください。");
          return;
        }

        const reserveId = editingReserveId;

        setShowSuccess(true);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "last_reservation",
            JSON.stringify({
              reserveId,
              date: selectedDateKey,
              start: selectedSlot.start,
              end: selectedSlot.end,
              title: "オンライン診察予約",
            })
          );
        }

 setTimeout(() => {
  setShowSuccess(false);
  router.push("/mypage");
}, 1000);


        return;
      }

      // ▼ 新規予約
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  type: "createReservation",
  patient_id: patientInfo.patient_id,
  name: patientInfo.name,
  date: selectedDateKey,
  time: selectedSlot.start,
}),



      });

      const data = (await res.json().catch(() => ({}))) as any;

      if (!res.ok || !data.ok) {
        if (data.error === "slot_full") {
          alert("この時間帯はすでに予約が埋まりました。別の時間帯をお選びください。");
          // ★ 表を再取得して、満席枠を×へ反映
          await refetchSlots(days, { keepSelectedDate: true });
          setStep(1);
          setSelectedSlot(null);
          return;
        }
        if (data.error === "outside_hours") {
          alert("この時間は受付時間外です。別の時間帯をお選びください。");
          await refetchSlots(days, { keepSelectedDate: true });
          setStep(1);
          setSelectedSlot(null);
          return;
        }
        alert("予約確定に失敗しました。時間をおいて再度お試しください。");
        return;
      }

      const reserveId = data.reserveId ?? `mock-${Date.now()}`;

      setShowSuccess(true);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "last_reservation",
          JSON.stringify({
            reserveId,
            date: selectedDateKey,
            start: selectedSlot.start,
            end: selectedSlot.end,
            title: "オンライン診察予約",
          })
        );
      }

setTimeout(() => {
  setShowSuccess(false);
  router.push("/mypage");
}, 1000);

    } catch (e) {
      console.error(e);
      alert("予約確定に失敗しました。再度お試しください。");
    } finally {
      setBooking(false);
    }
  };

  const disabledPrevWeek = weekOffset <= 0;

  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/company-name-v2.png"
              alt="clinic logo"
              width={150}
              height={40}
              className="object-contain"
            />
          </div>
          <Link href="/mypage" className="text-[12px] text-slate-500 hover:text-slate-700">
            マイページへ戻る
          </Link>
        </div>
      </header>

      {/* 本文 */}
      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        <section className="bg-white rounded-3xl shadow-sm p-4">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">診察予約</h1>
          <p className="text-[13px] text-slate-600 mb-3 leading-relaxed">
            初診の診察予約はこちらからお取りいただけます。ご希望の日時を選択し、確認画面へお進みください。
          </p>

          {/* 期間表示バー */}
          <div className="mb-3 rounded-2xl border border-slate-200 px-3 py-2 flex items-center justify-between text-[13px] text-slate-800">
            <button
              type="button"
              disabled={disabledPrevWeek}
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
              className={
                "w-8 h-8 flex items-center justify-center rounded-full text-[18px] " +
                (disabledPrevWeek ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:bg-slate-100")
              }
            >
              ‹
            </button>

            <span className="flex-1 text-center">{rangeLabel}</span>

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[18px] text-slate-500 hover:bg-slate-100"
            >
              ›
            </button>
          </div>

          {/* ステップインジケーター */}
          <div className="flex items-center justify_between mb-3">
            {[{ id: 1, label: "予約選択" }, { id: 2, label: "予約確認" }].map((item) => {
              const active = step === item.id;
              const done = step > item.id;
              return (
                <div key={item.id} className="flex-1 flex flex-col items-center text-[12px]">
                  <div
                    className={
                      "flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold " +
                      (done
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : active
                        ? "bg-pink-500 text-white border-pink-500"
                        : "bg-white text-slate-400 border-slate-200")
                    }
                  >
                    {item.id}
                  </div>
                  <span className={"mt-1 " + (active ? "text-[12px] text-slate-900" : "text-[12px] text-slate-400")}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* STEP1 */}
          {step === 1 && (
            <div className="space-y-2 mt-2">
              {loadingSlots ? (
                <div className="text-[13px] text-slate-500 py-4">予約枠を読み込み中です…</div>
              ) : slotsError ? (
                <div className="text-[13px] text-rose-600 py-4">{slotsError}</div>
              ) : (
                <>
                  <div className="relative">
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full">
                        <div className="grid grid-cols-[90px_repeat(7,minmax(60px,1fr))] text-center text-[12px] gap-y-1">
                          <div />
                          {days.map((d) => {
                            const key = formatDateKey(d);
                            const wd = d.getDay();
                            const isSelectedDay = key === selectedDateKey;

                            let dateColor = "text-slate-900";
                            if (wd === 0) dateColor = "text-red-500";
                            if (wd === 6) dateColor = "text-sky-500";

                            // ★ 土日を灰色にしない（管理画面に完全追従）
                            const bgCls = isSelectedDay ? "bg-pink-50 border-pink-200" : "bg-white border-slate-100";

                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedDateKey(key)}
                                className={`h-12 rounded-2xl border flex flex-col items-center justify-center ${bgCls}`}
                              >
                                <span className={`text-[15px] font-semibold ${dateColor}`}>{d.getDate()}</span>
                                <span className="text-[11px] text-slate-500">{weekdayLabel[wd]}</span>
                              </button>
                            );
                          })}

                          {SLOTS_9_23.map((slot) => (
                            <React.Fragment key={`${slot.start}-${slot.end}`}>
                              <div className="h-10 flex items-center justify-center text-[13px] font-semibold text-slate-700">
                                {slot.start}〜{slot.end}
                              </div>

                              {days.map((d) => {
                                const dateKey = formatDateKey(d);

                                // count = 残枠（0..2）
                                const count = getCountForSlot(dateKey, slot.start);
                                const past = isPastSlot(dateKey, slot.start);

                                // 0は×、1/2は○（過去枠は×）
                                const disabled = past || count <= 0;

                                const selected =
                                  dateKey === selectedDateKey &&
                                  selectedSlot?.start === slot.start &&
                                  selectedSlot?.end === slot.end &&
                                  !disabled;

                                const char = disabled ? "×" : "○";

                                return (
                                  <button
                                    key={dateKey}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      if (disabled) return;
                                      setSelectedDateKey(dateKey);
                                      setSelectedSlot({ ...slot });
                                      setStep(2);
                                    }}
                                    className="h-10 flex items-center justify-center"
                                  >
                                    <span className={`${getCellClass(selected, disabled)} text-[20px]`}>{char}</span>
                                  </button>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-y-2 right-0 w-10 bg-gradient-to-l from-white to-transparent flex items-center justify-end pr-1 md:hidden">
                      <span className="text-[18px] text-slate-300">→</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-right">
                    表は横にスワイプ（スクロール）すると他の日付も表示できます。
                  </p>
                </>
              )}
            </div>
          )}

          {/* STEP2 */}
          {step === 2 && selectedSlot && (
            <div className="space-y-4 mt-4">
              {showSuccess && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-lg text-green-600 text-lg font-semibold animate-fadeIn">
                    {isEdit ? "✓ 予約を変更しました" : "✓ 予約が確定しました"}
                  </div>
                </div>
              )}

              {isEdit && originalDateObj && (
                <div className="bg-slate-50 rounded-2xl p-3 text-[13px] text-slate-700 space-y-1.5">
                  <p className="font-semibold text-slate-800">変更前の予約</p>
                  <p>
                    <span className="text-[12px] text-slate-500">予約日：</span>
                    {originalDateObj.getMonth() + 1}月{originalDateObj.getDate()}日（
                    {weekdayLabel[originalDateObj.getDay()]}）
                  </p>
                  <p>
                    <span className="text-[12px] text-slate-500">予約時間：</span>
                    {originalTime}
                  </p>
                </div>
              )}

              <div className="bg-pink-50/70 rounded-2xl p-3 text-[14px] text-slate-800 space-y-1.5">
                {isEdit && <p className="font-semibold text-slate-800">変更後の予約</p>}
                <p>
                  <span className="text-[12px] text-slate-500">予約日：</span>
                  {selectedDateObj.getMonth() + 1}月{selectedDateObj.getDate()}日（
                  {weekdayLabel[selectedDateObj.getDay()]}）
                </p>
                <p>
                  <span className="text-[12px] text-slate-500">予約時間：</span>
                  {selectedSlot.start}〜{selectedSlot.end}
                </p>
              </div>

              <p className="text-[12px] text-slate-500 leading-relaxed">
                {isEdit
                  ? "予約内容をご確認のうえ、「予約を確定する」ボタンを押してください。予約日時のみ変更され、問診フォームの再入力は不要です。"
                  : "予約内容をご確認のうえ、「予約を確定する」ボタンを押してください。予約確定後に問診フォームへ進み、診察前に必要事項のご入力をお願いいたします。"}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 text-[13px] text-slate-700"
                >
                  戻る
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={booking}
                  className={`
                    flex-1 h-11 rounded-2xl text-[13px] font-semibold shadow-sm
                    ${
                      booking
? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-blue-600 text-white active:scale-[0.98] active:bg-blue-700"
                    }
                  `}
                >
                  {booking ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      処理中…
                    </div>
                  ) : isEdit ? (
                    "予約を確定する"
                  ) : (
                    "予約確定する"
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">予約ページを読み込み中です…</p>
        </div>
      }
    >
      <ReserveInner />
    </Suspense>
  );
}
