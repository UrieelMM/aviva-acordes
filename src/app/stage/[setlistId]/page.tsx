import { StageView } from "@/components/stage/stage-view";

export default async function StagePage({ params }: { params: Promise<{ setlistId: string }> }) {
  const { setlistId } = await params;
  return <StageView setlistId={setlistId} />;
}

