import type { Metadata } from "next";
import { LegalLayout, LegalArticle } from "@/components/public/LegalLayout";

export const metadata: Metadata = {
  title: "Mentions légales — VerifScan",
  description:
    "Mentions légales de la plateforme VerifScan : éditeur, directeur de publication, hébergeur, données collectées et cookies.",
  openGraph: {
    title: "Mentions légales — VerifScan",
    description: "Mentions légales de la plateforme VerifScan.",
    type: "website",
  },
};

const SECTIONS = [
  { id: "editeur", title: "Éditeur de la plateforme" },
  { id: "directeur", title: "Directeur de publication" },
  { id: "hebergeur", title: "Hébergeur" },
  { id: "propriete", title: "Propriété intellectuelle" },
  { id: "donnees", title: "Données collectées" },
  { id: "cookies", title: "Cookies" },
  { id: "liens", title: "Liens hypertextes" },
  { id: "contact", title: "Contact" },
];

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      title="Mentions légales"
      description="Conformément aux dispositions légales en vigueur, notamment la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la confiance dans l'économie numérique, les présentes mentions légales informent les utilisateurs de la plateforme VerifScan sur son éditeur, son hébergeur et les conditions d'utilisation."
      updatedAt="Dernière mise à jour : 1 janvier 2026"
      sections={SECTIONS}
    >
      <LegalArticle id="editeur" index={1} title="Éditeur de la plateforme">
        <p>
          La plateforme VerifScan, accessible à l&apos;adresse{" "}
          <a
            href="https://verifscan.sn"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            https://verifscan.sn
          </a>
          , est éditée par :
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
          VerifScan est une plateforme de traçabilité alimentaire par QR
          code, dédiée à l&apos;agro-industrie ouest-africaine, offrant aux
          fabricants un passeport numérique pour leurs produits.
        </p>
      </LegalArticle>

      <LegalArticle
        id="directeur"
        index={2}
        title="Directeur de publication"
      >
        <p>
          Le directeur de la publication de la plateforme VerifScan est le
          représentant légal de la société VerifScan.
        </p>
        <p>
          Pour toute demande relative au contenu publié sur la plateforme,
          vous pouvez contacter le directeur de publication à
          l&apos;adresse{" "}
          <a
            href="mailto:contact@verifscan.sn"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            contact@verifscan.sn
          </a>
          .
        </p>
      </LegalArticle>

      <LegalArticle id="hebergeur" index={3} title="Hébergeur">
        <p>
          La plateforme VerifScan est hébergée par un prestataire
          d&apos;hébergement professionnel garantissant la disponibilité et
          la sécurité des données. Les informations relatives à
          l&apos;hébergeur sont les suivantes :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Hébergeur</strong> : prestataire d&apos;hébergement
            cloud conforme aux standards en vigueur ;
          </li>
          <li>
            <strong>Localisation des serveurs</strong> : datacenters
            sécurisés, avec réplication géographique ;
          </li>
          <li>
            <strong>Disponibilité</strong> : objectif de service de 99,9 %
            sur l&apos;année civile ;
          </li>
          <li>
            <strong>Sécurité</strong> : chiffrement TLS en transit, chiffrement
            au repos, sauvegardes automatiques journalières.
          </li>
        </ul>
        <p>
          Pour toute demande technique relative à l&apos;hébergement,
          veuillez contacter VerifScan à l&apos;adresse{" "}
          <a
            href="mailto:contact@verifscan.sn"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            contact@verifscan.sn
          </a>
          .
        </p>
      </LegalArticle>

      <LegalArticle
        id="propriete"
        index={4}
        title="Propriété intellectuelle"
      >
        <p>
          L&apos;ensemble des éléments présents sur la plateforme VerifScan
          (textes, logos, graphismes, vidéos, sons, architecture logicielle,
          code source, etc.) est, sauf mention contraire, la propriété
          exclusive de VerifScan ou de ses partenaires.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication,
          transmission, dénaturation, totale ou partielle de la plateforme
          ou de son contenu, par quelque procédé que ce soit, et sur
          quelque support que ce soit, est strictement interdite sans
          l&apos;autorisation écrite préalable de VerifScan.
        </p>
        <p>
          Les informations publiées par les Fabricants partenaires dans
          leurs Passeports numériques demeurent leur propriété. VerifScan
          dispose d&apos;une licence d&apos;hébergement et
          d&apos;affichage public de ces informations, telle que définie
          dans les Conditions Générales d&apos;Utilisation.
        </p>
      </LegalArticle>

      <LegalArticle id="donnees" index={5} title="Données collectées">
        <p>
          La plateforme VerifScan collecte des données personnelles dans
          le cadre de son fonctionnement. Le détail des traitements est
          décrit dans la{" "}
          <a
            href="/politique-confidentialite"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            Politique de confidentialité
          </a>
          .
        </p>
        <p>
          Les données collectées comprennent notamment : nom et prénom,
          adresse email, numéro de téléphone, informations relatives au
          fabricant (raison sociale, adresse, secteur), et données
          techniques de navigation (adresse IP, type de navigateur, pages
          consultées).
        </p>
        <p>
          Conformément à la loi sénégalaise n° 2008-12 et aux principes
          directeurs en matière de protection des données personnelles,
          l&apos;Utilisateur dispose d&apos;un droit d&apos;accès, de
          rectification, d&apos;effacement et d&apos;opposition au
          traitement de ses données.
        </p>
      </LegalArticle>

      <LegalArticle id="cookies" index={6} title="Cookies">
        <p>
          La plateforme VerifScan utilise des cookies et traceurs pour
          assurer son bon fonctionnement, mesurer son audience et
          améliorer l&apos;expérience utilisateur. Le détail est décrit
          dans la{" "}
          <a
            href="/cookies"
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            Politique de cookies
          </a>
          .
        </p>
        <p>
          L&apos;Utilisateur peut à tout moment configurer son navigateur
          pour refuser les cookies, sachant que cela peut affecter
          certaines fonctionnalités de la plateforme.
        </p>
      </LegalArticle>

      <LegalArticle id="liens" index={7} title="Liens hypertextes">
        <p>
          La plateforme VerifScan peut contenir des liens hypertextes vers
          d&apos;autres sites internet ou ressources externes. VerifScan
          ne dispose d&apos;aucun moyen pour contrôler ces sites et ne
          saurait être tenu responsable de leur contenu, de leur
          disponibilité ni des éventuels préjudices résultant de leur
          consultation.
        </p>
        <p>
          La création de liens hypertextes vers la plateforme VerifScan
          depuis un site tiers est autorisée sous réserve de ne pas porter
          atteinte aux intérêts de VerifScan et d&apos;informer
          préalablement VerifScan.
        </p>
      </LegalArticle>

      <LegalArticle id="contact" index={8} title="Contact">
        <p>
          Pour toute question relative aux présentes mentions légales,
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
