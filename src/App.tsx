import React, { useEffect, useState, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import type { Player } from './types/dnd';
import { InstallPrompt } from './components/InstallPrompt';
import { appContextService } from './services/appContextService';

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter'; // même clé qu'avant
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Player | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);

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

  // Charger dynamiquement les pages (exports nommés)
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const loginModule = await import('./pages/LoginPage');
        const characterSelectionModule = await import('./pages/CharacterSelectionPage');
        const gamePageModule = await import('./pages/GamePage');

        setLoginPage(() => (loginModule as any).LoginPage ?? (loginModule as any).default);
        setCharacterSelectionPage(
          () => (characterSelectionModule as any).CharacterSelectionPage ?? (characterSelectionModule as any).default
        );
        setGamePage(() => (gamePageModule as any).GamePage ?? (gamePageModule as any).default);
      } catch (error) {
        console.error('Erreur lors du chargement des composants:', error);
      }
    };

    loadComponents();
  }, []);

  // Initialisation session + restauration du personnage si session présente
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const current = data?.session ?? null;
        setSession(current);

        if (current) {
          // ✅ NOUVEAU : Vérifier le contexte d'application
          const context = appContextService.getContext();
          
          console.log('[App] Contexte détecté:', context);

          if (context === 'wizard') {
            // L'utilisateur était dans le wizard, ne PAS restaurer le personnage
            // Le wizard sera restauré par CharacterSelectionPage
            console.log('[App] Contexte wizard détecté, pas de restauration de personnage');
          } else {
            // Comportement normal : restaurer le personnage si pas de skip
            if (sessionStorage.getItem(SKIP_AUTO_RESUME_ONCE) === '1') {
              sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
            } else {
              const savedChar = localStorage.getItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
              if (savedChar) {
                try {
                  const parsed = JSON.parse(savedChar);
                  setSelectedCharacter(parsed);
                  appContextService.setContext('game'); // ✅ Marquer le contexte "game"
                  console.log('[App] Personnage restauré depuis snapshot');
                } catch (e) {
                  console.error('Erreur parsing selectedCharacter:', e);
                }
              }
            }
          }
        } else {
          // Pas de session -> purge mémoire
          setSelectedCharacter(null);
          appContextService.clearContext(); // ✅ Nettoyer le contexte
          appContextService.clearWizardSnapshot(); // ✅ Nettoyer le snapshot wizard
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  // Écoute des changements d'état d'authentification
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (!newSession) {
        // Déconnexion -> purger la sélection et le stockage local
        setSelectedCharacter(null);
        localStorage.removeItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
        appContextService.clearContext(); // ✅ Nettoyer le contexte
        appContextService.clearWizardSnapshot(); // ✅ Nettoyer le snapshot wizard
      } else {
        // À la connexion (ou refresh), si aucun personnage sélectionné, tenter une restauration
        if (!selectedCharacter) {
          const context = appContextService.getContext();
          
          if (context === 'wizard') {
            // Laisser le wizard gérer la restauration
            console.log('[App] Auth change: contexte wizard, pas de restauration');
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
                } catch (e) {
                  console.error('Erreur parsing selectedCharacter (auth change):', e);
                }
              }
            }
          }
        }
      }

      // Feedback visuel léger lors d'un refresh de token
      if (event === 'TOKEN_REFRESHED') {
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

  // Sauvegarder le personnage sélectionné dans localStorage (snapshot complet)
  useEffect(() => {
    if (selectedCharacter) {
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(selectedCharacter));
        appContextService.setContext('game'); // ✅ Marquer le contexte "game"
        console.log('[App] Personnage sauvegardé, contexte = game');
      } catch {
        // no-op
      }
    }
  }, [selectedCharacter]);

  // Gestion du bouton "retour" Android / navigateur:
  useEffect(() => {
    try {
      window.history.pushState({ ut: 'keepalive' }, '');
    } catch {
      // no-op
    }

    const onPopState = (_ev: PopStateEvent) => {
      // 1) En jeu -> retour interne à la sélection
      if (sessionRef.current && selectedCharacterRef.current) {
        try {
          sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
          appContextService.setContext('selection'); // ✅ Marquer le contexte "selection"
        } catch {
          // no-op
        }
        setSelectedCharacter(null);
        // Ré-armer l'entrée d'historique pour capturer le prochain "retour"
        try {
          window.history.pushState({ ut: 'keepalive' }, '');
        } catch {
          // no-op
        }
        return;
      }

      // 2) À la racine (login ou sélection) -> double appui pour quitter
      const now = Date.now();
      if (now - (backPressRef.current ?? 0) < 1500) {
        // Laisser quitter: enlever l'écouteur et effectuer un back supplémentaire
        window.removeEventListener('popstate', onPopState);
        window.history.back();
      } else {
        backPressRef.current = now;
        toast('Appuyez à nouveau pour quitter', { icon: '↩️' });
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

  // Écran de chargement des composants dynamiques
  if (!LoginPage || !CharacterSelectionPage || !GamePage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <img 
            src="/icons/wmremove-transformed.png" 
            alt="Chargement..." 
            className="animate-spin rounded-full h-12 w-12 mx-auto object-cover" 
          />
          <p className="text-gray-400">Chargement des composants...</p>
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <img 
              src="/icons/wmremove-transformed.png" 
              alt="Chargement..." 
              className="animate-spin rounded-full h-12 w-12 mx-auto object-cover" 
            />
            <p className="text-gray-400">Chargement en cours...</p>
          </div>
        </div>
      </>
    );
  }

  // Rendu avec ordre correct:
  // 1) Pas de session -> Login
  // 2) Session sans personnage -> Sélection
  // 3) Session + personnage -> Jeu
  return (
    <>
      <Toaster position="top-right" />
      <InstallPrompt />

      {refreshingSession && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50">
          Tentative de reconnexion...
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
              appContextService.setContext('selection'); // ✅ Marquer le contexte "selection"
            } catch {
              // no-op
            }
            setSelectedCharacter(null);
          }}
          onUpdateCharacter={(p: Player) => {
            setSelectedCharacter(p);
            // App écrit aussi le snapshot pour sécuriser
            try {
              localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(p));
              appContextService.setContext('game'); // ✅ Maintenir le contexte "game"
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