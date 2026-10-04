import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Acorde · Alabanza App",
    template: "%s · Acorde",
  },
  description: "Canciones, arreglos y setlists para equipos de alabanza.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-touch-icon.png" },
  applicationName: "Alabanza App",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Acorde",
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
    <html lang="es" className="h-full antialiased" data-theme="studio" suppressHydrationWarning>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
