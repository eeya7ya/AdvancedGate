import { auth } from "~/auth";
import { getUserProfile } from "@/lib/db";
import { ProfileForm } from "./profile-form";
import Image from "next/image";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const profile = userId ? await getUserProfile(userId) : null;

  const initials = (session?.user?.name ?? "E")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pt-2">
      {/* Header */}
      <div>
        <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest mb-1">Account</p>
        <h1 className="text-3xl font-bold text-[#f1f5f9] tracking-tight">Your Profile</h1>
      </div>

      {/* Avatar card */}
      <div className="flex items-center gap-5 p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0d1424]">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#4f9eff] to-[#7c3aed] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <p className="text-[#f1f5f9] font-semibold text-lg leading-tight">
            {profile?.name ?? session?.user?.name ?? "Engineer"}
          </p>
          <p className="text-[#475569] text-sm mt-0.5">{session?.user?.email}</p>
          {profile?.jobTitle && (
            <p className="text-[#64748b] text-sm mt-1">{profile.jobTitle}{profile.organization ? ` · ${profile.organization}` : ""}</p>
          )}
        </div>
      </div>

      {/* Form */}
      <ProfileForm profile={profile} />
    </div>
  );
}
