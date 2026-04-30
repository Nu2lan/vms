// src/services/mediaService.js
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

class MemoriesAIService {
    constructor() {
        this.apiKey = process.env.MEMORIES_AI_API_KEY;
        this.baseUrl = "https://api.memories.ai/v1";
        this.pollInterval = 2000;
    }

    /** ---------------------
     *  Base Request Wrapper
     * --------------------- */
    async request(method, url, data, headers = {}) {
        try {
            const res = await axios({
                method,
                url: `${this.baseUrl}${url}`,
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    ...headers,
                },
                data,
            });

            return res.data;
        } catch (err) {
            console.error("[MemoriesAI] Error:", err.response?.data || err.message);
            throw new Error(err.response?.data?.message || "MemoriesAI API request failed");
        }
    }

    /** ---------------------
     *  Step 1 — Upload file
     * --------------------- */
    async uploadMedia(filePath) {
        const form = new FormData();
        form.append("file", fs.createReadStream(filePath));

        const res = await this.request(
            "POST",
            "/upload",
            form,
            form.getHeaders()
        );

        const fileUrl = res?.data?.fileUrl;

        if (!fileUrl) {
            throw new Error("Upload failed: No fileUrl returned");
        }

        return fileUrl;
    }

    /** -------------------------------
     *  Step 2 — Create VLM task
     * ------------------------------- */
    async createVisionTask(fileUrl, prompt) {
        const payload = {
            model: "vlm",
            input: [
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: prompt },
                        { type: "input_image", image_url: fileUrl }
                    ],
                },
            ],
        };

        const res = await this.request("POST", "/task", payload);

        const taskId = res?.data?.task_id;

        if (!taskId) {
            throw new Error("Failed to create task: No task_id returned");
        }

        return taskId;
    }

    /** -------------------------------
     *  Step 3 — Poll task status
     * ------------------------------- */
    async pollTask(taskId) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                try {
                    const res = await this.request("GET", `/task/${taskId}`);

                    if (res?.data?.status === "SUCCESS") {
                        clearInterval(interval);
                        resolve(res.data);
                    }

                    if (res?.data?.status === "FAILED") {
                        clearInterval(interval);
                        reject(new Error("MemoriesAI Task Failed"));
                    }
                } catch (err) {
                    clearInterval(interval);
                    reject(err);
                }
            }, this.pollInterval);
        });
    }

    /** -------------------------------
     *  Master: Upload → Analyze
     * ------------------------------- */
    async analyzeMedia(filePath, prompt) {
        // 1. Upload media
        const fileUrl = await this.uploadMedia(filePath);
        console.log("[MemoriesAI] Uploaded:", fileUrl);

        // 2. Create task
        const taskId = await this.createVisionTask(fileUrl, prompt);
        console.log("[MemoriesAI] Task created:", taskId);

        // 3. Poll until result
        const result = await this.pollTask(taskId);

        return result?.output_text || result;
    }
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
