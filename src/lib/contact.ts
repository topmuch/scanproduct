/**
 * Coordonnées officielles Prodtrust (source unique — à répercuter partout).
 *
 * NB : module SANS "use client" pour rester importable depuis les server
 * components (les constantes exportées d'un module "use client" deviennent
 * des client references inutilisable côté serveur).
 */
export const VERIFSCAN_EMAIL = "contact@newvisioncargo.pro";
export const VERIFSCAN_PHONE_DISPLAY = "+235 66 35 25 05 · +235 95 72 99 99";
export const VERIFSCAN_PHONE_TEL = "tel:+23566352505";
export const VERIFSCAN_ADDRESS = "Avenue Charles de Gaulle, N'Djaména, Tchad";
export const VERIFSCAN_MAPS_QUERY = "Avenue+Charles+de+Gaulle,+N'Djaména,+Tchad";
export const VERIFSCAN_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${VERIFSCAN_MAPS_QUERY}`;
export const VERIFSCAN_MAP_EMBED = `https://maps.google.com/maps?q=${VERIFSCAN_MAPS_QUERY}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
