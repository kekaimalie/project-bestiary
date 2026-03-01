import { NextRequest, NextResponse } from 'next/server';

// ─── Fetch a species thumbnail URL from Wikipedia's REST API ───
// Uses the Wikimedia REST API which is free and requires no API key.
// Tries scientific_name first (more specific), then falls back to common_name.

async function fetchWikipediaImage(title: string): Promise<string | null> {
    try {
        // Wikipedia page summary endpoint returns a thumbnail if available
        const encoded = encodeURIComponent(title.replace(/ /g, '_'));
        const res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
            {
                headers: { 'User-Agent': 'EcoMap/1.0 (biodiversity-mapping-tool)' },
                next: { revalidate: 86400 }, // Cache for 24 hours
            }
        );

        if (!res.ok) return null;

        const data = await res.json();

        // The API returns originalimage (full res) and thumbnail (smaller)
        // Prefer originalimage for better quality, fallback to thumbnail
        const imageUrl =
            data?.originalimage?.source ??
            data?.thumbnail?.source ??
            null;

        return imageUrl;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { common_name, scientific_name } = body ?? {};

        if (
            typeof common_name !== 'string' || !common_name.trim() ||
            typeof scientific_name !== 'string' || !scientific_name.trim()
        ) {
            return NextResponse.json(
                { error: 'Provide common_name and scientific_name.' },
                { status: 400 }
            );
        }

        // Try scientific name first (more likely to match a species article)
        let imageUrl = await fetchWikipediaImage(scientific_name);

        // Fall back to common name if scientific name didn't yield a result
        if (!imageUrl) {
            imageUrl = await fetchWikipediaImage(common_name);
        }

        return NextResponse.json({ imageUrl });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('Species image API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
