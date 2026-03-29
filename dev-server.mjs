/**
 * Local dev server that replicates the Deno edge function logic
 * for generate-place-site. Run with: node dev-server.mjs
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@blinkdotnew/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    env[trimmed.slice(0, idx).trim()] = val;
  }
  return env;
}

const env = loadEnv();
const GOOGLE_API_KEY = env.GOOGLE_PLACES_API_KEY;
const BLINK_PROJECT_ID = env.BLINK_PROJECT_ID || env.VITE_BLINK_PROJECT_ID;
const BLINK_SECRET_KEY = env.BLINK_SECRET_KEY;

if (!GOOGLE_API_KEY) { console.error('Missing GOOGLE_PLACES_API_KEY in .env.local'); process.exit(1); }
if (!BLINK_PROJECT_ID) { console.error('Missing BLINK_PROJECT_ID or VITE_BLINK_PROJECT_ID in .env.local'); process.exit(1); }
if (!BLINK_SECRET_KEY) { console.error('Missing BLINK_SECRET_KEY in .env.local'); process.exit(1); }

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// ─── URL parsing (same as edge function) ─────────────────────────────────────

async function resolveUrl(url) {
  if (!url.includes('maps.app.goo.gl')) return url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    return res.url;
  } catch {
    clearTimeout(timer);
    return url;
  }
}

function extractPlaceIdFromData(data) {
  const decoded = decodeURIComponent(data);
  const chijMatch = decoded.match(/!1s(ChIJ[^!]+)!/);
  if (chijMatch) return chijMatch[1];
  const hexMatch = decoded.match(/!1s(0x[0-9a-fA-F:]+)!/);
  if (hexMatch) return hexMatch[1];
  return null;
}

function parseMapUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch {
    return { placeName: null, lat: null, lng: null, placeId: null, searchQuery: rawUrl };
  }

  const result = { placeName: null, lat: null, lng: null, placeId: null, searchQuery: null };

  const q = parsed.searchParams.get('q');
  if (q) {
    const coordsMatch = q.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
      result.lat = parseFloat(coordsMatch[1]);
      result.lng = parseFloat(coordsMatch[2]);
    } else {
      result.searchQuery = q;
    }
  }

  const pathname = parsed.pathname;
  const placeMatch = pathname.match(/\/maps\/place\/([^/@]+)/);
  if (placeMatch) {
    result.placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  const coordMatch = pathname.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (coordMatch) {
    result.lat = parseFloat(coordMatch[1]);
    result.lng = parseFloat(coordMatch[2]);
  }

  const dataSegment = pathname.match(/\/data=([^?#]+)/);
  if (dataSegment) {
    const pid = extractPlaceIdFromData(dataSegment[1]);
    if (pid) result.placeId = pid;
  }

  const dataParam = parsed.searchParams.get('data');
  if (dataParam && !result.placeId) {
    const pid = extractPlaceIdFromData(dataParam);
    if (pid) result.placeId = pid;
  }

  return result;
}

function buildTextQuery(info) {
  if (info.placeName && info.lat !== null && info.lng !== null) return info.placeName;
  if (info.placeName) return info.placeName;
  if (info.searchQuery) return info.searchQuery;
  if (info.lat !== null && info.lng !== null) return `${info.lat},${info.lng}`;
  return '';
}

// ─── Google Places API ───────────────────────────────────────────────────────

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.currentOpeningHours',
  'places.regularOpeningHours', 'places.internationalPhoneNumber', 'places.websiteUri',
  'places.photos', 'places.priceLevel', 'places.primaryTypeDisplayName',
  'places.editorialSummary', 'places.reviews', 'places.googleMapsUri',
].join(',');

async function searchPlace(query, apiKey, lat, lng) {
  const body = { textQuery: query };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res;
  try {
    res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally { clearTimeout(timer); }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places API error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function resolvePhotoUrl(photoName, apiKey) {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}&skipHttpRedirect=false`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.url;
  } catch { clearTimeout(timer); return null; }
}

function formatPriceLevel(level) {
  const map = {
    PRICE_LEVEL_FREE: 'Free', PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  };
  return level ? (map[level] ?? level) : 'N/A';
}

// ─── AI Copy Generation ─────────────────────────────────────────────────────

async function generateCopy(place, blink) {
  const rawReviews = place.reviews ?? [];
  const reviewSnippet = rawReviews.slice(0, 3).map(r =>
    `"${r.text?.text?.slice(0, 200) ?? ''}" — ${r.authorAttribution?.displayName ?? 'Guest'} (${r.rating ?? '?'}/5)`
  ).join('\n');

  const displayName = place.displayName?.text ?? 'this place';
  const type = place.primaryTypeDisplayName?.text ?? '';
  const address = place.formattedAddress ?? '';
  const rating = place.rating ?? 'N/A';
  const reviewCount = place.userRatingCount ?? 0;
  const summary = place.editorialSummary?.text ?? 'N/A';
  const priceLevel = formatPriceLevel(place.priceLevel);

  const { text } = await blink.ai.generateText({
    messages: [
      {
        role: 'system',
        content: 'You are an expert copywriter creating landing page content for local businesses and places. Generate compelling, authentic copy that highlights what makes this place special. Return ONLY valid JSON — no markdown fences, no extra text.',
      },
      {
        role: 'user',
        content: `Generate landing page copy for this place:
Name: ${displayName}
Type: ${type}
Address: ${address}
Rating: ${rating}/5 (${reviewCount} reviews)
Editorial Summary: ${summary}
Price Level: ${priceLevel}
Top Reviews:
${reviewSnippet || 'No reviews available.'}

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
    model: 'gpt-4.1-mini',
  });

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

// ─── HTTP Handler ────────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  // CORS
  res.writeHead && Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  // Read body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'INVALID_BODY', message: 'Request body must be valid JSON' }));
  }

  const { mapsUrl } = body;
  if (!mapsUrl || typeof mapsUrl !== 'string' || mapsUrl.trim() === '') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'MISSING_FIELD', message: 'mapsUrl is required' }));
  }

  let resolvedUrl;
  try { resolvedUrl = await resolveUrl(mapsUrl.trim()); } catch { resolvedUrl = mapsUrl.trim(); }

  const urlInfo = parseMapUrl(resolvedUrl);
  const textQuery = buildTextQuery(urlInfo);

  if (!textQuery) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'PARSE_ERROR', message: 'Could not extract a place name or query from the provided URL' }));
  }

  // Search Google Places
  let placesData;
  try {
    placesData = await searchPlace(textQuery, GOOGLE_API_KEY, urlInfo.lat, urlInfo.lng);
  } catch (err) {
    console.error('Places API error:', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'PLACES_API_ERROR', message: String(err) }));
  }

  if (!placesData.places || placesData.places.length === 0) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'No place found for the provided URL' }));
  }

  const rawPlace = placesData.places[0];

  // Resolve photos
  const rawPhotos = rawPlace.photos ?? [];
  const photoUrls = [];
  await Promise.all(rawPhotos.slice(0, 5).map(async (photo) => {
    const url = await resolvePhotoUrl(photo.name, GOOGLE_API_KEY);
    if (url) photoUrls.push(url);
  }));

  // Shape place
  const openingHours = rawPlace.currentOpeningHours ?? rawPlace.regularOpeningHours;
  const rawReviews = rawPlace.reviews ?? [];
  const reviews = rawReviews.slice(0, 5).map(r => ({
    author: r.authorAttribution?.displayName ?? 'Anonymous',
    rating: r.rating ?? null,
    text: r.text?.text ?? '',
    relativeTime: r.relativePublishTimeDescription ?? '',
  }));

  const location = rawPlace.location;
  const place = {
    name: rawPlace.displayName?.text ?? '',
    address: rawPlace.formattedAddress ?? '',
    phone: rawPlace.internationalPhoneNumber ?? '',
    website: rawPlace.websiteUri ?? '',
    rating: rawPlace.rating ?? null,
    totalRatings: rawPlace.userRatingCount ?? 0,
    priceLevel: formatPriceLevel(rawPlace.priceLevel),
    type: rawPlace.primaryTypeDisplayName?.text ?? '',
    location: location ? { lat: location.latitude ?? null, lng: location.longitude ?? null } : null,
    hours: openingHours ? {
      openNow: openingHours.openNow ?? null,
      periods: openingHours.periods ?? [],
      weekdayDescriptions: openingHours.weekdayDescriptions ?? [],
    } : null,
    photos: photoUrls,
    reviews,
    googleMapsUri: rawPlace.googleMapsUri ?? '',
    editorialSummary: rawPlace.editorialSummary?.text ?? '',
  };

  // Generate copy — use placeholder instead of Blink AI for local dev
  const displayName = rawPlace.displayName?.text ?? 'This Place';
  const placeType = rawPlace.primaryTypeDisplayName?.text ?? 'destination';
  const copy = {
    tagline: `Discover ${displayName}`,
    headline: `Welcome to ${displayName}`,
    description: `${displayName} is a beloved ${placeType} located at ${place.address}. ${place.editorialSummary || `With a ${place.rating}/5 rating from ${place.totalRatings} visitors, it's a must-visit destination.`} Come experience what makes this place special.`,
    highlights: [
      place.type || 'Great location',
      place.rating ? `${place.rating}/5 rating` : 'Highly rated',
      place.totalRatings ? `${place.totalRatings}+ reviews` : 'Popular spot',
      place.hours?.openNow ? 'Open now' : 'Check hours',
    ],
    callToAction: 'Visit Now',
    ambiance: 'inviting',
    bestFor: 'visitors and locals alike',
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ place, copy }));
}

// ─── Start server ────────────────────────────────────────────────────────────
const PORT = 3001;
const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Local API server running at http://localhost:${PORT}`);
});
