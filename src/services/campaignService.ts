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
async function callRpc(fnName: string, params: any): Promise<any> {
  const { data, error } = await supabase.rpc(fnName, params);
  if (error) throw error;
  return data;
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
  // NOUVELLES FONCTIONS - Invitations par personnage
  // =============================================

  /**
   * Créer une invitation pour un personnage spécifique (via code uniquement)
   */
  async createPlayerInvitation(
    campaignId: string,
    playerName: string,
    expiresInDays: number = 7
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Générer le code via la fonction SQL
    const { data: codeData, error: codeError } = await supabase.rpc(
      'generate_invitation_code'
    );

    if (codeError) {
      console.warn('RPC generate_invitation_code failed, using client-side generation:', codeError);
      // Fallback : génération côté client
      const invitationCode = generateInvitationCode();
      
      const { error } = await supabase.from('campaign_invitations').insert({
        campaign_id: campaignId,
        invitation_code: invitationCode,
        status: 'pending',
        created_by: user.id,
        player_email: null,
        expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;
      return invitationCode;
    }

    const invitationCode = codeData;

    // Créer l'invitation (sans email, juste un code)
    const { error } = await supabase.from('campaign_invitations').insert({
      campaign_id: campaignId,
      invitation_code: invitationCode,
      status: 'pending',
      created_by: user.id,
      player_email: null,
      expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) throw error;
    return invitationCode;
  },

  /**
   * Valider un code d'invitation (sans l'accepter)
   */
 async validateInvitationCode(code: string): Promise<{
  valid: boolean;
  invitation?: any;
  campaign?: any;
  error?: string;
}> {
  const upperCode = code.toUpperCase().trim();

  // Récupérer l'invitation
  const { data: invitation, error: invError } = await supabase
    .from('campaign_invitations')
    .select(`
      *,
      campaigns (
        id,
        name,
        description,
        game_master_id
      )
    `)
    .eq('invitation_code', upperCode)
    .single();

  if (invError || !invitation) {
    return { valid: false, error: 'Code invalide' };
  }

  // Vérifier le statut
  if (invitation.status !== 'pending') {
    return { valid: false, error: 'Code déjà utilisé' };
  }

  // Vérifier l'expiration
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return { valid: false, error: 'Code expiré' };
  }

  // Marquer comme "vu"
  await supabase
    .from('campaign_invitations')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return {
    valid: true,
    invitation,
    campaign: invitation.campaigns,
  };
},

  /**
   * Accepter une invitation avec un code et un personnage
   */
  async acceptInvitationWithPlayer(
    invitationCode: string,
    playerId: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const upperCode = invitationCode.toUpperCase().trim();

    // Valider le code
    const validation = await this.validateInvitationCode(upperCode);
    if (!validation.valid || !validation.invitation) {
      throw new Error(validation.error || 'Code invalide');
    }

    const invitation = validation.invitation;

    // Vérifier que le joueur appartient à l'utilisateur
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, user_id, name')
      .eq('id', playerId)
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      throw new Error('Personnage invalide');
    }

    // Vérifier que le joueur n'est pas déjà dans la campagne
    const { data: existingMember } = await supabase
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', invitation.campaign_id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingMember) {
      throw new Error('Ce personnage est déjà membre de cette campagne');
    }

    // Ajouter le membre à la campagne
    const { error: memberError } = await supabase
      .from('campaign_members')
      .insert({
        campaign_id: invitation.campaign_id,
        user_id: user.id,
        player_id: playerId,
        role: 'player',
        is_active: true,
        joined_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    // Marquer l'invitation comme acceptée
    const { error: updateError } = await supabase
      .from('campaign_invitations')
      .update({
        status: 'accepted',
        player_id: playerId,
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;
  },

  /**
   * Récupérer les invitations en attente pour un utilisateur
   */
  async getMyPendingInvitations(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Récupérer les IDs des personnages de l'utilisateur
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id);

    const playerIds = players?.map(p => p.id) || [];

    // Récupérer les invitations (email OU personnages)
    const query = supabase
      .from('campaign_invitations')
      .select(`
        *,
        campaigns (
          id,
          name,
          description
        )
      `)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    // Construire le filtre OR
    if (playerIds.length > 0) {
      query.or(`player_email.eq.${user.email},player_id.in.(${playerIds.join(',')})`);
    } else {
      query.eq('player_email', user.email);
    }

    const { data: invitations } = await query;

    return invitations || [];
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
): Promise<{ claim: CampaignGiftClaim | null; item?: any | null }> {
  // Essayer la RPC transactionnelle
  try {
    const rpcRes = await callRpc('rpc_claim_gift', {
      _gift_id: giftId,
      _player_id: playerId,
      _claimed: claimed
    });

    // --- Parsing robuste de la réponse RPC ---
    // Supabase / Postgres peut renvoyer différentes formes :
    // - un objet { claim: ..., item: ... }
    // - un array [{ claim: ..., item: ... }]
    // - un enveloppage { rpc_claim_gift: { claim:..., item:... } }
    let payload: any = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
    if (payload && payload.rpc_claim_gift) payload = payload.rpc_claim_gift;

    const claim = payload?.claim ?? null;
    const item = payload?.item ?? null;

    return { claim, item };
  } catch (err) {
    // Fallback non-transactionnel mais plus sûr : update conditionnel D'ABORD, puis insert claim
    console.warn('rpc_claim_gift failed, falling back to non-transactional flow:', err);

    const sessionRes = await supabase.auth.getUser();
    const user = sessionRes?.data?.user;
    if (!user) throw new Error('Non authentifié');

    // 1) Tentative atomique : marquer le gift comme 'distributed' seulement si status = 'pending'
    const { data: updatedGift, error: updateErr } = await supabase
      .from('campaign_gifts')
      .update({
        status: 'distributed',
        claimed_by: user.id,
        claimed_at: new Date().toISOString()
      })
      .eq('id', giftId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error('Erreur mise à jour gift (fallback):', updateErr);
      throw new Error('Impossible de marquer le cadeau comme récupéré (erreur base).');
    }

    if (!updatedGift) {
      // Pas de ligne modifiée -> déjà récupéré ou introuvable
      throw new Error('Cadeau déjà récupéré ou non disponible.');
    }

    // 2) Insérer le claim (si update OK)
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
      console.error('Erreur insertion claim (fallback) après update:', claimErr);
      // On laisse l'update (status distributed) pour éviter double-claim
      throw claimErr;
    }

    return { claim: claimRow as CampaignGiftClaim, item: null };
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