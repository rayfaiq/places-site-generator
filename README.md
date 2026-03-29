# Places Site Generator

AI-powered places site generator with React, Vite, TypeScript, and Tailwind CSS.

## Features

- 🎨 Beautiful place pages with ratings and reviews
- 📱 Fully responsive design
- ✨ Smooth animations with framer-motion
- 🌟 Star rating system
- 🎯 Modern UI with Tailwind CSS
- 📊 React Query for data fetching
- 🎮 React DnD for drag-and-drop interactions

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Library**: Lucide React
- **Form Handling**: React Hook Form + Zod
- **Charts**: Recharts
- **Date Handling**: date-fns

## Development

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Vercel (Recommended)

**Frontend & Backend (2 projects):**

1. **Deploy Frontend:**
```bash
cd project-places-site-gen-ghuuphb3-ver-h2p34rb2
npm install
vercel --prod
```
Your app will be live at `https://project-places-site-gen-ghuuphb3-ve.vercel.app`

2. **Deploy Backend API:**
```bash
cd project-places-site-gen-ghuuphb3-ver-h2p34rb2/functions/generate-place-site
vercel --prod
```
API will be live at `https://generate-place-site.vercel.app`

3. **Environment Variables:**

Frontend project (`project-places-site-gen-ghuuphb3-ver-h2p34rb2`):
- `NEXT_PUBLIC_API_URL=https://generate-place-site.vercel.app`

Backend project (`functions/generate-place-site`):
- `GOOGLE_PLACES_API_KEY` - Google Places API key
- `BLINK_PROJECT_ID` - Blink project ID
- `BLINK_SECRET_KEY` - Blink secret key

### Development

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your API keys in `.env.local`

3. Start frontend with dev server:
```bash
npm run dev
```

4. Start API server (separate terminal):
```bash
node dev-server.mjs
```

5. Open http://localhost:3000

### Manual Deployment

- Push to GitHub
- Import repository in Vercel dashboard
- Vercel will automatically detect Vite project
- Click "Deploy"

## Available Scripts

```bash
# Run all linting (includes CSS variable check)
npm run lint

# Check only CSS variables
npm run check:css-vars

# Individual linting
npm run lint:js    # ESLint
npm run lint:css   # Stylelint
```

## CSS Variable Detection

The template includes a custom script that:

1. **Parses `tailwind.config.cjs`** to find all `var(--variable)` references
2. **Parses `src/index.css`** to find all defined CSS variables (`--variable:`)
3. **Cross-references** them to find missing definitions
4. **Reports undefined variables** with clear error messages

### Example Output

When CSS variables are missing:
```
❌ Undefined CSS variables found in tailwind.config.cjs:
   --sidebar-background
   --sidebar-foreground
   --sidebar-primary

Add these variables to src/index.css
```

When all variables are defined:
```
✅ All CSS variables in tailwind.config.cjs are defined
```

## How It Works

The detection happens during the `npm run lint` command, which will:
- Exit with error code 1 if undefined variables are found
- Show exactly which variables need to be added to your CSS file
- Integrate seamlessly with your development workflow

This prevents runtime CSS issues where Tailwind classes reference undefined CSS variables.