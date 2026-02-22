"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import React from "react";
import type { Feature } from "@/lib/feature-flags";

interface FeaturesContextValue {
  enabledFeatures: Feature[];
  loading: boolean;
  hasFeature: (feature: Feature) => boolean;
}

const FeaturesContext = createContext<FeaturesContextValue>({
  enabledFeatures: [],
  loading: true,
  hasFeature: () => true, // デフォルトは全有効（ロード前にUIが消えないように）
});

/**
 * 機能フラグを取得・提供するProvider
 * layout.tsx で認証後に使う
 */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [enabledFeatures, setEnabledFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch("/api/admin/features", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setEnabledFeatures(data.enabledKeys ?? []);
        }
      } catch {
        // エラー時は全機能有効（フォールバック）
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  const hasFeature = useCallback(
    (feature: Feature) => {
      if (loading) return true; // ロード中は表示
      return enabledFeatures.includes(feature);
    },
    [enabledFeatures, loading]
  );

  return React.createElement(
    FeaturesContext.Provider,
    { value: { enabledFeatures, loading, hasFeature } },
    children
  );
}

/**
 * 機能フラグの状態を取得するhook
 */
export function useFeatures() {
  return useContext(FeaturesContext);
}

/**
 * 特定の機能が有効な場合のみ children を表示するコンポーネント
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasFeature } = useFeatures();

  if (!hasFeature(feature)) {
    return fallback as React.ReactElement | null;
  }

  return children as React.ReactElement;
}
