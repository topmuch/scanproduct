"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Sparkles,
  Wrench,
  Lightbulb,
  MessageSquare,
  Send,
  Plus,
  Bot,
  User as UserIcon,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  FileText,
  Languages,
  ListChecks,
  TrendingUp,
  Wand2,
  Info,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  GradientButton,
  OutlineButton,
  KpiCard,
} from "@/components/fabricant/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================================
// Types — mirror the API contract from task 2a
// ============================================================================

type TabKey = "chat" | "tools" | "insights";

type ConversationSummary = {
  id: string;
  title: string;
  tool?: string;
  updatedAt: string;
  messageCount: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ConversationDetail = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

type GenerateDescriptionResult = {
  description: string;
  seoKeywords: string[];
};

type TranslateResult = {
  translation: string;
};

type IngredientAnomaly = {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

type AnalyzeIngredientsResult = {
  allergens: string[];
  anomalies: IngredientAnomaly[];
  recommendations: string[];
};

type RecommendationsResult = {
  bestPublishTime: { day: string; hour: string; reason: string };
  tips: string[];
  predictions: string[];
};

// ============================================================================
// Constants
// ============================================================================

const TAB_OPTIONS: { value: TabKey; label: string; Icon: typeof Sparkles }[] = [
  { value: "chat", label: "Assistant IA", Icon: Sparkles },
  { value: "tools", label: "Outils IA", Icon: Wrench },
  { value: "insights", label: "Insights", Icon: Lightbulb },
];

const SUGGESTED_PROMPTS = [
  "Comment améliorer la transparence de mes produits ?",
  "Rédige une description pour mon jus de bissap",
  "Quelles certifications recommandes-tu ?",
];

const LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "wolof", label: "Wolof" },
];

const DAILY_TIPS = [
  "Ajoutez des photos claires de vos produits : les fiches avec 3+ photos reçoivent 2x plus de scans.",
  "Pensez à mettre à jour vos lots avant qu'ils n'expirent pour éviter les alertes de rappel.",
  "Les descriptions entre 80 et 150 mots améliorent le SEO et la confiance des consommateurs.",
  "Activez les notifications par email pour ne rater aucune alerte critique sur vos lots.",
  "Mettez en avant vos certifications (HACCP, BIO) : elles augmentent le taux de conversion de 35%.",
];

// ============================================================================
// Helpers
// ============================================================================

/** Fetch wrapper that turns non-2xx responses into French toast errors. */
async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    if (res.status === 401) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return null;
    }
    if (res.status === 429) {
      toast.error("Trop de requêtes. Réessayez dans un instant.");
      return null;
    }
    if (!res.ok) {
      let message = "Une erreur est survenue. Réessayez.";
      try {
        const data = await res.json();
        if (data?.error) message = String(data.error);
      } catch {
        /* ignore parse errors */
      }
      toast.error(message);
      return null;
    }
    return (await res.json()) as T;
  } catch {
    toast.error("Connexion impossible. Vérifiez votre réseau.");
    return null;
  }
}

function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  try {
    return formatDistanceToNow(d, { locale: fr, addSuffix: true });
  } catch {
    return "";
  }
}

/** Day-of-year index for rotating the daily tip. */
function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Tab bar — custom pills with emerald active state (no blue accent)
// ============================================================================

