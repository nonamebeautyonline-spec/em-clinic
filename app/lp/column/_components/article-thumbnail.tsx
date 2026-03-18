"use client";

import React from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   記事サムネイル — marchスタイル
   淡いグラデーション背景 + カテゴリラベル + タイトル + SVGイラスト
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── 記事ごとのサムネイル設定 ─── */
const thumbMeta: Record<string, { subtitle: string; ill: string }> = {
  "clinic-line-case-studies":           { subtitle: "導入クリニックの実績を紹介", ill: "phone-chat" },
  "lstep-vs-clinic-tool":              { subtitle: "ツール選びで失敗しないために", ill: "comparison" },
  "clinic-dx-guide":                   { subtitle: "LINE公式アカウントから始める", ill: "digital" },
  "line-reservation-no-show":          { subtitle: "自動リマインドで解決する方法", ill: "calendar" },
  "segment-delivery-repeat":           { subtitle: "配信戦略でリピート率を改善", ill: "chart" },
  "clinic-line-friends-growth":        { subtitle: "すぐに実践できる7つの施策", ill: "people" },
  "electronic-medical-record-guide":   { subtitle: "LINE連携で業務効率化", ill: "medical" },
  "online-medical-line":               { subtitle: "患者体験を最大化する運用術", ill: "phone-chat" },
  "rich-menu-design":                  { subtitle: "患者導線を最適化するポイント", ill: "phone-menu" },
  "clinic-opening-line":               { subtitle: "開業前から始める集患戦略", ill: "building" },
  "beauty-clinic-line":                { subtitle: "カウンセリングからフォローまで", ill: "medical" },
  "line-block-rate-reduction":         { subtitle: "患者に嫌われない配信のコツ", ill: "phone-chat" },
  "reservation-system-comparison":     { subtitle: "LINE連携対応ツールの選び方", ill: "comparison" },
  "dental-clinic-line":                { subtitle: "定期検診リマインドで通院率向上", ill: "calendar" },
  "ai-auto-reply-guide":              { subtitle: "24時間対応で新患獲得を最大化", ill: "ai" },
  "clinic-kpi-dashboard":             { subtitle: "経営に必要な数値管理の基本", ill: "chart" },
  "online-questionnaire-guide":        { subtitle: "待ち時間短縮と効率化を両立", ill: "medical" },
  "dermatology-clinic-line":           { subtitle: "処方薬配送とフォローアップ自動化", ill: "medical" },
  "line-operation-outsource-vs-inhouse": { subtitle: "クリニック規模別の最適解", ill: "comparison" },
  "medical-dx-success-stories":        { subtitle: "LINE起点でクリニック経営を変革", ill: "chart" },
  "clinic-management-success":         { subtitle: "開業医が失敗する要因を解説", ill: "building" },
  "clinic-crm-comparison":            { subtitle: "CRMの選び方と導入メリット", ill: "comparison" },
  "online-medical-cost":              { subtitle: "運営費用や安くするコツを紹介", ill: "digital" },
  "busy-doctor-efficiency":           { subtitle: "忙しさの原因と効率化の方法", ill: "people" },
};

