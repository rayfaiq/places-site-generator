# Places Site Generator — Next Steps

## Current Status

- **Frontend (Vite + React):** Working, runs on `http://localhost:3000`
- **Local API server (`dev-server.mjs`):** Created, proxies edge function logic via Node.js
- **Vite proxy:** Configured — frontend calls `/api/generate` which proxies to `localhost:3001`
- **Google Places API:** Working — successfully fetches place data (tested with Eiffel Tower)
- **Blink AI copy generation:** BLOCKED — authentication failing (HTTP 401)

## What's Done

1. Installed all npm dependencies
2. Created `dev-server.mjs` — a Node.js port of the Deno edge function (`functions/generate-place-site/index.ts`)
3. Updated `vite.config.ts` — added proxy rule: `/api/generate` → `localhost:3001`
4. Updated `src/config.ts` — falls back to `/api/generate` when `VITE_GENERATE_FUNCTION_URL` is not set
5. Fixed `.env.local` quote-stripping in the env parser
6. Verified Google Places API key works (billing enabled, API enabled)

## What's Blocking

### 1. Valid `BLINK_SECRET_KEY` required

The Blink SDK (`@blinkdotnew/sdk`) needs a valid **server-side secret key** to call `blink.ai.generateText()`. The current key in `.env.local` returns HTTP 401 (unauthorized).

**To fix:**
- Go to your Blink workspace dashboard → API Keys / Secrets
- Find or generate a **secret key** (not the publishable key)
- Update `BLINK_SECRET_KEY` in `.env.local`

**Alternative:** Replace Blink AI with a different LLM provider (e.g., OpenAI, Anthropic) for local dev. This would require modifying the `generateCopy()` function in `dev-server.mjs`.

## How to Run (once unblocked)

```bash
# Terminal 1 — API server (port 3001)
node dev-server.mjs

# Terminal 2 — Frontend (port 3000)
npm run dev
```

Open `http://localhost:3000`, paste a Google Maps URL, and it should generate a landing page.

## `.env.local` Required Variables

```
VITE_BLINK_PROJECT_ID=<your-blink-project-id>
VITE_BLINK_PUBLISHABLE_KEY=<your-blink-publishable-key>
GOOGLE_PLACES_API_KEY=<your-google-api-key>
BLINK_SECRET_KEY=<your-blink-secret-key>   # <-- THIS IS BLOCKING
```

Do NOT wrap values in quotes.

## Files Modified

| File | Change |
|------|--------|
| `dev-server.mjs` | New — local Node.js API server replicating edge function |
| `vite.config.ts` | Added `/api/generate` proxy to port 3001 |
| `src/config.ts` | Fallback to `/api/generate` when no function URL set |
