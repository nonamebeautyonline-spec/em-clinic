// AI Workflow 自動登録エントリポイント
// import されたタイミングで全 workflow をレジストリに登録

import { registerWorkflow } from "./registry";
import { lineReplyWorkflow } from "./workflows/line-reply";
import { supportIntakeWorkflow } from "./workflows/support-intake";
import { salesIntakeWorkflow } from "./workflows/sales-intake";

// 各 workflow を登録
// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerWorkflow(lineReplyWorkflow as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerWorkflow(supportIntakeWorkflow as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerWorkflow(salesIntakeWorkflow as any);

// re-export
export { lineReplyWorkflow } from "./workflows/line-reply";
export { supportIntakeWorkflow } from "./workflows/support-intake";
export { salesIntakeWorkflow } from "./workflows/sales-intake";
export { registerWorkflow, getWorkflow, getWorkflowOrThrow, listWorkflows } from "./registry";
export { runWorkflow } from "./runner";
export { WorkflowTraceBuilder, saveTaskRun } from "./trace-builder";
export type * from "./types";
