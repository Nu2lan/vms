import OpenAI from 'openai';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Helper to convert local file to base64 data URL for OpenAI vision
function fileToDataUrl(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Media file not found on disk: ${filePath}. Cannot perform AI verification.`);
    }
    const base64 = Buffer.from(fs.readFileSync(filePath)).toString('base64');
    return `data:${mimeType};base64,${base64}`;
}

// ─── memories.ai Video Analysis ───────────────────────────────────────────────
// Uploads the video file and returns a plain-language description in Azerbaijani.
async function analyzeVideoWithMemoriesAI(filePath, mimeType) {
    const apiKey = process.env.MEMORISE_API_KEY;
    if (!apiKey) throw new Error('MEMORISE_API_KEY is not set.');

    if (!fs.existsSync(filePath)) {
        throw new Error(`Video file not found: ${filePath}`);
    }

    console.log('[MemoriesAI] Uploading video for analysis...');

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename: filePath.split('/').pop() || 'video.mp4',
        contentType: mimeType
    });
    form.append('prompt', `Bu videonu Azərbaycan dilində ətraflı təsvir et. Videoda gördüyün problemi, yerini, şiddətini və vətəndaşlara təsirini izah et. Yalnız Azərbaycan dilində yaz.`);

    // Try synchronous caption endpoint first
    let response;
    try {
        response = await fetch('https://api.memories.ai/v1/video/caption', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...form.getHeaders()
            },
            body: form
        });
    } catch (err) {
        throw new Error(`MemoriesAI network error: ${err.message}`);
    }

    const data = await response.json();
    console.log('[MemoriesAI] Response:', JSON.stringify(data));

    if (!response.ok) {
        throw new Error(`MemoriesAI API error ${response.status}: ${data?.message || JSON.stringify(data)}`);
    }

    // Extract description from response (try common field names)
    const description = data.caption || data.description || data.text || data.result || data.output;
    if (!description) {
        throw new Error(`MemoriesAI returned no description. Response: ${JSON.stringify(data)}`);
    }

    return description;
}

// ─── OpenAI Structured Analysis from text description ─────────────────────────
async function structureWithOpenAI(openai, videoDescription) {
    const prompt = `
  You are an AI assistant for a local government "ASAN" citizen appeal system in Azerbaijan.
  A video was analyzed and the following description was extracted (in Azerbaijani):
  
  "${videoDescription}"
  
  Based on this description, generate a structured appeal report.
  
  IMPORTANT: The "title" and "description" fields MUST be written in Azerbaijani language.
  
  You MUST return ONLY a valid JSON object matching exactly this structure, no markdown:
  {
    "no_problem_detected": true/false,
    "title": "Problemi ümumiləşdirən qısa 3-5 sözdən ibarət başlıq (Azərbaycan dilində)",
    "description": "Göstərilən problemi ətraflı təsvir edən 3-5 cümlədən ibarət DETALLI mətn (Azərbaycan dilində).",
    "category": "One of: Roads & Transport, Utilities, Parks & Environment, Public Safety, Waste Management, Building & Infrastructure, Other",
    "priority": "One of: Low, Medium, High, Critical",
    "location": {
       "gps_confidence": 0.5,
       "visual_landmarks": []
    },
    "confidence_scores": {
       "description": 0.9,
       "category": 0.8,
       "priority": 0.8
    }
  }
  
  Rules:
  - If the description does NOT describe any public infrastructure problem ASAN can resolve, set "no_problem_detected" to true.
  - "category" and "priority" must be strictly from the listed options (keep in English).
  - Title and description must be in Azerbaijani.
  `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: 'You are a JSON-only assistant. Always respond with a valid JSON object.' },
            { role: 'user', content: prompt }
        ],
        max_tokens: 1500
    });

    return JSON.parse(response.choices[0].message.content);
}

// ─── Main Export: analyzeAppealMedia ─────────────────────────────────────────
export const analyzeAppealMedia = async (filePath, mimeType) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const isVideo = mimeType.startsWith('video/');

    // VIDEO: memories.ai → description → OpenAI structure
    if (isVideo) {
        console.log('[Analysis] Video detected — using memories.ai + OpenAI pipeline');
        const MAX_RETRIES = 2;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const videoDescription = await analyzeVideoWithMemoriesAI(filePath, mimeType);
                console.log('[MemoriesAI] Description:', videoDescription);
                const result = await structureWithOpenAI(openai, videoDescription);
                if (result.title && result.description && result.category && result.priority) {
                    return result;
                }
                console.warn(`[OpenAI] Attempt ${attempt}: Missing fields, retrying...`);
            } catch (error) {
                console.error(`[Video Analysis] Attempt ${attempt} error:`, error.message);
                if (attempt === MAX_RETRIES) throw error;
            }
        }
        throw new Error('Video AI analysis failed after multiple attempts.');
    }

    // IMAGE: direct OpenAI Vision
    console.log('[Analysis] Image detected — using OpenAI Vision');
    const prompt = `
  You are an AI assistant for a local government "ASAN" citizen appeal system in Azerbaijan.
  Analyze this image of a reported problem. 
  
  IMPORTANT: The "title" and "description" fields MUST be written in Azerbaijani language (Azərbaycan dili).
  
  You MUST return ONLY a valid JSON object matching exactly this structure, no markdown formatting or extra text:
  {
    "no_problem_detected": true/false,
    "title": "Problemi ümumiləşdirən qısa 3-5 sözdən ibarət başlıq (Azərbaycan dilində)",
    "description": "Göstərilən problemi ətraflı təsvir edən 3-5 cümlədən ibarət DETALLI mətn (Azərbaycan dilində). Problemin nə olduğunu, yerini, vəziyyətin ciddiliyini və vətəndaşlara təsirini ətraflı şəkildə izah edin.",
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
  - If the image does NOT show any public infrastructure problem ASAN can resolve, set "no_problem_detected" to true.
  - "title" and "description" MUST be in Azerbaijani language.
  - "category" must be strictly from the listed options (keep in English).
  - "priority" must be strictly from the listed options (keep in English).
  - You MUST always return ALL fields in the JSON structure.
  `;

    const imageUrl = fileToDataUrl(filePath, mimeType);
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You are a JSON-only assistant. Always respond with a valid JSON object containing all requested fields. Never refuse to analyze an image.' },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                max_tokens: 2000
            });

            const result = JSON.parse(response.choices[0].message.content);
            if (result.title && result.description && result.category && result.priority) {
                return result;
            }
            console.warn(`[OpenAI] Attempt ${attempt}: Missing required fields, retrying...`);
        } catch (error) {
            console.error(`[OpenAI] Attempt ${attempt} error:`, error.message);
            if (attempt === MAX_RETRIES) throw new Error(error.message || 'Failed to analyze media via OpenAI.');
        }
    }

    throw new Error('AI analysis failed after multiple attempts. Please try again.');
};



export const verifyResolutionMedia = async (originalFilePath, originalMimeType, resolutionFilePath, resolutionMimeType) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const originalUrl = fileToDataUrl(originalFilePath, originalMimeType);
    const resolutionUrl = fileToDataUrl(resolutionFilePath, resolutionMimeType);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: originalUrl, detail: 'high' } },
                        { type: 'image_url', image_url: { url: resolutionUrl, detail: 'high' } }
                    ]
                }
            ],
            max_tokens: 1000
        });

        const responseText = response.choices[0].message.content;
        return JSON.parse(responseText);
    } catch (error) {
        console.error("OpenAI Verify Error:", error);
        throw new Error(error.message || "Failed to verify media via OpenAI.");
    }
};
