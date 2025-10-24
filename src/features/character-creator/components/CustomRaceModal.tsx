import React, { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Card, { CardContent, CardHeader } from './ui/Card';
import { X, Plus, Trash2, Users } from 'lucide-react';
import { DndRace } from '../types/character';

interface CustomRaceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (race: DndRace) => void;
}

export default function CustomRaceModal({ open, onClose, onSave }: CustomRaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [size, setSize] = useState('Moyen');
  const [speed, setSpeed] = useState(30);
  const [darkvision, setDarkvision] = useState(0);
  const [languages, setLanguages] = useState<string[]>(['Commun']);
  const [newLanguage, setNewLanguage] = useState('');
  const [traits, setTraits] = useState<string[]>(['']);
  const [proficiencies, setProficiencies] = useState<string[]>([]);
  const [newProficiency, setNewProficiency] = useState('');
  
  // Bonus de caractéristiques
  const [abilityBonuses, setAbilityBonuses] = useState<{ [key: string]: number }>({});

  const abilities = ['Force', 'Dextérité', 'Constitution', 'Intelligence', 'Sagesse', 'Charisme'];

  if (!open) return null;

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };

  const handleAddTrait = () => {
    setTraits([...traits, '']);
  };

  const handleRemoveTrait = (index: number) => {
    setTraits(traits.filter((_, i) => i !== index));
  };

  const handleTraitChange = (index: number, value: string) => {
    const newTraits = [...traits];
    newTraits[index] = value;
    setTraits(newTraits);
  };

  const handleAddProficiency = () => {
    if (newProficiency.trim() && !proficiencies.includes(newProficiency.trim())) {
      setProficiencies([...proficiencies, newProficiency.trim()]);
      setNewProficiency('');
    }
  };

  const handleRemoveProficiency = (index: number) => {
    setProficiencies(proficiencies.filter((_, i) => i !== index));
  };

  const handleAbilityBonusChange = (ability: string, value: number) => {
    if (value === 0) {
      const newBonuses = { ...abilityBonuses };
      delete newBonuses[ability];
      setAbilityBonuses(newBonuses);
    } else {
      setAbilityBonuses({ ...abilityBonuses, [ability]: value });
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Le nom de la race est requis');
      return;
    }

    const validTraits = traits.filter(t => t.trim() !== '');
    if (validTraits.length === 0) {
      alert('Au moins un trait racial est requis');
      return;
    }

    // Construction de la description vision
    let visionTrait = '';
    if (darkvision > 0) {
      visionTrait = `Vision dans le noir (${darkvision} m)`;
    }

    const finalTraits = visionTrait ? [visionTrait, ...validTraits] : validTraits;

    const customRace: DndRace = {
      name: name.trim(),
      description: description.trim() || 'Race personnalisée',
      abilityScoreIncrease: abilityBonuses,
      size,
      speed,
      languages,
      proficiencies,
      traits: finalTraits,
    };

    onSave(customRace);
    handleReset();
  };

  const handleReset = () => {
    setName('');
    setDescription('');
    setSize('Moyen');
    setSpeed(30);
    setDarkvision(0);
    setLanguages(['Commun']);
    setNewLanguage('');
    setTraits(['']);
    setProficiencies([]);
    setNewProficiency('');
    setAbilityBonuses({});
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

return (
  <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden bg-gray-900 border border-gray-800 rounded-xl shadow-xl flex flex-col">
      {/* Header - FIXE */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Créer une espèce personnalisée</h3>
        </div>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenu - SCROLLABLE */}
      <div className="p-5 overflow-y-auto flex-1 space-y-6">
        {/* Informations de base */}
        <Card>
          <CardHeader>
            <h4 className="text-white font-semibold">Informations de base</h4>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nom de l'espèce *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Elfe des étoiles"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Courte description de votre espèce..."
                className="input-dark w-full min-h-[80px] resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Taille
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="input-dark w-full"
                >
                  <option value="Très petit">Très petit (TP)</option>
                  <option value="Petit">Petit (P)</option>
                  <option value="Moyen">Moyen (M)</option>
                  <option value="Grand">Grand (G)</option>
                  <option value="Moyen ou Petit">Moyen ou Petit</option>
                </select>
              </div>

              <Input
                label="Vitesse (pieds)"
                type="number"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                min={0}
                step={5}
              />

              <Input
                label="Vision dans le noir (m)"
                type="number"
                value={darkvision}
                onChange={(e) => setDarkvision(Number(e.target.value))}
                min={0}
                step={9}
                placeholder="0 = pas de vision"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bonus de caractéristiques */}
        <Card>
          <CardHeader>
            <h4 className="text-white font-semibold">Bonus de caractéristiques</h4>
            <p className="text-xs text-gray-400 mt-1">Laissez à 0 pour ne pas appliquer de bonus</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {abilities.map((ability) => (
                <div key={ability}>
                  <label className="block text-sm text-gray-300 mb-1">{ability}</label>
                  <input
                    type="number"
                    value={abilityBonuses[ability] || 0}
                    onChange={(e) => handleAbilityBonusChange(ability, Number(e.target.value))}
                    className="input-dark w-full"
                    min={0}
                    max={3}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

          {/* Bonus de caractéristiques */}
          <Card>
            <CardHeader>
              <h4 className="text-white font-semibold">Bonus de caractéristiques</h4>
              <p className="text-xs text-gray-400 mt-1">Laissez à 0 pour ne pas appliquer de bonus</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {abilities.map((ability) => (
                  <div key={ability}>
                    <label className="block text-sm text-gray-300 mb-1">{ability}</label>
                    <input
                      type="number"
                      value={abilityBonuses[ability] || 0}
                      onChange={(e) => handleAbilityBonusChange(ability, Number(e.target.value))}
                      className="input-dark w-full"
                      min={0}
                      max={3}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Langues */}
          <Card>
            <CardHeader>
              <h4 className="text-white font-semibold">Langues maîtrisées</h4>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {languages.map((lang, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-200 rounded-full border border-blue-500/30"
                  >
                    <span className="text-sm">{lang}</span>
                    {lang !== 'Commun' && (
                      <button
                        onClick={() => handleRemoveLanguage(index)}
                        className="text-blue-300 hover:text-blue-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  placeholder="Ajouter une langue..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                />
                <Button onClick={handleAddLanguage} variant="secondary" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Maîtrises */}
          <Card>
            <CardHeader>
              <h4 className="text-white font-semibold">Maîtrises de compétences</h4>
              <p className="text-xs text-gray-400 mt-1">Compétences, armes ou outils maîtrisés</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {proficiencies.map((prof, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-200 rounded-full border border-green-500/30"
                  >
                    <span className="text-sm">{prof}</span>
                    <button
                      onClick={() => handleRemoveProficiency(index)}
                      className="text-green-300 hover:text-green-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newProficiency}
                  onChange={(e) => setNewProficiency(e.target.value)}
                  placeholder="Ex: Perception, Arc long..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddProficiency()}
                />
                <Button onClick={handleAddProficiency} variant="secondary" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Traits raciaux */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">Traits raciaux *</h4>
                <Button onClick={handleAddTrait} variant="secondary" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter un trait
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {traits.map((trait, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    value={trait}
                    onChange={(e) => handleTraitChange(index, e.target.value)}
                    placeholder="Décrivez le trait racial..."
                    className="input-dark w-full min-h-[60px] resize-y"
                  />
                  {traits.length > 1 && (
                    <button
                      onClick={() => handleRemoveTrait(index)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
 
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-800">
          <Button variant="secondary" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="min-w-[200px]">
            Créer l'espèce
          </Button>
        </div>
      </div>
    </div>
  );
}