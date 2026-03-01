import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// ─── Gemini client (singleton, reused across requests) ───
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

const LEARN_MORE_PROMPT = (commonName: string, scientificName: string) =>
    `You are a biodiversity expert. Provide a detailed description of the species "${commonName}" (${scientificName}).
Return ONLY a valid JSON object with a "sections" array. Choose 3-4 appropriate headers depending on what is being detailed (e.g., a plant might have "Growth Cycle" or "Uses" instead of "Behavior").
Each section should have:
- "header": a short, appropriate title (e.g., "Appearance", "Habitat", "Conservation", "Toxicity", "Behavior")
- "content": 1-2 sentences of detail
- "icon": a single relevant emoji
Ensure the output is strictly valid JSON with this structure:
{
  "sections": [
    { "header": "Appearance", "content": "...", "icon": "🔍" }
  ]
}`;

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

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [LEARN_MORE_PROMPT(common_name, scientific_name)],
        });

        const rawText = response.text ?? '';
        const cleanText = rawText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

        let parsed: unknown;
        try {
            parsed = JSON.parse(cleanText);
        } catch {
            console.error('Gemini returned unparseable JSON:', rawText);
            return NextResponse.json(
                { error: 'AI returned an invalid response. Please try again.' },
                { status: 502 }
            );
        }

        const obj = parsed as Record<string, unknown>;

        // Support new dynamic sections array format
        if (Array.isArray(obj?.sections)) {
            const sections = obj.sections as Array<{ header: string, content: string, icon: string }>;
            const description = sections.map(s => s.content).join(' ');
            return NextResponse.json({ success: true, description, sections });
        }

        // Support structured sections (old format fallback)
        if (typeof obj?.appearance === 'string' && typeof obj?.habitat === 'string') {
            const sections = {
                appearance: (obj.appearance as string).trim(),
                habitat: (obj.habitat as string).trim(),
                behavior: typeof obj.behavior === 'string' ? (obj.behavior as string).trim() : '',
                conservation: typeof obj.conservation === 'string' ? (obj.conservation as string).trim() : '',
            };
            // Also build a flat description for backwards compatibility / caching
            const description = [sections.appearance, sections.habitat, sections.behavior, sections.conservation]
                .filter(Boolean)
                .join(' ');
            return NextResponse.json({ success: true, description, sections });
        }

        // Fallback: old-style single description
        if (typeof obj?.description === 'string' && obj.description.trim()) {
            return NextResponse.json({ success: true, description: obj.description.trim() });
        }

        return NextResponse.json(
            { error: 'AI response did not include a valid description.' },
            { status: 502 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('Learn more API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

