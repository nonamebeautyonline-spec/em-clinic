"use client";

import { useState, useEffect, useCallback } from "react";
import type { IntakeRow, PrescriptionMenu } from "@/lib/karte-helpers";
import {
  pick,
  pickReserveId,
  formatBirthDisplay,
  parseDateToAge,
  formatTelDisplay,
  draftKeyOf,
} from "@/lib/karte-helpers";
import type { SoapNote, NoteFormat } from "@/lib/soap-parser";
import { noteToSoap, soapToNote, emptySoapNote } from "@/lib/soap-parser";
import { KarteNoteEditor } from "./KarteNoteEditor";
import { DoPrescriptionButton } from "./DoPrescriptionButton";

type Props = {
  /** 選択中の患者行 */
  selected: IntakeRow;
  /** 全行データ（Do処方用） */
  rows: IntakeRow[];
  /** 保存中フラグ */
  saving: boolean;
  /** LINE通話フォーム有効フラグ */
  lineCallEnabled: boolean;
  /** LINE通話フォーム送信済みIDセット */
  callFormSentIds: Set<string>;
  /** モーダル閉じ＋データ更新 */
  onClose: () => void;
  /** 処方する */
  onPrescribe: (note: string, noteFormat: NoteFormat, menu: PrescriptionMenu) => void;
  /** 処方しない */
  onNoPrescribe: (note: string, noteFormat: NoteFormat) => void;
  /** 不通記録 */
  onMarkNoAnswer: () => void;
  /** LINE通話フォーム送信モーダルを開く */
  onOpenCallFormConfirm: (row: IntakeRow) => void;
  /** 追加のヘッダーボタン（admin版の不通メッセージ送信等） */
  headerExtra?: React.ReactNode;
};

