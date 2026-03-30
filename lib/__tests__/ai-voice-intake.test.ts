// AI Voice Intake テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin モック
const mockInsertData = { id: 42 };
let mockInsertError: { message: string } | null = null;

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockInsertError ? null : mockInsertData,
            error: mockInsertError,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [
                {
                  id: 1,
                  call_id: "call-001",
                  caller_phone: "09012345678",
                  patient_id: null,
                  call_summary: "予約の確認をしたい",
                  call_duration_sec: 120,
                  call_direction: "inbound",
                  tenant_id: "t-001",
                  task_id: null,
                  created_at: "2026-03-30T10:00:00Z",
                },
              ],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

import { processVoiceCall, listVoiceSummaries } from "../ai-voice-intake";

describe("processVoiceCall", () => {
  beforeEach(() => {
    mockInsertError = null;
  });

  it("通話要約を保存してworkflow入力に変換", async () => {
    const result = await processVoiceCall({
      callId: "call-001",
      callerPhone: "09012345678",
      callSummary: "予約の確認をしたいのですが",
      callDurationSec: 120,
      callDirection: "inbound",
      tenantId: "t-001",
    });

    expect(result.voiceSummaryId).toBe(42);
    expect(result.workflowInput.text).toBe("予約の確認をしたいのですが");
    expect(result.workflowInput.senderType).toBe("patient");
    expect(result.workflowInput.sourceChannel).toBe("voice");
    expect(result.workflowInput.callDurationSec).toBe(120);
    expect(result.workflowInput.callDirection).toBe("inbound");
  });

  it("patientId指定時はworkflow入力に含まれる", async () => {
    const result = await processVoiceCall({
      callId: "call-002",
      callerPhone: "09087654321",
      patientId: "p-001",
      callSummary: "薬の処方について",
      callDurationSec: 300,
      callDirection: "inbound",
      tenantId: "t-001",
    });

    expect(result.workflowInput.patientId).toBe("p-001");
  });
});

describe("listVoiceSummaries", () => {
  it("テナントの通話一覧を取得", async () => {
    const results = await listVoiceSummaries("t-001");
    expect(results).toHaveLength(1);
    expect(results[0].callId).toBe("call-001");
    expect(results[0].callerPhone).toBe("09012345678");
  });
});
