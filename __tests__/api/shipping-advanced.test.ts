// __tests__/api/shipping-advanced.test.ts
// 配送関連テスト（追跡番号フォーマット・CSV解析・通知）
import { describe, it, expect } from "vitest";

// === 追跡番号フォーマット ===
describe("shipping 追跡番号フォーマット", () => {
  function formatTrackingNumber(num: string): string {
    const digits = num.replace(/\D/g, "");
    if (digits.length === 12) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
    }
    return num;
  }

  it("12桁 → XXXX-XXXX-XXXX", () => {
    expect(formatTrackingNumber("123456789012")).toBe("1234-5678-9012");
  });

  it("ハイフン付き12桁 → 整形し直す", () => {
    expect(formatTrackingNumber("1234-5678-9012")).toBe("1234-5678-9012");
  });

  it("11桁 → そのまま返す", () => {
    expect(formatTrackingNumber("12345678901")).toBe("12345678901");
  });

  it("13桁 → そのまま返す", () => {
    expect(formatTrackingNumber("1234567890123")).toBe("1234567890123");
  });

  it("空文字 → そのまま返す", () => {
    expect(formatTrackingNumber("")).toBe("");
  });

  it("スペース混在の12桁 → 正しくフォーマット", () => {
    expect(formatTrackingNumber("1234 5678 9012")).toBe("1234-5678-9012");
  });
});

// === キャリア別追跡URL構築 ===
describe("shipping キャリア別追跡URL", () => {
  function buildTrackingUrl(carrier: string, trackingNumber: string): string {
    const tn = encodeURIComponent(trackingNumber.replace(/\D/g, ""));
    if (carrier === "japanpost") {
      return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${tn}`;
    }
    return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${tn}`;
  }

  it("japanpost → 日本郵便URL", () => {
    const url = buildTrackingUrl("japanpost", "123456789012");
    expect(url).toContain("japanpost.jp");
    expect(url).toContain("reqCodeNo1=123456789012");
  });

  it("yamato → ヤマト運輸URL", () => {
    const url = buildTrackingUrl("yamato", "123456789012");
    expect(url).toContain("kuronekoyamato.co.jp");
    expect(url).toContain("pno=123456789012");
  });

  it("不明キャリア → ヤマト運輸URL（デフォルト）", () => {
    const url = buildTrackingUrl("unknown", "123456789012");
    expect(url).toContain("kuronekoyamato.co.jp");
  });

  it("ハイフン付き番号 → 数字のみでURLエンコード", () => {
    const url = buildTrackingUrl("japanpost", "1234-5678-9012");
    expect(url).toContain("reqCodeNo1=123456789012");
  });
});

// === キャリア表示ラベル ===
describe("shipping キャリア表示ラベル", () => {
  function carrierLabel(carrier: string): string {
    if (carrier === "japanpost") return "日本郵便";
    return "ヤマト運輸 チルド便";
  }

  it("japanpost → 日本郵便", () => {
    expect(carrierLabel("japanpost")).toBe("日本郵便");
  });

  it("yamato → ヤマト運輸 チルド便", () => {
    expect(carrierLabel("yamato")).toBe("ヤマト運輸 チルド便");
  });

  it("空文字 → ヤマト運輸 チルド便（デフォルト）", () => {
    expect(carrierLabel("")).toBe("ヤマト運輸 チルド便");
  });
});

// === CSV行フィルタリング ===
describe("shipping CSV行フィルタリング", () => {
  function filterCSVLines(rawText: string): string[] {
    return rawText.split("\n").filter((line) => line.trim());
  }

  it("通常のCSV → 空行除外", () => {
    const lines = filterCSVLines("header\nrow1\n\nrow2\n");
    expect(lines).toEqual(["header", "row1", "row2"]);
  });

  it("末尾に複数空行", () => {
    const lines = filterCSVLines("header\nrow1\n\n\n");
    expect(lines).toEqual(["header", "row1"]);
  });

  it("空文字のみ → 空配列", () => {
    const lines = filterCSVLines("");
    expect(lines).toEqual([]);
  });

  it("スペースのみの行 → 除外", () => {
    const lines = filterCSVLines("header\n   \nrow1");
    expect(lines).toEqual(["header", "row1"]);
  });
});

// === BOM除去 ===
describe("shipping BOM除去", () => {
  function removeBOM(content: string): string {
    if (content.charCodeAt(0) === 0xfeff) {
      return content.slice(1);
    }
    return content;
  }

  it("BOM付き → 除去", () => {
    const withBom = "\uFEFFheader,col1";
    expect(removeBOM(withBom)).toBe("header,col1");
  });

  it("BOMなし → そのまま", () => {
    expect(removeBOM("header,col1")).toBe("header,col1");
  });

  it("空文字 → そのまま", () => {
    expect(removeBOM("")).toBe("");
  });
});

// === デリミタ自動判定 ===
describe("shipping デリミタ自動判定", () => {
  function detectDelimiter(firstLine: string): string {
    return firstLine.includes("\t") ? "\t" : ",";
  }

  it("タブ含む → タブ区切り", () => {
    expect(detectDelimiter("col1\tcol2\tcol3")).toBe("\t");
  });

  it("カンマ含む → カンマ区切り", () => {
    expect(detectDelimiter("col1,col2,col3")).toBe(",");
  });

  it("両方含む → タブ優先", () => {
    expect(detectDelimiter("col1,sub\tcol2")).toBe("\t");
  });

  it("区切りなし → カンマ（デフォルト）", () => {
    expect(detectDelimiter("singlecolumn")).toBe(",");
  });
});

// === payment_id 合箱対応 ===
describe("shipping payment_id 合箱対応", () => {
  function splitPaymentIds(rawPaymentId: string): string[] {
    return rawPaymentId.split(",").map((id) => id.trim()).filter(Boolean);
  }

  it("単一ID → 1要素", () => {
    expect(splitPaymentIds("PAY001")).toEqual(["PAY001"]);
  });

  it("カンマ区切り複数ID → 分割", () => {
    expect(splitPaymentIds("PAY001,PAY002,PAY003")).toEqual(["PAY001", "PAY002", "PAY003"]);
  });

  it("カンマ+スペース → トリムされる", () => {
    expect(splitPaymentIds("PAY001, PAY002")).toEqual(["PAY001", "PAY002"]);
  });

  it("空文字 → 空配列", () => {
    expect(splitPaymentIds("")).toEqual([]);
  });

  it("末尾カンマ → 空要素は除外", () => {
    expect(splitPaymentIds("PAY001,")).toEqual(["PAY001"]);
  });
});

// === ダブルクォート除去 ===
describe("shipping ダブルクォート除去", () => {
  function removeQuotes(value: string): string {
    return value.replace(/^"|"$/g, "");
  }

  it("クォート付き → 除去", () => {
    expect(removeQuotes('"hello"')).toBe("hello");
  });

  it("クォートなし → そのまま", () => {
    expect(removeQuotes("hello")).toBe("hello");
  });

  it("片側のみ → 片側だけ除去", () => {
    expect(removeQuotes('"hello')).toBe("hello");
  });

  it("空文字 → 空文字", () => {
    expect(removeQuotes("")).toBe("");
  });
});

// === 日付フォーマット ===
describe("shipping 日付フォーマット", () => {
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }

  it("2026-01-01 → 2026/01/01", () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe("2026/01/01");
  });

  it("2026-12-31 → 2026/12/31", () => {
    expect(formatDate(new Date(2026, 11, 31))).toBe("2026/12/31");
  });

  it("月が1桁 → ゼロパディング", () => {
    expect(formatDate(new Date(2026, 1, 5))).toBe("2026/02/05");
  });
});

