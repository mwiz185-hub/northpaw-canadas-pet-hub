import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — NorthPaw" },
      { name: "description", content: "Sign in to your NorthPaw account to swipe, adopt, and shop." },
      { property: "og:title", content: "Log In — NorthPaw" },
      { property: "og:description", content: "Sign in to your NorthPaw account." },
      { property: "og:url", content: "https://northpaw-canadas-pet-hub.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://northpaw-canadas-pet-hub.lovable.app/login" }],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/app/swipe" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Link to="/" className="self-start text-primary"><Logo size={40} /></Link>
      <h1 className="mt-6 text-2xl font-bold text-foreground">Welcome back</h1>
      <p className="text-sm text-muted-foreground">Sign in to your NorthPaw account</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
        <button disabled={busy} className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here? <Link to="/signup" className="font-semibold text-primary">Create an account</Link>
      </p>
    </div>
  );
}
