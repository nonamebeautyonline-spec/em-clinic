// Promiseベースの確認モーダルフック
"use client";

import { useState, useCallback, createElement } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface ConfirmOptions {
  title: string;
  message: string | React.ReactNode;
  variant?: "danger" | "default";
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ModalState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirmModal() {
  const [state, setState] = useState<ModalState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const ConfirmDialog = useCallback(
    () =>
      createElement(ConfirmModal, {
        open: state !== null,
        title: state?.title ?? "",
        message: state?.message ?? "",
        variant: state?.variant,
        confirmLabel: state?.confirmLabel,
        cancelLabel: state?.cancelLabel,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      }),
    [state, handleConfirm, handleCancel],
  );

  return { confirm, ConfirmDialog };
}
