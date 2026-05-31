import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { LogOut, Plus, X, ImagePlus, Check, PawPrint } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — NorthPaw" },
      {
        name: "description",
        content:
          "Manage your NorthPaw pet profile, photos, and visibility across mating, adoption, and marketplace.",
      },
      { property: "og:title", content: "Your Profile — NorthPaw" },
      {
        property: "og:description",
        content: "Manage your NorthPaw pet profile, photos, and visibility.",
      },
      { property: "og:url", content: "https://northpaw-canadas-pet-hub.lovable.app/app/profile" },
    ],
    links: [{ rel: "canonical", href: "https://northpaw-canadas-pet-hub.lovable.app/app/profile" }],
  }),
  component: ProfilePage,
});

type Pet = {
  id?: string;
  name: string;
  species: string;
  breed: string;
  age: number | "";
  gender: "male" | "female" | "";
  city: string;
  bio: string;
  description: string;
  price: number | "";
  photos: string[];
  show_in_mating: boolean;
  show_in_adoption: boolean;
  show_in_marketplace: boolean;
};

type PetSummary = { id: string; name: string; species: string; photos: string[] };

const EMPTY: Pet = {
  name: "",
  species: "Dog",
  breed: "",
  age: "",
  gender: "",
  city: "Calgary",
  bio: "",
  description: "",
  price: "",
  photos: [],
  show_in_mating: true,
  show_in_adoption: false,
  show_in_marketplace: false,
};

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    user_type: string;
    display_name: string | null;
    organization_name: string | null;
    city: string | null;
  } | null>(null);
  const [petList, setPetList] = useState<PetSummary[]>([]);
  const [pet, setPet] = useState<Pet>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toggleSaved, setToggleSaved] = useState(false);
  const toggleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(prof);
      const { data: pets } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at");
      const list = (pets ?? []) as PetSummary[];
      setPetList(list);
      if (list.length > 0) loadPet(pets![0]);
    })();
  }, [user]);

  function loadPet(p: Record<string, unknown>) {
    setPet({
      id: p.id as string,
      name: p.name as string,
      species: p.species as string,
      breed: (p.breed as string) ?? "",
      age: p.age != null ? Number(p.age) : "",
      gender: ((p.gender as string) ?? "") as "male" | "female" | "",
      city: (p.city as string) ?? "Calgary",
      bio: (p.bio as string) ?? "",
      description: (p.description as string) ?? "",
      price: p.price != null ? Number(p.price) : "",
      photos: (p.photos as string[]) ?? [],
      show_in_mating: p.show_in_mating as boolean,
      show_in_adoption: p.show_in_adoption as boolean,
      show_in_marketplace: p.show_in_marketplace as boolean,
    });
  }

  function selectPet(summary: PetSummary) {
    // fetch full pet data then load
    supabase
      .from("pets")
      .select("*")
      .eq("id", summary.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) loadPet(data as Record<string, unknown>);
      });
  }

  function newPet() {
    setPet(EMPTY);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (pet.photos.length >= 5) {
      toast.error("Max 5 photos");
      return;
    }
    setUploading(true);
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage
      .from("pet-photos")
      .upload(path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
    setPet((p) => ({ ...p, photos: [...p.photos, data.publicUrl] }));
    setUploading(false);
  }

  async function savePet() {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }
    if (!pet.name.trim()) {
      toast.error("Pet needs a name");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        owner_id: user.id,
        name: pet.name.trim(),
        species: pet.species,
        breed: pet.breed || null,
        age: pet.age === "" ? null : Number(pet.age),
        gender: pet.gender || null,
        city: pet.city,
        bio: pet.bio || null,
        description: pet.description || null,
        price: pet.price === "" ? null : Number(pet.price),
        photos: pet.photos,
        show_in_mating: pet.show_in_mating,
        show_in_adoption: pet.show_in_adoption,
        show_in_marketplace: pet.show_in_marketplace,
      };

      if (pet.id) {
        const { data, error } = await supabase
          .from("pets")
          .update(payload)
          .eq("id", pet.id)
          .eq("owner_id", user.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("No pet was updated (check permissions)");
        setPet((p) => ({ ...p, id: data.id }));
        setPetList((list) =>
          list.map((s) => (s.id === data.id ? { ...s, name: data.name, photos: data.photos } : s)),
        );
      } else {
        const { data, error } = await supabase.from("pets").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Failed to create pet");
        setPet((p) => ({ ...p, id: data.id }));
        setPetList((list) => [
          ...list,
          { id: data.id, name: data.name, species: data.species, photos: data.photos },
        ]);
      }
      toast.success("Pet profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save pet profile");
    } finally {
      setSaving(false);
    }
  }

  const autoSaveToggles = useCallback(
    async (
      updates: Partial<Pick<Pet, "show_in_mating" | "show_in_adoption" | "show_in_marketplace">>,
    ) => {
      if (!user || !pet.id) return;
      const petId = pet.id;
      const ownerId = user.id;
      setToggleSaved(false);
      if (toggleTimer.current) clearTimeout(toggleTimer.current);
      toggleTimer.current = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from("pets")
            .update(updates)
            .eq("id", petId)
            .eq("owner_id", ownerId);
          if (error) throw error;
          setToggleSaved(true);
          toggleTimer.current = setTimeout(() => setToggleSaved(false), 2000);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update visibility");
        }
      }, 400);
    },
    [user, pet.id],
  );

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="sr-only">Your Profile</h1>

      {/* User header */}
      <header className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
              <Logo size={28} />
            </div>
            <div>
              <p className="text-sm font-bold">
                {profile?.organization_name || profile?.display_name || "Your profile"}
              </p>
              <p className="text-xs capitalize text-muted-foreground">
                {profile?.user_type === "owner"
                  ? "Pet Owner"
                  : profile?.user_type === "shelter"
                    ? "Shelter"
                    : "Pet Store"}{" "}
                · {profile?.city}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* My Pets list */}
      {petList.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">My Pets</h2>
            <button
              onClick={newPet}
              className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add Pet
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {petList.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPet(p)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  pet.id === p.id
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border bg-background font-medium text-foreground hover:border-primary/50"
                }`}
              >
                {p.photos[0] ? (
                  <img src={p.photos[0]} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <PawPrint className="h-4 w-4 text-muted-foreground" />
                )}
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Pet edit form */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-base font-bold">{pet.id ? `Edit ${pet.name}` : "New Pet"}</h2>

        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photos (up to 5)
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {pet.photos.map((url, i) => (
              <div
                key={url}
                className="relative h-20 w-20 overflow-hidden rounded-xl border border-border"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() =>
                    setPet((p) => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }))
                  }
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {pet.photos.length < 5 && (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
                {uploading ? (
                  <span className="text-[10px]">Uploading…</span>
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px]">Add</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <F label="Name" value={pet.name} onChange={(v) => setPet({ ...pet, name: v })} />
          <F label="Species" value={pet.species} onChange={(v) => setPet({ ...pet, species: v })} />
          <F label="Breed" value={pet.breed} onChange={(v) => setPet({ ...pet, breed: v })} />
          <F
            label="Age"
            type="number"
            value={String(pet.age)}
            onChange={(v) => setPet({ ...pet, age: v === "" ? "" : Number(v) })}
          />
          <label className="block col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gender
            </span>
            <select
              value={pet.gender}
              onChange={(e) => setPet({ ...pet, gender: e.target.value as "male" | "female" | "" })}
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-3 text-sm outline-none focus:border-primary"
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <F label="City" value={pet.city} onChange={(v) => setPet({ ...pet, city: v })} />
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bio (for Mating)
          </span>
          <textarea
            value={pet.bio}
            onChange={(e) => setPet({ ...pet, bio: e.target.value })}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description (Adoption / Marketplace)
          </span>
          <textarea
            value={pet.description}
            onChange={(e) => setPet({ ...pet, description: e.target.value })}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {pet.show_in_marketplace && (
          <F
            label="Price (CAD)"
            type="number"
            value={String(pet.price)}
            onChange={(v) => setPet({ ...pet, price: v === "" ? "" : Number(v) })}
          />
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Toggle
              label="Show in Mating"
              value={pet.show_in_mating}
              onChange={(v) => {
                setPet({ ...pet, show_in_mating: v });
                autoSaveToggles({ show_in_mating: v });
              }}
            />
            {toggleSaved && <Check className="h-4 w-4 text-green-500" />}
          </div>
          <div className="flex items-center justify-between">
            <Toggle
              label="Show in Adoption"
              value={pet.show_in_adoption}
              onChange={(v) => {
                setPet({ ...pet, show_in_adoption: v });
                autoSaveToggles({ show_in_adoption: v });
              }}
            />
            {toggleSaved && <Check className="h-4 w-4 text-green-500" />}
          </div>
          <div className="flex items-center justify-between">
            <Toggle
              label="Show in Marketplace"
              value={pet.show_in_marketplace}
              onChange={(v) => {
                setPet({ ...pet, show_in_marketplace: v });
                autoSaveToggles({ show_in_marketplace: v });
              }}
            />
            {toggleSaved && <Check className="h-4 w-4 text-green-500" />}
          </div>
        </div>

        <button
          onClick={savePet}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-60"
        >
          {pet.id ? (
            "Save Changes"
          ) : (
            <>
              <Plus className="h-4 w-4" /> Create Pet
            </>
          )}
        </button>
      </section>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </label>
  );
}
