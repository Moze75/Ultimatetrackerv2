import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { appContextService } from '../services/appContextService';
import { Player } from '../types/dnd';
import {
  LogOut,
  Plus,
  User,
  Sword,
  Shield,
  Sparkles,
  Trash2,
  Dices,
  Crown,
  Star,
  Clock,
  Scroll,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { authService } from '../services/authService';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionPage } from './SubscriptionPage';
import { GameMasterCampaignPage } from './GameMasterCampaignPage';
import { UserSubscription, SUBSCRIPTION_PLANS } from '../types/subscription';

// Intégration Character Creator (wizard)
import { CharacterExportPayload } from '../types/characterCreator';
import { createCharacterFromCreatorPayload } from '../services/characterCreationIntegration';
import CharacterCreationWizard from '../features/character-creator/components/characterCreationWizard';

interface CharacterSelectionPageProps {
  session: any;
  onCharacterSelect: (player: Player) => void;
}

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'lastSelectedCharacterSnapshot';

const BG_URL =
  (import.meta as any)?.env?.VITE_SELECTION_BG_URL ||
  'https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static/tmpoofee5sh.png';

type CreatorModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (payload: CharacterExportPayload) => void;
  initialSnapshot?: any;
};

function CreatorModal({ open, onClose, onComplete, initialSnapshot }: CreatorModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm">
      <div className="w-screen h-screen relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-gray-800/80 hover:bg-gray-700 text-white px-3 py-1 rounded"
          aria-label="Fermer"
        >
          Fermer
        </button>

        <div className="w-full h-full bg-gray-900 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CharacterCreationWizard 
              onFinish={onComplete} 
              onCancel={onClose}
              initialSnapshot={initialSnapshot}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type WelcomeModalProps = {
  open: boolean;
  characterName: string;
  onContinue: () => void;
};

function WelcomeModal({ open, characterName, onContinue }: WelcomeModalProps) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-purple-500/30 rounded-xl max-w-md w-full p-8 shadow-2xl">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center">
            <Dices className="w-8 h-8 text-purple-400" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-red-400">
              Bienvenue {characterName}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <p 
                className="text-lg text-gray-200 font-medium"
                style={{
                  textShadow: '0 0 10px rgba(255,255,255,0.3)'
                }}
              >
                L'aventure commence ici
              </p>
              <Dices className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          
          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}

