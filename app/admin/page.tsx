"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

const ADMIN_USERNAME = "Cbolson";

type FeedbackRow = {
  id: string;
  username: string;
  category: string;
  message: string;
  created_at: string;
};

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackRow[] | null>(null);

  useEffect(() => {
    if (!loading && profile?.username !== ADMIN_USERNAME) router.replace("/");
  }, [profile, loading, router]);

  useEffect(() => {
    if (profile?.username !== ADMIN_USERNAME) return;
    supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFeedback((data ?? []) as FeedbackRow[]));
  }, [profile]);

  if (loading || !profile || profile.username !== ADMIN_USERNAME) return null;

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

      <div className="w-full max-w-2xl mt-6 mb-8 flex flex-col items-center gap-2">
        <h1 className="font-serif text-4xl">Feedback</h1>
        <p className="text-xs uppercase tracking-widest text-[#ccc]">
          {feedback === null ? "…" : `${feedback.length} submissions`}
        </p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-3">
        {feedback === null && (
          <p className="text-sm text-[#aaa]">Loading…</p>
        )}
        {feedback?.length === 0 && (
          <p className="text-sm text-[#aaa]">No feedback yet.</p>
        )}
        {feedback?.map((f) => (
          <div
            key={f.id}
            className="p-5 border border-[#f0f0f0] rounded-2xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{f.username}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#555] border border-[#e8e8e8] px-2 py-0.5 rounded-full">
                  {f.category}
                </span>
                <span className="text-xs text-[#aaa]">
                  {new Date(f.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            <p className="text-sm text-[#333] leading-relaxed">{f.message}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
