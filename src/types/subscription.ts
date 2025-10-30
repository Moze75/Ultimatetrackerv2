export type SubscriptionTier = 'free' | 'hero' | 'game_master';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  maxCharacters: number;
  features: string[];
  popular?: boolean;
  color: string;
  trialDays?: number;
  lifetime?: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  mollie_customer_id?: string;
  mollie_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Essai Gratuit',
    price: 0,
    maxCharacters: 1,
    color: 'gray',
    trialDays: 15,
    features: [
      '15 jours d\'essai gratuit',
      '1 personnage',
      'Gestion de base',
      'Sauvegarde automatique',
      'Accès aux fonctionnalités essentielles',
    ],
  },
  {
    id: 'hero',
    name: 'Héro',
    price: 10,
    maxCharacters: 5,
    color: 'blue',
    popular: true,
    lifetime: true,
    features: [
      'Accès à vie (paiement unique)',
      'Jusqu\'à 5 personnages',
      'Toutes les fonctionnalités de base',
      'Gestion avancée des personnages',
      'Support prioritaire',
      'Mises à jour incluses',
    ],
  },
  {
    id: 'game_master',
    name: 'Maître du Jeu',
    price: 15,
    maxCharacters: 15,
    color: 'purple',
    lifetime: true,
    features: [
      'Accès à vie (paiement unique)',
      'Personnages illimités pour vos campagnes',
      'Toutes les fonctionnalités Héro',
      '🎭 Gestion de campagnes complètes',
      '👥 Gestion des joueurs',
      '⚔️ Envoi d\'items et d\'or aux joueurs',
      '📊 Tableaux de bord MJ avancés',
      '🎲 Outils pour Maître du Jeu',
      '🌟 Support premium',
    ],
  },
];