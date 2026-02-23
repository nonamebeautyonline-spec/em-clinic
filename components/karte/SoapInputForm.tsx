"use client";

import { useRef } from "react";
import type { SoapNote } from "@/lib/soap-parser";
import { SOAP_LABELS } from "@/lib/soap-parser";

type Props = {
  soap: SoapNote;
  onChange: (soap: SoapNote) => void;
  /** テンプレートテキストを挿入する対象セクション（デフォルトは "s"） */
  activeSection?: keyof SoapNote;
  onActiveSectionChange?: (section: keyof SoapNote) => void;
};

const SECTION_KEYS: (keyof SoapNote)[] = ["s", "o", "a", "p"];

const SECTION_COLORS: Record<keyof SoapNote, string> = {
  s: "border-l-blue-400",
  o: "border-l-green-400",
  a: "border-l-amber-400",
  p: "border-l-purple-400",
};

export function SoapInputForm({ soap, onChange, activeSection, onActiveSectionChange }: Props) {
  const refs = {
    s: useRef<HTMLTextAreaElement>(null),
    o: useRef<HTMLTextAreaElement>(null),
    a: useRef<HTMLTextAreaElement>(null),
    p: useRef<HTMLTextAreaElement>(null),
  };

  const handleChange = (key: keyof SoapNote, value: string) => {
    onChange({ ...soap, [key]: value });
  };

  return (
    <div className="space-y-2">
      {SECTION_KEYS.map((key) => (
        <div key={key} className={`border-l-4 ${SECTION_COLORS[key]} pl-3`}>
          <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">
            {SOAP_LABELS[key]}
          </label>
          <textarea
            ref={refs[key]}
            className={`w-full rounded-lg border px-3 py-2 text-xs ${
              activeSection === key
                ? "border-pink-300 ring-1 ring-pink-200"
                : "border-slate-300"
            }`}
            rows={key === "s" ? 4 : 2}
            value={soap[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            onFocus={() => onActiveSectionChange?.(key)}
            placeholder={
              key === "s" ? "患者の訴え・主訴・自覚症状"
              : key === "o" ? "他覚所見・検査結果・バイタル"
              : key === "a" ? "診断名・評価・アセスメント"
              : "治療計画・処方内容・指導事項"
            }
          />
        </div>
      ))}
    </div>
  );
}

/** SOAPの特定セクションにテキストを挿入するヘルパー */
export function insertTextToSoapSection(
  soap: SoapNote,
  section: keyof SoapNote,
  text: string
): SoapNote {
  const current = soap[section] || "";
  const trimmed = current.trimEnd();
  const newValue = trimmed ? `${trimmed}\n${text}` : text;
  return { ...soap, [section]: newValue };
}
