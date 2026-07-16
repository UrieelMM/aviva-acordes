import { SetlistBuilder } from "@/components/setlists/setlist-builder";

export default async function SetlistPage({ params }: { params: Promise<{ setlistId: string }> }) {
  const { setlistId } = await params;
  return <SetlistBuilder setlistId={setlistId} />;
}

