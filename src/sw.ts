/// <reference lib="webworker" />

import { NetworkFirst } from "serwist";
import { matchPrecache, precacheAndRoute, registerRoute, setCatchHandler } from "serwist/legacy";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<string | { url: string; revision?: string | null }>;
};

const OFFLINE_CACHE = "acorde-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      caches.open(OFFLINE_CACHE).then((cache) => cache.add("/offline")).catch(() => undefined),
    ]),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

precacheAndRoute(self.__SW_MANIFEST);

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({ cacheName: "acorde-pages", networkTimeoutSeconds: 4 }),
);

setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    return (await matchPrecache("/offline")) ?? (await caches.match("/offline")) ?? Response.error();
  }

  return Response.error();
});
