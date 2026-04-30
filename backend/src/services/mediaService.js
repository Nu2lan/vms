// src/services/mediaService.js
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}
const VIDEO_FRAME_COUNT = 6;

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

function extractJsonFromText(text, provider = "AI") {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error(`No JSON found in ${provider} response`);
    }
    return JSON.parse(jsonMatch[0]);
}

function listFrameFiles(framesDir) {
    return fs.readdirSync(framesDir)
        .filter((f) => f.startsWith("frame-") && f.endsWith(".jpg"))
        .sort()
        .map((f) => path.join(framesDir, f));
}

async function extractVideoFrames(filePath, frameCount = VIDEO_FRAME_COUNT) {
    const framesDir = path.join(os.tmpdir(), `appeal-frames-${Date.now()}`);
    fs.mkdirSync(framesDir, { recursive: true });
    const outputPattern = path.join(framesDir, "frame-%02d.jpg");

    await new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .outputOptions(["-vf", `fps=1`, "-frames:v", String(frameCount), "-q:v", "2"])
            .output(outputPattern)
            .on("end", resolve)
            .on("error", reject)
            .run();
    });

    const frames = listFrameFiles(framesDir);
    if (frames.length === 0) {
        throw new Error("Failed to extract frames from video");
    }
    return { framesDir, frames };
}

/**
 * Analyze video using OpenAI frame-by-frame then summarize.
 */
async function analyzeVideoWithOpenAIFrames(filePath, prompt) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { framesDir, frames } = await extractVideoFrames(filePath, VIDEO_FRAME_COUNT);

    try {
        const frameObservations = [];
        for (let i = 0; i < frames.length; i++) {
            const frameDataUrl = fileToDataUrl(frames[i], "image/jpeg");
            const frameResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You analyze one video frame. Return concise factual observations only.",
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `Frame ${i + 1}/${frames.length}: identify visible civic/public issues, severity clues, location landmarks. Keep under 5 short bullet points.` },
                            { type: "image_url", image_url: { url: frameDataUrl, detail: "high" } },
                        ],
                    },
                ],
                max_tokens: 300,
            });

            const obs = frameResponse.choices?.[0]?.message?.content?.trim() || "";
            frameObservations.push(`Frame ${i + 1}:\n${obs}`);
        }

        const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You are a JSON-only assistant. Always respond with valid JSON containing all requested fields.",
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `${prompt}\n\nUse these frame-by-frame observations as your video context:\n${frameObservations.join("\n\n")}`,
                        },
                    ],
                },
            ],
            max_tokens: 2000,
        });

        return summaryResponse.choices?.[0]?.message?.content || "";
    } finally {
        if (fs.existsSync(framesDir)) {
            for (const file of fs.readdirSync(framesDir)) {
                fs.unlinkSync(path.join(framesDir, file));
            }
            fs.rmdirSync(framesDir);
        }
    }
}

// ─────────────────────────────────────────────
// ANALYZE APPEAL MEDIA (image → OpenAI, video → OpenAI frames)
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
                const rawAnswer = await analyzeVideoWithOpenAIFrames(filePath, ANALYZE_PROMPT);
                const result = extractJsonFromText(rawAnswer, "OpenAI");
                if (result.title && result.description && result.category && result.priority) {
                    return result;
                }
                console.warn(`[OpenAI-Video] Attempt ${attempt}: Missing required fields, retrying...`);
            } catch (error) {
                console.error(`[OpenAI-Video] Attempt ${attempt} error:`, error.message);
                if (attempt === MAX_RETRIES) {
                    throw new Error(error.message || "Video analysis failed via OpenAI.");
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
