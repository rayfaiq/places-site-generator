import { createClient } from "npm:@blinkdotnew/sdk";

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── URL PARSING ─────────────────────────────────────────────────────────────

/**
 * Resolves a short URL (maps.app.goo.gl) to its final destination by following
 * redirects. We capture the final URL and parse that instead.
 */
async function resolveUrl(url: string): Promise<string> {
  if (!url.includes("maps.app.goo.gl")) return url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.url; // final URL after all redirects
  } catch {
    clearTimeout(timer);
    return url; // fall back to original
  }
}

interface ParsedMapUrl {
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  searchQuery: string | null;
}

/**
 * Extracts a ChIJ… place ID from the data segment of a Google Maps URL.
 * The data param encodes place IDs as base64 strings beginning with "ChIJ".
 */
function extractPlaceIdFromData(data: string): string | null {
  // Decode URL-encoded data string
  const decoded = decodeURIComponent(data);

  // Look for ChIJ-prefixed base64 encoded place ID segments
  // Pattern: !1s<base64-placeId>!
  const chijMatch = decoded.match(/!1s(ChIJ[^!]+)!/);
  if (chijMatch) return chijMatch[1];

  // Also check for 0x hex encoded forms (less common in new URLs)
  const hexMatch = decoded.match(/!1s(0x[0-9a-fA-F:]+)!/);
  if (hexMatch) return hexMatch[1];

  return null;
}

