// lib/flex-editor/path-utils.ts
// Flex JSONのパスベース操作ユーティリティ

type FlexObj = Record<string, unknown>;

/**
 * ドット区切りのパスで値を取得
 * 例: getAtPath(obj, "body.contents.0.text") → "Hello"
 */
export function getAtPath(obj: FlexObj, path: string): unknown {
  if (!path) return obj;
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    if (Array.isArray(current)) {
      const idx = Number(key);
      if (Number.isNaN(idx)) return undefined;
      current = current[idx];
    } else {
      current = (current as FlexObj)[key];
    }
  }
  return current;
}

/**
 * パスで値をイミュータブルに設定
 * パス上のオブジェクト/配列のみ浅いコピーを作成
 */
export function setAtPath(obj: FlexObj, path: string, value: unknown): FlexObj {
  if (!path) return value as FlexObj;
  const keys = path.split(".");
  const result = { ...obj };
  let current: FlexObj = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const isNextArray = /^\d+$/.test(nextKey);

    if (Array.isArray(current[key])) {
      current[key] = [...(current[key] as unknown[])];
    } else if (current[key] && typeof current[key] === "object") {
      current[key] = { ...(current[key] as FlexObj) };
    } else {
      // パスが存在しない場合、次のキーに応じてオブジェクトか配列を作成
      current[key] = isNextArray ? [] : {};
    }
    current = current[key] as FlexObj;
  }

  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    const idx = Number(lastKey);
    (current as unknown[])[idx] = value;
  } else {
    current[lastKey] = value;
  }
  return result;
}

/**
 * パスの要素をイミュータブルに削除
 * 配列内の要素の場合はspliceで削除、オブジェクトの場合はdeleteで削除
 */
export function removeAtPath(obj: FlexObj, path: string): FlexObj {
  if (!path) return obj;
  const keys = path.split(".");
  const parentPath = keys.slice(0, -1).join(".");
  const lastKey = keys[keys.length - 1];

  const parent = parentPath ? getAtPath(obj, parentPath) : obj;
  if (!parent || typeof parent !== "object") return obj;

  if (Array.isArray(parent)) {
    const idx = Number(lastKey);
    if (Number.isNaN(idx) || idx < 0 || idx >= parent.length) return obj;
    const newArr = parent.filter((_, i) => i !== idx);
    return parentPath ? setAtPath(obj, parentPath, newArr) : obj;
  } else {
    const newObj = { ...(parent as FlexObj) };
    delete newObj[lastKey];
    return parentPath ? setAtPath(obj, parentPath, newObj) : newObj;
  }
}

/**
 * 配列のパスにインデックス位置で要素を挿入
 * 例: insertAtPath(obj, "body.contents", 2, newElement)
 */
export function insertAtPath(
  obj: FlexObj,
  arrayPath: string,
  index: number,
  element: unknown,
): FlexObj {
  const arr = getAtPath(obj, arrayPath);
  if (!Array.isArray(arr)) return obj;
  const newArr = [...arr];
  newArr.splice(index, 0, element);
  return setAtPath(obj, arrayPath, newArr);
}

/**
 * 配列内の要素を移動（並び替え）
 */
export function moveInArray(
  obj: FlexObj,
  arrayPath: string,
  fromIndex: number,
  toIndex: number,
): FlexObj {
  const arr = getAtPath(obj, arrayPath);
  if (!Array.isArray(arr)) return obj;
  if (fromIndex < 0 || fromIndex >= arr.length) return obj;
  if (toIndex < 0 || toIndex >= arr.length) return obj;
  if (fromIndex === toIndex) return obj;

  const newArr = [...arr];
  const [moved] = newArr.splice(fromIndex, 1);
  newArr.splice(toIndex, 0, moved);
  return setAtPath(obj, arrayPath, newArr);
}

/**
 * パスの親パスを返す
 * 例: parentPath("body.contents.0") → "body.contents"
 */
export function parentPath(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.substring(0, idx);
}

/**
 * パスの最後のキーを返す
 * 例: lastKey("body.contents.0") → "0"
 */
export function lastKey(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? path : path.substring(idx + 1);
}