// === ユニーク患者ID抽出 ===
describe("shipping ユニーク患者ID抽出", () => {
  it("重複あり → ユニーク化", () => {
    const orders = [
      { patient_id: "p1" },
      { patient_id: "p2" },
      { patient_id: "p1" },
      { patient_id: "p3" },
    ];
    const unique = [...new Set(orders.map((o) => o.patient_id))];
    expect(unique).toEqual(["p1", "p2", "p3"]);
  });

  it("空配列 → 空配列", () => {
    const unique = [...new Set(([] as { patient_id: string }[]).map((o) => o.patient_id))];
    expect(unique).toEqual([]);
  });

  it("全て同じ → 1要素", () => {
    const orders = [{ patient_id: "p1" }, { patient_id: "p1" }];
    const unique = [...new Set(orders.map((o) => o.patient_id))];
    expect(unique).toEqual(["p1"]);
  });
});

// === altText 生成 ===
describe("shipping altText 生成", () => {
  function buildAltText(formatted: string, label: string): string {
    return `【発送完了】追跡番号: ${formatted} ${label}にて発送しました`;
  }

  it("ヤマト運輸の場合", () => {
    const alt = buildAltText("1234-5678-9012", "ヤマト運輸 チルド便");
    expect(alt).toBe("【発送完了】追跡番号: 1234-5678-9012 ヤマト運輸 チルド便にて発送しました");
  });

  it("日本郵便の場合", () => {
    const alt = buildAltText("1234-5678-9012", "日本郵便");
    expect(alt).toContain("日本郵便");
  });
});

// === 送信結果判定 ===
describe("shipping 送信結果判定", () => {
  function determineStatus(res: { ok: boolean } | null | undefined): string {
    return res?.ok ? "sent" : "failed";
  }

  it("ok=true → sent", () => {
    expect(determineStatus({ ok: true })).toBe("sent");
  });

  it("ok=false → failed", () => {
    expect(determineStatus({ ok: false })).toBe("failed");
  });

  it("null → failed", () => {
    expect(determineStatus(null)).toBe("failed");
  });

  it("undefined → failed", () => {
    expect(determineStatus(undefined)).toBe("failed");
  });
});
