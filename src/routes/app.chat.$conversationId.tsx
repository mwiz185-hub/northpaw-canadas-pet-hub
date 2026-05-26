import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat/$conversationId")({ component: ChatPage });

type Msg = { id: string; sender_id: string; body: string; created_at: string };

function ChatPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [otherName, setOtherName] = useState("Chat");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: conv } = await supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle();
      if (conv && user) {
        const otherId = conv.user_a_id === user.id ? conv.user_b_id : conv.user_a_id;
        const { data: prof } = await supabase.from("profiles").select("display_name, organization_name").eq("id", otherId).maybeSingle();
        setOtherName(prof?.organization_name || prof?.display_name || "User");
      }
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at");
      setMsgs((data ?? []) as Msg[]);
    })();

    const channel = supabase.channel(`conv:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMsgs((m) => [...m, payload.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/app/matches" className="text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h2 className="text-base font-semibold">{otherName}</h2>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                mine ? "rounded-br-sm bg-primary text-primary-foreground"
                     : "rounded-bl-sm bg-muted text-foreground"
              }`}>{m.body}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…"
          className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
