"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Smartphone,
  Globe,
  BarChart3,
  ArrowRight,
  Check,
  FileText,
  QrCode,
  ScanLine,
  MapPin,
  TrendingUp,
  Package,
  ShieldCheck,
  Users,
  Clock,
  FileCheck2,
  Landmark,
  Ship,
  Map,
  PieChart,
  Activity,
  Target,
  Eye,
  Download,
  Award,
} from "lucide-react";

/**
 * FeatureDetailDialog
 *
 * Detailed explanatory modal opened by the "Découvrir…" links in the Features
 * section. Each feature ("tracabilite" | "export" | "statistiques") renders a
 * rich, structured page-like content inside a scrollable dialog: hero image,
 * intro, "comment ça marche" steps, concrete deliverables, and benefits.
 *
 * This replaces the previous `href="#"` links that redirected to the top of
 * the home page (because the project only exposes the `/` route, dedicated
 * pages cannot be created — a modal is the correct pattern here).
 */

export type FeatureKey = "tracabilite" | "export" | "statistiques";

type Step = {
  icon: React.ReactNode;
  title: string;
  text: string;
};

type Deliverable = {
  icon: React.ReactNode;
  title: string;
  text: string;
};

type Benefit = string;

type FeatureContent = {
  key: FeatureKey;
  label: string;
  title: string;
  subtitle: string;
  illustration: string;
  accent: string; // text color
  accentBg: string; // soft bg for badges
  accentSoft: string; // solid bg for badges/buttons
  intro: string;
  howItWorks: Step[];
  deliverablesTitle: string;
  deliverables: Deliverable[];
  benefits: Benefit[];
};

