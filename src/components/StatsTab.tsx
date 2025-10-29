import React, { useState } from 'react';
import { Dices, Settings, Save, Star } from 'lucide-react';
import { Player, Ability } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface StatsTabProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

const DEFAULT_ABILITIES: Ability[] = [
  {
    name: 'Force',
    score: 10,
    modifier: 0,
    savingThrow: 0,
    skills: [
      { name: 'Athlétisme', bonus: 0, isProficient: false, hasExpertise: false }
    ]
  },
  {
    name: 'Dextérité',
    score: 10,
    modifier: 0,
    savingThrow: 0,
    skills: [
      { name: 'Acrobaties', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Discrétion', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Escamotage', bonus: 0, isProficient: false, hasExpertise: false }
    ]
  },
  {
    name: 'Constitution',
    score: 10,
    modifier: 0,
    savingThrow: 0,
    skills: []
  },
  {
    name: 'Intelligence',
    score: 10,
    modifier: 0,
    savingThrow: 0,
    skills: [
      { name: 'Arcanes', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Histoire', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Investigation', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Nature', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Religion', bonus: 0, isProficient: false, hasExpertise: false }
    ]
  },
  {
    name: 'Sagesse',
    score: 10,
    modifier: 0,
    savingThrow: 0,
    skills: [
      { name: 'Dressage', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Médecine', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Perception', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Perspicacité', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Survie', bonus: 0, isProficient: false, hasExpertise: false }
    ]
  },
  {
    name: 'Charisme',
    score: 10,
    modifier: 0,
    savingThrow: 0,
    skills: [
      { name: 'Intimidation', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Persuasion', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Représentation', bonus: 0, isProficient: false, hasExpertise: false },
      { name: 'Tromperie', bonus: 0, isProficient: false, hasExpertise: false }
    ]
  }
];

const getModifier = (score: number): number => Math.floor((score - 10) / 2);

const getProficiencyBonusForLevel = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

const getExpertiseLimit = (playerClass: string | null | undefined, level: number): number => {
  if (!playerClass) return 0;
  
  switch (playerClass) {
    case 'Roublard':
      if (level >= 6) return 4;
      if (level >= 1) return 2;
      return 0;
    case 'Barde':
      if (level >= 10) return 4;
      if (level >= 3) return 2;
      return 0;
    case 'Rôdeur':
      if (level >= 6) return 1;
      return 0;
    default:
      return 0;
  }
};

const hasJackOfAllTrades = (playerClass: string | null | undefined, level: number): boolean => {
  return playerClass === 'Barde' && level >= 2;
};

const getJackOfAllTradesBonus = (proficiencyBonus: number): number => {
  return Math.floor(proficiencyBonus / 2);
};

const getAbilityShortName = (abilityName: string): string => {
  switch (abilityName) {
    case 'Force':
      return 'For.';
    case 'Dextérité':
      return 'Dex.';
    case 'Constitution':
      return 'Cons.';
    case 'Intelligence':
      return 'Int.';
    case 'Sagesse':
      return 'Sag.';
    case 'Charisme':
      return 'Cha.';
    default:
      return abilityName.substring(0, 4) + '.';
  }
};

