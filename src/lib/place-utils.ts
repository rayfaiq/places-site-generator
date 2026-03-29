// Format price level enum to symbol
export function formatPriceLevel(level?: string): string {
  if (!level) return 'N/A'
  const map: Record<string, string> = {
    'PRICE_LEVEL_FREE': 'Free',
    'PRICE_LEVEL_INEXPENSIVE': '$',
    'PRICE_LEVEL_MODERATE': '$$',
    'PRICE_LEVEL_EXPENSIVE': '$$$',
    'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$',
  }
  return map[level] ?? level
}

// Resolve Google Places photo URL
export async function resolvePhotoUrl(photoName: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}&skipHttpRedirect=false`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(url, { redirect: 'follow', signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) return null
      return res.url
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

// Simple client-side copy generator (no API needed)
export async function generateCopy(
  place: any,
  googleApiKey: string
): Promise<any> {
  const rawReviews = place.reviews ?? [];
  const reviewSnippet = rawReviews
    .slice(0, 3)
    .map(
      (r: any) =>
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
  const priceLevel = (place.priceLevel as string) ?? "N/A";

  // Simple deterministic copy generation (no AI needed)
  return {
    tagline: `Discover ${displayName}`,
    headline: `Welcome to ${displayName}`,
    description: `${displayName} is a beloved ${type} located at ${address}. ${summary || `With a ${rating}/5 rating from ${reviewCount} visitors, it's a must-visit destination.`} Come experience what makes this place special.`,
    highlights: [
      type || "Great location",
      `${rating}/5 rating`,
      `${reviewCount}+ reviews`,
      "Popular destination",
    ],
    callToAction: "Visit Now",
    ambiance: "inviting",
    bestFor: "visitors and locals alike",
  };
}

// Save to localStorage
export function savePlaceResult(place: any, copy: any) {
  const storageKey = `place_${Date.now()}`;
  const result = { place, copy, savedAt: new Date().toISOString() };
  localStorage.setItem(storageKey, JSON.stringify(result));
  return storageKey;
}

// Load from localStorage
export function loadPlaceResult(key: string) {
  const data = localStorage.getItem(key);
  if (!data) return null;
  return JSON.parse(data);
}

// List all saved places
export function listSavedPlaces(): any[] {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('place_'));
  return keys.map(key => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }).filter(Boolean);
}

// Delete saved place
export function deleteSavedPlace(key: string) {
  localStorage.removeItem(key);
}
