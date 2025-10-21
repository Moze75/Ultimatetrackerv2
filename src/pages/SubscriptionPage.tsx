import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Crown, Shield, Sparkles, Users, Coins, Zap } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { SUBSCRIPTION_PLANS, UserSubscription } from '../types/subscription';
import toast from 'react-hot-toast';

interface SubscriptionPageProps {
  session: any;
  onBack: () => void;
}

const BG_URL = '/background/ddbground.png';

export function SubscriptionPage({ session, onBack }: SubscriptionPageProps) {
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [session]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const sub = await subscriptionService.getCurrentSubscription(session.user.id);
      setCurrentSubscription(sub);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'abonnement:', error);
      toast.error('Erreur lors du chargement de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (tier === 'free') {
      toast.error('Vous êtes déjà sur le plan gratuit');
      return;
    }

    if (currentSubscription?.tier === tier) {
      toast.success('Vous êtes déjà abonné à ce plan');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // TODO: Intégrer Mollie ici
      toast.loading('Redirection vers le paiement...', { duration: 2000 });
      
      // Simuler un délai
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Pour l'instant, afficher un message
      toast.error(
        'Le paiement Mollie n\'est pas encore configuré. Cette fonctionnalité sera bientôt disponible !',
        { duration: 4000 }
      );

      // Exemple de ce qu'il faudra faire :
      // const paymentUrl = await subscriptionService.createMolliePayment(session.user.id, tier);
      // window.location.href = paymentUrl;
      
    } catch (error: any) {
      console.error('Erreur lors de la souscription:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Shield className="w-8 h-8" />;
      case 'hero':
        return <Sparkles className="w-8 h-8" />;
      case 'game_master':
        return <Crown className="w-8 h-8" />;
      default:
        return <Shield className="w-8 h-8" />;
    }
  };

  const getPlanColor = (color: string) => {
    switch (color) {
      case 'gray':
        return {
          border: 'border-gray-500/30',
          bg: 'bg-gray-500/10',
          text: 'text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700',
          iconBg: 'bg-gray-500/20',
        };
      case 'blue':
        return {
          border: 'border-blue-500/50',
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700',
          iconBg: 'bg-blue-500/20',
        };
      case 'purple':
        return {
          border: 'border-purple-500/50',
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          button: 'bg-purple-600 hover:bg-purple-700',
          iconBg: 'bg-purple-500/20',
        };
      default:
        return {
          border: 'border-gray-500/30',
          bg: 'bg-gray-500/10',
          text: 'text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700',
          iconBg: 'bg-gray-500/20',
        };
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="text-center">
          <img 
            src="/icons/wmremove-transformed.png" 
            alt="Chargement..." 
            className="animate-spin h-12 w-12 mx-auto mb-4 object-contain"
            style={{ backgroundColor: 'transparent' }}
          />
          <p className="text-gray-200">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 relative"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="text-center">
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{
                textShadow:
                  '0 0 15px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4)',
              }}
            >
              Choisissez votre plan
            </h1>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto">
              Débloquez plus de personnages et de fonctionnalités pour enrichir vos aventures
            </p>

            {/* Badge du plan actuel */}
            {currentSubscription && (
              <div className="mt-6 inline-block">
                <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-400">
                    Plan actuel :{' '}
                    <span className="font-bold text-white">
                      {SUBSCRIPTION_PLANS.find(p => p.id === currentSubscription.tier)?.name || 'Gratuit'}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plans d'abonnement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const colors = getPlanColor(plan.color);
            const isCurrentPlan = currentSubscription?.tier === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-gray-900/80 backdrop-blur-sm border-2 ${colors.border} rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-yellow-500/50' : ''
                }`}
              >
                {/* Badge "Populaire" */}
                {plan.popular && (
                  <div className="absolute top-4 right-4 bg-yellow-500 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
                    POPULAIRE
                  </div>
                )}

                <div className="p-8">
                  {/* Icône */}
                  <div className={`w-16 h-16 ${colors.iconBg} rounded-full flex items-center justify-center mb-6 ${colors.text}`}>
                    {getPlanIcon(plan.id)}
                  </div>

                  {/* Nom et prix */}
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}€</span>
                    {plan.price > 0 && <span className="text-gray-400 ml-2">/mois</span>}
                  </div>

                  {/* Limite de personnages */}
                  <div className={`${colors.bg} border ${colors.border} rounded-lg p-4 mb-6`}>
                    <p className="text-center">
                      <span className="text-2xl font-bold text-white">{plan.maxCharacters}</span>
                      <span className="text-gray-300 ml-2">
                        personnage{plan.maxCharacters > 1 ? 's' : ''} max
                      </span>
                    </p>
                  </div>

                  {/* Fonctionnalités */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Bouton d'action */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full bg-gray-700 text-gray-400 py-3 px-6 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Plan actuel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processingPayment}
                      className={`w-full ${colors.button} text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {processingPayment ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          Traitement...
                        </>
                      ) : plan.id === 'free' ? (
                        'Rester gratuit'
                      ) : (
                        <>
                          <Zap size={20} />
                          S'abonner maintenant
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fonctionnalités MJ à venir */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Fonctionnalités Maître du Jeu (à venir)
                </h3>
                <p className="text-gray-300">
                  Le plan Maître du Jeu incluera prochainement des outils puissants pour gérer vos campagnes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-4">
                <Users className="w-6 h-6 text-blue-400" />
                <span className="text-gray-200">Gestion des joueurs de la campagne</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-4">
                <Coins className="w-6 h-6 text-yellow-400" />
                <span className="text-gray-200">Envoi d'items et d'or aux joueurs</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-4">
                <Shield className="w-6 h-6 text-green-400" />
                <span className="text-gray-200">Système de campagnes partagées</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <span className="text-gray-200">Tableaux de bord pour MJ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note de paiement sécurisé */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            🔒 Paiements sécurisés via <span className="font-semibold text-white">Mollie</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Annulez à tout moment • Support disponible
          </p>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;