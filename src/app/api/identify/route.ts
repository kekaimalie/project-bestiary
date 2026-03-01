import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import type { GeminiIdentificationResult, IdentifyRequestBody } from '@/lib/types';

// ─── Gemini client (singleton, reused across requests) ───
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

// ─── Valid categories and confidence levels for validation ───
const VALID_CATEGORIES = new Set([
    'mammal', 'bird', 'reptile', 'amphibian', 'fish',
    'insect', 'arachnid', 'plant', 'fungus', 'other',
]);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);

/**
 * Validates that the Gemini output has all required fields and correct values.
 * Returns a clean, typed object or null if validation fails.
 */
function validateGeminiResult(raw: unknown): (GeminiIdentificationResult & { is_living_species: boolean }) | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    const { common_name, scientific_name, category, confidence, fun_fact, description, is_living_species } = obj;

    if (
        typeof is_living_species !== 'boolean' ||
        typeof common_name !== 'string' || !common_name.trim() ||
        typeof scientific_name !== 'string' || !scientific_name.trim() ||
        typeof category !== 'string' || !VALID_CATEGORIES.has(category) ||
        typeof confidence !== 'string' || !VALID_CONFIDENCE.has(confidence) ||
        typeof fun_fact !== 'string' || !fun_fact.trim() ||
        typeof description !== 'string' || !description.trim()
    ) {
        return null;
    }

    return {
        is_living_species,
        common_name: common_name.trim(),
        scientific_name: scientific_name.trim(),
        category: category as GeminiIdentificationResult['category'],
        confidence: confidence as GeminiIdentificationResult['confidence'],
        fun_fact: fun_fact.trim(),
        description: description.trim(),
    };
}

/**
 * Validates the incoming request body from the client.
 */
function validateRequestBody(body: unknown): IdentifyRequestBody | null {
    if (!body || typeof body !== 'object') return null;
    const obj = body as Record<string, unknown>;

    const { image, latitude, longitude, mimeType } = obj;

    if (
        typeof image !== 'string' || !image.includes(',') ||
        typeof latitude !== 'number' || !isFinite(latitude) ||
        typeof longitude !== 'number' || !isFinite(longitude) ||
        typeof mimeType !== 'string' || !mimeType.startsWith('image/')
    ) {
        return null;
    }

    return { image, latitude, longitude, mimeType };
}

// ─── The identification prompt (kept as a constant for clarity) ───
const IDENTIFICATION_PROMPT = `You are a biodiversity expert. Identify the main subject in this image.
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "is_living_species": true // true ONLY if the main subject is a recognizable living species (plant, animal, insect, fungus, sea creature, etc.). False otherwise (e.g., cars, buildings, random objects).
  "common_name": "the common English name",
  "scientific_name": "the binomial Latin name",
  "category": "one of: mammal, bird, reptile, amphibian, fish, insect, arachnid, plant, fungus, other",
  "confidence": "one of: high, medium, low",
  "fun_fact": "one engaging sentence about this species",
  "description": "2-3 sentences describing the species' appearance, typical habitat, and notable behavior"
}`;

export async function POST(req: NextRequest) {
    try {
        // 1. Parse and validate request body
        const body = await req.json();
        const validBody = validateRequestBody(body);
        if (!validBody) {
            return NextResponse.json(
                { error: 'Invalid request. Provide image (base64 data URL), latitude, longitude, and mimeType.' },
                { status: 400 }
            );
        }

        const { image, latitude, longitude, mimeType } = validBody;

        // Extract the raw base64 data (strip the "data:image/...;base64," prefix)
        const base64Data = image.split(',')[1];

        // 2. Hash the image and check for exact duplicates
        const imageHash = crypto.createHash('sha256').update(base64Data).digest('hex');

        const { data: existingDuplicate } = await supabase
            .from('sightings')
            .select('id')
            .eq('image_hash', imageHash)
            .single();

        if (existingDuplicate) {
            return NextResponse.json(
                { error: 'This exact photo has already been uploaded!' },
                { status: 409 }
            );
        }

        // 3. Send to Gemini for identification
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                IDENTIFICATION_PROMPT,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType,
                    },
                },
            ],
        });

        // 4. Parse and validate the AI response
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

        const result = validateGeminiResult(parsed);
        if (!result) {
            console.error('Gemini result failed validation:', parsed);
            return NextResponse.json(
                { error: 'AI response did not match expected format. Please try again.' },
                { status: 502 }
            );
        }

        if (!result.is_living_species) {
            return NextResponse.json(
                { error: 'No recognizable living species (plant, animal, insect, etc.) found in this photo. Please try another image.' },
                { status: 400 }
            );
        }

        if (result.confidence === 'low') {
            return NextResponse.json(
                { error: "We're not confident enough to identify this. Please try a clearer photo or a different angle." },
                { status: 400 }
            );
        }

        // 5. Save to Supabase (description is ephemeral — NOT stored)
        const { description, is_living_species, ...dbFields } = result;
        const { data: sighting, error: dbError } = await supabase
            .from('sightings')
            .insert({
                ...dbFields,
                latitude,
                longitude,
                image_hash: imageHash,
            })
            .select()
            .single();

        if (dbError) {
            console.error('Supabase insert error:', dbError);
            return NextResponse.json(
                { error: 'Failed to save sighting to database.' },
                { status: 500 }
            );
        }

        // 5. Return the saved sighting + ephemeral description
        return NextResponse.json({ success: true, sighting, description });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('Unhandled API error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
