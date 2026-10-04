import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  globPublicPatterns: ["**/*.{svg,ico,png,webmanifest}"],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (!authDomain || !/^[a-z0-9-]+\.(?:firebaseapp\.com|web\.app)$/.test(authDomain)) return [];
    return [
      { source: "/__/auth/:path*", destination: `https://${authDomain}/__/auth/:path*` },
      { source: "/__/firebase/init.json", destination: `https://${authDomain}/__/firebase/init.json` },
    ];
  },
};

export default withSerwist(nextConfig);
