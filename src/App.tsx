import React, { useEffect, useState, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import type { Player } from './types/dnd';
import { InstallPrompt } from './components/InstallPrompt';
import { appContextService } from './services/appContextService';

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';
const MAX_RETRIES = 1; // ✅ MODIFIÉ : 1 seul essai au lieu de 3
const RETRY_DELAY = 1000; // ✅ 1 seconde au lieu de 1.5

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Player | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [componentLoadError, setComponentLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [LoginPage, setLoginPage] = useState<React.ComponentType<any> | null>(null);
  const [CharacterSelectionPage, setCharacterSelectionPage] = useState<React.ComponentType<any> | null>(null);
  const [GamePage, setGamePage] = useState<React.ComponentType<any> | null>(null);

  // Refs pour le handler "back"
  const backPressRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const selectedCharacterRef = useRef<Player | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    selectedCharacterRef.current = selectedCharacter;
  }, [selectedCharacter]);

// ✅ MODIFIÉ : Charger dynamiquement les pages avec retry limité
useEffect(() => {
  let currentRetry = 0;
  let isCancelled = false;

  const loadComponents = async () => {
    if (isCancelled) return;

    try {
      console.log(`[App] 🔄 Tentative de chargement des composants (${currentRetry + 1}/${MAX_RETRIES})...`);
      
      const [loginModule, characterSelectionModule, gamePageModule] = await Promise.all([
        import('./pages/LoginPage'),
        import('./pages/CharacterSelectionPage'),
        import('./pages/GamePage')
      ]);

      if (isCancelled) return;

      setLoginPage(() => (loginModule as any).LoginPage ?? (loginModule as any).default);
      setCharacterSelectionPage(
        () => (characterSelectionModule as any).CharacterSelectionPage ?? (characterSelectionModule as any).default
      );
      setGamePage(() => (gamePageModule as any).GamePage ?? (gamePageModule as any).default);
      
      console.log('[App] ✅ Composants chargés avec succès');
      setComponentLoadError(false);
      setRetryCount(0);
    } catch (error) {
      console.error(`[App] ❌ Erreur chargement composants (tentative ${currentRetry + 1}/${MAX_RETRIES}):`, error);
      
      if (currentRetry < MAX_RETRIES - 1 && !isCancelled) {
        currentRetry++;
        setRetryCount(currentRetry);
        console.log(`[App] ⏱️ Nouvelle tentative dans ${RETRY_DELAY}ms...`);
        setTimeout(loadComponents, RETRY_DELAY);
      } else if (!isCancelled) {
        console.error('[App] 💥 Échec définitif après', MAX_RETRIES, 'tentatives');
        console.error('[App] 🔄 Rechargement forcé de la page...');
        
        // ✅ NOUVEAU : Au lieu d'afficher l'erreur, recharger la page
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    }
  };

  loadComponents();

  return () => {
    isCancelled = true;
  };
}, []);

  // Initialisation session + restauration du personnage si session présente
  useEffect(() => {
    const initSession = async () => {
      try {
        console.log('[App] 🔑 Initialisation de la session...');
        const { data } = await supabase.auth.getSession();
        const current = data?.session ?? null;
        setSession(current);

        if (current) {
          const context = appContextService.getContext();
          console.log('[App] 📍 Contexte détecté:', context);

          if (context === 'wizard') {
            console.log('[App] 🧙 Contexte wizard - pas de restauration de personnage');
          } else {
            if (sessionStorage.getItem(SKIP_AUTO_RESUME_ONCE) === '1') {
              console.log('[App] ⏭️ Skip auto-resume activé');
              sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
            } else {
              const savedChar = localStorage.getItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
              if (savedChar) {
                try {
                  const parsed = JSON.parse(savedChar);
                  setSelectedCharacter(parsed);
                  appContextService.setContext('game');
                  console.log('[App] 🎮 Personnage restauré:', parsed.name);
                } catch (e) {
                  console.error('[App] ❌ Erreur parsing personnage:', e);
                }
              }
            }
          }
        } else {
          console.log('[App] 🔓 Pas de session - purge mémoire');
          setSelectedCharacter(null);
          appContextService.clearContext();
          appContextService.clearWizardSnapshot();
        }
      } catch (error) {
        console.error('[App] ❌ Erreur initialisation session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  // Écoute des changements d'état d'authentification
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[App] 🔄 Auth state change:', event);
      setSession(newSession);

      if (!newSession) {
        console.log('[App] 🔓 Déconnexion - purge');
        setSelectedCharacter(null);
        localStorage.removeItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
        appContextService.clearContext();
        appContextService.clearWizardSnapshot();
      } else {
        if (!selectedCharacter) {
          const context = appContextService.getContext();
          
          if (context === 'wizard') {
            console.log('[App] 🧙 Auth change: wizard actif');
          } else {
            if (sessionStorage.getItem(SKIP_AUTO_RESUME_ONCE) === '1') {
              sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
            } else {
              const savedChar = localStorage.getItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
              if (savedChar) {
                try {
                  const parsed = JSON.parse(savedChar);
                  setSelectedCharacter(parsed);
                  appContextService.setContext('game');
                  console.log('[App] 🎮 Personnage restauré (auth change):', parsed.name);
                } catch (e) {
                  console.error('[App] ❌ Erreur parsing (auth change):', e);
                }
              }
            }
          }
        }
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[App] 🔄 Token rafraîchi');
        setRefreshingSession(true);
        setTimeout(() => setRefreshingSession(false), 1200);
      }
    });

    return () => {
      try {
        sub.subscription.unsubscribe();
      } catch {
        // no-op
      }
    };
  }, [selectedCharacter]);

  // Sauvegarder le personnage sélectionné
  useEffect(() => {
    if (selectedCharacter) {
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(selectedCharacter));
        appContextService.setContext('game');
        console.log('[App] 💾 Personnage sauvegardé:', selectedCharacter.name);
      } catch (e) {
        console.error('[App] ❌ Erreur sauvegarde personnage:', e);
      }
    }
  }, [selectedCharacter]);

 // Gestion du bouton "retour"
