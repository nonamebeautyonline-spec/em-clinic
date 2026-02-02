"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpdateTrackingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/shipping/tracking");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-600">新しいページに移動しています...</p>
      </div>
    </div>
  );
}
