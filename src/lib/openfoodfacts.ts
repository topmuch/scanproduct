// ============================================================================
// Open Food Facts integration service
// ============================================================================
// Wraps the Open Food Facts public API (https://world.openfoodfacts.org)
// so fabricants can auto-fill product data by scanning / typing a barcode.
//
// All functions are safe to call from a Next.js route handler (server-side).
// They never touch the DB directly — the caller is responsible for persisting
// the extracted data (see /api/products/lookup + the products POST/PATCH
// routes which now accept `barcode` + `offData`).
//
// The OFF API is rate-limit-friendly when we identify ourselves via the
// User-Agent header. No API key required.
// ============================================================================

const OFF_BASE = "https://world.openfoodfacts.org";
// NOTE: HTTP headers must be ASCII (ByteString). Avoid em dashes / accents
// here or Node's fetch will throw "Cannot convert argument to a ByteString".
const OFF_USER_AGENT =
  "VerifScan/1.0 (https://verifscan.sn - product traceability platform)";

// ---------------------------------------------------------------------------
// Types — mirror the OFF JSON payload (only the fields we care about)
// ---------------------------------------------------------------------------

export type OffNutriments = {
  "energy-kcal_100g"?: number;
  "energy-kj_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  saturatedFat_100g?: number;
  sugars_100g?: number;
  salt_100g?: number;
  fiber_100g?: number;
  sodium_100g?: number;
};

export type OffProduct = {
  code: string;
  status: number; // 1 = found, 0 = not found
  status_verbose?: string;
  product?: {
    product_name?: string;
    product_name_fr?: string;
    generic_name?: string;
    brands?: string;
    brands_tags?: string[];
    quantity?: string;
    image_url?: string;
    image_small_url?: string;
    image_front_url?: string;
    categories?: string;
    categories_tags?: string[];
    labels?: string;
    labels_tags?: string[];
    countries?: string;
    countries_tags?: string[];
    ingredients_text?: string;
    ingredients_text_fr?: string;
    allergens?: string;
    allergens_tags?: string[];
    nutriscore_grade?: string; // "a" | "b" | "c" | "d" | "e"
    nutriments?: OffNutriments;
    additives_tags?: string[];
    ecoscore_grade?: string;
    nova_group?: number;
    packaging?: string;
    serving_size?: string;
    serving_quantity?: number;
  };
};

export type OffSearchResult = {
  count: number;
  page: number;
  skip: number;
  products: Array<{
    code: string;
    product_name?: string;
    brands?: string;
    image_small_url?: string;
    quantity?: string;
    nutriscore_grade?: string;
  }>;
};

// ---------------------------------------------------------------------------
// Extracted, normalized shape handed back to the frontend for auto-fill
// ---------------------------------------------------------------------------

export type ExtractedOffData = {
  barcode: string;
  name: string;
  brand: string;
  image: string | null;
  weight: string | null;
  categories: string[];
  ingredients: string | null;
  allergens: string[];
  nutriscore: string | null;
  nutriments: {
    calories: number;
    proteins: number;
    carbs: number;
    fat: number;
    sugars: number;
    salt: number;
    fiber: number;
  } | null;
  labels: string[];
  countries: string[];
  additives: string[];
  ecoscore: string | null;
  nova: number | null;
  packaging: string | null;
  servingSize: string | null;
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Look up a single product by its EAN-13 / UPC barcode on Open Food Facts.
 * Returns `null` if the barcode is unknown or the request fails.
 *
 * The barcode is sanitized (spaces + dashes stripped) before the request.
 */
export async function getProductByBarcode(
  barcode: string,
): Promise<OffProduct | null> {
  try {
    const cleanBarcode = barcode.replace(/[\s-]/g, "");
    if (!cleanBarcode) return null;

    const response = await fetch(
      `${OFF_BASE}/api/v0/product/${encodeURIComponent(cleanBarcode)}.json`,
      {
        method: "GET",
        headers: { "User-Agent": OFF_USER_AGENT },
        // OFF can be slow (especially from outside Europe) — cap at 15s so
        // the UI stays responsive but we don't abort a legit slow response.
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as OffProduct;
    if (data.status !== 1 || !data.product) return null;

    return data;
  } catch (error) {
    console.error("[openfoodfacts] getProductByBarcode error:", error);
    return null;
  }
}

/**
 * Full-text search across the OFF database. Useful for letting the fabricant
 * pick a product by name when they don't have a barcode handy.
 */
export async function searchProducts(
  query: string,
  page = 1,
): Promise<OffSearchResult> {
  try {
    const url = new URL(`${OFF_BASE}/cgi/search.pl`);
    url.searchParams.set("search_terms", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", "20");
    url.searchParams.set("json", "1");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": OFF_USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { count: 0, page, skip: 0, products: [] };
    }

    const data = (await response.json()) as OffSearchResult;
    return data;
  } catch (error) {
    console.error("[openfoodfacts] searchProducts error:", error);
    return { count: 0, page, skip: 0, products: [] };
  }
}

// ---------------------------------------------------------------------------
// Extraction — turns the raw OFF payload into a clean object the frontend
// can drop straight into its form state.
// ---------------------------------------------------------------------------

export function extractProductData(offProduct: OffProduct): ExtractedOffData {
  const { product } = offProduct;
  if (!product) {
    return {
      barcode: offProduct.code,
      name: "",
      brand: "",
      image: null,
      weight: null,
      categories: [],
      ingredients: null,
      allergens: [],
      nutriscore: null,
      nutriments: null,
      labels: [],
      countries: [],
      additives: [],
      ecoscore: null,
      nova: null,
      packaging: null,
      servingSize: null,
    };
  }

  const n = product.nutriments;

  return {
    barcode: offProduct.code,
    // Prefer the French product name when available (OFF is heavy on FR data)
    name:
      product.product_name_fr ||
      product.product_name ||
      product.generic_name ||
      "",
    brand: product.brands?.split(",")[0]?.trim() || "",
    image: product.image_url || product.image_small_url || null,
    weight: product.quantity || null,
    categories: product.categories_tags ?? [],
    // Same FR preference for ingredients
    ingredients:
      product.ingredients_text_fr || product.ingredients_text || null,
    allergens: product.allergens_tags ?? [],
    nutriscore: product.nutriscore_grade
      ? product.nutriscore_grade.toLowerCase()
      : null,
    nutriments: n
      ? {
          calories: n["energy-kcal_100g"] ?? 0,
          proteins: n.proteins_100g ?? 0,
          carbs: n.carbohydrates_100g ?? 0,
          fat: n.fat_100g ?? 0,
          sugars: n.sugars_100g ?? 0,
          salt: n.salt_100g ?? 0,
          fiber: n.fiber_100g ?? 0,
        }
      : null,
    labels: product.labels_tags ?? [],
    countries: product.countries_tags ?? [],
    additives: product.additives_tags ?? [],
    ecoscore: product.ecoscore_grade
      ? product.ecoscore_grade.toLowerCase()
      : null,
    nova: product.nova_group ?? null,
    packaging: product.packaging || null,
    servingSize: product.serving_size || null,
  };
}
