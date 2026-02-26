"use client";

import type { IntakeRow, PrescriptionMenu } from "@/lib/karte-helpers";
import { pick, pickReserveId, normalizeDateStr } from "@/lib/karte-helpers";
import type { SoapNote, NoteFormat } from "@/lib/soap-parser";
import { noteToSoap } from "@/lib/soap-parser";

type Props = {
  /** 全行データ（直近OKの処方を探す用） */
  rows: IntakeRow[];
  /** 現在選択中の患者行 */
  selected: IntakeRow;
  /** Do処方適用コールバック */
  onApply: (menu: PrescriptionMenu, soap: SoapNote, noteFormat: NoteFormat) => void;
};

/**
 * 前回Do処方ボタン
 * 同一患者の直近OK処方の処方メニューとカルテ内容を自動セットする
 */
export function DoPrescriptionButton({ rows, selected, onApply }: Props) {
  const currentPatientId = pick(selected, ["patient_id", "Patient_ID", "patientId"]);
  const currentReserveId = pickReserveId(selected);

  if (!currentPatientId) return null;

  // 同一患者のOKステータスのintakeを日付降順で探す（現在のreserveIdは除外）
  const prevOk = rows
    .filter((r) => {
      const pid = pick(r, ["patient_id", "Patient_ID", "patientId"]);
      const status = (pick(r, ["status"]) || "").toUpperCase();
      const rid = pickReserveId(r);
      return pid === currentPatientId && status === "OK" && rid !== currentReserveId;
    })
    .sort((a, b) => {
      const ad = normalizeDateStr(pick(a, ["reserved_date", "予約日"]));
      const bd = normalizeDateStr(pick(b, ["reserved_date", "予約日"]));
      return bd > ad ? 1 : -1;
    })[0];

  if (!prevOk) return null;

  const prevMenu = pick(prevOk, ["prescription_menu"]) as PrescriptionMenu;
  const prevNote = pick(prevOk, ["doctor_note"]);
  const prevNoteFormat = (pick(prevOk, ["note_format"]) || "plain") as NoteFormat;

  const handleDo = () => {
    if (!confirm(`前回の処方（マンジャロ ${prevMenu}）を引用します。よろしいですか？`)) return;
    const soap = noteToSoap(prevNote, prevNoteFormat);
    onApply(prevMenu || "", soap, prevNoteFormat);
  };

  return (
    <button
      type="button"
      onClick={handleDo}
      className="px-3 py-1 rounded-full border text-[11px] border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
      title={`前回処方: マンジャロ ${prevMenu}`}
    >
      前回Do（{prevMenu}）
    </button>
  );
}
