import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ListChecks,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

import type { ClassResources, Player } from '../types/dnd';
import {
  AbilitySection,
  PlayerLike,
  canonicalClass,
  sentenceCase,
  getSubclassFromPlayerLike,
  getChaModFromPlayerLike,
} from './ClassesTab/modals/ClassUtilsModal';
import { ScreenRipple, createScreenRippleHandler } from './ClassesTab/modals/ClassEffectsModal';
import { AbilityCard } from './ClassesTab/modals/ClassAbilitiesModal';
import {
  ClassResourcesCard,
  mirrorMonkKeys,
  buildDefaultsForClass,
} from './ClassesTab/modals/ClassResourcesModal';
import { loadSectionsSmart } from './ClassesTab/modals/ClassDataModal';
import { loadFeatureChecks, upsertFeatureCheck } from '../services/featureChecks';

type Props = {
  player?: (PlayerLike & Partial<Player>) | null;
  playerClass?: string;
  className?: string;
  subclassName?: string | null;
  characterLevel?: number;
  onUpdate?: (player: Player) => void;
  sections?: AbilitySection[] | null;
};

const DEBUG = typeof window !== 'undefined' && (window as any).UT_DEBUG === true;

function ClassesTab({
  player,
  playerClass,
  className,
  subclassName,
  characterLevel,
  onUpdate,
  sections: preloadedSections,
}: Props) {

  const [sections, setSections] = useState<AbilitySection[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedMap, setCheckedMap] = useState<Map<string, boolean>>(new Map());
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [classResources, setClassResources] = useState<ClassResources | null | undefined>(player?.class_resources);
  const [screenRipple, setScreenRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const triggerScreenRippleFromEvent = createScreenRippleHandler(setScreenRipple);

  const [classHeaderOpen, setClassHeaderOpen] = useState(true);

  const rawClass = (player?.class ?? playerClass ?? className ?? '').trim();
  const rawSubclass = (getSubclassFromPlayerLike(player) ?? subclassName) ?? null;

  const displayClass = rawClass ? sentenceCase(rawClass) : '';
  const displaySubclass = rawSubclass ? sentenceCase(rawSubclass) : null;

  const finalLevelRaw = player?.level ?? characterLevel ?? 1;
  const finalLevel = Math.max(1, Number(finalLevelRaw) || 1);
  const characterId = player?.id ?? null;

  /* Sync class resources */
  useEffect(() => {
    setClassResources(player?.class_resources);
  }, [player?.class_resources, player?.id]);

  /* Load sections */
  useEffect(() => {
    let mounted = true;

    if (!rawClass) {
      setSections([]);
      setLoading(false);
      return () => { mounted = false; };
    }

    if (preloadedSections) {
      setSections(preloadedSections);
      setLoading(false);
      return () => { mounted = false; };
    }

    if (preloadedSections === null) {
      setLoading(true);
      return () => { mounted = false; };
    }

    (async () => {
      setLoading(true);
      try {
        const res = await loadSectionsSmart({
          className: rawClass,
          subclassName: rawSubclass,
          level: finalLevel,
        });
        if (!mounted) return;
        setSections(res);
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] loadSectionsSmart error:', e);
        if (!mounted) return;
        setSections([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [preloadedSections, rawClass, rawSubclass, finalLevel]);

  /* Load feature checks */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!characterId) {
        setCheckedMap(new Map());
        return;
      }
      setLoadingChecks(true);
      try {
        const map = await loadFeatureChecks(characterId);
        if (!mounted) return;
        setCheckedMap(map);
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] loadFeatureChecks error:', e);
        if (!mounted) return;
        setCheckedMap(new Map());
      } finally {
        if (mounted) setLoadingChecks(false);
      }
    })();
    return () => { mounted = false; };
  }, [characterId]);

  /* Auto init missing resources */
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!player?.id || !displayClass) return;

      const cls = canonicalClass(displayClass);
      if (!cls) return;

      const ensureKey = `${player.id}:${cls}:${finalLevel}`;
      if (initKeyRef.current === ensureKey) return;

      const current: Record<string, any> = { ...(classResources || {}) };
      const defaults = buildDefaultsForClass(cls, finalLevel, player);

      let changed = false;
      for (const [k, v] of Object.entries(defaults)) {
        if (current[k] === undefined || current[k] === null) {
            current[k] = v;
          changed = true;
        }
      }
      if (!changed) return;

      initKeyRef.current = ensureKey;
      try {
        const { error } = await supabase.from('players').update({ class_resources: current }).eq('id', player.id);
        if (error) throw error;

        setClassResources(current as ClassResources);
        if (onUpdate && player) {
          onUpdate({ ...(player as any), class_resources: current } as Player);
        }
      } catch (e) {
        initKeyRef.current = null;
        console.error('[ClassesTab] auto-init class_resources error:', e);
      }
    })();
  }, [player?.id, displayClass, finalLevel, classResources, player, onUpdate]);

  /* Bardic inspiration dynamic cap */
  const bardCapRef = useRef<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!player?.id || !displayClass) return;
      if (canonicalClass(displayClass) !== 'Barde') return;

      const cap = Math.max(0, getChaModFromPlayerLike(player));
      const total = (classResources as any)?.bardic_inspiration;
      const used = (classResources as any)?.used_bardic_inspiration || 0;
      const key = `${player.id}:${cap}:${total ?? 'u'}:${used}`;
      if (bardCapRef.current === key) return;

      if (typeof total !== 'number' || total !== cap || used > cap) {
        const next = {
          ...(classResources || {}),
          bardic_inspiration: cap,
          used_bardic_inspiration: Math.min(used, cap),
        };
        try {
          const { error } = await supabase.from('players').update({ class_resources: next }).eq('id', player.id);
          if (error) throw error;
          setClassResources(next as ClassResources);
          bardCapRef.current = key;
          if (onUpdate && player) {
            onUpdate({ ...(player as any), class_resources: next } as Player);
          }
        } catch (e) {
          console.error('[ClassesTab] bard cap update error:', e);
          bardCapRef.current = null;
        }
      } else {
        bardCapRef.current = key;
      }
    })();
  }, [
    player?.id,
    displayClass,
    player?.stats?.charisma,
    player?.stats?.CHA,
    player?.charisma,
    player?.CHA,
    player?.ability_scores?.cha,
    player?.abilities,
    classResources?.bardic_inspiration,
    classResources?.used_bardic_inspiration,
    onUpdate,
    player,
  ]);

  /* Toggle ability check */
  async function handleToggle(featureKey: string, checked: boolean) {
    setCheckedMap(prev => {
      const next = new Map(prev);
      next.set(featureKey, checked);
      return next;
    });
    try {
      await upsertFeatureCheck({
        characterId,
        className: displayClass,
        subclassName: displaySubclass ?? null,
        featureKey,
        checked,
      });
    } catch (e) {
      if (DEBUG) console.debug('[ClassesTab] upsertFeatureCheck error:', e);
    }
  }

  const visible = useMemo(
    () =>
      sections
        .filter(s => (typeof s.level === 'number' ? s.level <= finalLevel : true))
        .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0)),
    [sections, finalLevel]
  );

  const hasClass = !!displayClass;
  const hasSubclass = !!displaySubclass;

  return (
    <>
      <div className="space-y-4">

        {/* BANDEAU PLEINE LARGEUR (edge-to-edge) */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={classHeaderOpen}
          onClick={() => setClassHeaderOpen(o => !o)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setClassHeaderOpen(o => !o);
            }
          }}
          className="-mx-4 px-4 py-2 bg-[#1f2730] hover:bg-[#24303b] transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 border-y border-white/10"
          /* 
            Remarques :
            - -mx-4 permet de s'aligner sur les bords si le parent a px-4.
            - Pas de rounded.
            - border-y seulement (pas de barres latérales).
            - Ajuste -mx-4 si ton container parent a un autre padding horizontal.
          */
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-white">
                {hasClass ? displayClass : '—'}
                {hasClass && hasSubclass && (
                  <span className="ml-2 font-normal text-white/80">- {displaySubclass}</span>
                )}
                {hasClass && !hasSubclass && finalLevel >= 3 && (
                  <span className="ml-2 font-normal text-red-400">
                    Sélectionnez votre sous-classe dans les paramètres
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {hasClass && (
                <span className="text-xs text-white/70 whitespace-nowrap">
                  Niveau {finalLevel}
                </span>
              )}
              {classHeaderOpen ? (
                <ChevronDown size={18} className="text-white/70" />
              ) : (
                <ChevronRight size={18} className="text-white/70" />
              )}
            </div>
          </div>
        </div>

        {classHeaderOpen && (
          <div className="space-y-6">
            {!hasClass && (
              <div className="text-center text-white/70 py-6">
                Sélectionne une classe pour afficher les aptitudes.
              </div>
            )}

            {hasClass && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-base font-semibold text-gray-200">
                    Ressources de classe
                  </span>
                </div>
                <div className="[&_.stat-header]:hidden">
                  <ClassResourcesCard
                    playerClass={displayClass}
                    resources={classResources || undefined}
                    onUpdateResource={updateClassResource}
                    player={player ?? undefined}
                    level={finalLevel}
                    onPulseScreen={triggerScreenRippleFromEvent}
                  />
                </div>
              </div>
            )}

            {hasClass && (
              loading ? (
                <div className="flex items-center justify-center py-12">
                  <img
                    src="/icons/wmremove-transformed.png"
                    alt="Chargement..."
                    className="animate-spin h-10 w-10 object-contain"
                    style={{ backgroundColor: 'transparent' }}
                  />
                </div>
              ) : visible.length === 0 ? (
                <div className="text-center text-white/70 py-10">
                  Aucune aptitude trouvée pour "{displayClass}{displaySubclass ? ` - ${displaySubclass}` : ''}".
                  {DEBUG && (
                    <pre className="mt-3 text-xs text-white/60">
                      Activez window.UT_DEBUG = true pour voir les tentatives de chargement dans la console.
                    </pre>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-sky-500" />
                    <span className="text-base font-semibold text-gray-200">
                      Compétences de classe et sous-classe
                    </span>
                  </div>
                  <div className="space-y-4">
                    {visible.map((s, i) => (
                      <AbilityCard
                        key={`${s.origin}-${s.level ?? 'x'}-${i}`}
                        section={s}
                        defaultOpen={false}
                        ctx={{
                          characterId,
                          className: displayClass,
                          subclassName: displaySubclass,
                          checkedMap,
                          onToggle: handleToggle,
                        }}
                        disableContentWhileLoading={loadingChecks}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {screenRipple && (
        <ScreenRipple
          key={screenRipple.key}
          x={screenRipple.x}
          y={screenRipple.y}
          onDone={() => setScreenRipple(null)}
        />
      )}
    </>
  );

  async function updateClassResource(
    resource: keyof ClassResources,
    value: ClassResources[keyof ClassResources]
  ) {
    if (!player?.id) return;

    if ((resource as any) === 'pact_slots' && typeof value === 'object' && value !== null) {
      try {
        const { error } = await supabase.from('players').update({ spell_slots: value }).eq('id', player.id);
        if (error) throw error;
        if (onUpdate && player) {
          onUpdate({ ...(player as any), spell_slots: value } as Player);
        }
        const prevUsed = (player.spell_slots?.used_pact_slots || 0);
        const newUsed = (value as any).used_pact_slots || 0;
        const action = newUsed > prevUsed ? 'utilisé' : 'récupéré';
        const diff = Math.abs(newUsed - prevUsed);
        toast.success(`${diff} emplacement${diff > 1 ? 's' : ''} de pacte ${action}`);
      } catch (err) {
        console.error('Erreur lors de la mise à jour des emplacements de pacte:', err);
        toast.error('Erreur lors de la mise à jour');
      }
      return;
    }

    if (resource === 'bardic_inspiration') {
      toast.error("Le total d'Inspiration bardique est calculé automatiquement (modificateur de Charisme).");
      return;
    }
    if (resource === 'lay_on_hands') {
      toast.error("Le total d'Imposition des mains est calculé automatiquement (5 × niveau de Paladin).");
      return;
    }

    const next: any = { ...(classResources || {}) };

    if (resource === 'used_bardic_inspiration' && typeof value === 'number') {
      const cap = Math.max(0, getChaModFromPlayerLike(player));
      next.used_bardic_inspiration = Math.min(Math.max(0, value), cap);
    } else if (resource === 'used_lay_on_hands' && typeof value === 'number') {
      const lvl = Number(player?.level || 0);
      const cap = Math.max(0, lvl * 5);
      next.used_lay_on_hands = Math.min(Math.max(0, value), cap);
    } else {
      next[resource] = value;
    }

    mirrorMonkKeys(resource, value, next);

    try {
      const { error } = await supabase.from('players').update({ class_resources: next }).eq('id', player.id);
      if (error) throw error;

      setClassResources(next as ClassResources);

      if (onUpdate && player) {
        onUpdate({ ...(player as any), class_resources: next } as Player);
      }

      if (typeof value === 'boolean') {
        toast.success(`Récupération arcanique ${value ? 'utilisée' : 'disponible'}`);
      } else {
        const resourceNames: Record<string, string> = {
          rage: 'Rage',
          bardic_inspiration: 'Inspiration bardique',
          channel_divinity: 'Conduit divin',
          wild_shape: 'Forme sauvage',
          sorcery_points: 'Points de sorcellerie',
          action_surge: "Second souffle",
          credo_points: 'Points de crédo',
          ki_points: 'Points de crédo',
          lay_on_hands: 'Imposition des mains',
          favored_foe: 'Ennemi juré',
          sneak_attack: 'Attaque sournoise',
          pact_magic: 'Magie de pacte',
          supernatural_metabolism: 'Métabolisme surnaturel',
          innate_sorcery: 'Sorcellerie innée',
        };

        const key = String(resource);
        const displayKey = key.replace('used_', '');
        const resourceName = resourceNames[displayKey] || displayKey;
        const isUsed = key.startsWith('used_');
        const previous = (classResources as any)?.[resource];
        const action =
          isUsed && typeof previous === 'number' && typeof value === 'number'
            ? value > previous
              ? 'utilisé'
              : 'récupéré'
            : 'mis à jour';

        if (isUsed && typeof previous === 'number' && typeof value === 'number') {
          const diff = Math.abs((value as number) - (previous as number));
          toast.success(`${diff} ${resourceName} ${action}`);
        } else {
          toast.success(`${resourceName} ${action}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour des ressources:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  }
}

export default ClassesTab;
export { ClassesTab };