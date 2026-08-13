"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Send,
  Paperclip,
  MessageSquare,
  AtSign,
  Lock,
  Copy,
  ChevronDown,
  Plus,
} from "lucide-react";
import { PageContainer, Card, CardHeader, Badge, Button } from "@/components/admin/ui";
import { TICKETS, formatDate, type Ticket } from "@/lib/admin-data";
import { useAdminNav } from "@/lib/admin-store";
import { useTickets } from "@/lib/admin-data-store";
import { toast } from "sonner";

const PRIORITY_COLOR: Record<Ticket["priority"], "gray" | "blue" | "orange" | "red"> = {
  Basse: "gray",
  Normale: "blue",
  Haute: "orange",
  Urgente: "red",
};

const STATUS_COLOR: Record<Ticket["status"], "blue" | "yellow" | "gray" | "green"> = {
  Ouvert: "blue",
  "En cours": "yellow",
  "En attente": "gray",
  Résolu: "green",
};

const PLAN_COLOR: Record<Ticket["plan"], "gray" | "blue" | "purple" | "orange"> = {
  Starter: "gray",
  Pro: "blue",
  Enterprise: "purple",
  Essai: "orange",
};

export function TicketDetailPage() {
  const { selectedId, goBack } = useAdminNav();
  const { tickets } = useTickets();
  const ticket = tickets.find((t) => t.id === selectedId) ?? TICKETS[0];

  return (
    <PageContainer>
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#6B7280] transition-colors hover:text-[#2563EB]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux tickets
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Ticket header + conversation */}
          <Card className="p-6">
            <div className="mb-5">
              <p className="font-mono text-[13px] text-[#6B7280]">#{ticket.id}</p>
              <h2 className="mt-1 font-display text-[22px] font-bold text-[#111827]">{ticket.subject}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <Badge color={STATUS_COLOR[ticket.status]}>{ticket.status}</Badge>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#2563EB]"
                  >
                    Changer <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-[#E5E7EB]">•</span>
                <div className="flex items-center gap-1.5">
                  <Badge color={PRIORITY_COLOR[ticket.priority]}>{ticket.priority}</Badge>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#2563EB]"
                  >
                    Changer <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-[#F3F4F6] pt-5">
              <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Conversation
              </h3>
              <div className="space-y-4">
                {ticket.messages.map((m, i) =>
                  m.from === "client" ? (
                    <ClientMessage key={i} message={m} ticket={ticket} />
                  ) : (
                    <AdminMessage key={i} message={m} />
                  )
                )}
              </div>
            </div>
          </Card>

          {/* Reply zone */}
          <Card>
            <CardHeader title="Répondre" subtitle="Votre réponse sera envoyée au demandeur" />
            <div className="p-5">
              <textarea
                placeholder="Écrire une réponse..."
                className="min-h-[120px] w-full resize-y rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toast.info("Joindre un fichier — bientôt")}>
                  <Paperclip className="h-4 w-4" />
                  Joindre
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.info("Réponses type — bientôt")}>
                  <MessageSquare className="h-4 w-4" />
                  Réponse type
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.info("Mentionner — bientôt")}>
                  <AtSign className="h-4 w-4" />
                  Mentionner
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#F3F4F6] pt-4">
                <Button variant="outline" onClick={() => toast.success("Réponse envoyée et ticket fermé")}>
                  Envoyer et fermer
                </Button>
                <Button variant="primary" onClick={() => toast.success("Réponse envoyée")}>
                  <Send className="h-4 w-4" />
                  Envoyer
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <InfoCard ticket={ticket} />
          <InternalNotesCard ticket={ticket} />
          <ActionsCard ticket={ticket} />
        </div>
      </div>
    </PageContainer>
  );
}

function ClientMessage({
  message,
  ticket,
}: {
  message: Ticket["messages"][number];
  ticket: Ticket;
}) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
          style={{ backgroundColor: ticket.avatarColor }}
        >
          {message.author.charAt(0)}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-[#111827]">{message.author}</span>
          <span className="text-[12px] text-[#6B7280]">{message.timestamp}</span>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-[#374151]">{message.content}</p>
    </div>
  );
}

