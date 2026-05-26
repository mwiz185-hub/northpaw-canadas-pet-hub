import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowRight, Heart, PawPrint, Store } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NorthPaw — Canada's Pet Community" },
      { name: "description", content: "Mating, adoption and pet marketplace for Calgary, Alberta." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app/swipe" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-16 pb-10">
        <div className="flex flex-col items-center gap-3 text-primary">
          <Logo size={80} />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">NorthPaw</h1>
          <p className="text-sm font-medium text-muted-foreground">Canada's Pet Community</p>
        </div>

        <div className="mt-12 flex-1 space-y-4">
          <Feature Icon={PawPrint} title="Mating" body="Swipe to find the perfect match for your pet." />
          <Feature Icon={Heart} title="Adoption" body="Bring home a rescue from local Calgary shelters." />
          <Feature Icon={Store} title="Marketplace" body="Shop from verified Canadian pet stores." />
        </div>

        <div className="space-y-3">
          <Link
            to="/signup"
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform active:scale-[0.98]"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="block rounded-2xl border border-border bg-card px-6 py-4 text-center text-base font-semibold text-foreground"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
}

function Feature({ Icon, title, body }: { Icon: typeof PawPrint; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
