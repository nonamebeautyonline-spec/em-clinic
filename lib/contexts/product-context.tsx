"use client";

// プロダクトスイッチャー用コンテキスト
// プラットフォーム管理画面で業種別プロダクト切り替えを提供

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Industry } from "@/lib/feature-flags";

/** プロダクト選択値: "all" = 全プロダクト、Industry = 業種別 */
type Product = "all" | Industry;

interface ProductContextValue {
  activeProduct: Product;
  setActiveProduct: (p: Product) => void;
  /** "all"の場合はnull、それ以外はIndustry値 */
  industryFilter: Industry | null;
}

const ProductContext = createContext<ProductContextValue>({
  activeProduct: "all",
  setActiveProduct: () => {},
  industryFilter: null,
});

export function ProductProvider({ children }: { children: ReactNode }) {
  const [activeProduct, setActiveProductState] = useState<Product>("all");

  // sessionStorageから復元
  useEffect(() => {
    const saved = sessionStorage.getItem("platform-active-product");
    if (saved) setActiveProductState(saved as Product);
  }, []);

  const setActiveProduct = (p: Product) => {
    setActiveProductState(p);
    sessionStorage.setItem("platform-active-product", p);
  };

  const industryFilter = activeProduct === "all" ? null : (activeProduct as Industry);

  return (
    <ProductContext.Provider value={{ activeProduct, setActiveProduct, industryFilter }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  return useContext(ProductContext);
}
