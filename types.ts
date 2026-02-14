export interface StoryConfig {
  storyText: string;
  aspectRatio: '16:9' | '9:16';
  style: string;
  showCaptions: boolean;
  referenceImage: string | null; // Base64 string
  userApiKey?: string; // Optional user-provided API key
  model: string;
}

export interface Scene {
  id: number;
  description: string;
  caption: string;
  shotType: string;
  mood: string;
  videoPrompt: string;
}

export interface GeneratedPanel {
  id: number;
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  sceneData: Scene;
}

export enum AppState {
  INPUT = 'INPUT',
  PLANNING = 'PLANNING', // Generating text breakdown
  GENERATING = 'GENERATING', // Generating images
  COMPLETE = 'COMPLETE'
}

export const SHOT_TYPES = [
  "Establishing wide shot",
  "Medium shot",
  "Close-up (emotion)",
  "3/4 angle or over-the-shoulder",
  "Action mid shot",
  "Detail shot (hands / object)",
  "Dramatic angle (low or backlight)",
  "Wide environmental shot",
  "Calm closing shot"
];