function AdminMessage({ message }: { message: Ticket["messages"][number] }) {
  return (
    <div className="rounded-xl border-l-[3px] border-[#2563EB] bg-[#EFF6FF] p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] text-[12px] font-bold text-white">
          AV
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-[#111827]">{message.author}</span>
          <span className="inline-flex items-center rounded-full bg-[#2563EB] px-2 py-0.5 text-[11px] font-semibold text-white">
            Admin
          </span>
          <span className="text-[12px] text-[#6B7280]">{message.timestamp}</span>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-[#111827]">{message.content}</p>
    </div>
  );
}

function InfoCard({ ticket }: { ticket: Ticket }) {
  const email = `${ticket.requester.toLowerCase().replace(/[^a-zà-ÿ]/g, ".")}@${ticket.company
    .toLowerCase()
    .replace(/[^a-zà-ÿ]/g, "")}.sn`;

  function copyEmail() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(email).catch(() => undefined);
    }
    toast.success("Email copié dans le presse-papier");
  }

  return (
    <Card>
      <CardHeader title="Informations" />
      <div className="space-y-4 p-5">
        <InfoRow label="Demandeur">
          <div>
            <button
              type="button"
              className="text-[14px] font-semibold text-[#2563EB] hover:underline"
              onClick={() => toast.info("Ouverture du profil fabricant — bientôt")}
            >
              {ticket.requester}
            </button>
            <p className="text-[12px] text-[#6B7280]">{ticket.company}</p>
          </div>
        </InfoRow>

        <InfoRow label="Email">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] text-[#374151]">{email}</span>
            <button
              type="button"
              onClick={copyEmail}
              aria-label="Copier l'email"
              className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#2563EB]"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </InfoRow>

        <InfoRow label="Plan">
          <Badge color={PLAN_COLOR[ticket.plan]}>{ticket.plan}</Badge>
        </InfoRow>

        <InfoRow label="Créé le">
          <span className="text-[13px] text-[#374151]">{formatDate(ticket.createdAt)}</span>
        </InfoRow>

        <InfoRow label="Assigné à">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] text-[10px] font-bold text-white">
              AV
            </div>
            <span className="text-[13px] font-medium text-[#374151]">Admin VS</span>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#6B7280] hover:text-[#2563EB]"
              onClick={() => toast.info("Réassignation — bientôt")}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </InfoRow>

        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Tags</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {ticket.tags.map((tag) => (
              <Badge key={tag} color="gray">
                #{tag}
              </Badge>
            ))}
            <button
              type="button"
              onClick={() => toast.info("Ajouter un tag — bientôt")}
              className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[#D1D5DB] px-2.5 py-0.5 text-[12px] font-semibold text-[#6B7280] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <div className="text-right">{children}</div>
    </div>
  );
}

function InternalNotesCard({ ticket }: { ticket: Ticket }) {
  const [notes, setNotes] = useState(ticket.internalNotes);
  const [draft, setDraft] = useState("");

  function addNote() {
    if (!draft.trim()) return;
    setNotes((prev) => [
      ...prev,
      { date: "À l'instant", author: "Admin VS", content: draft.trim() },
    ]);
    setDraft("");
    toast.success("Note privée ajoutée");
  }

  return (
    <Card>
      <CardHeader
        title="Notes privées"
        subtitle="Visibles par l'équipe uniquement"
        action={
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#FFFBEB] text-[#92400E]">
            <Lock className="h-3.5 w-3.5" />
          </span>
        }
      />
      <div className="space-y-3 p-5">
        {notes.length === 0 && (
          <p className="text-[13px] italic text-[#9CA3AF]">Aucune note privée pour le moment.</p>
        )}
        {notes.map((note, i) => (
          <div key={i} className="rounded-lg bg-[#FFFBEB] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#92400E]">{note.author}</span>
              <span className="text-[11px] text-[#92400E]">{note.date}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-[#374151]">{note.content}</p>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-[#F3F4F6] pt-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNote();
            }}
            placeholder="Ajouter une note..."
            className="h-9 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          />
          <Button variant="outline" size="sm" onClick={addNote} disabled={!draft.trim()}>
            Ajouter
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ActionsCard({ ticket }: { ticket: Ticket }) {
  return (
    <Card>
      <CardHeader title="Actions" />
      <div className="flex flex-col gap-2 p-5">
        <Button variant="outline" onClick={() => toast.info("Changer la priorité — bientôt")}>
          Changer priorité
        </Button>
        <Button variant="outline" onClick={() => toast.info("Réassigner — bientôt")}>
          Réassigner
        </Button>
        <Button variant="outline" onClick={() => toast.info("Fusionner avec un autre ticket — bientôt")}>
          Fusionner avec...
        </Button>
        <div className="my-1 border-t border-[#F3F4F6]" />
        <Button variant="success" onClick={() => toast.success(`Ticket ${ticket.id} fermé`)}>
          Fermer le ticket
        </Button>
        <Button variant="danger" onClick={() => toast.error(`Ticket ${ticket.id} supprimé`)}>
          Supprimer
        </Button>
      </div>
    </Card>
  );
}
