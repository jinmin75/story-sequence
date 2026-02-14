import { GoogleGenerativeAI } from "@google/generative-ai";
import { Scene, StoryConfig, SHOT_TYPES } from "../types";

// Allow empty API key in environment - users will provide their own
const envApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

// Helper to lazily create AI client
const getAiClient = (userKey?: string) => {
  const key = (userKey || envApiKey).trim(); // Remove whitespace from key
  if (!key) {
    throw new Error("Gemini API Key is missing. Please enter your key.");
  }
  return new GoogleGenerativeAI(key);
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
  modelName: string = "gemini-1.5-flash"
): Promise<Scene[]> => {
  try {
    const genAI = getAiClient(apiKeyOverride);

    // Determine configuration based on model version
    // JSON mode is supported in Gemini 1.5+ models
    const isJsonModeSupported = modelName.includes("1.5") || modelName.includes("2.0");

    const modelConfig: any = {
      model: modelName
    };

    if (isJsonModeSupported) {
      modelConfig.generationConfig = { responseMimeType: "application/json" };
    }

    const model = genAI.getGenerativeModel(modelConfig);

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
      - "shot_type": (One of the values from the provided SHOT_TYPES list, e.g. "Extreme Long Shot")
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const rawScenes = JSON.parse(cleanText);

    // Map raw response to Scene interface
    return rawScenes.map((s: any, index: number) => ({
      id: index + 1,
      description: s.description,
      caption: s.text || s.caption,
      shotType: s.shot_type || s.shotType,
      mood: "Cinematic",
      videoPrompt: s.description
    })) as Scene[];
  } catch (error) {
    console.error("Error generating breakdown:", error);
    throw error;
  }
};

// 2. Generate Image for a Panel (Image Generation)
// Note: This currently mocks image generation by returning text, 
// as standard Gemini Flash models do not generate images directly.
export const generatePanelImage = async (
  scene: Scene,
  style: string,
  aspectRatio: string,
  modelName: string,
  referenceImage?: string,
  apiKeyOverride?: string
): Promise<string> => {
  try {
    const genAI = getAiClient(apiKeyOverride);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Create a detailed text description for an image generation model (like DALL-E or Midjourney) 
      based on this storyboard scene.
      
      Scene ID: ${scene.id}
      Style: ${style}
      Shot Type: ${scene.shotType}
      Description: ${scene.description}
      Aspect Ratio: ${aspectRatio}
    `;

    let contents: any[] = [prompt];

    if (referenceImage) {
      const base64Data = stripBase64Prefix(referenceImage);
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
      contents[0] += "\n\n(Reference image provided for character consistency)";
    }

    const result = await model.generateContent(contents);
    const response = await result.response;
    const text = response.text();

    // In a real implementation with Imagen, we would return the image URL/Base64 here.
    // Since we are using Flash, we return the text. 
    // The UI should handle this or we can use a placeholder image service.

    // Returning a placeholder image URL for now to prevent broken images in UI, 
    // or the text if the UI expects text. 
    // But the return type is Promise<string> which is assigned to imageUrl.

    // Let's return the text for now, assuming the UI might display it or handling is needed.
    // Actually, to make the UI look good, let's use a placeholder service with the text as seed?
    // limits: 2048 chars for some services.

    // For now, let's just return the description text. The UI might show broken image icon 
    // but at least it won't crash.
    return "https://via.placeholder.com/1024x576.png?text=Image+Generation+Not+Implemented+for+Gemini+Flash";
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};