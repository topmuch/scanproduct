"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, MessageCircle, Phone, User, X } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppFieldHint } from "@/components/WhatsAppFieldHint";

/**
 * SellPackModal — VENTE d'un pack de QR codes à un artisan (SuperAdmin).
 *
 * Étape 1 : formulaire (téléphone = identifiant de connexion, nom de
 * l'artisan/marque) + encadré « Ce qui va se passer ».
 * Étape 2 : succès → GROS bouton vert « Envoyer via WhatsApp » (lien wa.me
 * pré-rempli renvoyé par l'API, AUCUN envoi automatique), bouton « Copier
 * le message » pour un envoi manuel, puis « Fermer ».
 *
 * L'API POST /api/admin/sell-pack crée le compte Artisan (mot de passe
 * par défaut « 0000 »), marque le pack « vendu » et le lie au compte.
 */

export interface SellPackModalPack {
  id: string;
  packNumber: number;
  quantity: number;
  price: number;
  masterQrCode: string;
}

type SaleResult = {
  whatsappLink: string;
  whatsappMessage: string;
  loginUrl: string;
  defaultPassword: string;
  artisan: { phone: string; name: string | null };
};

export function SellPackModal({
  pack,
  onClose,
  onSold,
}: {
  pack: SellPackModalPack;
  onClose: () => void;
  onSold: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SaleResult | null>(null);
  // RACHAT DE LOT : client déjà connu ? (lookup live pendant la saisie)
  const [existing, setExisting] = useState<{
    id: string;
    phone: string;
    name: string | null;
    packsCount: number;
  } | null>(null);

  // Dès que le téléphone ressemble à un numéro valide, on interroge
  // l'API admin : si le client existe déjà (lot précédent), on affiche
  // « Client existant — ce lot rejoindra son dashboard » et on
  // préremplit son nom de marque (évite les comptes en double).
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setExisting(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/artisan-lookup?phone=${encodeURIComponent(phone)}`
        );
        if (!res.ok) {
          setExisting(null);
          return;
        }
        const json = await res.json();
        setExisting(json.artisan ?? null);
        if (json.artisan?.name) {
          setName((n) => n || json.artisan.name);
        }
      } catch {
        setExisting(null);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sell-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          artisanPhone: phone,
          artisanName: name,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Vente impossible");
        return;
      }
      setResult({
        whatsappLink: json.whatsappLink,
        whatsappMessage: json.whatsappMessage,
        loginUrl: json.loginUrl,
        defaultPassword: json.defaultPassword,
        artisan: json.artisan,
      });
      toast.success("Pack vendu avec succès");
      onSold();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.whatsappMessage);
      toast.success("Message copié dans le presse-papiers");
    } catch {
      toast.error("Copie impossible sur ce navigateur");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="sell-pack-modal"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* En-tête */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-base font-extrabold text-gray-900">
            {result ? "Pack vendu avec succès !" : `Vendre le pack #${pack.packNumber}`}
          </h2>
          <button onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-5">
          {!result ? (
            <form onSubmit={submit} data-testid="sell-form">
              {/* Rappel du pack */}
              <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-600">
                <span className="font-bold text-gray-800">Pack #{pack.packNumber}</span>{" "}
                · {pack.quantity} QR codes ·{" "}
                {pack.price.toLocaleString("fr-FR")} FCFA
                <div className="mt-0.5 font-mono text-[11px] text-gray-500">
                  {pack.masterQrCode}
                </div>
              </div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                📞 Téléphone de l&apos;artisan *
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="77 123 45 67"
                  data-testid="sell-phone"
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none focus:border-amber-500"
                />
              </div>
              <p className="mt-1 text-[12px] text-gray-500">
                Servira d&apos;identifiant de connexion.
              </p>
              <WhatsAppFieldHint phone={phone} />

              {existing && (
                <div
                  className="mt-2 rounded-xl bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800"
                  data-testid="existing-client-hint"
                >
                  <p className="font-bold">
                    ✅ Client existant : {existing.name || existing.phone} ({existing.packsCount}{' '}
                    lot{existing.packsCount > 1 ? "s" : ""} enregistré
                    {existing.packsCount > 1 ? "s" : ""})
                  </p>
                  <p className="mt-0.5">
                    Ce nouveau lot sera ajouté à son tableau de bord existant —
                    pas de nouveau compte créé.
                  </p>
                </div>
              )}

              <label className="mb-2 mt-4 block text-sm font-semibold text-gray-700">
                👤 Nom de l&apos;artisan / marque *
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aissata Cosmétiques"
                  data-testid="sell-name"
                  className="w-full rounded-xl border-2 border-gray-200 py-3 pl-10 pr-4 outline-none focus:border-amber-500"
                />
              </div>

              {/* Encadré « ce qui va se passer » */}
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                <p className="font-bold">💡 Ce qui va se passer :</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>Le pack sera marqué comme « vendu »</li>
                  <li>Un compte artisan sera créé</li>
                  <li>Un WhatsApp sera envoyé avec les infos de connexion</li>
                  <li>
                    Mot de passe par défaut : <strong>0000</strong>
                  </li>
                </ul>
              </div>

              {error && (
                <p
                  className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
                  data-testid="sell-error"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                data-testid="sell-submit"
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-bold text-white shadow-lg shadow-amber-500/30 disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "✅ Enregistrer la vente"}
              </button>
            </form>
          ) : (
            <div data-testid="sell-success">
              <div className="flex flex-col items-center py-2 text-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                <p className="mt-3 text-sm text-gray-600">
                  Le pack de <strong>{pack.quantity} QR codes</strong> est vendu à{" "}
                  <strong>{result.artisan.name ?? result.artisan.phone}</strong>.
                  Cliquez sur le bouton ci-dessous pour envoyer les codes
                  d&apos;accès à l&apos;artisan.
                </p>
              </div>

              <a
                href={result.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="sell-whatsapp"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-4 text-base font-extrabold text-white shadow-lg shadow-green-500/30 transition-transform active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" />
                📱 Envoyer via WhatsApp
              </a>

              <button
                onClick={copyMessage}
                data-testid="sell-copy"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                Copier le message
              </button>

              <button
                onClick={onClose}
                className="mt-3 w-full rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
