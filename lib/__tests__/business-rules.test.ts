// lib/__tests__/business-rules.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// getSettingsBulk をモック
vi.mock("@/lib/settings", () => ({
  getSettingsBulk: vi.fn(),
}));

import { getBusinessRules, BUSINESS_RULES_DEFAULTS } from "@/lib/business-rules";
import { getSettingsBulk } from "@/lib/settings";

const mockGetSettingsBulk = vi.mocked(getSettingsBulk);

describe("getBusinessRules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未設定時はデフォルト値を返す", async () => {
    mockGetSettingsBulk.mockResolvedValue(new Map());

    const rules = await getBusinessRules("tenant-1");

    expect(rules).toEqual(BUSINESS_RULES_DEFAULTS);
    // 既存動作維持: 通知はデフォルトON
    expect(rules.notifyReorderApply).toBe(true);
    expect(rules.notifyReorderApprove).toBe(true);
    expect(rules.notifyReorderPaid).toBe(true);
    expect(rules.notifyReorderShipped).toBe(true);
    // 制限はデフォルトOFF
    expect(rules.dosageChangeNotify).toBe(false);
    expect(rules.autoApproveSameDose).toBe(false);
    expect(rules.minReorderIntervalDays).toBe(0);
    expect(rules.intakeReminderHours).toBe(0);
    expect(rules.paymentThankMessage).toBe("");
  });

  it("設定値を正しくパースする", async () => {
    mockGetSettingsBulk.mockResolvedValue(new Map([
      ["business_rules:dosage_change_notify", "true"],
      ["business_rules:min_reorder_interval_days", "28"],
      ["business_rules:notify_reorder_apply", "false"],
      ["business_rules:notify_reorder_approve", "true"],
      ["business_rules:notify_reorder_paid", "false"],
      ["business_rules:notify_reorder_shipped", "true"],
      ["business_rules:intake_reminder_hours", "24"],
      ["business_rules:payment_thank_message", "ありがとうございます"],
      ["business_rules:auto_approve_same_dose", "true"],
    ]));

    const rules = await getBusinessRules("tenant-1");

    expect(rules.dosageChangeNotify).toBe(true);
    expect(rules.minReorderIntervalDays).toBe(28);
    expect(rules.notifyReorderApply).toBe(false);
    expect(rules.notifyReorderApprove).toBe(true);
    expect(rules.notifyReorderPaid).toBe(false);
    expect(rules.notifyReorderShipped).toBe(true);
    expect(rules.intakeReminderHours).toBe(24);
    expect(rules.paymentThankMessage).toBe("ありがとうございます");
    expect(rules.autoApproveSameDose).toBe(true);
  });

  it("不正な数値はデフォルトにフォールバック", async () => {
    mockGetSettingsBulk.mockResolvedValue(new Map([
      ["business_rules:min_reorder_interval_days", "abc"],
      ["business_rules:intake_reminder_hours", ""],
    ]));

    const rules = await getBusinessRules("tenant-1");

    expect(rules.minReorderIntervalDays).toBe(0);
    expect(rules.intakeReminderHours).toBe(0);
  });

  it("一部だけ設定されている場合、残りはデフォルト", async () => {
    mockGetSettingsBulk.mockResolvedValue(new Map([
      ["business_rules:auto_approve_same_dose", "true"],
      ["business_rules:min_reorder_interval_days", "14"],
    ]));

    const rules = await getBusinessRules("tenant-1");

    expect(rules.autoApproveSameDose).toBe(true);
    expect(rules.minReorderIntervalDays).toBe(14);
    // 残りはデフォルト
    expect(rules.notifyReorderApply).toBe(true);
    expect(rules.dosageChangeNotify).toBe(false);
    expect(rules.paymentThankMessage).toBe("");
  });

  it("tenantId未指定でも動作する", async () => {
    mockGetSettingsBulk.mockResolvedValue(new Map());

    const rules = await getBusinessRules();

    expect(rules).toEqual(BUSINESS_RULES_DEFAULTS);
    expect(mockGetSettingsBulk).toHaveBeenCalledWith(["business_rules"], undefined);
  });

  it("tenantIdを正しく渡す", async () => {
    mockGetSettingsBulk.mockResolvedValue(new Map());

    await getBusinessRules("tenant-abc");

    expect(mockGetSettingsBulk).toHaveBeenCalledWith(["business_rules"], "tenant-abc");
  });
});
