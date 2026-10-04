/// <reference lib="webworker" />

import { NetworkFirst } from "serwist";
import { matchPrecache, precacheAndRoute, registerRoute, setCatchHandler } from "serwist/legacy";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<string | { url: string; revision?: string | null }>;
};

const OFFLINE_CACHE = "acorde-offline-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(["/offline-app", "/offline"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([self.clients.claim(), caches.delete("acorde-offline-v1")]));
});

precacheAndRoute(self.__SW_MANIFEST);

registerRoute(
  ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && !url.pathname.startsWith("/__/"),
  new NetworkFirst({ cacheName: "acorde-pages", networkTimeoutSeconds: 4 }),
);

setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    const url = new URL(request.url);
    if (url.origin === self.location.origin && url.pathname !== "/offline-app") {
      return Response.redirect(`/offline-app?path=${encodeURIComponent(url.pathname + url.search)}`, 302);
    }
    return (await caches.match("/offline-app")) ?? (await matchPrecache("/offline")) ?? Response.error();
  }

  return Response.error();
});
