"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

const CATEGORIES = ["General", "Bug / Issue", "Game Idea", "Feature Request"] as const;

export default function FeedbackPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<string>("General");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile?.username) return;
    setSubmitting(true);
    setError("");

    const { error: dbError } = await supabase.from("feedback").insert({
      user_id: user.id,
      username: profile.username,
      message,
      category,
    });

    if (dbError) {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
      return;
    }

    // Fire-and-forget email notification — non-blocking
    fetch("/api/send-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.username, message, category }),
    });

    setDone(true);
    setSubmitting(false);
  }

  if (loading || !user) return null;

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">✉️</span>
          <h1 className="font-serif text-3xl">Thanks!</h1>
          <p className="text-sm text-[#aaa]">Your message was received.</p>
          <Link
            href="/"
            className="text-sm text-[#555] hover:text-[#1a1a1a] transition-colors mt-2"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

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
        <h1 className="font-serif text-4xl">Feedback</h1>
        <p className="text-xs uppercase tracking-widest text-[#ccc]">
          Ideas, bugs, requests
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                category === c
                  ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                  : "text-[#555] border-[#ddd] hover:border-[#aaa]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          required
          maxLength={500}
          rows={5}
          className="w-full px-4 py-3 border border-[#e0e0e0] rounded-2xl text-sm outline-none focus:border-[#aaa] transition-colors resize-none"
        />
        <p className="text-xs text-right text-[#ccc] -mt-2">{message.length}/500</p>

        {error && <p className="text-xs text-[#e24b4a]">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="w-full py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send Feedback"}
        </button>
      </form>
    </main>
  );
}
