// lib/__tests__/ai-model-routing.test.ts — Case Routing テスト

import { describe, it, expect } from "vitest";
import {
  resolveModelByRouting,
  HAIKU_MODEL_ID,
  CONFIDENCE_THRESHOLD,
  ROUTING_REASONS,
  ROUTING_REASON_LABELS,
  type RoutingDecision,
} from "@/lib/ai-model-routing";
import type { ClassificationResult } from "@/lib/ai-reply-classify";

const SONNET_MODEL = "claude-sonnet-4-6";

/** テスト用の分類結果ヘルパー */
function makeClassification(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    category: "operational",
    should_reply: true,
    escalate_to_staff: false,
    key_topics: [],
    reasoning: "テスト",
    confidence: 0.9,
    ...overrides,
  };
}

describe("resolveModelByRouting", () => {
  // --- case_routing_enabled = false ---
  describe("ルーティング無効時", () => {
    it("常にsonnetModelIdを返す", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "greeting", confidence: 1.0 }),
        SONNET_MODEL,
        false
      );
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.isHaikuRouted).toBe(false);
      expect(result.routingReason).toBe("routing_disabled");
    });

    it("分類結果がnullでもsonnetModelIdを返す", () => {
      const result = resolveModelByRouting(null, SONNET_MODEL, false);
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.routingReason).toBe("routing_disabled");
    });
  });

  // --- 分類失敗 ---
  describe("分類失敗（classificationResult = null）", () => {
    it("Sonnetにフォールバック", () => {
      const result = resolveModelByRouting(null, SONNET_MODEL, true);
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.routingReason).toBe("classification_failed");
      expect(result.isHaikuRouted).toBe(false);
    });
  });

  // --- greeting カテゴリ ---
  describe("greetingカテゴリ", () => {
    it("confidence=0.3 → Haiku", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "greeting", confidence: 0.3 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(HAIKU_MODEL_ID);
      expect(result.isHaikuRouted).toBe(true);
      expect(result.routingReason).toBe("greeting_any");
    });

    it("confidence=0.9 → Haiku", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "greeting", confidence: 0.9 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(HAIKU_MODEL_ID);
    });

    it("confidence=1.0 → Haiku", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "greeting", confidence: 1.0 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(HAIKU_MODEL_ID);
    });
  });

  // --- operational カテゴリ ---
  describe("operationalカテゴリ", () => {
    it("confidence=0.8（境界値）→ Haiku", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "operational", confidence: 0.8 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(HAIKU_MODEL_ID);
      expect(result.routingReason).toBe("operational_high_confidence");
    });

    it("confidence=0.81 → Haiku", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "operational", confidence: 0.81 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(HAIKU_MODEL_ID);
    });

    it("confidence=0.79 → Sonnet", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "operational", confidence: 0.79 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.routingReason).toBe("operational_low_confidence");
    });

    it("confidence=0.0 → Sonnet", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "operational", confidence: 0.0 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(SONNET_MODEL);
    });
  });

  // --- medical カテゴリ ---
  describe("medicalカテゴリ", () => {
    it("confidence=1.0 → Sonnet（常に）", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "medical", confidence: 1.0 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.routingReason).toBe("medical_always_sonnet");
      expect(result.isHaikuRouted).toBe(false);
    });

    it("confidence=0.5 → Sonnet", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "medical", confidence: 0.5 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(SONNET_MODEL);
    });

    it("escalate_to_staff=true → Sonnet", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "medical", confidence: 0.9, escalate_to_staff: true }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.routingReason).toBe("medical_always_sonnet");
    });
  });

  // --- other カテゴリ ---
  describe("otherカテゴリ", () => {
    it("escalate_to_staff=true, confidence=0.9 → Sonnet（エスカレ優先）", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "other", confidence: 0.9, escalate_to_staff: true }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.routingReason).toBe("other_escalate");
    });

    it("confidence=0.8 → Haiku", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "other", confidence: 0.8 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(HAIKU_MODEL_ID);
      expect(result.routingReason).toBe("other_high_confidence");
    });

    it("confidence=0.79 → Sonnet", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "other", confidence: 0.79 }),
        SONNET_MODEL,
        true
      );
      expect(result.modelId).toBe(SONNET_MODEL);
      expect(result.routingReason).toBe("other_low_confidence");
    });
  });

  // --- sonnetModelId の伝播 ---
  describe("sonnetModelIdの伝播", () => {
    it("Sonnet側はsettings.model_idがそのまま使われる", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "medical" }),
        "claude-sonnet-4-6",
        true
      );
      expect(result.modelId).toBe("claude-sonnet-4-6");
    });

    it("sonnetModelId=opus → Opusが返る", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "medical" }),
        "claude-opus-4-6",
        true
      );
      expect(result.modelId).toBe("claude-opus-4-6");
    });

    it("Haiku側はsonnetModelIdに関係なくHAIKU_MODEL_ID固定", () => {
      const result = resolveModelByRouting(
        makeClassification({ category: "greeting" }),
        "claude-opus-4-6",
        true
      );
      expect(result.modelId).toBe(HAIKU_MODEL_ID);
    });
  });

  // --- 定数 ---
  describe("定数", () => {
    it("HAIKU_MODEL_IDがclaude-haiku-4-5-20251001である", () => {
      expect(HAIKU_MODEL_ID).toBe("claude-haiku-4-5-20251001");
    });

    it("CONFIDENCE_THRESHOLDが0.8である", () => {
      expect(CONFIDENCE_THRESHOLD).toBe(0.8);
    });
  });
});

describe("ROUTING_REASON_LABELS", () => {
  it("全てのROUTING_REASONSキーに対応するラベルが存在する", () => {
    for (const reason of Object.values(ROUTING_REASONS)) {
      expect(ROUTING_REASON_LABELS[reason]).toBeDefined();
    }
  });

  it("全ラベルが空文字でない", () => {
    for (const label of Object.values(ROUTING_REASON_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
