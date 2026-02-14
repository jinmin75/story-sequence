import React, { useRef, useState, useEffect } from 'react';
import { StoryConfig } from '../types';
import { STYLES, ASPECT_RATIOS, GEMINI_MODELS } from '../constants';

interface StoryInputProps {
  onStart: (config: StoryConfig) => void;
  isProcessing: boolean;
}

export const StoryInput: React.FC<StoryInputProps> = ({ onStart, isProcessing }) => {
  const [storyText, setStoryText] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [style, setStyle] = useState(STYLES[0]);
  const [model, setModel] = useState(GEMINI_MODELS[0].value);
  const [showCaptions, setShowCaptions] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  useEffect(() => {
    localStorage.setItem('gemini_api_key', userApiKey);
  }, [userApiKey]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !storyText.trim()) return;

    onStart({
      storyText,
      aspectRatio,
      style,
      showCaptions,
      referenceImage: imagePreview,
      userApiKey: userApiKey.trim() || undefined,
      model
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-800 rounded-xl p-6 md:p-8 shadow-2xl border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-600 pb-4">
        Create Your 3x3 Sequence
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            1. Character Reference (Required)
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${imagePreview ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-700/50'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Reference"
                  className="max-h-64 mx-auto rounded-md shadow-lg object-contain"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                  <p className="text-white font-semibold">Click to Change</p>
                </div>
              </div>
            ) : (
              <div className="py-8">
                <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-slate-300">Upload a clear image of your character</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Optional API Key */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
          <label className="block text-sm font-medium text-blue-400 mb-1 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            Personal Gemini API Key (Optional)
          </label>
          <input
            type="password"
            value={userApiKey}
            onChange={(e) => setUserApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono"
          />
          <p className="mt-2 text-[10px] text-slate-500">
            If provided, this key will be used instead of the default. Your key is not stored and only used for current session.
          </p>
        </div>

        {/* Story Text */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            2. Story Outline
          </label>
          <textarea
            required
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="A robot finds a flower in a junkyard, nurtures it, and protects it from a storm..."
            className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              3. Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {ASPECT_RATIOS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              4. Art Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {STYLES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2">
              5. AI Engine (Model)
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Captions Toggle */}
          <div className="flex items-center pt-8">
            <input
              id="captions"
              type="checkbox"
              checked={showCaptions}
              onChange={(e) => setShowCaptions(e.target.checked)}
              className="w-5 h-5 text-blue-600 bg-slate-900 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="captions" className="ml-2 text-sm font-medium text-slate-300">
              Generate Captions
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!imagePreview || !storyText.trim() || isProcessing}
          className={`w-full py-4 px-6 rounded-lg font-bold text-lg shadow-lg transition-all
            ${(!imagePreview || !storyText.trim() || isProcessing)
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transform hover:-translate-y-0.5'
            }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Sequence...
            </span>
          ) : 'Generate 3x3 Sequence'}
        </button>
      </form>
    </div>
  );
};