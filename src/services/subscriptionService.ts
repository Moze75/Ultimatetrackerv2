import { supabase } from '../lib/supabase';
import { UserSubscription, SubscriptionTier, SUBSCRIPTION_PLANS } from '../types/subscription';

export const subscriptionService = {
  /**
   * Récupère l'abonnement actuel de l'utilisateur
   */
  async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Si pas d'abonnement trouvé, créer un essai gratuit
        if (error.code === 'PGRST116') {
          return await this.createTrialSubscription(userId);
        }
        throw error;
      }

      // Vérifier si l'essai gratuit a expiré
      if (data.tier === 'free' && data.trial_end_date) {
        const trialEndDate = new Date(data.trial_end_date);
        const now = new Date();
        
        if (now > trialEndDate && data.status === 'trial') {
          // Marquer l'essai comme expiré
          await supabase
            .from('user_subscriptions')
            .update({ status: 'expired' })
            .eq('id', data.id);
          
          return { ...data, status: 'expired' };
        }
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement:', error);
      // En cas d'erreur, créer un essai gratuit
      return await this.createTrialSubscription(userId);
    }
  },

  /**
   * Crée un abonnement d'essai gratuit de 15 jours
   */
  async createTrialSubscription(userId: string): Promise<UserSubscription> {
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 15);

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        tier: 'free',
        status: 'trial',
        start_date: now.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Vérifie si l'utilisateur peut créer un nouveau personnage
   */
  async canCreateCharacter(userId: string, currentCharacterCount: number): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) return false;

    // Bloquer si l'essai gratuit a expiré
    if (subscription.status === 'expired') {
      return false;
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.tier);
    if (!plan) return false;

    return currentCharacterCount < plan.maxCharacters;
  },

  /**
   * Obtient la limite de personnages pour l'utilisateur
   */
  async getCharacterLimit(userId: string): Promise<number> {
    const subscription = await this.getCurrentSubscription(userId);
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription?.tier || 'free');
    return plan?.maxCharacters || 1;
  },

  /**
   * Obtient les jours restants de l'essai gratuit
   */
  async getRemainingTrialDays(userId: string): Promise<number | null> {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (!subscription || subscription.tier !== 'free' || !subscription.trial_end_date) {
      return null;
    }

    const trialEndDate = new Date(subscription.trial_end_date);
    const now = new Date();
    const diffTime = trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  },

  /**
   * Vérifie si l'essai gratuit a expiré
   */
  async isTrialExpired(userId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    return subscription?.status === 'expired';
  },

  /**
   * Crée un lien de paiement Mollie (à implémenter plus tard)
   */
  async createMolliePayment(userId: string, tier: SubscriptionTier): Promise<string> {
    // TODO: Implémenter l'appel à Mollie via votre backend
    // Pour l'instant, retourne une URL fictive
    console.log('Création du paiement Mollie pour:', userId, tier);
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === tier);
    console.log('Montant:', plan?.price, '€ (paiement unique)');
    
    // Exemple de structure pour plus tard :
    // const response = await fetch('/api/create-mollie-payment', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, tier, amount: plan?.price }),
    // });
    // const { checkoutUrl } = await response.json();
    // return checkoutUrl;

    return '#mollie-payment-placeholder';
  },

  /**
   * Crée ou met à jour un abonnement (après paiement)
   */
  async updateSubscription(
    userId: string,
    tier: SubscriptionTier,
    mollieData?: {
      customerId?: string;
      subscriptionId?: string;
    }
  ): Promise<UserSubscription> {
    // Marquer l'ancien abonnement comme inactif
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .in('status', ['active', 'trial']);

    // Créer le nouvel abonnement (lifetime = pas de end_date)
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        tier,
        status: 'active',
        start_date: new Date().toISOString(),
        mollie_customer_id: mollieData?.customerId,
        mollie_subscription_id: mollieData?.subscriptionId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
