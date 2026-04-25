"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/ToastContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch every 5 minutes
      refetchOnWindowFocus={false} // Don't refetch when window regains focus
    >
      <ToastProvider>
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}