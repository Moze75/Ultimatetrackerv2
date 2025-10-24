import React, { useEffect, useState } from 'react';
import { 
  initWizardMusic, 
  startWizardMusic, 
  pauseWizardMusic, 
  resumeWizardMusic, 
  isWizardMusicPlaying 
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
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [musicStartAttempted, setMusicStartAttempted] = useState(false);

  // ✅ Initialiser l'audio au montage
  useEffect(() => {
    console.log('[ProgressBar] 🚀 Initialisation audio');
    initWizardMusic();
    setIsPlaying(isWizardMusicPlaying());

    // ✅ Tenter l'autoplay (peut être bloqué par le navigateur)
    const attemptAutoplay = async () => {
      console.log('[ProgressBar] 🎬 Tentative autoplay au montage');
      const success = await startWizardMusic();
      setIsPlaying(success);
      setAutoPlayBlocked(!success);
      setMusicStartAttempted(true);
      
      if (success) {
        console.log('[ProgressBar] ✅ Autoplay réussi !');
      } else {
        console.log('[ProgressBar] ⚠️ Autoplay bloqué, attente interaction utilisateur');
      }
    };

    const timer = setTimeout(attemptAutoplay, 300);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Synchroniser l'état avec la musique à chaque changement d'étape
  useEffect(() => {
    const playing = isWizardMusicPlaying();
    setIsPlaying(playing);
    console.log('[ProgressBar] 🔄 Sync step', currentStep, '- Playing:', playing);
  }, [currentStep]);

  // ✅ Capturer le premier clic pour démarrer la musique si l'autoplay a été bloqué
  useEffect(() => {
    if (!autoPlayBlocked || isPlaying) return;

    const handleFirstClick = async () => {
      if (!isWizardMusicPlaying()) {
        console.log('[ProgressBar] 🎵 Premier clic détecté, démarrage musique');
        const success = await startWizardMusic();
        setIsPlaying(success);
        setAutoPlayBlocked(!success);
        
        if (success) {
          // Retirer le listener après le premier succès
          document.removeEventListener('click', handleFirstClick, true);
        }
      }
    }; 

    // Écouter en phase de capture pour attraper tous les clics
    document.addEventListener('click', handleFirstClick, true);

    return () => {
      document.removeEventListener('click', handleFirstClick, true);
    };
  }, [autoPlayBlocked, isPlaying]);

  const togglePlayback = async () => {
    console.log('[ProgressBar] 🎵 Toggle playback, isPlaying:', isPlaying);
    
    if (isPlaying) {
      pauseWizardMusic();
      setIsPlaying(false);
    } else {
      const success = await resumeWizardMusic();
      setIsPlaying(success);
      setAutoPlayBlocked(!success);
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
          title={autoPlayBlocked && !isPlaying ? "Cliquez pour activer la musique" : (isPlaying ? "Arrêter la musique" : "Lire la musique")}
        >
          {isPlaying ? '⏸ Arrêter la musique' : '▶️ Lire la musique'}
        </button>
      </div>

      {/* Alerte autoplay bloqué - Seulement si l'autoplay a échoué et que la musique n'est pas en lecture */}
      {autoPlayBlocked && !isPlaying && musicStartAttempted && (
        <div className="mt-2 text-[11px] sm:text-xs max-w-6xl mx-auto px-4">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 text-center">
            <p className="text-yellow-400 font-medium mb-1">
              🎵 Musique d'ambiance disponible
            </p>
            <p className="text-yellow-300/80 text-[10px] sm:text-xs">
              Cliquez n'importe où ou sur le bouton "▶️ Lire la musique" pour activer
            </p>
          </div>
        </div>
      )}
    </div>
  );
}