useEffect(() => {
  try {
    window.history.pushState({ ut: 'keepalive' }, '');
  } catch {
    // no-op
  }

  const onPopState = (_ev: PopStateEvent) => {
    // ✅ CAS 1 : Depuis le jeu (personnage sélectionné) → demander confirmation
    if (sessionRef.current && selectedCharacterRef.current) {
      console.log('[App] ⬅️ Retour détecté depuis le jeu');
      
      // Afficher un toast de confirmation avec boutons
      toast(
        (t) => (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">
              Retourner à la sélection des personnages ?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  // Rester sur le jeu
                  try {
                    window.history.pushState({ ut: 'keepalive' }, '');
                  } catch {
                    // no-op
                  }
                }}
                className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  console.log('[App] ✅ Confirmation: retour à la sélection');
                  // ✅ RETOUR À LA SÉLECTION (pas quitter l'app)
                  try {
                    sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
                    appContextService.setContext('selection');
                  } catch {
                    // no-op
                  }
                  setSelectedCharacter(null);
                  // Remettre l'état après le retour
                  try {
                    window.history.pushState({ ut: 'keepalive' }, '');
                  } catch {
                    // no-op
                  }
                }}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Retour à la sélection
              </button>
            </div>
          </div>
        ),
        {
          duration: 6000,
          icon: '⚠️',
        }
      );
      
      // Remettre l'état pour ne pas naviguer immédiatement
      try {
        window.history.pushState({ ut: 'keepalive' }, '');
      } catch {
        // no-op
      }
      return;
    }

    // ✅ CAS 2 : Depuis la sélection des personnages → double appui pour QUITTER l'app
    const now = Date.now();
    if (now - (backPressRef.current ?? 0) < 1500) {
      console.log('[App] ⬅️ Double appui: quitter l\'application');
      window.removeEventListener('popstate', onPopState);
      window.history.back(); // ← Ici on QUITTE vraiment
    } else {
      backPressRef.current = now;
      toast('Appuyez à nouveau pour quitter l\'application', { icon: '↩️' });
      try {
        window.history.pushState({ ut: 'keepalive' }, '');
      } catch {
        // no-op
      }
    }
  };

  window.addEventListener('popstate', onPopState);
  return () => {
    window.removeEventListener('popstate', onPopState);
  };
}, []);

  // ✅ MODIFIÉ : Écran d'erreur de chargement
  if (componentLoadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-red-400 text-7xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white">Erreur de chargement</h2>
          <p className="text-gray-400 text-lg">
            Impossible de charger l'application après {MAX_RETRIES} tentatives.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Causes possibles :</p>
            <ul className="list-disc list-inside text-left">
              <li>Cache du Service Worker corrompu</li>
              <li>Problème de connexion internet</li>
              <li>Fichiers manquants sur le serveur</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                console.log('[App] 🔄 Rechargement forcé');
                window.location.reload();
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              🔄 Recharger l'application
            </button>
            <button
              onClick={() => {
                console.log('[App] 🗑️ Nettoyage cache + rechargement');
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (const registration of registrations) {
                      registration.unregister();
                    }
                    caches.keys().then(names => {
                      for (const name of names) {
                        caches.delete(name);
                      }
                      window.location.reload();
                    });
                  });
                } else {
                  window.location.reload();
                }
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              🗑️ Vider le cache et recharger
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MODIFIÉ : Écran de chargement des composants avec indicateur de retry
  if (!LoginPage || !CharacterSelectionPage || !GamePage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <img 
            src="/icons/wmremove-transformed.png" 
            alt="Chargement..." 
            className="animate-spin rounded-full h-12 w-12 mx-auto object-cover" 
          />
          <p className="text-gray-400">Chargement des composants...</p>
          {retryCount > 0 && (
            <p className="text-yellow-400 text-sm">
              Tentative {retryCount + 1}/{MAX_RETRIES}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Écran de chargement initial (session)
  if (loading) {
    return (
      <>
        <Toaster position="top-right" />
        <InstallPrompt />
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center space-y-4">
            <img 
              src="/icons/wmremove-transformed.png" 
              alt="Chargement..." 
              className="animate-spin rounded-full h-12 w-12 mx-auto object-cover" 
            />
            <p className="text-gray-400">Initialisation...</p>
          </div>
        </div>
      </>
    );
  }

<Toaster
  position="top-right"
  containerStyle={{ zIndex: 20000 }} // s’assure d’être au-dessus de la modale
  toastOptions={{
    // Optionnel: styles globaux
    style: { zIndex: 20000 },
  }}
/>
  
  // Rendu principal
  return (
    <>
      <Toaster position="top-right" />
      <InstallPrompt />

      {refreshingSession && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50">
          🔄 Reconnexion en cours...
        </div>
      )}

      {!session ? (
        <LoginPage />
      ) : !selectedCharacter ? (
        <CharacterSelectionPage
          session={session}
          onCharacterSelect={(p: Player) => {
            try {
              sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
            } catch {
              // no-op
            }
            setSelectedCharacter(p);
          }}
        />
      ) : (
        <GamePage
          session={session}
          selectedCharacter={selectedCharacter}
          onBackToSelection={() => {
            try {
              sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
              appContextService.setContext('selection');
            } catch {
              // no-op
            }
            setSelectedCharacter(null);
          }}
          onUpdateCharacter={(p: Player) => {
            setSelectedCharacter(p);
            try {
              localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(p));
              appContextService.setContext('game');
            } catch {
              // no-op
            }
          }}
        />
      )}
    </>
  );
}

export default App;