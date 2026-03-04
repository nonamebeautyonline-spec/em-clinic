// lib/__tests__/spam-burst.test.ts — 連打防止テスト

const mockIncr = vi.fn();
const mockExpire = vi.fn();
const mockSet = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: {
    incr: (...args: unknown[]) => mockIncr(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}));

import { checkSpamBurst } from "@/lib/spam-burst";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkSpamBurst", () => {
  it("初回（count=1） → blocked: false, TTL設定", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);

    const result = await checkSpamBurst("U1234");
    expect(result.blocked).toBe(false);
    expect(result.shouldNotify).toBe(false);
    expect(mockIncr).toHaveBeenCalledWith("burst:U1234");
    expect(mockExpire).toHaveBeenCalledWith("burst:U1234", 5);
  });

  it("8回目（count=8） → blocked: false（閾値ちょうど）", async () => {
    mockIncr.mockResolvedValue(8);

    const result = await checkSpamBurst("U1234");
    expect(result.blocked).toBe(false);
    expect(result.shouldNotify).toBe(false);
    // 初回ではないのでexpireは呼ばれない
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it("9回目（count=9） → blocked: true, shouldNotify: true（初回通知）", async () => {
    mockIncr.mockResolvedValue(9);
    mockSet.mockResolvedValue("OK"); // SET NX 成功

    const result = await checkSpamBurst("U1234");
    expect(result.blocked).toBe(true);
    expect(result.shouldNotify).toBe(true);
    expect(mockSet).toHaveBeenCalledWith("burst-notified:U1234", "1", { nx: true, ex: 10 });
  });

  it("10回目以降 → blocked: true, shouldNotify: false（通知済み）", async () => {
    mockIncr.mockResolvedValue(10);
    mockSet.mockResolvedValue(null); // SET NX 失敗（既にキーあり）

    const result = await checkSpamBurst("U1234");
    expect(result.blocked).toBe(true);
    expect(result.shouldNotify).toBe(false);
  });

  it("Redis障害時 → blocked: false（サービス継続優先）", async () => {
    mockIncr.mockRejectedValue(new Error("Connection refused"));

    const result = await checkSpamBurst("U1234");
    expect(result.blocked).toBe(false);
    expect(result.shouldNotify).toBe(false);
  });

  it("異なるユーザーは別カウンター", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);

    await checkSpamBurst("Uaaa");
    await checkSpamBurst("Ubbb");

    expect(mockIncr).toHaveBeenCalledWith("burst:Uaaa");
    expect(mockIncr).toHaveBeenCalledWith("burst:Ubbb");
  });
});
