import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MapPin, PawPrint, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/shop")({
  head: () => ({
    meta: [
      { title: "Pet Marketplace — NorthPaw" },
      {
        name: "description",
        content: "Shop pets and supplies from verified Canadian pet stores on NorthPaw.",
      },
      { property: "og:title", content: "Shop Verified Pet Stores on NorthPaw" },
      {
        property: "og:description",
        content: "Pets and supplies from verified Canadian pet stores.",
      },
      { property: "og:url", content: "https://northpaw-canadas-pet-hub.lovable.app/app/shop" },
    ],
    links: [{ rel: "canonical", href: "https://northpaw-canadas-pet-hub.lovable.app/app/shop" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Pet Marketplace — NorthPaw",
          description: "Verified Canadian pet stores listing pets and supplies.",
          url: "https://northpaw-canadas-pet-hub.lovable.app/app/shop",
        }),
      },
    ],
  }),
  component: ShopPage,
});

type Listing = {
  id: string;
  name: string;
  breed: string | null;
  age: number | null;
  city: string | null;
  photos: string[];
  price: number | null;
  owner_id: string;
  profiles?: {
    organization_name: string | null;
    display_name: string | null;
    user_type: string;
    verified: boolean;
  } | null;
};

function ShopPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: pets } = await supabase
        .from("pets")
        .select("*")
        .eq("show_in_marketplace", true)
        .order("created_at", { ascending: false });
      const ownerIds = Array.from(new Set((pets ?? []).map((p) => p.owner_id)));
      const { data: profs } = ownerIds.length
        ? await supabase
            .from("profiles")
            .select("id, organization_name, display_name, user_type, verified")
            .in("id", ownerIds)
        : {
            data: [] as {
              id: string;
              organization_name: string | null;
              display_name: string | null;
              user_type: string;
              verified: boolean;
            }[],
          };
      const map = new Map(profs!.map((p) => [p.id, p]));
      setItems(
        (pets ?? []).map((p) => ({
          ...p,
          profiles: map.get(p.owner_id) ?? null,
        })) as unknown as Listing[],
      );
      setLoading(false);
    })();
  }, []);

  async function inquire(p: Listing) {
    if (!user) return;
    if (p.owner_id === user.id) {
      toast.info("This is your own listing");
      return;
    }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id, user_a_id, user_b_id")
      .eq("kind", "marketplace")
      .eq("context_pet_id", p.id)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

    let convId: string | undefined;
    if (existing && existing.length > 0) {
      const match = existing.find(
        (c) =>
          (c.user_a_id === user.id && c.user_b_id === p.owner_id) ||
          (c.user_b_id === user.id && c.user_a_id === p.owner_id),
      );
      if (match) convId = match.id;
    }

    if (!convId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          user_a_id: user.id,
          user_b_id: p.owner_id,
          context_pet_id: p.id,
          kind: "marketplace",
        })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      convId = created.id;
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        body: `Hi! I'd like to inquire about ${p.name}.`,
      });
    }
    navigate({ to: "/app/chat/$conversationId", params: { conversationId: convId } });
  }

  if (loading) return <Center>Loading marketplace…</Center>;
  if (!items.length) return <Center>No marketplace listings yet.</Center>;

  return (
    <div className="px-4 pt-4">
      <h1 className="px-1 pb-1 text-xl font-bold">Marketplace</h1>
      <p className="px-1 pb-3 text-xs text-muted-foreground">
        Verified Canadian pet stores · 2% platform fee applies on completed sales
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => (
          <article
            key={p.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
          >
            <div className="relative aspect-square bg-muted">
              {p.photos[0] ? (
                <img src={p.photos[0]} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <PawPrint className="h-8 w-8" />
                </div>
              )}
              {p.price != null && (
                <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
                  ${Number(p.price).toFixed(0)}
                </span>
              )}
            </div>
            <div className="space-y-1 p-3">
              <h3 className="text-sm font-bold leading-tight">{p.name}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {p.breed}
                {p.age ? ` · ${p.age}y` : ""}
              </p>
              <p className="flex items-center gap-1 truncate text-[11px] font-medium">
                {p.profiles?.verified && (
                  <span
                    title="Verified pet store"
                    className="inline-flex items-center gap-0.5 text-primary"
                  >
                    <BadgeCheck className="h-3 w-3" />
                  </span>
                )}
                <span className="truncate">
                  {p.profiles?.organization_name || p.profiles?.display_name || "Store"}
                </span>
              </p>

              <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {p.city}
              </p>
              <button
                onClick={() => inquire(p)}
                className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
              >
                Inquire
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
