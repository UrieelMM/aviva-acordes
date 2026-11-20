import { AuthGuard } from "@/components/auth/auth-guard";
import { SongStageView } from "@/components/stage/stage-view";

export default async function SongStagePage({ params }: { params: Promise<{ songId: string }> }) {
  const { songId } = await params;
  return <AuthGuard><SongStageView songId={songId} /></AuthGuard>;
}
