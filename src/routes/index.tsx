import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowRight, Heart, PawPrint, Store } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NorthPaw — Canada's Pet Community" },
      {
        name: "description",
        content:
          "Meet matches, find rescues, and shop from verified Canadian pet stores — all in one place. Canada-wide.",
      },
      { property: "og:title", content: "NorthPaw — Canada's Pet Community" },
      {
        property: "og:description",
        content:
          "Meet matches, find rescues, and shop from verified Canadian pet stores — all in one place. Canada-wide.",
      },
      {
        property: "og:url",
        content: "https://northpaw-canadas-pet-hub.lovable.app/",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8f1e82e0-8471-496b-8a8a-a0a206f40b7f/id-preview-4e193dfc--0abd8c50-9e35-42ad-b1b5-cb4e7f2ad273.lovable.app-1779820120519.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8f1e82e0-8471-496b-8a8a-a0a206f40b7f/id-preview-4e193dfc--0abd8c50-9e35-42ad-b1b5-cb4e7f2ad273.lovable.app-1779820120519.png",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://northpaw-canadas-pet-hub.lovable.app/",
      },
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#d8ead2] to-background px-6 pb-8 pt-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-[0_6px_20px_rgba(45,106,79,0.25)]">
            <Logo size={36} />
          </div>
          <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-foreground">
            Canada's Pet Community
          </h1>
          <p className="mb-7 text-sm leading-relaxed text-muted-foreground">
            Meet matches, find rescues, and shop from verified Canadian pet
            stores — all in one place.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/signup"
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform active:scale-[0.98]"
            >
              Get Started — it's free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="block rounded-2xl border border-border bg-card px-6 py-4 text-center text-base font-semibold text-foreground"
            >
              I already have an account
            </Link>
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex justify-around border-b border-t border-border bg-card px-4 py-3">
          <TrustItem emoji="🐕" label="Mating" />
          <TrustItem emoji="❤️" label="Adoption" />
          <TrustItem emoji="🛒" label="Marketplace" />
          <TrustItem emoji="🇨🇦" label="Canada-wide" />
        </div>

        {/* Feature cards */}
        <div className="flex-1 space-y-3 px-6 py-6">
          <Feature
            Icon={PawPrint}
            title="Pet Mating"
            body="Swipe through compatible pets near you and connect with their owners to arrange meetings."
          />
          <Feature
            Icon={Heart}
            title="Adoption"
            body="Browse rescues from local shelters and give a pet a forever home across Canada."
          />
          <Feature
            Icon={Store}
            title="Marketplace"
            body="Shop from verified Canadian pet stores with secure checkout."
          />
        </div>

        {/* Mobile waitlist teaser */}
        <div className="mx-6 mb-8 rounded-2xl bg-primary p-5 text-center">
          <p className="mb-1 text-sm font-bold text-primary-foreground">
            📱 Mobile app coming soon
          </p>
          <p className="text-xs leading-relaxed text-primary-foreground/75">
            Sign up above to be first on the waitlist when we launch on iOS & Android.
          </p>
        </div>
      </div>
    </main>
  );
}

function TrustItem({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-base">{emoji}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function Feature({
  Icon,
  title,
  body,
}: {
  Icon: typeof PawPrint;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
