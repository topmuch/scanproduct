/**
 * Test unitaire du normalisateur WhatsApp (lib/whatsapp.ts).
 * Exécution : bun scripts/test-whatsapp.ts (depuis la racine du repo).
 */
import {
  toWhatsAppDigits,
  displayIntlPhone,
  isLikelyLocalMobile,
  buildWhatsAppLink,
} from "../src/lib/whatsapp";

type Case = { input: string; expected: string };
const cases: Case[] = [
  { input: "+221 78 135 13 94", expected: "221781351394" },
  { input: "78 135 13 94", expected: "221781351394" },
  { input: "781351394", expected: "221781351394" },
  { input: "0781351394", expected: "221781351394" },
  { input: "00221781351394", expected: "221781351394" },
  { input: "221 0781351394", expected: "221781351394" }, // zéro parasite après CC
  { input: "+2210781351394", expected: "221781351394" }, // zéro parasite après CC
  { input: "+33 6 12 34 56 78", expected: "33612345678" }, // autre indicatif
  { input: "77 123 45 67", expected: "221771234567" },
  { input: "(+221) 77.123-45-67", expected: "221771234567" },
];

let failed = 0;
for (const c of cases) {
  const got = toWhatsAppDigits(c.input);
  const ok = got === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} "${c.input}" → ${got}${ok ? "" : ` (attendu ${c.expected})`}`);
}

// Affichage
const disp = displayIntlPhone("221781351394");
console.log(`${disp === "+221 78 135 13 94" ? "✅" : "❌"} display: ${disp}`);

// Vraisemblance
console.log(`${isLikelyLocalMobile("221781351394") ? "✅" : "❌"} mobile plausible 78…`);
console.log(`${!isLikelyLocalMobile("221338256789") ? "✅" : "❌"} fixe 33… signalé`);
console.log(`${!isLikelyLocalMobile("221881351394") ? "✅" : "❌"} préfixe 88 signalé`);

// Lien complet
const link = buildWhatsAppLink("78 135 13 94", "Bonjour !");
console.log(
  `${link === "https://wa.me/221781351394?text=Bonjour%20!" ? "✅" : "❌"} lien: ${link}`
);

// Vide
console.log(`${toWhatsAppDigits("") === "" ? "✅" : "❌"} vide → ""`);

if (failed > 0) {
  console.log(`\n${failed} test(s) ÉCHOUÉ(S)`);
  process.exit(1);
}
console.log("\nTous les tests WhatsApp passent ✔");
