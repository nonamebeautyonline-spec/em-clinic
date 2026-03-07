// lib/legal/parser.tsx — テキスト形式 → JSX レンダラー
"use client";

import React from "react";

interface ParsedSection {
  title: string;
  blocks: ParsedBlock[];
}

type ParsedBlock =
  | { type: "paragraph"; text: string }
  | { type: "bold"; text: string }
  | { type: "ol"; items: ParsedListItem[] }
  | { type: "ul"; items: string[] }
  | { type: "date"; text: string };

interface ParsedListItem {
  text: string;
  subItems?: string[];
}

/**
 * テキスト形式をパースして構造化データに変換
 *
 * フォーマット:
 * - ### タイトル → セクション見出し
 * - 1. 2. 3. → 番号付きリスト
 * - - テキスト / ・テキスト → 箇条書き（インデント2スペースでネスト）
 * - **太字テキスト** → サブヘッダー
 * - 制定日：... → 右寄せ日付
 * - それ以外 → 段落
 */
function parseLegalText(text: string): { intro: string; sections: ParsedSection[]; date: string } {
  const lines = text.split("\n");
  let intro = "";
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let date = "";

  // 番号付きリストを蓄積
  let olItems: ParsedListItem[] = [];
  // 箇条書きリストを蓄積
  let ulItems: string[] = [];

  const flushOl = () => {
    if (olItems.length > 0 && currentSection) {
      currentSection.blocks.push({ type: "ol", items: [...olItems] });
      olItems = [];
    }
  };

  const flushUl = () => {
    if (ulItems.length > 0 && currentSection) {
      currentSection.blocks.push({ type: "ul", items: [...ulItems] });
      ulItems = [];
    }
  };

  const flushLists = () => {
    flushOl();
    flushUl();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // セクション見出し
    if (trimmed.startsWith("### ")) {
      flushLists();
      currentSection = { title: trimmed.slice(4).trim(), blocks: [] };
      sections.push(currentSection);
      continue;
    }

    // 制定日
    if (trimmed.startsWith("制定日：") || trimmed.startsWith("制定日:")) {
      flushLists();
      date = trimmed;
      continue;
    }

    // 冒頭テキスト（最初のセクション前）
    if (!currentSection) {
      if (trimmed) {
        intro += (intro ? "\n" : "") + trimmed;
      }
      continue;
    }

    // 空行
    if (!trimmed) {
      // ol の途中の空行は無視（次の行が番号付きかチェック）
      continue;
    }

    // 番号付きリスト（1. 2. 3. ... 10. 11. 等）
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (olMatch) {
      flushUl();
      olItems.push({ text: olMatch[2], subItems: [] });
      continue;
    }

    // インデント付き箇条書き（番号付きリストのサブアイテム）
    const indentedBullet = trimmed.match(/^\s{2,}[-・]\s*(.+)/);
    if (indentedBullet) {
      if (olItems.length > 0) {
        // 直前の番号付きアイテムのサブアイテムに追加
        const lastOl = olItems[olItems.length - 1];
        if (!lastOl.subItems) lastOl.subItems = [];
        lastOl.subItems.push(indentedBullet[1]);
      } else {
        ulItems.push(indentedBullet[1]);
      }
      continue;
    }

    // 通常の箇条書き
    const bulletMatch = trimmed.match(/^[-・]\s*(.+)/);
    if (bulletMatch) {
      flushOl();
      ulItems.push(bulletMatch[1]);
      continue;
    }

    // 太字行
    const boldMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      // 太字はolの途中に来ることがある（サブヘッダーとして）
      // olが蓄積中ならflushしない（番号付きリスト内のサブヘッダーとして扱う）
      if (olItems.length > 0) {
        const lastOl = olItems[olItems.length - 1];
        if (!lastOl.subItems) lastOl.subItems = [];
        lastOl.subItems.push(`**${boldMatch[1]}**`);
      } else {
        flushLists();
        currentSection.blocks.push({ type: "bold", text: boldMatch[1] });
      }
      continue;
    }

    // 通常テキスト
    flushLists();
    currentSection.blocks.push({ type: "paragraph", text: trimmed });
  }

  // 最後のリストをflush
  flushLists();

  return { intro, sections, date };
}

/** テキスト形式のコンテンツをJSXにレンダリング */
export function LegalTextRenderer({ text }: { text: string }) {
  const { intro, sections, date } = parseLegalText(text);

  return (
    <div className="space-y-3">
      {intro && <p>{intro}</p>}

      {sections.map((section, si) => (
        <div key={si}>
          <p className="font-semibold text-slate-700 mb-1">{section.title}</p>
          {section.blocks.map((block, bi) => {
            if (block.type === "paragraph") {
              return <p key={bi}>{block.text}</p>;
            }
            if (block.type === "bold") {
              return (
                <p key={bi} className="mt-1 font-semibold text-slate-700">
                  {block.text}
                </p>
              );
            }
            if (block.type === "ol") {
              return (
                <ol key={bi} className="list-decimal pl-4 space-y-1">
                  {block.items.map((item, ii) => (
                    <li key={ii}>
                      {item.text}
                      {item.subItems && item.subItems.length > 0 && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {item.subItems.map((sub, si2) => {
                            // **太字** のサブアイテムはサブヘッダーとして表示
                            const boldSub = sub.match(/^\*\*(.+)\*\*$/);
                            if (boldSub) {
                              return (
                                <p key={si2} className="mt-1 font-semibold text-slate-700 list-none -ml-4">
                                  {boldSub[1]}
                                </p>
                              );
                            }
                            return <li key={si2}>{sub}</li>;
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              );
            }
            if (block.type === "ul") {
              return (
                <ul key={bi} className="list-disc pl-4 mt-1 space-y-0.5">
                  {block.items.map((item, ii) => (
                    <li key={ii}>{item}</li>
                  ))}
                </ul>
              );
            }
            return null;
          })}
        </div>
      ))}

      {date && <p className="text-right mt-3">{date}</p>}
    </div>
  );
}
