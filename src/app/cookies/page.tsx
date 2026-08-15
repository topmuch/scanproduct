import type { Metadata } from "next";
import { LegalLayout, LegalArticle } from "@/components/public/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de cookies — VerifScan",
  description:
    "Politique de cookies de VerifScan : types de cookies utilisés, finalité, durée de conservation et modalités de gestion de vos préférences.",
  openGraph: {
    title: "Politique de cookies — VerifScan",
    description: "Comment VerifScan utilise les cookies et traceurs.",
    type: "website",
  },
};

const SECTIONS = [
  { id: "introduction", title: "Introduction" },
  { id: "qu-est-ce", title: "Qu'est-ce qu'un cookie ?" },
  { id: "types", title: "Types de cookies utilisés" },
  { id: "cookies-essentiels", title: "Cookies essentiels" },
  { id: "cookies-performance", title: "Cookies de performance" },
  { id: "cookies-tiers", title: "Cookies tiers" },
  { id: "duree", title: "Durée de conservation" },
  { id: "gestion", title: "Gérer vos préférences" },
  { id: "navigateurs", title: "Paramètres par navigateur" },
  { id: "contact", title: "Contact" },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Politique de cookies"
      description="La présente politique décrit la manière dont VerifScan utilise les cookies et traceurs sur sa plateforme, leur finalité, leur durée de vie, et les moyens dont vous disposez pour les gérer."
      updatedAt="Dernière mise à jour : 1 janvier 2026"
      sections={SECTIONS}
    >
      <LegalArticle id="introduction" index={1} title="Introduction">
        <p>
          VerifScan utilise des cookies et technologies similaires pour
          assurer le bon fonctionnement de sa plateforme, mesurer son
          audience et améliorer l&apos;expérience utilisateur. La présente
          politique complète la{" "}
          <a
            href="/politique-confidentialite"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            Politique de confidentialité
          </a>{" "}
          de VerifScan.
        </p>
        <p>
          En utilisant la plateforme VerifScan, vous consentez à
          l&apos;utilisation de cookies conformément à la présente
          politique, à l&apos;exception des cookies pour lesquels un
          consentement explicite est requis.
        </p>
      </LegalArticle>

      <LegalArticle id="qu-est-ce" index={2} title="Qu'est-ce qu'un cookie ?">
        <p>
          Un cookie est un petit fichier texte déposé sur votre appareil
          (ordinateur, tablette, smartphone) lorsque vous visitez un site
          internet. Il permet au site de mémoriser des informations sur
          votre visite, telles que votre langue préférée, vos préférences
          d&apos;affichage ou des données de fréquentation.
        </p>
        <p>
          Les cookies ne contiennent pas de virus et ne permettent pas,
          à eux seuls, de vous identifier personnellement. Ils servent
          principalement à améliorer votre expérience et à mesurer
          l&apos;audience d&apos;un site.
        </p>
      </LegalArticle>

      <LegalArticle id="types" index={3} title="Types de cookies utilisés">
        <p>VerifScan utilise trois grandes catégories de cookies :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Cookies essentiels</strong> : strictement nécessaires
            au fonctionnement de la plateforme. Ils ne peuvent pas être
            désactivés.
          </li>
          <li>
            <strong>Cookies de performance et statistiques</strong> :
            permettent de mesurer l&apos;audience de la plateforme de
            manière agrégée et anonyme.
          </li>
          <li>
            <strong>Cookies tiers</strong> : déposés par des services
            externes (réseaux sociaux, outils d&apos;analyse) sous leur
            propre responsabilité.
          </li>
        </ul>
      </LegalArticle>

      <LegalArticle
        id="cookies-essentiels"
        index={4}
        title="Cookies essentiels"
      >
        <p>
          Ces cookies sont indispensables au fonctionnement technique de
          la plateforme VerifScan. Sans eux, vous ne pourriez pas vous
          connecter à votre espace fabricant, naviguer de manière
          sécurisée, ni accéder aux services qui nécessitent une
          authentification.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>verifscan_session</strong> : identifiant de session,
            supprimé à la fermeture du navigateur ;
          </li>
          <li>
            <strong>verifscan_csrf</strong> : jeton de protection contre
            les attaques CSRF, supprimé à la fermeture du navigateur ;
          </li>
          <li>
            <strong>verifscan_consent</strong> : mémorise vos choix en
            matière de cookies, valable 6 mois.
          </li>
        </ul>
      </LegalArticle>

      <LegalArticle
        id="cookies-performance"
        index={5}
        title="Cookies de performance"
      >
        <p>
          Ces cookies permettent à VerifScan de mesurer l&apos;audience
          de la plateforme (pages consultées, durée de visite, parcours
          utilisateur) de manière agrégée et anonymisée. Les données
          collectées ne permettent pas de vous identifier personnellement.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>verifscan_stats</strong> : identifiant aléatoire
            anonyme, valable 13 mois ;
          </li>
          <li>
            <strong>verifscan_referrer</strong> : page d&apos;origine de
            votre visite, supprimé à la fermeture du navigateur.
          </li>
        </ul>
        <p>
          Ces cookies ne sont déposés qu&apos;après votre consentement,
          recueilli via le bandeau de gestion des cookies.
        </p>
      </LegalArticle>

      <LegalArticle id="cookies-tiers" index={6} title="Cookies tiers">
        <p>
          La plateforme VerifScan peut intégrer des services externes qui
          déposent leurs propres cookies :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Cartes interactives</strong> : si la plateforme
            intègre des cartes géographiques pour localiser des
            fabricants, le prestataire peut déposer des cookies de
            session ;
          </li>
          <li>
            <strong>Vidéos et contenus embarqués</strong> : les services
            de partage de vidéos (YouTube, Vimeo) déposent des cookies
            lorsque vous lisez un contenu intégré ;
          </li>
          <li>
            <strong>Boutons de partage social</strong> : les boutons de
            partage Facebook, Twitter, LinkedIn et Instagram peuvent
            déposer des cookies, même sans interaction de votre part.
          </li>
        </ul>
        <p>
          VerifScan vous invite à consulter les politiques de
          confidentialité de ces services tiers pour plus
          d&apos;informations sur leurs pratiques.
        </p>
      </LegalArticle>

      <LegalArticle id="duree" index={7} title="Durée de conservation">
        <p>
          La durée de vie des cookies déposés par VerifScan est limitée au
          strict nécessaire :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Cookies de session</strong> : supprimés à la fermeture
            du navigateur ;
          </li>
          <li>
            <strong>Cookies de préférences</strong> : 6 mois maximum ;
          </li>
          <li>
            <strong>Cookies de statistiques</strong> : 13 mois maximum,
            conformément aux recommandations applicables.
          </li>
        </ul>
        <p>
          À l&apos;expiration de ces délais, votre consentement doit être
          à nouveau recueilli pour le dépôt de nouveaux cookies.
        </p>
      </LegalArticle>

      <LegalArticle
        id="gestion"
        index={8}
        title="Gérer vos préférences"
      >
        <p>
          Lors de votre première visite sur la plateforme VerifScan, un
          bandeau vous informe de l&apos;utilisation de cookies et vous
          permet de :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Accepter</strong> l&apos;ensemble des cookies,
            y compris ceux de performance et tiers ;
          </li>
          <li>
            <strong>Refuser</strong> les cookies non essentiels, en ne
            conservant que les cookies strictement nécessaires ;
          </li>
          <li>
            <strong>Personnaliser</strong> vos choix en activant ou
            désactivant chaque catégorie individuellement.
          </li>
        </ul>
        <p>
          Vous pouvez à tout moment modifier vos préférences en cliquant
          sur le lien « Gérer mes cookies » disponible en bas de chaque
          page, ou via les paramètres de votre navigateur.
        </p>
      </LegalArticle>

      <LegalArticle
        id="navigateurs"
        index={9}
        title="Paramètres par navigateur"
      >
        <p>
          Vous pouvez également configurer votre navigateur pour bloquer
          les cookies ou vous avertir de leur dépôt. Voici les liens vers
          les aides officielles des principaux navigateurs :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              Google Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox-ordinateur"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>
        <p>
          Notez que le blocage de certains cookies peut affecter le
          fonctionnement de la plateforme, notamment l&apos;accès à
          l&apos;espace fabricant.
        </p>
      </LegalArticle>

      <LegalArticle id="contact" index={10} title="Contact">
        <p>
          Pour toute question relative à la présente Politique de
          cookies, vous pouvez contacter VerifScan :
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
