export type SubscriptionTier = 'free' | 'hero' | 'game_master' | 'celestial'; // ✅ Ajout de 'celestial'

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  priceLabel: string;
  maxCharacters: number;
  features: string[];
  popular?: boolean;
  color: 'gray' | 'blue' | 'purple' | 'gold'; // ✅ Ajout de 'gold'
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string | null;
  trial_end_date?: string | null;
  subscription_end_date?: string | null;
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
      'Création de personnage complète',
      'Gestion du combat et des PV',
      'Inventaire et équipement',
      'Calculs automatiques des bonus',
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
      'Jusqu\'à 5 personnages',
      'Mode grille personnalisable',
      'Gestion avancée de l\'équipement',
      'Création d\'objets personnalisés',
      'Calculs automatiques (CA, jets, dégâts)',
      'Système de munitions intégré',
      'Support par email',
    ],
  },
  {
    id: 'game_master',
    name: 'Maître du Jeu',
    price: 15,
    priceLabel: '15€/an',
    maxCharacters: 15,
    color: 'purple',
    features: [
      'Jusqu\'à 15 personnages',
      'Gestion complète des joueurs',
      'Envoi d\'items et d\'or aux joueurs',
      'Système de campagnes partagées',
      'Suivi des notes de campagne',
      'Outils de narration avancés',
      'Support prioritaire VIP',
    ],
  },
  {
    id: 'celestial',
    name: 'Céleste',
    price: 25,
    priceLabel: '25€/an',
    maxCharacters: 999,
    color: 'gold',
    features: [
      'Personnages illimités',
      'Accès à toutes les fonctionnalités',
      'Gestion multi-campagnes',
      'Outils de création avancés',
      'Import/Export de personnages',
      'Automatisation complète des calculs',
      'Support VIP ultra-prioritaire',
      'Accès anticipé aux nouvelles features',
    ],
  },
];