export function StatsTab({ player, onUpdate }: StatsTabProps) {
  const [editing, setEditing] = useState(false);

  const effectiveProficiency = getProficiencyBonusForLevel(player.level);

  const [stats, setStats] = useState(() => ({
    proficiency_bonus: effectiveProficiency,
    jack_of_all_trades: player.stats.jack_of_all_trades || false
  }));

  const [abilities, setAbilities] = useState<Ability[]>(() => {
    if (Array.isArray(player.abilities) && player.abilities.length > 0) {
      return player.abilities.map(ability => ({
        ...ability,
        skills: ability.skills.map(skill => ({
          ...skill,
          hasExpertise: skill.hasExpertise || false
        }))
      }));
    }
    return DEFAULT_ABILITIES;
  });

  const expertiseLimit = getExpertiseLimit(player.class, player.level);
  const currentExpertiseCount = abilities.reduce((count, ability) => 
    count + ability.skills.filter(skill => skill.hasExpertise).length, 0
  );

  const updateAbilityModifiers = (
    newAbilities: Ability[],
    currentStats = stats,
    proficiencyBonus = effectiveProficiency
  ) => {
    return newAbilities.map(ability => {
      const modifier = getModifier(ability.score);
      const jackOfAllTradesBonus = currentStats.jack_of_all_trades ? getJackOfAllTradesBonus(proficiencyBonus) : 0;

      const isSavingThrowProficient = ability.savingThrow !== ability.modifier;

      return {
        ...ability,
        modifier,
        savingThrow: modifier + (isSavingThrowProficient ? proficiencyBonus : 0),
        skills: ability.skills.map(skill => ({
          ...skill,
          bonus: modifier + (skill.isProficient ? 
            (skill.hasExpertise ? proficiencyBonus * 2 : proficiencyBonus) :
            (currentStats.jack_of_all_trades ? jackOfAllTradesBonus : 0)
          )
        }))
      };
    });
  };

  const handleScoreChange = (index: number, score: number) => {
    const newAbilities = [...abilities];
    newAbilities[index].score = Math.max(1, Math.min(20, score));
    setAbilities(updateAbilityModifiers(newAbilities, stats, effectiveProficiency));
  };

  const handleSavingThrowChange = (index: number) => {
    const newAbilities = [...abilities];
    const ability = newAbilities[index];
    const isCurrentlyProficient = ability.savingThrow !== ability.modifier;
    ability.savingThrow = ability.modifier + (isCurrentlyProficient ? 0 : effectiveProficiency);
    setAbilities(newAbilities);
  };

  const handleProficiencyChange = (abilityIndex: number, skillIndex: number) => {
    const newAbilities = [...abilities];
    const skill = newAbilities[abilityIndex].skills[skillIndex];
    
    if (skill.isProficient && skill.hasExpertise) {
      skill.hasExpertise = false;
    }
    
    skill.isProficient = !skill.isProficient;
    setAbilities(updateAbilityModifiers(newAbilities, stats, effectiveProficiency));
  };

  const handleExpertiseChange = (abilityIndex: number, skillIndex: number) => {
    const newAbilities = [...abilities];
    const skill = newAbilities[abilityIndex].skills[skillIndex];
    
    if (!skill.hasExpertise && currentExpertiseCount >= expertiseLimit) {
      toast.error(`Limite d'expertise atteinte (${expertiseLimit})`);
      return;
    }
    
    skill.hasExpertise = !skill.hasExpertise;
    setAbilities(updateAbilityModifiers(newAbilities, stats, effectiveProficiency));
  };

  const handleSave = async () => {
    try {
      const dexScore = abilities.find(a => a.name === 'Dextérité')?.score ?? 10;
      const dexMod = getModifier(dexScore);

      const updatedStatsLocal = {
        ...stats,
        jack_of_all_trades: hasJackOfAllTrades(player.class, player.level)
          ? (stats.jack_of_all_trades ?? false)
          : false
      };

      const mergedStats = {
        ...player.stats,
        ...updatedStatsLocal,
        proficiency_bonus: effectiveProficiency,
        initiative: dexMod
      };

      const { error } = await supabase
        .from('players')
        .update({ 
          abilities,
          stats: mergedStats
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        abilities,
        stats: mergedStats
      });

      setEditing(false);
      toast.success('Caractéristiques mises à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des caractéristiques:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Collecter toutes les compétences avec leur caractéristique associée
  const allSkills: Array<{abilityIndex: number; skillIndex: number; abilityShort: string; skillName: string; bonus: number; isProficient: boolean; hasExpertise: boolean}> = [];
  
  abilities.forEach((ability, abilityIndex) => {
    ability.skills.forEach((skill, skillIndex) => {
      allSkills.push({
        abilityIndex,
        skillIndex,
        abilityShort: getAbilityShortName(ability.name),
        skillName: skill.name,
        bonus: skill.bonus,
        isProficient: skill.isProficient,
        hasExpertise: skill.hasExpertise
      });
    });
  });

  return (
    <div className="space-y-6">
      <div className="stats-card">
        <div className="stat-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-100">
              Caractéristiques
            </h3>
          </div>
          <div className="flex items-center gap-4">
            {editing && expertiseLimit > 0 && (
              <div className="text-sm text-gray-400">
                Expertise: {currentExpertiseCount}/{expertiseLimit}
              </div>
            )}
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center"
              title={editing ? 'Sauvegarder' : 'Modifier'}
            >
              {editing ? <Save size={20} /> : <Settings size={20} />}
            </button>
          </div>
        </div>
        <div className="p-4">
          {/* Contenants des caractéristiques - 3 par ligne sur 2 lignes */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {abilities.map((ability, abilityIndex) => (
              <div key={ability.name} className="flex flex-col items-center">
                {/* Contenant principal avec l'image de fond */}
                <div 
                  className="relative w-28 h-36 flex flex-col items-center justify-start"
                  style={{
                    backgroundImage: 'url(/background/contenant_stats.png)',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Nom de la caractéristique en haut */}
                  <div className="absolute top-6 left-0 right-0 flex flex-col items-center">
                    <h4 className="text-xs font-normal text-gray-100 uppercase tracking-wide">
                      {ability.name}
                    </h4>
                  </div>

                  {/* Modificateur au centre */}
                  <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="text-3xl font-normal text-gray-100">
                      {ability.modifier >= 0 ? '+' : ''}{ability.modifier}
                    </div>
                  </div>

                  {/* Valeur de la caractéristique (bulle invisible) */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    {editing ? (
                      <input
                        type="number"
                        value={ability.score}
                        onChange={(e) => handleScoreChange(abilityIndex, parseInt(e.target.value) || 0)}
                        className="w-10 h-10 text-center text-base font-normal bg-transparent text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded"
                        min="1"
                        max="20"
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center text-base font-normal text-gray-100">
                        {ability.score}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sauvegarde en dessous du contenant */}
                <div className="mt-2 w-full max-w-[130px]">
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gray-800/50 rounded-md border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      {editing ? (
                        <button
                          onClick={() => handleSavingThrowChange(abilityIndex)}
                          className={`w-3.5 h-3.5 rounded border ${
                            ability.savingThrow !== ability.modifier
                              ? 'bg-red-500 border-red-600'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-3.5 h-3.5 rounded border ${
                            ability.savingThrow !== ability.modifier
                              ? 'bg-red-500 border-red-600'
                              : 'border-gray-600'
                          }`}
                        />
                      )}
                      <span className="text-xs text-gray-400">Sauv.</span>
                    </div>
                    <span className="text-sm font-medium text-gray-200">
                      {ability.savingThrow >= 0 ? '+' : ''}{ability.savingThrow}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tableau des compétences sur une seule colonne centrée */}
          <div className="flex justify-center mt-6">
            <div className="w-full max-w-2xl bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 text-center">Compétences</h4>
              <div className="space-y-1.5">
                {allSkills.map((skill) => (
                  <div
                    key={`${skill.abilityIndex}-${skill.skillIndex}`}
                    className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {editing ? (
                        <button
                          onClick={() => handleProficiencyChange(skill.abilityIndex, skill.skillIndex)}
                          className={`w-4 h-4 rounded border flex-shrink-0 ${
                            skill.isProficient
                              ? 'bg-red-500 border-red-600'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-4 h-4 rounded border flex-shrink-0 ${
                            skill.isProficient
                              ? 'bg-red-500 border-red-600'
                              : 'border-gray-600'
                          }`}
                        />
                      )}
                      {editing && skill.isProficient && expertiseLimit > 0 ? (
                        <button
                          onClick={() => handleExpertiseChange(skill.abilityIndex, skill.skillIndex)}
                          className={`w-4 h-4 flex items-center justify-center rounded flex-shrink-0 ${
                            skill.hasExpertise
                              ? 'text-yellow-500 hover:text-yellow-400'
                              : 'text-gray-600 hover:text-yellow-500'
                          }`}
                          title={skill.hasExpertise ? 'Retirer l\'expertise' : 'Ajouter l\'expertise'}
                        >
                          <Star size={12} />
                        </button>
                      ) : skill.hasExpertise ? (
                        <Star size={12} className="text-yellow-500 flex-shrink-0" />
                      ) : (
                        <div className="w-4 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-500 min-w-[40px]">{skill.abilityShort}</span>
                      <span className="text-sm text-gray-300 flex-1">
                        {skill.skillName}
                        {!skill.isProficient && stats.jack_of_all_trades && (
                          <span className="text-xs text-blue-400 ml-1" title="Touche-à-tout">
                            (T)
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-300 ml-3">
                      {skill.bonus >= 0 ? '+' : ''}{skill.bonus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Section Touche-à-tout pour les bardes */}
          {editing && hasJackOfAllTrades(player.class, player.level) && (
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => {
                    const newStats = { ...stats, jack_of_all_trades: !stats.jack_of_all_trades };
                    setStats(newStats);
                    setAbilities(updateAbilityModifiers(abilities, newStats, effectiveProficiency));
                  }}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    stats.jack_of_all_trades
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-600 hover:border-blue-500'
                  }`}
                >
                  {stats.jack_of_all_trades && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <div>
                  <h4 className="text-lg font-medium text-blue-300 mb-2">
                    Touche-à-tout
                  </h4>
                  <p className="text-sm text-gray-400 mb-2">
                    Ajoute +{getJackOfAllTradesBonus(effectiveProficiency)} aux tests de caractéristique sans maîtrise
                  </p>
                  <p className="text-xs text-gray-500">
                    Cette capacité s'applique automatiquement aux compétences non maîtrisées quand elle est activée.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Affichage de l'état de Touche-à-tout en mode lecture */}
          {!editing && stats.jack_of_all_trades && (
            <div className="mt-6 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-400" />
                <span className="text-blue-300 font-medium">Touche-à-tout actif</span>
                <span className="text-sm text-gray-400">
                  (+{getJackOfAllTradesBonus(effectiveProficiency)} aux tests sans maîtrise)
                </span>
              </div>
            </div> 
          )}

          {/* Bouton Sauvegarder en bas de section (visible seulement en mode édition) */}
          {editing && (
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <button
                onClick={handleSave}
                className="w-full btn-primary px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium text-base"
              >
                <Save size={20} />
                Sauvegarder les modifications
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}