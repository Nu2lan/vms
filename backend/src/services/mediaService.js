// src/services/mediaService.js
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const MAVI_BASE_URL = "https://mavi-backend.memories.ai/serve/api/v2";
const METADATA_POLL_MS = 2000;
const METADATA_MAX_WAIT_MS = 120000;
const DEFAULT_VLM_MODEL = "gemini:gemini-2.5-flash";

function memoriesAuthHeader() {
    const key = process.env.MEMORIES_AI_API_KEY;
    if (!key?.trim()) {
        throw new Error("MEMORIES_AI_API_KEY is not configured");
    }
    return { Authorization: key.trim() };
}

function isVideo(mimeType) {
    return typeof mimeType === "string" && mimeType.startsWith("video/");
}

function fileToDataUrl(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Media file not found on disk: ${filePath}. Cannot perform AI verification.`);
    }
    const base64 = Buffer.from(fs.readFileSync(filePath)).toString("base64");
    return `data:${mimeType};base64,${base64}`;
}

function unwrapMemoriesError(err) {
    const d = err.response?.data;
    if (d && typeof d === "object") {
        return d.msg || d.message || JSON.stringify(d);
    }
    return err.message || "Memories.ai API request failed";
}

async function uploadVideoAsset(filePath) {
    const originalFilename = path.basename(filePath);
    const signedUrlRes = await axios.post(
        `${MAVI_BASE_URL}/upload/signed-url`,
        { original_filename: originalFilename },
        {
            headers: {
                ...memoriesAuthHeader(),
                "Content-Type": "application/json",
            },
        }
    );

    const signedBody = signedUrlRes.data;
    const assetId = signedBody?.data?.asset_id;
    const signedUrl = signedBody?.data?.signed_url;
    if (!assetId || !signedUrl) {
        throw new Error(signedBody?.msg || "Failed to get upload signed URL");
    }

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    await axios.post(signedUrl, form, {
        headers: {
            ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });

    return { assetId, fileUri: signedUrl };
}

async function waitForAssetReady(assetId) {
    const started = Date.now();
    while (Date.now() - started < METADATA_MAX_WAIT_MS) {
        const res = await axios.get(`${MAVI_BASE_URL}/${assetId}/metadata`, {
            headers: memoriesAuthHeader(),
        });
        const body = res.data;
        const resource = body?.data?.resource?.[0];
        const status = resource?.upload_status;
        if (status === "SUCCESS") {
            return;
        }
        if (status === "FAILED") {
            throw new Error("Memories.ai upload processing failed for asset");
        }
        await new Promise((r) => setTimeout(r, METADATA_POLL_MS));
    }
    throw new Error("Timed out waiting for Memories.ai asset to be ready");
}

function extractVlmText(data) {
    const choice = data?.choices?.[0];
    if (!choice) {
        return "";
    }
    if (typeof choice.text === "string") {
        return choice.text;
    }
    if (choice.message?.content != null) {
        return String(choice.message.content);
    }
    return "";
}

/**
 * Upload video to MAVI, then run Gemini VLM with the returned asset_id as file reference.
 */
async function analyzeVideoWithMemoriesAI(filePath, mimeType, prompt) {
    const model = process.env.MEMORIES_VLM_MODEL?.trim() || DEFAULT_VLM_MODEL;

    const { assetId, fileUri } = await uploadVideoAsset(filePath);
    console.log("[MemoriesAI] Uploaded asset_id:", assetId);
    await waitForAssetReady(assetId);

    const userContent = [{ type: "text", text: prompt }];
    if (model.startsWith("nova:")) {
        userContent.push({
            type: "video_url",
            video_url: { url: fileUri },
        });
    } else {
        userContent.push({
            type: "input_file",
            file_uri: fileUri,
            mime_type: mimeType || "video/mp4",
        });
    }

    const payload = {
        model,
        messages: [
            {
                role: "system",
                content:
                    "You are a JSON-only assistant. Always respond with a valid JSON object containing all requested fields. Never refuse to analyze a video.",
            },
            {
                role: "user",
                content: userContent,
            },
        ],
        max_tokens: 2000,
        temperature: 0.3,
    };

    let res;
    try {
        res = await axios.post(`${MAVI_BASE_URL}/vu/chat/completions`, payload, {
            headers: {
                ...memoriesAuthHeader(),
                "Content-Type": "application/json",
            },
        });
    } catch (err) {
        console.error("[MemoriesAI] VLM 4xx/5xx details:", err.response?.data || err.message);
        throw err;
    }

    const body = res.data;
    if (body?.failed === true || (body?.code != null && body.code !== 200)) {
        throw new Error(body?.msg || "VLM request failed");
    }

    const text = extractVlmText(body);
    if (!text?.trim()) {
        throw new Error("Empty response from Memories.ai VLM");
    }
    return text;
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
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const rawAnswer = await analyzeVideoWithMemoriesAI(filePath, mimeType, ANALYZE_PROMPT);

                const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON found in MemoriesAI response");

                const result = JSON.parse(jsonMatch[0]);
                if (result.title && result.description && result.category && result.priority) {
                    return result;
                }
                console.warn(`[MemoriesAI] Attempt ${attempt}: Missing required fields, retrying...`);
            } catch (error) {
                console.error(`[MemoriesAI] Attempt ${attempt} error:`, error.message);
                if (attempt === MAX_RETRIES) {
                    throw new Error(unwrapMemoriesError(error) || "Video analysis failed via MemoriesAI.");
                }
            }
        }
        throw new Error("Video AI analysis failed after multiple attempts.");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageUrl = fileToDataUrl(filePath, mimeType);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a JSON-only assistant. Always respond with a valid JSON object containing all requested fields. Never refuse to analyze an image.",
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: ANALYZE_PROMPT },
                            { type: "image_url", image_url: { url: imageUrl } },
                        ],
                    },
                ],
                max_tokens: 2000,
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
            if (attempt === MAX_RETRIES) throw new Error(error.message || "Image analysis failed via OpenAI.");
        }
    }
    throw new Error("AI analysis failed after multiple attempts. Please try again.");
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
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: originalUrl, detail: "high" } },
                        { type: "image_url", image_url: { url: resolutionUrl, detail: "high" } },
                    ],
                },
            ],
            max_tokens: 1000,
        });

        const responseText = response.choices[0].message.content;
        return JSON.parse(responseText);
    } catch (error) {
        console.error("OpenAI Verify Error:", error);
        throw new Error(error.message || "Failed to verify media via OpenAI.");
    }
};
