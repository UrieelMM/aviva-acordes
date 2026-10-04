import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WorshipNotes",
    template: "%s · WorshipNotes",
  },
  description: "Canciones, arreglos y setlists para equipos de alabanza.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg?v=2", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png?v=2",
  },
  applicationName: "WorshipNotes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WorshipNotes",
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
