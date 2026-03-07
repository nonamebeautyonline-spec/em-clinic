import { describe, it, expect } from "vitest";
import {
  isToolboxDragId,
  parseToolboxBlockType,
  reorderBlocks,
  insertBlockAt,
  getDropIndex,
  TOOLBOX_PREFIX,
} from "@/lib/flex-editor/dnd-utils";
import type { EditorBlock, BlockProps } from "@/lib/flex-editor/block-types";

// ── ヘルパー ──

function makeBlock(id: string, blockType: string = "text"): EditorBlock {
  return {
    id,
    props: { blockType, text: `テスト ${id}`, wrap: true } as BlockProps,
  };
}

// ── テスト ──

describe("flex-dnd: ツールボックスID判定", () => {
  it("ツールボックスプレフィックス付きIDをtrueと判定する", () => {
    expect(isToolboxDragId(`${TOOLBOX_PREFIX}text`)).toBe(true);
    expect(isToolboxDragId(`${TOOLBOX_PREFIX}image`)).toBe(true);
    expect(isToolboxDragId(`${TOOLBOX_PREFIX}button`)).toBe(true);
    expect(isToolboxDragId(`${TOOLBOX_PREFIX}title`)).toBe(true);
    expect(isToolboxDragId(`${TOOLBOX_PREFIX}separator`)).toBe(true);
  });

  it("通常のブロックIDをfalseと判定する", () => {
    expect(isToolboxDragId("blk_123_abc")).toBe(false);
    expect(isToolboxDragId("some-other-id")).toBe(false);
    expect(isToolboxDragId("")).toBe(false);
  });

  it("TOOLBOX_PREFIXが 'toolbox-' であること", () => {
    expect(TOOLBOX_PREFIX).toBe("toolbox-");
  });
});

describe("flex-dnd: parseToolboxBlockType", () => {
  it("有効なブロックタイプを正しくパースする", () => {
    expect(parseToolboxBlockType(`${TOOLBOX_PREFIX}text`)).toBe("text");
    expect(parseToolboxBlockType(`${TOOLBOX_PREFIX}image`)).toBe("image");
    expect(parseToolboxBlockType(`${TOOLBOX_PREFIX}button`)).toBe("button");
    expect(parseToolboxBlockType(`${TOOLBOX_PREFIX}title`)).toBe("title");
    expect(parseToolboxBlockType(`${TOOLBOX_PREFIX}separator`)).toBe("separator");
  });

  it("無効なブロックタイプはnullを返す", () => {
    expect(parseToolboxBlockType(`${TOOLBOX_PREFIX}unknown`)).toBeNull();
    expect(parseToolboxBlockType(`${TOOLBOX_PREFIX}`)).toBeNull();
    expect(parseToolboxBlockType("blk_123")).toBeNull();
  });

  it("ツールボックスIDでない場合はnullを返す", () => {
    expect(parseToolboxBlockType("text")).toBeNull();
    expect(parseToolboxBlockType("")).toBeNull();
  });
});

