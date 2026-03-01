import { NextRequest, NextResponse } from 'next/server';
import { geminiClient, parseGeminiJsonResponse } from '@/lib/gemini';

interface SpeciesEntry {
    common_name: string;
    scientific_name: string;
    category: string;
    count: number;
}

interface Bounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

/**
 * Build the Gemini prompt for a biosphere insight.
 */
function buildPrompt(bounds: Bounds, species: SpeciesEntry[]): string {
    const speciesList = species
        .map(s => `- ${s.common_name} (${s.scientific_name}) [${s.category}] — ${s.count} sighting(s)`)
        .join('\n');

    return `You are an ecologist and biodiversity expert. A user is viewing a map region bounded by:
  North: ${bounds.north.toFixed(4)}, South: ${bounds.south.toFixed(4)}, East: ${bounds.east.toFixed(4)}, West: ${bounds.west.toFixed(4)}

The following species have been recorded in this area:
${speciesList}

Based on the geographic coordinates and the species list, provide a brief ecological insight.
Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "summary": "2-3 sentences summarizing the biodiversity and ecological character of this region.",
  "highlights": [
    "A short, interesting observation or pattern (e.g. 'High bird diversity suggests healthy riparian habitat.')",
    "Another highlight",
    "Another highlight"
  ]
}
Provide 3-4 highlights. Keep each highlight to one concise sentence.`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { bounds, species } = body ?? {};

        // ── Validate bounds ──
        if (
            !bounds ||
            typeof bounds.north !== 'number' ||
            typeof bounds.south !== 'number' ||
            typeof bounds.east !== 'number' ||
            typeof bounds.west !== 'number'
        ) {
            return NextResponse.json(
                { error: 'Provide valid bounding-box coordinates (north, south, east, west).' },
                { status: 400 }
            );
        }

        // ── Validate species list ──
        if (!Array.isArray(species) || species.length === 0) {
            return NextResponse.json(
                { error: 'Provide a non-empty species array.' },
                { status: 400 }
            );
        }

        // ── Call Gemini ──
        const response = await geminiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [buildPrompt(bounds as Bounds, species as SpeciesEntry[])],
        });

        const rawText = response.text ?? '';
        const parsed = parseGeminiJsonResponse(rawText);

        if (!parsed) {
            return NextResponse.json(
                { error: 'AI returned an invalid response. Please try again.' },
                { status: 502 }
            );
        }

        const obj = parsed as Record<string, unknown>;

        if (typeof obj?.summary === 'string' && Array.isArray(obj?.highlights)) {
            return NextResponse.json({
                success: true,
                summary: (obj.summary as string).trim(),
                highlights: (obj.highlights as string[]).map(h => String(h).trim()),
            });
        }

        return NextResponse.json(
            { error: 'AI response did not include a valid summary.' },
            { status: 502 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('Biosphere summary API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
