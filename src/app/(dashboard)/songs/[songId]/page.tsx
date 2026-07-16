import { SongViewer } from "@/components/songs/song-viewer";

export default async function SongPage({ params }: { params: Promise<{ songId: string }> }) {
  const { songId } = await params;
  return <SongViewer songId={songId} />;
}

