import React from 'react';
import { GeneratedPanel, StoryConfig } from '../types';

interface StoryboardProps {
  panels: GeneratedPanel[];
  config: StoryConfig;
  onRegenerate: (panelId: number) => void;
  onReset: () => void;
}

export const Storyboard: React.FC<StoryboardProps> = ({ panels, config, onRegenerate, onReset }) => {
  const isLandscape = config.aspectRatio === '16:9';

  const handleDownload = async (imageUrl: string, id: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `story-scene-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback to direct data URL download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `story-scene-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          Your Story Sequence
        </h2>
        <p className="text-slate-400 mt-2">Style: {config.style}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {panels.map((panel) => (
          <div
            key={panel.id}
            className="bg-slate-800 rounded-lg overflow-hidden shadow-xl border border-slate-700 flex flex-col"
          >
            {/* Image Container */}
            <div
              className={`relative w-full bg-black flex items-center justify-center overflow-hidden
                ${isLandscape ? 'aspect-video' : 'aspect-[9/16]'}`}
            >
              {panel.isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 animate-pulse">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-blue-400 text-sm font-medium">Generating Scene {panel.id}...</p>
                  <p className="text-slate-500 text-xs mt-2 px-4 text-center">{panel.sceneData.shotType}</p>
                </div>
              ) : panel.error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 text-center p-4">
                  <p className="text-red-400 font-bold mb-2">Generation Failed</p>
                  <button
                    onClick={() => onRegenerate(panel.id)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : panel.imageUrl ? (
                <>
                  <img
                    src={panel.imageUrl}
                    alt={`Scene ${panel.id}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover Overlay for Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <button
                      onClick={() => onRegenerate(panel.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-medium shadow-lg transform scale-95 hover:scale-100 transition-all flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span>Regenerate Image</span>
                    </button>

                    <button
                      onClick={() => handleDownload(panel.imageUrl!, panel.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-medium shadow-lg transform scale-95 hover:scale-100 transition-all flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download Image</span>
                    </button>
                  </div>
                </>
              ) : null}

              {/* Shot Type Badge */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80 font-mono border border-white/10 pointer-events-none">
                #{panel.id} {panel.sceneData.shotType}
              </div>
            </div>

            {/* Caption / Description / Video Prompt */}
            <div className="p-4 flex-1 bg-slate-800 border-t border-slate-700 flex flex-col gap-3">
              {/* Story Text */}
              <div>
                {config.showCaptions && (
                  <p className="text-white font-serif italic mb-1">"{panel.sceneData.caption}"</p>
                )}
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider">Action: </span>
                  {panel.sceneData.description}
                </p>
              </div>

              {/* Video Prompt Section */}
              <div className="pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-emerald-400 text-[10px] uppercase tracking-wider flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Video Prompt
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(panel.sceneData.videoPrompt)}
                    className="text-[10px] text-slate-500 hover:text-white transition-colors flex items-center"
                    title="Copy to clipboard"
                  >
                    Copy
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  </button>
                </div>
                <div className="text-[10px] text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50 select-all font-mono leading-relaxed break-words">
                  {panel.sceneData.videoPrompt}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="mt-12 flex justify-center space-x-4">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          Start New Story
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors shadow-lg"
        >
          Print Layout
        </button>
      </div>
    </div>
  );
};