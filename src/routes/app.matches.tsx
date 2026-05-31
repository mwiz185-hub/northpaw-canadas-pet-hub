import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MessageCircle, PawPrint } from "lucide-react";

export const Route = createFileRoute("/app/matches")({ component: MatchesPage });

type Conv = {
  id: string;
  kind: string;
  created_at: string;
  user_a_id: string;
  user_b_id: string;
  context_pet_id: string | null;
  other_name: string;
  pet_name: string;
  pet_photo: string | null;
  last: string | null;
};

function MatchesPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rows } = await supabase
        .from("conversations")
        .select("*")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      const list = rows ?? [];
      const otherIds = Array.from(
        new Set(list.map((c) => (c.user_a_id === user.id ? c.user_b_id : c.user_a_id))),
      );
      const petIds = Array.from(
        new Set(list.map((c) => c.context_pet_id).filter(Boolean) as string[]),
      );
      const convIds = list.map((c) => c.id);

      const [profsRes, petsRes, msgsRes] = await Promise.all([
        otherIds.length
          ? supabase
              .from("profiles")
              .select("id, display_name, organization_name")
              .in("id", otherIds)
          : Promise.resolve({ data: [] }),
        petIds.length
          ? supabase.from("pets").select("id, name, photos").in("id", petIds)
          : Promise.resolve({ data: [] }),
        convIds.length
          ? supabase
              .from("messages")
              .select("conversation_id, body, created_at")
              .in("conversation_id", convIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      const profMap = new Map(
        (
          (profsRes.data ?? []) as {
            id: string;
            display_name: string | null;
            organization_name: string | null;
          }[]
        ).map((p) => [p.id, p]),
      );
      const petMap = new Map(
        ((petsRes.data ?? []) as { id: string; name: string; photos: string[] }[]).map((p) => [
          p.id,
          p,
        ]),
      );
      const lastMap = new Map<string, string>();
      for (const m of (msgsRes.data ?? []) as { conversation_id: string; body: string }[]) {
        if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m.body);
      }
      setConvs(
        list.map((c) => {
          const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
          const prof = profMap.get(otherId);
          const pet = c.context_pet_id ? petMap.get(c.context_pet_id) : undefined;
          return {
            ...c,
            other_name: prof?.organization_name || prof?.display_name || "User",
            pet_name: pet?.name ?? "",
            pet_photo: pet?.photos?.[0] ?? null,
            last: lastMap.get(c.id) ?? null,
          };
        }),
      );
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Center>Loading conversations…</Center>;
  if (!convs.length) {
    return (
      <Center>
        <MessageCircle className="mb-2 h-10 w-10 text-primary" />
        No matches yet. Start swiping or message a shelter/store!
      </Center>
    );
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="px-1 pb-3 text-xl font-bold">Matches</h1>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {convs.map((c) => (
          <li key={c.id}>
            <Link
              to="/app/chat/$conversationId"
              params={{ conversationId: c.id }}
              className="flex items-center gap-3 p-3 hover:bg-accent/40"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                {c.pet_photo ? (
                  <img src={c.pet_photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <PawPrint className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{c.other_name}</p>
                  <span className="text-[10px] uppercase tracking-wide text-primary">{c.kind}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {c.last ?? `About ${c.pet_name}`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
