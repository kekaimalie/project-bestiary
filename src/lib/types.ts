// ─── Shared types used across the app ───

/** Represents a single wildlife/plant sighting stored in Supabase */
export type Sighting = {
    id: string;
    common_name: string;
    scientific_name: string;
    category: SightingCategory;
    confidence: ConfidenceLevel;
    fun_fact: string;
    latitude: number;
    longitude: number;
    created_at: string;
};

/** Valid species categories returned by the AI */
export type SightingCategory =
    | 'mammal'
    | 'bird'
    | 'reptile'
    | 'amphibian'
    | 'fish'
    | 'insect'
    | 'arachnid'
    | 'plant'
    | 'fungus'
    | 'other';

/** Confidence level of the AI identification */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Shape of the JSON the Gemini API is expected to return */
export type GeminiIdentificationResult = {
    common_name: string;
    scientific_name: string;
    category: SightingCategory;
    confidence: ConfidenceLevel;
    fun_fact: string;
    description: string; // appearance, habitat, behavior — ephemeral, NOT stored in DB
};

/** Payload sent from the client to POST /api/identify */
export type IdentifyRequestBody = {
    image: string;       // base64 data URL
    latitude: number;
    longitude: number;
    mimeType: string;    // e.g. "image/jpeg"
};

/** Successful response from POST /api/identify */
export type IdentifyResponse = {
    success: true;
    sighting: Sighting;
    description: string; // ephemeral species description (not stored in DB)
};

/** Payload sent from the client to POST /api/learn-more */
export type LearnMoreRequestBody = {
    common_name: string;
    scientific_name: string;
};

/** Response from POST /api/learn-more */
export type LearnMoreResponse = {
    success: true;
    description: string;
};

/** Error response from POST /api/identify */
export type IdentifyErrorResponse = {
    error: string;
};

/** Valid MIME types we accept for image uploads */
export const ACCEPTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
] as const;

/** Max image size in bytes before we compress (5 MB) */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
