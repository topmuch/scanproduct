import type { Metadata } from "next";
import { LegalLayout, LegalArticle } from "@/components/public/LegalLayout";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — VerifScan",
  description:
    "Conditions Générales d'Utilisation (CGU) de la plateforme VerifScan : définition des services, obligations des utilisateurs, propriété intellectuelle, responsabilité et droit applicable.",
  openGraph: {
    title: "CGU — VerifScan",
    description:
      "Conditions Générales d'Utilisation de la plateforme VerifScan.",
    type: "website",
  },
};

const SECTIONS = [
  { id: "objet", title: "Objet" },
  { id: "definitions", title: "Définitions" },
  { id: "services", title: "Description des services" },
  { id: "acceptation", title: "Acceptation des CGU" },
  { id: "obligations-utilisateur", title: "Obligations de l'utilisateur" },
  { id: "compte", title: "Compte et sécurité" },
  { id: "propriete-intellectuelle", title: "Propriété intellectuelle" },
  { id: "donnees", title: "Données et confidentialité" },
  { id: "responsabilite", title: "Responsabilité" },
  { id: "suspension", title: "Suspension et résiliation" },
  { id: "tarifs", title: "Tarifs et facturation" },
  { id: "evolution", title: "Évolution des CGU" },
  { id: "droit-applicable", title: "Droit applicable et litiges" },
  { id: "contact", title: "Contact" },
];

