/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Camera, Scissors, Star, Info, ChevronRight, Loader2, CheckCircle2, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeFaceAndSuggestStyles, generateHairstyleImage, GeneratedResult, HairstyleSuggestion } from './services/geminiService';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImage(base64);
        setMimeType(file.type);
        setResults([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const base64Data = image.split(',')[1];
      const suggestions = await analyzeFaceAndSuggestStyles(base64Data, mimeType);
      
      if (suggestions.length === 0) {
        throw new Error("Keine Frisuren-Vorschläge erhalten. Bitte versuche es mit einem anderen Bild.");
      }

      setIsAnalyzing(false);
      setIsGenerating(true);
      setGenerationProgress(0);

      const generatedResults: GeneratedResult[] = [];
      
      // Initialize results with suggestions but no images yet to show placeholders
      setResults(suggestions.map(s => ({ ...s, imageUrl: "" })));

      // Generate images one by one to show progress
      for (let i = 0; i < suggestions.length; i++) {
        // Add a small delay between requests to avoid hitting rate limits
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500));
        
        const suggestion = suggestions[i];
        try {
          const imageUrl = await generateHairstyleImage(base64Data, mimeType, suggestion.name, suggestion.description);
          
          if (imageUrl) {
            setResults(prev => prev.map((item, idx) => 
              idx === i ? { ...item, imageUrl } : item
            ));
          }
        } catch (err) {
          console.error(`Failed to generate image for style ${i}`, err);
          // Keep the placeholder or show an error state for this specific card
        }
        setGenerationProgress(((i + 1) / suggestions.length) * 100);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsAnalyzing(false);
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResults([]);
    setSelectedResult(null);
    setError(null);
    setGenerationProgress(0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-6 px-4 md:px-8 border-b border-black/5 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-brand-accent">
              <Scissors size={20} />
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">HairVision</h1>
          </div>
          {image && (
            <button 
              onClick={reset}
              className="text-sm font-medium flex items-center gap-2 hover:text-brand-accent transition-colors"
            >
              <RefreshCcw size={16} />
              Neustart
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-8 py-12">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto text-center space-y-8 py-12"
            >
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
                  Finde deinen <span className="italic text-brand-accent">perfekten</span> Look.
                </h2>
                <p className="text-lg text-brand-primary/60 max-w-lg mx-auto">
                  Lade ein Foto hoch und lass unsere KI 9 maßgeschneiderte Frisuren für deine Gesichtsform erstellen.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-black/10 rounded-3xl p-16 cursor-pointer hover:border-brand-accent/50 hover:bg-brand-accent/5 transition-all duration-300"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="text-brand-primary/40 group-hover:text-brand-accent" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-medium">Foto hochladen</p>
                    <p className="text-sm text-brand-primary/40">Klicke oder ziehe ein Bild hierher</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-8 pt-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-widest opacity-50">KI Analyse</span>
                </div>
                <div className="w-12 h-px bg-black/10" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Star size={24} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-widest opacity-50">9 Varianten</span>
                </div>
                <div className="w-12 h-px bg-black/10" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Info size={24} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-widest opacity-50">Profi-Tipps</span>
                </div>
              </div>
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl relative">
                  <img src={image} alt="Original" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-serif font-bold">
                      {isGenerating ? "Erstelle Looks..." : isAnalyzing ? "Analysiere Gesicht..." : "Bereit zum Start"}
                    </h2>
                    <p className="text-brand-primary/60">
                      {isGenerating 
                        ? "Wir generieren jetzt 9 verschiedene Frisuren, die perfekt zu deiner Gesichtsform passen." 
                        : isAnalyzing 
                        ? "Unsere KI untersucht deine Merkmale, um die besten Styles zu finden." 
                        : "Klicke auf den Button, um die Analyse zu starten."}
                    </p>
                  </div>

                  {!isAnalyzing && !isGenerating ? (
                    <button 
                      onClick={processImage}
                      className="w-full py-4 bg-brand-primary text-white rounded-2xl font-medium text-lg hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl"
                    >
                      Analyse starten
                      <ChevronRight size={20} />
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-brand-accent font-medium">
                        <Loader2 className="animate-spin" size={24} />
                        <span>{isGenerating ? `Generiere Style ${results.length + 1} von 9...` : "Analysiere..."}</span>
                      </div>
                      <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-brand-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${generationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-serif font-bold">Deine HairVision Kollektion</h2>
                  <p className="text-brand-primary/60">Wähle einen Look aus, um Details und Anweisungen für deinen Friseur zu sehen.</p>
                </div>
                {isGenerating && (
                   <div className="flex items-center gap-3 text-brand-accent font-medium bg-brand-accent/10 px-4 py-2 rounded-full">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="text-sm">Weitere Styles werden geladen ({results.length}/9)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => result.imageUrl && setSelectedResult(result)}
                    className={`group space-y-4 ${result.imageUrl ? 'cursor-pointer' : 'cursor-wait'}`}
                  >
                    <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-lg relative bg-black/5">
                      {result.imageUrl ? (
                        <>
                          <img 
                            src={result.imageUrl} 
                            alt={result.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <Star size={14} className="text-brand-accent fill-brand-accent" />
                            <span className="text-sm font-bold">{result.rating}/10</span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                            <span className="text-white font-medium flex items-center gap-2">
                              Details ansehen <ChevronRight size={16} />
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                          <Loader2 className="animate-spin text-brand-accent" size={32} />
                          <p className="text-xs font-bold uppercase tracking-widest opacity-30">Wird generiert...</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">{result.name}</h3>
                      <p className="text-sm text-brand-primary/60 line-clamp-2">{result.suitabilityReason}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedResult(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="w-full md:w-1/2 h-64 md:h-auto relative">
                <img 
                  src={selectedResult.imageUrl} 
                  alt={selectedResult.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedResult(null)}
                  className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors md:hidden"
                >
                  <ChevronRight className="rotate-180" size={24} />
                </button>
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-brand-accent">
                      <Star size={20} className="fill-brand-accent" />
                      <span className="font-bold text-lg">{selectedResult.rating}/10 Rating</span>
                    </div>
                    <h2 className="text-4xl font-serif font-bold">{selectedResult.name}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedResult(null)}
                    className="hidden md:flex w-12 h-12 bg-black/5 rounded-full items-center justify-center hover:bg-black/10 transition-colors"
                  >
                    <RefreshCcw size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="space-y-6">
                  <section className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-primary/40">Warum dieser Style?</h4>
                    <p className="text-brand-primary/80 leading-relaxed">{selectedResult.suitabilityReason}</p>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-primary/40">Beschreibung</h4>
                    <p className="text-brand-primary/80 leading-relaxed">{selectedResult.description}</p>
                  </section>

                  <div className="p-6 bg-brand-accent/5 rounded-3xl border border-brand-accent/20 space-y-4">
                    <div className="flex items-center gap-3 text-brand-accent">
                      <Scissors size={20} />
                      <h4 className="font-bold">Anweisungen für den Friseur</h4>
                    </div>
                    <p className="text-brand-primary/90 text-sm leading-relaxed italic">
                      "{selectedResult.barberInstructions}"
                    </p>
                    <p className="text-[10px] text-brand-primary/40 uppercase font-bold tracking-tighter">
                      Zeige dieses Bild und diesen Text deinem Friseur für das beste Ergebnis.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-black/5 text-center text-brand-primary/40 text-sm">
        <p>© 2026 HairVision AI. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  );
}
