"use client";

import { useEffect } from "react";

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        const sameOriginRegistrations = registrations.filter(
          (registration) => new URL(registration.scope).origin === window.location.origin,
        );

        return Promise.all(sameOriginRegistrations.map((registration) => registration.unregister()));
      })
      .catch(() => undefined);
  }, []);

  return null;
}
