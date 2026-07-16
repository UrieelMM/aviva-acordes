import type { Metadata } from "next";
import { SetlistsPage } from "@/components/setlists/setlists-page";

export const metadata: Metadata = { title: "Setlists" };
export default function SetlistsRoute() { return <SetlistsPage />; }

