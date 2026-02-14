import React, { useState, useCallback } from 'react';
import { StoryInput } from './components/StoryInput';
import { Storyboard } from './components/Storyboard';
import { AppState, GeneratedPanel, Scene, StoryConfig } from './types';
import { generatePanelImage, generateStoryBreakdown } from './services/geminiService';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [storyConfig, setStoryConfig] = useState<StoryConfig | null>(null);
  const [panels, setPanels] = useState<GeneratedPanel[]>([]);

  // Initialize empty panels based on scenes
  const initializePanels = (scenes: Scene[]) => {
    return scenes.map(scene => ({
      id: scene.id,
      sceneData: scene,
      imageUrl: null,
      isLoading: true,
      error: null
    }));
  };

  const handleStart = async (config: StoryConfig) => {
    setStoryConfig(config);
    setAppState(AppState.PLANNING);

    try {
      // Step 1: Break down story (always use gemini-2.0-flash for text)
      const scenes = await generateStoryBreakdown(config.storyText, config.style, config.userApiKey, "gemini-2.0-flash");
      const initialPanels = initializePanels(scenes);
      setPanels(initialPanels);
      setAppState(AppState.GENERATING);

      // Step 2: Generate images in batches
      const batchSize = 3;
      for (let i = 0; i < initialPanels.length; i += batchSize) {
        const batch = initialPanels.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(panel => generatePanelImage(panel.sceneData, config)
            .then(imageUrl => ({ id: panel.id, imageUrl, error: null }))
            .catch((err) => ({ id: panel.id, imageUrl: null, error: err instanceof Error ? err.message : "Generation Failed" }))
          )
        );

        // Apply batch results to state at once
        setPanels(prev => {
          const updated = [...prev];
          for (const result of results) {
            if (result.status === 'fulfilled') {
              const idx = updated.findIndex(p => p.id === result.value.id);
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], imageUrl: result.value.imageUrl, isLoading: false, error: result.value.error };
              }
            }
          }
          return updated;
        });
      }

      setAppState(AppState.COMPLETE);

    } catch (error) {
      console.error("Critical error in workflow:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Simulation Failed: ${errorMessage}`);
      setAppState(AppState.INPUT);
    }
  };

  const generateSinglePanel = async (id: number, scene: Scene, config: StoryConfig) => {
    // Update state to loading for this specific panel (if retrying)
    setPanels(prev => prev.map(p =>
      p.id === id ? { ...p, isLoading: true, error: null } : p
    ));

    try {
      const imageUrl = await generatePanelImage(scene, config);
      setPanels(prev => prev.map(p =>
        p.id === id ? { ...p, imageUrl, isLoading: false } : p
      ));
    } catch (error) {
      setPanels(prev => prev.map(p =>
        p.id === id ? { ...p, isLoading: false, error: error instanceof Error ? error.message : "Generation Failed" } : p
      ));
    }
  };

  const handleRegenerate = (panelId: number) => {
    const panel = panels.find(p => p.id === panelId);
    if (panel && storyConfig) {
      generateSinglePanel(panelId, panel.sceneData, storyConfig);
    }
  };

  const handleReset = useCallback(() => {
    setAppState(AppState.INPUT);
    setStoryConfig(null);
    setPanels([]);
  }, []);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 mb-8 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-500 to-purple-500 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">3x3 Story Sequence Maker</h1>
          </div>
          {appState !== AppState.INPUT && (
            <div className="text-sm text-slate-400">
              Using Gemini 2.5 Flash
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4">
        {appState === AppState.INPUT ? (
          <StoryInput onStart={handleStart} isProcessing={false} />
        ) : appState === AppState.PLANNING ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-semibold text-white">Analyzing Story Structure...</h3>
            <p className="text-slate-400 mt-2">Breaking down narrative into 9 key scenes</p>
          </div>
        ) : storyConfig ? (
          <Storyboard
            panels={panels}
            config={storyConfig}
            onRegenerate={handleRegenerate}
            onReset={handleReset}
          />
        ) : null}
      </main>
    </div>
  );
}