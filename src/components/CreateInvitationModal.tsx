// =============================================
// Nouvelles fonctions pour invitations par personnage
// =============================================

/**
 * Créer une invitation pour un personnage spécifique
 */
async createPlayerInvitation(
  campaignId: string,
  playerName: string,
  expiresInDays: number = 7
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // Générer le code
  const { data: codeData, error: codeError } = await supabase.rpc(
    'generate_invitation_code'
  );

  if (codeError) throw codeError;
  const invitationCode = codeData;

  // Créer l'invitation
  const { error } = await supabase.from('campaign_invitations').insert({
    campaign_id: campaignId,
    invitation_code: invitationCode,
    status: 'pending',
    created_by: user.id,
    expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
    // On stocke le nom du joueur dans un champ metadata (ou créer une colonne)
    invited_email: playerName, // Temporairement on utilise ce champ
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
        created_by
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
    .select('id, user_id')
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
    })
    .eq('id', invitation.id);

  if (updateError) throw updateError;
},

/**
 * Récupérer les invitations en attente pour un utilisateur
 * (basées sur email OU sur ses personnages)
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
  const { data: invitations } = await supabase
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
    .or(`invited_email.eq.${user.email},player_id.in.(${playerIds.join(',')})`)
    .order('invited_at', { ascending: false });

  return invitations || [];
},