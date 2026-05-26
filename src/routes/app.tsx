import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) navigate({ to: "/onboarding" });
      else setProfileChecked(true);
    });
  }, [user, loading, navigate]);

  if (loading || !user || !profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Logo size={56} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
        <Link to="/app/swipe" className="flex items-center gap-2 text-primary">
          <Logo size={28} />
          <span className="text-base font-bold tracking-tight text-foreground">NorthPaw</span>
        </Link>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Calgary, AB</span>
      </header>
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
