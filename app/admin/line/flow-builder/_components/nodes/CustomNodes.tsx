"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { type FlowNodeType, type StepItemData, getNodeColor } from "../../flow-converter";

/* ---------- 共通ノードシェル ---------- */

interface FlowNodeData {
  flowType: FlowNodeType;
  label: string;
  stepData: StepItemData;
  isSelected?: boolean;
}

// ReactFlow Node type
export type CustomFlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FlowNodeData;
};

/** ノードタイプの日本語表示 */
const NODE_TYPE_LABELS: Record<string, string> = {
  send: "送信",
  condition: "条件分岐",
  wait: "待機",
  tag: "タグ",
  menu: "メニュー",
  ab_test: "A/Bテスト",
  webhook: "Webhook",
  delay_until: "日時待機",
  random: "ランダム",
  goal: "ゴール",
  note: "メモ",
};

/** ノードタイプのアイコンSVGパス */
const NODE_ICONS: Record<string, string> = {
  send: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  condition: "M8 9l4-4 4 4m0 6l-4 4-4-4",
  wait: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z",
  menu: "M4 6h16M4 10h16M4 14h16M4 18h16",
  ab_test: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  webhook: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  delay_until: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  random: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  goal: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm0 0h18",
  note: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
};

/** 共通ノードラッパー */
function BaseNodeShell({
  flowType,
  children,
  hasBottomHandle = true,
  bottomHandles,
  width = 220,
}: {
  flowType: FlowNodeType;
  children: ReactNode;
  hasBottomHandle?: boolean;
  bottomHandles?: ReactNode;
  width?: number;
}) {
  const colors = getNodeColor(flowType);
  const typeLabel = NODE_TYPE_LABELS[flowType] || flowType;
  const iconPath = NODE_ICONS[flowType] || NODE_ICONS.send;

  return (
    <div
      className="rounded-lg shadow-sm border overflow-hidden"
      style={{
        width: `${width}px`,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      {/* 入力ハンドル（上部） */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !rounded-full"
        style={{ backgroundColor: colors.headerBg }}
      />

      {/* ヘッダー */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5"
        style={{ backgroundColor: colors.headerBg }}
      >
        <svg className="w-3 h-3 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
        <span className="text-[10px] font-bold text-white truncate">{typeLabel}</span>
      </div>

      {/* コンテンツ */}
      <div className="px-2.5 py-2 min-h-[32px]">{children}</div>

      {/* 出力ハンドル */}
      {bottomHandles || (hasBottomHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !border-2 !border-white !rounded-full"
          style={{ backgroundColor: colors.headerBg }}
        />
      ))}
    </div>
  );
}

/* ---------- 各ノードタイプ ---------- */

/** 送信ノード */
const SendNode = memo(function SendNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const stepData = d.stepData;
  const isSendTemplate = stepData.step_type === "send_template";

  return (
    <BaseNodeShell flowType="send">
      {isSendTemplate ? (
        <div className="text-[11px] text-blue-700">
          <span className="text-[10px] text-blue-400">テンプレート</span>
          <br />
          {stepData.template_id ? `ID: ${stepData.template_id}` : "未設定"}
        </div>
      ) : (
        <div className="text-[11px] text-blue-700 line-clamp-3">
          {stepData.content
            ? stepData.content.substring(0, 60) + (stepData.content.length > 60 ? "..." : "")
            : <span className="text-blue-300">メッセージ未設定</span>}
        </div>
      )}
    </BaseNodeShell>
  );
});

/** 条件分岐ノード */
const ConditionNode = memo(function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const ruleCount = d.stepData.condition_rules?.length || 0;

  return (
    <BaseNodeShell flowType="condition" hasBottomHandle={false} bottomHandles={
      <>
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="!w-3 !h-3 !border-2 !border-white !rounded-full"
          style={{ backgroundColor: "#22c55e", left: "33%" }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="!w-3 !h-3 !border-2 !border-white !rounded-full"
          style={{ backgroundColor: "#ef4444", left: "67%" }}
        />
        <div className="flex justify-between px-6 pb-1 -mt-0.5">
          <span className="text-[9px] font-medium text-green-600">True</span>
          <span className="text-[9px] font-medium text-red-600">False</span>
        </div>
      </>
    }>
      <div className="text-[11px] text-amber-700">
        {ruleCount > 0
          ? `${ruleCount}件の条件`
          : <span className="text-amber-400">条件未設定</span>}
      </div>
    </BaseNodeShell>
  );
});

/** 待機ノード */
const WaitNode = memo(function WaitNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const sd = d.stepData;
  const unit = sd.delay_type === "minutes" ? "分" : sd.delay_type === "hours" ? "時間" : "日";
  const time = sd.delay_type === "days" && sd.send_time ? ` ${sd.send_time}` : "";

  return (
    <BaseNodeShell flowType="wait" width={180}>
      <div className="text-[11px] text-gray-600 text-center font-medium">
        {sd.delay_value}{unit}後{time}
      </div>
    </BaseNodeShell>
  );
});

/** タグ操作ノード */
const TagNode = memo(function TagNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const sd = d.stepData;
  const action = sd.step_type === "tag_remove" ? "除去" : sd.step_type === "mark_change" ? "マーク変更" : "追加";

  return (
    <BaseNodeShell flowType="tag">
      <div className="text-[11px] text-green-700">
        <span className="text-[10px] text-green-500">{action}</span>
        <br />
        {sd.step_type === "mark_change"
          ? (sd.mark || <span className="text-green-300">未設定</span>)
          : (sd.tag_id ? `タグID: ${sd.tag_id}` : <span className="text-green-300">未設定</span>)}
      </div>
    </BaseNodeShell>
  );
});

