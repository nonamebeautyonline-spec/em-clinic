"use client";

import { useState, useRef, useCallback } from "react";
import type { SoapNote, NoteFormat } from "@/lib/soap-parser";
import { plainToSoap, soapToText, emptySoapNote } from "@/lib/soap-parser";
import { SoapInputForm, insertTextToSoapSection } from "./SoapInputForm";
import { VoiceRecordButton } from "@/components/voice-record-button";
import { VoiceKarteButton } from "@/components/voice-karte-button";
import type { IntakeRow } from "@/lib/karte-helpers";
import { pick, normalizeDateStr } from "@/lib/karte-helpers";

type Props = {
  /** 現在のSOAPデータ */
  soap: SoapNote;
  onSoapChange: (soap: SoapNote) => void;
  /** 入力モード */
  noteFormat: NoteFormat;
  onNoteFormatChange: (format: NoteFormat) => void;
  /** 選択中の患者行（日時テンプレート用） */
  selected?: IntakeRow | null;
};

export function KarteNoteEditor({
  soap,
  onSoapChange,
  noteFormat,
  onNoteFormatChange,
  selected,
}: Props) {
  const [activeSection, setActiveSection] = useState<keyof SoapNote>("s");
  const plainNoteRef = useRef<HTMLTextAreaElement | null>(null);

  // プレーンモードでのテキスト挿入（カーソル位置に）
  const insertTextToPlainNote = useCallback((text: string) => {
    if (noteFormat === "soap") {
      // SOAPモードではアクティブセクションに挿入
      onSoapChange(insertTextToSoapSection(soap, activeSection, text));
      return;
    }

    // プレーンモードではSのテキストエリアに挿入
    const el = plainNoteRef.current;
    const base = soap.s ?? "";

    if (!el) {
      const trimmed = base.trimEnd();
      onSoapChange({ ...soap, s: trimmed ? `${trimmed}\n${text}` : text });
      return;
    }

    const start = el.selectionStart ?? base.length;
    const end = el.selectionEnd ?? base.length;
    const before = base.slice(0, start);
    const after = base.slice(end);

    let insert = text;
    if (before && !before.endsWith("\n")) {
      insert = "\n" + insert;
    }

    const newText = before + insert + after;
    onSoapChange({ ...soap, s: newText });

    const pos = before.length + insert.length;
    setTimeout(() => {
      if (plainNoteRef.current) {
        plainNoteRef.current.selectionStart = pos;
        plainNoteRef.current.selectionEnd = pos;
        plainNoteRef.current.focus();
      }
    }, 0);
  }, [noteFormat, soap, activeSection, onSoapChange]);

  // AI SOAPカルテ生成の結果をセクションに分配
  const handleAiKarteGenerated = useCallback((karteText: string) => {
    if (noteFormat === "soap") {
      // AIカルテテキストを【S】【O】【A】【P】でパースしてみる
      const parsed = parseAiKarteText(karteText);
      if (parsed) {
        onSoapChange(parsed);
        return;
      }
    }
    // パース失敗 or プレーンモードの場合はそのまま挿入
    insertTextToPlainNote(karteText);
  }, [noteFormat, onSoapChange, insertTextToPlainNote]);

  // モード切替
  const handleFormatChange = (format: NoteFormat) => {
    if (format === noteFormat) return;

    if (format === "soap" && noteFormat === "plain") {
      // プレーン→SOAP: 既存テキストをSに入れる
      onSoapChange(plainToSoap(soap.s));
    } else if (format === "plain" && noteFormat === "soap") {
      // SOAP→プレーン: SOAP全体をテキスト化してSに保持
      onSoapChange({ s: soapToText(soap), o: "", a: "", p: "" });
    }

    onNoteFormatChange(format);
  };

  // 定型文挿入ハンドラ
  const handleInsertDateTemplate = () => {
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
    insertTextToPlainNote(text);
  };

  return (
    <div className="space-y-1">
      {/* モード切替タブ + 定型文ボタン */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-500">カルテ</div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleFormatChange("plain")}
            className={`px-2 py-0.5 rounded-full text-[10px] border ${
              noteFormat === "plain"
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white text-slate-600 border-slate-300"
            }`}
          >
            フリー
          </button>
          <button
            type="button"
            onClick={() => handleFormatChange("soap")}
            className={`px-2 py-0.5 rounded-full text-[10px] border ${
              noteFormat === "soap"
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white text-slate-600 border-slate-300"
            }`}
          >
            SOAP
          </button>
        </div>
      </div>

      {/* 定型文ボタン群 */}
      <div className="flex flex-wrap gap-2 mb-1">
        <button
          type="button"
          onClick={handleInsertDateTemplate}
          className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
        >
          日時
        </button>
        <button
          type="button"
          onClick={() => insertTextToPlainNote("嘔気・嘔吐や低血糖に関する副作用の説明を行った。")}
          className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
        >
          副作用
        </button>
        <button
          type="button"
          onClick={() => insertTextToPlainNote("使用方法に関して説明を実施し、パンフレットの案内を行った。")}
          className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
        >
          使用方法
        </button>
        <button
          type="button"
          onClick={() => insertTextToPlainNote("以上より上記の用量の処方を行う方針とした。")}
          className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
        >
          処方許可
        </button>
        <button
          type="button"
          onClick={() => insertTextToPlainNote("診療予定時間に架電するも繋がらず")}
          className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
        >
          不通
        </button>
        <VoiceRecordButton onTranscribed={insertTextToPlainNote} />
        <VoiceKarteButton onKarteGenerated={handleAiKarteGenerated} />
      </div>

      {/* 入力フォーム本体 */}
      {noteFormat === "soap" ? (
        <SoapInputForm
          soap={soap}
          onChange={onSoapChange}
          activeSection={activeSection}
          onActiveSectionChange={setActiveSection}
        />
      ) : (
        <textarea
          ref={plainNoteRef}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
          rows={6}
          value={soap.s}
          onChange={(e) => onSoapChange({ ...soap, s: e.target.value })}
          placeholder="診察内容・説明した内容・今後の方針などを記載"
        />
      )}

      <p className="text-[10px] text-slate-400">
        ※ 入力内容は自動で一時保存されます（この端末のブラウザ内）。
      </p>
    </div>
  );
}

/** AIカルテ生成テキストを【S】【O】【A】【P】タグでパースする */
function parseAiKarteText(text: string): SoapNote | null {
  // 【S】、【O】、【A】、【P】 タグでセクション分割
  const sMatch = text.match(/【S】([\s\S]*?)(?=【[OAP]】|$)/);
  const oMatch = text.match(/【O】([\s\S]*?)(?=【[AP]】|$)/);
  const aMatch = text.match(/【A】([\s\S]*?)(?=【P】|$)/);
  const pMatch = text.match(/【P】([\s\S]*?)$/);

  // 少なくとも1つのSOAPセクションが見つかったら有効とする
  if (!sMatch && !oMatch && !aMatch && !pMatch) return null;

  return {
    s: (sMatch?.[1] || "").trim(),
    o: (oMatch?.[1] || "").trim(),
    a: (aMatch?.[1] || "").trim(),
    p: (pMatch?.[1] || "").trim(),
  };
}