/* ─── カテゴリ色設定 ─── */
const catTheme: Record<string, { from: string; to: string; accent: string; label: string }> = {
  活用事例:       { from: "from-blue-50",    to: "to-sky-100/60",    accent: "#2563eb", label: "bg-blue-100 text-blue-700" },
  ツール比較:     { from: "from-violet-50",  to: "to-indigo-100/60", accent: "#7c3aed", label: "bg-violet-100 text-violet-700" },
  ガイド:         { from: "from-sky-50",     to: "to-cyan-100/60",   accent: "#0284c7", label: "bg-sky-100 text-sky-700" },
  業務改善:       { from: "from-cyan-50",    to: "to-blue-100/60",   accent: "#0891b2", label: "bg-cyan-100 text-cyan-700" },
  マーケティング: { from: "from-indigo-50",  to: "to-blue-100/60",   accent: "#4f46e5", label: "bg-indigo-100 text-indigo-700" },
  比較:           { from: "from-violet-50",  to: "to-purple-100/60", accent: "#7c3aed", label: "bg-violet-100 text-violet-700" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   SVGイラスト（9種類）
   ═══════════════════════════════════════════════════════════════════════════ */

function IllPhoneChat() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      {/* 背景デコ */}
      <circle cx="40" cy="140" r="20" fill="#dbeafe" opacity="0.5" />
      <circle cx="170" cy="30" r="12" fill="#c7d2fe" opacity="0.4" />
      {/* スマートフォン */}
      <rect x="65" y="15" width="70" height="125" rx="12" fill="white" stroke="#93c5fd" strokeWidth="2.5" />
      <rect x="75" y="30" width="50" height="85" rx="4" fill="#eff6ff" />
      <circle cx="100" cy="130" r="5" fill="none" stroke="#93c5fd" strokeWidth="1.5" />
      {/* LINE風チャットバブル */}
      <rect x="80" y="40" width="35" height="14" rx="7" fill="#06C755" opacity="0.7" />
      <rect x="85" y="60" width="30" height="12" rx="6" fill="#06C755" opacity="0.5" />
      <rect x="80" y="80" width="40" height="14" rx="7" fill="#93c5fd" opacity="0.6" />
      <rect x="88" y="100" width="28" height="10" rx="5" fill="#93c5fd" opacity="0.4" />
      {/* 吹き出し（左） */}
      <rect x="10" y="50" width="42" height="20" rx="10" fill="#bfdbfe" opacity="0.6" />
      <rect x="15" y="80" width="35" height="16" rx="8" fill="#c7d2fe" opacity="0.5" />
      {/* 吹き出し（右） */}
      <rect x="148" y="65" width="38" height="18" rx="9" fill="#bfdbfe" opacity="0.5" />
      <rect x="155" y="95" width="30" height="14" rx="7" fill="#ddd6fe" opacity="0.5" />
      {/* 通知ドット */}
      <circle cx="130" cy="20" r="6" fill="#ef4444" opacity="0.6" />
      <text x="130" y="23" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">3</text>
    </svg>
  );
}

function IllComparison() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="30" cy="150" r="16" fill="#ede9fe" opacity="0.5" />
      <circle cx="180" cy="20" r="10" fill="#dbeafe" opacity="0.5" />
      {/* 左スクリーン */}
      <rect x="15" y="25" width="75" height="100" rx="6" fill="white" stroke="#a78bfa" strokeWidth="2" />
      <rect x="15" y="25" width="75" height="18" rx="6" fill="#8b5cf6" opacity="0.15" />
      <rect x="25" y="55" width="55" height="6" rx="3" fill="#c4b5fd" opacity="0.5" />
      <rect x="25" y="67" width="40" height="6" rx="3" fill="#c4b5fd" opacity="0.4" />
      <rect x="25" y="79" width="50" height="6" rx="3" fill="#c4b5fd" opacity="0.3" />
      <circle cx="35" cy="105" r="8" fill="#8b5cf6" opacity="0.15" />
      <path d="M32 105l3 3 6-6" stroke="#8b5cf6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* 右スクリーン */}
      <rect x="110" y="40" width="75" height="100" rx="6" fill="white" stroke="#60a5fa" strokeWidth="2" />
      <rect x="110" y="40" width="75" height="18" rx="6" fill="#3b82f6" opacity="0.15" />
      <rect x="120" y="70" width="55" height="6" rx="3" fill="#93c5fd" opacity="0.5" />
      <rect x="120" y="82" width="40" height="6" rx="3" fill="#93c5fd" opacity="0.4" />
      <rect x="120" y="94" width="50" height="6" rx="3" fill="#93c5fd" opacity="0.3" />
      <circle cx="130" cy="120" r="8" fill="#3b82f6" opacity="0.15" />
      <path d="M127 120l3 3 6-6" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* VS */}
      <circle cx="100" cy="85" r="14" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
      <text x="100" y="89" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="bold">VS</text>
    </svg>
  );
}

