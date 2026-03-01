# 📸🌿 FindMyFauna — AI-Powered Biodiversity Mapping

**Snap a photo and ID the species with Google Gemini 2.5 Flash.**

FindMyFauna is a full-stack Next.js web application that empowers anyone to photograph plants and animals, instantly identify the species using Google's Gemini Vision AI, and pin every sighting on a live interactive map — building a crowd-sourced biodiversity database in real-time.

---

## ✨ Features

| Feature | Description |
| --- | --- |
| 📷 **Photo Upload & Capture** | Take or upload a photo directly from your phone camera or desktop. Supports JPEG, PNG, WebP, GIF, HEIC/HEIF. |
| 🤖 **AI Species Identification** | Google Gemini 2.5 Flash analyzes the image and returns the common name, scientific name, category, confidence level, and a fun fact. |
| 🗺️ **Interactive Sighting Map** | Every identified sighting is pinned on a beautiful Leaflet.js map with category-specific custom icons (plant, animal, insect, etc.). |
| 📍 **Automatic GPS Extraction** | GPS coordinates are automatically pulled from photo EXIF data. If unavailable, a manual location picker lets users tap-to-place on a map. |
| 🔍 **Species & Region Search** | A dedicated **Find** tab lets users search for species by name (with autocomplete) or search by map region to discover all sightings in an area. |
| 🧬 **Gemini "Learn More"** | Click "Learn More with Gemini" on any sighting to get a rich, AI-generated breakdown with dynamic sections (Appearance, Habitat, Conservation, etc.) and emoji icons. |
| 🌍 **Biosphere Insight** | AI-powered ecological summaries for any map region — Gemini analyzes the species in a bounding box and returns biodiversity highlights and patterns. |
| 🖼️ **Wikipedia Species Images** | Species detail panels automatically fetch and display a reference image from Wikipedia, with a lightbox zoom viewer. |
| 🔄 **Duplicate Detection** | SHA-256 image hashing prevents the same photo from being uploaded twice. |
| 📱 **Mobile-First Design** | Fully responsive UI with a separate mobile camera button, touch-friendly interactions, and device-adapted layouts. |

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **AI** | [Google Gemini 2.5 Flash](https://ai.google.dev/) (`@google/genai`) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + REST API) |
| **Map** | [Leaflet.js](https://leafletjs.com/) via `react-leaflet` |
| **EXIF** | [`exifr`](https://github.com/nickt/exifr) — GPS extraction from photos |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Font** | [Inter](https://rsms.me/inter/) (Google Fonts, loaded via `next/font`) |

---

## 🏗️ Architecture

```
┌──────────────────────┐     base64 + coords     ┌────────────────────────┐
│     Browser UI       │ ─────────────────────▶   │   /api/identify        │
│  (UploadForm.tsx)    │                          │   Gemini Vision AI     │
└──────────┬───────────┘                          └──────────┬─────────────┘
           │                                                 │
           │  1. Pick/capture photo                          │ 2. Send image to Gemini
           │  2. Extract GPS from EXIF                       │ 3. Validate JSON response
           │     (or manual location picker)                 │ 4. Hash image (SHA-256)
           │  3. Convert to base64                           │ 5. Insert sighting into
           │  4. POST to /api/identify                       │    Supabase
           │                                                 │
           │     ◀───────────────────────────────────────────┘
           │     sighting object returned
           ▼
┌──────────────────────┐
│   Leaflet Map        │  ◀── New marker appears + map flies to location
│   (Map.tsx)          │
└──────────────────────┘

Additional API Routes:
  /api/learn-more         → Gemini generates detailed species info (sectioned)
  /api/biosphere-summary  → Gemini generates ecological insight for a map region
  /api/search-species     → Autocomplete + occurrence lookup from Supabase
  /api/search-region      → Bounding-box spatial query on Supabase
  /api/species-image      → Fetches a reference image from Wikipedia
```

---

## 📂 Project Structure

```
mm-project/
├── public/                         # Static assets (SVGs, favicon)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── identify/route.ts         # AI identification + DB save
│   │   │   ├── learn-more/route.ts       # Gemini deep-dive species info
│   │   │   ├── biosphere-summary/route.ts # AI ecological region insight
│   │   │   ├── search-species/route.ts   # Species autocomplete + occurrences
│   │   │   ├── search-region/route.ts    # Bounding-box spatial search
│   │   │   └── species-image/route.ts    # Wikipedia image lookup
│   │   ├── globals.css             # Tailwind + base styles + Leaflet overrides
│   │   ├── layout.tsx              # Root layout, metadata, font loading
│   │   └── page.tsx                # Home page — orchestrates everything
│   ├── components/
│   │   ├── FindTab.tsx             # Find tab: species search + region search
│   │   ├── LocationPicker.tsx      # Manual location picker (tap-to-place map)
│   │   ├── Map.tsx                 # Interactive sighting map with popups
│   │   ├── RegionSearchMap.tsx     # Region search map with bounding-box queries
│   │   ├── SpeciesDetailsPanel.tsx # Detailed species panel with Gemini info
│   │   ├── SpeciesSearch.tsx       # Search bar with autocomplete dropdown
│   │   └── UploadForm.tsx          # Photo upload form with EXIF/GPS logic
│   │   └── ui/                     # Shared UI components
│   │       ├── CategoryBadge.tsx   # Category pill badge
│   │       ├── CategoryIcon.tsx    # Category-specific SVG icons
│   │       ├── ConfidenceBadge.tsx # Confidence level indicator
│   │       ├── GeminiIcon.tsx      # Gemini sparkle icon
│   │       └── Spinner.tsx         # Loading spinner
│   └── lib/
│       ├── constants.ts            # Shared constants (category colors, etc.)
│       ├── gemini.ts               # Gemini client singleton + JSON parser
│       ├── leaflet-config.ts       # Leaflet marker icons + custom category pins
│       ├── supabase.ts             # Supabase client singleton
│       └── types.ts                # Shared TypeScript types & constants
├── .env.local                      # Secret keys (not committed)
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 🗄️ Database Schema

The app uses a single Supabase table called **`sightings`**:

| Column | Type | Description |
| --- | --- | --- |
| `id` | `uuid` | Primary key (auto-generated) |
| `common_name` | `text` | Common English name (e.g. "Red Fox") |
| `scientific_name` | `text` | Binomial Latin name (e.g. "Vulpes vulpes") |
| `category` | `text` | One of: mammal, bird, reptile, amphibian, fish, insect, arachnid, plant, fungus, other |
| `confidence` | `text` | AI confidence: high, medium, or low |
| `fun_fact` | `text` | A fun fact about the species |
| `latitude` | `float8` | GPS latitude |
| `longitude` | `float8` | GPS longitude |
| `image_hash` | `text` | SHA-256 hash for duplicate detection |
| `created_at` | `timestamptz` | Auto-set on insert |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A **[Supabase](https://supabase.com/)** project with a `sightings` table (see schema above)
- A **[Google Gemini API key](https://aistudio.google.com/apikey)**

### Installation

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd mm-project

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.local.example .env.local
# Fill in your API keys (see below)

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
# Google Gemini API key (get one at https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase project URL and anonymous key (found in Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

> **Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. `GEMINI_API_KEY` is **server-only** and never sent to the client.

---

## 📜 API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/identify` | POST | Upload a photo → Gemini identifies the species → saves to Supabase |
| `/api/learn-more` | POST | Get a detailed, sectioned AI description of a species |
| `/api/biosphere-summary` | POST | Get an AI ecological insight for a map region |
| `/api/search-species` | GET | Autocomplete species search or get all occurrences of a species |
| `/api/search-region` | GET | Spatial bounding-box query for all sightings in a map area |
| `/api/species-image` | POST | Fetch a reference image from Wikipedia for a species |

---

## 📝 Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `next dev` | Start the dev server with hot-reload |
| `npm run build` | `next build` | Create an optimized production build |
| `npm start` | `next start` | Serve the production build |
| `npm run lint` | `eslint` | Run the linter across the project |

---

## 🏆 Built for a Hackathon

FindMyFauna was built for a hackathon to showcase how AI and crowd-sourced data can make biodiversity monitoring accessible to everyone — from curious hikers to citizen scientists.
