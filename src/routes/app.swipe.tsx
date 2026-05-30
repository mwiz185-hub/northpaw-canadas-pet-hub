import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Heart, X, MapPin, PartyPopper, PawPrint, Star } from "lucide-react";
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
  bio?: string | null;
};

const SWIPE_THRESHOLD = 110;

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

  async function recordSwipe(target: Pet, direction: "like" | "pass") {
    if (!user || !myPetId) return;
    const { error } = await supabase.from("swipes").insert({
      swiper_pet_id: myPetId,
      target_pet_id: target.id,
      swiper_user_id: user.id,
      direction,
    });
    if (error) { toast.error(error.message); return; }
    if (direction === "like") {
      const { data: match } = await supabase.from("matches").select("id")
        .or(`and(pet_a_id.eq.${myPetId},pet_b_id.eq.${target.id}),and(pet_a_id.eq.${target.id},pet_b_id.eq.${myPetId})`)
        .maybeSingle();
      if (match) {
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
    return (
      <PageState label="">
        <PawPrint className="h-12 w-12 text-primary" />
        <h2 className="text-lg font-semibold">You're all caught up!</h2>
        <p className="text-center text-sm text-muted-foreground">No more pets nearby. Check back soon for new furry friends.</p>
      </PageState>
    );
  }

  const top = deck[0];
  const next = deck[1];

  return (
    <div className="px-4 pt-4 pb-32">
      <h1 className="sr-only">Find a Mate</h1>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
        {next && (
          <PetCard
            key={next.id}
            pet={next}
            asBackdrop
          />
        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur animate-in fade-in duration-200" onClick={() => setMatchedPet(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-elegant)] animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-foreground">It's a Match!</h2>
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
    setPhotoIdx((i) =>
      isLeft ? Math.max(0, i - 1) : Math.min(photos.length - 1, i + 1)
    );
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
        <img src={currentPhoto} alt={pet.name} draggable={false} className="pointer-events-none h-full w-full object-cover" />
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
        <p className="text-sm opacity-90">
          {[pet.breed, pet.gender].filter(Boolean).join(" · ")}
        </p>
        {pet.city && (
          <p className="mt-1 flex items-center gap-1 text-xs opacity-80">
            <MapPin className="h-3 w-3" />
            {pet.city}
          </p>
        )}
        {pet.bio && (
          <p className="mt-2 line-clamp-2 text-xs opacity-85">{pet.bio}</p>
        )}
      </div>
    </div>
  );
}

function PetCard({ pet, asBackdrop }: { pet: Pet; asBackdrop?: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]"
      style={
        asBackdrop
          ? { transform: "scale(0.94) translateY(12px)", opacity: 0.7 }
          : undefined
      }
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
  children, onClick, label, variant,
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
