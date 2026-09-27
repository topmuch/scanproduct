/**
 * Coordonnées officielles VerifScan (source unique — à répercuter partout).
 *
 * NB : module SANS "use client" pour rester importable depuis les server
 * components (les constantes exportées d'un module "use client" deviennent
 * des client references inutilisable côté serveur).
 *
 * Itinéraire Google Maps : on géocode le quartier « Ouest Foire, Dakar »
 * (le « Lot n°13 » exact n'est pas un lieu Google Maps).
 */
export const VERIFSCAN_EMAIL = "contact@verifscan.com";
export const VERIFSCAN_PHONE_DISPLAY = "+221 78 485 88 22";
export const VERIFSCAN_PHONE_TEL = "tel:+221784858822";
export const VERIFSCAN_ADDRESS = "Lot n°13, Ouest Foire, Dakar, Sénégal";
export const VERIFSCAN_MAPS_QUERY = "Ouest+Foire,+Dakar,+S%C3%A9n%C3%A9gal";
export const VERIFSCAN_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${VERIFSCAN_MAPS_QUERY}`;
export const VERIFSCAN_MAP_EMBED = `https://maps.google.com/maps?q=${VERIFSCAN_MAPS_QUERY}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
