import { GoogleGenAI, Type } from "@google/genai";
import { Scene, StoryConfig, SHOT_TYPES } from "../types";

// Allow empty API key in environment - users will provide their own
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";

// Create default AI instance (will be overridden if user provides their own key)
const ai = new GoogleGenAI({ apiKey });

// Helper to strip "data:image/xyz;base64," prefix
const stripBase64Prefix = (base64Str: string) => {
  return base64Str.replace(/^data:image\/\w+;base64,/, "");
};

// Helper to extract MIME type from a data URL
const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(image\/\w+);/);
  return match?.[1] || "image/jpeg";
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

    const mimeType = getMimeType(config.referenceImage);
    const base64Image = stripBase64Prefix(config.referenceImage);

    const prompt = `
Use the uploaded image as the exact character reference.
Keep character identity unchanged: same face features, hairstyle, outfit, age, body shape.

Aspect ratio: ${config.aspectRatio}

Scene: ${scene.description}
Shot: ${scene.shotType}
Environment: detailed background fitting the story
Lighting: ${scene.mood}
Mood: ${scene.mood}
Style: ${config.style}

No text, no logo, no watermark. High quality, detailed.
    `;

    const getModelForImage = (model: string) => {
      if (model === "gemini-2.5-flash") return "gemini-2.5-flash-image";
      // The 3.0 Pro Image Preview already has image in name
      return model;
    };

    const response = await activeAi.models.generateContent({
      model: getModelForImage(config.model),
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