function IllDigital() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="170" cy="150" r="18" fill="#dbeafe" opacity="0.4" />
      <circle cx="25" cy="30" r="12" fill="#cffafe" opacity="0.5" />
      {/* ノートPC */}
      <rect x="30" y="50" width="110" height="75" rx="6" fill="white" stroke="#60a5fa" strokeWidth="2" />
      <rect x="38" y="58" width="94" height="55" rx="3" fill="#eff6ff" />
      {/* 画面内グラフ */}
      <path d="M50 100l15-10 15 5 15-20 15-5 15 10" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="100" r="2.5" fill="#3b82f6" />
      <circle cx="65" cy="90" r="2.5" fill="#3b82f6" />
      <circle cx="80" cy="95" r="2.5" fill="#3b82f6" />
      <circle cx="95" cy="75" r="2.5" fill="#3b82f6" />
      <circle cx="110" cy="70" r="2.5" fill="#3b82f6" />
      <circle cx="125" cy="80" r="2.5" fill="#3b82f6" />
      {/* PCベース */}
      <path d="M20 125h130l-8 12H28z" fill="white" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
      {/* クラウド */}
      <path d="M145 35c0-10 8-18 18-18 8 0 14 5 16 12 6 0 11 5 11 11s-5 11-11 11h-30c-7 0-12-5-12-11 0-2 1-4 2-5h6z" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
      <path d="M158 45v10m-5-5h10" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
      {/* 歯車 */}
      <circle cx="160" cy="110" r="15" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
      <circle cx="160" cy="110" r="6" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
      <path d="M160 95v5m0 20v5m-15-15h5m20 0h5m-24-11l4 4m17 17l4 4m-4-25l-4 4m-17 17l-4 4" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IllCalendar() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="170" cy="145" r="14" fill="#dbeafe" opacity="0.4" />
      <circle cx="20" cy="40" r="10" fill="#cffafe" opacity="0.4" />
      {/* カレンダー */}
      <rect x="30" y="30" width="105" height="110" rx="8" fill="white" stroke="#60a5fa" strokeWidth="2" />
      <rect x="30" y="30" width="105" height="28" rx="8" fill="#3b82f6" opacity="0.1" />
      <rect x="30" y="50" width="105" height="8" fill="#3b82f6" opacity="0.1" />
      {/* 留め具 */}
      <rect x="55" y="22" width="4" height="16" rx="2" fill="#60a5fa" />
      <rect x="105" y="22" width="4" height="16" rx="2" fill="#60a5fa" />
      {/* 月表示 */}
      <text x="82" y="46" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold">3月</text>
      {/* 日付グリッド */}
      {[0,1,2,3,4,5,6].map(col => [0,1,2,3].map(row => (
        <rect key={`${col}-${row}`} x={38 + col * 13} y={66 + row * 16} width="9" height="9" rx="2"
          fill={col === 3 && row === 1 ? "#3b82f6" : "#e0f2fe"} opacity={col === 3 && row === 1 ? 0.8 : 0.5} />
      )))}
      {/* 選択日ハイライト */}
      <circle cx={38 + 3 * 13 + 4.5} cy={66 + 1 * 16 + 4.5} r="12" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4" />
      {/* 通知ベル */}
      <g transform="translate(150, 30)">
        <path d="M15 6c0-5-4-9-9-9S-3 1-3 6c0 8-4 10-4 10h26s-4-2-4-10z" fill="white" stroke="#f59e0b" strokeWidth="1.5" />
        <circle cx="6" cy="20" r="3" fill="white" stroke="#f59e0b" strokeWidth="1.5" />
        <circle cx="6" cy="-2" r="2" fill="#f59e0b" />
      </g>
      {/* 時計 */}
      <circle cx="165" cy="105" r="22" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
      <circle cx="165" cy="105" r="2" fill="#3b82f6" />
      <path d="M165 105V90" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <path d="M165 105l12 8" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IllChart() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="180" cy="20" r="10" fill="#dbeafe" opacity="0.5" />
      <circle cx="15" cy="150" r="14" fill="#c7d2fe" opacity="0.4" />
      {/* ダッシュボード枠 */}
      <rect x="20" y="20" width="130" height="130" rx="8" fill="white" stroke="#60a5fa" strokeWidth="2" />
      {/* 棒グラフ */}
      <rect x="35" y="100" width="16" height="35" rx="3" fill="#bfdbfe" />
      <rect x="58" y="80" width="16" height="55" rx="3" fill="#93c5fd" />
      <rect x="81" y="60" width="16" height="75" rx="3" fill="#60a5fa" />
      <rect x="104" y="45" width="16" height="90" rx="3" fill="#3b82f6" />
      <rect x="127" y="55" width="16" height="80" rx="3" fill="#2563eb" />
      {/* トレンドライン */}
      <path d="M43 95l23-18 23-18 23-13 23 8" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
      {/* 上矢印 */}
      <g transform="translate(160, 40)">
        <circle cx="0" cy="0" r="18" fill="#dcfce7" opacity="0.8" />
        <path d="M0 8V-6m-5 3l5-6 5 6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* KPIカード */}
      <rect x="155" y="80" width="40" height="50" rx="5" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
      <text x="175" y="100" textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="bold">↑</text>
      <text x="175" y="118" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="bold">150%</text>
    </svg>
  );
}

