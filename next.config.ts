import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  register: true,
  reloadOnOnline: true,
  cacheOnNavigation: false,
  globPublicPatterns: ["**/*.{svg,ico,png,webmanifest}"],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
