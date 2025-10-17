import React from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { User, Globe, BookOpen } from 'lucide-react';

const DND_LANGUAGES: string[] = [
  'Commun',
  'Elfique',
  'Nain',
  'Géant',
  'Gnome',
  'Gobelin',
  'Halfelin',
  'Orc',
  'Abyssal',
  'Céleste',
  'Commun des profondeurs',
  'Draconique',
  'Infernal',
  'Primordial',
  'Sylvestre',
  'Autre',
];

const ALIGNMENTS = {
  'Bon': ['Loyal Bon', 'Neutre Bon', 'Chaotique Bon'],
  'Neutre': ['Loyal Neutre', 'Neutre', 'Chaotique Neutre'],
  'Mauvais': ['Loyal Mauvais', 'Neutre Mauvais', 'Chaotique Mauvais'],
};

interface ProfileSelectionProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  selectedAlignment: string;
  onAlignmentChange: (alignment: string) => void;
  characterHistory: string;
  onCharacterHistoryChange: (history: string) => void;
  age: string;
  onAgeChange: (age: string) => void;
  gender: string;
  onGenderChange: (gender: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function ProfileSelection({
  selectedLanguages,
  onLanguagesChange,
  selectedAlignment,
  onAlignmentChange,
  characterHistory,
  onCharacterHistoryChange,
  age,
  onAgeChange,
  gender,
  onGenderChange,
  onNext,
  onPrevious,
}: ProfileSelectionProps) {
  const toggleLanguage = (language: string) => {
    if (selectedLanguages.includes(language)) {
      onLanguagesChange(selectedLanguages.filter(lang => lang !== language));
    } else {
      onLanguagesChange([...selectedLanguages, language]);
    }
  };

  return (
    <div className="wizard-step space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Profil du personnage</h2>
        <p className="text-gray-400">
          Complétez les informations de base de votre personnage
        </p>
      </div>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <User className="w-5 h-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Informations personnelles</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Âge
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => onAgeChange(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-md"
                placeholder="Ex: 25 ans"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Genre
              </label>
              <input
                type="text"
                value={gender}
                onChange={(e) => onGenderChange(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-md"
                placeholder="Ex: Masculin, Féminin, Non-binaire..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alignement */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Globe className="w-5 h-5 text-purple-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Alignement</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(ALIGNMENTS).map(([category, alignments]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-400 mb-2">{category}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {alignments.map((alignment) => (
                    <button
                      key={alignment}
                      type="button"
                      onClick={() => onAlignmentChange(alignment)}
                      className={`px-4 py-3 rounded-lg border transition-all duration-200 text-sm font-medium ${
                        selectedAlignment === alignment
                          ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      {alignment}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Langues */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Globe className="w-5 h-5 text-cyan-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Langues</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            Sélectionnez les langues que votre personnage maîtrise
            {selectedLanguages.length > 0 && (
              <span className="ml-2 text-cyan-400 font-medium">
                ({selectedLanguages.length} sélectionnée{selectedLanguages.length > 1 ? 's' : ''})
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {DND_LANGUAGES.map((language) => {
              const isSelected = selectedLanguages.includes(language);
              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => toggleLanguage(language)}
                  className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  {language}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Histoire du personnage */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <BookOpen className="w-5 h-5 text-amber-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Histoire du personnage</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-3">
            Décrivez l'histoire, les origines et la personnalité de votre personnage
          </p>
          <textarea
            value={characterHistory}
            onChange={(e) => onCharacterHistoryChange(e.target.value)}
            className="input-dark w-full px-3 py-2 rounded-md resize-none"
            rows={8}
            placeholder="Exemple: Né dans un petit village au nord du royaume, votre personnage a toujours rêvé d'aventure..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Cette histoire pourra être modifiée plus tard dans les paramètres du personnage
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button onClick={onPrevious} variant="secondary" size="lg">
          Précédent
        </Button>
        <Button onClick={onNext} size="lg">
          Suivant
        </Button>
      </div>
    </div>
  );
}