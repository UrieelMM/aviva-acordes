"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster } from "sonner";
import { DatabaseBootstrap } from "@/components/providers/database-bootstrap";
import { FirebaseAuthProvider } from "@/components/providers/firebase-auth-provider";
import { PwaInstallProvider } from "@/components/providers/pwa-install-provider";
import { OfflineNavigation } from "@/components/providers/offline-navigation";
import { FirebaseSyncProvider } from "@/components/providers/firebase-sync-provider";
import { ServiceWorkerCleanup } from "@/components/providers/service-worker-cleanup";
import { ThemeSync } from "@/components/providers/theme-sync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseAuthProvider>
        <PwaInstallProvider>
        <ThemeSync />
        <DatabaseBootstrap />
        <FirebaseSyncProvider />
        <OfflineNavigation />
        {process.env.NODE_ENV === "development" ? <ServiceWorkerCleanup /> : null}
        {children}
        </PwaInstallProvider>
      </FirebaseAuthProvider>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border-app-border !bg-app-surface !text-app-text",
          },
        }}
      />
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
