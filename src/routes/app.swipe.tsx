import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Heart, X, MapPin, PartyPopper, PawPrint } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/swipe")({
  head: () => ({
    meta: [
      { title: "Find a Mate — NorthPaw" },
      { name: "description", content: "Swipe through Calgary pets and find the perfect match for yours." },
      { property: "og:title", content: "Find a Mate — NorthPaw" },
      { property: "og:description", content: "Swipe through Calgary pets and find the perfect match for yours." },
      { property: "og:url", content: "https://northpaw-canadas-pet-hub.lovable.app/app/swipe" },
    ],
    links: [{ rel: "canonical", href: "https://northpaw-canadas-pet-hub.lovable.app/app/swipe" }],
  }),
  component: SwipePage,
});

type Pet = {
  id: string; name: string; breed: string | null; age: number | null;
  gender: string | null; city: string | null; photos: string[]; owner_id: string;
};

function SwipePage() {
  const { user } = useAuth();
  const [myPetId, setMyPetId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedPet, setMatchedPet] = useState<Pet | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: myPets } = await supabase
        .from("pets").select("id").eq("owner_id", user.id).eq("show_in_mating", true).limit(1);
      const myId = myPets?.[0]?.id ?? null;
      setMyPetId(myId);

      // already-swiped target ids
      let swipedIds: string[] = [];
      if (myId) {
        const { data: swipes } = await supabase.from("swipes").select("target_pet_id").eq("swiper_pet_id", myId);
        swipedIds = swipes?.map((s) => s.target_pet_id) ?? [];
      }

      let q = supabase.from("pets").select("*")
        .eq("show_in_mating", true).neq("owner_id", user.id).limit(40);
      if (swipedIds.length) q = q.not("id", "in", `(${swipedIds.join(",")})`);
      const { data: candidates } = await q;
      setDeck((candidates ?? []) as Pet[]);
      setLoading(false);
    })();
  }, [user]);

  async function swipe(direction: "like" | "pass") {
    if (!user || !myPetId || deck.length === 0) return;
    const target = deck[0];
    setDeck((d) => d.slice(1));
    const { error } = await supabase.from("swipes").insert({
      swiper_pet_id: myPetId,
      target_pet_id: target.id,
      swiper_user_id: user.id,
      direction,
    });
    if (error) { toast.error(error.message); return; }
    if (direction === "like") {
      // check match
      const { data: match } = await supabase.from("matches").select("id")
        .or(`and(pet_a_id.eq.${myPetId},pet_b_id.eq.${target.id}),and(pet_a_id.eq.${target.id},pet_b_id.eq.${myPetId})`)
        .maybeSingle();
      if (match) {
        // create conversation if not exists
        const { data: existing } = await supabase.from("conversations").select("id")
          .eq("kind", "match")
          .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${target.owner_id}),and(user_a_id.eq.${target.owner_id},user_b_id.eq.${user.id})`)
          .maybeSingle();
        if (!existing) {
          await supabase.from("conversations").insert({
            user_a_id: user.id, user_b_id: target.owner_id,
            context_pet_id: target.id, kind: "match",
          });
        }
        setMatchedPet(target);
      }
    }
  }

  if (loading) return <PageState label="Loading…" />;
  if (!myPetId) {
    return (
      <PageState label="">
        <PawPrint className="h-10 w-10 text-primary" />
        <h2 className="text-lg font-semibold">Create your pet profile</h2>
        <p className="text-center text-sm text-muted-foreground">
          Add a pet and enable Mating in your profile to start swiping.
        </p>
        <Link to="/app/profile" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Go to Profile
        </Link>
      </PageState>
    );
  }
  if (deck.length === 0) {
    return <PageState label="No more pets nearby. Check back soon!" />;
  }

  const top = deck[0];

  return (
    <div className="px-4 pt-4">
      <h1 className="sr-only">Find a Mate</h1>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-elegant)]">
        {top.photos[0] ? (
          <img src={top.photos[0]} alt={top.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <PawPrint className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 text-white">
          <h2 className="text-2xl font-bold">{top.name}<span className="ml-2 text-lg font-normal opacity-90">{top.age ? `${top.age}` : ""}</span></h2>
          <p className="text-sm opacity-90">{top.breed} · {top.gender}</p>
          <p className="mt-1 flex items-center gap-1 text-xs opacity-80"><MapPin className="h-3 w-3" />{top.city}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-8">
        <button onClick={() => swipe("pass")} aria-label={`Pass on ${top.name}`}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-card text-muted-foreground shadow-[var(--shadow-card)] transition-transform active:scale-90">
          <X className="h-7 w-7" />
        </button>
        <button onClick={() => swipe("like")} aria-label={`Like ${top.name}`}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform active:scale-90">
          <Heart className="h-9 w-9 fill-current" />
        </button>
      </div>

      {matchedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur" onClick={() => setMatchedPet(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-elegant)]">
            <PartyPopper className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-3 text-2xl font-extrabold text-foreground">It's a Match!</h2>
            <p className="mt-1 text-sm text-muted-foreground">You and {matchedPet.name}'s owner liked each other.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setMatchedPet(null)} className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold">
                Keep Swiping
              </button>
              <Link to="/app/matches" onClick={() => setMatchedPet(null)} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
                Say Hi
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageState({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {children}
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}
