"use client";

import { useMemo } from "react";
import { validateFlowGraph, type ValidationIssue, type ValidationSeverity } from "@/lib/flow-validation";
import type { FlowGraph } from "../flow-converter";

interface ValidationPanelProps {
  graph: FlowGraph;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

const SEVERITY_CONFIG: Record<ValidationSeverity, { label: string; color: string; bg: string; icon: string }> = {
  error: {
    label: "エラー",
    color: "#dc2626",
    bg: "#fef2f2",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  warning: {
    label: "警告",
    color: "#d97706",
    bg: "#fffbeb",
    icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  info: {
    label: "情報",
    color: "#2563eb",
    bg: "#eff6ff",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export default function ValidationPanel({ graph, onSelectNode, onClose }: ValidationPanelProps) {
  const result = useMemo(() => validateFlowGraph(graph), [graph]);

  const errorCount = result.issues.filter(i => i.severity === "error").length;
  const warningCount = result.issues.filter(i => i.severity === "warning").length;
  const infoCount = result.issues.filter(i => i.severity === "info").length;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-bold text-gray-700">フロー検証</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* サマリー */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {result.valid ? (
            <div className="flex items-center gap-1.5 text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">有効なフロー</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium">修正が必要です</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {errorCount > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {errorCount} エラー
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {warningCount} 警告
            </span>
          )}
          {infoCount > 0 && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {infoCount} 情報
            </span>
          )}
          {result.issues.length === 0 && (
            <span className="text-xs text-gray-400">問題は見つかりませんでした</span>
          )}
        </div>
      </div>

      {/* 問題リスト */}
      <div className="flex-1 overflow-y-auto">
        {result.issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">問題なし</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {result.issues.map((issue, i) => (
              <IssueItem key={i} issue={issue} onSelect={onSelectNode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueItem({ issue, onSelect }: { issue: ValidationIssue; onSelect: (nodeId: string) => void }) {
  const config = SEVERITY_CONFIG[issue.severity];

  return (
    <button
      onClick={() => issue.nodeId && onSelect(issue.nodeId)}
      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
      disabled={!issue.nodeId}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 mt-0.5 shrink-0"
          fill="none"
          stroke={config.color}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ color: config.color, backgroundColor: config.bg }}
            >
              {config.label}
            </span>
            {issue.nodeId && (
              <span className="text-[10px] text-gray-400 font-mono">{issue.nodeId}</span>
            )}
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">{issue.message}</p>
        </div>
      </div>
    </button>
  );
}
