import { GoogleGenAI } from '@google/genai';

/**
 * Singleton instance of the Gemini API client.
 * Reused across API routes to avoid recreating the client repeatedly.
 */
export const geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

/**
 * Robustly parses JSON responses from the Gemini API.
 * Strips out markdown code blocks and handles potential parsing errors.
 * 
 * @param rawText The raw text response from the Gemini API
 * @returns The parsed JSON object, or null if parsing fails
 */
export function parseGeminiJsonResponse<T>(rawText: string): T | null {
    const cleanText = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    try {
        return JSON.parse(cleanText) as T;
    } catch (err) {
        console.error('Gemini returned unparseable JSON:', rawText, err);
        return null;
    }
}
