import React, { useEffect, useRef, useState } from 'react';
import { X, Gift, Users, Check, Package, Coins } from 'lucide-react';
import { Player } from '../types/dnd';
import { supabase } from '../lib/supabase';
import { campaignService } from '../services/campaignService';
import {
  CampaignInvitation,
  CampaignGift,
  CampaignMember,
  Campaign,
  CampaignGiftClaim,
} from '../types/campaign';
import toast from 'react-hot-toast';

interface CampaignPlayerModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  onUpdate: (player: Player) => void;
  onInventoryAdd?: (item: any) => void; // <-- ajout
}

export function CampaignPlayerModal({
  open,
  onClose,
  player,
  onUpdate,
}: CampaignPlayerModalProps) {
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [pendingGifts, setPendingGifts] = useState<CampaignGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invitations' | 'gifts'>('gifts');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // refs for cleanup
  const invChannelRef = useRef<any>(null);
  const giftChannelsRef = useRef<any[]>([]);
  const claimChannelRef = useRef<any>(null);

  // Utilitaires méta
  const META_PREFIX = '#meta:';
  const getVisibleDescription = (description: string | null | undefined): string => {
    if (!description) return '';
    return description
      .split('\n')
      .filter((line) => !line.trim().startsWith(META_PREFIX))
      .join('\n')
      .trim();
  };
  const parseMeta = (description: string | null | undefined) => {
    if (!description) return null;
    const lines = description.split('\n').map((l) => l.trim());
    const metaLine = [...lines].reverse().find((l) => l.startsWith(META_PREFIX));
    if (!metaLine) return null;
    try {
      return JSON.parse(metaLine.slice(META_PREFIX.length));
    } catch {
      return null;
    }
  };

  // subscribe to inventory_items INSERT for this player (realtime)
  useEffect(() => {
    // cleanup existing channel if any
    if (invChannelRef.current) {
      if (typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(invChannelRef.current);
      } else {
        invChannelRef.current.unsubscribe?.();
      }
      invChannelRef.current = null;
    }

    if (!open || !player?.id) return;

    const channel = supabase
      .channel(`inv-player-${player.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_items',
          filter: `player_id=eq.${player.id}`,
        },
        (payload: any) => {
          console.log('[Realtime] inventory_items payload:', payload);
          const rec = payload?.record ?? payload?.new;
          if (!rec) return;
          setInventory((prev) => [rec, ...prev]);
        }
      )
      .subscribe();

    invChannelRef.current = channel;

    return () => {
      if (invChannelRef.current) {
        if (typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(invChannelRef.current);
        } else {
          invChannelRef.current.unsubscribe?.();
        }
        invChannelRef.current = null;
      }
    };
    // depend on open and player id
  }, [open, player?.id]);

  // subscribe to campaign_gifts (INSERT/UPDATE/DELETE) for campaigns the user is member of
  useEffect(() => {
    // cleanup any existing gift channels
    if (giftChannelsRef.current.length > 0) {
      giftChannelsRef.current.forEach((ch) => {
        if (typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(ch);
        } else {
          ch.unsubscribe?.();
        }
      });
      giftChannelsRef.current = [];
    }

    if (!open || !myCampaigns?.length) return;

    const campaignIds = myCampaigns.map((c) => c.id).filter(Boolean);
    if (campaignIds.length === 0) return;

    const channels: any[] = [];

    campaignIds.forEach((cid) => {
      const ch = supabase
        .channel(`campaign-gifts-${cid}`)
        // INSERT
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'campaign_gifts',
            filter: `campaign_id=eq.${cid}`,
          },
          (payload: any) => {
            console.log('[Realtime] campaign_gifts INSERT:', payload);
            const rec = payload?.record ?? payload?.new;
            if (!rec) return;
            if (rec.status !== 'pending') return;
            const uId = currentUserId;
            if (!uId) return;
            if (
              !rec.distribution_mode ||
              rec.distribution_mode === 'shared' ||
              (rec.distribution_mode === 'individual' &&
                Array.isArray(rec.recipient_ids) &&
                rec.recipient_ids.includes(uId))
            ) {
              setPendingGifts((prev) => {
                if (prev.some((g) => g.id === rec.id)) return prev;
                return [rec, ...prev];
              });
            }
          }
        )
        // UPDATE
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'campaign_gifts',
            filter: `campaign_id=eq.${cid}`,
          },
          (payload: any) => {
            console.log('[Realtime] campaign_gifts UPDATE:', payload);
            const rec = payload?.record ?? payload?.new;
            const old = payload?.old;
            if (!rec && !old) return;
            const status = rec?.status ?? old?.status;
            const id = rec?.id ?? old?.id;
            if (!id) return;
            if (status && status !== 'pending') {
              setPendingGifts((prev) => prev.filter((g) => g.id !== id));
            } else if (rec && status === 'pending') {
              const uId = currentUserId;
              if (!uId) return;
              if (
                !rec.distribution_mode ||
                rec.distribution_mode === 'shared' ||
                (rec.distribution_mode === 'individual' &&
                  Array.isArray(rec.recipient_ids) &&
                  rec.recipient_ids.includes(uId))
              ) {
                setPendingGifts((prev) => {
                  if (prev.some((g) => g.id === rec.id)) return prev;
                  return [rec, ...prev];
                });
              }
            }
          }
        )
        // DELETE
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'campaign_gifts',
            filter: `campaign_id=eq.${cid}`,
          },
          (payload: any) => {
            console.log('[Realtime] campaign_gifts DELETE:', payload);
            const oldRec = payload?.old;
            if (!oldRec) return;
            setPendingGifts((prev) => prev.filter((g) => g.id !== oldRec.id));
          }
        )
        .subscribe();

      channels.push(ch);
    });

    giftChannelsRef.current = channels;

    return () => {
      if (giftChannelsRef.current.length > 0) {
        giftChannelsRef.current.forEach((ch) => {
          if (typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(ch);
          } else {
            ch.unsubscribe?.();
          }
        });
        giftChannelsRef.current = [];
      }
    };
    // depend on open and myCampaigns
  }, [open, myCampaigns, currentUserId]);

  // subscribe to campaign_gift_claims INSERT - remove pending gifts locally when claims are created
  useEffect(() => {
    if (claimChannelRef.current) {
      if (typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(claimChannelRef.current);
      } else {
        claimChannelRef.current.unsubscribe?.();
      }
      claimChannelRef.current = null;
    }

    if (!open) return;

    const ch = supabase
      .channel('campaign-gift-claims')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_gift_claims',
        },
        (payload: any) => {
          console.log('[Realtime] campaign_gift_claims INSERT:', payload);
          const rec = payload?.record ?? payload?.new;
          if (!rec || !rec.gift_id) return;
          setPendingGifts((prev) => prev.filter((g) => g.id !== rec.gift_id));
        }
      )
      .subscribe();

    claimChannelRef.current = ch;

    return () => {
      if (claimChannelRef.current) {
        if (typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(claimChannelRef.current);
        } else {
          claimChannelRef.current.unsubscribe?.();
        }
        claimChannelRef.current = null;
      }
    };
  }, [open]);

  // load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        return;
      }
      setCurrentUserId(user.id);

      // invitations
      const invites = await campaignService.getMyInvitations();
      setInvitations(invites || []);

      // get campaigns where user is member
      const { data: members } = await supabase
        .from('campaign_members')
        .select('campaign_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (members && members.length > 0) {
        const campaignIds = members.map((m: any) => m.campaign_id);
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .in('id', campaignIds);

        setMyCampaigns(campaigns || []);

        // pending gifts
        const { data: gifts } = await supabase
          .from('campaign_gifts')
          .select('*')
          .in('campaign_id', campaignIds)
          .eq('status', 'pending')
          .order('sent_at', { ascending: false });

        const giftsList: CampaignGift[] = gifts || [];

        // fetch claims by this user for those gifts
        const giftIds = giftsList.map((g) => g.id).filter(Boolean) as string[];
        let userClaims: { gift_id: string }[] = [];
        if (giftIds.length > 0) {
          const { data: claims } = await supabase
            .from('campaign_gift_claims')
            .select('gift_id')
            .in('gift_id', giftIds)
            .eq('user_id', user.id);
          userClaims = claims || [];
        }
        const claimedSet = new Set(userClaims.map((c) => c.gift_id));

        // filter visible gifts
        const visibleGifts = giftsList.filter((g) => {
          if (!g || !g.id) return false;
          if (claimedSet.has(g.id)) return false;
          if (!g.distribution_mode || g.distribution_mode === 'shared') return true;
          if (g.distribution_mode === 'individual') {
            if (Array.isArray((g as any).recipient_ids) && (g as any).recipient_ids.includes(user.id)) {
              return true;
            }
            return false;
          }
          return false;
        });

        setPendingGifts(visibleGifts);

        // load initial inventory for player
        const { data: invRows } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false });

        setInventory(invRows || []);
      } else {
        setPendingGifts([]);
        setInventory([]);
        setMyCampaigns([]);
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
      await loadData();
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
      await loadData();
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

console.log('About to call RPC claimGift for gift', gift.id, 'player', player.id, 'invChannel:', !!invChannelRef?.current);
  
  const handleClaimGift = async (gift: CampaignGift) => {
    if (isClaiming) return;
    setIsClaiming(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      // local remove helper
      const removePendingGiftLocal = () => {
        try {
          setPendingGifts((prev) => prev.filter((p) => p.id !== gift.id));
        } catch (e) {
          console.warn('Erreur mise à jour état local pending gifts, reload:', e);
        }
      };

      // ITEM flow
      if (gift.gift_type === 'item') {
        try {
          const { claim, item } = await campaignService.claimGift(gift.id, player.id, {
            quantity: gift.item_quantity || 1,
          });

          console.log('RPC claim result:', { claim, item });

          // remove locally first
          removePendingGiftLocal();

          // prefer item returned by RPC
if (item) {
  setInventory((prev) => [item, ...prev]);
  onInventoryAdd?.(item); // <-- notifier le parent
  toast.success('Cadeau récupéré !');
  setTimeout(() => onClose(), 700);
  return;
}

          // fallback: fetch the newest inventory row for this player (in case RPC didn't return item)
          try {
            const { data: latestRows, error } = await supabase
              .from('inventory_items')
              .select('*')
              .eq('player_id', player.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!error && latestRows && latestRows.length > 0) {
              setInventory((prev) => [latestRows[0], ...prev]);
              toast.success('Cadeau récupéré !');
              setTimeout(() => onClose(), 700);
              return;
            }
          } catch (err) {
            console.warn('fallback fetch failed', err);
          }

          // ultimate fallback: try to create the inventory row client-side (rare)
          const metaPrefix = META_PREFIX;
          let originalMeta = null;
          if (gift.item_description) {
            const lines = gift.item_description.split('\n');
            const metaLine = lines.find((l) => l.trim().startsWith(metaPrefix));
            if (metaLine) {
              try {
                originalMeta = JSON.parse(metaLine.trim().slice(metaPrefix.length));
              } catch (err) {
                console.error('Erreur parsing métadonnées:', err);
              }
            }
          }

          const itemMeta = originalMeta || {
            type: 'equipment' as const,
            quantity: gift.item_quantity || 1,
            equipped: false,
          };

          const cleanDescription = gift.item_description
            ? gift.item_description
                .split('\n')
                .filter((line) => !line.trim().startsWith(metaPrefix))
                .join('\n')
                .trim()
            : '';

          const finalDescription = cleanDescription
            ? `${cleanDescription}\n${metaPrefix}${JSON.stringify(itemMeta)}`
            : `${metaPrefix}${JSON.stringify(itemMeta)}`;

          const { data: insertedItem, error: insertErr } = await supabase
            .from('inventory_items')
            .insert({
              player_id: player.id,
              name: gift.item_name || 'Objet',
              description: finalDescription,
            })
            .select()
            .single();

          if (insertErr) {
            console.error('❌ Insert error (fallback client insert):', insertErr);
            toast.error('Erreur lors de l\'ajout à votre inventaire');
          } else {
            setInventory((prev) => [insertedItem, ...prev]);
            const typeLabel =
              itemMeta.type === 'armor' ? 'Armure' :
              itemMeta.type === 'shield' ? 'Bouclier' :
              itemMeta.type === 'weapon' ? 'Arme' :
              'Objet';
            toast.success(`${typeLabel} "${gift.item_name}" ajoutée à votre inventaire !`);
          }

          setTimeout(() => onClose(), 700);
          return;
        } catch (err: any) {
          console.error('Erreur lors du claim (item):', err);
          toast.error(err?.message || 'Impossible de récupérer l\'objet (probablement déjà récupéré).');
          await loadData();
          return;
        }
      }

      // CURRENCY flow
      try {
        // optimistic update locally
        const newGold = (player.gold || 0) + (gift.gold || 0);
        const newSilver = (player.silver || 0) + (gift.silver || 0);
        const newCopper = (player.copper || 0) + (gift.copper || 0);

        onUpdate({
          ...player,
          gold: newGold,
          silver: newSilver,
          copper: newCopper,
        });

        // record the claim server-side
        await campaignService.claimGift(gift.id, player.id, {
          gold: gift.gold ?? 0,
          silver: gift.silver ?? 0,
          copper: gift.copper ?? 0,
        });

        const amounts = [];
        if (gift.gold && gift.gold > 0) amounts.push(`${gift.gold} po`);
        if (gift.silver && gift.silver > 0) amounts.push(`${gift.silver} pa`);
        if (gift.copper && gift.copper > 0) amounts.push(`${gift.copper} pc`);

        toast.success(`${amounts.join(', ')} ajouté à votre argent !`);
        removePendingGiftLocal();
        setTimeout(() => onClose(), 700);
        await loadData();
        return;
      } catch (err: any) {
        console.error('Erreur lors du claim (currency flow):', err);
        toast.error('Erreur lors de la récupération');
        await loadData();
        return;
      }
    } finally {
      setIsClaiming(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[11000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed inset-0 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(42rem,95vw)] sm:max-h-[90vh] sm:rounded-xl overflow-hidden bg-gray-900 border-0 sm:border sm:border-gray-700 rounded-none">
        {/* Header */}
        <div className="bg-gray-800/60 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              Mes Campagnes
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
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
              className={`pb-2 px-1 border-b-2 transition-colors ${
                activeTab === 'gifts'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Loots ({pendingGifts.length})
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

              {/* Invitations list */}
              {invitations.length > 0 ? (
                invitations.map((invitation) => (
                  <div key={invitation.id} className="bg-gray-800/40 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">
                          Nouvelle invitation à une campagne
                        </h3>
                        <p className="text-sm text-gray-400">
                          Vous avez été invité à rejoindre une campagne par le Maître du Jeu
                        </p>
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                            Code d'invitation (optionnel)
                          </summary>
                          <p className="text-xs text-gray-400 mt-1">
                            Code : <span className="font-mono text-purple-400">{invitation.invitation_code}</span>
                          </p>
                        </details>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium"
                      >
                        <Check size={18} />
                        Accepter et rejoindre
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))
              ) : !showCodeInput ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">
                    Aucune invitation en attente
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Demandez à votre Maître du Jeu de vous inviter à une campagne
                  </p>
                  <button
                    onClick={() => setShowCodeInput(true)}
                    className="text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    Ou entrez un code d'invitation manuellement
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
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
                        disabled={isClaiming}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
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
                  <p className="text-sm mt-2">Les objets et argent envoyés par votre MJ apparaîtront ici</p>
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