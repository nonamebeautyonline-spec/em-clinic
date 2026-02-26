"use client";

import type { IntakeRow } from "@/lib/karte-helpers";
import {
  pick,
  pickReserveId,
  formatBirthDisplay,
  parseDateToAge,
  formatTelDisplay,
  normalizeDateStr,
  displayDateSlash,
  makeTimeRangeLabel,
} from "@/lib/karte-helpers";

type Props = {
  row: IntakeRow;
  allRows: IntakeRow[];
  capacityPerSlot: number;
  overdue: boolean;
  currentSlot: boolean;
  lineCallEnabled: boolean;
  callFormSentIds: Set<string>;
  onOpenDetail: (row: IntakeRow) => void;
  onOpenCallFormConfirm: (row: IntakeRow) => void;
  /** admin版の不通メッセージボタン等の追加ボタン */
  extraButtons?: (row: IntakeRow) => React.ReactNode;
};

export function PatientCard({
  row,
  allRows,
  capacityPerSlot,
  overdue,
  currentSlot,
  lineCallEnabled,
  callFormSentIds,
  onOpenDetail,
  onOpenCallFormConfirm,
  extraButtons,
}: Props) {
  const name = pick(row, ["name", "氏名", "お名前"]);
  const kana = pick(row, [
    "name_kana", "nameKana", "kana", "カナ",
    "ﾌﾘｶﾞﾅ", "フリガナ", "ふりがな",
  ]);
  const sex = pick(row, ["sex", "gender", "性別"]);
  const rawBirth = pick(row, ["birth", "birthday", "生年月日"]);
  const birth = formatBirthDisplay(rawBirth);
  const age = parseDateToAge(rawBirth);

  const history = pick(row, ["current_disease_detail", "既往歴"]);
  const glp1 = pick(row, ["glp_history", "GLP1使用歴"]);
  const meds = pick(row, ["med_detail", "内服歴"]);
  const allergy = pick(row, ["allergy_detail", "アレルギー"]);

  const statusRaw = pick(row, ["status"]);
  const status = (statusRaw || "").toUpperCase();
  const callStatus = pick(row, ["call_status"]);
  const isNoAnswer = callStatus === "no_answer" || callStatus === "no_answer_sent";
  const isCallFormSent = callStatus === "call_form_sent";
  const reserveId = pickReserveId(row);
  const isTelMismatch = String(pick(row, ["tel_mismatch"]) || "").toUpperCase() === "TRUE";

  const reservedDateRaw = pick(row, ["reserved_date", "予約日"]);
  const reservedTime = pick(row, ["reserved_time", "予約時間"]);
  const reservedDateIso = normalizeDateStr(reservedDateRaw);
  const reservedDateDisp = displayDateSlash(reservedDateIso);
  const timeRangeLabel = makeTimeRangeLabel(reservedTime || "");

  const slotCount = allRows.filter((r) => {
    const d = normalizeDateStr(pick(r, ["reserved_date", "予約日"]));
    const t = pick(r, ["reserved_time", "予約時間"]);
    return d === reservedDateIso && t === reservedTime;
  }).length;
  const occupancyLabel = `（${slotCount}/${capacityPerSlot}）`;

  let cardBg = "bg-white border-slate-200";
  if (!status) cardBg = "bg-pink-50 border-pink-200";
  if (status === "OK") cardBg = "bg-emerald-50 border-emerald-200";
  if (status === "NG") cardBg = "bg-rose-50 border-rose-200";
  if (overdue) cardBg = "bg-amber-50 border-amber-300";

  const patientId = pick(row, ["patient_id", "Patient_ID", "patientId"]);

  const handleCopyPatientId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!patientId) { alert("Patient IDが見つかりません"); return; }
    try {
      await navigator.clipboard.writeText(patientId);
      alert(`Patient ID ${patientId} をコピーしました`);
    } catch { alert("コピーに失敗しました"); }
  };

  const handleOpenTalk = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!patientId) { alert("Patient IDが見つかりません"); return; }
    window.open(`/admin/line/talk?pid=${patientId}`, "_blank");
  };

  return (
    <div
      className={`
        rounded-2xl shadow-sm border p-4 space-y-3
        ${cardBg}
        ${currentSlot ? "border-l-4 border-l-red-500" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        {/* 左側のアクションボタン */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCopyPatientId}
            className="w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md flex items-center justify-center"
            title="Patient IDをコピー"
          >
            📋
          </button>
          {patientId && (
            <button
              type="button"
              onClick={handleOpenTalk}
              className="w-10 h-10 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold shadow-md flex items-center justify-center text-sm"
              title="Lオペ トークで開く"
            >
              T
            </button>
          )}
          {lineCallEnabled && patientId && (
            (callFormSentIds.has(reserveId || patientId) || isCallFormSent) ? (
              <div
                className="w-10 h-10 rounded-lg bg-gray-300 text-white font-bold shadow-md flex items-center justify-center text-[9px] leading-tight text-center"
                title="通話フォーム送信済み"
              >
                送信済
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCallFormConfirm(row);
                }}
                className="w-10 h-10 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold shadow-md flex items-center justify-center text-[16px]"
                title="LINE通話フォームを送信"
              >
                📞
              </button>
            )
          )}
          {extraButtons?.(row)}
        </div>

        <div className="flex-1 cursor-pointer" onClick={() => onOpenDetail(row)}>
          {reservedDateDisp && timeRangeLabel && (
            <div className="text-sm font-semibold text-pink-600 mb-1">
              予約日時　{reservedDateDisp} {timeRangeLabel}{occupancyLabel}
            </div>
          )}
          <div className="text-base font-semibold">{name || "氏名無し"}</div>
          {kana && <div className="text-xs text-slate-500 mt-0.5">{kana}</div>}
          {(() => {
            const telRaw = pick(row, ["tel", "phone", "電話番号", "TEL"]);
            const telDisp = formatTelDisplay(telRaw);
            return telDisp ? (
              <div className="text-xs text-slate-500 mt-0.5">TEL: {telDisp}</div>
            ) : null;
          })()}
          <div className="text-xs text-slate-500 mt-1 space-x-2">
            {sex && <span>{sex}</span>}
            {birth && <span>{birth}</span>}
            {age && <span>（{age}）</span>}
          </div>
          {!status && isNoAnswer && (
            <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
              不通
            </div>
          )}
          {isTelMismatch && (
            <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
              電話 要確認（I/J不一致）
            </div>
          )}
        </div>

        <div className="text-right text-[11px] text-slate-500 space-y-1 flex-shrink-0">
          {reserveId && <div>reserveId: {reserveId}</div>}
          {status && (
            <div>
              ステータス:{" "}
              <span
                className={
                  status === "OK"
                    ? "text-emerald-600 font-semibold"
                    : status === "NG"
                    ? "text-rose-600 font-semibold"
                    : "text-slate-500"
                }
              >
                {status}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs cursor-pointer"
        onClick={() => onOpenDetail(row)}
      >
        {[
          { label: "既往歴", value: history, fallback: "特記事項なし" },
          { label: "GLP-1 使用歴", value: glp1, fallback: "使用歴なし" },
          { label: "内服歴", value: meds, fallback: "内服薬なし" },
          { label: "アレルギー", value: allergy, fallback: "アレルギーなし" },
        ].map(({ label, value, fallback }) => (
          <div key={label} className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500">{label}</div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
              {value ? (
                <p className="whitespace-pre-wrap leading-relaxed">{value}</p>
              ) : (
                <p className="text-slate-400">{fallback}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
