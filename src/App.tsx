/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2, Upload, Image as ImageIcon, Send, Trash2, Download, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [prompt, setPrompt] = useState('a little boy age about 7 years old playing with lego bricks on a green play field');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageGeneration = async (isEdit: boolean = false) => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const contents: any = {
        parts: [{ text: prompt }]
      };

      if (isEdit && currentImage) {
        const base64Data = currentImage.split(',')[1];
        contents.parts.unshift({
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setCurrentImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        // If no image returned, maybe it just returned text?
        const textResponse = response.text;
        if (textResponse) {
           setError(`Model returned text instead of an image: ${textResponse}`);
        } else {
           setError("No image was generated. Please try a different prompt.");
        }
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An error occurred during image generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCurrentImage(event.target?.result as string);
      setPrompt(''); // Clear prompt to encourage editing
    };
    reader.readAsDataURL(file);
  };

  const downloadImage = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = 'generated-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <h1 className="font-display font-semibold text-lg tracking-tight">Lego Studio</h1>
          </div>
          <div className="flex items-center gap-4">
             <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors flex items-center gap-2"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Upload Image</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Image Display Area */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className={cn(
              "aspect-square rounded-3xl overflow-hidden bg-white border border-black/5 shadow-sm relative group",
              !currentImage && "flex items-center justify-center bg-gray-50 border-dashed border-2"
            )}>
              {currentImage ? (
                <>
                  <img 
                    src={currentImage} 
                    alt="Generated" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      onClick={downloadImage}
                      className="p-3 bg-white rounded-full hover:scale-110 transition-transform shadow-lg"
                      title="Download"
                    >
                      <Download size={20} />
                    </button>
                    <button 
                      onClick={() => setCurrentImage(null)}
                      className="p-3 bg-white rounded-full hover:scale-110 transition-transform shadow-lg text-red-500"
                      title="Clear"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <ImageIcon size={32} />
                  </div>
                  <p className="text-gray-500 font-medium font-display">Your creation will appear here</p>
                  <p className="text-gray-400 text-sm mt-1">Start by typing a prompt below</p>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
                  <p className="font-medium text-gray-600 animate-pulse font-display">
                    {currentImage ? 'Editing image...' : 'Generating image...'}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Controls Area */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 font-display">
                {currentImage ? 'Edit Image' : 'Generate New'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={currentImage ? "e.g., 'Add a red hat' or 'Make it sunset'" : "Describe what you want to see..."}
                    className="w-full h-32 p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none resize-none text-sm leading-relaxed"
                  />
                </div>

                <button
                  onClick={() => handleImageGeneration(!!currentImage)}
                  disabled={isLoading || !prompt.trim()}
                  className={cn(
                    "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md",
                    isLoading || !prompt.trim() 
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                      : "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] shadow-emerald-500/20"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {currentImage ? <Sparkles size={20} /> : <Send size={20} />}
                      {currentImage ? 'Apply Edit' : 'Generate Image'}
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                  Quick Tips
                </h3>
                <ul className="space-y-3 text-sm text-gray-500">
                  <li className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    Be specific about colors, lighting, and style.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    To edit, describe only the changes you want.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    Upload an existing photo to start editing.
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 text-center border-t border-black/5 mt-12">
        <p className="text-gray-400 text-sm">
          Powered by Gemini 2.5 Flash Image
        </p>
      </footer>
    </div>
  );
}