function IllMedical() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="170" cy="150" r="16" fill="#dbeafe" opacity="0.4" />
      <circle cx="25" cy="25" r="10" fill="#cffafe" opacity="0.5" />
      {/* クリップボード */}
      <rect x="55" y="20" width="70" height="100" rx="6" fill="white" stroke="#60a5fa" strokeWidth="2" />
      <rect x="75" y="12" width="30" height="16" rx="4" fill="#93c5fd" />
      <rect x="65" y="45" width="50" height="5" rx="2.5" fill="#bfdbfe" />
      <rect x="65" y="57" width="40" height="5" rx="2.5" fill="#bfdbfe" opacity="0.7" />
      <rect x="65" y="69" width="45" height="5" rx="2.5" fill="#bfdbfe" opacity="0.5" />
      <rect x="65" y="81" width="35" height="5" rx="2.5" fill="#bfdbfe" opacity="0.4" />
      {/* チェックマーク */}
      <circle cx="70" cy="100" r="6" fill="#dcfce7" />
      <path d="M67 100l3 3 5-6" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* 聴診器 */}
      <g transform="translate(140, 30)">
        <circle cx="0" cy="55" r="14" fill="white" stroke="#60a5fa" strokeWidth="2" />
        <circle cx="0" cy="55" r="6" fill="#dbeafe" />
        <path d="M0 41V15c0-8-12-8-12 0v8" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M0 41V15c0-8 12-8 12 0v8" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="-12" cy="23" r="4" fill="#60a5fa" />
        <circle cx="12" cy="23" r="4" fill="#60a5fa" />
      </g>
      {/* 薬カプセル */}
      <g transform="translate(20, 110) rotate(-30)">
        <rect x="0" y="0" width="30" height="14" rx="7" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
        <rect x="15" y="0" width="15" height="14" rx="7" fill="#93c5fd" opacity="0.3" />
      </g>
      <g transform="translate(50, 130) rotate(15)">
        <rect x="0" y="0" width="24" height="12" rx="6" fill="white" stroke="#a78bfa" strokeWidth="1.5" />
        <rect x="12" y="0" width="12" height="12" rx="6" fill="#a78bfa" opacity="0.3" />
      </g>
    </svg>
  );
}

