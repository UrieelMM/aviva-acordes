"use client";

import { SongTextImportDialog } from "@/components/songs/song-text-import-dialog";

export default function ImportPreviewPage() {
  return <SongTextImportDialog onClose={() => undefined} onImport={() => true} />;
}
