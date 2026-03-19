"use client";

import { VoiceRecordButton } from "@/components/voice-record-button";
import { VoiceKarteButton } from "@/components/voice-karte-button";
import {
  type IntakeRow,
  type PrescriptionMenu,
  pick,
  pickReserveId,
  formatBirthDisplay,
  formatTelDisplay,
  parseDateToAge,
} from "./types";

type KarteModalProps = {
  selected: IntakeRow;
  note: string;
  setNote: (v: string) => void;
  selectedMenu: PrescriptionMenu;
  setSelectedMenu: (v: PrescriptionMenu) => void;
  saving: boolean;
  noteRef: React.RefObject<HTMLTextAreaElement | null>;
  lineCallEnabled: boolean;
  callFormSentIds: Set<string>;
  onClose: () => void;
  onPrescribe: () => void;
  onNoPrescribe: () => void;
  onMarkNoAnswer: () => void;
  onCallFormConfirm: (row: IntakeRow) => void;
  // 定型文挿入ハンドラ
  onInsertDateTemplate: () => void;
  onInsertSideEffect: () => void;
  onInsertUsage: () => void;
  onInsertDecision: () => void;
  onInsertNoAnswer: () => void;
  insertTemplateToNote: (text: string) => void;
};

export function KarteModal({
  selected,
  note,
  setNote,
  selectedMenu,
  setSelectedMenu,
  saving,
  noteRef,
  lineCallEnabled,
  callFormSentIds,
  onClose,
  onPrescribe,
  onNoPrescribe,
  onMarkNoAnswer,
  onCallFormConfirm,
  onInsertDateTemplate,
  onInsertSideEffect,
  onInsertUsage,
  onInsertDecision,
  onInsertNoAnswer,
  insertTemplateToNote,
}: KarteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-[90vw] md:w-[70vw] p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold">
              {pick(selected, ["name", "氏名", "お名前"])} のカルテ
            </h2>
            <div className="flex items-center gap-2">
              {lineCallEnabled &&
                (() => {
                  const rid = pickReserveId(selected);
                  const pid = pick(selected, [
                    "patient_id",
                    "Patient_ID",
                    "patientId",
                  ]);
                  const cs = pick(selected, ["call_status"]);
                  const isSent =
                    callFormSentIds.has(rid || pid) ||
                    cs === "call_form_sent";
                  return (
                    <button
                      type="button"
                      disabled={isSent}
                      onClick={() => onCallFormConfirm(selected)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] ${
                        isSent
                          ? "bg-gray-300 text-white cursor-default"
                          : "bg-teal-500 hover:bg-teal-600 text-white"
                      }`}
                    >
                      {isSent
                        ? "通話フォーム送信済み"
                        : "LINE通話フォーム送信"}
                    </button>
                  );
                })()}

              <button
                onClick={onClose}
                className="text-slate-400 text-sm"
              >
                閉じる
              </button>
            </div>
          </div>

          {/* 基本情報 */}
          <div className="text-xs space-y-1">
            <div>
              氏名: {pick(selected, ["name", "氏名", "お名前"])}
            </div>
            <div>
              カナ:{" "}
              {pick(selected, [
                "name_kana",
                "nameKana",
                "kana",
                "カナ",
                "ﾌﾘｶﾞﾅ",
                "フリガナ",
                "ふりがな",
              ])}
            </div>
            <div>
              性別: {pick(selected, ["sex", "gender", "性別"])}
            </div>
            <div>
              生年月日:{" "}
              {(() => {
                const raw = pick(selected, [
                  "birth",
                  "birthday",
                  "生年月日",
                ]);
                const birthDisp = formatBirthDisplay(raw);
                const ageDisp = parseDateToAge(raw);
                return (
                  <>
                    {birthDisp} {ageDisp && `（${ageDisp}）`}
                  </>
                );
              })()}
            </div>
            <div>
              電話番号:{" "}
              {(() => {
                const telRaw = pick(selected, [
                  "tel",
                  "phone",
                  "電話番号",
                  "TEL",
                ]);
                const telDisp = formatTelDisplay(telRaw);

                const mismatchRaw = pick(selected, [
                  "tel_mismatch",
                  "TEL_MISMATCH",
                  "mismatch",
                ]);
                const isMismatch =
                  String(mismatchRaw || "").toUpperCase() === "TRUE";

                if (!isMismatch) return <span>{telDisp}</span>;

                return (
                  <span className="font-semibold text-rose-600">
                    要確認（I/J不一致） {telDisp}
                  </span>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={onMarkNoAnswer}
              className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-[11px] hover:bg-amber-100"
            >
              ⚠ 不通（架電したが繋がらず）
            </button>

            <div>
              answerer_id:{" "}
              {pick(selected, ["answerer_id", "answererId"])}
            </div>
            <div>reserveId: {pickReserveId(selected)}</div>
          </div>

          {/* 問診詳細 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                既往歴
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {pick(selected, ["current_disease_detail", "既往歴"]) ||
                    "特記事項なし"}
                </p>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                GLP-1 使用歴
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {pick(selected, ["glp_history", "GLP1使用歴"]) ||
                    "使用歴なし"}
                </p>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                内服歴
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {pick(selected, ["med_detail", "内服歴"]) || "内服薬なし"}
                </p>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                アレルギー
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {pick(selected, ["allergy_detail", "アレルギー"]) ||
                    "アレルギーなし"}
                </p>
              </div>
            </div>
          </div>

          {/* 処方メニュー選択 */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-500">
              処方メニュー（診察で決定した用量）
            </div>
            <div className="flex gap-2">
              {(["2.5mg", "5mg", "7.5mg"] as PrescriptionMenu[]).map(
                (dose) => (
                  <button
                    key={dose}
                    type="button"
                    onClick={() => setSelectedMenu(dose)}
                    className={`
                      flex-1 py-2 rounded-full text-xs font-semibold border
                      ${
                        selectedMenu === dose
                          ? "bg-pink-500 text-white border-pink-500"
                          : "bg-white text-slate-700 border-slate-300"
                      }
                    `}
                  >
                    マンジャロ {dose}
                  </button>
                )
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              ※
              診察時に患者さんと相談して決定した用量を選択してください。
            </p>
          </div>

          {/* カルテ入力（定型文ボタン付き） */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-500">
              カルテ
            </div>

            <div className="flex flex-wrap gap-2 mb-1">
              <button
                type="button"
                onClick={onInsertDateTemplate}
                className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
              >
                日時
              </button>
              <button
                type="button"
                onClick={onInsertSideEffect}
                className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
              >
                副作用
              </button>
              <button
                type="button"
                onClick={onInsertUsage}
                className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
              >
                使用方法
              </button>
              <button
                type="button"
                onClick={onInsertDecision}
                className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
              >
                処方許可
              </button>
              {/* 不通 */}
              <button
                type="button"
                onClick={onInsertNoAnswer}
                className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
              >
                不通
              </button>
              {/* 音声入力ボタン */}
              <VoiceRecordButton onTranscribed={insertTemplateToNote} />
              {/* AIカルテ生成ボタン */}
              <VoiceKarteButton onKarteGenerated={insertTemplateToNote} />
            </div>

            <textarea
              ref={noteRef}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              rows={6}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="診察内容・説明した内容・今後の方針などを記載"
            />
            <p className="text-[10px] text-slate-400">
              ※
              入力内容は自動で一時保存されます（この端末のブラウザ内）。
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onNoPrescribe}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-700 disabled:opacity-60"
            >
              今回は処方しない
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onPrescribe}
              className="px-4 py-1.5 rounded-full bg-pink-500 text-[11px] text-white disabled:opacity-60"
            >
              この内容で処方する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
