import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/search-species?q=<term>
 *   → Returns distinct species matching the query (for autocomplete dropdown).
 *
 * GET /api/search-species?name=<exact_common_name>
 *   → Returns all sighting rows for that exact species (for occurrence list).
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    const query = searchParams.get('q')?.trim();
    const exactName = searchParams.get('name')?.trim();

    // ── Mode 1: Autocomplete suggestions ──
    if (query) {
        try {
            const { data, error } = await supabase
                .from('sightings')
                .select('common_name, scientific_name, category')
                .or(`common_name.ilike.%${query}%,scientific_name.ilike.%${query}%`)
                .order('common_name', { ascending: true });

            if (error) throw error;

            // Deduplicate by common_name and count occurrences
            const speciesMap = new Map<string, {
                common_name: string;
                scientific_name: string;
                category: string;
                count: number;
            }>();

            for (const row of data ?? []) {
                const key = row.common_name.toLowerCase();
                if (speciesMap.has(key)) {
                    speciesMap.get(key)!.count += 1;
                } else {
                    speciesMap.set(key, {
                        common_name: row.common_name,
                        scientific_name: row.scientific_name,
                        category: row.category,
                        count: 1,
                    });
                }
            }

            return NextResponse.json({
                suggestions: Array.from(speciesMap.values()),
            });
        } catch (err) {
            console.error('Species autocomplete error:', err);
            return NextResponse.json({ error: 'Autocomplete search failed.' }, { status: 500 });
        }
    }

    // ── Mode 2: All occurrences of a specific species ──
    if (exactName) {
        try {
            const { data, error } = await supabase
                .from('sightings')
                .select('*')
                .ilike('common_name', exactName)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return NextResponse.json({ occurrences: data ?? [] });
        } catch (err) {
            console.error('Species occurrence lookup error:', err);
            return NextResponse.json({ error: 'Occurrence lookup failed.' }, { status: 500 });
        }
    }

    return NextResponse.json(
        { error: 'Provide either ?q=<search_term> or ?name=<species_name>.' },
        { status: 400 }
    );
}
