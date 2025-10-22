import React, { useEffect, useState } from 'react';
import { X, Gift, Users, Check, Package, Coins, AlertCircle } from 'lucide-react';
import { Player } from '../types/dnd';
import { supabase } from '../lib/supabase';
import { campaignService } from '../services/campaignService';
import {
  CampaignInvitation,
  CampaignGift,
  CampaignMember,
  Campaign
} from '../types/campaign';
import toast from 'react-hot-toast';

{pendingGifts.map((gift) => {
  const meta = parseMeta(gift.item_description);
  const isCurrencyShared = gift.gift_type === 'currency' && gift.distribution_mode === 'shared';

  return (
    <div key={gift.id} className="bg-gray-800/40 border border-purple-500/30 rounded-lg p-4">
      {/* ... contenu existant ... */}

      {/* Bouton de récupération modifié */}
      {isCurrencyShared ? (
        <button
          onClick={async () => {
            const members = await loadCampaignMembers(gift.campaign_id);
            setCampaignMembersForDistribution(members);
            setSelectedGiftForDistribution(gift);
            setShowDistributionModal(true);
          }}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Users size={18} />
          Distribuer équitablement
        </button>
      ) : (
        <button
          onClick={() => handleClaimGift(gift)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Gift size={18} />
          Récupérer
        </button>
      )}
    </div>
  );
})}

{/* Ajoutez le modal de distribution avant la fermeture du composant */}
{showDistributionModal && selectedGiftForDistribution && (
  <CurrencyDistributionModal
    gift={selectedGiftForDistribution}
    campaignMembers={campaignMembersForDistribution}
    currentUserId={user.id}
    onClose={() => {
      setShowDistributionModal(false);
      setSelectedGiftForDistribution(null);
    }}
    onDistribute={handleDistributeCurrency}
  />
)}

interface CampaignPlayerModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  onUpdate: (player: Player) => void;
}

