"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { computeUserBadges, type BadgeStatus } from "@/lib/badges";

function BadgeCard({ status }: { status: BadgeStatus }) {
  const { def, earned } = status;

  if (earned) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[#e8e8e8] bg-white text-center">
        <span className="text-3xl">{def.icon}</span>
        <span className="text-sm font-semibold text-[#1a1a1a]">{def.name}</span>
        <span className="text-xs text-[#666] leading-snug">{def.description}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[#f0f0f0] bg-[#fafafa] text-center opacity-50">
      <span className="text-3xl grayscale">{def.icon}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-[#999]">🔒</span>
        <span className="text-sm font-semibold text-[#999]">{def.name}</span>
      </div>
      <span className="text-xs text-[#bbb] leading-snug">{def.hint}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [badges, setBadges] = useState<BadgeStatus[] | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) computeUserBadges(user.id).then(setBadges);
  }, [user]);

  if (loading || !user || !badges) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#aaa]">Loading…</p>
      </main>
    );
  }

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <nav className="px-5 pt-5 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555] border border-[#e8e8e8] rounded-full px-4 py-1.5 bg-white hover:border-[#bbb] hover:text-[#1a1a1a] transition-all"
        >
          ← Home
        </Link>
      </nav>

      <div className="w-full max-w-sm flex flex-col items-center gap-2 mt-6 mb-8">
        <h1 className="font-serif text-4xl">{profile?.username ?? "Profile"}</h1>
        <p className="text-xs uppercase tracking-widest text-[#ccc]">
          {earnedCount} / {badges.length} badges earned
        </p>
      </div>

      <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        {badges.map((status) => (
          <BadgeCard key={status.def.id} status={status} />
        ))}
      </div>
    </main>
  );
}
