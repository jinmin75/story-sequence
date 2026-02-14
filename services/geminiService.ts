import { GoogleGenAI } from "@google/genai";
import { Scene, StoryConfig, SHOT_TYPES } from "../types";

// Allow empty API key in environment - users will provide their own
const envApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

// Helper to lazily create AI client
const getAiClient = (userKey?: string) => {
  const key = (userKey || envApiKey).trim();
  if (!key) {
    throw new Error("Gemini API Key is missing. Please enter your key.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper to strip "data:image/xyz;base64," prefix
const stripBase64Prefix = (base64Str: string) => {
  return base64Str.replace(/^data:image\/\w+;base64,/, "");
};

// 1. Break the story into 9 scenes (Text Generation)
export const generateStoryBreakdown = async (
  storyText: string,
  style: string,
  apiKeyOverride?: string,
  modelName: string = "gemini-2.0-flash"
): Promise<Scene[]> => {
  try {
    const ai = getAiClient(apiKeyOverride);

    const prompt = `
      You are a professional storyboard artist.
      Break down the following story into exactly 9 distinct scenes for a 3x3 visual sequence.
      
      Story: "${storyText}"
      Style: "${style}"

      Follow this narrative arc:
      1. Intro / World / Entrance
      2. Development / Action / Relationship
      3. Twist / Problem / Emotion / Change
      4. Climax / Resolution

      For each scene, assign the specific shot type from the list below:
      ${JSON.stringify(SHOT_TYPES)}

      Return ONLY a JSON array. Each item must have:
      - "scene_number": (1-9)
      - "description": (Detailed visual description for image generation)
      - "text": (Short caption for the panel, max 20 words)
      - "shot_type": (One of the values from the provided SHOT_TYPES list)
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    // IMPORTANT: In @google/genai, response.text is a PROPERTY, not a method!
    const text = response.text ?? "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const rawScenes = JSON.parse(cleanText);

    // Map raw response to Scene interface
    return rawScenes.map((s: any, index: number) => ({
      id: s.scene_number || index + 1,
      description: s.description,
      caption: s.text || s.caption || "",
      shotType: s.shot_type || s.shotType || "Medium shot",
      mood: "Cinematic",
      videoPrompt: s.description
    })) as Scene[];
  } catch (error) {
    console.error("Error generating breakdown:", error);
    throw error;
  }
};

// 2. Generate Image for a Panel (Image Generation)
export const generatePanelImage = async (
  scene: Scene,
  style: string,
  aspectRatio: string,
  modelName: string,
  referenceImage?: string,
  apiKeyOverride?: string
): Promise<string> => {
  try {
    const ai = getAiClient(apiKeyOverride);

    const prompt = `
      Create a detailed visual description for an image of this storyboard scene.
      
      Scene ID: ${scene.id}
      Style: ${style}
      Shot Type: ${scene.shotType}
      Description: ${scene.description}
      Aspect Ratio: ${aspectRatio}
      
      Requirements:
      - High quality, detailed, professional storyboard art
      - No text, no logo, no watermark inside the image
      - IMPORTANT: Respect the requested Shot Type strictly.
    `;

    let contents: any = prompt;

    // If reference image provided, add it to contents as multimodal input
    if (referenceImage) {
      const base64Data = stripBase64Prefix(referenceImage);
      contents = [
        prompt + "\n\nUse the uploaded image as a strict character reference.",
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
    });

    // IMPORTANT: response.text is a PROPERTY, not a method!
    const text = response.text ?? "";

    // Generate a placeholder image as SVG data URI (no external dependency)
    const width = aspectRatio === "9:16" ? 576 : 1024;
    const height = aspectRatio === "9:16" ? 1024 : 576;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#1e293b"/>
      <text x="50%" y="45%" text-anchor="middle" fill="#60a5fa" font-size="24" font-family="Arial">Scene ${scene.id}</text>
      <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="Arial">${scene.shotType || 'Shot'}</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};