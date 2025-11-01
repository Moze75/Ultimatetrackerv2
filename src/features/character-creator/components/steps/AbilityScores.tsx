import React, { useState, useEffect, useMemo } from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { calculateModifier, validatePointBuy, standardArray, rollAbilityScore, applyBackgroundBonuses } from '../../utils/dndCalculations';
import { Dice1, RotateCcw, Calculator, TrendingUp } from 'lucide-react';
import type { DndBackground } from '../../types/character';

interface AbilityScoresProps {
  abilities: Record<string, number>;
  onAbilitiesChange: (abilities: Record<string, number>) => void;
  onNext: () => void;
  onPrevious: () => void;
  selectedBackground?: DndBackground | null;
  onEffectiveAbilitiesChange?: (abilities: Record<string, number>) => void;
}

const abilityNames = ['Force', 'Dextérité', 'Constitution', 'Intelligence', 'Sagesse', 'Charisme'];

export default function AbilityScores({
  abilities,
  onAbilitiesChange,
  onNext,
  onPrevious,
  selectedBackground = null,
  onEffectiveAbilitiesChange
}: AbilityScoresProps) {
  const [method, setMethod] = useState<'pointbuy' | 'array' | 'roll'>('pointbuy');
  const [rolledScores, setRolledScores] = useState<number[]>([]);
  const [assignedScores, setAssignedScores] = useState<Record<string, number>>({});
  const [bgMode, setBgMode] = useState<'twoPlusOne' | 'oneOneOne'>('twoPlusOne');
  const [bgAssignments, setBgAssignments] = useState<{ plusTwo?: string; plusOne?: string }>({});

  const effectiveAbilities = useMemo(() => {
    if (!selectedBackground) return abilities;
    return applyBackgroundBonuses(abilities, selectedBackground.abilityScores, bgMode, bgAssignments);
  }, [abilities, selectedBackground, bgMode, bgAssignments]);

  useEffect(() => {
    onEffectiveAbilitiesChange?.(effectiveAbilities);
  }, [effectiveAbilities, onEffectiveAbilitiesChange]);

  useEffect(() => {
    setBgAssignments({});
  }, [selectedBackground, bgMode]);

  useEffect(() => {
    if (method === 'pointbuy') {
      const defaultScores = abilityNames.reduce((acc, ability) => {
        acc[ability] = 8;
        return acc;
      }, {} as Record<string, number>);
      onAbilitiesChange(defaultScores);
    } else if (method === 'array') {
      setAssignedScores({});
      onAbilitiesChange({});
    } else if (method === 'roll') {
      rollAllAbilities();
    }
  }, [method]);

  const rollAllAbilities = () => {
    const newScores = Array.from({ length: 6 }, () => rollAbilityScore());
    setRolledScores(newScores);
    setAssignedScores({});
    onAbilitiesChange({});
  };

  const handlePointBuyChange = (ability: string, value: number) => {
    const newAbilities = { ...abilities, [ability]: value };
    onAbilitiesChange(newAbilities);
  };

  const assignScore = (ability: string, scoreIndex: number) => {
    if (method === 'array') {
      const newAssigned = { ...assignedScores };
      
      Object.keys(newAssigned).forEach(key => {
        if (newAssigned[key] === scoreIndex) {
          delete newAssigned[key];
        }
      });
      
      if (newAssigned[ability] !== undefined) {
        delete newAssigned[ability];
      }
      
      newAssigned[ability] = scoreIndex;
      setAssignedScores(newAssigned);
      
      const newAbilities = { ...abilities };
      newAbilities[ability] = standardArray[scoreIndex];
      onAbilitiesChange(newAbilities);
    } else if (method === 'roll') {
      const newAssigned = { ...assignedScores };
      
      Object.keys(newAssigned).forEach(key => {
        if (newAssigned[key] === scoreIndex) {
          delete newAssigned[key];
        }
      });
      
      if (newAssigned[ability] !== undefined) {
        delete newAssigned[ability];
      }
      
      newAssigned[ability] = scoreIndex;
      setAssignedScores(newAssigned);
      
      const newAbilities = { ...abilities };
      newAbilities[ability] = rolledScores[scoreIndex];
      onAbilitiesChange(newAbilities);
    }
  };

  const pointBuyValidation = method === 'pointbuy' ? validatePointBuy(abilities) : { valid: true, pointsUsed: 0, errors: [] };
  const isArrayComplete = method === 'array' && Object.keys(assignedScores).length === 6;
  const isRollComplete = method === 'roll' && Object.keys(assignedScores).length === 6;

  const isBackgroundComplete =
    !selectedBackground
      ? true
      : (bgMode === 'oneOneOne' || (!!bgAssignments.plusTwo && !!bgAssignments.plusOne && bgAssignments.plusTwo !== bgAssignments.plusOne));

  const canProceed =
    ((method === 'pointbuy' && pointBuyValidation.valid) || isArrayComplete || isRollComplete) && isBackgroundComplete;

  return (
    <div className="wizard-step space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Déterminez vos caractéristiques</h2>
        <p className="text-gray-400">Choisissez votre méthode de génération des scores</p>
      </div>

      <div className="flex justify-center space-x-4 mb-6">
        <Button
          variant={method === 'pointbuy' ? 'primary' : 'secondary'}
          onClick={() => setMethod('pointbuy')}
          size="sm"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Point Buy
        </Button>
        <Button
          variant={method === 'array' ? 'primary' : 'secondary'}
          onClick={() => setMethod('array')}
          size="sm"
        >
          Tableau standard
        </Button>
        <Button
          variant={method === 'roll' ? 'primary' : 'secondary'}
          onClick={() => setMethod('roll')}
          size="sm"
        >
          <Dice1 className="w-4 h-4 mr-2" />
          Lancer de dés
        </Button>
      </div>

      {method === 'pointbuy' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Point Buy System</h3>
              <div className="text-sm text-gray-400">
                Points utilisés: <span className="text-white font-semibold">{pointBuyValidation.pointsUsed}/27</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {abilityNames.map((ability) => {
                const baseVal = abilities[ability] ?? 8;
                const effVal = effectiveAbilities[ability] ?? baseVal;
                const bonus = effVal - baseVal;
                const effMod = calculateModifier(effVal);

                return (
                  <div key={ability} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">{ability}</span>
                      {bonus !== 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700/50">
                          +{bonus} historique
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-white">{effVal}</span>
                        <span className="text-xs text-gray-500">score</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-4xl font-bold ${effMod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {effMod >= 0 ? '+' : ''}{effMod}
                        </span>
                        <span className="text-xs text-gray-500">modificateur</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="8"
                      max="15"
                      value={baseVal}
                      onChange={(e) => handlePointBuyChange(ability, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>8</span>
                      <span>15</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {pointBuyValidation.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                <ul className="text-red-400 text-sm space-y-1">
                  {pointBuyValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {method === 'array' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Tableau Standard</h3>
            <p className="text-sm text-gray-400 mt-1">Assignez les scores suivants à vos caractéristiques</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2 mb-6">
                {standardArray.map((score, index) => {
                  const mod = calculateModifier(score);
                  const isUsed = Object.values(assignedScores).includes(index);
                  return (
                    <div
                      key={index}
                      className={`text-center py-3 rounded-lg border-2 transition-all ${
                        isUsed
                          ? 'border-gray-600 bg-gray-800/30 opacity-40'
                          : 'border-red-500/50 bg-red-900/10 hover:bg-red-900/20'
                      }`}
                    >
                      <div className="text-2xl font-bold text-white">{score}</div>
                      <div className={`text-lg font-semibold ${mod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {mod >= 0 ? '+' : ''}{mod}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {abilityNames.map((ability) => {
                  const assignedIndex = assignedScores[ability];
                  const baseVal = abilities[ability] ?? 0;
                  const effVal = effectiveAbilities[ability] ?? baseVal;
                  const bonus = effVal - baseVal;
                  const effMod = baseVal > 0 ? calculateModifier(effVal) : 0;

                  return (
                    <div key={ability} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                      <label className="block text-sm font-medium text-gray-300 mb-2">{ability}</label>
                      <select
                        value={assignedIndex !== undefined ? assignedIndex : ''}
                        onChange={(e) => e.target.value && assignScore(ability, parseInt(e.target.value))}
                        className="input-dark w-full mb-3"
                      >
                        <option value="">Sélectionner...</option>
                        {standardArray.map((score, index) => {
                          const mod = calculateModifier(score);
                          return (
                            <option
                              key={index}
                              value={index}
                              disabled={Object.values(assignedScores).includes(index) && assignedScores[ability] !== index}
                            >
                              {score} (mod: {mod >= 0 ? '+' : ''}{mod})
                            </option>
                          );
                        })}
                      </select>
                      
                      {baseVal > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                          <div>
                            <div className="text-xl font-bold text-white">{effVal}</div>
                            <div className="text-xs text-gray-500">score final</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${effMod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {effMod >= 0 ? '+' : ''}{effMod}
                            </div>
                            <div className="text-xs text-gray-500">modificateur</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {method === 'roll' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Lancer de dés</h3>
                <p className="text-sm text-gray-400 mt-1">4d6, garder les 3 meilleurs</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={rollAllAbilities}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Relancer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2 mb-6">
                {rolledScores.map((score, index) => {
                  const mod = calculateModifier(score);
                  const isUsed = Object.values(assignedScores).includes(index);
                  return (
                    <div
                      key={index}
                      className={`text-center py-3 rounded-lg border-2 transition-all ${
                        isUsed
                          ? 'border-gray-600 bg-gray-800/30 opacity-40'
                          : 'border-red-500/50 bg-red-900/10 hover:bg-red-900/20'
                      }`}
                    >
                      <div className="text-2xl font-bold text-white">{score}</div>
                      <div className={`text-lg font-semibold ${mod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {mod >= 0 ? '+' : ''}{mod}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {abilityNames.map((ability) => {
                  const assignedIndex = assignedScores[ability];
                  const baseVal = abilities[ability] ?? 0;
                  const effVal = effectiveAbilities[ability] ?? baseVal;
                  const bonus = effVal - baseVal;
                  const effMod = baseVal > 0 ? calculateModifier(effVal) : 0;

                  return (
                    <div key={ability} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                      <label className="block text-sm font-medium text-gray-300 mb-2">{ability}</label>
                      <select
                        value={assignedIndex !== undefined ? assignedIndex : ''}
                        onChange={(e) => e.target.value && assignScore(ability, parseInt(e.target.value))}
                        className="input-dark w-full mb-3"
                      >
                        <option value="">Sélectionner...</option>
                        {rolledScores.map((score, index) => {
                          const mod = calculateModifier(score);
                          return (
                            <option
                              key={index}
                              value={index}
                              disabled={Object.values(assignedScores).includes(index) && assignedScores[ability] !== index}
                            >
                              {score} (mod: {mod >= 0 ? '+' : ''}{mod})
                            </option>
                          );
                        })}
                      </select>
                      
                      {baseVal > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                          <div>
                            <div className="text-xl font-bold text-white">{effVal}</div>
                            <div className="text-xs text-gray-500">score final</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${effMod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {effMod >= 0 ? '+' : ''}{effMod}
                            </div>
                            <div className="text-xs text-gray-500">modificateur</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedBackground && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Bonus d'historique</h3>
              <span className="text-sm text-gray-400 ml-auto">{selectedBackground.name}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant={bgMode === 'twoPlusOne' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setBgMode('twoPlusOne')}
                >
                  +2 et +1
                </Button>
                <Button
                  variant={bgMode === 'oneOneOne' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setBgMode('oneOneOne')}
                >
                  +1 +1 +1
                </Button>
              </div>

              <div className="text-xs text-gray-400 p-2 rounded bg-gray-800/50">
                Caractéristiques autorisées:&nbsp;
                <span className="text-gray-300 font-medium">
                  {selectedBackground.abilityScores.join(' • ')}
                </span>
              </div>

              {bgMode === 'twoPlusOne' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bonus de +2</label>
                    <select
                      className="input-dark w-full"
                      value={bgAssignments.plusTwo ?? ''}
                      onChange={(e) =>
                        setBgAssignments((prev) => ({ ...prev, plusTwo: e.target.value || undefined }))
                      }
                    >
                      <option value="">Sélectionner...</option>
                      {selectedBackground.abilityScores.map((a) => (
                        <option
                          key={a}
                          value={a}
                          disabled={bgAssignments.plusOne === a}
                        >
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bonus de +1</label>
                    <select
                      className="input-dark w-full"
                      value={bgAssignments.plusOne ?? ''}
                      onChange={(e) =>
                        setBgAssignments((prev) => ({ ...prev, plusOne: e.target.value || undefined }))
                      }
                    >
                      <option value="">Sélectionner...</option>
                      {selectedBackground.abilityScores.map((a) => (
                        <option
                          key={a}
                          value={a}
                          disabled={bgAssignments.plusTwo === a}
                        >
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-blue-900/20 border border-blue-700/50 text-sm text-blue-200">
                  ✓ Bonus de +1 appliqué automatiquement à: {selectedBackground.abilityScores.join(', ')}
                </div>
              )}

              {!isBackgroundComplete && (
                <div className="mt-3 p-2 rounded bg-yellow-900/20 border border-yellow-700/50 text-sm text-yellow-200">
                  ⚠️ Sélectionnez deux caractéristiques différentes pour continuer
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-6">
        <Button
          onClick={onPrevious}
          variant="secondary"
          size="lg"
        >
          Précédent
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
          className="min-w-[200px]"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}