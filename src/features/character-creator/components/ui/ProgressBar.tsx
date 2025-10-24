import React, { useEffect, useState } from 'react';
import { 
  initWizardMusic, 
  startWizardMusic, 
  pauseWizardMusic, 
  resumeWizardMusic, 
  isWizardMusicPlaying,
  stopWizardMusic
} from './musicControl';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export default function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  const total = Math.max(1, steps.length - 1);
  const percent = Math.max(0, Math.min(100, (currentStep / total) * 100));

  const [isPlaying, setIsPlaying] = useState(false);

  // ✅ Initialiser l'audio au montage
  useEffect(() => {
    console.log('[ProgressBar] 🚀 Initialisation audio');
    initWizardMusic();
    setIsPlaying(isWizardMusicPlaying());

    // ✅ CLEANUP : Arrêter et détruire la musique au démontage
    return () => {
      console.log('[ProgressBar] 🧹 Démontage - Arrêt et destruction de la musique');
      stopWizardMusic();
    };
  }, []);

  // ✅ Synchroniser l'état avec la musique à chaque changement d'étape
  useEffect(() => {
    const playing = isWizardMusicPlaying();
    setIsPlaying(playing);
    console.log('[ProgressBar] 🔄 Sync step', currentStep, '- Playing:', playing);
  }, [currentStep]);

  // ✅ Toggle manuel uniquement
  const togglePlayback = async () => {
    console.log('[ProgressBar] 🎵 Toggle playback, isPlaying:', isPlaying);
    
    if (isPlaying) {
      pauseWizardMusic();
      setIsPlaying(false);
    } else {
      const success = await resumeWizardMusic();
      setIsPlaying(success);
      
      if (!success) {
        console.log('[ProgressBar] ❌ Impossible de démarrer la musique');
      }
    }
  };

  return (
    <div className="w-full mb-8">
      {/* Bandeau pleine largeur avec image de fond */}
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-1 h-64">
        {/* Image de fond */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/background/ddbground.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 100%',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Overlay blanc transparent */}
          <div className="absolute inset-0 bg-white/20"></div>

          {/* Dégradé progressif vers le bas */}
          <div
            className="absolute inset-x-0 bottom-0 h-24"
            style={{
              background: 'linear-gradient(to bottom, rgba(17, 24, 39, 0) 0%, rgba(17, 24, 39, 0.5) 40%, rgba(17, 24, 39, 0.8) 70%, rgba(17, 24, 39, 1) 100%)'
            }}
          />
        </div>

        {/* Contenu par-dessus le fond */}
        <div className="relative z-10 px-4 py-12 max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-black mb-2"
                style={{
                  textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 255, 255, 0.4)'
                }}>
              Créez votre personnage
            </h1>
            <p className="text-gray-900 text-base font-bold tracking-wide"
               style={{
                 textShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.5)'
               }}>
              Choisissez vite mais choisissez bien
            </p>
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="w-full bg-gray-800 rounded-full h-2 mb-3" aria-hidden="true">
          <div
            className="bg-gradient-to-r from-red-600 to-red-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            role="progressbar"
          />
        </div>

        {/* Libellés d'étapes */}
        <div className="text-xs sm:text-sm text-gray-400 overflow-x-auto">
          <ol className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 sm:gap-x-6 gap-y-2 whitespace-nowrap">
            {steps.map((step, index) => {
              const isDone = index < currentStep;
              const isCurrent = index === currentStep;
              const dotClass = isDone
                ? 'bg-red-600'
                : isCurrent
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-gray-600';

              const textClass = isDone
                ? 'text-red-400'
                : isCurrent
                  ? 'text-gray-200'
                  : 'text-gray-500';

              return (
                <li key={index} className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${dotClass}`}
                    aria-hidden="true"
                  />
                  <span className={`transition-colors font-medium ${textClass}`}>
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Contrôles musique */}
      <div className="mt-2 flex items-center justify-end max-w-6xl mx-auto px-4">
        <button
          type="button"
          onClick={togglePlayback}
          className={`text-xs sm:text-sm px-3 py-1.5 rounded-md border transition-colors
            ${isPlaying ? 'border-red-600 text-red-200 hover:bg-red-900/30' : 'border-gray-600 text-gray-300 hover:bg-gray-800/30'}
          `}
        >
          {isPlaying ? '⏸ Arrêter la musique' : '▶️ Lire la musique'}
        </button>
      </div>
    </div>
  );
}