import OpenAI from 'openai';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const MEMORIES_BASE_URL = 'https://api.memories.ai/serve/api/v2';

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
// Memories AI — Upload video, poll until ready, then query
// ─────────────────────────────────────────────
async function analyzeVideoWithMemoriesAI(filePath, prompt) {
    const apiKey = process.env.MEMORIES_AI_API_KEY;
    if (!apiKey) throw new Error('MEMORIES_AI_API_KEY is not set');

    const authHeaders = { Authorization: apiKey };

    // Step 1: Upload the video
    console.log('[MemoriesAI] Uploading video:', filePath);
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadRes = await fetch(`${MEMORIES_BASE_URL}/upload`, {
        method: 'POST',
        headers: { ...authHeaders, ...form.getHeaders() },
        body: form
    });

    const uploadText = await uploadRes.text();
    console.log('[MemoriesAI] Upload response:', uploadText);

    if (!uploadRes.ok) {
        throw new Error(`MemoriesAI upload failed (${uploadRes.status}): ${uploadText}`);
    }

    const uploadData = JSON.parse(uploadText);

    // Step 2: Query the video with the prompt
    // Try to use the query endpoint first, fallback to chat
    console.log('[MemoriesAI] Querying video analysis...');
    
    // Try /query endpoint
    const queryRes = await fetch(`${MEMORIES_BASE_URL}/query`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            file: uploadData?.data?.file || uploadData?.data?.fileName || uploadData?.data?.url,
            query: prompt,
            ...(uploadData?.data?.videoNo && { videoNo: uploadData.data.videoNo }),
            ...(uploadData?.data?.id && { id: uploadData.data.id })
        })
    });

    const queryText = await queryRes.text();
    console.log('[MemoriesAI] Query response:', queryText);

    if (!queryRes.ok) {
        // Fallback: try /chat endpoint
        console.log('[MemoriesAI] /query failed, trying /chat...');
        const chatRes = await fetch(`${MEMORIES_BASE_URL}/chat`, {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: uploadData?.data?.file || uploadData?.data?.fileName || uploadData?.data?.url,
                query: prompt,
                ...(uploadData?.data?.videoNo && { videoNo: uploadData.data.videoNo }),
                ...(uploadData?.data?.id && { id: uploadData.data.id })
            })
        });

        const chatText = await chatRes.text();
        console.log('[MemoriesAI] Chat response:', chatText);

        if (!chatRes.ok) {
            throw new Error(`MemoriesAI query failed (${chatRes.status}): ${chatText}`);
        }

        const chatData = JSON.parse(chatText);
        const chatAnswer = chatData?.data?.answer || chatData?.data?.response || chatData?.answer || chatData?.response || chatData?.result || '';
        if (!chatAnswer) throw new Error(`MemoriesAI: Empty answer: ${chatText}`);
        return chatAnswer;
    }

    const queryData = JSON.parse(queryText);
    const answerText = queryData?.data?.answer || queryData?.data?.response || queryData?.answer || queryData?.response || queryData?.result || '';
    if (!answerText) {
        throw new Error(`MemoriesAI: Empty answer from query: ${queryText}`);
    }

    return answerText;
}


// ─────────────────────────────────────────────
// ANALYZE APPEAL MEDIA (image → OpenAI, video → MemoriesAI)
// ─────────────────────────────────────────────
const ANALYZE_PROMPT = `
Siz Azərbaycanda yerli hökumət "ASAN" vətəndaş müraciət sisteminin AI köməkçisisiniz.
Bu şəkil/videonu (bildirilmiş problem) analiz edin.

VACIB: "title" və "description" sahələri MÜTLƏQ Azərbaycan dilində yazılmalıdır.

Siz YALNIZ aşağıdakı strukturla düzgün JSON obyekti qaytarmalısınız, markdown formatlaşdırma və ya əlavə mətn olmadan:
{
  "no_problem_detected": true/false,
  "title": "Problemi ümumiləşdirən qısa 3-5 sözdən ibarət başlıq (Azərbaycan dilində)",
  "description": "Göstərilən problemi ətraflı təsvir edən 3-5 cümlədən ibarət DETALLI mətn (Azərbaycan dilində). Problemin nə olduğunu, yerini, vəziyyətin ciddiliyini və vətəndaşlara təsirini ətraflı şəkildə izah edin.",
  "category": "One of: Roads & Transport, Utilities, Parks & Environment, Public Safety, Waste Management, Building & Infrastructure, Other",
  "priority": "One of: Low, Medium, High, Critical",
  "location": {
     "gps_confidence": 0.5,
     "visual_landmarks": ["landmark1", "landmark2"]
  },
  "confidence_scores": {
     "description": 0.9,
     "category": 0.9,
     "priority": 0.8
  }
}

Qaydalar:
- Şəkil/video ictimai infrastruktur problemi, şəhər məsələsi göstərmirsə (məs: selfie, yemək, heyvanlar, şəxsi ev fotoları), "no_problem_detected" true qoyun. Bu halda digər sahələri placeholder ilə doldurun.
- Real ictimai problem varsa (sınıq yollar, zədələnmiş infrastruktur, tullantı, daşqın, təhlükəli şərait), "no_problem_detected" false qoyun.
- "title" və "description" MÜTLƏQƏTDİ Azərbaycan dilində olmalıdır.
- "description" ən azı 3-5 cümlə olmalıdır.
- "category" mütləq siyahıdan (İngilis dilində) seçilməlidir.
- "priority" mütləq siyahıdan (İngilis dilində) seçilməlidir.
- Bütün sahələr HƏMIŞƏ doldurulmalıdır.
`;

export const analyzeAppealMedia = async (filePath, mimeType) => {
    const MAX_RETRIES = 3;

    if (isVideo(mimeType)) {
        // ── VIDEO: Use Memories AI ──
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const rawAnswer = await analyzeVideoWithMemoriesAI(filePath, ANALYZE_PROMPT);

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
  - Focus on shared environmental features: nearby buildings, street signs, road markings, curbs, sidewalks, walls, fences, trees, poles, utility infrastructure, terrain shape, and surrounding architecture.
  - Even if only a FEW recognizable features overlap between the two images, consider them the same location.
  - Different lighting conditions (day vs evening, sunny vs cloudy) do NOT mean different location.
  - Only mark same_location as FALSE if the surroundings are clearly and obviously from a completely different place with no shared features at all.
  
  AI-GENERATED IMAGE DETECTION GUIDELINES:
  - Look for unnaturally smooth or perfect surfaces
  - Check for warped or distorted edges
  - Look for inconsistent lighting, shadows that don't match light sources
  - Real photos have noise/grain — AI images are often too clean
  - If there is ANY doubt, mark is_ai_generated as TRUE. Err on the side of caution.
  
  You MUST return ONLY a valid JSON object matching exactly this structure:
  {
    "same_location": true/false,
    "issue_resolved": true/false,
    "is_ai_generated": true/false,
    "mismatch_warning": true/false,
    "confidence": Number between 0 and 1,
    "ai_detection_reason": "Brief explanation"
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
        console.error('OpenAI Verify Error:', error);
        throw new Error(error.message || 'Failed to verify media via OpenAI.');
    }
};
