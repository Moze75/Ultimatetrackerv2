import React, { useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

// ✅ SOLUTION: Audio global en dehors du composant React
const MUSIC_SRC = '/Music/Skyrim8bits.mp3';
let globalAudio: HTMLAudioElement | null = null;
let globalIsPlaying = false;

// ✅ AJOUTER : Fonction globale pour arrêter la musique
export function stopWizardMusic() {
  if (globalAudio) {
    try {
      globalAudio.pause();
      globalAudio.currentTime = 0; // Remettre au début
      globalIsPlaying = false;
      console.log('[ProgressBar] 🔇 Musique arrêtée');
    } catch (e) {
      console.warn('[ProgressBar] ⚠️ Erreur lors de l\'arrêt de la musique:', e);
    }
  } else {
    console.log('[ProgressBar] ℹ️ Aucune musique à arrêter');
  }
}

export default function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  const total = Math.max(1, steps.length - 1);
  const percent = Math.max(0, Math.min(100, (currentStep / total) * 100));

  const [isPlaying, setIsPlaying] = useState(globalIsPlaying);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const hasTriedAutoStartRef = useRef(false);

  // Détecte l'étape "Race"
  const raceStepIndex = steps.findIndex((s) => {
    const t = (s || '').toLowerCase();
    return t.includes('race') || t.includes('peuple') || t.includes('ancestr');
  });

  const shouldAutoStart = raceStepIndex !== -1 && currentStep === raceStepIndex;

  // ✅ Initialiser l'audio global une seule fois
  useEffect(() => {
    if (!globalAudio) {
      globalAudio = new Audio(MUSIC_SRC);
      globalAudio.loop = true;
      globalAudio.volume = 0.35;
      console.log('[ProgressBar] Audio global initialisé');
    }
  }, []);

  // ✅ Tenter l'autoplay uniquement au step "Race"
  useEffect(() => {
    if (!shouldAutoStart || hasTriedAutoStartRef.current || !globalAudio) return;

    hasTriedAutoStartRef.current = true;
    
    globalAudio.play()
      .then(() => {
        globalIsPlaying = true;
        setIsPlaying(true);
        setAutoPlayBlocked(false);
        console.log('[ProgressBar] Musique démarrée automatiquement');
      })
      .catch(() => {
        globalIsPlaying = false;
        setIsPlaying(false);
        setAutoPlayBlocked(true);
        console.log('[ProgressBar] Autoplay bloqué par le navigateur');
      });
  }, [shouldAutoStart]);

  // ✅ Synchroniser l'état local avec l'état global
  useEffect(() => {
    setIsPlaying(globalIsPlaying);
  }, [currentStep]);

  const togglePlayback = async () => {
    if (!globalAudio) return;

    if (globalIsPlaying) {
      globalAudio.pause();
      globalIsPlaying = false;
      setIsPlaying(false);
      console.log('[ProgressBar] Musique mise en pause');
    } else {
      try {
        await globalAudio.play();
        globalIsPlaying = true;
        setIsPlaying(true);
        setAutoPlayBlocked(false);
        console.log('[ProgressBar] Musique reprise');
      } catch {
        setAutoPlayBlocked(true);
        console.log('[ProgressBar] Impossible de lire la musique');
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
          title={autoPlayBlocked && !isPlaying ? "Cliquez pour activer la musique" : (isPlaying ? "Arrêter la musique" : "Lire la musique")}
        >
          {isPlaying ? '⏸ Arrêter la musique' : '▶️ Lire la musique'}
        </button>
      </div>

      {/* Alerte autoplay bloqué */}
      {autoPlayBlocked && !isPlaying && (
        <div className="mt-2 text-[11px] sm:text-xs text-gray-500 max-w-6xl mx-auto px-4">
          Astuce: l'autoplay a été bloqué par votre navigateur. Cliquez sur "Lire la musique" pour l'activer.
        </div>
      )}
    </div>
  );
}