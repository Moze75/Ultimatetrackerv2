import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Heart, Dices, BookOpen, Eye, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Player, DndClass } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { getSpellSlotsByLevel, getSpellKnowledgeInfo } from '../utils/spellSlots2024';
import { loadSectionsSmart } from './ClassesTab/modals/ClassDataModal';
import { AbilitySection, sentenceCase, slug } from './ClassesTab/modals/ClassUtilsModal';
import { MarkdownLite } from '../lib/markdownLite';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onUpdate: (player: Player) => void;
}

/* ============================ Helpers ============================ */

const getHitDieSize = (playerClass: DndClass | null | undefined): number => {
  switch (playerClass) {
    case 'Barbare': return 12;
    case 'Guerrier':
    case 'Paladin':
    case 'Rodeur': return 10;
    case 'Barde':
    case 'Clerc':
    case 'Druide':
    case 'Moine':
    case 'Roublard':
    case 'Occultiste': return 8; 
    case 'Magicien':
    case 'Ensorceleur': return 6;
    default: return 8;
  }
};

const getAverageHpGain = (hitDieSize: number): number => {
  return Math.floor((hitDieSize / 2) + 1);
};

// Modificateurs de caractéristiques depuis StatsTab (player.abilities) — robustes
const extractAbilityMod = (player: Player, keys: string[]) => {
  const abilities: any = (player as any)?.abilities;
  if (Array.isArray(abilities)) {
    const found = abilities.find((a: any) => {
      const n = (a?.name || a?.abbr || a?.key || a?.code || '').toString().toLowerCase();
      return keys.some(k => n === k);
    });
    if (found) {
      if (typeof found.modifier === 'number' && Number.isFinite(found.modifier)) return found.modifier;
      if (typeof found.score === 'number' && Number.isFinite(found.score)) return Math.floor((found.score - 10) / 2);
      if (typeof found.modifier === 'string') {
        const n = Number(found.modifier.replace(/[^\d+-]/g, ''));
        if (Number.isFinite(n)) return n;
      }
      if (typeof found.score === 'string') {
        const n = Number(found.score.replace(/[^\d+-]/g, ''));
        if (Number.isFinite(n)) return Math.floor((n - 10) / 2);
      }
    }
  }
  return 0;
};

const getChaModFromPlayer = (player: Player): number =>
  extractAbilityMod(player, ['charisme', 'charisma', 'cha', 'car']);

/* ============================ Sous-classes (helpers) ============================ */

// Canonicalisation minimale pour RPC (même logique que PlayerProfileSettingsModal)
function mapClassForRpc(pClass: DndClass | null | undefined): string | null | undefined {
  if (pClass === 'Occultiste') return 'Occultiste';
  return pClass;
}

/* ============================ Composant AbilityCard simplifié (sans badge) ============================ */