function IllBuilding() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="175" cy="150" r="14" fill="#dbeafe" opacity="0.4" />
      <circle cx="20" cy="30" r="10" fill="#cffafe" opacity="0.4" />
      {/* メイン建物 */}
      <rect x="50" y="40" width="80" height="110" rx="4" fill="white" stroke="#60a5fa" strokeWidth="2" />
      {/* 十字マーク（医療） */}
      <rect x="80" y="48" width="20" height="6" rx="2" fill="#3b82f6" opacity="0.6" />
      <rect x="87" y="41" width="6" height="20" rx="2" fill="#3b82f6" opacity="0.6" />
      {/* 窓 */}
      {[0,1,2].map(row => [0,1,2].map(col => (
        <rect key={`w${row}${col}`} x={60 + col * 22} y={70 + row * 28} width="14" height="16" rx="2"
          fill={row === 0 && col === 1 ? "#fef3c7" : "#eff6ff"} stroke="#bfdbfe" strokeWidth="1" />
      )))}
      {/* ドア */}
      <rect x="80" y="130" width="20" height="20" rx="3" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.5" />
      <circle cx="96" cy="140" r="1.5" fill="#60a5fa" />
      {/* 旗 */}
      <line x1="135" y1="30" x2="135" y2="60" stroke="#60a5fa" strokeWidth="1.5" />
      <path d="M135 30l20 8-20 8z" fill="#3b82f6" opacity="0.5" />
      {/* 木 */}
      <circle cx="162" cy="115" r="16" fill="#bbf7d0" opacity="0.5" />
      <circle cx="162" cy="105" r="12" fill="#86efac" opacity="0.4" />
      <rect x="160" y="125" width="4" height="15" rx="1" fill="#a3a3a3" opacity="0.3" />
      {/* 道 */}
      <path d="M0 150h200" stroke="#e5e7eb" strokeWidth="1" />
    </svg>
  );
}

function IllPeople() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="175" cy="20" r="12" fill="#dbeafe" opacity="0.4" />
      <circle cx="20" cy="150" r="14" fill="#c7d2fe" opacity="0.4" />
      {/* 中央の人物（医師） */}
      <circle cx="100" cy="50" r="18" fill="white" stroke="#60a5fa" strokeWidth="2" />
      <circle cx="100" cy="45" r="8" fill="#dbeafe" />
      <path d="M88 55c0 0 5 8 12 8s12-8 12-8" fill="none" stroke="#93c5fd" strokeWidth="1.5" />
      <path d="M80 75c0-12 9-20 20-20s20 8 20 20v35H80z" fill="white" stroke="#60a5fa" strokeWidth="2" />
      <rect x="92" y="72" width="16" height="4" rx="2" fill="#3b82f6" opacity="0.4" />
      {/* 左の人物 */}
      <circle cx="40" cy="70" r="14" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
      <circle cx="40" cy="66" r="6" fill="#e0f2fe" />
      <path d="M28 90c0-10 6-16 12-16s12 6 12 16v25H28z" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
      {/* 右の人物 */}
      <circle cx="160" cy="70" r="14" fill="white" stroke="#a78bfa" strokeWidth="1.5" />
      <circle cx="160" cy="66" r="6" fill="#ede9fe" />
      <path d="M148 90c0-10 6-16 12-16s12 6 12 16v25h-24z" fill="white" stroke="#a78bfa" strokeWidth="1.5" />
      {/* 接続線 */}
      <path d="M55 80h25m40 0h25" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* 成長矢印 */}
      <g transform="translate(100, 130)">
        <path d="M-25 15l10-15 10-5 10-10 10 5" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        <circle cx="15" cy="-10" r="3" fill="#22c55e" opacity="0.5" />
      </g>
    </svg>
  );
}