describe("flex-dnd: reorderBlocks（ブロック並べ替え）", () => {
  const blocks = [makeBlock("a"), makeBlock("b"), makeBlock("c"), makeBlock("d")];

  it("activeIdのブロックをoverIdの位置に移動する", () => {
    // aをcの位置に移動: aを取り出し[b,c,d]、cのインデックス(1)に挿入 → [b, c, a, d]
    // ではなく、overIdの元のインデックス(2)を先に取得してsplice
    const result = reorderBlocks(blocks, "a", "c");
    expect(result.map((b) => b.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("後方から前方への移動", () => {
    const result = reorderBlocks(blocks, "d", "b");
    expect(result.map((b) => b.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("同じIDの場合は元の配列を返す", () => {
    const result = reorderBlocks(blocks, "b", "b");
    expect(result).toBe(blocks); // 参照が同じ
  });

  it("activeIdが存在しない場合は元の配列を返す", () => {
    const result = reorderBlocks(blocks, "x", "b");
    expect(result).toBe(blocks);
  });

  it("overIdが存在しない場合は元の配列を返す", () => {
    const result = reorderBlocks(blocks, "a", "x");
    expect(result).toBe(blocks);
  });

  it("元の配列を変更しない（イミュータブル）", () => {
    const original = [...blocks];
    reorderBlocks(blocks, "a", "c");
    expect(blocks.map((b) => b.id)).toEqual(original.map((b) => b.id));
  });

  it("2要素の並べ替え", () => {
    const twoBlocks = [makeBlock("x"), makeBlock("y")];
    const result = reorderBlocks(twoBlocks, "y", "x");
    expect(result.map((b) => b.id)).toEqual(["y", "x"]);
  });

  it("隣接要素の前方移動", () => {
    const result = reorderBlocks(blocks, "b", "a");
    expect(result.map((b) => b.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("隣接要素の後方移動", () => {
    // aをbの位置(1)に移動: aを取り出し[b,c,d]、インデックス1に挿入 → [b, a, c, d]
    const result = reorderBlocks(blocks, "a", "b");
    expect(result.map((b) => b.id)).toEqual(["b", "a", "c", "d"]);
  });
});

describe("flex-dnd: insertBlockAt（ブロック挿入）", () => {
  const blocks = [makeBlock("a"), makeBlock("b"), makeBlock("c")];
  const newBlock = makeBlock("new");

  it("overIdの位置に新しいブロックを挿入する", () => {
    const result = insertBlockAt(blocks, newBlock, "b");
    expect(result.map((b) => b.id)).toEqual(["a", "new", "b", "c"]);
  });

  it("先頭に挿入する", () => {
    const result = insertBlockAt(blocks, newBlock, "a");
    expect(result.map((b) => b.id)).toEqual(["new", "a", "b", "c"]);
  });

  it("末尾に挿入する（overIdがnull）", () => {
    const result = insertBlockAt(blocks, newBlock, null);
    expect(result.map((b) => b.id)).toEqual(["a", "b", "c", "new"]);
  });

  it("存在しないoverIdの場合は末尾に追加する", () => {
    const result = insertBlockAt(blocks, newBlock, "x");
    expect(result.map((b) => b.id)).toEqual(["a", "b", "c", "new"]);
  });

  it("空のブロック配列への挿入", () => {
    const result = insertBlockAt([], newBlock, null);
    expect(result.map((b) => b.id)).toEqual(["new"]);
  });

  it("元の配列を変更しない（イミュータブル）", () => {
    const original = blocks.map((b) => b.id);
    insertBlockAt(blocks, newBlock, "b");
    expect(blocks.map((b) => b.id)).toEqual(original);
  });
});

describe("flex-dnd: getDropIndex（ドロップ位置取得）", () => {
  const blocks = [makeBlock("a"), makeBlock("b"), makeBlock("c")];

  it("存在するoverIdのインデックスを返す", () => {
    expect(getDropIndex(blocks, "a")).toBe(0);
    expect(getDropIndex(blocks, "b")).toBe(1);
    expect(getDropIndex(blocks, "c")).toBe(2);
  });

  it("nullの場合は配列の長さを返す", () => {
    expect(getDropIndex(blocks, null)).toBe(3);
  });

  it("存在しないIDの場合は配列の長さを返す", () => {
    expect(getDropIndex(blocks, "x")).toBe(3);
  });

  it("空の配列の場合は0を返す", () => {
    expect(getDropIndex([], null)).toBe(0);
    expect(getDropIndex([], "x")).toBe(0);
  });
});

describe("flex-dnd: 統合シナリオ", () => {
  it("ツールボックスからのドラッグイン → 既存ブロック間に挿入", () => {
    const dragId = `${TOOLBOX_PREFIX}button`;
    expect(isToolboxDragId(dragId)).toBe(true);
    expect(parseToolboxBlockType(dragId)).toBe("button");

    const blocks = [makeBlock("a"), makeBlock("b"), makeBlock("c")];
    const newBlock = makeBlock("btn1");
    const result = insertBlockAt(blocks, newBlock, "b");
    expect(result.map((b) => b.id)).toEqual(["a", "btn1", "b", "c"]);
  });

  it("既存ブロックの並べ替え → 先頭を末尾に移動", () => {
    const blocks = [makeBlock("1"), makeBlock("2"), makeBlock("3")];
    expect(isToolboxDragId("1")).toBe(false);
    const result = reorderBlocks(blocks, "1", "3");
    // 1を取り出し[2,3]、3のインデックス(2)に挿入 → [2, 3, 1]
    expect(result.map((b) => b.id)).toEqual(["2", "3", "1"]);
  });

  it("連続した並べ替え操作の結果が正しい", () => {
    let blocks = [makeBlock("a"), makeBlock("b"), makeBlock("c"), makeBlock("d")];
    // a→cの位置に移動: aを取り出し[b,c,d]、cのインデックス(2)に挿入 → [b, c, a, d]
    blocks = reorderBlocks(blocks, "a", "c");
    expect(blocks.map((b) => b.id)).toEqual(["b", "c", "a", "d"]);

    // d→bの位置に移動: dを取り出し[b,c,a]、bのインデックス(0)に挿入 → [d, b, c, a]
    blocks = reorderBlocks(blocks, "d", "b");
    expect(blocks.map((b) => b.id)).toEqual(["d", "b", "c", "a"]);
  });
});