const CONTENT: Record<FeatureKey, FeatureContent> = {
  tracabilite: {
    key: "tracabilite",
    label: "Traçabilité totale",
    title: "La traçabilité totale, du producteur au consommateur",
    subtitle:
      "Chaque lot dispose d'un QR code unique lié à une fiche produit complète, infalsifiable et accessible en un scan.",
    illustration: "/features/feature-tracabilite.png",
    accent: "text-[#2563EB]",
    accentBg: "bg-[#EFF6FF]",
    accentSoft: "bg-[#2563EB]",
    intro:
      "La traçabilité VerifScan relie chaque produit physique à son passeport numérique. Dès la création d'un lot, un QR code unique est généré et lié définitivement à votre compte fabricant. Vos clients, distributeurs et partenaires peuvent scanner ce code à n'importe quel moment pour accéder à la vérité sur le produit : origine, ingrédients, certifications, historique de fabrication et dates de péremption.",
    howItWorks: [
      {
        icon: <FileText className="h-5 w-5" />,
        title: "1. Création de la fiche produit",
        text: "Renseignez le nom, les ingrédients, l'origine des matières premières, les certifications et le logo. La fiche est sauvegardée et liée à votre compte fabricant.",
      },
      {
        icon: <QrCode className="h-5 w-5" />,
        title: "2. Génération du QR code unique",
        text: "Pour chaque lot, VerifScan crée un QR code sécurisé et infalsifiable, prêt à imprimer sur vos étiquettes. Chaque code pointe vers une URL unique.",
      },
      {
        icon: <ScanLine className="h-5 w-5" />,
        title: "3. Scan par le client",
        text: "Le client final scanne le QR code avec n'importe quel smartphone, sans application à installer. La fiche produit s'ouvre instantanément dans le navigateur.",
      },
      {
        icon: <Eye className="h-5 w-5" />,
        title: "4. Affichage de la fiche complète",
        text: "Le consommateur voit la fiche authentique du produit : photo, composition, certifications, historique de fabrication, score de transparence et coordonnées du fabricant.",
      },
    ],
    deliverablesTitle: "Ce que voit votre client en un scan",
    deliverables: [
      {
        icon: <Package className="h-5 w-5" />,
        title: "Fiche produit complète",
        text: "Photo, nom, description, format, poids net et catégorie du produit.",
      },
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: "Certifications & conformité",
        text: "Logos et références des certifications (bio, halal, CEDEAO, ISO, etc.) vérifiables.",
      },
      {
        icon: <Clock className="h-5 w-5" />,
        title: "Historique de fabrication",
        text: "Date de fabrication, numéro de lot, date de péremption et conditions de conservation.",
      },
      {
        icon: <Users className="h-5 w-5" />,
        title: "Coordonnées du fabricant",
        text: "Nom de l'entreprise, adresse, contact et lien direct pour poser une question.",
      },
    ],
    benefits: [
      "Renforce la confiance de vos clients en rendant votre produit 100 % transparent",
      "Protège votre marque contre la contrefaçon grâce à un QR code infalsifiable",
      "Réduit les réclamations clients : l'information est toujours disponible, 24h/24",
      "Différencie vos produits sur les rayons face à des concurrents opaques",
    ],
  },

  export: {
    key: "export",
    label: "Export simplifié",
    title: "Vos dossiers d'export prêts en quelques clics",
    subtitle:
      "Générez automatiquement les documents normalisés requis par les marchés internationaux, directement depuis les données de vos lots.",
    illustration: "/features/feature-export.png",
    accent: "text-[#10B981]",
    accentBg: "bg-[#F0FDF4]",
    accentSoft: "bg-[#10B981]",
    intro:
      "L'export de produits agroalimentaires vers les marchés régionaux et internationaux exige une documentation rigoureuse : certificats d'origine, fiches techniques, attestations de conformité, bons de livraison. VerifScan collecte ces données à la source — au moment où vous créez vos lots — et génère automatiquement des documents normalisés prêts à être joints à vos dossiers d'export. Vous gagnez des heures par dossier et évitez les erreurs de saisie.",
    howItWorks: [
      {
        icon: <FileText className="h-5 w-5" />,
        title: "1. Centralisation des données",
        text: "Toutes les informations de vos produits et lots sont déjà saisies dans VerifScan : plus besoin de re-saisir quoi que ce soit dans un document Word.",
      },
      {
        icon: <FileCheck2 className="h-5 w-5" />,
        title: "2. Sélection du marché cible",
        text: "Choisissez le marché de destination (CEDEAO, Union Européenne, USA, etc.) et VerifScan sélectionne automatiquement les documents requis.",
      },
      {
        icon: <Download className="h-5 w-5" />,
        title: "3. Génération automatique",
        text: "Les documents sont générés au format PDF, pré-remplis avec vos données, prêts à imprimer ou à transmettre par e-mail à votre commissionnaire.",
      },
      {
        icon: <Ship className="h-5 w-5" />,
        title: "4. Suivi du dossier",
        text: "Chaque dossier d'export est archivé et relié à ses lots. Vous retrouvez en 1 clic l'historique complet de vos expéditions.",
      },
    ],
    deliverablesTitle: "Documents générés automatiquement",
    deliverables: [
      {
        icon: <Landmark className="h-5 w-5" />,
        title: "Certificat d'origine",
        text: "Attestation officielle de l'origine du produit, requise pour les accords préférentiels CEDEAO et hors-CEDEAO.",
      },
      {
        icon: <FileText className="h-5 w-5" />,
        title: "Fiche technique produit",
        text: "Document détaillé : composition, allergènes, valeurs nutritionnelles, conditions de conservation et d'usage.",
      },
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: "Attestation de conformité",
        text: "Récapitulatif des certifications et normes (HACCP, ISO 22000, halal, bio) applicables au lot exporté.",
      },
      {
        icon: <Package className="h-5 w-5" />,
        title: "Bon de livraison & packing list",
        text: "Liste détaillée des cartons, poids nets et bruts, volumes et numéros de lots associés à l'expédition.",
      },
    ],
    benefits: [
      "Jusqu'à 80 % de temps en moins sur la préparation de chaque dossier d'export",
      "Documents conformes aux exigences CEDEAO, UE et USA mis à jour automatiquement",
      "Zéro risque d'erreur de saisie : les données viennent directement de vos lots",
      "Historique complet de vos dossiers pour vos audits et vos relances douanières",
    ],
  },

  statistiques: {
    key: "statistiques",
    label: "Statistiques utiles",
    title: "Pilotez votre marché grâce à vos données de scan",
    subtitle:
      "Suivez en temps réel les scans par région, par produit et par période pour identifier vos marchés les plus dynamiques.",
    illustration: "/features/feature-statistiques.png",
    accent: "text-[#F59E0B]",
    accentBg: "bg-[#FFFBEB]",
    accentSoft: "bg-[#F59E0B]",
    intro:
      "Chaque scan d'un de vos QR codes est une information précieuse : il vous dit où, quand et par quel produit votre marque est consultée. VerifScan agrège ces données en temps réel et vous présente des tableaux de bord clairs : carte de chaleur des scans par région, classement de vos produits les plus scannés, tendances mensuelles et trimestrielles. Vous pouvez ainsi prendre des décisions d'investissement, de distribution et de marketing fondées sur des faits, pas sur des intuitions.",
    howItWorks: [
      {
        icon: <ScanLine className="h-5 w-5" />,
        title: "1. Collecte automatique",
        text: "À chaque scan d'un de vos QR codes, VerifScan enregistre anonymement la région, le moment et le produit scanné, dans le respect du RGPD.",
      },
      {
        icon: <Activity className="h-5 w-5" />,
        title: "2. Agrégation en temps réel",
        text: "Les données sont consolidées dans vos tableaux de bord, mis à jour en continu, sans aucune action de votre part.",
      },
      {
        icon: <PieChart className="h-5 w-5" />,
        title: "3. Visualisation claire",
        text: "Cartes de chaleur, graphiques de tendance, classements : toutes les vues sont pensées pour être lisibles en 30 secondes.",
      },
      {
        icon: <Target className="h-5 w-5" />,
        title: "4. Décisions éclairées",
        text: "Identifiez vos marchés les plus dynamiques, vos produits porte-drapeau et les périodes de forte demande pour orienter votre stratégie.",
      },
    ],
    deliverablesTitle: "Indicateurs disponibles en un coup d'œil",
    deliverables: [
      {
        icon: <Map className="h-5 w-5" />,
        title: "Carte de chaleur des scans",
        text: "Visualisez les régions où vos produits sont les plus scannés, pour cibler vos investissements distribution.",
      },
      {
        icon: <TrendingUp className="h-5 w-5" />,
        title: "Classement des produits",
        text: "Top 10 de vos produits les plus scannés sur la période, avec évolution par rapport à la période précédente.",
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Tendances mensuelles & trimestrielles",
        text: "Courbes d'évolution des scans par produit, par région et par période pour anticiper les pics de demande.",
      },
      {
        icon: <MapPin className="h-5 w-5" />,
        title: "Détail par ville",
        text: "Drill-down jusqu'à la ville pour comprendre précisément où vos produits rencontrent leur public.",
      },
    ],
    benefits: [
      "Identifiez vos marchés les plus porteurs et concentrez vos efforts commerciaux",
      "Détectez les produits qui décollent et ajustez votre production en conséquence",
      "Anticipez les pics saisonniers pour éviter les ruptures de stock",
      "Justifiez vos investissements marketing avec des données concrètes",
    ],
  },
};

