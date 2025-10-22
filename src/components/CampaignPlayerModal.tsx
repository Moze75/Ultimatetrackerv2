import React, { useEffect, useRef, useState } from 'react';
import { X, Gift, Users, Check, Package, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { campaignService } from '../services/campaignService';
import { Player } from '../types/dnd';
import {
  CampaignInvitation,
  CampaignGift,
  Campaign,
  CampaignGiftClaim,
} from '../types/campaign';

interface CampaignPlayerPanelProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  onUpdate: (player: Player) => void;
  onInventoryAdd?: (item: any) => void;
}

const META_PREFIX = '#meta:';

export function CampaignPlayerPanel({
  open,
  onClose,
  player,
  onUpdate,
  onInventoryAdd,
}: CampaignPlayerPanelProps) {
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [pendingGifts, setPendingGifts] = useState<CampaignGift[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invitations' | 'gifts'>('gifts');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // refs pour cleanup des channels
  const invChannelRef = useRef<any | null>(null);
  const giftChannelsRef = useRef<any[]>([]);
  const claimChannelRef = useRef<any | null>(null);

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

  /* Realtime inventory (INSERT) */
  useEffect(() => {
    // cleanup
    try {
      if (invChannelRef.current) {
        if (typeof supabase.removeChannel === 'function') supabase.removeChannel(invChannelRef.current);
        else invChannelRef.current.unsubscribe?.();
        invChannelRef.current = null;
      }
    } catch (e) {
      console.warn('cleanup inv channel failed', e);
      invChannelRef.current = null;
    }

    if (!open || !player?.id) return;

    const ch = supabase
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
          console.log('[Realtime] inventory_items payload (panel):', payload);
          const rec = payload?.record ?? payload?.new;
          if (!rec) return;
          setInventory((prev) => (prev.some((i) => i.id === rec.id) ? prev : [rec, ...prev]));
          try { onInventoryAdd?.(rec); } catch {}
        }
      )
      .subscribe();

    invChannelRef.current = ch;
    return () => {
      try {
        if (invChannelRef.current) {
          if (typeof supabase.removeChannel === 'function') supabase.removeChannel(invChannelRef.current);
          else invChannelRef.current.unsubscribe?.();
        }
      } catch {}
      invChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player?.id]);

  /* Realtime campaign_gifts (INSERT/UPDATE/DELETE) */
  useEffect(() => {
    // cleanup previous gift channels
    try {
      if (giftChannelsRef.current?.length) {
        giftChannelsRef.current.forEach((ch) => {
          if (typeof supabase.removeChannel === 'function') supabase.removeChannel(ch);
          else ch.unsubscribe?.();
        });
      }
    } catch (e) {
      console.warn('cleanup gift channels failed', e);
    } finally {
      giftChannelsRef.current = [];
    }

    if (!open || !myCampaigns?.length) return;

    const campaignIds = myCampaigns.map((c) => c.id).filter(Boolean);
    if (campaignIds.length === 0) return;

    const channels: any[] = [];
    campaignIds.forEach((cid) => {
      const ch = supabase
        .channel(`campaign-gifts-${cid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_gifts', filter: `campaign_id=eq.${cid}` }, (payload: any) => {
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
            setPendingGifts((prev) => (prev.some((g) => g.id === rec.id) ? prev : [rec, ...prev]));
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaign_gifts', filter: `campaign_id=eq.${cid}` }, (payload: any) => {
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
              setPendingGifts((prev) => (prev.some((g) => g.id === rec.id) ? prev : [rec, ...prev]));
            }
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'campaign_gifts', filter: `campaign_id=eq.${cid}` }, (payload: any) => {
          const oldRec = payload?.old;
          if (!oldRec) return;
          setPendingGifts((prev) => prev.filter((g) => g.id !== oldRec.id));
        })
        .subscribe();

      channels.push(ch);
    });

    giftChannelsRef.current = channels;

    return () => {
      try {
        giftChannelsRef.current.forEach((ch) => {
          if (typeof supabase.removeChannel === 'function') supabase.removeChannel(ch);
          else ch.unsubscribe?.();
        });
      } catch {}
      giftChannelsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myCampaigns, currentUserId]);

  /* Realtime campaign_gift_claims (INSERT) */
  useEffect(() => {
    try {
      if (claimChannelRef.current) {
        if (typeof supabase.removeChannel === 'function') supabase.removeChannel(claimChannelRef.current);
        else claimChannelRef.current.unsubscribe?.();
        claimChannelRef.current = null;
      }
    } catch (e) {
      console.warn('cleanup claim channel failed', e);
      claimChannelRef.current = null;
    }

    if (!open) return;

    const ch = supabase
      .channel(`campaign-gift-claims`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_gift_claims' }, (payload: any) => {
        const rec = payload?.record ?? payload?.new;
        if (!rec || !rec.gift_id) return;
        setPendingGifts((prev) => prev.filter((g) => g.id !== rec.gift_id));
      })
      .subscribe();

    claimChannelRef.current = ch;
    return () => {
      try {
        if (claimChannelRef.current) {
          if (typeof supabase.removeChannel === 'function') supabase.removeChannel(claimChannelRef.current);
          else claimChannelRef.current.unsubscribe?.();
        }
      } catch {}
      claimChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myCampaigns]);

  /* Load data */
  useEffect(() => {
    if (open) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const invites = await campaignService.getMyInvitations();
      setInvitations(invites || []);

      const { data: members } = await supabase.from('campaign_members').select('campaign_id').eq('user_id', user.id).eq('is_active', true);
      if (members && members.length > 0) {
        const campaignIds = members.map((m: any) => m.campaign_id);
        const { data: campaigns } = await supabase.from('campaigns').select('*').in('id', campaignIds);
        setMyCampaigns(campaigns || []);

        const { data: gifts } = await supabase.from('campaign_gifts').select('*').in('campaign_id', campaignIds).eq('status', 'pending').order('sent_at', { ascending: false });
        const giftsList: CampaignGift[] = gifts || [];

        const giftIds = giftsList.map((g) => g.id).filter(Boolean) as string[];
        let userClaims: { gift_id: string }[] = [];
        if (giftIds.length > 0) {
          const { data: claims } = await supabase.from('campaign_gift_claims').select('gift_id').in('gift_id', giftIds).eq('user_id', user.id);
          userClaims = claims || [];
        }
        const claimedSet = new Set(userClaims.map((c) => c.gift_id));

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

        const { data: invRows } = await supabase.from('inventory_items').select('*').eq('player_id', player.id).order('created_at', { ascending: false });
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

  /* Handlers invitations */
  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await campaignService.acceptInvitation(invitationId, player.id);
      toast.success('Invitation acceptée !');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'acceptation");
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
      if (error.message?.includes('not found')) toast.error('Code d\'invitation invalide');
      else toast.error('Erreur lors de la vérification du code');
    }
  };

  /* Claim gift */
  const handleClaimGift = async (gift: CampaignGift) => {
    if (isClaiming) return;
    setIsClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      const removePendingGiftLocal = () => {
        try {
          setPendingGifts((prev) => prev.filter((p) => p.id !== gift.id));
        } catch (e) {
          console.warn('Erreur mise à jour état local pending gifts, reload:', e);
        }
      };

      if (gift.gift_type === 'item') {
        try {
          console.log('About to call RPC claimGift for gift', gift.id, 'player', player.id, 'invChannelExists', !!invChannelRef.current);

          const { claim, item } = await campaignService.claimGift(gift.id, player.id, { quantity: gift.item_quantity || 1 });
          console.log('RPC claim result:', { claim, item });

          removePendingGiftLocal();

          if (item) {
            setInventory((prev) => [item, ...prev]);
            try { onInventoryAdd?.(item); } catch {}
            toast.success('Cadeau récupéré !');
            setTimeout(() => onClose(), 700);
            return;
          }

          // fallback fetch latest
          try {
            const { data: latestRows, error } = await supabase.from('inventory_items').select('*').eq('player_id', player.id).order('created_at', { ascending: false }).limit(1);
            if (!error && latestRows && latestRows.length > 0) {
              setInventory((prev) => [latestRows[0], ...prev]);
              try { onInventoryAdd?.(latestRows[0]); } catch {}
              toast.success('Cadeau récupéré !');
              setTimeout(() => onClose(), 700);
              return;
            }
          } catch (err) {
            console.warn('fallback fetch failed', err);
          }

          // ultimate fallback: client insert
          const metaPrefix = META_PREFIX;
          let originalMeta = null;
          if (gift.item_description) {
            const lines = gift.item_description.split('\n');
            const metaLine = lines.find((l) => l.trim().startsWith(metaPrefix));
            if (metaLine) {
              try { originalMeta = JSON.parse(metaLine.trim().slice(metaPrefix.length)); } catch {}
            }
          }
          const itemMeta = originalMeta || { type: 'equipment' as const, quantity: gift.item_quantity || 1, equipped: false };
          const cleanDescription = gift.item_description ? gift.item_description.split('\n').filter((line) => !line.trim().startsWith(metaPrefix)).join('\n').trim() : '';
          const finalDescription = cleanDescription ? `${cleanDescription}\n${metaPrefix}${JSON.stringify(itemMeta)}` : `${metaPrefix}${JSON.stringify(itemMeta)}`;

          const { data: insertedItem, error: insertErr } = await supabase.from('inventory_items').insert({ player_id: player.id, name: gift.item_name || 'Objet', description: finalDescription }).select().single();

          if (insertErr) {
            console.error('❌ Insert error (fallback client insert):', insertErr);
            toast.error('Erreur lors de l\'ajout à votre inventaire');
          } else {
            setInventory((prev) => [insertedItem, ...prev]);
            try { onInventoryAdd?.(insertedItem); } catch {}
            const typeLabel = itemMeta.type === 'armor' ? 'Armure' : itemMeta.type === 'shield' ? 'Bouclier' : itemMeta.type === 'weapon' ? 'Arme' : 'Objet';
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

      // currency flow
      try {
        const newGold = (player.gold || 0) + (gift.gold || 0);
        const newSilver = (player.silver || 0) + (gift.silver || 0);
        const newCopper = (player.copper || 0) + (gift.copper || 0);

        onUpdate({ ...player, gold: newGold, silver: newSilver, copper: newCopper });

        await campaignService.claimGift(gift.id, player.id, { gold: gift.gold ?? 0, silver: gift.silver ?? 0, copper: gift.copper ?? 0 });

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

  // Panel rendering (inline, plutôt que modal overlay)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800/60 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Mes Campagnes</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-700/50 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-3 border-b border-gray-800 flex gap-3">
        <button onClick={() => setActiveTab('invitations')} className={`text-sm px-2 pb-1 ${activeTab === 'invitations' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`}>
          Invitations ({invitations.length})
        </button>
        <button onClick={() => setActiveTab('gifts')} className={`text-sm px-2 pb-1 ${activeTab === 'gifts' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`}>
          Loots ({pendingGifts.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Chargement...</p>
          </div>
        ) : activeTab === 'invitations' ? (
          <div className="space-y-3">
            {!showCodeInput ? (
              <button onClick={() => setShowCodeInput(true)} className="w-full btn-primary px-3 py-2 rounded-md flex items-center gap-2 text-sm">
                <Check size={16} /> Rejoindre avec un code
              </button>
            ) : (
              <div className="bg-gray-800/40 rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Code d'invitation</h4>
                  <button onClick={() => { setShowCodeInput(false); setInvitationCode(''); }} className="text-gray-400"><X size={14} /></button>
                </div>
                <input value={invitationCode} onChange={(e) => setInvitationCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') handleJoinWithCode(); }} className="input-dark w-full px-3 py-2 rounded-md text-center font-mono" placeholder="ABCD1234" />
                <button onClick={handleJoinWithCode} className="w-full btn-primary px-3 py-2 rounded-md text-sm">Rejoindre la campagne</button>
              </div>
            )}

            {invitations.length > 0 ? invitations.map(inv => (
              <div key={inv.id} className="bg-gray-800/40 border border-purple-500/30 rounded-md p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-white text-sm">Invitation</h5>
                    <p className="text-xs text-gray-400">Invité par le MJ</p>
                    <p className="text-xs text-gray-500 mt-2">Code: <span className="font-mono text-purple-400">{inv.invitation_code}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAcceptInvitation(inv.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center justify-center gap-2"><Check size={14} /> Accepter</button>
                  <button onClick={() => handleDeclineInvitation(inv.id)} className="px-3 py-1 rounded-md bg-gray-700 text-sm">Refuser</button>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-400 py-6">
                <Users className="mx-auto mb-2" />
                <div className="text-sm">Aucune invitation en attente</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingGifts.length > 0 ? pendingGifts.map((gift) => {
              const meta = parseMeta(gift.item_description);
              return (
                <div key={gift.id} className="bg-gray-800/40 border border-purple-500/30 rounded-md p-3">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      {gift.gift_type === 'item' ? <Package className="w-4 h-4 text-purple-400" /> : <Coins className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {gift.gift_type === 'item' ? `${gift.item_name}${gift.item_quantity && gift.item_quantity > 1 ? ` x${gift.item_quantity}` : ''}` : 'Argent'}
                          </div>
                          {getVisibleDescription(gift.item_description) && <div className="text-xs text-gray-400 mt-1">{getVisibleDescription(gift.item_description)}</div>}
                          <div className="text-xs text-gray-500 mt-2">Envoyé le {new Date(gift.sent_at).toLocaleDateString('fr-FR')}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => handleClaimGift(gift)} disabled={isClaiming} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2">
                    <Gift size={14} /> Récupérer
                  </button>
                </div>
              );
            }) : (
              <div className="text-center text-gray-500 py-6">
                <Gift className="mx-auto mb-2" />
                <div>Aucun loot en attente</div>
                <div className="text-xs text-gray-400 mt-2">Les objets et argent envoyés par votre MJ apparaîtront ici</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignPlayerPanel;