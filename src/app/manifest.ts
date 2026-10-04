import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WorshipNotes",
    short_name: "WorshipNotes",
    description: "Herramienta para organizar canciones, ensayos y setlists del grupo de alabanza.",
    start_url: "/",
    display: "standalone",
    background_color: "#080d1f",
    theme_color: "#080d1f",
    lang: "es-MX",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
