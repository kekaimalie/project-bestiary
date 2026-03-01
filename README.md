# 🌿 EcoMap — AI Biodiversity Mapping

**Snap a photo, identify the species with AI, and map biodiversity in real-time.**

EcoMap is a full-stack Next.js web app that lets users photograph plants and animals, automatically identifies the species using Google's Gemini Vision AI, and pins every sighting on a live interactive map backed by Supabase.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [File-by-File Breakdown](#file-by-file-breakdown)
  - [Configuration Files](#configuration-files)
  - [Shared Libraries (`src/lib/`)](#shared-libraries-srclib)
  - [API Route (`src/app/api/identify/`)](#api-route-srcappapiidentify)
  - [Components (`src/components/`)](#components-srccomponents)
  - [Pages & Layout (`src/app/`)](#pages--layout-srcapp)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## How It Works

```
┌─────────────┐     base64 + coords      ┌──────────────────┐
│  Browser UI  │ ──────────────────────▶  │  /api/identify   │
│  (UploadForm)│                          │  (Next.js Route) │
└──────┬───────┘                          └────────┬─────────┘
       │                                           │
       │ 1. Pick/capture photo                     │ 2. Send image to
       │ 2. Extract GPS from EXIF                  │    Gemini Vision AI
       │    (or fallback to device location)       │
       │ 3. Convert image to base64                │ 3. Validate AI JSON
       │ 4. POST to /api/identify                  │
       │                                           │ 4. Insert sighting
       │                                           │    into Supabase
       │    ◀──────────────────────────────────────┘
       │    sighting object returned
       │
       ▼
┌─────────────┐
│  Leaflet Map │  ◀── New marker appears + map flies to location
│  (Map.tsx)   │
└─────────────┘
```

---

## Tech Stack

| Layer          | Technology                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| **Framework**  | [Next.js 16](https://nextjs.org/) (App Router)                            |
| **Language**   | TypeScript                                                                 |
| **AI**         | [Google Gemini 2.5 Flash](https://ai.google.dev/) (`@google/genai`)       |
| **Database**   | [Supabase](https://supabase.com/) (PostgreSQL + REST API)                 |
| **Map**        | [Leaflet.js](https://leafletjs.com/) via `react-leaflet`                  |
| **EXIF**       | [`exifr`](https://github.com/nickt/exifr) — GPS extraction from photos   |
| **Styling**    | [Tailwind CSS v4](https://tailwindcss.com/)                               |
| **Font**       | [Inter](https://rsms.me/inter/) (Google Fonts, loaded via `next/font`)    |

---

## Project Structure

```
mm-project/
├── public/                    # Static assets (SVGs, favicon)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── identify/
│   │   │       └── route.ts   # POST endpoint — AI identification + DB save
│   │   ├── globals.css        # Tailwind import + base styles + Leaflet overrides
│   │   ├── layout.tsx         # Root HTML layout, metadata, font loading
│   │   └── page.tsx           # Home page — orchestrates everything
│   ├── components/
│   │   ├── Map.tsx            # Interactive Leaflet map with sighting markers
│   │   └── UploadForm.tsx     # Photo upload form with EXIF/geolocation logic
│   └── lib/
│       ├── supabase.ts        # Supabase client singleton
│       └── types.ts           # Shared TypeScript types & constants
├── .env.local                 # Secret keys (not committed to git)
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config
└── next.config.ts             # Next.js config
```

---

## File-by-File Breakdown

### Configuration Files

#### `package.json`

Defines project metadata, scripts, and dependencies:

| Script          | Command           | Purpose                                    |
| --------------- | ----------------- | ------------------------------------------ |
| `npm run dev`   | `next dev`        | Start the dev server with hot-reload       |
| `npm run build` | `next build`      | Create an optimized production build       |
| `npm start`     | `next start`      | Serve the production build                 |
| `npm run lint`  | `eslint`          | Run the linter across the project          |

**Key dependencies:**

- `@google/genai` — official Google GenAI SDK for calling Gemini models
- `@supabase/supabase-js` — Supabase client for database operations
- `exifr` — parses EXIF metadata (GPS coordinates) from uploaded photos
- `leaflet` + `react-leaflet` — renders the interactive map
- `next`, `react`, `react-dom` — core framework

#### `next.config.ts`

Minimal Next.js configuration. Uses the default App Router settings.

#### `tsconfig.json`

Standard Next.js TypeScript config with path aliases (`@/` maps to `src/`).

---

### Shared Libraries (`src/lib/`)

#### `types.ts` — Shared TypeScript Types

This file is the **single source of truth** for every data shape in the app. It defines:

| Type / Constant                | Purpose                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `Sighting`                     | A full sighting row from the database (id, names, category, confidence, fun_fact, coords, date) |
| `SightingCategory`             | Union of valid categories: `mammal`, `bird`, `reptile`, `amphibian`, `fish`, `insect`, `arachnid`, `plant`, `fungus`, `other` |
| `ConfidenceLevel`              | `"high"` \| `"medium"` \| `"low"`                                                              |
| `GeminiIdentificationResult`   | Shape of the JSON blob Gemini is asked to return                                                |
| `IdentifyRequestBody`          | Payload the frontend sends to `POST /api/identify` (base64 image + lat/lng + MIME type)         |
| `IdentifyResponse`             | Successful API response containing the saved `Sighting`                                         |
| `IdentifyErrorResponse`        | Error API response containing an error message string                                           |
| `ACCEPTED_MIME_TYPES`          | Array of image MIME types the app accepts (JPEG, PNG, WebP, GIF, HEIC, HEIF)                    |
| `MAX_IMAGE_SIZE_BYTES`         | Upload size cap (5 MB)                                                                          |

#### `supabase.ts` — Supabase Client

Creates and exports a **singleton Supabase client** using `createClient()`.

- Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment variables.
- **Throws an error at startup** if either variable is missing, so you get a clear message instead of silent `undefined` failures.
- The exported `supabase` object is imported by both the frontend (to fetch sightings) and the API route (to insert sightings).

---

### API Route (`src/app/api/identify/`)

#### `route.ts` — Species Identification Endpoint

**`POST /api/identify`** — The core backend logic. This is a Next.js Route Handler.

**What it does, step by step:**

1. **Parse & validate the request body** — Ensures `image` (base64 data URL), `latitude`, `longitude`, and `mimeType` are all present and valid using the `validateRequestBody()` function. Returns `400` if invalid.

2. **Send the image to Gemini Vision AI** — Strips the `data:image/...;base64,` prefix, then calls `gemini-2.5-flash` with:
   - A detailed **prompt** asking Gemini to act as a biodiversity expert and return strict JSON with `common_name`, `scientific_name`, `category`, `confidence`, and `fun_fact`.
   - The raw base64 image as `inlineData`.

3. **Parse & validate the AI response** — The raw text from Gemini is cleaned (strips any accidental markdown fences), parsed as JSON, and run through `validateGeminiResult()` which checks every field for correct type and value. Returns `502` if the AI response is malformed.

4. **Save to Supabase** — Inserts a new row in the `sightings` table with the validated species data plus coordinates. Returns `500` on database errors.

5. **Return the saved sighting** — Sends back `{ success: true, sighting: { ... } }` so the frontend can immediately display it.

**Key design decisions:**

- The Gemini client is created once (module-level singleton) and reused across requests.
- `VALID_CATEGORIES` and `VALID_CONFIDENCE` are stored as `Set` objects for O(1) lookups during validation.
- All errors are caught and return appropriate HTTP status codes with user-friendly messages.

---

### Components (`src/components/`)

#### `UploadForm.tsx` — Photo Upload & Submission

A client component (`'use client'`) that handles the entire photo upload flow.

**Props:**
- `onUploadSuccess(sighting)` — callback invoked with the saved `Sighting` when identification succeeds.

**What it does:**

1. **File selection** — A styled drag-and-drop zone with a hidden `<input type="file">`. Accepts all image types and supports direct camera capture on mobile (`capture="environment"`). Shows an image preview once a file is selected.

2. **GPS extraction (`getCoordinates`)** — Uses a two-step strategy:
   - **EXIF first**: Uses the `exifr` library to parse GPS coordinates embedded in the photo's EXIF metadata (common in smartphone photos).
   - **Device fallback**: If the photo has no GPS data, falls back to the browser's `navigator.geolocation.getCurrentPosition()` API with high accuracy enabled.

3. **Base64 conversion (`toBase64`)** — Converts the file to a base64 data URL using `FileReader.readAsDataURL()`.

4. **Submission (`handleSubmit`)** — Orchestrates the full pipeline:
   - Gets coordinates (EXIF or device)
   - Converts image to base64
   - POSTs to `/api/identify`
   - Calls `onUploadSuccess` with the result
   - Shows real-time status messages at each step (e.g. "Checking photo for GPS data...", "🤖 Identifying species with Gemini AI...")

5. **Memory management** — Revokes `URL.createObjectURL` references when previews are cleared to prevent memory leaks.

**UI elements:**
- Image preview with a red ✕ button to remove
- Animated status text (pulsing green)
- Error banner (red background)
- Submit button that disables during processing

---

#### `Map.tsx` — Interactive Sighting Map

A client component that renders all sightings as markers on a Leaflet map.

**Props:**
- `sightings` — array of `Sighting` objects to display as markers.
- `flyToPosition` — optional `[lat, lng]` tuple; when set, the map smoothly flies to that location.

**What it does:**

1. **Map initialization** — Centers on the first sighting if available, otherwise defaults to the center of the USA (`39.8283, -98.5795`). Uses OpenStreetMap tiles.

2. **Marker rendering** — Each sighting becomes a Leaflet `Marker` with a detailed `Popup` containing:
   - Common name (bold)
   - Scientific name (italic)
   - Category badge (green pill)
   - Confidence badge (color-coded: green for high, yellow for medium, red for low)
   - Fun fact
   - Date of sighting

3. **Fly-to animation (`FlyToLatest`)** — A helper component that uses `useMap()` to call `map.flyTo()` with a smooth 1.5-second animation whenever a new sighting is added.

4. **Icon fix** — Leaflet's default marker icons break when bundled by Webpack/Turbopack, so the component manually configures icon URLs pointing to a CDN (`unpkg.com`).

**Why `dynamic(() => import(...), { ssr: false })`?**  
Leaflet requires the `window` object and crashes during server-side rendering. The map is dynamically imported in `page.tsx` with `ssr: false` and a loading placeholder.

---

### Pages & Layout (`src/app/`)

#### `layout.tsx` — Root Layout

The outermost layout wrapper for every page. It:

- Loads the **Inter** font from Google Fonts via `next/font/google` and sets it as a CSS variable (`--font-inter`).
- Defines **SEO metadata**: page title ("EcoMap — AI Biodiversity Mapping"), description, and keywords.
- Wraps children in `<html>` and `<body>` tags with the font and antialiasing applied.

#### `globals.css` — Global Styles

- Imports Tailwind CSS v4 via `@import "tailwindcss"`.
- Registers the Inter font as `--font-sans` using the `@theme inline` directive.
- Sets a base background (`#f8fafb`) and text color (`#1e293b`).
- Overrides Leaflet popup styles for rounded corners and consistent spacing.

#### `page.tsx` — Home Page (Main Orchestrator)

The single route (`/`) that ties everything together. This is a client component.

**State:**
| State Variable   | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| `sightings`      | Array of all sightings fetched from Supabase                |
| `recentSighting` | The most recently added sighting (shown in the success banner) |
| `isLoading`      | Whether sightings are still being fetched                   |
| `flyTo`          | Coordinates to fly the map to                               |

**Behavior:**

1. **On mount** — Fetches all sightings from Supabase (ordered newest first) via the `fetchSightings` callback.

2. **On successful upload (`handleUploadSuccess`):**
   - Shows a green **success banner** with the species name, scientific name, and fun fact.
   - Prepends the new sighting to the list (no re-fetch needed).
   - Triggers `flyTo` so the map animates to the new marker.
   - Auto-dismisses the banner after 10 seconds (with cleanup on unmount).

3. **Layout** — Responsive 3-column grid:
   - **Left column** (1/3 width on large screens): Upload form + total sightings counter.
   - **Right column** (2/3 width): The interactive map.

---

## Database Schema

The app uses a single Supabase table called **`sightings`**:

| Column            | Type          | Description                                |
| ----------------- | ------------- | ------------------------------------------ |
| `id`              | `uuid`        | Primary key (auto-generated)               |
| `common_name`     | `text`        | Common English name (e.g. "Red Fox")       |
| `scientific_name` | `text`        | Binomial Latin name (e.g. "Vulpes vulpes") |
| `category`        | `text`        | One of: mammal, bird, reptile, etc.        |
| `confidence`      | `text`        | AI confidence: high, medium, or low        |
| `fun_fact`        | `text`        | A fun fact about the species               |
| `latitude`        | `float8`      | GPS latitude                               |
| `longitude`       | `float8`      | GPS longitude                              |
| `created_at`      | `timestamptz` | Auto-set on insert                         |

---

## Getting Started

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
#    Copy the template below into .env.local and fill in your keys
cp .env.local.example .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Google Gemini API key (get one at https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase project URL and anonymous key (found in your Supabase dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

> **Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. `GEMINI_API_KEY` is **server-only** and never sent to the client.