function IllAI() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="175" cy="150" r="14" fill="#c7d2fe" opacity="0.4" />
      <circle cx="20" cy="30" r="10" fill="#dbeafe" opacity="0.4" />
      {/* ロボット/AI頭部 */}
      <rect x="60" y="30" width="60" height="55" rx="14" fill="white" stroke="#8b5cf6" strokeWidth="2" />
      {/* 目 */}
      <circle cx="80" cy="55" r="7" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <circle cx="80" cy="55" r="3" fill="#8b5cf6" />
      <circle cx="100" cy="55" r="7" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <circle cx="100" cy="55" r="3" fill="#8b5cf6" />
      {/* 口/スピーカー */}
      <rect x="78" y="70" width="24" height="4" rx="2" fill="#c4b5fd" />
      {/* アンテナ */}
      <line x1="90" y1="30" x2="90" y2="18" stroke="#8b5cf6" strokeWidth="2" />
      <circle cx="90" cy="14" r="4" fill="#a78bfa" opacity="0.6" />
      {/* 信号波 */}
      <path d="M80 10c-6-4-6-12 0-16" fill="none" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M100 10c6-4 6-12 0-16" fill="none" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
      {/* ボディ */}
      <rect x="65" y="90" width="50" height="40" rx="8" fill="white" stroke="#8b5cf6" strokeWidth="2" />
      <rect x="78" y="98" width="24" height="6" rx="3" fill="#ede9fe" />
      <rect x="78" y="110" width="24" height="6" rx="3" fill="#ede9fe" />
      {/* チャットバブル（右） */}
      <rect x="135" y="40" width="50" height="30" rx="8" fill="white" stroke="#60a5fa" strokeWidth="1.5" />
      <rect x="143" y="48" width="34" height="4" rx="2" fill="#bfdbfe" />
      <rect x="143" y="57" width="24" height="4" rx="2" fill="#bfdbfe" opacity="0.6" />
      <path d="M135 60l-8 8v-8z" fill="white" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
      {/* チャットバブル（左） */}
      <rect x="10" y="60" width="40" height="25" rx="7" fill="#ede9fe" opacity="0.7" />
      <rect x="17" y="68" width="26" height="3.5" rx="1.5" fill="#c4b5fd" opacity="0.6" />
      <rect x="17" y="75" width="18" height="3.5" rx="1.5" fill="#c4b5fd" opacity="0.4" />
      {/* 接続ノード */}
      <circle cx="150" cy="120" r="5" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
      <circle cx="170" cy="100" r="4" fill="#ede9fe" stroke="#a78bfa" strokeWidth="1" />
      <line x1="150" y1="120" x2="170" y2="100" stroke="#e5e7eb" strokeWidth="1" />
      {/* 24h */}
      <g transform="translate(145, 140)">
        <rect x="-10" y="-8" width="36" height="16" rx="4" fill="#fef3c7" opacity="0.8" />
        <text x="8" y="4" textAnchor="middle" fill="#d97706" fontSize="9" fontWeight="bold">24h</text>
      </g>
    </svg>
  );
}

function IllPhoneMenu() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-auto">
      <circle cx="170" cy="145" r="14" fill="#dbeafe" opacity="0.4" />
      <circle cx="25" cy="30" r="10" fill="#cffafe" opacity="0.4" />
      {/* スマートフォン */}
      <rect x="50" y="10" width="80" height="145" rx="12" fill="white" stroke="#60a5fa" strokeWidth="2.5" />
      <rect x="60" y="25" width="60" height="105" rx="4" fill="#eff6ff" />
      <circle cx="90" cy="145" r="5" fill="none" stroke="#93c5fd" strokeWidth="1.5" />
      {/* リッチメニューグリッド */}
      <rect x="62" y="82" width="27" height="22" rx="3" fill="#3b82f6" opacity="0.2" />
      <rect x="91" y="82" width="27" height="22" rx="3" fill="#8b5cf6" opacity="0.2" />
      <rect x="62" y="106" width="27" height="22" rx="3" fill="#06b6d4" opacity="0.2" />
      <rect x="91" y="106" width="27" height="22" rx="3" fill="#06C755" opacity="0.2" />
      {/* メニューアイコン */}
      <text x="75" y="97" textAnchor="middle" fill="#3b82f6" fontSize="12">📅</text>
      <text x="105" y="97" textAnchor="middle" fill="#8b5cf6" fontSize="12">📋</text>
      <text x="75" y="121" textAnchor="middle" fill="#06b6d4" fontSize="12">💬</text>
      <text x="105" y="121" textAnchor="middle" fill="#06C755" fontSize="12">📍</text>
      {/* チャット上部 */}
      <rect x="65" y="30" width="40" height="10" rx="5" fill="#06C755" opacity="0.4" />
      <rect x="72" y="45" width="35" height="8" rx="4" fill="#bfdbfe" opacity="0.5" />
      <rect x="65" y="58" width="42" height="8" rx="4" fill="#06C755" opacity="0.3" />
      {/* タップ指 */}
      <g transform="translate(140, 90)">
        <ellipse cx="0" cy="0" rx="14" ry="18" fill="white" stroke="#93c5fd" strokeWidth="1.5" opacity="0.8" />
        <ellipse cx="0" cy="-5" rx="6" ry="10" fill="#fecaca" opacity="0.3" />
      </g>
    </svg>
  );
}

