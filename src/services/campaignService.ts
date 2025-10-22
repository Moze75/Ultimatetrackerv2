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

// helper RPC — placez-le au niveau du module, avant l'objet `campaignService`
async function callRpc(fnName: string, params: any) {
  const res = await supabase.rpc(fnName, params);
  if (res.error) throw res.error;
  return res.data;
}


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

try {
    const rpcRes = await callRpc('rpc_send_gift', {
      _campaign_id: campaignId,
      _gift_type: giftType,
      _item_name: data.itemName ?? null,
      _item_description: data.itemDescription ?? null,
      _item_quantity: data.itemQuantity ?? null,
      _gold: data.gold ?? 0,
      _silver: data.silver ?? 0,
      _copper: data.copper ?? 0,
      _distribution_mode: data.distributionMode,
      _recipient_ids: data.recipientIds ?? null,
      _message: data.message ?? null,
      _inventory_item_id: data.inventoryItemId ?? null
    });

    // Normaliser le retour (rpc peut renvoyer array ou objet)
    const gift = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
    return gift as CampaignGift;
  } catch (err) {
    // Fallback non-transactionnel si RPC indisponible / error
    console.warn('rpc_send_gift failed, falling back to JS implementation:', err);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

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
        sent_at: new Date().toISOString(),
        inventory_item_id: data.inventoryItemId ?? null
      })
      .select()
      .single();

    if (error) throw error;

    // Best-effort : décrémenter inventaire de campagne si demandé
    if (data.inventoryItemId && data.itemQuantity && data.itemQuantity > 0) {
      try {
        const { data: invRow, error: invErr } = await supabase
          .from('campaign_inventory')
          .select('id, quantity')
          .eq('id', data.inventoryItemId)
          .single();

        if (!invErr && invRow) {
          const newQty = (invRow.quantity || 0) - (data.itemQuantity || 0);
          if (newQty > 0) {
            await supabase
              .from('campaign_inventory')
              .update({ quantity: newQty })
              .eq('id', data.inventoryItemId);
          } else {
            await supabase
              .from('campaign_inventory')
              .delete()
              .eq('id', data.inventoryItemId);
          }
        }
      } catch (e) {
        console.warn('Erreur décrémentation inventaire en fallback:', e);
      }
    }

    return gift as CampaignGift;
  }
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
  // Essayer la RPC transactionnelle qui fait : verrous, update gift status, insert claim,
  // création d'item joueur et update inventaire campagne / joueurs en une transaction.
  try {
    const rpcRes = await callRpc('rpc_claim_gift', {
      _gift_id: giftId,
      _player_id: playerId,
      _claimed: JSON.stringify(claimed)
    });

    // rpc_claim_gift renvoie un JSON { claim: ..., item: ... } selon la migration proposée.
    const parsed = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
    if (parsed && parsed.claim) {
      return parsed.claim as CampaignGiftClaim;
    }
    throw new Error('rpc_claim_gift returned unexpected shape');
  } catch (err) {
    // Fallback non-transactionnel
    console.warn('rpc_claim_gift failed, falling back to non-transactional flow:', err);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Insérer le claim
    const { data, error } = await supabase
      .from('campaign_gift_claims')
      .insert({
        gift_id: giftId,
        user_id: user.id,
        player_id: playerId,
        claimed_quantity: claimed.quantity ?? null,
        claimed_gold: claimed.gold ?? 0,
        claimed_silver: claimed.silver ?? 0,
        claimed_copper: claimed.copper ?? 0,
        claimed_at: new Date().toISOString(),
        details: claimed
      })
      .select()
      .single();

    if (error) throw error;

    // Best-effort : marquer gift comme claimed si il était pending
    try {
      await supabase
        .from('campaign_gifts')
        .update({ status: 'claimed', claimed_by: user.id, claimed_at: new Date().toISOString() })
        .eq('id', giftId)
        .eq('status', 'pending');
    } catch (e) {
      console.warn('Erreur marquage gift claimed en fallback:', e);
    }

    return data as CampaignGiftClaim;
  }
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