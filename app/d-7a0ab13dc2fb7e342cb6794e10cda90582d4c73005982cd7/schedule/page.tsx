"use client";

// 予約設定ページ（デモ用）
// モックデータを使用して曜日別の予約枠管理・定員変更・有効/無効切替を提供する

import { useState } from "react";
import { DEMO_SCHEDULE_SLOTS, type DemoScheduleSlot } from "../_data/mock";

const DAY_TABS = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"];

export default function DemoSchedulePage() {
  const [scheduleData, setScheduleData] = useState<DemoScheduleSlot[]>(
    DEMO_SCHEDULE_SLOTS.map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({ ...s })),
    }))
  );
  const [selectedDay, setSelectedDay] = useState("月曜日");
  const [toast, setToast] = useState<string | null>(null);

  // トースト表示（3秒で自動非表示）
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 選択中の曜日データ
  const currentDay = scheduleData.find((d) => d.dayOfWeek === selectedDay);
  const isClosedDay = !currentDay || currentDay.slots.length === 0;
  const allDisabled = currentDay?.slots.every((s) => !s.isEnabled) ?? false;

  // スロットの有効/無効トグル
  const toggleSlot = (time: string) => {
    setScheduleData((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek !== selectedDay) return day;
        return {
          ...day,
          slots: day.slots.map((s) =>
            s.time === time ? { ...s, isEnabled: !s.isEnabled } : s
          ),
        };
      })
    );
  };

  // 定員変更
  const changeCapacity = (time: string, delta: number) => {
    setScheduleData((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek !== selectedDay) return day;
        return {
          ...day,
          slots: day.slots.map((s) => {
            if (s.time !== time) return s;
            const next = Math.max(0, Math.min(10, s.capacity + delta));
            return { ...s, capacity: next };
          }),
        };
      })
    );
  };

  // 保存
  const handleSave = () => {
    showToast(`${selectedDay}の予約設定を保存しました`);
  };

  // 有効スロット数の集計
  const enabledSlotCount = (day: DemoScheduleSlot) =>
    day.slots.filter((s) => s.isEnabled).length;

  // 合計定員の集計
  const totalCapacity = (day: DemoScheduleSlot) =>
    day.slots.filter((s) => s.isEnabled).reduce((sum, s) => sum + s.capacity, 0);

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800">予約設定</h1>
      <p className="text-sm text-slate-500 mt-1">
        曜日ごとの予約受付枠と定員を管理します
      </p>

      {/* 曜日タブ */}
      <div className="flex gap-1 mt-6 overflow-x-auto">
        {DAY_TABS.map((day) => {
          const dayData = scheduleData.find((d) => d.dayOfWeek === day);
          const isClosed = !dayData || dayData.slots.length === 0;
          const isAllOff = dayData?.slots.every((s) => !s.isEnabled) ?? false;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`relative px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isSelected
                  ? "bg-slate-800 text-white"
                  : isClosed || isAllOff
                    ? "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {day.replace("曜日", "")}
              {(isClosed || isAllOff) && !isSelected && (
                <span className="ml-1 text-[10px] opacity-60">休</span>
              )}
            </button>
          );
        })}
      </div>

      {/* サマリー */}
      {!isClosedDay && (
        <div className="flex gap-4 mt-4">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">有効枠数</p>
            <p className="text-lg font-bold text-slate-800">
              {enabledSlotCount(currentDay!)}
              <span className="text-xs font-normal text-slate-400 ml-0.5">
                / {currentDay!.slots.length}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">合計定員</p>
            <p className="text-lg font-bold text-slate-800">
              {totalCapacity(currentDay!)}
              <span className="text-xs font-normal text-slate-400 ml-0.5">名</span>
            </p>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="mt-4">
        {isClosedDay ? (
          // 休診日表示
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-3 opacity-30">🏥</div>
            <p className="text-lg font-medium text-slate-400">休診日</p>
            <p className="text-sm text-slate-400 mt-1">
              {selectedDay}は予約受付枠が設定されていません
            </p>
          </div>
        ) : allDisabled ? (
          // 全スロット無効（木曜など）
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
              {selectedDay}は全スロットが無効です（休診日設定）
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500">時間帯</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-center">定員</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-center">有効</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDay!.slots.map((slot) => (
                    <tr
                      key={slot.time}
                      className="border-b border-slate-50 opacity-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800 font-mono">
                        {slot.time}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => changeCapacity(slot.time, -1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-medium text-slate-800">
                            {slot.capacity}
                          </span>
                          <button
                            onClick={() => changeCapacity(slot.time, 1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs"
                          >
                            ＋
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleSlot(slot.time)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            slot.isEnabled ? "bg-green-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                              slot.isEnabled ? "translate-x-4.5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // 通常の時間帯一覧
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">時間帯</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">定員</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-center">有効</th>
                </tr>
              </thead>
              <tbody>
                {currentDay!.slots.map((slot) => (
                  <tr
                    key={slot.time}
                    className={`border-b border-slate-50 transition-colors ${
                      slot.isEnabled ? "hover:bg-slate-50/50" : "opacity-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 font-mono">
                      {slot.time}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => changeCapacity(slot.time, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-medium text-slate-800">
                          {slot.capacity}
                        </span>
                        <button
                          onClick={() => changeCapacity(slot.time, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs"
                        >
                          ＋
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleSlot(slot.time)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          slot.isEnabled ? "bg-green-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                            slot.isEnabled ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      {!isClosedDay && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            保存
          </button>
        </div>
      )}
    </div>
  );
}
