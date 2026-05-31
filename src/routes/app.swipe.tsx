import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Heart, X, MapPin, PartyPopper, PawPrint, Star, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/swipe")({
  head: () => ({
    meta: [
      { title: "Find a Mate — NorthPaw" },
      {
        name: "description",
        content: "Swipe through Calgary pets and find the perfect match for yours.",
      },
      { property: "og:title", content: "Find a Mate — NorthPaw" },
      {
        property: "og:description",
        content: "Swipe through Calgary pets and find the perfect match for yours.",
      },
      { property: "og:url", content: "https://northpaw-canadas-pet-hub.lovable.app/app/swipe" },
    ],
    links: [{ rel: "canonical", href: "https://northpaw-canadas-pet-hub.lovable.app/app/swipe" }],
  }),
  component: SwipePage,
});

type Pet = {
  id: string;
  name: string;
  breed: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  photos: string[];
  owner_id: string;
  bio?: string | null;
};

type MyPet = { id: string; name: string };

const SWIPE_THRESHOLD = 110;

function SwipePage() {
  const { user } = useAuth();
  const [myPets, setMyPets] = useState<MyPet[]>([]);
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedPet, setMatchedPet] = useState<Pet | null>(null);
  const [showPetPicker, setShowPetPicker] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pets } = await supabase
        .from("pets")
        .select("id, name")
        .eq("owner_id", user.id)
        .eq("show_in_mating", true);
      const list = (pets ?? []) as MyPet[];
      setMyPets(list);
      const firstId = list[0]?.id ?? null;
      setActivePetId(firstId);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || activePetId === undefined) return;
    setLoading(true);
    (async () => {
      let swipedIds: string[] = [];
      if (activePetId) {
        const { data: swipes } = await supabase
          .from("swipes")
          .select("target_pet_id")
          .eq("swiper_pet_id", activePetId);
        swipedIds = swipes?.map((s) => s.target_pet_id) ?? [];
      }

      // Exclude only the active pet itself — other pets (even same owner) are shown
      let q = supabase
        .from("pets")
        .select("*")
        .eq("show_in_mating", true)
        .order("created_at", { ascending: false })
        .limit(40);

      if (activePetId) q = q.neq("id", activePetId);
      if (swipedIds.length) q = q.not("id", "in", `(${swipedIds.join(",")})`);

      const { data: candidates } = await q;
      setDeck((candidates ?? []) as Pet[]);
      setLoading(false);
    })();
  }, [user, activePetId]);

  async function recordSwipe(target: Pet, direction: "like" | "pass") {
    if (!user || !activePetId) return;
    const { error: swipeError } = await supabase.from("swipes").insert({
      swiper_pet_id: activePetId,
      target_pet_id: target.id,
      swiper_user_id: user.id,
      direction,
    });
    if (swipeError) {
      console.error("[NorthPaw] swipe insert failed:", swipeError);
      toast.error(swipeError.message);
      return;
    }
    if (direction === "like") {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .or(
          `and(pet_a_id.eq.${activePetId},pet_b_id.eq.${target.id}),and(pet_a_id.eq.${target.id},pet_b_id.eq.${activePetId})`,
        )
        .maybeSingle();
      if (matchError) console.error("[NorthPaw] match query failed:", matchError);
      if (match) {
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("kind", "match")
          .or(
            `and(user_a_id.eq.${user.id},user_b_id.eq.${target.owner_id}),and(user_a_id.eq.${target.owner_id},user_b_id.eq.${user.id})`,
          )
          .maybeSingle();
        if (!existing) {
          await supabase.from("conversations").insert({
            user_a_id: user.id,
            user_b_id: target.owner_id,
            context_pet_id: target.id,
            kind: "match",
          });
        }
        setMatchedPet(target);
      }
    }
  }

  async function simulateMatch(petA: MyPet, petB: MyPet) {
    if (!user) return;

    // Load full pet data for the modal display
    const { data: petBFull, error: petErr } = await supabase
      .from("pets")
      .select("*")
      .eq("id", petB.id)
      .maybeSingle();
    if (petErr || !petBFull) {
      toast.error("Could not load pet data");
      return;
    }

    // Attempt both swipes silently — trigger will create the match row if DB is set up
    await supabase.from("swipes").insert({
      swiper_pet_id: petA.id,
      target_pet_id: petB.id,
      swiper_user_id: user.id,
      direction: "like",
    });
    await supabase.from("swipes").insert({
      swiper_pet_id: petB.id,
      target_pet_id: petA.id,
      swiper_user_id: user.id,
      direction: "like",
    });

    // Create the conversation directly — this is what powers the chat
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("kind", "match")
      .eq("context_pet_id", petB.id)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .maybeSingle();
    if (!existing) {
      const { error: convErr } = await supabase.from("conversations").insert({
        user_a_id: user.id,
        user_b_id: user.id,
        context_pet_id: petB.id,
        kind: "match",
      });
      if (convErr) {
        toast.error("Chat setup failed: " + convErr.message);
        return;
      }
    }

    // Show the modal — works regardless of trigger state
    setMatchedPet(petBFull as Pet);
  }

  const activePet = myPets.find((p) => p.id === activePetId);

  if (loading) return <PageState label="Loading…" />;

  if (!activePetId || myPets.length === 0) {
    return (
      <PageState label="">
        <PawPrint className="h-10 w-10 text-primary" />
        <h2 className="text-lg font-semibold">Create your pet profile</h2>
        <p className="text-center text-sm text-muted-foreground">
          Add a pet and enable Mating in your profile to start swiping.
        </p>
        <Link
          to="/app/profile"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Go to Profile
        </Link>
      </PageState>
    );
  }

  // Pet selector + Test Match panel — always visible when user has 2+ pets
  const multiPetPanel =
    myPets.length > 1 ? (
      <div className="relative mb-4 space-y-2">
        <button
          onClick={() => setShowPetPicker((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-card)]"
        >
          <span className="text-muted-foreground">Swiping as</span>
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            {activePet?.name ?? "Select pet"}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </span>
        </button>
        {showPetPicker && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-elegant)]">
            {myPets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActivePetId(p.id);
                  setShowPetPicker(false);
                  setDeck([]);
                }}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-accent ${p.id === activePetId ? "font-bold text-primary" : ""}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => void simulateMatch(myPets[0], myPets[1])}
          className="w-full rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20"
        >
          ✨ Test Match between {myPets[0].name} &amp; {myPets[1].name}
        </button>
      </div>
    ) : null;

  if (deck.length === 0) {
    return (
      <div className="px-4 pt-4">
        {multiPetPanel}
        <PageState label="">
          <PawPrint className="h-12 w-12 text-primary" />
          <h2 className="text-lg font-semibold">You're all caught up!</h2>
          <p className="text-center text-sm text-muted-foreground">
            No more pets to swipe on. Check back soon!
          </p>
        </PageState>
      </div>
    );
  }

  const top = deck[0];
  const next = deck[1];

  return (
    <div className="px-4 pt-4 pb-32">
      <h1 className="sr-only">Find a Mate</h1>

      {multiPetPanel}

      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
        {next && <PetCard key={next.id} pet={next} asBackdrop />}
        <SwipeCard
          key={top.id}
          pet={top}
          onDecision={(dir) => {
            setDeck((d) => d.slice(1));
            void recordSwipe(top, dir);
          }}
        />
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <ActionButton
          label={`Pass on ${top.name}`}
          variant="pass"
          onClick={() => {
            setDeck((d) => d.slice(1));
            void recordSwipe(top, "pass");
          }}
        >
          <X className="h-7 w-7" />
        </ActionButton>
        <ActionButton
          label={`Super like ${top.name}`}
          variant="super"
          onClick={() => {
            setDeck((d) => d.slice(1));
            void recordSwipe(top, "like");
          }}
        >
          <Star className="h-6 w-6 fill-current" />
        </ActionButton>
        <ActionButton
          label={`Like ${top.name}`}
          variant="like"
          onClick={() => {
            setDeck((d) => d.slice(1));
            void recordSwipe(top, "like");
          }}
        >
          <Heart className="h-8 w-8 fill-current" />
        </ActionButton>
      </div>

      {matchedPet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur animate-in fade-in duration-200"
          onClick={() => setMatchedPet(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-elegant)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-foreground">It's a Match!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You and {matchedPet.name}'s owner liked each other.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setMatchedPet(null)}
                className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold"
              >
                Keep Swiping
              </button>
              <Link
                to="/app/matches"
                onClick={() => setMatchedPet(null)}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                Say Hi
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeCard({ pet, onDecision }: { pet: Pet; onDecision: (d: "like" | "pass") => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [exiting, setExiting] = useState<null | "like" | "pass">(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  function onPointerDown(e: React.PointerEvent) {
    if (exiting) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current || exiting) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  }
  function onPointerUp() {
    if (!start.current || exiting) return;
    start.current = null;
    if (drag.x > SWIPE_THRESHOLD) {
      setExiting("like");
      setTimeout(() => onDecision("like"), 200);
    } else if (drag.x < -SWIPE_THRESHOLD) {
      setExiting("pass");
      setTimeout(() => onDecision("pass"), 200);
    } else {
      setDrag({ x: 0, y: 0 });
    }
  }

  const dx = exiting === "like" ? 600 : exiting === "pass" ? -600 : drag.x;
  const dy = exiting ? drag.y : drag.y;
  const rot = dx / 18;
  const likeOpacity = Math.max(0, Math.min(1, dx / SWIPE_THRESHOLD));
  const passOpacity = Math.max(0, Math.min(1, -dx / SWIPE_THRESHOLD));

  const photos = pet.photos.length ? pet.photos : [];
  const currentPhoto = photos[photoIdx];

  function tapPhoto(e: React.MouseEvent) {
    if (Math.abs(drag.x) > 5) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isLeft = e.clientX - rect.left < rect.width / 2;
    setPhotoIdx((i) => (isLeft ? Math.max(0, i - 1) : Math.min(photos.length - 1, i + 1)));
  }

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={tapPhoto}
      className="absolute inset-0 cursor-grab touch-none select-none overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-elegant)] active:cursor-grabbing"
      style={{
        transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
        transition: start.current ? "none" : "transform 220ms cubic-bezier(.2,.7,.3,1)",
        opacity: exiting ? 0 : 1,
      }}
    >
      {currentPhoto ? (
        <img
          src={currentPhoto}
          alt={pet.name}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <PawPrint className="h-16 w-16" />
        </div>
      )}

      {photos.length > 1 && (
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i === photoIdx ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}

      <div
        className="pointer-events-none absolute left-5 top-6 rotate-[-18deg] rounded-lg border-4 border-emerald-400 px-3 py-1 text-2xl font-extrabold tracking-widest text-emerald-400"
        style={{ opacity: likeOpacity }}
      >
        LIKE
      </div>
      <div
        className="pointer-events-none absolute right-5 top-6 rotate-[18deg] rounded-lg border-4 border-rose-400 px-3 py-1 text-2xl font-extrabold tracking-widest text-rose-400"
        style={{ opacity: passOpacity }}
      >
        NOPE
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 text-white">
        <h2 className="text-2xl font-bold leading-tight">
          {pet.name}
          {pet.age ? <span className="ml-2 text-lg font-normal opacity-90">{pet.age}</span> : null}
        </h2>
        <p className="text-sm opacity-90">{[pet.breed, pet.gender].filter(Boolean).join(" · ")}</p>
        {pet.city && (
          <p className="mt-1 flex items-center gap-1 text-xs opacity-80">
            <MapPin className="h-3 w-3" />
            {pet.city}
          </p>
        )}
        {pet.bio && <p className="mt-2 line-clamp-2 text-xs opacity-85">{pet.bio}</p>}
      </div>
    </div>
  );
}

function PetCard({ pet, asBackdrop }: { pet: Pet; asBackdrop?: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]"
      style={asBackdrop ? { transform: "scale(0.94) translateY(12px)", opacity: 0.7 } : undefined}
    >
      {pet.photos[0] ? (
        <img src={pet.photos[0]} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <PawPrint className="h-16 w-16" />
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  label,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  variant: "pass" | "like" | "super";
}) {
  const cls =
    variant === "like"
      ? "h-20 w-20 bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
      : variant === "super"
        ? "h-14 w-14 bg-sky-500 text-white shadow-md"
        : "h-16 w-16 border-2 border-border bg-card text-muted-foreground shadow-[var(--shadow-card)]";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center rounded-full transition-transform active:scale-90 hover:-translate-y-0.5 ${cls}`}
    >
      {children}
    </button>
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
