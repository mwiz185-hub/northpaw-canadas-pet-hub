import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — NorthPaw" },
      { name: "description", content: "Set up your NorthPaw profile to get started." },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "https://northpaw-canadas-pet-hub.lovable.app/onboarding" },
    ],
    links: [{ rel: "canonical", href: "https://northpaw-canadas-pet-hub.lovable.app/onboarding" }],
  }),
  component: () => (
    <AuthProvider>
      <Onboarding />
    </AuthProvider>
  ),
});

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("Calgary");
  const [userType, setUserType] = useState<"owner" | "shelter" | "store">("owner");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserType(data.user_type as "owner" | "shelter" | "store");
          setDisplayName(data.display_name ?? "");
          setOrgName(data.organization_name ?? "");
          setCity(data.city ?? "Calgary");
        } else if (user.user_metadata?.user_type) {
          setUserType(user.user_metadata.user_type);
        }
      });
  }, [user, loading, navigate]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      user_type: userType,
      display_name: displayName,
      organization_name: userType === "owner" ? null : orgName,
      city,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    navigate({ to: "/app/swipe" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <div className="self-start text-primary">
        <Logo size={40} />
      </div>
      <h1 className="mt-6 text-2xl font-bold">Tell us about you</h1>
      <p className="text-sm text-muted-foreground">
        A few details to finish setting up your account.
      </p>

      <form onSubmit={save} className="mt-6 space-y-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account type
          </span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["owner", "shelter", "store"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setUserType(t)}
                className={`rounded-xl border px-2 py-3 text-sm font-medium capitalize ${
                  userType === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {t === "owner" ? "Pet Owner" : t === "shelter" ? "Shelter" : "Pet Store"}
              </button>
            ))}
          </div>
        </div>
        <Input label="Your name" value={displayName} onChange={setDisplayName} required />
        {userType !== "owner" && (
          <Input
            label={userType === "shelter" ? "Shelter name" : "Store name"}
            value={orgName}
            onChange={setOrgName}
            required
          />
        )}
        <Input label="City" value={city} onChange={setCity} required />

        <button
          disabled={busy}
          className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
