import { auth } from "~/auth";
import { getUserRoadmap, getUserNotes } from "@/lib/db";
import { AIChatClient } from "./ai-chat-client";

export default async function AIChatPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const userName = session?.user?.name?.split(" ")[0] ?? "Learner";

  const [roadmapData, notes] = await Promise.all([
    userId ? getUserRoadmap(userId) : null,
    userId ? getUserNotes(userId) : [],
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = roadmapData?.planJson as any ?? null;

  return <AIChatClient plan={plan} notes={notes} userName={userName} />;
}