function TabBar({ value, onChange }: { value: TabKey; onChange: (v: TabKey) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Sections Assistant IA"
      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1"
    >
      {TAB_OPTIONS.map((opt) => {
        const { Icon } = opt;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-white text-[#10B981] shadow-sm"
                : "text-[#6B7280] hover:text-[#10B981]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Loading dots — animated AI "typing" indicator
// ============================================================================

function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[#E5E7EB] bg-white px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-[#10B981]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Copy button — copies text to clipboard with check feedback
// ============================================================================

function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copié dans le presse-papier");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  }, [text]);
  return (
    <OutlineButton onClick={handleCopy} className="px-3 py-1.5 text-[12px]">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copié" : label}
    </OutlineButton>
  );
}

// ============================================================================
// Form field primitives (shared by tool dialogs)
// ============================================================================

const fieldInputClass =
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/15";
const fieldTextareaClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/15";

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
      {children}
      {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
    </label>
  );
}

// ============================================================================
// CHAT VIEW
// ============================================================================

function ChatView() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ----- Load conversation list (reusable from event handlers) -----
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    const data = await apiFetch<ConversationSummary[]>("/api/ai/conversations");
    if (data) {
      setConversations(Array.isArray(data) ? data : []);
    }
    setLoadingList(false);
  }, []);

  // ----- Initial fetch on mount (inlined to satisfy lint) -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      const data = await apiFetch<ConversationSummary[]>("/api/ai/conversations");
      if (!cancelled) {
        if (data) setConversations(Array.isArray(data) ? data : []);
        setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- Auto-scroll on new messages -----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  // ----- Auto-resize textarea -----
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  // ----- Load a conversation's messages -----
  const handleSelectConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setShowSidebarMobile(false);
    setLoadingMessages(true);
    setMessages([]);
    const data = await apiFetch<ConversationDetail>(`/api/ai/conversations/${id}`);
    if (data) {
      setMessages(data.messages);
    }
    setLoadingMessages(false);
  }, []);

  // ----- Start a new conversation -----
  const handleNewConversation = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setShowSidebarMobile(false);
    setInput("");
    textareaRef.current?.focus();
  }, []);

  // ----- Send a message -----
  const handleSend = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || sending) return;

      const userMsg: ChatMessage = {
        id: `tmp-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setSending(true);

      const payload = {
        message: trimmed,
        ...(activeId ? { conversationId: activeId } : {}),
      };
      const data = await apiFetch<{ response: string; conversationId: string }>(
        "/api/ai/chat",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      setSending(false);

      if (data) {
        const aiMsg: ChatMessage = {
          id: `tmp-ai-${Date.now()}`,
          role: "assistant",
          content: data.response,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // First message in a new conversation — adopt the returned id
        if (!activeId && data.conversationId) {
          setActiveId(data.conversationId);
          void loadConversations();
        } else {
          // Refresh list to bump updatedAt / messageCount on the active convo
          void loadConversations();
        }
      } else {
        // Rollback the optimistic user message on failure
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      }
    },
    [input, sending, activeId, loadConversations],
  );

  // ----- Enter to send, Shift+Enter for newline -----
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
    // auto-resize on set
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
      }
    }, 0);
  };

  const isEmpty = messages.length === 0 && !loadingMessages && !sending;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] gap-4 lg:h-[calc(100vh-200px)]">
      {/* ---------------------------------------------------------------
          Sidebar — conversations list (collapsible on mobile)
          --------------------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {(showSidebarMobile || typeof window !== "undefined") && (
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex w-full flex-col rounded-xl border border-[#E5E7EB] bg-white",
              "lg:w-[300px] lg:flex-shrink-0",
              !showSidebarMobile && "hidden lg:flex",
            )}
          >
            <div className="border-b border-[#F3F4F6] p-3">
              <GradientButton
                onClick={handleNewConversation}
                className="w-full justify-center bg-gradient-to-r from-[#F59E0B] to-[#EF4444] shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Nouvelle conversation
              </GradientButton>
            </div>
            <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#E5E7EB] [&::-webkit-scrollbar-track]:bg-transparent">
              {loadingList ? (
                <div className="space-y-2 p-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-lg bg-[#F3F4F6]"
                    />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <MessageSquare className="mx-auto mb-2 h-6 w-6 text-[#D1D5DB]" />
                  <p className="text-[12px] text-[#9CA3AF]">
                    Aucune conversation. Posez votre première question !
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {conversations.map((c) => {
                    const active = c.id === activeId;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => void handleSelectConversation(c.id)}
                          className={cn(
                            "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                            active
                              ? "bg-[#FEF3C7] text-[#92400E]"
                              : "text-[#374151] hover:bg-[#F9FAFB]",
                          )}
                        >
                          <p className="truncate text-[13px] font-medium">
                            {c.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                            <Clock className="h-3 w-3" />
                            {formatRelativeDate(c.updatedAt)}
                            <span>·</span>
                            <span>{c.messageCount} msg</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------
          Chat window
          --------------------------------------------------------------- */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        {/* Mobile sidebar toggle */}
        <header className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setShowSidebarMobile((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#374151] hover:text-[#10B981]"
          >
            <ChevronLeft className="h-4 w-4" />
            Conversations
          </button>
          <button
            type="button"
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#10B981]"
          >
            <Plus className="h-4 w-4" />
            Nouvelle
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#E5E7EB] [&::-webkit-scrollbar-track]:bg-transparent sm:p-6">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white shadow-md"
              >
                <Sparkles className="h-8 w-8" />
              </motion.div>
              <h3 className="font-display text-[20px] font-bold text-[#111827]">
                Bonjour ! Comment puis-je vous aider ?
              </h3>
              <p className="mt-1 max-w-md text-[14px] text-[#6B7280]">
                Posez une question sur vos produits, vos lots, ou choisissez une
                suggestion ci-dessous.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSuggestionClick(p)}
                    className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-[13px] font-medium text-[#374151] transition-all hover:border-[#10B981]/40 hover:bg-[#D1FAE5]/30 hover:text-[#065F46]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              <AnimatePresence initial={false}>
                {loadingMessages &&
                  messages.length === 0 &&
                  [0, 1, 2].map((i) => (
                    <motion.div
                      key={`skeleton-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "h-12 animate-pulse rounded-2xl bg-[#F3F4F6]",
                        i % 2 === 0 ? "w-2/3 self-start" : "w-1/2 self-end",
                      )}
                    />
                  ))}
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex max-w-[85%] gap-2.5",
                      m.role === "user" ? "self-end flex-row-reverse" : "self-start",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                        m.role === "user"
                          ? "bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white"
                          : "bg-gradient-to-br from-[#10B981] to-[#059669] text-white",
                      )}
                    >
                      {m.role === "user" ? (
                        <UserIcon className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </span>
                    <div
                      className={cn(
                        "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-sm bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white"
                          : "rounded-bl-sm border border-[#E5E7EB] bg-white text-[#111827]",
                      )}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex max-w-[85%] gap-2.5 self-start"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-white">
                      <Bot className="h-4 w-4" />
                    </span>
                    <TypingDots />
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="border-t border-[#F3F4F6] bg-white p-3 sm:p-4"
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                aria-label="Message à envoyer"
                placeholder="Écrivez votre message… (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
                rows={1}
                disabled={sending}
                className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 pr-12 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/15 disabled:opacity-60"
                style={{ maxHeight: 160 }}
              />
            </div>
            <GradientButton
              type="submit"
              disabled={sending || !input.trim()}
              className="h-12 w-12 flex-shrink-0 justify-center bg-gradient-to-br from-[#F59E0B] to-[#EF4444] p-0"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </GradientButton>
          </div>
        </form>
      </section>
    </div>
  );
}

