import type { Metadata } from "next";
import { LegalLayout, LegalArticle } from "@/components/public/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité — VerifScan",
  description:
    "Politique de confidentialité de VerifScan : données collectées, finalité, durée de conservation, droits des utilisateurs et responsable du traitement.",
  openGraph: {
    title: "Politique de confidentialité — VerifScan",
    description:
      "Comment VerifScan collecte, utilise et protège vos données personnelles.",
    type: "website",
  },
};

const SECTIONS = [
  { id: "responsable", title: "Responsable du traitement" },
  { id: "donnees-collectees", title: "Données collectées" },
  { id: "finalites", title: "Finalités du traitement" },
  { id: "base-legale", title: "Base légale" },
  { id: "destinataires", title: "Destinataires des données" },
  { id: "duree", title: "Durée de conservation" },
  { id: "securite", title: "Sécurité des données" },
  { id: "transfert", title: "Transferts hors Sénégal" },
  { id: "droits", title: "Vos droits" },
  { id: "cookies", title: "Cookies" },
  { id: "mineurs", title: "Mineurs" },
  { id: "contact", title: "Contact" },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      description="VerifScan s'engage à protéger la vie privée des utilisateurs de sa plateforme. La présente politique décrit quelles données sont collectées, pour quels usages, pendant combien de temps, et quels sont vos droits."
      updatedAt="Dernière mise à jour : 1 janvier 2026"
      sections={SECTIONS}
    >
      <LegalArticle
        id="responsable"
        index={1}
        title="Responsable du traitement"
      >
        <p>
          Le responsable du traitement des données personnelles collectées
          via la plateforme VerifScan est :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>VerifScan</strong>, société de droit sénégalais ;
          </li>
          <li>Siège social : Dakar, Sénégal ;</li>
          <li>
            Email :{" "}
            <a
              href="mailto:contact@verifscan.sn"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              contact@verifscan.sn
            </a>
          </li>
          <li>
            Téléphone :{" "}
            <a
              href="tel:+221338000000"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              +221 33 800 00 00
            </a>
          </li>
        </ul>
        <p>
          VerifScan détermine les finalités et les moyens du traitement
          des données personnelles collectées sur la plateforme.
        </p>
      </LegalArticle>

      <LegalArticle
        id="donnees-collectees"
        index={2}
        title="Données collectées"
      >
        <p>
          VerifScan collecte les catégories de données suivantes, selon
          votre statut :
        </p>
        <p>
          <strong>Pour les Fabricants partenaires :</strong>
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Identité : nom, prénom, fonction au sein de l&apos;entreprise ;
          </li>
          <li>Coordonnées : adresse email, numéro de téléphone ;</li>
          <li>
            Informations professionnelles : raison sociale, adresse,
            secteur d&apos;activité, numéro d&apos;identification
            fiscale ;
          </li>
          <li>
            Données de produit : nom des produits, descriptions,
            ingrédients, certifications, dates de production et
            d&apos;expiration ;
          </li>
          <li>
            Données de connexion : adresse IP, date et heure de
            connexion, journaux d&apos;activité.
          </li>
        </ul>
        <p>
          <strong>
            Pour les visiteurs du catalogue public et des Passeports
            numériques :
          </strong>
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Données techniques : adresse IP (anonymisée pour les
            statistiques agrégées), type de navigateur, page
            d&apos;origine, heure de consultation ;
          </li>
          <li>
            Données de scan : identifiant du QR code scanné, horodatage
            du scan, type d&apos;appareil (sans identifier
            l&apos;utilisateur).
          </li>
        </ul>
        <p>
          <strong>Pour les abonnés à la newsletter</strong> (lorsqu&apos;elle
          sera active) : adresse email uniquement.
        </p>
      </LegalArticle>

      <LegalArticle id="finalites" index={3} title="Finalités du traitement">
        <p>Les données collectées sont utilisées pour :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Créer et gérer les comptes des Fabricants partenaires ;
          </li>
          <li>
            Générer, héberger et afficher publiquement les Passeports
            numériques associés aux Lots de produits ;
          </li>
          <li>
            Permettre la consultation du catalogue public et des pages
            produits par les consommateurs ;
          </li>
          <li>
            Mesurer l&apos;audience de la plateforme et établir des
            statistiques d&apos;utilisation agrégées et anonymisées ;
          </li>
          <li>
            Détecter les fraudes, contrefaçons et tentatives
            d&apos;usurpation ;
          </li>
          <li>
            Répondre aux demandes de support et aux obligations légales ;
          </li>
          <li>
            Envoyer, le cas échéant, des communications aux
            Fabricants partenaires (notifications de service, mises à
            jour de la plateforme).
          </li>
        </ul>
      </LegalArticle>

      <LegalArticle id="base-legale" index={4} title="Base légale">
        <p>
          Le traitement des données personnelles repose sur les bases
          légales suivantes, conformément à la loi sénégalaise n° 2008-12
          du 25 janvier 2008 et aux principes directeurs inspirés du
          RGPD européen :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Consentement</strong> : pour la collecte de données
            optionnelles (newsletter, cookies non essentiels) ;
          </li>
          <li>
            <strong>Exécution d&apos;un contrat</strong> : pour la gestion
            des comptes Fabricants partenaires et la fourniture des
            services souscrits ;
          </li>
          <li>
            <strong>Intérêt légitime</strong> : pour la sécurité de la
            plateforme, la détection de fraudes et l&apos;analyse
            d&apos;audience agrégée ;
          </li>
          <li>
            <strong>Obligations légales</strong> : pour la conservation
            des journaux et la coopération avec les autorités compétentes.
          </li>
        </ul>
      </LegalArticle>

      <LegalArticle
        id="destinataires"
        index={5}
        title="Destinataires des données"
      >
        <p>
          Les données collectées sont destinées aux services internes de
          VerifScan (support client, développement, sécurité). Elles
          peuvent être accessibles à :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Nos prestataires techniques (hébergeur, services d&apos;email
            transactionnel, outils d&apos;analyse d&apos;audience),
            agissant en qualité de sous-traitants et soumis à des
            obligations de confidentialité ;
          </li>
          <li>
            Les autorités publiques, uniquement sur réquisition légale ou
            pour répondre à une obligation réglementaire.
          </li>
        </ul>
        <p>
          VerifScan ne vend, ne loue et ne cède jamais vos données
          personnelles à des tiers à des fins commerciales.
        </p>
      </LegalArticle>

      <LegalArticle id="duree" index={6} title="Durée de conservation">
        <p>
          Les données personnelles sont conservées pour les durées
          suivantes :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Données de compte Fabricant partenaire</strong> : pour
            la durée d&apos;utilisation du service, puis 3 ans après la
            dernière activité pour les données d&apos;identification ;
          </li>
          <li>
            <strong>Données de produit publiées</strong> : pour la durée de
            commercialisation du produit, puis 5 ans à titre
            d&apos;archive de traçabilité ;
          </li>
          <li>
            <strong>Données techniques (journaux, scans)</strong> : 13
            mois maximum, conformément aux recommandations applicables ;
          </li>
          <li>
            <strong>Newsletter</strong> : jusqu&apos;au désabonnement,
            déclenchable à tout moment via le lien présent dans chaque
            email.
          </li>
        </ul>
        <p>
          À l&apos;expiration de ces durées, les données sont soit
          supprimées, soit anonymisées à des fins statistiques agrégées.
        </p>
      </LegalArticle>

      <LegalArticle id="securite" index={7} title="Sécurité des données">
        <p>
          VerifScan met en œuvre les mesures techniques et
          organisationnelles appropriées pour protéger vos données
          personnelles contre la perte, l&apos;accès non autorisé, la
          divulgation ou la modification :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Chiffrement TLS 1.3 pour les données en transit ;
          </li>
          <li>Chiffrement au repos des données sensibles ;</li>
          <li>Authentification renforcée pour les comptes administrateurs ;</li>
          <li>
            Sauvegardes automatiques journalières avec réplication
            géographique ;
          </li>
          <li>
            Journalisation des accès et audits de sécurité réguliers ;
          </li>
          <li>
            Sensibilisation et formation des collaborateurs aux bonnes
            pratiques de protection des données.
          </li>
        </ul>
      </LegalArticle>

      <LegalArticle
        id="transfert"
        index={8}
        title="Transferts hors Sénégal"
      >
        <p>
          Les données personnelles collectées par VerifScan sont
          principalement hébergées sur des serveurs situés en Afrique de
          l&apos;Ouest ou en Europe, dans des pays offrant un niveau
          adéquat de protection des données.
        </p>
        <p>
          Le cas échéant, certains prestataires techniques peuvent
          traiter des données en dehors de ces zones. VerifScan veille
          alors à encadrer ces transferts par des clauses contractuelles
          types ou des mécanismes de protection reconnus.
        </p>
      </LegalArticle>

      <LegalArticle id="droits" index={9} title="Vos droits">
        <p>
          Conformément à la réglementation applicable, vous disposez des
          droits suivants sur vos données personnelles :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Droit d&apos;accès</strong> : obtenir une copie de vos
            données personnelles ;
          </li>
          <li>
            <strong>Droit de rectification</strong> : corriger des données
            inexactes ou incomplètes ;
          </li>
          <li>
            <strong>Droit à l&apos;effacement</strong> (« droit à
            l&apos;oubli ») : demander la suppression de vos données,
            sous réserve des obligations légales de conservation ;
          </li>
          <li>
            <strong>Droit à la limitation</strong> : restreindre le
            traitement de vos données dans certains cas ;
          </li>
          <li>
            <strong>Droit à la portabilité</strong> : recevoir vos données
            dans un format structuré et réutilisable ;
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong> : vous opposer au
            traitement de vos données pour des raisons légitimes ;
          </li>
          <li>
            <strong>Droit de retirer votre consentement</strong> à tout
            moment, sans affecter la licéité du traitement antérieur.
          </li>
        </ul>
        <p>
          Pour exercer ces droits, contactez VerifScan à l&apos;adresse{" "}
          <a
            href="mailto:contact@verifscan.sn"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            contact@verifscan.sn
          </a>{" "}
          en précisant l&apos;objet de votre demande et en joignant une
          preuve de votre identité.
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de
          l&apos;autorité de protection des données compétente au
          Sénégal.
        </p>
      </LegalArticle>

      <LegalArticle id="cookies" index={10} title="Cookies">
        <p>
          La plateforme VerifScan utilise des cookies et traceurs. Le
          détail de leur usage et de leur gestion est décrit dans la{" "}
          <a
            href="/cookies"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            Politique de cookies
          </a>
          .
        </p>
      </LegalArticle>

      <LegalArticle id="mineurs" index={11} title="Mineurs">
        <p>
          La plateforme VerifScan n&apos;est pas destinée aux personnes de
          moins de 16 ans. VerifScan ne collecte pas sciemment de
          données personnelles auprès de mineurs sans le consentement
          vérifiable des titulaires de l&apos;autorité parentale.
        </p>
        <p>
          Si vous estimez qu&apos;un mineur a fourni des données à
          VerifScan sans autorisation, merci de nous le signaler à{" "}
          <a
            href="mailto:contact@verifscan.sn"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            contact@verifscan.sn
          </a>{" "}
          afin que nous puissions procéder à leur suppression.
        </p>
      </LegalArticle>

      <LegalArticle id="contact" index={12} title="Contact">
        <p>
          Pour toute question relative à la présente Politique de
          confidentialité ou au traitement de vos données personnelles,
          vous pouvez contacter VerifScan :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Par email :{" "}
            <a
              href="mailto:contact@verifscan.sn"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              contact@verifscan.sn
            </a>
          </li>
          <li>
            Par téléphone :{" "}
            <a
              href="tel:+221338000000"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              +221 33 800 00 00
            </a>
          </li>
          <li>Par courrier : Dakar, Sénégal</li>
        </ul>
      </LegalArticle>
    </LegalLayout>
  );
}
