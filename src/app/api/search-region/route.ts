import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/search-region?north=...&south=...&east=...&west=...
 *
 * Returns all sightings whose coordinates fall within the given bounding box.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    const north = parseFloat(searchParams.get('north') ?? '');
    const south = parseFloat(searchParams.get('south') ?? '');
    const east = parseFloat(searchParams.get('east') ?? '');
    const west = parseFloat(searchParams.get('west') ?? '');

    // Validate that all four bounds are valid numbers
    if ([north, south, east, west].some(Number.isNaN)) {
        return NextResponse.json(
            { error: 'Missing or invalid bounding-box parameters. Provide north, south, east, west.' },
            { status: 400 }
        );
    }

    try {
        const { data, error } = await supabase
            .from('sightings')
            .select('*')
            .gte('latitude', south)
            .lte('latitude', north)
            .gte('longitude', west)
            .lte('longitude', east)
            .order('common_name', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ results: data ?? [] });
    } catch (err) {
        console.error('Region search error:', err);
        return NextResponse.json({ error: 'Failed to search region.' }, { status: 500 });
    }
}