function CompactAbilityCard({
  section,
  defaultOpen,
  ctx,
}: {
  section: AbilitySection;
  defaultOpen?: boolean;
  ctx: any;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const contentId = `ability-preview-${section.origin}-${section.level ?? 'x'}-${slug(section.title)}`;
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (open) {
      setMaxHeight(el.scrollHeight);
      const ro = new ResizeObserver(() => {
        setMaxHeight(el.scrollHeight);
      });
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      setMaxHeight(0);
    }
  }, [open, section.content]);

  return (
    <article
      className={[
        'rounded-xl border ring-1 ring-black/5 shadow-lg shadow-black/20',
        'border-gray-700/30',
        'bg-gray-800/50',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            {/* Titre SANS le badge pour gagner de la place */}
            <h3 className="text-white font-semibold text-sm sm:text-base">
              {sentenceCase(section.title)}
            </h3>
          </div>
          <div className="ml-2 mt-0.5 text-white/80 shrink-0">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      <div
        id={contentId}
        className="overflow-hidden transition-[max-height,opacity] duration-300"
        style={{ maxHeight: open ? maxHeight : 0, opacity: open ? 1 : 0 }}
      >
        <div ref={innerRef} className="px-4 pt-1 pb-4">
          <div className="text-sm text-white/90 leading-relaxed space-y-2">
            <MarkdownLite
              text={section.content}
              ctx={{
                ...ctx,
                section: { level: Number(section.level) || 0, origin: section.origin, title: section.title },
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================ Nouveau composant : Prévisualisation Sous-classe ============================ */

interface SubclassPreviewProps {
  subclassName: string;
  className: string;
  level: number;
  isSelected: boolean;
  onSelect: () => void;
}

function SubclassPreview({ subclassName, className, level, isSelected, onSelect }: SubclassPreviewProps) {
  const [sections, setSections] = useState<AbilitySection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadSections = async () => {
      setLoading(true);
      try {
        const res = await loadSectionsSmart({
          className,
          subclassName,
          level,
        });
        if (!mounted) return;
        
        // Filtrer uniquement les aptitudes de sous-classe de niveau 3
        const subclassSections = res.filter(
          s => s.origin === 'subclass' && (typeof s.level === 'number' ? s.level <= level : true)
        );
        setSections(subclassSections);
      } catch (e) {
        console.debug('[SubclassPreview] loadSectionsSmart error:', e);
        if (!mounted) return;
        setSections([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSections();
    return () => { mounted = false; };
  }, [className, subclassName, level]);

  return (
    <div 
      className={`
        rounded-lg border-2 p-4 cursor-pointer transition-all
        ${isSelected 
          ? 'border-amber-500 bg-amber-500/10' 
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div 
              className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-600'}
              `}
            >
              {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <h4 className="font-semibold text-gray-100">{subclassName}</h4>
          </div>
          
          {sections.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {sections.length} aptitude{sections.length > 1 ? 's' : ''} au niveau {level}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors shrink-0"
          title="Voir les détails"
        >
          {showDetails ? <ChevronUp size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {/* Détails des aptitudes */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <img
                src="/icons/wmremove-transformed.png"
                alt="Chargement..."
                className="animate-spin h-6 w-6 object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
          ) : sections.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              Aucune aptitude trouvée
            </p>
          ) : (
            <div className="space-y-3">
              {sections.map((s, i) => (
                <CompactAbilityCard
                  key={`${s.origin}-${s.level ?? 'x'}-${i}`}
                  section={s}
                  defaultOpen={false}
                  ctx={{
                    characterId: null,
                    className: className,
                    subclassName: subclassName,
                    checkedMap: new Map(),
                    onToggle: () => {},
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ Composant ============================ */

export function LevelUpModal({ isOpen, onClose, player, onUpdate }: LevelUpModalProps) {
  const [hpGain, setHpGain] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sous-classes (comme dans PlayerProfileSettingsModal)
  const [availableSubclasses, setAvailableSubclasses] = useState<string[]>([]);
  const [selectedSubclass, setSelectedSubclass] = useState<string>(player.subclass || '');

  useEffect(() => {
    if (!isOpen) return;
    // Init valeur choisie depuis le joueur
    setSelectedSubclass(player.subclass || '');
  }, [isOpen, player.subclass]);

  useEffect(() => {
    if (!isOpen) return;
    const loadSubclasses = async () => {
      const cls = mapClassForRpc(player.class);
      if (!cls) {
        setAvailableSubclasses([]);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('get_subclasses_by_class', {
          p_class: cls,
        });
        if (error) throw error;
        setAvailableSubclasses((data as any) || []);
      } catch (error) {
        console.error('Erreur lors du chargement des sous-classes:', error);
        setAvailableSubclasses([]);
      }
    };
    loadSubclasses();
  }, [isOpen, player.class]);

  if (!isOpen) return null;

  const hitDieSize = getHitDieSize(player.class);
  const averageHpGain = getAverageHpGain(hitDieSize);
  const constitutionModifier = player.abilities?.find(a => (a.name || a.abbr)?.toString().toLowerCase() === 'constitution')?.modifier || 0;
  const theoreticalHpGain = averageHpGain + constitutionModifier;
  const newLevel = player.level + 1;

  const requiresSubclassSelection = newLevel === 3 && !player.subclass && availableSubclasses.length > 0;

  const handleLevelUpWithAutoSave = async () => {
    const hpGainValue = parseInt(hpGain) || 0;
    
    if (hpGainValue < 1) {
      toast.error('Les PV supplémentaires doivent être d\'au moins 1');
      return;
    }

    if (hpGainValue > (hitDieSize + constitutionModifier)) {
      toast.error(`Les PV supplémentaires ne peuvent pas dépasser ${hitDieSize + constitutionModifier}`);
      return;
    }

    // Sous-classe obligatoire à l'arrivée au niveau 3 (si non encore choisie et options dispo)
    if (requiresSubclassSelection && !selectedSubclass) {
      toast.error('Veuillez sélectionner une sous-classe pour le niveau 3.');
      return;
    }

    setIsProcessing(true);

    try {
      const newMaxHp = player.max_hp + hpGainValue;
      const newCurrentHp = player.current_hp + hpGainValue;
      const newHitDice = {
        total: newLevel,
        used: player.hit_dice?.used || 0
      };

      // Ressources de classe — inclut Paladin Conduits divins (N3+)
      const getClassResourcesByLevel = (playerClass: string | null | undefined, level: number) => {
        const resources: any = { ...player.class_resources };

        switch (playerClass) {
          case 'Barbare':
            resources.rage = Math.min(6, Math.floor((level + 3) / 4) + 2);
            break;
          case 'Barde': {
            const raw = resources?.bardic_inspiration;
            if (typeof raw === 'string' && raw.trim() === '') {
              delete resources.bardic_inspiration;
            }
            const upper = Math.max(0, getChaModFromPlayer(player));
            resources.used_bardic_inspiration = Math.min(resources.used_bardic_inspiration || 0, upper);
            break;
          }
          case 'Clerc':
            resources.channel_divinity = level >= 6 ? 2 : 1;
            break;
          case 'Druide':
            resources.wild_shape = 2;
            break;
          case 'Ensorceleur':
            resources.sorcery_points = level;
            break;
          case 'Guerrier':
            resources.action_surge = level >= 17 ? 2 : 1;
            break;
          case 'Magicien':
            resources.arcane_recovery = true;
            break;
          case 'Moine':
            resources.ki_points = level;
            break;
          case 'Paladin': {
            resources.lay_on_hands = level * 5;
            if (level >= 3) {
              const cap = level >= 11 ? 3 : 2;
              resources.channel_divinity = cap;
              const used = resources.used_channel_divinity || 0;
              resources.used_channel_divinity = Math.min(used, cap);
            } else {
              delete resources.channel_divinity;
              delete resources.used_channel_divinity;
            }
            break;
          }
          case 'Rodeur':
            resources.favored_foe = Math.max(1, Math.floor((level + 3) / 4));
            break;
          case 'Roublard':
            resources.sneak_attack = `${Math.ceil(level / 2)}d6`;
            break;
        }

        return resources;
      };

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel, player.spell_slots);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

      const nextSubclass =
        newLevel === 3
          ? (selectedSubclass || player.subclass || null)
          : (player.subclass || null);

      const { error } = await supabase
        .from('players')
        .update({
          level: newLevel,
          max_hp: newMaxHp,
          current_hp: newCurrentHp,
          hit_dice: newHitDice,
          spell_slots: newSpellSlots,
          class_resources: newClassResources,
          subclass: nextSubclass,
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        level: newLevel,
        max_hp: newMaxHp,
        current_hp: newCurrentHp,
        hit_dice: newHitDice,
        spell_slots: newSpellSlots,
        class_resources: newClassResources,
        subclass: nextSubclass || undefined,
      });

      toast.success(`Félicitations ! Passage au niveau ${newLevel} (+${hpGainValue} PV)`);
      onClose();
      
      setTimeout(() => {
        if ((window as any).closeSettings) {
          (window as any).closeSettings();
        }
      }, 500);
    } catch (error) {
      console.error('Erreur lors du passage de niveau:', error);
      toast.error('Erreur lors du passage de niveau');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLevelUp = async () => {
    const hpGainValue = parseInt(hpGain) || 0;
    
    if (hpGainValue < 1) {
      toast.error('Les PV supplémentaires doivent être d\'au moins 1');
      return;
    }

    if (hpGainValue > (hitDieSize + constitutionModifier)) {
      toast.error(`Les PV supplémentaires ne peuvent pas dépasser ${hitDieSize + constitutionModifier}`);
      return;
    }

    if (requiresSubclassSelection && !selectedSubclass) {
      toast.error('Veuillez sélectionner une sous-classe pour le niveau 3.');
      return;
    }

    setIsProcessing(true);

    try {
      const newMaxHp = player.max_hp + hpGainValue;
      const newCurrentHp = player.current_hp + hpGainValue;
      const newHitDice = {
        total: newLevel,
        used: player.hit_dice?.used || 0
      };

      // Ressources de classe — inclut Paladin Conduits divins (N3+)
      const getClassResourcesByLevel = (playerClass: string | null | undefined, level: number) => {
        const resources: any = { ...player.class_resources };

        switch (playerClass) {
          case 'Barbare':
            resources.rage = Math.min(6, Math.floor((level + 3) / 4) + 2);
            break;
          case 'Barde': {
            const raw = resources?.bardic_inspiration;
            if (typeof raw === 'string' && raw.trim() === '') {
              delete resources.bardic_inspiration;
            }
            const upper = Math.max(0, getChaModFromPlayer(player));
            resources.used_bardic_inspiration = Math.min(resources.used_bardic_inspiration || 0, upper);
            break;
          }
          case 'Clerc':
            resources.channel_divinity = level >= 6 ? 2 : 1;
            break;
          case 'Druide':
            resources.wild_shape = 2;
            break;
          case 'Ensorceleur':
            resources.sorcery_points = level;
            break;
          case 'Guerrier':
            resources.action_surge = level >= 17 ? 2 : 1;
            break;
          case 'Magicien':
            resources.arcane_recovery = true;
            break;
          case 'Moine':
            resources.ki_points = level;
            break;
          case 'Paladin': {
            resources.lay_on_hands = level * 5;
            if (level >= 3) {
              const cap = level >= 11 ? 3 : 2;
              resources.channel_divinity = cap;
              const used = resources.used_channel_divinity || 0;
              resources.used_channel_divinity = Math.min(used, cap);
            } else {
              delete resources.channel_divinity;
              delete resources.used_channel_divinity;
            }
            break;
          }
          case 'Rôdeur':
            resources.favored_foe = Math.max(1, Math.floor((level + 3) / 4));
            break;
          case 'Roublard':
            resources.sneak_attack = `${Math.ceil(level / 2)}d6`;
            break;
        }

        return resources;
      };

      const newSpellSlots = getSpellSlotsByLevel(player.class, newLevel, player.spell_slots);
      const newClassResources = getClassResourcesByLevel(player.class, newLevel);

      const nextSubclass =
        newLevel === 3
          ? (selectedSubclass || player.subclass || null)
          : (player.subclass || null);

      const { error } = await supabase
        .from('players')
        .update({
          level: newLevel,
          max_hp: newMaxHp,
          current_hp: newCurrentHp,
          hit_dice: newHitDice,
          spell_slots: newSpellSlots,
          class_resources: newClassResources,
          subclass: nextSubclass,
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        level: newLevel,
        max_hp: newMaxHp,
        current_hp: newCurrentHp,
        hit_dice: newHitDice,
        spell_slots: newSpellSlots,
        class_resources: newClassResources,
        subclass: nextSubclass || undefined,
      });

      toast.success(`Félicitations ! Passage au niveau ${newLevel} (+${hpGainValue} PV)`);
      onClose();
      
      if ((window as any).closeSettings) {
        (window as any).closeSettings();
      }
    } catch (error) {
      console.error('Erreur lors du passage de niveau:', error);
      toast.error('Erreur lors du passage de niveau');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcul des informations de sorts
  const currentSpellInfo = getSpellKnowledgeInfo(player.class, player.level);
  const newSpellInfo = getSpellKnowledgeInfo(player.class, newLevel);
  const isCaster = newSpellInfo.kind !== 'none';

  // Calcul des nouveaux sorts à apprendre
  const cantripsGain = 
    (newSpellInfo.kind === 'prepared' && typeof newSpellInfo.cantrips === 'number' && 
     currentSpellInfo.kind === 'prepared' && typeof currentSpellInfo.cantrips === 'number')
      ? newSpellInfo.cantrips - currentSpellInfo.cantrips
      : 0;

  const preparedGain = 
    (newSpellInfo.kind === 'prepared' && currentSpellInfo.kind === 'prepared')
      ? newSpellInfo.prepared - currentSpellInfo.prepared
      : 0;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overscroll-contain">
      <div
        className="
          bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl
          max-w-3xl w-full border border-gray-700/50 overflow-hidden
          flex flex-col max-h-[90vh]
        "
        role="dialog"
        aria-modal="true"
      >
        {/* Header (non scrollable) */}
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-gray-700/50 p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Passage de niveau
                </h3>
                <p className="text-sm text-gray-400">
                  Niveau {player.level} → {newLevel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content (scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Character Info */}
          <div className="text-center">
            <h4 className="text-xl font-bold text-gray-100 mb-2">
              {player.adventurer_name || player.name}
            </h4>
            <p className="text-gray-400">
              {player.class} niveau {player.level}
            </p>
          </div>

          {/* HP Calculation */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-red-500" />
              <h5 className="font-medium text-gray-200">Points de vie supplémentaires</h5>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Dices className="w-4 h-4" />
                <span>
                  Dé de vie : 1d{hitDieSize} (ou {averageHpGain}) + modificateur de Constitution ({constitutionModifier >= 0 ? '+' : ''}{constitutionModifier})
                </span>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">
                  PV théoriques : <span className="text-green-400 font-medium">{theoreticalHpGain}</span>
                </p>
                <p className="text-xs text-gray-500">
                  (Vous pouvez choisir la valeur moyenne ou lancer le dé)
                </p>
              </div>
            </div>
          </div>

          {/* HP Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              PV supplémentaires à appliquer
            </label>
            <input
              type="number"
              min="1"
              max={hitDieSize + constitutionModifier}
              value={hpGain}
              onChange={(e) => setHpGain(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md text-center text-lg font-bold"
              placeholder={theoreticalHpGain.toString()}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Minimum : 1 • Maximum : {hitDieSize + constitutionModifier}
            </p>
          </div>

          {/* Current HP Display */}
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">PV actuels :</span>
              <span className="text-gray-200">{player.current_hp} / {player.max_hp}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-400">Après passage de niveau :</span>
              <span className="text-green-400 font-medium">
                {player.current_hp + (parseInt(hpGain) || 0)} / {player.max_hp + (parseInt(hpGain) || 0)}
              </span>
            </div>
          </div>

          {/* Sous-classe (niveau 3) - VERSION COMPACTE */}
          {newLevel === 3 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h5 className="font-medium text-gray-200">Choix de sous-classe</h5>
              </div>

              <div className="space-y-3">
                {availableSubclasses.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Aucune sous-classe disponible. Vous pourrez la définir plus tard dans les paramètres du personnage.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-300 mb-3">
                      Cliquez sur <Eye className="inline w-4 h-4" /> pour consulter les aptitudes de chaque sous-classe :
                    </p>
                    
                    {availableSubclasses.map((subclass) => (
                      <SubclassPreview
                        key={subclass}
                        subclassName={subclass}
                        className={player.class || ''}
                        level={newLevel}
                        isSelected={selectedSubclass === subclass}
                        onSelect={() => setSelectedSubclass(subclass)}
                      />
                    ))}

                    {!player.subclass && (
                      <p className="text-xs text-gray-500 mt-4 text-center">
                        La sous-classe est requise au niveau 3. Consultez les aptitudes ci-dessus pour faire votre choix.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sorts à ajouter - VERSION AMÉLIORÉE */}
          {isCaster && newSpellInfo.kind === 'prepared' && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h5 className="font-medium text-gray-200">Nouveaux sorts à apprendre</h5>
              </div>

              <div className="space-y-3">
                {/* Sorts mineurs */}
                {typeof newSpellInfo.cantrips === 'number' && newSpellInfo.cantrips > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-200 mb-1">
                          Sorts mineurs
                        </p>
                        <p className="text-xs text-gray-400">
                          {currentSpellInfo.kind === 'prepared' && typeof currentSpellInfo.cantrips === 'number'
                            ? `${currentSpellInfo.cantrips} → ${newSpellInfo.cantrips}`
                            : `Total : ${newSpellInfo.cantrips}`
                          }
                        </p>
                      </div>
                      {cantripsGain > 0 && (
                        <div className="flex items-center gap-1 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                          <Plus className="w-4 h-4" />
                          <span className="text-sm font-bold">{cantripsGain}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sorts préparés/connus */}
                <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-200 mb-1">
                        Sorts préparés
                      </p>
                      <p className="text-xs text-gray-400">
                        {currentSpellInfo.kind === 'prepared'
                          ? `${currentSpellInfo.prepared} → ${newSpellInfo.prepared}`
                          : `Total : ${newSpellInfo.prepared}`
                        }
                      </p>
                    </div>
                    {preparedGain > 0 && (
                      <div className="flex items-center gap-1 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-bold">{preparedGain}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message d'aide */}
                <p className="text-xs text-gray-500 text-center">
                  {cantripsGain > 0 || preparedGain > 0
                    ? 'Ajoutez vos nouveaux sorts dans l\'onglet Sorts après la montée de niveau.'
                    : 'Aucun nouveau sort à apprendre à ce niveau.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (non scrollable) */}
        <div className="p-4 border-t border-gray-700/50 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleLevelUpWithAutoSave}
              disabled={isProcessing || !hpGain || parseInt(hpGain) < 1 || (requiresSubclassSelection && !selectedSubclass)}
              className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                isProcessing || !hpGain || parseInt(hpGain) < 1 || (requiresSubclassSelection && !selectedSubclass)
                  ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Passage en cours...
                </>
              ) : (
                <>
                  <TrendingUp size={18} />
                  Passer au niveau {newLevel}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}