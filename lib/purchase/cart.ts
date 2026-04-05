// lib/purchase/cart.ts — カート管理ユーティリティ（localStorageベース）

export type CartItem = {
  code: string;
  title: string;
  price: number;
  qty: number;
  coolType: "normal" | "chilled" | "frozen" | null;
};

const CART_KEY = "lope_cart";

/** カート取得 */
export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** カート保存 */
function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

/** カートに追加（同じ商品は数量加算） */
export function addToCart(item: Omit<CartItem, "qty">, qty = 1): CartItem[] {
  const cart = getCart();
  const existing = cart.find((c) => c.code === item.code);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...item, qty });
  }
  saveCart(cart);
  return cart;
}

/** カートから削除 */
export function removeFromCart(code: string): CartItem[] {
  const cart = getCart().filter((c) => c.code !== code);
  saveCart(cart);
  return cart;
}

/** 数量変更 */
export function updateCartQty(code: string, qty: number): CartItem[] {
  if (qty <= 0) return removeFromCart(code);
  const cart = getCart();
  const item = cart.find((c) => c.code === code);
  if (item) item.qty = qty;
  saveCart(cart);
  return cart;
}

/** カートクリア */
export function clearCart(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
}

/** カート内の商品合計（配送料除く） */
export function getCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/** カート内の商品数 */
export function getCartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}
