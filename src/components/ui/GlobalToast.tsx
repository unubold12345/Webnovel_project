"use client";

import { useToast } from "@/components/ui/ToastContext";
import { Toast } from "@/components/ui/Toast";

export default function GlobalToast() {
  const { toasts, removeToast } = useToast();
  return <Toast toasts={toasts} onRemove={removeToast} />;
}
