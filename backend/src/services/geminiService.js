import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// Helper to convert local file to the format required by the new @google/genai SDK
function fileToGenerativePart(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Media file not found on disk: ${filePath}. Cannot perform AI verification.`);
    }
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType
        },
    };
}

export const analyzeAppealMedia = async (filePath, mimeType) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
  You are an AI assistant for a local government "ASAN" citizen appeal system in Azerbaijan.
  Analyze this image (or video frame) of a reported problem. 
  
  IMPORTANT: The "title" and "description" fields MUST be written in Azerbaijani language (Azərbaycan dili).
  
  You MUST return ONLY a valid JSON object matching exactly this structure, no markdown formatting or extra text:
  {
    "title": "Problemi ümumiləşdirən qısa 3-5 sözdən ibarət başlıq (Azərbaycan dilində)",
    "description": "Göstərilən problemi təsvir edən avtomatik yaradılmış qısa mətn (Azərbaycan dilində)",
    "category": "One of: Roads & Transport, Utilities, Parks & Environment, Public Safety, Waste Management, Building & Infrastructure, Other",
    "priority": "One of: Low, Medium, High, Critical",
    "location": {
       "gps_confidence": Number between 0 and 1,
       "visual_landmarks": ["Array", "of", "strings"]
    },
    "confidence_scores": {
       "description": Number between 0 and 1,
       "category": Number between 0 and 1,
       "priority": Number between 0 and 1
    }
  }
  
  Rules:
  - The "title" and "description" MUST be in Azerbaijani language.
  - Do not hallucinate. If completely unclear, set confidence scores very low.
  - "category" must be strictly from the listed options (keep in English).
  - "priority" must be strictly from the listed options (keep in English).
  `;

    const imagePart = fileToGenerativePart(filePath, mimeType);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                imagePart,
            ],
            config: {
                responseMimeType: 'application/json'
            }
        });

        let responseText = response.text;
        // Strip out markdown code blocks if Gemini ignores the json mime-type and sends them anyway
        if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        }
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Gemini Analyze Error:", error);
        throw new Error(error.message || "Failed to analyze media via Gemini.");
    }
};

export const verifyResolutionMedia = async (originalFilePath, originalMimeType, resolutionFilePath, resolutionMimeType) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
  You are an expert AI forensics analyst auditing an issue resolution for a citizen appeal platform.
  I am providing two images. First is the "Before" (the reported issue). Second is the "After" (the purported resolution).
  
  Compare them and determine:
  1. Are they from the same LOCATION?
  2. Is the issue actually resolved in the "After" image?
  3. CRITICAL - Is the "After" image AI-generated, manipulated, or fake? You MUST be VERY STRICT about this. 
  
  SAME LOCATION GUIDELINES (VERY IMPORTANT):
  - The "Before" and "After" photos will almost ALWAYS be taken from DIFFERENT camera angles, positions, distances, and perspectives. This is COMPLETELY NORMAL and expected — do NOT treat different angles as evidence of a different location.
  - Focus on shared environmental features to determine same location: nearby buildings, street signs, road markings, curbs, sidewalks, walls, fences, trees, poles, utility infrastructure, terrain shape, and surrounding architecture.
  - Even if only a FEW recognizable features overlap between the two images, consider them the same location.
  - Different lighting conditions (day vs evening, sunny vs cloudy) do NOT mean different location.
  - Different zoom levels or crops do NOT mean different location.
  - Only mark same_location as FALSE if the surroundings, environment, and context are clearly and obviously from a completely different place with no shared features at all.
  
  AI-GENERATED IMAGE DETECTION GUIDELINES (apply ALL of these):
  - Look for unnaturally smooth or perfect surfaces (real pavements have imperfections, cracks, dirt, stains)
  - Check for warped or distorted edges, especially around objects meeting backgrounds
  - Look for inconsistent lighting, shadows that don't match light sources
  - Check for impossible or unrealistic geometry in bricks, tiles, or pavement patterns
  - Look for blurry or smeared areas, especially at object boundaries
  - Check if textures repeat unnaturally or have "dreamy" quality
  - Real photos have noise/grain, especially in low light - AI images are often too clean
  - Check for AI watermarks or artifacts in corners (e.g., small symbols)
  - If the "After" image looks "too perfect" or "too clean" compared to the "Before", it is likely AI-generated
  - Compare the photographic style: real phone photos have lens distortion, natural white balance variation
  - If there is ANY doubt, mark is_ai_generated as TRUE. Err on the side of caution.
  
  You MUST return ONLY a valid JSON object matching exactly this structure:
  {
    "same_location": true/false,
    "issue_resolved": true/false,
    "is_ai_generated": true/false,
    "mismatch_warning": true/false (true if they are not the same location OR the issue isn't resolved OR it is AI generated),
    "confidence": Number between 0 and 1,
    "ai_detection_reason": "Brief explanation of why the image was or wasn't flagged as AI-generated"
  }
  `;

    const originalPart = fileToGenerativePart(originalFilePath, originalMimeType);
    const resolutionPart = fileToGenerativePart(resolutionFilePath, resolutionMimeType);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                originalPart,
                resolutionPart,
            ],
            config: {
                responseMimeType: 'application/json'
            }
        });

        let responseText = response.text;
        if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        }
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Gemini Verify Error:", error);
        throw new Error(error.message || "Failed to verify media via Gemini.");
    }
};
