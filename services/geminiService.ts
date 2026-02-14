import { GoogleGenAI, Type } from "@google/genai";
import { Scene, StoryConfig, SHOT_TYPES } from "../types";

// Use Vite environment variable (VITE_ prefix required)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

// Default AI instance (may be empty - users provide their own key)
const ai = new GoogleGenAI({ apiKey: apiKey || "placeholder" });

// Helper to strip "data:image/xyz;base64," prefix
const stripBase64Prefix = (base64Str: string) => {
  return base64Str.replace(/^data:image\/\w+;base64,/, "");
};

// Helper to extract MIME type from a data URL
const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(image\/\w+);/);
  return match?.[1] || "image/jpeg";
};

// Cache for character description to avoid re-analyzing for each panel
let cachedCharacterDescription: string | null = null;

// 0. Analyze reference image to extract detailed character description
export const analyzeReferenceImage = async (
  referenceImage: string,
  style: string,
  apiKeyOverride?: string
): Promise<string> => {
  // Return cached description if available
  if (cachedCharacterDescription) return cachedCharacterDescription;

  try {
    const activeAi = apiKeyOverride ? new GoogleGenAI({ apiKey: apiKeyOverride }) : ai;
    const mimeType = getMimeType(referenceImage);
    const base64Image = stripBase64Prefix(referenceImage);

    const response = await activeAi.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          {
            text: `You are a character design analyst. Analyze this reference image and provide an extremely detailed character description that can be used to maintain consistency across multiple illustrations.

Describe the following in precise detail:
1. FACE: Face shape, eye shape/color, nose, mouth, eyebrows, skin tone (use specific color like "warm peach" not just "light")
2. HAIR: Exact hairstyle, hair color (specific shade), hair length, any accessories (ribbons, clips)
3. BODY: Approximate age, body type, height proportion
4. CLOTHING: Every piece of clothing in detail - colors, patterns, materials, how they fit
5. ACCESSORIES: Any accessories, shoes, items they're holding
6. OVERALL STYLE: The artistic style (e.g., "3D animated Pixar-like", "anime", "photorealistic")

Format your response as a single dense paragraph that can be directly inserted into an image generation prompt. 
Start with "Character: " and be as specific as possible.
Do NOT include any scene or background descriptions.
Keep it under 200 words.`
          },
        ],
      },
    });

    const description = response.text || "";
    cachedCharacterDescription = description;
    console.log("Character description extracted:", description);
    return description;
  } catch (error) {
    console.error("Error analyzing reference image:", error);
    return "Character from the reference image";
  }
};

// Reset character cache (call when starting a new generation)
export const resetCharacterCache = () => {
  cachedCharacterDescription = null;
};

// 1. Break the story into 9 scenes (Text Generation)
export const generateStoryBreakdown = async (
  storyText: string,
  style: string,
  apiKeyOverride?: string,
  modelName: string = "gemini-2.0-flash"
): Promise<Scene[]> => {
  try {
    const activeAi = apiKeyOverride ? new GoogleGenAI({ apiKey: apiKeyOverride }) : ai;
    const prompt = `
      You are a professional storyboard artist.
      Break down the following story into exactly 9 distinct scenes for a 3x3 visual sequence.
      
      Story: "${storyText}"
      Style: "${style}"

      Follow this narrative structure:
      1-2: Intro (World/Entrance)
      3-5: Development (Action/Relationship)
      6: Twist (Problem/Emotion Change)
      7-8: Climax
      9: Resolution

      For each scene:
      1. Assign the specific shot type based on the list below.
      2. Write a 'videoPrompt' that describes the motion and camera movement (e.g., "Slow zoom in", "Pan right", "Character runs towards camera") suitable for AI video generation.

      Shot Types per index:
      1: ${SHOT_TYPES[0]}
      2: ${SHOT_TYPES[1]}
      3: ${SHOT_TYPES[2]}
      4: ${SHOT_TYPES[3]}
      5: ${SHOT_TYPES[4]}
      6: ${SHOT_TYPES[5]}
      7: ${SHOT_TYPES[6]}
      8: ${SHOT_TYPES[7]}
      9: ${SHOT_TYPES[8]}

      Return ONLY a JSON array.
    `;

    const response = await activeAi.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              description: { type: Type.STRING, description: "One sentence visual scene summary." },
              caption: { type: Type.STRING, description: "A short, emotive caption (max 10 words)." },
              mood: { type: Type.STRING, description: "Lighting and emotional tone." },
              videoPrompt: { type: Type.STRING, description: "Detailed prompt for video generation tools. Describe specific camera movement and subject action." },
            },
            required: ["id", "description", "caption", "mood", "videoPrompt"],
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from Gemini");

    const scenes: any[] = JSON.parse(jsonText);

    // Merge with fixed shot types to ensure consistency
    return scenes.map((scene, index) => ({
      ...scene,
      shotType: SHOT_TYPES[index] || "Medium Shot"
    }));

  } catch (error) {
    console.error("Error breaking down story:", error);
    throw error;
  }
};

// 2. Generate a single panel image (Image Editing/Generation)
export const generatePanelImage = async (
  scene: Scene,
  config: StoryConfig
): Promise<string> => {
  try {
    const activeAi = config.userApiKey ? new GoogleGenAI({ apiKey: config.userApiKey }) : ai;
    if (!config.referenceImage) {
      throw new Error("Reference image is required for panel generation.");
    }

    // Step 1: Get character description (cached after first call)
    const characterDesc = await analyzeReferenceImage(
      config.referenceImage,
      config.style,
      config.userApiKey
    );

    const mimeType = getMimeType(config.referenceImage);
    const base64Image = stripBase64Prefix(config.referenceImage);

    // Step 2: Build enhanced prompt with character description
    const prompt = `
CRITICAL INSTRUCTION: You MUST maintain EXACT character consistency with the reference image.

${characterDesc}

SCENE INSTRUCTIONS:
- Scene: ${scene.description}
- Shot Type: ${scene.shotType}
- Mood/Lighting: ${scene.mood}
- Art Style: ${config.style}
- Aspect Ratio: ${config.aspectRatio}

CONSISTENCY RULES (MUST FOLLOW):
1. The character MUST look IDENTICAL to the reference image in every detail
2. Same face structure, same eye shape/color, same hair style/color
3. Same clothing and accessories unless the story explicitly changes them
4. Only the pose, expression, camera angle, and background should change
5. Maintain the same art style across all panels

OUTPUT RULES:
- Generate ONLY ONE character (the main character from the reference)
- Do NOT add extra copies of the character
- No text, no logo, no watermark
- High quality, detailed, professional illustration
    `;

    const response = await activeAi.models.generateContent({
      model: config.model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error(`Error generating panel ${scene.id}:`, error);
    throw error;
  }
};