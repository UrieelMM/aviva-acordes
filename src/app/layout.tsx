import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alabanza App",
  description: "Base inicial para administrar ensayos, canciones y setlists de un grupo de alabanza.",
  manifest: "/manifest.webmanifest",
  applicationName: "Alabanza App",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Alabanza App",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