export function CampaignPlayerModal({
  open,
  onClose,
  player,
  onUpdate
}: CampaignPlayerModalProps) {
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]); // ✅ NOUVEAU
  const [pendingGifts, setPendingGifts] = useState<CampaignGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invitations' | 'gifts'>('gifts'); // ✅ Changé à 'gifts'
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');

  // Utilitaires pour cacher / parser les méta
  const META_PREFIX = '#meta:';
  const getVisibleDescription = (description: string | null | undefined): string => {
    if (!description) return '';
    return description
      .split('\n')
      .filter(line => !line.trim().startsWith(META_PREFIX))
      .join('\n')
      .trim();
  };
  const parseMeta = (description: string | null | undefined) => {
    if (!description) return null;
    const lines = description.split('\n').map(l => l.trim());
    const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
    if (!metaLine) return null;
    try {
      return JSON.parse(metaLine.slice(META_PREFIX.length));
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger les invitations
      const invites = await campaignService.getMyInvitations();
      setInvitations(invites);

      // Charger mes campagnes
      const { data: members } = await supabase
        .from('campaign_members')
        .select('campaign_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (members && members.length > 0) {
        const campaignIds = members.map(m => m.campaign_id);
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .in('id', campaignIds);

        setMyCampaigns(campaigns || []);
        setActiveCampaigns(campaigns || []); // ✅ NOUVEAU

        // Charger les cadeaux en attente
        const { data: gifts } = await supabase
          .from('campaign_gifts')
          .select('*')
          .in('campaign_id', campaignIds)
          .eq('status', 'pending')
          .order('sent_at', { ascending: false });

        // ✅ CORRECTION : Filtrer les cadeaux selon le mode de distribution
        const filteredGifts = (gifts || []).filter((gift) => {
          // Les cadeaux partagés sont visibles par tous
          if (gift.distribution_mode === 'shared') {
            return true;
          }
          
          // Les cadeaux individuels ne sont visibles que pour les destinataires spécifiques
          if (gift.distribution_mode === 'individual' && gift.recipient_ids) {
            return gift.recipient_ids.includes(user.id);
          }
          
          // Par défaut, ne pas afficher
          return false;
        });

        // Filtrer les cadeaux non encore récupérés
        const giftsWithClaims = await Promise.all(
          filteredGifts.map(async (gift) => {
            const claims = await campaignService.getGiftClaims(gift.id);
            const alreadyClaimed = claims.some(c => c.user_id === user.id);
            return { gift, alreadyClaimed };
          })
        );

        setPendingGifts(
          giftsWithClaims
            .filter(g => !g.alreadyClaimed)
            .map(g => g.gift)
        );
      }
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await campaignService.acceptInvitation(invitationId, player.id);
      toast.success('Invitation acceptée !');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!confirm('Refuser cette invitation ?')) return;
    
    try {
      await campaignService.declineInvitation(invitationId);
      toast.success('Invitation refusée');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Erreur');
    }
  };

  const handleJoinWithCode = async () => {
    const code = invitationCode.trim().toUpperCase();
    if (!code) {
      toast.error('Entrez un code d\'invitation');
      return;
    }

    try {
      const invitation = await campaignService.getInvitationsByCode(code);
      
      if (invitation.status !== 'pending') {
        toast.error('Cette invitation n\'est plus valide');
        return;
      }

      await handleAcceptInvitation(invitation.id);
      setShowCodeInput(false);
      setInvitationCode('');
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('not found')) {
        toast.error('Code d\'invitation invalide');
      } else {
        toast.error('Erreur lors de la vérification du code');
      }
    }
  };

  const handleClaimGift = async (gift: CampaignGift) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🎁 Claiming gift:', gift);

      if (gift.gift_type === 'item') {
        // ✅ CORRECTION : Parser les métadonnées de l'objet original
        let originalMeta = null;
        
        if (gift.item_description) {
          const lines = gift.item_description.split('\n');
          const metaLine = lines.find(l => l.trim().startsWith(META_PREFIX));
          if (metaLine) {
            try {
              originalMeta = JSON.parse(metaLine.trim().slice(META_PREFIX.length));
              console.log('📦 Métadonnées originales trouvées:', originalMeta);
            } catch (err) {
              console.error('❌ Erreur parsing métadonnées:', err);
            }
          }
        }

        // ✅ Si on a des métadonnées originales, les utiliser
        // Sinon, créer des métadonnées par défaut
        const itemMeta = originalMeta || {
          type: 'equipment' as const,
          quantity: gift.item_quantity || 1,
          equipped: false,
        };

        // ✅ S'assurer que la quantité et equipped sont à jour
        itemMeta.quantity = gift.item_quantity || 1;
        itemMeta.equipped = false;

        console.log('📦 Métadonnées finales:', itemMeta);

        const metaLine = `${META_PREFIX}${JSON.stringify(itemMeta)}`;
        
        // Nettoyer la description (retirer les anciennes métadonnées si présentes)
        const cleanDescription = gift.item_description
          ? gift.item_description
              .split('\n')
              .filter(line => !line.trim().startsWith(META_PREFIX))
              .join('\n')
              .trim()
          : '';

        const finalDescription = cleanDescription
          ? `${cleanDescription}\n${metaLine}`
          : metaLine;

        console.log('📦 Description finale:', finalDescription);

        const { data: insertedItem, error } = await supabase
          .from('inventory_items')
          .insert({
            player_id: player.id,
            name: gift.item_name || 'Objet',
            description: finalDescription,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }

        console.log('✅ Item inserted:', insertedItem);

        await campaignService.claimGift(gift.id, player.id, {
          quantity: gift.item_quantity || 1,
        });

        // ✅ Message de succès adapté au type
        const typeLabel = 
          itemMeta.type === 'armor' ? 'Armure' :
          itemMeta.type === 'shield' ? 'Bouclier' :
          itemMeta.type === 'weapon' ? 'Arme' :
          'Objet';
        
        toast.success(`${typeLabel} "${gift.item_name}" ajouté${itemMeta.type === 'armor' ? 'e' : ''} à votre inventaire !`);

        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);

      } else {
        // Code argent (inchangé)
        const { error } = await supabase.from('players').update({
          gold: (player.gold || 0) + (gift.gold || 0),
          silver: (player.silver || 0) + (gift.silver || 0),
          copper: (player.copper || 0) + (gift.copper || 0),
        }).eq('id', player.id);

        if (error) throw error;

        await campaignService.claimGift(gift.id, player.id, {
          gold: gift.gold,
          silver: gift.silver,
          copper: gift.copper,
        });

        const amounts = [];
        if (gift.gold > 0) amounts.push(`${gift.gold} po`);
        if (gift.silver > 0) amounts.push(`${gift.silver} pa`);
        if (gift.copper > 0) amounts.push(`${gift.copper} pc`);

        toast.success(`${amounts.join(', ')} ajouté à votre argent !`);

        onUpdate({
          ...player,
          gold: (player.gold || 0) + (gift.gold || 0),
          silver: (player.silver || 0) + (gift.silver || 0),
          copper: (player.copper || 0) + (gift.copper || 0),
        });

        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      }

      loadData();
    } catch (error) {
      console.error('💥 Claim error:', error);
      toast.error('Erreur lors de la récupération');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[11000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed inset-0 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(42rem,95vw)] sm:max-h-[90vh] sm:rounded-xl overflow-hidden bg-gray-900 border-0 sm:border sm:border-gray-700">
        {/* Header */}
        <div className="bg-gray-800/60 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-400" />
                Mes Campagnes
              </h2>
              
              {/* ✅ NOUVEAU : Afficher les campagnes actives */}
              {activeCampaigns.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeCampaigns.map((camp) => (
                    <span
                      key={camp.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-900/30 border border-purple-500/40 rounded-full text-sm text-purple-200"
                    >
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      {camp.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs avec badge de loots */}
          <div className="flex gap-4 mt-3">
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                activeTab === 'invitations'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Invitations ({invitations.length})
            </button>
            <button
              onClick={() => setActiveTab('gifts')}
              className={`pb-2 px-1 border-b-2 transition-colors relative ${
                activeTab === 'gifts'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                Loots ({pendingGifts.length})
                {/* ✅ Badge visuel si loots disponibles */}
                {pendingGifts.length > 0 && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
              <p className="text-gray-400">Chargement...</p>
            </div>
          ) : activeTab === 'invitations' ? (
            <div className="space-y-4">
              {!showCodeInput ? (
                <button
                  onClick={() => setShowCodeInput(true)}
                  className="w-full btn-primary px-4 py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Rejoindre avec un code
                </button>
              ) : (
                <div className="bg-gray-800/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Code d'invitation</h3>
                    <button
                      onClick={() => {
                        setShowCodeInput(false);
                        setInvitationCode('');
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    className="input-dark w-full px-4 py-2 rounded-lg text-center font-mono text-lg tracking-wider"
                    placeholder="ABCD1234"
                    maxLength={8}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoinWithCode();
                    }}
                  />
                  <button
                    onClick={handleJoinWithCode}
                    className="w-full btn-primary px-4 py-2 rounded-lg"
                  >
                    Rejoindre la campagne
                  </button>
                </div>
              )}

              {invitations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300">Invitations en attente</h3>
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-white mb-1">
                            Invitation à une campagne
                          </p>
                          <p className="text-sm text-gray-400">
                            Code: <span className="font-mono text-purple-400">{invitation.invitation_code}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Reçue le {new Date(invitation.invited_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Check size={18} />
                          Accepter
                        </button>
                        <button
                          onClick={() => handleDeclineInvitation(invitation.id)}
                          className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg border border-red-500/30"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {myCampaigns.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300">Mes campagnes actives</h3>
                  {myCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bg-gray-800/40 border border-green-500/30 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{campaign.name}</h3>
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                              Active
                            </span>
                          </div>
                          {campaign.description && (
                            <p className="text-sm text-gray-400 mt-1">{campaign.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* ✅ NOUVEAU : Message d'accueil contextuel */}
              {activeCampaigns.length > 0 && pendingGifts.length > 0 && (
                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        {pendingGifts.length} loot{pendingGifts.length > 1 ? 's' : ''} en attente !
                      </h3>
                      <p className="text-sm text-gray-300">
                        Votre Maître du Jeu a envoyé {pendingGifts.length > 1 ? 'des objets' : 'un objet'} pour votre aventure.
                        Récupérez-{pendingGifts.length > 1 ? 'les' : 'le'} ci-dessous.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des cadeaux */}
              {pendingGifts.length > 0 ? (
                pendingGifts.map((gift) => {
                  const meta = parseMeta(gift.item_description);

                  return (
                    <div
                      key={gift.id}
                      className="bg-gray-800/40 border border-purple-500/30 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                            {gift.gift_type === 'item' ? (
                              <Package className="w-5 h-5 text-purple-400" />
                            ) : (
                              <Coins className="w-5 h-5 text-yellow-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">
                                {gift.gift_type === 'item' 
                                  ? `${gift.item_name}${gift.item_quantity && gift.item_quantity > 1 ? ` x${gift.item_quantity}` : ''}`
                                  : 'Argent'
                                }
                              </h3>

                              {/* BADGE TYPE */}
                              {meta?.type === 'armor' && (
                                <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/30 ml-2">
                                  Armure
                                </span>
                              )}
                              {meta?.type === 'shield' && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30 ml-2">
                                  Bouclier
                                </span>
                              )}
                              {meta?.type === 'weapon' && (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-500/30 ml-2">
                                  Arme
                                </span>
                              )}
                            </div>

                            {/* Propriétés lisibles extraites des méta */}
                            {meta && (
                              <div className="mb-2 mt-2 text-xs text-gray-300">
                                {meta.type === 'armor' && meta.armor && (
                                  <div className="text-purple-300 flex items-center gap-2">
                                    <span className="text-sm">🛡️ CA: {meta.armor.label}</span>
                                  </div>
                                )}
                                {meta.type === 'shield' && meta.shield && (
                                  <div className="text-blue-300">🛡️ Bonus: +{meta.shield.bonus}</div>
                                )}
                                {meta.type === 'weapon' && meta.weapon && (
                                  <div className="text-red-300">
                                    ⚔️ {meta.weapon.damageDice} {meta.weapon.damageType}
                                    {meta.weapon.properties && ` • ${meta.weapon.properties}`}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Description visible (sans #meta:) */}
                            {getVisibleDescription(gift.item_description) && (
                              <p className="text-sm text-gray-400 mt-2">
                                {getVisibleDescription(gift.item_description)}
                              </p>
                            )}

                            {gift.message && (
                              <div className="mt-2 text-sm text-gray-300 italic border-l-2 border-purple-500/40 pl-3">
                                "{gift.message}"
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Envoyé le {new Date(gift.sent_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleClaimGift(gift)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Gift size={18} />
                        Récupérer
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Aucun loot en attente</p>
                  {activeCampaigns.length > 0 ? (
                    <p className="text-sm mt-2">
                      Les objets et argent envoyés par votre MJ dans{' '}
                      <span className="text-purple-400 font-semibold">
                        {activeCampaigns.map(c => c.name).join(', ')}
                      </span>
                      {' '}apparaîtront ici
                    </p>
                  ) : (
                    <p className="text-sm mt-2">
                      Rejoignez une campagne pour recevoir des loots !
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignPlayerModal;