// lib/__tests__/usage-storage.test.ts
// ストレージ使用量集計ロジックのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin.storage モック
const mockList = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        list: mockList,
      }),
    },
  },
}));

// 動的インポート（モック設定後）
const { getStorageUsage } = await import("@/lib/usage-storage");

describe("getStorageUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ファイルがある場合、合計サイズとファイル数を返す", async () => {
    mockList.mockResolvedValue({
      data: [
        { name: "file1.jpg", metadata: { size: 1024 } },
        { name: "file2.png", metadata: { size: 2048 } },
        { name: "file3.pdf", metadata: { size: 512 } },
      ],
      error: null,
    });

    const result = await getStorageUsage("tenant-1");
    expect(result.totalBytes).toBe(3584);
    expect(result.fileCount).toBe(3);
  });

  it("フォルダ（metadata.sizeなし）はスキップされる", async () => {
    mockList.mockResolvedValue({
      data: [
        { name: "folder/", metadata: {} },
        { name: "file1.jpg", metadata: { size: 1024 } },
        { name: "folder2/", metadata: null },
      ],
      error: null,
    });

    const result = await getStorageUsage("tenant-1");
    expect(result.totalBytes).toBe(1024);
    expect(result.fileCount).toBe(1);
  });

  it("空のバケットの場合、0を返す", async () => {
    mockList.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await getStorageUsage("tenant-1");
    expect(result.totalBytes).toBe(0);
    expect(result.fileCount).toBe(0);
  });

  it("バケットが存在しない場合（エラー）、0を返す", async () => {
    mockList.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });

    const result = await getStorageUsage("tenant-1");
    expect(result.totalBytes).toBe(0);
    expect(result.fileCount).toBe(0);
  });

  it("例外発生時、0を返す", async () => {
    mockList.mockRejectedValue(new Error("Network error"));

    const result = await getStorageUsage("tenant-1");
    expect(result.totalBytes).toBe(0);
    expect(result.fileCount).toBe(0);
  });

  it("dataがnullの場合、0を返す", async () => {
    mockList.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getStorageUsage("tenant-1");
    expect(result.totalBytes).toBe(0);
    expect(result.fileCount).toBe(0);
  });
});
