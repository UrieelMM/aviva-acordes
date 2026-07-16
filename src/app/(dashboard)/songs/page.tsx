import type { Metadata } from "next";
import { SongLibrary } from "@/components/songs/song-library";

export const metadata: Metadata = { title: "Canciones" };

export default function SongsPage() { return <SongLibrary />; }

