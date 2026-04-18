import { auth } from "~/auth";
import { getUserProfile, getUserRoadmap } from "@/lib/db";
import { isValidPlan } from "@/lib/plan";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [profile, roadmapData] = await Promise.all([
    userId ? getUserProfile(userId) : null,
    userId ? getUserRoadmap(userId) : null,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = isValidPlan(roadmapData?.planJson) ? (roadmapData?.planJson as any) : null;

  return (
    <ProfileClient
      profile={profile}
      sessionUser={{
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? "",
        image: session?.user?.image ?? null,
      }}
      aiSummary={plan?.profile?.summary ?? null}
      aiPriorities={plan?.priorities ?? []}
    />
  );
}