export function CharacterSelectionPage({ session, onCharacterSelect }: CharacterSelectionPageProps) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [creating, setCreating] = useState(false);
  const [deletingCharacter, setDeletingCharacter] = useState<Player | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [newCharacter, setNewCharacter] = useState<Player | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [remainingTrialDays, setRemainingTrialDays] = useState<number | null>(null);

  useEffect(() => {
    fetchPlayers();
    loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    const wizardSnapshot = appContextService.getWizardSnapshot();
    if (wizardSnapshot) {
      console.log('[CharacterSelection] Snapshot wizard détecté, restauration automatique:', wizardSnapshot);
      setShowCreator(true);
    }
  }, []);

  const loadSubscription = async () => {
    try {
      const sub = await subscriptionService.getCurrentSubscription(session.user.id);
      setCurrentSubscription(sub);

      if (sub?.tier === 'free' && sub?.status === 'trial') {
        const days = await subscriptionService.getRemainingTrialDays(session.user.id);
        setRemainingTrialDays(days);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'abonnement:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des personnages:', error);
      toast.error('Erreur lors de la récupération des personnages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatorComplete = async (payload: CharacterExportPayload) => {
    if (creating) return;

    const canCreate = await subscriptionService.canCreateCharacter(session.user.id, players.length);
    if (!canCreate) {
      const limit = await subscriptionService.getCharacterLimit(session.user.id);
      const isExpired = await subscriptionService.isTrialExpired(session.user.id);
      
      if (isExpired) {
        toast.error(
          'Votre période d\'essai de 15 jours est terminée. Choisissez un plan pour continuer.',
          { duration: 5000 }
        );
      } else {
        toast.error(
          `Vous avez atteint la limite de ${limit} personnage${limit > 1 ? 's' : ''}. Mettez à niveau votre abonnement pour en créer plus.`,
          { duration: 5000 }
        );
      }
      
      setShowCreator(false);
      setShowSubscription(true);
      return;
    }

    try {
      setCreating(true);
      const newPlayer = await createCharacterFromCreatorPayload(session, payload);
      setPlayers((prev) => [...prev, newPlayer]);
      toast.success('Nouveau personnage créé !');

      appContextService.clearWizardSnapshot();
      appContextService.setContext('game');

      setNewCharacter(newPlayer);
      setShowWelcome(true);

    } catch (error: any) {
      console.error('Erreur création via assistant:', error);
      if (error.message?.includes('Session invalide') || error.message?.includes('non authentifié')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        await supabase.auth.signOut();
      } else {
        toast.error("Impossible de créer le personnage depuis l'assistant.");
      }
    } finally {
      setCreating(false);
      setShowCreator(false);
    }
  }; 

  const handleWelcomeContinue = () => {
    setShowWelcome(false);
    if (newCharacter) {
      onCharacterSelect(newCharacter);
      setNewCharacter(null);
    }
  };

  const clearServiceWorkerCache = async () => {
    try {
      console.log('[CharacterSelection] 🧹 Nettoyage du Service Worker...');
      
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      }
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('[CharacterSelection] 🗑️ Caches trouvés:', cacheNames);
        
        for (const name of cacheNames) {
          if (name.includes('js-cache') || name.includes('workbox')) {
            await caches.delete(name);
            console.log('[CharacterSelection] ✅ Cache supprimé:', name);
          }
        }
      }
    } catch (error) {
      console.error('[CharacterSelection] ❌ Erreur nettoyage cache:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('[CharacterSelection] 🚪 Déconnexion en cours...');
      
      await clearServiceWorkerCache();
      
      const { error } = await authService.signOut();
      if (error) throw error;

      toast.success('Déconnexion réussie');

      appContextService.clearContext();
      appContextService.clearWizardSnapshot();
      
      try {
        localStorage.removeItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
        sessionStorage.clear();
      } catch {}

      console.log('[CharacterSelection] 🔄 Rechargement...');
      window.location.href = window.location.origin;
      
    } catch (error: any) {
      console.error('❌ Erreur de déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
      
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 1000);
    }
  };

  const handleDeleteCharacter = async (character: Player) => {
    if (deleteConfirmation !== 'Supprime') {
      toast.error('Veuillez taper exactement "Supprime" pour confirmer');
      return;
    }

    try {
      let deleted = false;
      try {
        await supabase.rpc('delete_character_safely', { character_id: character.id });
        deleted = true;
      } catch {
        deleted = false;
      }

      if (!deleted) {
        const { error } = await supabase.from('players').delete().eq('id', character.id);
        if (error) throw error;
      }

      setPlayers((prev) => prev.filter((p) => p.id !== character.id));
      setDeletingCharacter(null);
      setDeleteConfirmation('');

      toast.success(`Personnage "${character.adventurer_name || character.name}" supprimé`);
    } catch (error: any) {
      console.error('Erreur lors de la suppression du personnage:', error);
      toast.error('Erreur lors de la suppression du personnage');
    }
  };

  const getClassIcon = (playerClass: string | null | undefined) => {
    switch (playerClass) {
      case 'Guerrier':
      case 'Paladin':
        return <Sword className="w-5 h-5 text-red-500" />;
      case 'Magicien':
      case 'Ensorceleur':
      case 'Occultiste':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'Clerc':
      case 'Druide':
        return <Shield className="w-5 h-5 text-yellow-500" />;
      default:
        return <User className="w-5 h-5 text-gray-500" />;
    }
  };

  const displayClassName = (cls?: string | null) => (cls === 'Sorcier' ? 'Occultiste' : cls || '');

  // ✅ Fonction pour obtenir le texte du niveau de compte (sans badge)
  const getSubscriptionText = () => {
    if (!currentSubscription) return null;

    if (currentSubscription.tier === 'free' && currentSubscription.status === 'trial') {
      const daysLeft = remainingTrialDays ?? 0;
      return `Essai gratuit : ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`;
    }

    if (currentSubscription.status === 'expired') {
      return 'Essai expiré';
    }

    if (currentSubscription.tier === 'hero') {
      return 'Plan Héro';
    }

    if (currentSubscription.tier === 'game_master') {
      return 'Plan Maître du Jeu';
    }

    return null;
  };

  if (showCampaigns) {
    return <GameMasterCampaignPage session={session} onBack={() => setShowCampaigns(false)} />;
  }

  if (showSubscription) {
    return <SubscriptionPage session={session} onBack={() => setShowSubscription(false)} />;
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="text-center space-y-4">
          <img 
            src="/icons/wmremove-transformed.png" 
            alt="Chargement..." 
            className="animate-spin h-12 w-12 mx-auto object-contain"
            style={{ backgroundColor: 'transparent' }}
          />
          <p className="text-gray-200">Chargement des personnages...</p>
        </div>
      </div>
    );
  }
 
  return (
    <div
      className="character-selection-page min-h-screen"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: 'transparent',
      }}
    >
      <div className="min-h-screen py-8 bg-transparent">
        <div className="w-full max-w-6xl mx-auto px-4">
          {/* ✅ NOUVEAU : Niveau de compte discret en haut */}
          {currentSubscription && (
            <div className="text-center mb-4">
              <p className="text-xs text-gray-400">
                {getSubscriptionText()}
              </p>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 space-y-4">
            {/* Titre */}
            <h1
              className="text-4xl font-bold text-white"
              style={{
                textShadow:
                  '0 0 15px rgba(255,255,255,.9),0 0 20px rgba(255,255,255,.6),0 0 30px rgba(255,255,255,.4),0 0 40px rgba(255,255,255,.2)',
              }}
            >
              Mes Personnages
            </h1>
            
            {/* Nombre de personnages */}
            <p
              className="text-xl text-gray-200"
              style={{ textShadow: '0 0 10px rgba(255,255,255,.3)' }}
            >
              {players.length > 0
                ? `${players.length} personnage${players.length > 1 ? 's' : ''} créé${
                    players.length > 1 ? 's' : ''
                  }`
                : 'Aucun personnage créé'}
            </p>

            {/* Boutons d'action */}
            <div className="flex justify-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => setShowSubscription(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:scale-105"
              >
                <Crown size={20} />
                {currentSubscription?.status === 'expired' || currentSubscription?.status === 'trial' 
                  ? 'Passer à un plan payant'
                  : 'Gérer mon abonnement'
                }
              </button>

              {currentSubscription?.tier === 'game_master' && (
                <button
                  onClick={() => setShowCampaigns(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:scale-105"
                >
                  <Scroll size={20} />
                  Mes Campagnes
                </button>
              )}
            </div>
          </div>

          {/* Le reste du code reste identique... */}
          {deletingCharacter && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-red-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-100">Supprimer le personnage</h3>
                    <p className="text-sm text-gray-400">
                      {deletingCharacter.adventurer_name || deletingCharacter.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-300 text-sm font-medium mb-2">
                      ⚠️ Attention : Cette action est irréversible !
                    </p>
                    <p className="text-gray-300 text-sm">
                      Toutes les données du personnage (inventaire, attaques, statistiques) seront
                      définitivement supprimées.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pour confirmer, tapez exactement:{' '}
                      <span className="text-red-400 font-bold">Supprime</span>
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="input-dark w-full px-3 py-2 rounded-md"
                      placeholder="Tapez 'Supprime' pour confirmer"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleDeleteCharacter(deletingCharacter)}
                      disabled={deleteConfirmation !== 'Supprime'}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex-1 transition-colors"
                    >
                      Supprimer définitivement
                    </button>
                    <button
                      onClick={() => {
                        setDeletingCharacter(null);
                        setDeleteConfirmation('');
                      }}
                      className="btn-secondary px-4 py-2 rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Characters Grid */}
          <div className="flex justify-center mb-8 sm:mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
              {players.map((player) => {
                const maxHp = Math.max(0, Number(player.max_hp || 0));
                const currHp = Math.max(0, Number(player.current_hp || 0));
                const tempHp = Math.max(0, Number(player.temporary_hp || 0));
                const ratio =
                  maxHp > 0 ? Math.min(100, Math.max(0, ((currHp + tempHp) / maxHp) * 100)) : 0;

                return (
                  <div
                    key={player.id}
                    className="w-full max-w-sm relative group bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl shadow-lg overflow-hidden hover:bg-slate-700/70 transition-all duration-200"
                  >
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingCharacter(player);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-20"
                      title="Supprimer le personnage"
                      aria-label="Supprimer le personnage"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div
                      className="p-6 cursor-pointer hover:scale-[1.02] transition-all duration-200 relative z-10"
                      onClick={() => onCharacterSelect(player)}
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-white/10">
                          <Avatar
                            url={player.avatar_url}
                            playerId={player.id}
                            size="md"
                            editable={false}
                            onAvatarUpdate={() => {}}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-100 mb-1 truncate">
                              {player.adventurer_name || player.name}
                            </h3>

                            {player.class ? (
                              <div className="flex items-center gap-2 mb-2">
                                {getClassIcon(player.class)}
                                <span className="text-sm text-slate-200">
                                  {displayClassName(player.class)} niveau {player.level}
                                </span>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-300 mb-2">Personnage non configuré</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="w-full bg-slate-700/50 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-red-500 to-red-400 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-200">
                              {currHp} / {maxHp} PV
                              {tempHp > 0 && <span className="text-blue-300 ml-1">(+{tempHp})</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div
                onClick={() => setShowCreator(true)}
                className="w-full max-w-sm cursor-pointer hover:scale-[1.02] transition-all duration-200 bg-slate-800/40 backdrop-blur-sm border-dashed border-2 border-slate-600/50 hover:border-green-500/50 hover:bg-slate-700/40 rounded-xl"
              >
                <div className="p-6 flex items-center justify-center gap-6 min-h-[140px]">
                  <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-100 mb-2">Nouveau Personnage</h3>
                    <p className="text-sm text-slate-200">
                      Créez un nouveau personnage pour vos aventures
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="w-full max-w-md mx-auto px-4">
          <button
            onClick={handleSignOut}
            className="w-full btn-secondary px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>

      <CreatorModal
        open={showCreator}
        onClose={() => {
          setShowCreator(false);
          appContextService.clearWizardSnapshot();
          appContextService.setContext('selection');
        }}
        onComplete={handleCreatorComplete}
        initialSnapshot={appContextService.getWizardSnapshot()}
      />

      {creating && (
        <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 text-center max-w-md">
            <img 
              src="/icons/wmremove-transformed.png" 
              alt="Chargement..." 
              className="animate-spin h-16 w-16 mx-auto mb-6 object-contain"
              style={{ backgroundColor: 'transparent' }}
            />
            <p className="text-xl text-gray-200 mb-2">Création du personnage...</p>
            <p className="text-sm text-gray-400">Veuillez patienter</p>
          </div>
        </div>
      )}

      <WelcomeModal
        open={showWelcome}
        characterName={newCharacter?.adventurer_name || newCharacter?.name || 'Aventurier'}
        onContinue={handleWelcomeContinue}
      />
    </div>
  );
}

export default CharacterSelectionPage;