/// <reference lib="webworker" />

import { createHandlerBoundToURL, matchPrecache, precacheAndRoute, registerRoute, setCatchHandler } from "serwist/legacy";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<string | { url: string; revision?: string | null }>;
};

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

precacheAndRoute(self.__SW_MANIFEST);

registerRoute(({ request }) => request.mode === "navigate", createHandlerBoundToURL("/"));

setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    return (await matchPrecache("/offline")) ?? Response.error();
  }

  return Response.error();
});
