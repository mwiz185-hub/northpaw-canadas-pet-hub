import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Link to="/" className="self-start text-primary"><Logo size={40} /></Link>
      <h1 className="mt-6 text-2xl font-bold text-foreground">Join NorthPaw</h1>
      <p className="text-sm text-muted-foreground">Canada's Pet Community</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
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
