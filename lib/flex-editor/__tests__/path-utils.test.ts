import { describe, it, expect } from "vitest";
import {
  getAtPath,
  setAtPath,
  removeAtPath,
  insertAtPath,
  moveInArray,
  parentPath,
  lastKey,
} from "../path-utils";

// ================================================================
// getAtPath
// ================================================================
describe("getAtPath", () => {
  const obj = {
    body: {
      contents: [
        { type: "text", text: "Hello" },
        { type: "image", url: "https://example.com/img.png" },
      ],
      layout: "vertical",
    },
    header: null,
  };

  it("空パスの場合、オブジェクト自体を返す", () => {
    expect(getAtPath(obj, "")).toBe(obj);
  });

  it("ドット区切りのパスでネストされた値を取得できる", () => {
    expect(getAtPath(obj, "body.layout")).toBe("vertical");
  });

  it("配列インデックスで要素を取得できる", () => {
    expect(getAtPath(obj, "body.contents.0.text")).toBe("Hello");
    expect(getAtPath(obj, "body.contents.1.type")).toBe("image");
  });

  it("存在しないパスはundefinedを返す", () => {
    expect(getAtPath(obj, "body.nonexistent")).toBeUndefined();
    expect(getAtPath(obj, "body.contents.5")).toBeUndefined();
    expect(getAtPath(obj, "nothing.at.all")).toBeUndefined();
  });

  it("途中にnullがある場合はundefinedを返す", () => {
    expect(getAtPath(obj, "header.contents")).toBeUndefined();
  });

  it("配列に非数値キーを指定するとundefinedを返す", () => {
    expect(getAtPath(obj, "body.contents.abc")).toBeUndefined();
  });
});

// ================================================================
// setAtPath
// ================================================================
describe("setAtPath", () => {
  it("空パスの場合、valueをそのまま返す", () => {
    const result = setAtPath({ a: 1 }, "", { b: 2 });
    expect(result).toEqual({ b: 2 });
  });

  it("既存のキーの値を上書きできる", () => {
    const obj = { a: { b: 1 } };
    const result = setAtPath(obj, "a.b", 42);
    expect(result).toEqual({ a: { b: 42 } });
  });

  it("イミュータブル: 元のオブジェクトは変更されない", () => {
    const obj = { a: { b: 1 } };
    const original = JSON.parse(JSON.stringify(obj));
    setAtPath(obj, "a.b", 42);
    expect(obj).toEqual(original);
  });

  it("パス上にオブジェクトを自動作成する", () => {
    const obj = {};
    const result = setAtPath(obj, "a.b.c", "value");
    expect(result).toEqual({ a: { b: { c: "value" } } });
  });

  it("次のキーが数値なら配列を作成する", () => {
    const obj = {};
    const result = setAtPath(obj, "items.0", "first");
    expect(result).toEqual({ items: ["first"] });
    expect(Array.isArray((result as { items: unknown }).items)).toBe(true);
  });

  it("既存の配列要素を更新できる", () => {
    const obj = { items: ["a", "b", "c"] };
    const result = setAtPath(obj, "items.1", "B");
    expect(result).toEqual({ items: ["a", "B", "c"] });
  });

  it("ネストされた配列内のオブジェクトプロパティを更新できる", () => {
    const obj = { body: { contents: [{ text: "old" }] } };
    const result = setAtPath(obj, "body.contents.0.text", "new");
    expect(getAtPath(result, "body.contents.0.text")).toBe("new");
  });
});

// ================================================================
// removeAtPath
// ================================================================
describe("removeAtPath", () => {
  it("空パスの場合、元のオブジェクトを返す", () => {
    const obj = { a: 1 };
    expect(removeAtPath(obj, "")).toBe(obj);
  });

  it("オブジェクトのキーをdeleteで削除する", () => {
    const obj = { a: 1, b: 2 };
    const result = removeAtPath(obj, "b");
    expect(result).toEqual({ a: 1 });
    expect("b" in result).toBe(false);
  });

  it("配列からsplice的に要素を削除する", () => {
    const obj = { items: ["a", "b", "c"] };
    const result = removeAtPath(obj, "items.1");
    expect(result).toEqual({ items: ["a", "c"] });
  });

  it("存在しないパスの場合、元のオブジェクトを返す", () => {
    const obj = { a: 1 };
    expect(removeAtPath(obj, "nonexistent.deep.path")).toBe(obj);
  });

  it("親が配列で無効なインデックスの場合、元のオブジェクトを返す", () => {
    const obj = { items: ["a", "b"] };
    expect(removeAtPath(obj, "items.5")).toBe(obj);
    expect(removeAtPath(obj, "items.-1")).toBe(obj);
  });

  it("ネストされたオブジェクトのキーを削除できる", () => {
    const obj = { a: { b: 1, c: 2 } };
    const result = removeAtPath(obj, "a.c");
    expect(result).toEqual({ a: { b: 1 } });
  });

  it("イミュータブル: 元のオブジェクトは変更されない", () => {
    const obj = { a: { b: 1, c: 2 } };
    const original = JSON.parse(JSON.stringify(obj));
    removeAtPath(obj, "a.c");
    expect(obj).toEqual(original);
  });
});

