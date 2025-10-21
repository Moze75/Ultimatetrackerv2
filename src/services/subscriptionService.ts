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
        .eq('status', 'active')
        .single();

      if (error) {
        // Si pas d'abonnement trouvé, retourner un abonnement gratuit par défaut
        if (error.code === 'PGRST116') {
          return {
            id: 'default',
            user_id: userId,
            tier: 'free',
            status: 'active',
            start_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement:', error);
      // En cas d'erreur, retourner un abonnement gratuit
      return {
        id: 'default',
        user_id: userId,
        tier: 'free',
        status: 'active',
        start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  /**
   * Vérifie si l'utilisateur peut créer un nouveau personnage
   */
  async canCreateCharacter(userId: string, currentCharacterCount: number): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) return currentCharacterCount < 1; // Gratuit par défaut

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
   * Crée un lien de paiement Mollie (à implémenter plus tard)
   */
  async createMolliePayment(userId: string, tier: SubscriptionTier): Promise<string> {
    // TODO: Implémenter l'appel à Mollie via votre backend
    // Pour l'instant, retourne une URL fictive
    console.log('Création du paiement Mollie pour:', userId, tier);
    
    // Exemple de structure pour plus tard :
    // const response = await fetch('/api/create-mollie-payment', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, tier }),
    // });
    // const { checkoutUrl } = await response.json();
    // return checkoutUrl;

    return '#mollie-payment-placeholder';
  },

  /**
   * Crée ou met à jour un abonnement
   */
  async updateSubscription(
    userId: string,
    tier: SubscriptionTier,
    mollieData?: {
      customerId?: string;
      subscriptionId?: string;
    }
  ): Promise<UserSubscription> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier,
        status: 'active',
        start_date: new Date().toISOString(),
        mollie_customer_id: mollieData?.customerId,
        mollie_subscription_id: mollieData?.subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Annule un abonnement
   */
  async cancelSubscription(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        end_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
  },
};