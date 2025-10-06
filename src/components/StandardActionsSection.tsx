import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Book, Swords, Shield, Target, Eye, Users, Heart, Search, Wand2, Clock, Move, Lightbulb, MessageCircle } from 'lucide-react';

interface StandardAction {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  rules: string[];
  actionType: 'Action' | 'Action bonus' | 'Réaction' | 'Mouvement';
}

const STANDARD_ACTIONS: StandardAction[] = [
  {
    id: 'attack',
    name: 'Attaque',
    icon: <Swords className="w-5 h-5 text-red-500" />,
    description: 'Effectuer un jet d\'Attaque avec une arme ou une attaque à mains nues.',
    rules: [
      'S\'équiper et se déséquiper : Vous pouvez vous équiper ou vous déséquiper d\'une arme avant ou après l\'attaque',
      'S\'équiper comprend le fait de sortir l\'arme du fourreau ou de la ramasser',
      'Se déséquiper consiste à la rengainer, la ranger ou la laisser choir',
      'Se déplacer entre les attaques : Si vous avez plusieurs attaques (Attaque supplémentaire), vous pouvez vous déplacer entre elles'
    ],
    actionType: 'Action'
  },
  {
    id: 'dash',
    name: 'Pointe',
    icon: <Move className="w-5 h-5 text-blue-500" />,
    description: 'Recevoir du déplacement supplémentaire pour ce tour.',
    rules: [
      'Cette augmentation est égale à votre Vitesse, après application d\'éventuels modificateurs',
      'Exemple : avec une Vitesse de 9 m, vous pouvez vous déplacer de 18 m à votre tour',
      'Exemple : avec une Vitesse de 9 m réduite à 4,50 m, vous pouvez vous déplacer de 9 m au total'
    ],
    actionType: 'Action'
  },
  {
    id: 'disengage',
    name: 'Désengagement',
    icon: <Shield className="w-5 h-5 text-green-500" />,
    description: 'Éviter les attaques d\'Opportunité en se déplaçant.',
    rules: [
      'Votre déplacement ne provoque pas d\'attaque d\'Opportunité jusqu\'à la fin du tour',
      'Permet de s\'éloigner d\'ennemis adjacents sans risque',
      'Utile pour repositionner un personnage sans subir d\'attaques'
    ],
    actionType: 'Action'
  },
  {
    id: 'dodge',
    name: 'Esquive',
    icon: <Target className="w-5 h-5 text-purple-500" />,
    description: 'Se concentrer entièrement sur l\'évitement des attaques.',
    rules: [
      'Tout jet d\'attaque contre vous par un assaillant que vous voyez subit le Désavantage',
      'Vos jets de sauvegarde de Dextérité ont l\'Avantage',
      'L\'effet dure jusqu\'au début de votre tour suivant',
      'Vous perdez ces bénéfices si vous subissez l\'état Neutralisé ou si votre Vitesse tombe à 0'
    ],
    actionType: 'Action'
  },
  {
    id: 'help',
    name: 'Soutien',
    icon: <Heart className="w-5 h-5 text-pink-500" />,
    description: 'Aider un allié dans une tâche ou une attaque.',
    rules: [
      'Assister un test : Choisissez une de vos maîtrises de compétence ou d\'outil. Un allié proche a l\'Avantage au prochain test avec cette compétence/outil',
      'Ce bénéfice expire si l\'allié n\'y recourt pas avant le début de votre tour suivant',
      'Assister une attaque : Vous distrayez un ennemi dans un rayon de 1,50 m',
      'Cela octroie l\'Avantage au jet d\'attaque suivant d\'un allié contre cet ennemi (expire au début de votre tour suivant)'
    ],
    actionType: 'Action'
  },
  {
    id: 'hide',
    name: 'Furtivité',
    icon: <Eye className="w-5 h-5 text-gray-500" />,
    description: 'Tenter de se cacher.',
    rules: [
      'Test de Dextérité (Discrétion) DD 15',
      'Conditions : Visibilité nulle, derrière un Abri supérieur ou total, et ne pas être dans le champ de vision d\'un ennemi',
      'En cas de réussite : vous bénéficiez de l\'état Invisible tant que vous êtes caché',
      'Notez le résultat : c\'est le DD pour qu\'une créature vous localise (test de Sagesse Perception)',
      'Vous cessez d\'être caché si : vous émettez un son plus fort qu\'un murmure, un ennemi vous détecte, vous attaquez ou lancez un sort à composante verbale'
    ],
    actionType: 'Action'
  },
  {
    id: 'influence',
    name: 'Influence',
    icon: <MessageCircle className="w-5 h-5 text-indigo-500" />,
    description: 'Inciter un monstre à faire quelque chose.',
    rules: [
      'Décrivez ou incarnez la façon dont vous communiquez avec le monstre',
      'Disposé : Si la requête est en accord avec ses désirs, aucun test nécessaire, il accède',
      'Réticent : Si la requête répugne au monstre ou est contraire à son alignement, il refuse',
      'Hésitant : Test de caractéristique selon l\'interaction (Intimidation, Persuasion, Représentation, Tromperie, Dressage)',
      'DD par défaut : 15 ou Intelligence du monstre (le plus élevé)',
      'En cas d\'échec, attendez 24 heures avant de réessayer de la même manière'
    ],
    actionType: 'Action'
  },
  {
    id: 'ready',
    name: 'Intention',
    icon: <Clock className="w-5 h-5 text-cyan-500" />,
    description: 'Attendre une circonstance particulière avant d\'agir.',
    rules: [
      'Entreprenez cette action à votre tour pour jouer votre Réaction avant le début de votre tour suivant',
      'Décidez quelles circonstances perceptibles déclencheront votre Réaction',
      'Choisissez l\'action que vous entreprendrez ou un déplacement (max votre Vitesse)',
      'Quand le déclencheur intervient, vous pouvez jouer votre Réaction juste après ou ne pas en tenir compte',
      'Pour un sort : lancez-le normalement mais retenez les énergies (requiert Concentration jusqu\'au début de votre tour suivant)',
      'Le sort doit avoir un temps d\'incantation d\'une action'
    ],
    actionType: 'Action'
  },
  {
    id: 'search',
    name: 'Observation',
    icon: <Search className="w-5 h-5 text-teal-500" />,
    description: 'Discerner ce qui n\'est pas évident.',
    rules: [
      'Test de Sagesse visant à discerner ce qui n\'est pas évident',
      'La compétence dépend de ce que vous essayez de détecter',
      'Permet de trouver des objets cachés, des passages secrets, des créatures dissimulées',
      'Plus efficace que la Perception passive'
    ],
    actionType: 'Action'
  },
  {
    id: 'study',
    name: 'Étude',
    icon: <Book className="w-5 h-5 text-amber-500" />,
    description: 'Rechercher une information importante.',
    rules: [
      'Test d\'Intelligence en consultant votre mémoire, un livre, un indice ou une autre source de savoir',
      'À la recherche d\'une information importante sur un sujet donné',
      'Le MD détermine le DD et ce que vous découvrez'
    ],
    actionType: 'Action'
  },
  {
    id: 'cast_spell',
    name: 'Magie',
    icon: <Wand2 className="w-5 h-5 text-purple-400" />,
    description: 'Lancer un sort ou utiliser une aptitude magique.',
    rules: [
      'Lancez un sort dont le temps d\'incantation est de une action',
      'Ou recourez à une aptitude ou un objet magique dont l\'activation se fait au prix de l\'action Magie',
      'Pour un sort de 1 minute ou plus : entreprenez l\'action Magie à chaque tour et maintenez votre Concentration',
      'Si la Concentration est rompue, le sort échoue mais vous ne dépensez aucun emplacement de sort'
    ],
    actionType: 'Action'
  },
  {
    id: 'use_object',
    name: 'Utilisation',
    icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
    description: 'Interagir avec un objet.',
    rules: [
      'Vous interagissez souvent avec un objet en faisant autre chose (ex: dégainer une épée lors d\'une Attaque)',
      'Lorsqu\'un objet requiert spécifiquement votre action, vous entreprenez l\'action Utilisation',
      'Exemples : activer un levier, ouvrir une porte coincée, boire une potion'
    ],
    actionType: 'Action'
  }
];

interface StandardActionsSectionProps {
  player?: any;
  onUpdate?: (player: any) => void;
}

export default function StandardActionsSection({ player, onUpdate }: StandardActionsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StandardAction | null>(null);

  const handleActionClick = (action: StandardAction) => {
    setSelectedAction(selectedAction?.id === action.id ? null : action);
  };

  return (
    <div className="bg-gray-900/50 rounded-lg border border-gray-800 shadow-xl">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <Book className="text-orange-500" size={20} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Actions standard (2024)</h2>
        </div>
        {isExpanded ? (
          <ChevronDown className="text-gray-400" size={20} />
        ) : (
          <ChevronRight className="text-gray-400" size={20} />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {STANDARD_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedAction?.id === action.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50'
                }`}
              >
                {action.name}
              </button>
            ))}
          </div>

          {selectedAction && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-3 mb-3">
                {selectedAction.icon}
                <div>
                  <h3 className="text-lg font-medium text-blue-300">
                    {selectedAction.name}
                  </h3>
                  <span className="text-sm text-gray-400">{selectedAction.actionType}</span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-4">{selectedAction.description}</p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-200 mb-2">Règles :</h4>
                {selectedAction.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500/50 flex-shrink-0" />
                    <p className="text-gray-400 flex-1">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}