/* ─── イラスト選択 ─── */
const illustrations: Record<string, () => React.ReactNode> = {
  "phone-chat": IllPhoneChat,
  "comparison": IllComparison,
  "digital": IllDigital,
  "calendar": IllCalendar,
  "chart": IllChart,
  "medical": IllMedical,
  "building": IllBuilding,
  "people": IllPeople,
  "ai": IllAI,
  "phone-menu": IllPhoneMenu,
};

/* ═══════════════════════════════════════════════════════════════════════════
   メガホンアイコン（marchスタイルのカテゴリラベル用）
   ═══════════════════════════════════════════════════════════════════════════ */
function MegaphoneIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill={color}>
      <path d="M13.5 3.5c.3-.2.7-.1.9.2.5.9 1.1 3 1.1 6.3s-.6 5.4-1.1 6.3c-.2.3-.6.4-.9.2L8 13H5.5A2.5 2.5 0 013 10.5v-1A2.5 2.5 0 015.5 7H8l5.5-3.5zM15 7a1 1 0 011 1v4a1 1 0 01-2 0V8a1 1 0 011-1z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   メインコンポーネント: ArticleThumbnail
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  slug: string;
  title: string;
  category: string;
  /** "card" = 一覧カード / "hero" = 記事ページヒーロー / "sm" = 関連記事サムネイル */
  size?: "card" | "hero" | "sm";
}

export default function ArticleThumbnail({ slug, title, category, size = "card" }: Props) {
  const meta = thumbMeta[slug] || { subtitle: "", ill: "phone-chat" };
  const theme = catTheme[category] || catTheme["ガイド"];
  const Illustration = illustrations[meta.ill] || IllPhoneChat;

  const isHero = size === "hero";
  const isSm = size === "sm";

  /* sm サイズ: 関連記事用の小さいサムネイル */
  if (isSm) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${theme.from} ${theme.to} aspect-[4/3] flex items-center justify-center`}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/20" />
          <div className="absolute -left-3 bottom-0 h-8 w-8 rounded-full bg-white/15" />
        </div>
        <div className="relative z-10 h-[50px] w-[65px]">
          <Illustration />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${theme.from} ${theme.to} ${
        isHero ? "px-8 py-10 md:px-14 md:py-14" : "px-5 py-5"
      }`}
    >
      {/* 背景デコレーション（丸い形） */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
        <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-white/15" />
        <div className="absolute right-1/4 bottom-4 h-16 w-16 rounded-full bg-white/10" />
      </div>

      <div className={`relative z-10 flex items-center ${isHero ? "gap-8" : "gap-4"}`}>
        {/* 左: テキスト */}
        <div className="flex-1 min-w-0">
          {/* ブランドロゴ（ヒーロー時のみ） */}
          {isHero && (
            <p className="mb-3 text-[13px] font-bold tracking-tight text-gray-400">
              Lオペ <span className="text-blue-500">for CLINIC</span>
            </p>
          )}

          {/* カテゴリラベル */}
          <div className="flex items-center gap-1.5">
            <MegaphoneIcon color={theme.accent} />
            <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${theme.label}`}>
              {category}
            </span>
          </div>

          {/* メインタイトル */}
          <h2
            className={`mt-2 font-extrabold leading-snug tracking-tight text-gray-800 ${
              isHero
                ? "text-[22px] md:text-[30px]"
                : "text-[14px] md:text-[16px] line-clamp-3"
            }`}
          >
            {title}
          </h2>

          {/* サブタイトル */}
          {meta.subtitle && (
            <p
              className={`mt-1.5 text-gray-500 ${
                isHero ? "text-[14px]" : "text-[11px] line-clamp-1"
              }`}
            >
              {meta.subtitle}
            </p>
          )}
        </div>

        {/* 右: イラスト */}
        <div
          className={`shrink-0 ${
            isHero
              ? "hidden h-[180px] w-[240px] md:block"
              : "h-[100px] w-[130px] hidden sm:block"
          }`}
        >
          <Illustration />
        </div>
      </div>
    </div>
  );
}
