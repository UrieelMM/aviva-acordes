import { SongEditor } from "@/components/songs/song-editor";

export default async function EditSongPage({ params }: { params: Promise<{ songId: string }> }) {
  const { songId } = await params;
  return <SongEditor songId={songId} />;
}

