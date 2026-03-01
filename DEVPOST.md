# FindMyFauna — Devpost Submission

> Copy each section below into the corresponding Devpost field.

---

## Project Name

FindMyFauna

---

## Tagline

Snap a photo and ID the species with Google Gemini 2.5 Flash.

---

## Inspiration

Biodiversity loss is one of the greatest environmental challenges we face, yet most people walk past dozens of species every day without knowing what they are. We wanted to bridge that gap — to make species identification instant, fun, and accessible to everyone with a smartphone. By turning every hiker, student, and curious neighbor into a citizen scientist, we believe we can build a crowd-sourced biodiversity map that's both educational and genuinely useful for ecological awareness.

---

## What It Does

FindMyFauna is a web application that lets anyone photograph a plant or animal, instantly identify it using Google Gemini 2.5 Flash, and pin the sighting on a live interactive map — building a real-time, crowd-sourced biodiversity database.

**Core Features:**

- **📷 Snap & Identify** — Upload or capture a photo. Gemini Vision AI identifies the species, returning its common name, scientific name, category (mammal, bird, plant, insect, etc.), confidence level, and a fun fact.
- **📍 Automatic GPS** — GPS coordinates are automatically extracted from the photo's EXIF data. If unavailable, users place a pin on a manual location picker.
- **🗺️ Live Sighting Map** — Every sighting is plotted on a Leaflet.js map with custom category icons (leaf for plants, paw for animals, bug for insects, etc.). Click any marker to view details.
- **🔍 Species & Region Search** — A dedicated "Find" tab lets users search for a species by name (with autocomplete) or search a map region to see all recorded sightings within it.
- **🧬 Gemini "Learn More"** — Click "Learn More with Gemini" on any sighting to get a rich, AI-generated species profile with categorized sections (Appearance, Habitat, Conservation, Ecological Role) and emoji icons.
- **🌍 Biosphere Insight** — Select a region on the map, and Gemini generates an ecological summary analyzing the biodiversity patterns in that area.
- **🖼️ Wikipedia Images** — Species detail panels automatically fetch and display a reference photo from Wikipedia, with a lightbox zoom viewer.
- **🔒 Duplicate Detection** — SHA-256 image hashing prevents the same photo from being submitted twice.
- **📱 Mobile-First** — Fully responsive with a dedicated mobile camera interface, touch-friendly interactions, and adaptive layouts.

---

## How We Built It

**Frontend:** Next.js 16 (App Router) with React 19 and TypeScript. The UI is styled with Tailwind CSS v4, using Inter font from Google Fonts. The interactive maps are powered by Leaflet.js via `react-leaflet`, with custom SVG-based category icons for each species type.

**AI:** Google Gemini 2.5 Flash handles all AI tasks — species identification from photos, detailed species descriptions, and ecological region summaries. We use the official `@google/genai` SDK and prompt Gemini to return structured JSON, which we rigorously validate server-side before processing.

**Backend:** Next.js API routes handle all server-side logic. We built 6 API endpoints:
  - `/api/identify` — Sends the photo to Gemini, validates the response, hashes the image for duplicate detection, and saves the sighting to the database.
  - `/api/learn-more` — Generates detailed, sectioned species information via Gemini.
  - `/api/biosphere-summary` — Generates ecological insights for a map region.
  - `/api/search-species` — Autocomplete and occurrence lookup.
  - `/api/search-region` — Spatial bounding-box queries.
  - `/api/species-image` — Wikipedia image lookup.

**Database:** Supabase (managed PostgreSQL) stores all sightings with coordinates, species data, and image hashes. The Supabase REST API enables fast, type-safe queries from both client and server.

**GPS Extraction:** The `exifr` library parses EXIF metadata from uploaded photos to automatically extract GPS coordinates. When EXIF GPS isn't available, a manual location picker lets users tap-to-place on a map.

---

## Challenges We Ran Into

- **EXIF inconsistency** — Not all photos have GPS data, especially screenshots or images shared via messaging apps. We implemented a two-step fallback: EXIF extraction first, then a manual map-based location picker.
- **Leaflet + SSR** — Leaflet requires the `window` object and crashes during server-side rendering. We solved this with Next.js dynamic imports and `ssr: false`.
- **Gemini response validation** — AI responses can be unpredictable. We implemented strict JSON validation with type checking to ensure every Gemini response matches our expected schema before processing.
- **Duplicate uploads** — Users might accidentally submit the same photo twice. We implemented SHA-256 image hashing to detect and reject exact duplicates.
- **Emoji rendering** — Newer Unicode emojis (used as section icons in Gemini responses) rendered as squares on some systems. We fixed this by specifying emoji-specific font families in CSS.
- **Map icon layering** — Custom SVG map markers needed precise z-index management to ensure the pointer triangle rendered behind the circle icon.

---

## Accomplishments That We're Proud Of

- **End-to-end AI pipeline** — From photo capture to species identification to map pinning, the entire flow is seamless and takes under 5 seconds.
- **Rich species profiles** — The "Learn More with Gemini" feature generates detailed, dynamically sectioned descriptions with contextual emoji icons — every response is unique and informative.
- **Biosphere insights** — The AI can analyze all species in a map region and generate ecological observations about biodiversity patterns, habitat health, and notable species relationships.
- **Beautiful, polished UI** — Custom SVG category icons on the map, smooth fly-to animations, lightbox image viewer, autocomplete search, and a responsive mobile-first design.
- **Robust error handling** — Every API response is validated, every edge case has a fallback, and users get clear, friendly error messages.

---

## What We Learned

- How to integrate Google Gemini's vision capabilities for real-world image classification tasks.
- The importance of strict AI response validation — you can't trust an LLM to always return well-formed JSON.
- How to build spatial queries and bounding-box searches with Supabase/PostgreSQL.
- Strategies for handling EXIF metadata extraction and GPS fallbacks across different devices and image formats.
- The nuances of rendering Leaflet maps in a server-side rendered Next.js application.

---

## What's Next for FindMyFauna

- **User accounts & profiles** — Let users track their personal sighting history and earn badges for species diversity.
- **Photo gallery** — Store and display the original uploaded photos alongside each sighting.
- **Community features** — Comments, verification voting, and species correction suggestions.
- **Offline mode** — Queue sightings when offline and sync when connectivity returns.
- **Heatmaps & analytics** — Visualize biodiversity density and species distribution trends over time.
- **Native mobile app** — A React Native or PWA version for faster camera access and push notifications.

---

## Built With

- Next.js
- React
- TypeScript
- Tailwind CSS
- Google Gemini 2.5 Flash
- Supabase
- Leaflet.js
- exifr

---

## Try It Out

- **GitHub:** [your-repo-url]
- **Live Demo:** [your-demo-url]
