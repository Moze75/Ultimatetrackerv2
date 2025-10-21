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
    // Générer un code unique
    const { data: codeData } = await supabase.rpc('generate_invitation_code');
    const invitationCode = codeData || Math.random().toString(36).substring(2, 10).toUpperCase();

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

    // Mettre à jour l'invitation
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

    // Ajouter le joueur comme membre
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
    const { error } = await supabase
      .from('campaign_invitations')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
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
  // MEMBRES
  // =============================================

  async getCampaignMembers(campaignId: string): Promise<CampaignMember[]> {
    const { data, error } = await supabase
      .from('campaign_members')
      .select(`
        *,
        user:users!inner(email),
        player:players(name, adventurer_name)
      `)
      .eq('campaign_id', campaignId)
      .eq('is_active', true);

    if (error) throw error;

    // Formater les données
    return (data || []).map((member: any) => ({
      ...member,
      email: member.user?.email,
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
        description,
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
    }
  ): Promise<CampaignGift> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data: gift, error } = await supabase
      .from('campaign_gifts')
      .insert({
        campaign_id: campaignId,
        gift_type: giftType,
        item_name: data.itemName,
        item_description: data.itemDescription,
        item_quantity: data.itemQuantity,
        gold: data.gold || 0,
        silver: data.silver || 0,
        copper: data.copper || 0,
        distribution_mode: data.distributionMode,
        message: data.message,
        sent_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
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

    const { data, error } = await supabase
      .from('campaign_gift_claims')
      .insert({
        gift_id: giftId,
        user_id: user.id,
        player_id: playerId,
        claimed_quantity: claimed.quantity,
        claimed_gold: claimed.gold || 0,
        claimed_silver: claimed.silver || 0,
        claimed_copper: claimed.copper || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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