"use client";

import { useCallback } from "react";
import { type IntakeRow, pick, normalizeDateStr } from "./types";

type UseTemplateInsertionParams = {
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  noteRef: React.RefObject<HTMLTextAreaElement | null>;
  selected: IntakeRow | null;
};

export function useTemplateInsertion({
  note,
  setNote,
  noteRef,
  selected,
}: UseTemplateInsertionParams) {
  // カルテ定型文の挿入（カーソル位置に）
  const insertTemplateToNote = useCallback(
    (text: string) => {
      const el = noteRef.current;
      if (!el) {
        // ref 取れない場合は末尾に追記
        setNote((prev) => {
          const base = prev ?? "";
          const trimmed = base.trimEnd();
          return trimmed ? `${trimmed}\n${text}` : text;
        });
        return;
      }

      const base = note ?? "";
      const start = el.selectionStart ?? base.length;
      const end = el.selectionEnd ?? base.length;

      const before = base.slice(0, start);
      const after = base.slice(end);

      let insert = text;
      if (before && !before.endsWith("\n")) {
        insert = "\n" + insert;
      }

      const newText = before + insert + after;
      setNote(newText);

      // 挿入後にカーソルを移動
      const pos = before.length + insert.length;
      setTimeout(() => {
        if (noteRef.current) {
          noteRef.current.selectionStart = pos;
          noteRef.current.selectionEnd = pos;
          noteRef.current.focus();
        }
      }, 0);
    },
    [note, setNote, noteRef]
  );

  const handleInsertDateTemplate = useCallback(() => {
    if (!selected) return;
    const rawDate = pick(selected, ["reserved_date", "予約日"]);
    const timeStr = pick(selected, ["reserved_time", "予約時間"]);
    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr) return;

    const [y, m, d] = dateStr.split("-");
    const [hh, mm] = (timeStr || "").split(":");
    const text = `${Number(y)}年${Number(m)}月${Number(d)}日${
      hh ? Number(hh) + "時" : ""
    }${mm ? Number(mm) + "分" : ""}`;
    insertTemplateToNote(text);
  }, [selected, insertTemplateToNote]);

  const handleInsertSideEffect = useCallback(() => {
    insertTemplateToNote("嘔気・嘔吐や低血糖に関する副作用の説明を行った。");
  }, [insertTemplateToNote]);

  const handleInsertUsage = useCallback(() => {
    insertTemplateToNote(
      "使用方法に関して説明を実施し、パンフレットの案内を行った。"
    );
  }, [insertTemplateToNote]);

  const handleInsertDecision = useCallback(() => {
    insertTemplateToNote("以上より上記の用量の処方を行う方針とした。");
  }, [insertTemplateToNote]);

  const handleInsertNoAnswer = useCallback(() => {
    insertTemplateToNote("診療予定時間に架電するも繋がらず");
  }, [insertTemplateToNote]);

  return {
    insertTemplateToNote,
    handleInsertDateTemplate,
    handleInsertSideEffect,
    handleInsertUsage,
    handleInsertDecision,
    handleInsertNoAnswer,
  };
}