export default function CGUPage() {
  return (
    <LegalLayout
      title="Conditions Générales d'Utilisation"
      description="Les présentes Conditions Générales d'Utilisation (CGU) encadrent l'utilisation de la plateforme VerifScan par ses utilisateurs, fabricants partenaires et visiteurs du catalogue public."
      updatedAt="Dernière mise à jour : 1 janvier 2026"
      sections={SECTIONS}
    >
      <LegalArticle id="objet" index={1} title="Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (ci-après les
          « <strong>CGU</strong> ») ont pour objet de définir les modalités
          et conditions d&apos;utilisation de la plateforme VerifScan
          (ci-après la « <strong>Plateforme</strong> »), éditée par
          VerifScan, ainsi que les droits et obligations des parties dans
          ce cadre.
        </p>
        <p>
          La Plateforme a pour finalité de fournir aux fabricants de
          produits agro-alimentaires un passeport numérique sous forme de
          QR code, permettant la traçabilité, l&apos;authentification et la
          transparence des produits destinés aux consommateurs.
        </p>
      </LegalArticle>

      <LegalArticle id="definitions" index={2} title="Définitions">
        <p>
          Dans les présentes CGU, les termes suivants, lorsqu&apos;ils
          commencent par une majuscule, ont la signification indiquée
          ci-dessous :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Plateforme</strong> : désigne le service VerifScan,
            accessible à l&apos;adresse verifscan.sn, incluant l&apos;espace
            fabricant, le catalogue public et les pages produits
            associées.
          </li>
          <li>
            <strong>Utilisateur</strong> : toute personne physique ou morale
            qui accède à la Plateforme, qu&apos;elle soit inscrite ou non.
          </li>
          <li>
            <strong>Fabricant partenaire</strong> : un Utilisateur inscrit
            qui utilise les services VerifScan pour générer des passeports
            numériques pour ses produits.
          </li>
          <li>
            <strong>Passeport numérique</strong> : la page produit publique
            générée par VerifScan pour un lot donné, accessible via un QR
            code unique.
          </li>
          <li>
            <strong>Lot</strong> : une unité de production identifiée par
            un fabricant (par exemple : une production de jus de bissap
            datée du 12 mai 2026).
          </li>
          <li>
            <strong>QR code</strong> : un code à deux dimensions unique,
            généré par VerifScan, qui renvoie vers le Passeport numérique
            d&apos;un Lot.
          </li>
        </ul>
      </LegalArticle>

      <LegalArticle id="services" index={3} title="Description des services">
        <p>VerifScan fournit les services suivants :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Création d&apos;un compte Fabricant partenaire avec espace de
            gestion sécurisé ;
          </li>
          <li>
            Génération de QR codes uniques par lot de produits, liés à un
            Passeport numérique ;
          </li>
          <li>
            Hébergement public du Passeport numérique, accessible à tout
            consommateur via le scan du QR code ;
          </li>
          <li>
            Catalogue public des produits vérifiés, consultable sans
            inscription ;
          </li>
          <li>
            Suivi des scans et statistiques d&apos;utilisation pour le
            Fabricant partenaire ;
          </li>
          <li>
            Gestion des certifications, événements de chaîne et historique
            de traçabilité associés à chaque Lot.
          </li>
        </ul>
        <p>
          VerifScan se réserve le droit de faire évoluer la nature et
          l&apos;étendue des services proposés, sous réserve d&apos;en
          informer les Utilisateurs.
        </p>
      </LegalArticle>

      <LegalArticle id="acceptation" index={4} title="Acceptation des CGU">
        <p>
          L&apos;utilisation de la Plateforme implique l&apos;acceptation
          pleine et entière des présentes CGU. Cette acceptation est
          matérialisée, pour les Fabricants partenaires, par une case à
          cocher lors de l&apos;inscription, et pour les autres
          Utilisateurs, par la simple consultation de la Plateforme.
        </p>
        <p>
          Si vous n&apos;acceptez pas tout ou partie des présentes CGU,
          vous êtes invité à ne pas utiliser la Plateforme.
        </p>
      </LegalArticle>

      <LegalArticle
        id="obligations-utilisateur"
        index={5}
        title="Obligations de l'utilisateur"
      >
        <p>L&apos;Utilisateur s&apos;engage à :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            Fournir des informations exactes, complètes et à jour,
            notamment lors de la création de son compte et de la
            déclaration d&apos;un Lot ;
          </li>
          <li>
            Utiliser la Plateforme conformément à sa finalité et aux
            lois et règlements en vigueur, notamment en matière de
            protection des consommateurs, d&apos;hygiène alimentaire et
            de propriété intellectuelle ;
          </li>
          <li>
            Ne pas tenter de perturber le fonctionnement de la
            Plateforme, d&apos;en accéder au code source ou aux données
            internes, ni d&apos;utiliser des moyens automatisés pour
            extraire massivement le contenu ;
          </li>
          <li>
            Ne pas usurper l&apos;identité d&apos;un tiers fabricant ni
            déclarer des Lots pour des produits qu&apos;il ne produit pas ;
          </li>
          <li>
            Ne pas reproduire, diffuser ou exploiter commercialement les
            Passeports numériques d&apos;autres Fabricants partenaires
            sans leur autorisation.
          </li>
        </ul>
      </LegalArticle>

      <LegalArticle id="compte" index={6} title="Compte et sécurité">
        <p>
          Le Fabricant partenaire est responsable de la conservation de
          ses identifiants de connexion et de toute activité effectuée
          depuis son compte. Il s&apos;engage à notifier immédiatement
          VerifScan de toute utilisation non autorisée de son compte.
        </p>
        <p>
          VerifScan se réserve le droit de refuser une demande
          d&apos;inscription, de suspendre ou de clôturer un compte en
          cas de manquement aux présentes CGU.
        </p>
      </LegalArticle>

      <LegalArticle
        id="propriete-intellectuelle"
        index={7}
        title="Propriété intellectuelle"
      >
        <p>
          La Plateforme, son code source, son design, ses textes, ses
          logos et ses marques sont la propriété exclusive de VerifScan
          ou de ses partenaires. Toute reproduction, représentation,
          modification ou diffusion, totale ou partielle, sans
          autorisation écrite préalable, est interdite.
        </p>
        <p>
          Les informations publiées par les Fabricants partenaires dans
          leurs Passeports numériques (nom du produit, description,
          ingrédients, certifications, etc.) restent la propriété de ces
          derniers. En les publiant sur la Plateforme, le Fabricant
          partenaire accorde à VerifScan une licence non exclusive,
          mondiale et gratuite d&apos;hébergement et d&apos;affichage
          public de ces informations, pour la durée d&apos;utilisation du
          service.
        </p>
        <p>
          VerifScan est libre d&apos;anonymiser et d&apos;agréger les
          données de scans pour produire des statistiques sectorielles
          qui ne permettraient pas l&apos;identification d&apos;un
          Fabricant partenaire individuel.
        </p>
      </LegalArticle>

      <LegalArticle id="donnees" index={8} title="Données et confidentialité">
        <p>
          VerifScan traite les données personnelles des Utilisateurs
          conformément à sa Politique de confidentialité, accessible
          depuis le pied de page de la Plateforme. Les données collectées
          sont limitées à ce qui est strictement nécessaire au
          fonctionnement du service.
        </p>
        <p>
          Le Fabricant partenaire reste seul responsable de la licéité
          des données qu&apos;il publie sur la Plateforme, notamment des
          éventuelles données personnelles de ses propres employés ou
          partenaires incluses dans un Passeport numérique.
        </p>
      </LegalArticle>

      <LegalArticle id="responsabilite" index={9} title="Responsabilité">
        <p>
          VerifScan met tout en œuvre pour assurer la disponibilité et la
          sécurité de la Plateforme, mais ne peut garantir une
          disponibilité absolue. La Plateforme peut être indisponible
          notamment pour des raisons de maintenance, de mise à jour ou
          d&apos;aléa technique.
        </p>
        <p>
          VerifScan ne saurait être tenu responsable des dommages directs
          ou indirects résultant de l&apos;utilisation de la Plateforme,
          notamment en cas de perte de données, d&apos;interruption de
          service, ou de fraude imputable à un Fabricant partenaire ou à
          un tiers.
        </p>
        <p>
          VerifScan ne contrôle pas le contenu des informations publiées
          par les Fabricants partenaires dans leurs Passeports
          numériques. La responsabilité de VerifScan ne saurait être
          engagée du fait de l&apos;inexactitude de ces informations. Le
          Fabricant partenaire reste seul responsable de la véracité et
          de la licéité des informations qu&apos;il publie.
        </p>
      </LegalArticle>

      <LegalArticle
        id="suspension"
        index={10}
        title="Suspension et résiliation"
      >
        <p>
          En cas de manquement aux présentes CGU, VerifScan se réserve le
          droit de suspendre ou de résilier, sans préavis ni
          indemnisation, l&apos;accès à la Plateforme pour
          l&apos;Utilisateur concerné, et le cas échéant de supprimer les
          Passeports numériques associés.
        </p>
        <p>
          Le Fabricant partenaire peut à tout moment demander la
          clôture de son compte auprès de VerifScan. Les Passeports
          numériques associés peuvent alors être désactivés, sous réserve
          des obligations légales de conservation.
        </p>
      </LegalArticle>

      <LegalArticle id="tarifs" index={11} title="Tarifs et facturation">
        <p>
          Les tarifs applicables aux services VerifScan sont disponibles
          sur la page Tarifs de la Plateforme et peuvent évoluer. Les
          Fabricants partenaires sont informés au moins 30 jours avant
          toute modification tarifaire.
        </p>
        <p>
          Le catalogue public et la consultation des Passeports
          numériques par les consommateurs restent gratuits.
        </p>
      </LegalArticle>

      <LegalArticle
        id="evolution"
        index={12}
        title="Évolution des CGU"
      >
        <p>
          VerifScan se réserve le droit de modifier les présentes CGU à
          tout moment. Les modifications entrent en vigueur à leur
          publication sur la Plateforme. Il appartient à
          l&apos;Utilisateur de consulter régulièrement la présente
          page.
        </p>
        <p>
          Les Fabricants partenaires seront informés par email des
          modifications substantielles, et devront accepter la nouvelle
          version pour continuer à utiliser le service.
        </p>
      </LegalArticle>

      <LegalArticle
        id="droit-applicable"
        index={13}
        title="Droit applicable et litiges"
      >
        <p>
          Les présentes CGU sont régies par le droit sénégalais. En cas
          de litige relatif à leur interprétation ou à leur exécution,
          les parties s&apos;efforceront de résoudre le différend à
          l&apos;amiable.
        </p>
        <p>
          À défaut d&apos;accord amiable dans un délai de 30 jours, le
          litige sera soumis à la compétence exclusive des tribunaux de
          Dakar (Sénégal).
        </p>
      </LegalArticle>

      <LegalArticle id="contact" index={14} title="Contact">
        <p>
          Pour toute question relative aux présentes CGU, vous pouvez
          contacter VerifScan :
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
