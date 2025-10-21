export type SubscriptionTier = 'free' | 'hero' | 'game_master';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  maxCharacters: number;
  features: string[];
  popular?: boolean;
  color: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string;
  mollie_customer_id?: string;
  mollie_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    maxCharacters: 1,
    color: 'gray',
    features: [
      '1 personnage maximum',
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
    features: [
      '5 personnages maximum',
      'Toutes les fonctionnalités de base',
      'Gestion avancée des personnages',
      'Support prioritaire',
    ],
  },
  {
    id: 'game_master',
    name: 'Maître du Jeu',
    price: 15,
    maxCharacters: 15,
    color: 'purple',
    features: [
      '15 personnages maximum',
      'Toutes les fonctionnalités Héro',
      'Gestion de campagnes',
      'Gestion des joueurs',
      'Envoi d\'items et d\'or aux joueurs',
      'Tableaux de bord MJ',
      'Support premium',
    ],
  },
];