// ============================================================================
// TOOL: Description Generator
// ============================================================================

function DescriptionGeneratorTool() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateDescriptionResult | null>(null);
  const [form, setForm] = useState({
    productName: "",
    brand: "",
    category: "",
    features: "",
    language: "fr",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }
    setLoading(true);
    setResult(null);
    const data = await apiFetch<GenerateDescriptionResult>(
      "/api/ai/generate-description",
      {
        method: "POST",
        body: JSON.stringify({
          productName: form.productName,
          brand: form.brand || undefined,
          category: form.category || undefined,
          features: form.features || undefined,
          language: form.language,
        }),
      },
    );
    setLoading(false);
    if (data) {
      setResult(data);
      toast.success("Description générée avec succès");
    }
  };

  const handleUse = () => {
    toast.success("Description copiée");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-full w-full flex-col items-start rounded-xl border border-[#E5E7EB] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#F59E0B]/40 hover:shadow-md"
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#92400E]">
          <FileText className="h-6 w-6" />
        </span>
        <h4 className="font-display text-[16px] font-semibold text-[#111827]">
          Générateur de descriptions
        </h4>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
          Rédige des descriptions produit optimisées SEO en un clic.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#F59E0B] group-hover:gap-2 transition-all">
          Ouvrir l&apos;outil <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileText className="h-5 w-5 text-[#F59E0B]" />
            Générateur de descriptions
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <FieldLabel required>Nom du produit</FieldLabel>
            <Input
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="Ex: Jus de bissap premium"
              className={fieldInputClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Marque</FieldLabel>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Ex: Baobab Sénégal"
                className={fieldInputClass}
              />
            </div>
            <div>
              <FieldLabel>Catégorie</FieldLabel>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex: Boissons"
                className={fieldInputClass}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Caractéristiques</FieldLabel>
            <Textarea
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder="Ingrédients clés, certifications, origine…"
              rows={3}
              className={fieldTextareaClass}
            />
          </div>
          <div>
            <FieldLabel>Langue</FieldLabel>
            <Select
              value={form.language}
              onValueChange={(v) => setForm({ ...form, language: v })}
            >
              <SelectTrigger className={cn(fieldInputClass, "w-full")}>
                <SelectValue placeholder="Choisir une langue" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {result && (
            <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h5 className="text-[13px] font-semibold text-[#92400E]">
                  Description générée
                </h5>
                <CopyButton text={result.description} />
              </div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#374151]">
                {result.description}
              </p>
              {result.seoKeywords?.length > 0 && (
                <div className="mt-3 border-t border-[#FDE68A] pt-3">
                  <p className="mb-1.5 text-[12px] font-medium text-[#92400E]">
                    Mots-clés SEO
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.seoKeywords.map((k) => (
                      <Badge
                        key={k}
                        className="bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]"
                      >
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <OutlineButton onClick={() => setOpen(false)}>Fermer</OutlineButton>
            <GradientButton
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#F59E0B] to-[#EF4444]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {loading ? "Génération…" : "Générer"}
            </GradientButton>
            {result && (
              <OutlineButton
                onClick={handleUse}
                className="border-[#10B981]/40 text-[#10B981] hover:bg-[#D1FAE5]/40"
              >
                <Check className="h-4 w-4" />
                Utiliser
              </OutlineButton>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TOOL: Translator
// ============================================================================

function TranslatorTool() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [form, setForm] = useState({
    text: "",
    from: "fr",
    to: "en",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) {
      toast.error("Le texte à traduire est requis");
      return;
    }
    setLoading(true);
    setResult(null);
    const data = await apiFetch<TranslateResult>("/api/ai/translate", {
      method: "POST",
      body: JSON.stringify({ text: form.text, from: form.from, to: form.to }),
    });
    setLoading(false);
    if (data) {
      setResult(data);
      toast.success("Traduction réussie");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-full w-full flex-col items-start rounded-xl border border-[#E5E7EB] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#10B981]/40 hover:shadow-md"
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#D1FAE5] text-[#065F46]">
          <Languages className="h-6 w-6" />
        </span>
        <h4 className="font-display text-[16px] font-semibold text-[#111827]">
          Traducteur
        </h4>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
          Traduisez vos textes en français, anglais ou wolof.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#10B981] group-hover:gap-2 transition-all">
          Ouvrir l&apos;outil <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Languages className="h-5 w-5 text-[#10B981]" />
            Traducteur
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>De</FieldLabel>
              <Select value={form.from} onValueChange={(v) => setForm({ ...form, from: v })}>
                <SelectTrigger className={cn(fieldInputClass, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Vers</FieldLabel>
              <Select value={form.to} onValueChange={(v) => setForm({ ...form, to: v })}>
                <SelectTrigger className={cn(fieldInputClass, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel required>Texte</FieldLabel>
            <Textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Entrez le texte à traduire…"
              rows={4}
              className={fieldTextareaClass}
              required
            />
          </div>

          {result && (
            <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h5 className="text-[13px] font-semibold text-[#065F46]">
                  Traduction
                </h5>
                <CopyButton text={result.translation} />
              </div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#374151]">
                {result.translation}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <OutlineButton onClick={() => setOpen(false)}>Fermer</OutlineButton>
            <GradientButton
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#10B981] to-[#059669]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
              {loading ? "Traduction…" : "Traduire"}
            </GradientButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TOOL: Ingredient Analyzer
// ============================================================================

const SEVERITY_META: Record<
  IngredientAnomaly["severity"],
  { bg: string; text: string; Icon: typeof AlertTriangle; label: string }
> = {
  info: { bg: "#EFF6FF", text: "#1E40AF", Icon: Info, label: "Info" },
  warning: { bg: "#FEF3C7", text: "#92400E", Icon: AlertTriangle, label: "Attention" },
  critical: { bg: "#FEE2E2", text: "#991B1B", Icon: AlertTriangle, label: "Critique" },
};

function IngredientsAnalyzerTool() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeIngredientsResult | null>(null);
  const [form, setForm] = useState({ ingredients: "", productName: "" });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.ingredients.trim()) {
      toast.error("La liste d'ingrédients est requise");
      return;
    }
    setLoading(true);
    setResult(null);
    const data = await apiFetch<AnalyzeIngredientsResult>("/api/ai/analyze-ingredients", {
      method: "POST",
      body: JSON.stringify({
        ingredients: form.ingredients,
        productName: form.productName || undefined,
      }),
    });
    setLoading(false);
    if (data) {
      setResult(data);
      toast.success("Analyse terminée");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-full w-full flex-col items-start rounded-xl border border-[#E5E7EB] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#EF4444]/40 hover:shadow-md"
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#991B1B]">
          <ListChecks className="h-6 w-6" />
        </span>
        <h4 className="font-display text-[16px] font-semibold text-[#111827]">
          Analyseur d&apos;ingrédients
        </h4>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
          Détecte les allergènes, anomalies et obtenez des recommandations.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#EF4444] group-hover:gap-2 transition-all">
          Ouvrir l&apos;outil <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <ListChecks className="h-5 w-5 text-[#EF4444]" />
            Analyseur d&apos;ingrédients
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <FieldLabel>Nom du produit (optionnel)</FieldLabel>
            <Input
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="Ex: Jus de bissap"
              className={fieldInputClass}
            />
          </div>
          <div>
            <FieldLabel required>Liste d&apos;ingrédients</FieldLabel>
            <Textarea
              value={form.ingredients}
              onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
              placeholder="Ex: eau, fleur d'hibiscus, sucre, acide citrique…"
              rows={4}
              className={fieldTextareaClass}
              required
            />
          </div>

          {result && (
            <div className="space-y-3">
              {/* Allergens */}
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                <h5 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#991B1B]">
                  <AlertTriangle className="h-4 w-4" />
                  Allergènes détectés ({result.allergens?.length ?? 0})
                </h5>
                {result.allergens?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.allergens.map((a) => (
                      <Badge
                        key={a}
                        className="bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2]"
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[#6B7280]">
                    Aucun allergène connu détecté.
                  </p>
                )}
              </div>

              {/* Anomalies */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <h5 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
                  <Info className="h-4 w-4 text-[#6B7280]" />
                  Anomalies ({result.anomalies?.length ?? 0})
                </h5>
                {result.anomalies?.length > 0 ? (
                  <ul className="space-y-2">
                    {result.anomalies.map((an, i) => {
                      const meta = SEVERITY_META[an.severity] ?? SEVERITY_META.info;
                      const { Icon } = meta;
                      return (
                        <li
                          key={`${an.type}-${i}`}
                          className="flex items-start gap-2.5 rounded-lg bg-[#F9FAFB] p-2.5"
                        >
                          <span
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: meta.bg, color: meta.text }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[11px] font-semibold uppercase tracking-wide"
                                style={{ color: meta.text }}
                              >
                                {meta.label}
                              </span>
                              {an.type && (
                                <span className="text-[11px] text-[#9CA3AF]">
                                  · {an.type}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[13px] text-[#374151]">
                              {an.message}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#6B7280]">
                    Aucune anomalie détectée.
                  </p>
                )}
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4">
                <h5 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#065F46]">
                  <CheckCircle2 className="h-4 w-4" />
                  Recommandations ({result.recommendations?.length ?? 0})
                </h5>
                {result.recommendations?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#10B981]" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#6B7280]">
                    Aucune recommandation spécifique.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <OutlineButton onClick={() => setOpen(false)}>Fermer</OutlineButton>
            <GradientButton
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#EF4444] to-[#DC2626]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ListChecks className="h-4 w-4" />
              )}
              {loading ? "Analyse…" : "Analyser"}
            </GradientButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TOOL: Recommendations
// ============================================================================

function RecommendationsTool() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecommendationsResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch<RecommendationsResult>("/api/ai/recommendations");
    if (d) setData(d);
    setLoading(false);
  }, []);

  // ----- Auto-load on first open (inlined to satisfy lint) -----
  useEffect(() => {
    if (!open || data || loading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const d = await apiFetch<RecommendationsResult>("/api/ai/recommendations");
      if (!cancelled) {
        if (d) setData(d);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, data, loading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-full w-full flex-col items-start rounded-xl border border-[#E5E7EB] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#8B5CF6]/40 hover:shadow-md"
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#5B21B6]">
          <Lightbulb className="h-6 w-6" />
        </span>
        <h4 className="font-display text-[16px] font-semibold text-[#111827]">
          Recommandations
        </h4>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
          Meilleur moment pour publier, astuces et prédictions.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#8B5CF6] group-hover:gap-2 transition-all">
          Ouvrir l&apos;outil <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between font-display">
            <span className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-[#8B5CF6]" />
              Recommandations IA
            </span>
            <OutlineButton
              onClick={() => void load()}
              disabled={loading}
              className="px-3 py-1.5 text-[12px]"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Actualiser
            </OutlineButton>
          </DialogTitle>
        </DialogHeader>

        {loading && !data ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[#F3F4F6]" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Best publish time */}
            <div className="rounded-xl border border-[#EDE9FE] bg-gradient-to-br from-[#F5F3FF] to-[#FFFFFF] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6] text-white">
                  <Clock className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-[#7C3AED]">
                    Meilleur moment pour publier
                  </p>
                  <p className="mt-1 font-display text-[18px] font-bold text-[#111827]">
                    {data.bestPublishTime?.day} · {data.bestPublishTime?.hour}
                  </p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    {data.bestPublishTime?.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <h5 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
                <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                Astuces
              </h5>
              {data.tips?.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F59E0B]" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#6B7280]">Aucune astuce pour le moment.</p>
              )}
            </div>

            {/* Predictions */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <h5 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
                <TrendingUp className="h-4 w-4 text-[#10B981]" />
                Prédictions
              </h5>
              {data.predictions?.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.predictions.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                      <TrendingUp className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#10B981]" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#6B7280]">Aucune prédiction disponible.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-[#6B7280]">
            Impossible de charger les recommandations.
          </p>
        )}

        <div className="flex items-center justify-end pt-2">
          <OutlineButton onClick={() => setOpen(false)}>Fermer</OutlineButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TOOLS VIEW — 4-card grid
// ============================================================================

function ToolsView() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DescriptionGeneratorTool />
      <TranslatorTool />
      <IngredientsAnalyzerTool />
      <RecommendationsTool />
    </div>
  );
}

// ============================================================================
// INSIGHTS VIEW
// ============================================================================

function InsightsView({ onGoToChat }: { onGoToChat: () => void }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await apiFetch<ConversationSummary[]>("/api/ai/conversations");
      if (!cancelled && data) {
        setConversations(Array.isArray(data) ? data : []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalConversations = conversations.length;
  const totalMessages = conversations.reduce((sum, c) => sum + (c.messageCount ?? 0), 0);
  const descriptionsCount = conversations.filter(
    (c) => c.tool === "description_generator" || c.tool === "description",
  ).length;
  const translationsCount = conversations.filter(
    (c) => c.tool === "translator" || c.tool === "translate",
  ).length;

  const tipIndex = dayOfYear() % DAILY_TIPS.length;
  const todayTip = DAILY_TIPS[tipIndex];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon="💬"
          iconBg="#FEF3C7"
          label="Total conversations"
          value={totalConversations}
          subText={loading ? "Chargement…" : "Conversations démarrées"}
        />
        <KpiCard
          icon="✉️"
          iconBg="#D1FAE5"
          label="Messages échangés"
          value={totalMessages}
          subText={loading ? "Chargement…" : "Avec l'assistant"}
        />
        <KpiCard
          icon="📝"
          iconBg="#FEE2E2"
          label="Descriptions générées"
          value={descriptionsCount}
          subText="Via l'outil IA"
        />
        <KpiCard
          icon="🌐"
          iconBg="#EDE9FE"
          label="Traductions"
          value={translationsCount}
          subText="Via l'outil IA"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Conseil du jour */}
        <SectionCard
          title="Conseil du jour"
          subtitle="Une astuce pour améliorer votre présence produit"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] text-white shadow-md">
              <Lightbulb className="h-7 w-7" />
            </span>
            <div>
              <p className="text-[15px] font-medium leading-relaxed text-[#111827]">
                {todayTip}
              </p>
              <p className="mt-2 text-[12px] text-[#9CA3AF]">
                Astuce #{tipIndex + 1} sur {DAILY_TIPS.length} · rotation quotidienne
              </p>
            </div>
          </div>
        </SectionCard>

        {/* CTA to chat */}
        <SectionCard
          title="Besoin d'aide ?"
          subtitle="L'assistant IA est à votre disposition"
        >
          <div className="flex h-full flex-col justify-between gap-4">
            <p className="text-[14px] text-[#6B7280]">
              Posez une question à l&apos;assistant pour obtenir des conseils
              personnalisés sur vos produits, lots et certifications.
            </p>
            <GradientButton
              onClick={onGoToChat}
              className="bg-gradient-to-r from-[#F59E0B] to-[#EF4444]"
            >
              <Sparkles className="h-4 w-4" />
              Posez une question à l&apos;assistant
              <ArrowRight className="h-4 w-4" />
            </GradientButton>
          </div>
        </SectionCard>
      </div>

      {/* Recent conversations preview */}
      <SectionCard
        title="Conversations récentes"
        subtitle="Vos derniers échanges avec l'assistant"
        action={
          <button
            type="button"
            onClick={onGoToChat}
            className="text-[12px] font-medium text-[#10B981] hover:opacity-80"
          >
            Voir tout
          </button>
        }
        bodyClassName="p-0"
      >
        <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#E5E7EB] [&::-webkit-scrollbar-track]:bg-transparent">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F3F4F6]" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-[#D1D5DB]" />
              <p className="text-[13px] text-[#6B7280]">
                Aucune conversation pour le moment.
              </p>
              <button
                type="button"
                onClick={onGoToChat}
                className="mt-3 text-[13px] font-medium text-[#10B981] hover:opacity-80"
              >
                Démarrer une conversation →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#F3F4F6]">
              {conversations.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={onGoToChat}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#F9FAFB]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#111827]">
                        {c.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                        {formatRelativeDate(c.updatedAt)} · {c.messageCount} msg
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#D1D5DB]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function AIAssistantPage() {
  const [tab, setTab] = useState<TabKey>("chat");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Assistant IA"
        subtitle="Générez du contenu, traduisez vos textes et obtenez des conseils personnalisés"
      >
        <TabBar value={tab} onChange={setTab} />
      </PageHeader>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col"
        >
          {tab === "chat" && <ChatView />}
          {tab === "tools" && <ToolsView />}
          {tab === "insights" && <InsightsView onGoToChat={() => setTab("chat")} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AIAssistantPage;