/** メニュー変更ノード */
const MenuNode = memo(function MenuNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;

  return (
    <BaseNodeShell flowType="menu">
      <div className="text-[11px] text-purple-700">
        {d.stepData.menu_id
          ? `メニューID: ${d.stepData.menu_id}`
          : <span className="text-purple-300">未設定</span>}
      </div>
    </BaseNodeShell>
  );
});

/** A/Bテストノード */
const ABTestNode = memo(function ABTestNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const lines = d.label.split("\n");

  return (
    <BaseNodeShell flowType="ab_test" hasBottomHandle={false} bottomHandles={
      <>
        <Handle
          type="source"
          position={Position.Bottom}
          id="a"
          className="!w-3 !h-3 !border-2 !border-white !rounded-full"
          style={{ backgroundColor: "#f59e0b", left: "33%" }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="b"
          className="!w-3 !h-3 !border-2 !border-white !rounded-full"
          style={{ backgroundColor: "#f59e0b", left: "67%" }}
        />
        <div className="flex justify-between px-6 pb-1 -mt-0.5">
          <span className="text-[9px] font-medium text-amber-600">A</span>
          <span className="text-[9px] font-medium text-amber-600">B</span>
        </div>
      </>
    }>
      <div className="text-[11px] text-amber-700">
        {lines.length > 1 ? lines.slice(1).join(" ") : "バリアント未設定"}
      </div>
    </BaseNodeShell>
  );
});

/** Webhookノード */
const WebhookNode = memo(function WebhookNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;

  return (
    <BaseNodeShell flowType="webhook">
      <div className="text-[11px] text-red-700">
        {d.stepData.content
          ? <span className="font-mono text-[10px]">{d.stepData.content.substring(0, 40)}</span>
          : <span className="text-red-300">URL未設定</span>}
      </div>
    </BaseNodeShell>
  );
});

/** 日時待機ノード */
const DelayUntilNode = memo(function DelayUntilNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;

  return (
    <BaseNodeShell flowType="delay_until">
      <div className="text-[11px] text-teal-700">
        {d.stepData.content
          ? d.stepData.content
          : <span className="text-teal-400">日時未設定</span>}
      </div>
    </BaseNodeShell>
  );
});

/** ランダム分岐ノード */
const RandomNode = memo(function RandomNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const lines = d.label.split("\n");

  return (
    <BaseNodeShell flowType="random" hasBottomHandle={false} bottomHandles={
      <>
        <Handle
          type="source"
          position={Position.Bottom}
          id="a"
          className="!w-3 !h-3 !border-2 !border-white !rounded-full"
          style={{ backgroundColor: "#d946ef", left: "33%" }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="b"
          className="!w-3 !h-3 !border-2 !border-white !rounded-full"
          style={{ backgroundColor: "#d946ef", left: "67%" }}
        />
      </>
    }>
      <div className="text-[11px] text-fuchsia-700">
        {lines.length > 1 ? lines.slice(1).join(" ") : "%分岐"}
      </div>
    </BaseNodeShell>
  );
});

/** ゴールノード */
const GoalNode = memo(function GoalNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;

  return (
    <BaseNodeShell flowType="goal" hasBottomHandle={false}>
      <div className="text-[11px] text-emerald-700 text-center">
        {d.stepData.content || "コンバージョン"}
      </div>
    </BaseNodeShell>
  );
});

/** メモノード */
const NoteNode = memo(function NoteNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData;

  return (
    <BaseNodeShell flowType="note" hasBottomHandle={false} width={200}>
      <div className="text-[11px] text-amber-800 italic whitespace-pre-wrap line-clamp-4">
        {d.stepData.content || "メモを入力..."}
      </div>
    </BaseNodeShell>
  );
});

/* ---------- ノードタイプマップ（ReactFlow登録用） ---------- */

export const nodeTypes = {
  send: SendNode,
  condition: ConditionNode,
  wait: WaitNode,
  tag: TagNode,
  menu: MenuNode,
  ab_test: ABTestNode,
  webhook: WebhookNode,
  delay_until: DelayUntilNode,
  random: RandomNode,
  goal: GoalNode,
  note: NoteNode,
};
