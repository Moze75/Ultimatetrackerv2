import { supabase } from '../lib/supabase';
import {
  Campaign,
  CampaignInvitation,
  CampaignMember,
  CampaignInventoryItem,
  CampaignGift,
  CampaignGiftClaim,
  GiftType,
  DistributionMode
} from '../types/campaign';

// ✅ Fonction pour générer un code d'invitation côté client
function generateInvitationCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const campaignService = {
  // =============================================
  // CAMPAGNES
  // =============================================
  
  async createCampaign(name: string, description?: string): Promise<Campaign> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name,
        description,
        game_master_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMyCampaigns(): Promise<Campaign[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('game_master_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCampaignById(campaignId: string): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCampaign(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) throw error;
  },

  // =============================================
  // INVITATIONS
  // =============================================

  async invitePlayer(campaignId: string, playerEmail: string): Promise<CampaignInvitation> {
    const invitationCode = generateInvitationCode();

    const { data, error } = await supabase
      .from('campaign_invitations')
      .insert({
        campaign_id: campaignId,
        player_email: playerEmail,
        invitation_code: invitationCode,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getInvitationsByCode(code: string): Promise<CampaignInvitation> {
    const { data, error } = await supabase
      .from('campaign_invitations')
      .select('*')
      .eq('invitation_code', code.toUpperCase())
      .single();

    if (error) throw error;
    return data;
  },

  async acceptInvitation(invitationId: string, playerId?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data: invitation, error: invError } = await supabase
      .from('campaign_invitations')
      .update({
        status: 'accepted',
        player_id: user.id,
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (invError) throw invError;

    const { error: memberError } = await supabase
      .from('campaign_members')
      .insert({
        campaign_id: invitation.campaign_id,
        user_id: user.id,
        player_id: playerId,
      });

    if (memberError) throw memberError;
  },

async declineInvitation(invitationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // Remplir le player_id lors du refus pour satisfaire la policy
  const { error } = await supabase
    .from('campaign_invitations')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
      player_id: user.id,
    })
    .eq('id', invitationId);

  if (error) throw error;
},

  // ✅ AJOUTEZ ICI :
async deleteInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;
},

  async getMyInvitations(): Promise<CampaignInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('campaign_invitations')
      .select('*')
      .or(`player_id.eq.${user.id},player_email.eq.${user.email}`)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // =============================================
  // MEMBRES - ✅ SANS JOIN SUR auth.users
  // =============================================

async getCampaignMembers(campaignId: string): Promise<CampaignMember[]> {
  const { data: members, error } = await supabase
    .from('campaign_members')
    .select(`
      *,
      player:players(name, adventurer_name)
    `)
    .eq('campaign_id', campaignId)
    .eq('is_active', true);

  if (error) throw error;

  return (members || []).map((member: any) => ({
    ...member,
    email: member.player_email || 'Email inconnu',
    player_name: member.player?.adventurer_name || member.player?.name,
  }));
},

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_members')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) throw error;
  },

  // =============================================
  // INVENTAIRE DE CAMPAGNE
  // =============================================

async addItemToCampaign(
  campaignId: string,
  name: string,
  description: string,
  quantity: number
): Promise<CampaignInventoryItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('campaign_inventory')
    .insert({
      campaign_id: campaignId,
      name,
      description, // ✅ Contient les métadonnées #meta: si l'objet vient d'EquipmentListModal
      quantity,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
},

  async getCampaignInventory(campaignId: string): Promise<CampaignInventoryItem[]> {
    const { data, error } = await supabase
      .from('campaign_inventory')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateCampaignItem(
    itemId: string,
    updates: Partial<CampaignInventoryItem>
  ): Promise<CampaignInventoryItem> {
    const { data, error } = await supabase
      .from('campaign_inventory')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCampaignItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_inventory')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  // =============================================
  // ENVOIS (GIFTS)
  // =============================================

// Remplacez les implémentations existantes de sendGift et claimGift par ce code.
// Ces fonctions utilisent le client `supabase` déjà importé dans ce fichier.
// Note : pour une atomicité parfaite (ex : insert gift + décrémenter inventory ou insert claim + marquer gift claimed)
// il est recommandé d'implémenter une fonction PL/pgSQL (RPC) et l'appeler via supabase.rpc(...) — voir commentaires plus bas.

type DistributionMode = 'individual' | 'shared';

export async function sendGift(
  campaignId: string,
  type: 'item' | 'currency',
  payload: {
    itemName?: string | null;
    itemDescription?: string | null;
    itemQuantity?: number | null;
    gold?: number | null;
    silver?: number | null;
    copper?: number | null;
    distributionMode?: DistributionMode | null;
    recipientIds?: string[] | null;
    message?: string | null;
    inventoryItemId?: string | null; // facultatif : id du campaign_inventory à décrémenter/supprimer
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // Créer le gift (status = 'pending')
  const { data: insertedGift, error: insertErr } = await supabase
    .from('campaign_gifts')
    .insert({
      campaign_id: campaignId,
      gift_type: type,
      item_name: payload.itemName ?? null,
      item_description: payload.itemDescription ?? null,
      item_quantity: payload.itemQuantity ?? null,
      gold: payload.gold ?? null,
      silver: payload.silver ?? null,
      copper: payload.copper ?? null,
      distribution_mode: payload.distributionMode ?? 'individual',
      recipient_ids: payload.recipientIds ?? null,
      message: payload.message ?? null,
      sent_by: user.id,
      status: 'pending',
      sent_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  // Optionnel : décrémenter / supprimer l'item dans l'inventaire de campagne
  // NOTE: cette étape n'est pas atomique avec la création du gift. Pour atomicité, créez un RPC côté serveur.
  if (payload.inventoryItemId && payload.itemQuantity && payload.itemQuantity > 0) {
    try {
      // Décrémenter la quantité
      const { data: updatedInv, error: updErr } = await supabase
        .from('campaign_inventory')
        .update({
          quantity: supabase.rpc ? undefined : (/* fallback, will use SQL below */ null)
        })
        // Using a raw SQL update pattern because supabase-js doesn't support column = column - value directly in update payload.
        // We'll run a SQL RPC-like query via from().update with raw SQL via .eq + .filter? Simpler: fetch current quantity then update/delete.
        .eq('id', payload.inventoryItemId);

      // Fallback / portable approach: read current quantity then update or delete.
      const { data: invRow, error: invErr } = await supabase
        .from('campaign_inventory')
        .select('id, quantity')
        .eq('id', payload.inventoryItemId)
        .single();

      if (invErr) {
        console.warn('Impossible de lire l\'inventaire pour décrémentation', invErr);
      } else {
        const newQty = (invRow.quantity || 0) - (payload.itemQuantity || 0);
        if (newQty > 0) {
          const { error: qErr } = await supabase
            .from('campaign_inventory')
            .update({ quantity: newQty })
            .eq('id', payload.inventoryItemId);
          if (qErr) console.warn('Erreur mise à jour quantité inventaire:', qErr);
        } else {
          const { error: delErr } = await supabase
            .from('campaign_inventory')
            .delete()
            .eq('id', payload.inventoryItemId);
          if (delErr) console.warn('Erreur suppression inventaire:', delErr);
        }
      }
    } catch (err) {
      console.warn('Erreur lors de la décrémentation d\'inventaire après envoi du gift:', err);
    }
  }

  return insertedGift;
}

/**
 * claimGift : marque un gift comme "claimed" de façon conditionnelle (update WHERE status='pending')
 * et enregistre une ligne dans campaign_gift_claims.
 *
 * Comportement :
 * - Si le gift.status n'est pas 'pending' la fonction échoue (déjà récupéré)
 * - L'update conditionnel `status='pending' -> status='claimed'` est atomique côté DB :
 *   si deux joueurs appellent simultanément, un seul update retournera une ligne.
 *
 * IMPORTANT : Pour une garantie ACID complète (insert claim + update gift en une transaction),
 * implémentez un RPC Postgres (PL/pgSQL) et appelez-le via supabase.rpc(...).
 */
export async function claimGift(
  giftId: string,
  userId: string,
  opts?: Record<string, any>
) {
  // Étape 1 : tenter d'atomiquement marquer le gift comme claimed (ne réussira que si status = 'pending')
  const { data: updatedGift, error: updateErr } = await supabase
    .from('campaign_gifts')
    .update({
      status: 'claimed',
      claimed_by: userId,
      claimed_at: new Date().toISOString()
    })
    .eq('id', giftId)
    .eq('status', 'pending') // conditionnelle : atomicité garantie côté Postgres
    .select()
    .single();

  if (updateErr) {
    // Si updateErr contient "No rows found" / nothing returned, on transforme en message lisible
    console.error('Erreur mise à jour gift:', updateErr);
    throw new Error('Impossible de marquer le cadeau comme récupéré (déjà récupéré ou introuvable).');
  }

  if (!updatedGift) {
    // Pas de ligne retournée -> déjà revendiqué
    throw new Error('Cadeau déjà récupéré ou non disponible.');
  }

  // Étape 2 : insérer l'enregistrement de claim
  const { data: claimRow, error: claimErr } = await supabase
    .from('campaign_gift_claims')
    .insert({
      gift_id: giftId,
      user_id: userId,
      claimed_at: new Date().toISOString(),
      details: opts || {}
    })
    .select()
    .single();

  if (claimErr) {
    // Attention : ici le gift est déjà marqué 'claimed' ; en cas d'erreur d'insertion, on laisse le statut claimed
    // pour éviter double-claim. Vous pouvez implémenter un RPC transactionnel pour éviter cet état intermédiaire.
    console.error('Erreur insertion claim:', claimErr);
    throw claimErr;
  }

  return { gift: updatedGift, claim: claimRow };
}

  async getCampaignGifts(campaignId: string): Promise<CampaignGift[]> {
    const { data, error } = await supabase
      .from('campaign_gifts')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

// Remplacer l'ancienne implémentation de claimGift par ceci :
async claimGift(
  giftId: string,
  playerId: string,
  claimed: {
    quantity?: number;
    gold?: number;
    silver?: number;
    copper?: number;
  }
): Promise<CampaignGiftClaim> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // 1) Tentative atomique : marquer le gift comme 'claimed' seulement si status = 'pending'
  //    L'update renverra la row modifiée si et seulement si status était 'pending'.
  const { data: updatedGift, error: updateErr } = await supabase
    .from('campaign_gifts')
    .update({
      status: 'claimed',
      claimed_by: user.id,
      claimed_at: new Date().toISOString()
    })
    .eq('id', giftId)
    .eq('status', 'pending')
    .select()
    .single();

  if (updateErr) {
    // Si updateErr n'est pas null, il peut indiquer erreur SQL ou "no rows"
    console.error('Erreur mise à jour gift:', updateErr);
    throw new Error('Impossible de marquer le cadeau comme récupéré (déjà récupéré ou introuvable).');
  }

  if (!updatedGift) {
    // Pas de ligne retournée -> déjà revendiqué
    throw new Error('Cadeau déjà récupéré ou non disponible.');
  }

  // 2) Insérer l'enregistrement du claim
  const { data: claimRow, error: claimErr } = await supabase
    .from('campaign_gift_claims')
    .insert({
      gift_id: giftId,
      user_id: user.id,
      player_id: playerId,
      claimed_quantity: claimed.quantity ?? null,
      claimed_gold: claimed.gold ?? 0,
      claimed_silver: claimed.silver ?? 0,
      claimed_copper: claimed.copper ?? 0,
      claimed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (claimErr) {
    // Le gift est déjà marqué 'claimed' — on ne le remettra pas en 'pending' pour éviter races.
    console.error('Erreur insertion claim:', claimErr);
    throw claimErr;
  }

  return claimRow;
}

  async getGiftClaims(giftId: string): Promise<CampaignGiftClaim[]> {
    const { data, error } = await supabase
      .from('campaign_gift_claims')
      .select('*')
      .eq('gift_id', giftId)
      .order('claimed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};