type FeatureDetailDialogProps = {
  feature: FeatureKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeatureDetailDialog({
  feature,
  open,
  onOpenChange,
}: FeatureDetailDialogProps) {
  const data = feature ? CONTENT[feature] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:max-w-3xl"
      >
        {data && (
          <>
            {/* Header with hero image + close button */}
            <div className="relative">
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-[#F3F4F6]">
                <img
                  src={data.illustration}
                  alt={data.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                {/* Top accent bar */}
                <span
                  className={`absolute left-0 top-0 h-1.5 w-full ${data.accentSoft}`}
                  aria-hidden
                />
              </div>

              {/* Close button */}
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Fermer"
                className="absolute right-4 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#111827] shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Label badge + title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full ${data.accentBg} px-3 py-1 text-xs font-semibold ${data.accent}`}
                >
                  {data.key === "tracabilite" && <Smartphone className="h-3.5 w-3.5" />}
                  {data.key === "export" && <Globe className="h-3.5 w-3.5" />}
                  {data.key === "statistiques" && (
                    <BarChart3 className="h-3.5 w-3.5" />
                  )}
                  {data.label}
                </span>
                <DialogTitle
                  asChild
                  className="mt-3 block font-display text-[22px] font-bold leading-tight text-white sm:text-[28px]"
                >
                  <h2>{data.title}</h2>
                </DialogTitle>
              </div>
            </div>

            <DialogDescription className="sr-only">
              {data.subtitle}
            </DialogDescription>

            {/* Scrollable body */}
            <ScrollArea className="flex-1">
              <div className="px-5 py-6 sm:px-7 sm:py-7">
                {/* Subtitle */}
                <p className="text-[15px] font-medium leading-relaxed text-[#6B7280] sm:text-base">
                  {data.subtitle}
                </p>

                {/* Intro */}
                <p className="mt-4 text-[15px] leading-relaxed text-[#374151]">
                  {data.intro}
                </p>

                {/* How it works */}
                <section className="mt-8">
                  <header className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${data.accentBg} ${data.accent}`}
                    >
                      <Activity className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-lg font-semibold text-[#111827]">
                      Comment ça marche
                    </h3>
                  </header>

                  <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.howItWorks.map((step) => (
                      <li
                        key={step.title}
                        className="flex gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4"
                      >
                        <span
                          className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${data.accentBg} ${data.accent}`}
                        >
                          {step.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">
                            {step.title}
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#4B5563]">
                            {step.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* Deliverables */}
                <section className="mt-8">
                  <header className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${data.accentBg} ${data.accent}`}
                    >
                      <Award className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-lg font-semibold text-[#111827]">
                      {data.deliverablesTitle}
                    </h3>
                  </header>

                  <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.deliverables.map((d) => (
                      <li
                        key={d.title}
                        className="flex gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
                      >
                        <span
                          className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${data.accentBg} ${data.accent}`}
                        >
                          {d.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">
                            {d.title}
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#4B5563]">
                            {d.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Benefits */}
                <section className="mt-8">
                  <header className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${data.accentBg} ${data.accent}`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-lg font-semibold text-[#111827]">
                      Bénéfices concrets pour vous
                    </h3>
                  </header>

                  <ul className="mt-4 space-y-2.5">
                    {data.benefits.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-[14px] leading-relaxed text-[#374151]"
                      >
                        <Check
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${data.accent}`}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* CTA */}
                <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-base font-semibold text-[#111827]">
                      Prêt à explorer cette fonctionnalité ?
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#6B7280]">
                      Créez votre compte fabricant gratuit et testez par
                      vous-même.
                    </p>
                  </div>
                  <a
                    href="#pricing"
                    onClick={() => onOpenChange(false)}
                    className={`group inline-flex items-center justify-center gap-2 rounded-[10px] ${data.accentSoft} px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90`}
                  >
                    Créer mon compte gratuit
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
