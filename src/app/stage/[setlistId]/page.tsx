import { StageView } from "@/components/stage/stage-view";
import { AuthGuard } from "@/components/auth/auth-guard";

export default async function StagePage({ params }: { params: Promise<{ setlistId: string }> }) {
  const { setlistId } = await params;
  return <AuthGuard><StageView setlistId={setlistId} /></AuthGuard>;
}
