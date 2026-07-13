import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alabanza App",
    short_name: "Alabanza",
    description: "Herramienta para organizar canciones, ensayos y setlists del grupo de alabanza.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f4ec",
    theme_color: "#d97706",
    lang: "es-MX",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