export function DoctorKarteModal({
  selected,
  rows,
  saving,
  lineCallEnabled,
  callFormSentIds,
  onClose,
  onPrescribe,
  onNoPrescribe,
  onMarkNoAnswer,
  onOpenCallFormConfirm,
  headerExtra,
}: Props) {
  const [soap, setSoap] = useState<SoapNote>(emptySoapNote());
  const [noteFormat, setNoteFormat] = useState<NoteFormat>("plain");
  const [selectedMenu, setSelectedMenu] = useState<PrescriptionMenu>("");

  const reserveId = pickReserveId(selected);

  // 初期化：下書き復元 or 既存データ表示
  useEffect(() => {
    // 下書き復元を優先
    if (reserveId) {
      try {
        const raw = localStorage.getItem(draftKeyOf(reserveId));
        if (raw) {
          const d = JSON.parse(raw);
          // SOAP形式の下書き
          if (d.soap && d.noteFormat) {
            setSoap(d.soap);
            setNoteFormat(d.noteFormat);
          } else if (typeof d.note === "string") {
            // 旧形式の下書き（プレーンテキスト）
            setSoap({ s: d.note, o: "", a: "", p: "" });
            setNoteFormat("plain");
          }

          const menu = d.selectedMenu;
          setSelectedMenu(
            menu === "2.5mg" || menu === "5mg" || menu === "7.5mg" ? menu : ""
          );
          return;
        }
      } catch (e) {
        console.warn("draft restore failed", e);
      }
    }

    // 下書きがなければ既存データを表示
    const existingNote = selected.doctor_note || selected["doctor_note"] || "";
    const existingFormat = (selected.note_format || "plain") as NoteFormat;
    setSoap(noteToSoap(existingNote, existingFormat));
    setNoteFormat(existingFormat);

    const menu = selected.prescription_menu || selected["prescription_menu"] || "";
    setSelectedMenu(
      menu === "2.5mg" || menu === "5mg" || menu === "7.5mg" ? menu : ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // 下書き自動保存
  useEffect(() => {
    if (!reserveId) return;
    try {
      const payload = {
        soap,
        noteFormat,
        selectedMenu,
        // 旧互換：プレーンの場合はnoteも保存
        note: noteFormat === "plain" ? soap.s : soapToNote(soap, noteFormat),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKeyOf(reserveId), JSON.stringify(payload));
    } catch (e) {
      console.warn("draft save failed", e);
    }
  }, [reserveId, soap, noteFormat, selectedMenu]);

  const handlePrescribe = () => {
    if (!selectedMenu) {
      alert("処方メニュー（2.5 / 5 / 7.5）を選択してください。");
      return;
    }
    const noteStr = soapToNote(soap, noteFormat);
    onPrescribe(noteStr, noteFormat, selectedMenu);
  };

  const handleNoPrescribe = () => {
    const noteStr = soapToNote(soap, noteFormat);
    onNoPrescribe(noteStr, noteFormat);
  };

  // Do処方適用
  const handleDoApply = useCallback((menu: PrescriptionMenu, doSoap: SoapNote, doFormat: NoteFormat) => {
    setSelectedMenu(menu);
    setSoap(doSoap);
    setNoteFormat(doFormat);
  }, []);

  // LINE通話フォームボタン状態
  const rid = pickReserveId(selected);
  const pid = pick(selected, ["patient_id", "Patient_ID", "patientId"]);
  const cs = pick(selected, ["call_status"]);
  const isCallFormSent = callFormSentIds.has(rid || pid) || cs === "call_form_sent";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-[90vw] md:w-[70vw] p-6 space-y-4">
          {/* ヘッダー */}
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold">
              {pick(selected, ["name", "氏名", "お名前"])} のカルテ
            </h2>
            <div className="flex items-center gap-2">
              {lineCallEnabled && (
                <button
                  type="button"
                  disabled={isCallFormSent}
                  onClick={() => onOpenCallFormConfirm(selected)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] ${
                    isCallFormSent
                      ? "bg-gray-300 text-white cursor-default"
                      : "bg-teal-500 hover:bg-teal-600 text-white"
                  }`}
                >
                  {isCallFormSent ? "通話フォーム送信済み" : "LINE通話フォーム送信"}
                </button>
              )}
              {headerExtra}
              <button onClick={onClose} className="text-slate-400 text-sm">
                閉じる
              </button>
            </div>
          </div>

          {/* 基本情報 */}
          <div className="text-xs space-y-1">
            <div>氏名: {pick(selected, ["name", "氏名", "お名前"])}</div>
            <div>
              カナ:{" "}
              {pick(selected, [
                "name_kana", "nameKana", "kana", "カナ",
                "ﾌﾘｶﾞﾅ", "フリガナ", "ふりがな",
              ])}
            </div>
            <div>性別: {pick(selected, ["sex", "gender", "性別"])}</div>
            <div>
              生年月日:{" "}
              {(() => {
                const raw = pick(selected, ["birth", "birthday", "生年月日"]);
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
                const telRaw = pick(selected, ["tel", "phone", "電話番号", "TEL"]);
                const telDisp = formatTelDisplay(telRaw);
                const mismatchRaw = pick(selected, ["tel_mismatch", "TEL_MISMATCH", "mismatch"]);
                const isMismatch = String(mismatchRaw || "").toUpperCase() === "TRUE";
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
            <div>answerer_id: {pick(selected, ["answerer_id", "answererId"])}</div>
            <div>reserveId: {pickReserveId(selected)}</div>
          </div>

          {/* 問診詳細 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { label: "既往歴", keys: ["current_disease_detail", "既往歴"], fallback: "特記事項なし" },
              { label: "GLP-1 使用歴", keys: ["glp_history", "GLP1使用歴"], fallback: "使用歴なし" },
              { label: "内服歴", keys: ["med_detail", "内服歴"], fallback: "内服薬なし" },
              { label: "アレルギー", keys: ["allergy_detail", "アレルギー"], fallback: "アレルギーなし" },
            ].map(({ label, keys, fallback }) => (
              <div key={label}>
                <div className="text-[11px] font-semibold text-slate-500">{label}</div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {pick(selected, keys) || fallback}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 処方メニュー選択 + Do処方 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-slate-500">
                処方メニュー（診察で決定した用量）
              </div>
              <DoPrescriptionButton
                rows={rows}
                selected={selected}
                onApply={handleDoApply}
              />
            </div>
            <div className="flex gap-2">
              {(["2.5mg", "5mg", "7.5mg"] as PrescriptionMenu[]).map((dose) => (
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
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              ※ 診察時に患者さんと相談して決定した用量を選択してください。
            </p>
          </div>

          {/* カルテ入力 (SOAP / フリーテキスト切替) */}
          <KarteNoteEditor
            soap={soap}
            onSoapChange={setSoap}
            noteFormat={noteFormat}
            onNoteFormatChange={setNoteFormat}
            selected={selected}
          />

          {/* アクションボタン */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleNoPrescribe}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-700 disabled:opacity-60"
            >
              今回は処方しない
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handlePrescribe}
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