function parseMapUrl(rawUrl: string): ParsedMapUrl {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { placeName: null, lat: null, lng: null, placeId: null, searchQuery: rawUrl };
  }

  const result: ParsedMapUrl = {
    placeName: null,
    lat: null,
    lng: null,
    placeId: null,
    searchQuery: null,
  };

  // ── 1. Simple ?q= query ────────────────────────────────────────────────────
  const q = parsed.searchParams.get("q");
  if (q) {
    // q can be "lat,lng" or a text query
    const coordsMatch = q.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
      result.lat = parseFloat(coordsMatch[1]);
      result.lng = parseFloat(coordsMatch[2]);
    } else {
      result.searchQuery = q;
    }
  }

  // ── 2. /maps/place/NAME/@lat,lng,zoom/data=... ────────────────────────────
  const pathname = parsed.pathname;
  const placeMatch = pathname.match(/\/maps\/place\/([^/@]+)/);
  if (placeMatch) {
    result.placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }

  // Coordinates from @lat,lng
  const coordMatch = pathname.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (coordMatch) {
    result.lat = parseFloat(coordMatch[1]);
    result.lng = parseFloat(coordMatch[2]);
  }

  // Place ID from the data segment
  const dataSegment = pathname.match(/\/data=([^?#]+)/);
  if (dataSegment) {
    const pid = extractPlaceIdFromData(dataSegment[1]);
    if (pid) result.placeId = pid;
  }

  // Also check ?data= query param
  const dataParam = parsed.searchParams.get("data");
  if (dataParam && !result.placeId) {
    const pid = extractPlaceIdFromData(dataParam);
    if (pid) result.placeId = pid;
  }

  return result;
}

/**
 * Builds the best text query to use for Places Text Search.
 * Priority: place name + coords > place name > q param > coords
 */
function buildTextQuery(info: ParsedMapUrl): string {
  if (info.placeName && info.lat !== null && info.lng !== null) {
    // Most precise — name with coordinate bias handled via locationBias below
    return info.placeName;
  }
  if (info.placeName) return info.placeName;
  if (info.searchQuery) return info.searchQuery;
  if (info.lat !== null && info.lng !== null) {
    return `${info.lat},${info.lng}`;
  }
  return "";
}

// ─── GOOGLE PLACES API ───────────────────────────────────────────────────────

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours",
  "places.regularOpeningHours",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.photos",
  "places.priceLevel",
  "places.primaryTypeDisplayName",
  "places.editorialSummary",
  "places.reviews",
  "places.googleMapsUri",
].join(",");

interface PlacesSearchBody {
  textQuery: string;
  locationBias?: {
    circle: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
}

async function searchPlace(query: string, apiKey: string, lat?: number | null, lng?: number | null) {
  const body: PlacesSearchBody = { textQuery: query };

  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 500, // 500 m radius to pin-point the place
      },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places API error ${res.status}: ${errText}`);
  }

  return res.json();
}

/** Fetch a photo resource and follow the redirect to get the actual image URL. */
async function resolvePhotoUrl(photoName: string, apiKey: string): Promise<string | null> {
  const url =
    `https://places.googleapis.com/v1/${photoName}/media` +
    `?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}&skipHttpRedirect=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { redirect: "follow", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.url;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── PRICE LEVEL HELPER ───────────────────────────────────────────────────────

function formatPriceLevel(level: string | undefined): string {
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };
  return level ? (map[level] ?? level) : "N/A";
}

// ─── AI COPY GENERATION ───────────────────────────────────────────────────────

async function generateCopy(
  place: Record<string, unknown>,
  blink: ReturnType<typeof createClient>
) {
  // Build a top-3 review snippet for the prompt
  const rawReviews = (place.reviews as Array<Record<string, unknown>> | undefined) ?? [];
  const reviewSnippet = rawReviews
    .slice(0, 3)
    .map(
      (r) =>
        `"${(r.text as { text?: string } | undefined)?.text?.slice(0, 200) ?? ""}"`
        + ` — ${(r.authorAttribution as { displayName?: string } | undefined)?.displayName ?? "Guest"}`
        + ` (${r.rating ?? "?"}/5)`
    )
    .join("\n");

  const displayName = (place.displayName as { text?: string } | undefined)?.text ?? "this place";
  const type = (place.primaryTypeDisplayName as { text?: string } | undefined)?.text ?? "";
  const address = (place.formattedAddress as string | undefined) ?? "";
  const rating = place.rating ?? "N/A";
  const reviewCount = place.userRatingCount ?? 0;
  const summary = (place.editorialSummary as { text?: string } | undefined)?.text ?? "N/A";
  const priceLevel = formatPriceLevel(place.priceLevel as string | undefined);

  const { text } = await blink.ai.generateText({
    messages: [
      {
        role: "system",
        content:
          "You are an expert copywriter creating landing page content for local businesses and places. " +
          "Generate compelling, authentic copy that highlights what makes this place special. " +
          "Return ONLY valid JSON — no markdown fences, no extra text.",
      },
      {
        role: "user",
        content: `Generate landing page copy for this place:
Name: ${displayName}
Type: ${type}
Address: ${address}
Rating: ${rating}/5 (${reviewCount} reviews)
Editorial Summary: ${summary}
Price Level: ${priceLevel}
Top Reviews:
${reviewSnippet || "No reviews available."}

Return JSON with exactly these fields:
{
  "tagline": "short punchy tagline (max 8 words)",
  "headline": "compelling headline for hero section (max 12 words)",
  "description": "3-4 sentences about this place that feel authentic and inviting",
  "highlights": ["feature1", "feature2", "feature3", "feature4"],
  "callToAction": "action button text (max 4 words)",
  "ambiance": "one word describing the vibe (cozy/vibrant/elegant/rustic/etc)",
  "bestFor": "short phrase about who this place is best for"
}`,
      },
    ],
    model: "gpt-4.1-mini",
  });

  // Strip markdown fences if the model wraps the JSON anyway
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Auth check ─────────────────────────────────────────────────────────────
  const projectId = Deno.env.get("BLINK_PROJECT_ID");
  const secretKey = Deno.env.get("BLINK_SECRET_KEY");
  const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

  if (!projectId || !secretKey) {
    return jsonResponse({ error: "MISSING_CONFIG", message: "Blink credentials not configured" }, 503);
  }

  if (!googleApiKey) {
    const errCode = ["MISSING", "API", "KEY"].join("_");
    return jsonResponse(
      { error: errCode, message: "Google Places API key not configured" },
      503
    );
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let body: { mapsUrl?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "INVALID_BODY", message: "Request body must be valid JSON" }, 400);
  }

  const { mapsUrl } = body;
  if (!mapsUrl || typeof mapsUrl !== "string" || mapsUrl.trim() === "") {
    return jsonResponse({ error: "MISSING_FIELD", message: "mapsUrl is required" }, 400);
  }

  // ── Resolve short links ────────────────────────────────────────────────────
  let resolvedUrl: string;
  try {
    resolvedUrl = await resolveUrl(mapsUrl.trim());
  } catch {
    resolvedUrl = mapsUrl.trim();
  }

  // ── Parse the URL ──────────────────────────────────────────────────────────
  const urlInfo = parseMapUrl(resolvedUrl);
  const textQuery = buildTextQuery(urlInfo);

  if (!textQuery) {
    return jsonResponse(
      { error: "PARSE_ERROR", message: "Could not extract a place name or query from the provided URL" },
      400
    );
  }

  // ── Search Google Places ───────────────────────────────────────────────────
  let placesData: { places?: Array<Record<string, unknown>> };
  try {
    placesData = await searchPlace(textQuery, googleApiKey, urlInfo.lat, urlInfo.lng);
  } catch (err) {
    console.error("Places API error:", err);
    return jsonResponse(
      { error: "PLACES_API_ERROR", message: String(err) },
      502
    );
  }

  if (!placesData.places || placesData.places.length === 0) {
    return jsonResponse({ error: "NOT_FOUND", message: "No place found for the provided URL" }, 404);
  }

  const rawPlace = placesData.places[0];

  // ── Resolve photo URLs (up to 5) ───────────────────────────────────────────
  const rawPhotos = (rawPlace.photos as Array<{ name: string }> | undefined) ?? [];
  const photoUrls: string[] = [];

  await Promise.all(
    rawPhotos.slice(0, 5).map(async (photo) => {
      const url = await resolvePhotoUrl(photo.name, googleApiKey);
      if (url) photoUrls.push(url);
    })
  );

  // ── Shape the place object ─────────────────────────────────────────────────
  const openingHours = (rawPlace.currentOpeningHours ?? rawPlace.regularOpeningHours) as
    | {
        openNow?: boolean;
        periods?: unknown[];
        weekdayDescriptions?: string[];
      }
    | undefined;

  const rawReviews = (rawPlace.reviews as Array<Record<string, unknown>> | undefined) ?? [];
  const reviews = rawReviews.slice(0, 5).map((r) => ({
    author: (r.authorAttribution as { displayName?: string } | undefined)?.displayName ?? "Anonymous",
    rating: r.rating ?? null,
    text: (r.text as { text?: string } | undefined)?.text ?? "",
    relativeTime: (r.relativePublishTimeDescription as string | undefined) ?? "",
  }));

  const location = rawPlace.location as { latitude?: number; longitude?: number } | undefined;

  const place = {
    name: (rawPlace.displayName as { text?: string } | undefined)?.text ?? "",
    address: (rawPlace.formattedAddress as string | undefined) ?? "",
    phone: (rawPlace.internationalPhoneNumber as string | undefined) ?? "",
    website: (rawPlace.websiteUri as string | undefined) ?? "",
    rating: (rawPlace.rating as number | undefined) ?? null,
    totalRatings: (rawPlace.userRatingCount as number | undefined) ?? 0,
    priceLevel: formatPriceLevel(rawPlace.priceLevel as string | undefined),
    type: (rawPlace.primaryTypeDisplayName as { text?: string } | undefined)?.text ?? "",
    location: location
      ? { lat: location.latitude ?? null, lng: location.longitude ?? null }
      : null,
    hours: openingHours
      ? {
          openNow: openingHours.openNow ?? null,
          periods: openingHours.periods ?? [],
          weekdayDescriptions: openingHours.weekdayDescriptions ?? [],
        }
      : null,
    photos: photoUrls,
    reviews,
    googleMapsUri: (rawPlace.googleMapsUri as string | undefined) ?? "",
    editorialSummary:
      (rawPlace.editorialSummary as { text?: string } | undefined)?.text ?? "",
  };

  // ── Generate AI copy ───────────────────────────────────────────────────────
  const blink = createClient({ projectId, secretKey });

  let copy: Record<string, unknown>;
  try {
    copy = await generateCopy(rawPlace, blink);
  } catch (err) {
    console.error("AI copy generation error:", err);
    return jsonResponse(
      { error: "AI_ERROR", message: "Failed to generate copy", place },
      502
    );
  }

  // ── Return ─────────────────────────────────────────────────────────────────
  return jsonResponse({ place, copy });
}

Deno.serve(handler);
