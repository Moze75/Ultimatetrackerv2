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

  async sendGift(
    campaignId: string,
    giftType: GiftType,
    data: {
      itemName?: string;
      itemDescription?: string;
      itemQuantity?: number;
      gold?: number;
      silver?: number;
      copper?: number;
      distributionMode: DistributionMode;
      message?: string;
      recipientIds?: string[]; // destinataires explicites pour mode 'individual'
      inventoryItemId?: string; // facultatif : id du campaign_inventory à décrémenter/supprimer
    }
  ): Promise<CampaignGift> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Insère le gift (status = 'pending')
    const { data: gift, error } = await supabase
      .from('campaign_gifts')
      .insert({
        campaign_id: campaignId,
        gift_type: giftType,
        item_name: data.itemName ?? null,
        item_description: data.itemDescription ?? null,
        item_quantity: data.itemQuantity ?? null,
        gold: data.gold ?? 0,
        silver: data.silver ?? 0,
        copper: data.copper ?? 0,
        distribution_mode: data.distributionMode,
        recipient_ids: data.recipientIds ?? null,
        message: data.message ?? null,
        sent_by: user.id,
        status: 'pending',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Optionnel : décrémenter / supprimer l'item dans l'inventaire de campagne
    // NOTE: ceci n'est pas atomique avec la création du gift. Pour atomicité, créez un RPC PL/pgSQL.
    if (data.inventoryItemId && data.itemQuantity && data.itemQuantity > 0) {
      try {
        const { data: invRow, error: invErr } = await supabase
          .from('campaign_inventory')
          .select('id, quantity')
          .eq('id', data.inventoryItemId)
          .single();

        if (invErr) {
          console.warn('Impossible de lire l\'inventaire pour décrémentation', invErr);
        } else {
          const newQty = (invRow.quantity || 0) - (data.itemQuantity || 0);
          if (newQty > 0) {
            const { error: qErr } = await supabase
              .from('campaign_inventory')
              .update({ quantity: newQty })
              .eq('id', data.inventoryItemId);
            if (qErr) console.warn('Erreur mise à jour quantité inventaire:', qErr);
          } else {
            const { error: delErr } = await supabase
              .from('campaign_inventory')
              .delete()
              .eq('id', data.inventoryItemId);
            if (delErr) console.warn('Erreur suppression inventaire:', delErr);
          }
        }
      } catch (err) {
        console.warn('Erreur lors de la décrémentation d\'inventaire après envoi du gift:', err);
      }
    }

    return gift;
  },

  async getCampaignGifts(campaignId: string): Promise<CampaignGift[]> {
    const { data, error } = await supabase
      .from('campaign_gifts')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

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
      console.error('Erreur mise à jour gift:', updateErr);
      throw new Error('Impossible de marquer le cadeau comme récupéré (déjà récupéré ou introuvable).');
    }

    if (!updatedGift) {
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
      console.error('Erreur insertion claim:', claimErr);
      throw claimErr;
    }

    return claimRow;
  },

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