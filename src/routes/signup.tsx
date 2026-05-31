import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — NorthPaw" },
      { name: "description", content: "Create your NorthPaw account to find mates, adopt, and shop for your pet." },
      { property: "og:title", content: "Join NorthPaw — Canada's Pet Community" },
      { property: "og:description", content: "Create an account to find mates, adopt, and shop." },
      { property: "og:url", content: "https://northpaw-canadas-pet-hub.lovable.app/signup" },
    ],
    links: [{ rel: "canonical", href: "https://northpaw-canadas-pet-hub.lovable.app/signup" }],
  }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"owner" | "shelter" | "store">("owner");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { user_type: userType } },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    if (data.user) {
      await supabase.from("profiles").insert({ id: data.user.id, user_type: userType });
    }
    toast.success("Welcome to NorthPaw!");
    navigate({ to: "/onboarding" });
  }

  async function signUpWithGoogle() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) { toast.error(error.message); setBusy(false); }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Link to="/" className="self-start text-primary"><Logo size={40} /></Link>
      <h1 className="mt-6 text-2xl font-bold text-foreground">Join NorthPaw</h1>
      <p className="text-sm text-muted-foreground">Canada's Pet Community</p>

      <button
        type="button"
        onClick={signUpWithGoogle}
        disabled={busy}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-input bg-card px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">I am a</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["owner", "shelter", "store"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setUserType(t)}
                className={`rounded-xl border px-2 py-3 text-sm font-medium capitalize transition-colors ${
                  userType === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {t === "owner" ? "Pet Owner" : t === "shelter" ? "Shelter" : "Pet Store"}
              </button>
            ))}
          </div>
        </div>
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already a member?{" "}
        <Link to="/login" className="font-semibold text-primary">Log in</Link>
      </p>
    </div>
  );
}

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string; value: string; onChange: (v: string) => void;
};
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.8-21.1l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.2 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3a12 12 0 0 1-18-6.3l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.3 5.3C41.4 36.1 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function Field({ label, value, onChange, ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
