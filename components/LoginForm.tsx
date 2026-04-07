"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-lg">✉️ Check your email</p>
        <p className="text-neutral-400 text-sm mt-2">Magic link sent to {email}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-sm"
        />
        <button type="submit" disabled={loading}
          className="bg-white text-black rounded px-4 py-3 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50">
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-neutral-600 text-xs">
        <div className="flex-1 h-px bg-neutral-800" />
        or
        <div className="flex-1 h-px bg-neutral-800" />
      </div>

      <button onClick={handleGoogle}
        className="border border-neutral-700 rounded px-4 py-3 text-sm hover:bg-neutral-900 transition">
        Continue with Google
      </button>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
