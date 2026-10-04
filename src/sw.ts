/// <reference lib="webworker" />

import { NetworkFirst } from "serwist";
import { precacheAndRoute, registerRoute, setCatchHandler } from "serwist/legacy";

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
  if (request.mode === "navigate") {
    const url = new URL(request.url);
    if (url.origin === self.location.origin) {
      const cache = await caches.open(OFFLINE_CACHE);
      return (await cache.match("/offline-app")) ?? (await cache.match("/offline")) ?? Response.error();
    }
  }

  return Response.error();
});
