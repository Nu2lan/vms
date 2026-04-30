import OpenAI from 'openai';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const MEMORIES_BASE_URL = 'https://api.memories.ai/serve/api/v1';

// Helper to detect if file is a video by mimeType
function isVideo(mimeType) {
    return mimeType && mimeType.startsWith('video/');
}

// Helper to convert local file to base64 data URL for OpenAI vision
function fileToDataUrl(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Media file not found on disk: ${filePath}`);
    }
    const base64 = Buffer.from(fs.readFileSync(filePath)).toString('base64');
    return `data:${mimeType};base64,${base64}`;
}

// ─────────────────────────────────────────────
// Memories AI — Upload video, then analyze via VLM (OpenAI-compatible)
// ─────────────────────────────────────────────
async function analyzeVideoWithMemoriesAI(filePath, mimeType, prompt) {
    const apiKey = process.env.MEMORIES_AI_API_KEY;
    if (!apiKey) throw new Error('MEMORIES_AI_API_KEY is not set');

    // Step 1: Upload the video file to get asset_id
    console.log('[MemoriesAI] Uploading video:', filePath);
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadRes = await fetch(`${MEMORIES_BASE_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: apiKey, ...form.getHeaders() },
        body: form
    });

    const uploadText = await uploadRes.text();
    console.log('[MemoriesAI] Upload response:', uploadText);

    if (!uploadRes.ok) {
        throw new Error(`MemoriesAI upload failed (${uploadRes.status}): ${uploadText}`);
    }

    const uploadData = JSON.parse(uploadText);
    if (!uploadData?.success || !uploadData?.data?.asset_id) {
        throw new Error(`MemoriesAI upload failed: ${uploadText}`);
    }

    const assetId = uploadData.data.asset_id;
    console.log('[MemoriesAI] Got asset_id:', assetId);

    // Step 2: Wait for upload processing to complete
    // Check metadata until upload_status is SUCCESS
    console.log('[MemoriesAI] Checking upload status...');
    const MAX_POLL = 30;
    const POLL_INTERVAL = 3000;

    for (let poll = 1; poll <= MAX_POLL; poll++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));

        try {
            const metaRes = await fetch(`${MEMORIES_BASE_URL}/metadata/${assetId}`, {
                headers: { Authorization: apiKey }
            });

            if (metaRes.ok) {
                const metaData = await metaRes.json();
                const status = metaData?.data?.upload_status || '';
                console.log(`[MemoriesAI] Poll ${poll}: upload_status = ${status}`);

                if (status === 'SUCCESS') break;
                if (status === 'FAILED') throw new Error('MemoriesAI: Video upload processing FAILED');
            }
        } catch (err) {
            if (err.message.includes('FAILED')) throw err;
            console.warn(`[MemoriesAI] Status check error (poll ${poll}):`, err.message);
        }

        if (poll === MAX_POLL) {
            console.warn('[MemoriesAI] Polling timed out, proceeding anyway...');
        }
    }

    // Step 3: Use VLM endpoint (OpenAI-compatible) to analyze the video
    // The VLM endpoint uses the same OpenAI chat.completions format
    console.log('[MemoriesAI] Analyzing video via VLM...');

    const memoriesClient = new OpenAI({
        apiKey: apiKey,
        baseURL: `${MEMORIES_BASE_URL}/vu`
    });

    const response = await memoriesClient.chat.completions.create({
        model: 'gemini:gemini-2.5-flash',
        messages: [
            {
                role: 'system',
                content: 'You are a JSON-only assistant. Always respond with a valid JSON object containing all requested fields. Never refuse to analyze a video.'
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'input_file',
                        file_uri: `asset://${assetId}`,
                        mime_type: mimeType || 'video/mp4'
                    }
                ]
            }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        n: 1,
        stream: false
    });

    // Response format: { choices: [{ text: "..." }] }
    const answerText = response?.choices?.[0]?.text
        || response?.choices?.[0]?.message?.content
        || '';

    console.log('[MemoriesAI] VLM response:', answerText);

    if (!answerText) {
        throw new Error(`MemoriesAI VLM returned empty response: ${JSON.stringify(response)}`);
    }

    return answerText;
}

// ─────────────────────────────────────────────
// ANALYZE APPEAL MEDIA (image → OpenAI, video → MemoriesAI)
// ─────────────────────────────────────────────
const ANALYZE_PROMPT = `
You are an AI assistant for a local government "ASAN" citizen appeal system in Azerbaijan.
Analyze this image (or video frame) of a reported problem. 

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
- If the image does NOT show any public infrastructure problem, city issue, or something that ASAN public services can resolve (e.g. selfies, food, animals, random objects, indoor personal photos), set "no_problem_detected" to true. In that case, still fill in the other fields with placeholder values.
- If the image DOES show a real public problem (broken roads, damaged infrastructure, waste, flooding, unsafe conditions, etc.), set "no_problem_detected" to false.
- The "title" and "description" MUST be in Azerbaijani language.
- The "description" MUST be detailed and comprehensive, at least 3-5 sentences long. Describe what you see, the nature of the problem, its potential impact, and urgency.
- Do not hallucinate. If completely unclear, set confidence scores very low.
- "category" must be strictly from the listed options (keep in English).
- "priority" must be strictly from the listed options (keep in English).
- You MUST always return ALL fields in the JSON structure. Never omit any field.
`;

export const analyzeAppealMedia = async (filePath, mimeType) => {
    const MAX_RETRIES = 3;

    if (isVideo(mimeType)) {
        // ── VIDEO: Use Memories AI VLM ──
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const rawAnswer = await analyzeVideoWithMemoriesAI(filePath, mimeType, ANALYZE_PROMPT);

                // Try to parse JSON from the answer
                const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON found in MemoriesAI response');

                const result = JSON.parse(jsonMatch[0]);
                if (result.title && result.description && result.category && result.priority) {
                    return result;
                }
                console.warn(`[MemoriesAI] Attempt ${attempt}: Missing required fields, retrying...`);
            } catch (error) {
                console.error(`[MemoriesAI] Attempt ${attempt} error:`, error.message);
                if (attempt === MAX_RETRIES) throw new Error(error.message || 'Video analysis failed via MemoriesAI.');
            }
        }
        throw new Error('Video AI analysis failed after multiple attempts.');
    } else {
        // ── IMAGE: Use OpenAI GPT-4o ──
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const imageUrl = fileToDataUrl(filePath, mimeType);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a JSON-only assistant. Always respond with a valid JSON object containing all requested fields. Never refuse to analyze an image.'
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: ANALYZE_PROMPT },
                                { type: 'image_url', image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                    max_tokens: 2000
                });

                const responseText = response.choices[0].message.content;
                console.log(`[OpenAI] Attempt ${attempt} raw response:`, responseText);
                const result = JSON.parse(responseText);

                if (result.title && result.description && result.category && result.priority) {
                    return result;
                }
                console.warn(`[OpenAI] Attempt ${attempt}: Missing required fields, retrying...`);
            } catch (error) {
                console.error(`[OpenAI] Attempt ${attempt} error:`, error.message);
                if (attempt === MAX_RETRIES) throw new Error(error.message || 'Image analysis failed via OpenAI.');
            }
        }
        throw new Error('AI analysis failed after multiple attempts. Please try again.');
    }
};

// ─────────────────────────────────────────────
// VERIFY RESOLUTION MEDIA (always images → OpenAI)
// ─────────────────────────────────────────────
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
