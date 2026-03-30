// lib/__tests__/form-stats.test.ts
// フォーム回答集計ロジックのテスト
import { describe, it, expect } from "vitest";
import { aggregateFormStats, FormFieldDef } from "@/lib/form-stats";

describe("aggregateFormStats", () => {
  // === 基本動作 ===
  it("空の回答配列で totalResponses=0 を返す", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "text", label: "名前" },
    ];
    const result = aggregateFormStats(fields, []);
    expect(result.totalResponses).toBe(0);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].total).toBe(0);
  });

  it("空のフィールド配列で fields=[] を返す", () => {
    const result = aggregateFormStats([], [{ q1: "test" }]);
    expect(result.totalResponses).toBe(1);
    expect(result.fields).toHaveLength(0);
  });

  // === SKIP_TYPES ===
  it("heading_sm / heading_md / file タイプはスキップされる", () => {
    const fields: FormFieldDef[] = [
      { id: "h1", type: "heading_sm", label: "見出し小" },
      { id: "h2", type: "heading_md", label: "見出し中" },
      { id: "f1", type: "file", label: "ファイル" },
      { id: "q1", type: "text", label: "テキスト" },
    ];
    const result = aggregateFormStats(fields, []);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].id).toBe("q1");
  });

  // === テキスト/textarea ===
  it("テキストフィールドの回答件数をカウントする", () => {
    const fields: FormFieldDef[] = [
      { id: "name", type: "text", label: "名前" },
    ];
    const responses = [
      { name: "田中" },
      { name: "" },
      { name: null },
      { name: "鈴木" },
      { name: undefined },
    ];
    const result = aggregateFormStats(fields, responses as any);
    expect(result.totalResponses).toBe(5);
    expect(result.fields[0].total).toBe(2); // 田中、鈴木のみ
  });

  // === 選択肢系フィールド ===
  it("radio/dropdownの選択肢別カウントを集計する", () => {
    const fields: FormFieldDef[] = [
      { id: "gender", type: "radio", label: "性別", options: ["男性", "女性", "その他"] },
    ];
    const responses = [
      { gender: "男性" },
      { gender: "男性" },
      { gender: "女性" },
      { gender: "" },
    ];
    const result = aggregateFormStats(fields, responses);
    const stat = result.fields[0];
    expect(stat.total).toBe(3);
    expect(stat.options).toEqual([
      { label: "男性", count: 2 },
      { label: "女性", count: 1 },
      { label: "その他", count: 0 },
    ]);
  });

  it("checkboxの複数選択を正しくカウントする", () => {
    const fields: FormFieldDef[] = [
      { id: "symptoms", type: "checkbox", label: "症状", options: ["頭痛", "腹痛", "発熱"] },
    ];
    const responses = [
      { symptoms: ["頭痛", "発熱"] },
      { symptoms: ["腹痛"] },
      { symptoms: [] }, // 空配列は回答なし
    ];
    const result = aggregateFormStats(fields, responses);
    const stat = result.fields[0];
    expect(stat.total).toBe(2); // 空配列は除外
    expect(stat.options).toEqual([
      { label: "頭痛", count: 1 },
      { label: "腹痛", count: 1 },
      { label: "発熱", count: 1 },
    ]);
  });

  // === 定義にないオプションが回答に含まれる場合 ===
  it("定義外の選択肢もカウントに含まれる", () => {
    const fields: FormFieldDef[] = [
      { id: "area", type: "dropdown", label: "地域", options: ["東京", "大阪"] },
    ];
    const responses = [{ area: "名古屋" }];
    const result = aggregateFormStats(fields, responses);
    const stat = result.fields[0];
    expect(stat.options).toContainEqual({ label: "名古屋", count: 1 });
    expect(stat.options).toContainEqual({ label: "東京", count: 0 });
  });

  // === 日付フィールド ===
  it("日付フィールドの回答件数をカウントする", () => {
    const fields: FormFieldDef[] = [
      { id: "birthday", type: "date", label: "生年月日" },
    ];
    const responses = [
      { birthday: "1990-01-01" },
      { birthday: null },
      { birthday: "2000-12-31" },
    ];
    const result = aggregateFormStats(fields, responses as any);
    expect(result.fields[0].total).toBe(2);
  });

  // === 複数フィールド混合 ===
  it("複数フィールドの混合集計が正しい", () => {
    const fields: FormFieldDef[] = [
      { id: "name", type: "text", label: "名前" },
      { id: "pref", type: "prefecture", label: "都道府県", options: ["東京都", "神奈川県"] },
    ];
    const responses = [
      { name: "田中", pref: "東京都" },
      { name: "鈴木", pref: "東京都" },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].total).toBe(2);
    expect(result.fields[1].total).toBe(2);
    expect(result.fields[1].options).toContainEqual({ label: "東京都", count: 2 });
  });
});
