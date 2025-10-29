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
      'Création de personnage complète',
      'Gestion du combat et des PV',
      'Inventaire et équipement',
      'Calculs automatiques des bonus',
      'Gestion intelligente de l\'équipement',
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
      'Mode grille personnalisable',
      'Calculs automatiques (CA, jets, dégâts)',
      'Gestion avancée de l\'équipement',
      'Création d\'objets personnalisés',
      'Système de munitions intégré',
      'Automatisation complète des combats',
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
      'Gestion complète des joueurs',
      'Système de campagnes partagées',
      'Envoi d\'items et d\'or aux joueurs',
      'Suivi des notes de campagne',
      'Outils de gestion de partie',
      'Toutes les fonctionnalités Héros',
    ],
  },
  {
    id: 'celestial',
    name: 'Céleste',
    price: 30,
    priceLabel: '30€/an',
    maxCharacters: Infinity,
    color: 'gold',
    features: [
      'Support VIP ultra-prioritaire',
      'Accès anticipé aux nouvelles features',
      'Toutes les fonctionnalités MJ',
      'Import/Export de personnages',
      '💝 Soutenez le développement de l\'app',
      '🙏 Participez à l\'évolution du projet',
    ],
  },
];