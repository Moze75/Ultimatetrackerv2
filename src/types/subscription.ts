export type SubscriptionTier = 'free' | 'hero' | 'game_master';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  priceLabel: string; // ← NOUVEAU
  maxCharacters: number;
  features: string[];
  popular?: boolean;
  color: 'gray' | 'blue' | 'purple';
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string | null;
  trial_end_date?: string | null;
  subscription_end_date?: string | null; // ← NOUVEAU : date de fin d'abonnement annuel
  mollie_customer_id?: string | null;
  mollie_subscription_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Essai Gratuit',
    price: 0,
    priceLabel: '15 jours',
    maxCharacters: 1,
    color: 'gray',
    features: [
      '1 personnage maximum',
      'Accès aux fonctionnalités de base',
      'Création de personnage',
      'Gestion du combat et des PV',
      'Inventaire et équipement',
      '15 jours d\'essai gratuit',
    ],
  },
  {
    id: 'hero',
    name: 'Héros',
    price: 10,
    priceLabel: '10€/an',
    maxCharacters: 5,
    color: 'blue',
    popular: true,
    features: [
      '5 personnages maximum',
      'Toutes les fonctionnalités de base',
      'Sauvegarde automatique',
      'Mode grille personnalisable',
      'Historique des jets de dés',
      'Support prioritaire',
      'Renouvellement automatique annuel',
    ],
  },
  {
    id: 'game_master',
    name: 'Maître du Jeu',
    price: 15,
    priceLabel: '15€/an',
    maxCharacters: 999,
    color: 'purple',
    features: [
      'Personnages illimités pour votre campagne',
      'Gestion complète des joueurs',
      'Envoi d\'items et d\'or aux joueurs',
      'Système de campagnes partagées',
      'Tableaux de bord avancés pour MJ',
      'Outils de narration',
      'Support prioritaire VIP',
      'Renouvellement automatique annuel',
    ],
  },
];