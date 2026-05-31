import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat/$conversationId")({ component: ChatPage });

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Conv = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  context_pet_id: string | null;
  kind: string;
};
type Sale = { id: string; sale_price: number; commission: number; created_at: string };

function ChatPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [otherName, setOtherName] = useState("Chat");
  const [conv, setConv] = useState<Conv | null>(null);
  const [petPrice, setPetPrice] = useState<number | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [saving, setSaving] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();
      if (c && user) {
        setConv(c as Conv);
        const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, organization_name")
          .eq("id", otherId)
          .maybeSingle();
        setOtherName(prof?.organization_name || prof?.display_name || "User");
        if (c.context_pet_id) {
          const { data: pet } = await supabase
            .from("pets")
            .select("price")
            .eq("id", c.context_pet_id)
            .maybeSingle();
          setPetPrice(pet?.price ?? null);
        }
        const { data: s } = await supabase
          .from("sales")
          .select("id, sale_price, commission, created_at")
          .eq("conversation_id", conversationId)
          .maybeSingle();
        if (s) setSale(s as Sale);
      }
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at");
      setMsgs((data ?? []) as Msg[]);
    })();

    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => setMsgs((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, body });
    if (error) toast.error(error.message);
  }

  // "match" = mating swipe conversation (no purchase). Only adoption/marketplace can be marked as purchased.
  const isSeller = !!(
    user &&
    conv &&
    conv.context_pet_id &&
    (conv.kind === "adoption" || conv.kind === "marketplace")
  );
  const canMarkPurchased = isSeller && !sale;

  function openModal() {
    setPriceInput(petPrice ? String(petPrice) : "");
    setShowModal(true);
  }

  async function confirmSale() {
    if (!user || !conv || !conv.context_pet_id) return;
    const price = parseFloat(priceInput);
    if (!isFinite(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    const buyerId = conv.user_a_id === user.id ? conv.user_b_id : conv.user_a_id;
    const commission = Math.round(price * 0.02 * 100) / 100;
    const { data, error } = await supabase
      .from("sales")
      .insert({
        conversation_id: conversationId,
        pet_id: conv.context_pet_id,
        seller_id: user.id,
        buyer_id: buyerId,
        kind: conv.kind,
        sale_price: price,
        commission,
      })
      .select("id, sale_price, commission, created_at")
      .maybeSingle();
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    setSale(data as Sale);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: `✅ Sale completed — $${price.toFixed(2)} (platform commission $${commission.toFixed(2)})`,
    });
    setSaving(false);
    setShowModal(false);
    toast.success("Marked as purchased");
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/app/matches" className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="flex-1 text-base font-semibold">{otherName}</h2>
        {sale ? (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sold ${Number(sale.sale_price).toFixed(0)}
          </span>
        ) : canMarkPurchased ? (
          <button
            onClick={openModal}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Mark as purchased
          </button>
        ) : null}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Confirm sale</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the final sale price. A 2% platform commission will be recorded.
            </p>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Sale price (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              autoFocus
            />
            {priceInput && isFinite(parseFloat(priceInput)) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Commission (2%):{" "}
                <span className="font-medium text-foreground">
                  ${(parseFloat(priceInput) * 0.02).toFixed(2)}
                </span>
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmSale}
                disabled={saving || !priceInput}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