// ================================================================
// insertAtPath
// ================================================================
describe("insertAtPath", () => {
  it("配列の指定位置に要素を挿入できる", () => {
    const obj = { items: ["a", "b", "c"] };
    const result = insertAtPath(obj, "items", 1, "X");
    expect(result).toEqual({ items: ["a", "X", "b", "c"] });
  });

  it("配列の先頭に要素を挿入できる", () => {
    const obj = { items: ["a", "b"] };
    const result = insertAtPath(obj, "items", 0, "X");
    expect(result).toEqual({ items: ["X", "a", "b"] });
  });

  it("配列の末尾に要素を挿入できる", () => {
    const obj = { items: ["a", "b"] };
    const result = insertAtPath(obj, "items", 2, "X");
    expect(result).toEqual({ items: ["a", "b", "X"] });
  });

  it("パスが配列でない場合、元のオブジェクトを返す", () => {
    const obj = { items: "not-an-array" };
    expect(insertAtPath(obj, "items", 0, "X")).toBe(obj);
  });

  it("パスが存在しない場合、元のオブジェクトを返す", () => {
    const obj = { a: 1 };
    expect(insertAtPath(obj, "nonexistent", 0, "X")).toBe(obj);
  });
});

// ================================================================
// moveInArray
// ================================================================
describe("moveInArray", () => {
  it("要素を前から後ろに移動できる", () => {
    const obj = { items: ["a", "b", "c", "d"] };
    const result = moveInArray(obj, "items", 0, 2);
    expect(result).toEqual({ items: ["b", "c", "a", "d"] });
  });

  it("要素を後ろから前に移動できる", () => {
    const obj = { items: ["a", "b", "c", "d"] };
    const result = moveInArray(obj, "items", 3, 1);
    expect(result).toEqual({ items: ["a", "d", "b", "c"] });
  });

  it("同じインデックスの場合、元のオブジェクトを返す", () => {
    const obj = { items: ["a", "b", "c"] };
    expect(moveInArray(obj, "items", 1, 1)).toBe(obj);
  });

  it("fromIndexが範囲外の場合、元のオブジェクトを返す", () => {
    const obj = { items: ["a", "b"] };
    expect(moveInArray(obj, "items", -1, 0)).toBe(obj);
    expect(moveInArray(obj, "items", 5, 0)).toBe(obj);
  });

  it("toIndexが範囲外の場合、元のオブジェクトを返す", () => {
    const obj = { items: ["a", "b"] };
    expect(moveInArray(obj, "items", 0, -1)).toBe(obj);
    expect(moveInArray(obj, "items", 0, 5)).toBe(obj);
  });

  it("配列でないパスの場合、元のオブジェクトを返す", () => {
    const obj = { items: "not-an-array" };
    expect(moveInArray(obj, "items", 0, 1)).toBe(obj);
  });
});

// ================================================================
// parentPath
// ================================================================
describe("parentPath", () => {
  it("ドットを含むパスの親パスを返す", () => {
    expect(parentPath("a.b.c")).toBe("a.b");
  });

  it("2セグメントのパスの親パスを返す", () => {
    expect(parentPath("body.contents")).toBe("body");
  });

  it("1セグメントのパスの場合、空文字を返す", () => {
    expect(parentPath("a")).toBe("");
  });

  it("深いネストのパスでも正しい親パスを返す", () => {
    expect(parentPath("a.b.c.d.e")).toBe("a.b.c.d");
  });
});

// ================================================================
// lastKey
// ================================================================
describe("lastKey", () => {
  it("ドットを含むパスの最後のキーを返す", () => {
    expect(lastKey("a.b.c")).toBe("c");
  });

  it("1セグメントのパスの場合、そのキー自体を返す", () => {
    expect(lastKey("a")).toBe("a");
  });

  it("数値キーも文字列として返す", () => {
    expect(lastKey("body.contents.0")).toBe("0");
  });

  it("深いネストのパスでも最後のキーを返す", () => {
    expect(lastKey("a.b.c.d.e")).toBe("e");
  });
});
