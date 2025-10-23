import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';

import ProgressBar, { stopWizardMusic } from './ui/ProgressBar';
import RaceSelection from './steps/RaceSelection';
import ClassSelection from './steps/ClassSelection';
import SpellSelection from './steps/SpellSelection';
import BackgroundSelection from './steps/BackgroundSelection';
import ProfileSelection from './steps/ProfileSelection';
import AbilityScores from './steps/AbilityScores';
import CharacterSummary from './steps/CharacterSummary';

import { DndClass } from '../types/character';
import type { CharacterExportPayload } from '../types/CharacterExport';
import { supabase } from '../../../lib/supabase';
import { calculateArmorClass, calculateHitPoints, calculateModifier } from '../utils/dndCalculations';

import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';
import { enrichEquipmentList, determineAutoEquip } from '../../../services/equipmentLookupService';
import { appContextService } from '../../../services/appContextService';

/* ===========================================================
   Utilitaires
   =========================================================== */

// Convertit ft -> m en arrondissant au 0,5 m (30 ft → 9 m)
const feetToMeters = (ft?: number) => {
  const n = Number(ft);
  if (!Number.isFinite(n)) return 9;
  return Math.round(n * 0.3048 * 2) / 2;
};

// Mappe une classe vers une image publique placée dans /public/*.png
function getClassImageUrlLocal(className: DndClass | string | undefined | null): string | null {
  if (!className) return null;
  switch (className) {
    case 'Guerrier': return '/Guerrier.png';
    case 'Magicien': return '/Magicien.png';
    case 'Roublard': return '/Voleur.png';
    case 'Clerc': return '/Clerc.png';
    case 'Rôdeur': return '/Rodeur.png';
    case 'Barbare': return '/Barbare.png';
    case 'Barde': return '/Barde.png';
    case 'Druide': return '/Druide.png';
    case 'Moine': return '/Moine.png';
    case 'Paladin': return '/Paladin.png';
    case 'Ensorceleur': return '/Ensorceleur.png';
    case 'Occultiste': return '/Occultiste.png';
    default:
      return null;
  }
}

// Normalise le don d'historique pour coller à la liste attendue par l'app
function normalizeBackgroundFeat(feat?: string | null): string | undefined {
  if (!feat) return undefined;
  const trimmed = feat.trim();
  if (trimmed.toLowerCase().startsWith('initié à la magie')) {
    return 'Initié à la magie';
  }
  return trimmed;
}

// Parse l'or ("X po") dans la liste d'items d'équipement
function parseGoldFromItems(items?: string[]): number | undefined {
  if (!Array.isArray(items)) return undefined;
  let total = 0;
  for (const it of items) {
    const m = String(it).match(/(\d+)\s*po\b/i);
    if (m) total += parseInt(m[1], 10);
  }
  return total > 0 ? total : undefined;
}

// Tente d'uploader une image dans le bucket Supabase "avatars"
async function tryUploadAvatarFromUrl(playerId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    const contentType = blob.type || 'image/png';
    const ext = (() => {
      const t = contentType.split('/')[1]?.toLowerCase();
      if (t === 'jpeg') return 'jpg';
      return t || 'png';
    })();

    const fileName = `class-${Date.now()}.${ext}`;
    const filePath = `${playerId}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true, contentType });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl || null;
  } catch (e) {
    console.warn('Upload avatar depuis URL impossible:', e);
    return null;
  }
}

// Notifie le parent qu'un personnage a été créé
type CreatedEvent = {
  type: 'creator:character_created';
  payload: { playerId: string; player?: any };
};

const notifyParentCreated = (playerId: string, player?: any) => {
  const msg: CreatedEvent = { type: 'creator:character_created', payload: { playerId, player } };
  try { window.parent?.postMessage(msg, '*'); } catch {}
  try { (window as any).opener?.postMessage(msg, '*'); } catch {}
  try { window.postMessage(msg, '*'); } catch {}
};

/* ===========================================================
   Étapes
   =========================================================== */

const steps = ['Race', 'Classe', 'Sorts', 'Historique', 'Profil', 'Caractéristiques', 'Résumé'];

interface WizardProps {
  onFinish?: (payload: CharacterExportPayload) => void;
  onCancel?: () => void;
  initialSnapshot?: any;
}

export default function CharacterCreationWizard({ onFinish, onCancel, initialSnapshot }: WizardProps) {
  // ✅ PHASE 1: Restauration automatique depuis localStorage
  // Cette restauration se fait AVANT tous les useState pour garantir la disponibilité
  const restoredSnapshot = useMemo(() => {
    // Priorité: prop initialSnapshot, sinon localStorage
    const snapshot = initialSnapshot || appContextService.getWizardSnapshot();
    
    if (snapshot) {
      console.log('[Wizard] 🔄 RESTAURATION AUTOMATIQUE depuis:', initialSnapshot ? 'props' : 'localStorage', {
        step: snapshot.currentStep,
        race: snapshot.selectedRace,
        class: snapshot.selectedClass,
        cantrips: snapshot.selectedCantrips?.length || 0,
        level1Spells: snapshot.selectedLevel1Spells?.length || 0,
        equipment: snapshot.selectedEquipmentOption,
        backgroundEquipment: snapshot.backgroundEquipmentOption,
        skills: snapshot.selectedClassSkills?.length || 0,
      });
    } else {
      console.log('[Wizard] ℹ️ Aucun snapshot à restaurer, démarrage nouveau wizard');
    }
    
    return snapshot;
  }, []); // ⚠️ CRITIQUE: [] vide pour n'exécuter qu'UNE SEULE FOIS au montage

  // ✅ PHASE 2: Flag de protection contre les resets
  const [isRestoringFromSnapshot, setIsRestoringFromSnapshot] = useState(!!restoredSnapshot);
  const hasRestoredRef = useRef(false);

  // ✅ Initialiser TOUS les états depuis restoredSnapshot
  const [currentStep, setCurrentStep] = useState(restoredSnapshot?.currentStep ?? 0);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [characterName, setCharacterName] = useState(restoredSnapshot?.characterName ?? '');
  const [selectedRace, setSelectedRace] = useState(restoredSnapshot?.selectedRace ?? '');
  const [selectedClass, setSelectedClass] = useState<DndClass | ''>(restoredSnapshot?.selectedClass ?? '');
  const [selectedBackground, setSelectedBackground] = useState(restoredSnapshot?.selectedBackground ?? '');
  const [backgroundEquipmentOption, setBackgroundEquipmentOption] = useState<'A' | 'B' | ''>(restoredSnapshot?.backgroundEquipmentOption ?? '');
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>(restoredSnapshot?.selectedClassSkills ?? []);
  const [selectedEquipmentOption, setSelectedEquipmentOption] = useState<string>(restoredSnapshot?.selectedEquipmentOption ?? '');
  const [selectedCantrips, setSelectedCantrips] = useState<any[]>(restoredSnapshot?.selectedCantrips ?? []);
  const [selectedLevel1Spells, setSelectedLevel1Spells] = useState<any[]>(restoredSnapshot?.selectedLevel1Spells ?? []);
  const [selectedAlignment, setSelectedAlignment] = useState(restoredSnapshot?.selectedAlignment ?? '');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(restoredSnapshot?.selectedLanguages ?? []);
  const [age, setAge] = useState(restoredSnapshot?.age ?? '');
  const [gender, setGender] = useState(restoredSnapshot?.gender ?? '');
  const [characterHistory, setCharacterHistory] = useState(restoredSnapshot?.characterHistory ?? '');
  const [abilities, setAbilities] = useState<Record<string, number>>(restoredSnapshot?.abilities ?? {
    'Force': 8,
    'Dextérité': 8,
    'Constitution': 8,
    'Intelligence': 8,
    'Sagesse': 8,
    'Charisme': 8,
  });
  const [effectiveAbilities, setEffectiveAbilities] = useState<Record<string, number>>(
    restoredSnapshot?.effectiveAbilities ?? restoredSnapshot?.abilities ?? {
      'Force': 8,
      'Dextérité': 8,
      'Constitution': 8,
      'Intelligence': 8,
      'Sagesse': 8,
      'Charisme': 8,
    }
  );

  // ✅ États pour l'indicateur de sauvegarde
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Objet d'historique sélectionné
  const selectedBackgroundObj = useMemo(
    () => backgrounds.find((b) => b.name === selectedBackground) || null,
    [selectedBackground]
  );

  // ✅ PHASE 3: Validation de la restauration
  useEffect(() => {
    if (restoredSnapshot && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      
      console.log('[Wizard] ✅ VALIDATION de la restauration:', {
        step: currentStep,
        race: selectedRace,
        class: selectedClass,
        cantrips: selectedCantrips.length,
        level1Spells: selectedLevel1Spells.length,
        classSkills: selectedClassSkills.length,
        equipment: selectedEquipmentOption,
        backgroundEquipment: backgroundEquipmentOption,
      });

      // Désactiver le flag de restauration après 500ms pour permettre les resets futurs
      setTimeout(() => {
        setIsRestoringFromSnapshot(false);
        console.log('[Wizard] 🔓 Protection contre les resets désactivée');
      }, 500);
    }
  }, [restoredSnapshot]);

  // ✅ PHASE 2 (suite): Resets PROTÉGÉS contre l'écrasement lors de la restauration
  useEffect(() => {
    // ⚠️ NE PAS reset si on est en train de restaurer depuis un snapshot
// ✅ FIX 2 : Référence pour éviter les resets intempestifs après restauration
const selectedClassRef = useRef<DndClass | ''>(restoredSnapshot?.selectedClass ?? '');

useEffect(() => {
  // ⚠️ NE PAS reset si on est en train de restaurer depuis un snapshot
  if (isRestoringFromSnapshot) {
    console.log('[Wizard] 🛡️ RESET ÉVITÉ pendant la restauration (selectedClass)');
    selectedClassRef.current = selectedClass;
    return;
  }

  // ⚠️ NE PAS reset si la classe n'a PAS VRAIMENT changé (évite les faux positifs)
  if (selectedClassRef.current === selectedClass) {
    console.log('[Wizard] ℹ️ Classe identique, pas de reset nécessaire');
    return;
  }

  // ✅ Reset normal uniquement lors d'un changement MANUEL de classe
  console.log('[Wizard] 🔄 Reset des sélections suite au changement de classe:', selectedClassRef.current, '->', selectedClass);
  setSelectedClassSkills([]);
  setSelectedEquipmentOption('');
  setSelectedCantrips([]);
  setSelectedLevel1Spells([]);
  
  selectedClassRef.current = selectedClass;
}, [selectedClass, isRestoringFromSnapshot]);

  useEffect(() => {
    // ⚠️ NE PAS reset si on est en train de restaurer
    if (isRestoringFromSnapshot) {
      console.log('[Wizard] 🛡️ RESET ÉVITÉ pendant la restauration (selectedBackground)');
      return;
    }

    console.log('[Wizard] 🔄 Reset de l\'équipement d\'historique suite au changement:', selectedBackground);
    setBackgroundEquipmentOption('');
  }, [selectedBackground, isRestoringFromSnapshot]);

  // ✅ Fonction de sauvegarde centralisée avec indicateur visuel
  const saveSnapshot = useCallback(() => {
    const snapshot = {
      currentStep,
      characterName,
      selectedRace,
      selectedClass,
      selectedBackground,
      selectedAlignment,
      selectedLanguages,
      age,
      gender,
      characterHistory,
      backgroundEquipmentOption,
      selectedClassSkills,
      selectedEquipmentOption,
      selectedCantrips,
      selectedLevel1Spells,
      abilities,
      effectiveAbilities,
    };

    setIsSaving(true);
    appContextService.saveWizardSnapshot(snapshot);
    setLastSaved(new Date());
    
    console.log('[Wizard] 💾 Snapshot sauvegardé:', {
      step: currentStep,
      cantrips: selectedCantrips.length,
      level1Spells: selectedLevel1Spells.length,
      equipment: selectedEquipmentOption,
      backgroundEquipment: backgroundEquipmentOption,
      skills: selectedClassSkills.length,
    });

    // Animation de confirmation
    setTimeout(() => setIsSaving(false), 500);
  }, [
    currentStep,
    characterName,
    selectedRace,
    selectedClass,
    selectedBackground,
    selectedAlignment,
    selectedLanguages,
    age,
    gender,
    characterHistory,
    backgroundEquipmentOption,
    selectedClassSkills,
    selectedEquipmentOption,
    selectedCantrips,
    selectedLevel1Spells,
    abilities,
    effectiveAbilities,
  ]);

  // ✅ Hook de debounce personnalisé pour les champs de texte
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      saveSnapshot();
    }, 1500); // 1.5 secondes après la dernière frappe
  }, [saveSnapshot]);

  // ✅ Nettoyage du timeout au démontage
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // ✅ Sauvegarde IMMÉDIATE pour les choix critiques (step, race, classe, sorts, équipement)
  useEffect(() => {
    // Ne pas sauvegarder pendant la restauration initiale
    if (isRestoringFromSnapshot && !hasRestoredRef.current) {
      return;
    }
    saveSnapshot();
  }, [
    currentStep,
    selectedRace,
    selectedClass,
    selectedBackground,
    backgroundEquipmentOption,
    selectedClassSkills,
    selectedEquipmentOption,
    selectedCantrips,
    selectedLevel1Spells,
  ]);

  // ✅ Sauvegarde AVEC DEBOUNCE pour les champs de texte et abilities
  useEffect(() => {
    if (isRestoringFromSnapshot && !hasRestoredRef.current) {
      return;
    }
    debouncedSave();
  }, [
    characterName,
    age,
    gender,
    characterHistory,
    selectedAlignment,
    selectedLanguages,
    abilities,
    effectiveAbilities,
  ]);

  // Classes qui ne lancent pas de sorts au niveau 1
  const nonCasterClasses: DndClass[] = ['Guerrier', 'Roublard', 'Barbare', 'Moine'];
  const isNonCaster = selectedClass && nonCasterClasses.includes(selectedClass as DndClass);

  // Navigation
  const nextStep = () => {
    const next = currentStep + 1;
    if (next === 2 && isNonCaster) {
      setCurrentStep(3);
    } else {
      setCurrentStep(Math.min(next, steps.length - 1));
    }
  };

  const previousStep = () => {
    const prev = currentStep - 1;
    if (prev === 2 && isNonCaster) {
      setCurrentStep(1);
    } else {
      setCurrentStep(Math.max(prev, 0));
    }
  };

  // ✅ PHASE 4: Finalisation avec protection et fallback
  const handleFinish = async () => {
    try {
      stopWizardMusic();

      // ✅ PROTECTION: Récupérer le snapshot le plus récent au cas où
      const latestSnapshot = appContextService.getWizardSnapshot();

      // ✅ Utiliser les données de l'état SAUF si vides, alors utiliser le snapshot
      const finalCantrips = selectedCantrips.length > 0 
        ? selectedCantrips 
        : (latestSnapshot?.selectedCantrips ?? []);
      
      const finalLevel1Spells = selectedLevel1Spells.length > 0 
        ? selectedLevel1Spells 
        : (latestSnapshot?.selectedLevel1Spells ?? []);

      const finalEquipmentOption = selectedEquipmentOption || latestSnapshot?.selectedEquipmentOption || '';
      const finalBackgroundEquipment = backgroundEquipmentOption || latestSnapshot?.backgroundEquipmentOption || '';
      const finalClassSkills = selectedClassSkills.length > 0 
        ? selectedClassSkills 
        : (latestSnapshot?.selectedClassSkills ?? []);

      console.log('[Wizard] 🛡️ PROTECTION EXPORT - Comparaison état vs snapshot:', {
        cantrips: {
          fromState: selectedCantrips.length,
          fromSnapshot: latestSnapshot?.selectedCantrips?.length ?? 0,
          final: finalCantrips.length,
        },
        level1Spells: {
          fromState: selectedLevel1Spells.length,
          fromSnapshot: latestSnapshot?.selectedLevel1Spells?.length ?? 0,
          final: finalLevel1Spells.length,
        },
        equipment: {
          fromState: selectedEquipmentOption,
          fromSnapshot: latestSnapshot?.selectedEquipmentOption,
          final: finalEquipmentOption,
        },
        backgroundEquipment: {
          fromState: backgroundEquipmentOption,
          fromSnapshot: latestSnapshot?.backgroundEquipmentOption,
          final: finalBackgroundEquipment,
        },
        skills: {
          fromState: selectedClassSkills.length,
          fromSnapshot: latestSnapshot?.selectedClassSkills?.length ?? 0,
          final: finalClassSkills.length,
        },
      });

      const raceData = races.find((r) => r.name === selectedRace);
      const classData = classes.find((c) => c.name === selectedClass);

      // Abilities finales
      const finalAbilities = { ...effectiveAbilities };
      if (raceData?.abilityScoreIncrease) {
        Object.entries(raceData.abilityScoreIncrease).forEach(([ability, bonus]) => {
          if (finalAbilities[ability] != null) {
            finalAbilities[ability] += bonus;
          }
        });
      }

      // Dérivés de combat
      const hitPoints = calculateHitPoints(finalAbilities['Constitution'] || 10, selectedClass as DndClass);
      const armorClass = calculateArmorClass(finalAbilities['Dextérité'] || 10);
      const initiative = calculateModifier(finalAbilities['Dextérité'] || 10);
      const speedFeet = raceData?.speed || 30;

      // ✅ Utiliser finalEquipmentOption au lieu de selectedEquipmentOption
      const classEquipment = finalEquipmentOption && classData?.equipmentOptions
        ? classData.equipmentOptions.find(opt => opt.label === finalEquipmentOption)?.items || []
        : classData?.equipment || [];

      // ✅ Utiliser finalBackgroundEquipment
      const bgEquip =
        finalBackgroundEquipment === 'A'
          ? selectedBackgroundObj?.equipmentOptions?.optionA ?? []
          : finalBackgroundEquipment === 'B'
            ? selectedBackgroundObj?.equipmentOptions?.optionB ?? []
            : [];

      console.log('[Wizard] 🎒 Équipement récupéré:', {
        classEquipment: classEquipment.length,
        classEquipmentItems: classEquipment,
        bgEquip: bgEquip.length,
        bgEquipItems: bgEquip,
      });

      // Compétences maîtrisées - ✅ Utiliser finalClassSkills
      const backgroundSkills = selectedBackgroundObj?.skillProficiencies ?? [];
      const proficientSkills = Array.from(new Set([...finalClassSkills, ...backgroundSkills]));

      // Équipement combiné
      const equipment = [...classEquipment, ...bgEquip];

      // Don d'historique
      const backgroundFeat = normalizeBackgroundFeat(selectedBackgroundObj?.feat);

      // Or initial
      const goldFromClassEquipment = parseGoldFromItems(classEquipment);
      const goldFromA = parseGoldFromItems(selectedBackgroundObj?.equipmentOptions?.optionA);
      const goldFromB = parseGoldFromItems(selectedBackgroundObj?.equipmentOptions?.optionB);
      
      const backgroundGold = finalBackgroundEquipment === 'A'
        ? goldFromA
        : finalBackgroundEquipment === 'B'
        ? goldFromB
        : undefined;

      const gold = (goldFromClassEquipment || 0) + (backgroundGold || 0);

      // Image de classe
      const avatarImageUrl = getClassImageUrlLocal(selectedClass) ?? undefined;

      // Combiner les langues raciales et sélectionnées
      const racialLanguages = raceData?.languages || [];
      const allLanguages = Array.from(new Set([...racialLanguages, ...selectedLanguages]));

      // MODE INTÉGRÉ
      if (typeof onFinish === 'function') {
        setLoadingEquipment(true);

        let equipmentDetails;
        try {
          const enriched = await enrichEquipmentList(equipment);
          equipmentDetails = determineAutoEquip(enriched);
        } catch (error) {
          console.error('Erreur lors de l\'enrichissement des équipements:', error);
          toast.error('Impossible de charger les équipements. Création sans équipement.');
          equipmentDetails = [];
        } finally {
          setLoadingEquipment(false);
        }

        const payload: CharacterExportPayload = {
          characterName: characterName.trim() || 'Héros sans nom',
          selectedRace: selectedRace || '',
          selectedClass: (selectedClass as string) || '',
          selectedBackground: selectedBackground || '',
          level: 1,
          finalAbilities,
          proficientSkills,
          equipment,
          selectedBackgroundEquipmentOption: finalBackgroundEquipment || '',
          selectedEquipmentOption: finalEquipmentOption || '',
          hitPoints,
          armorClass,
          initiative,
          speed: speedFeet,
          backgroundFeat,
          gold: gold > 0 ? gold : undefined,
          weaponProficiencies: classData?.weaponProficiencies || [],
          equipmentDetails,
          armorProficiencies: classData?.armorProficiencies || [],
          toolProficiencies: classData?.toolProficiencies || [],
          racialTraits: raceData?.traits || [],
          classFeatures: classData?.features || [],
          backgroundFeature: selectedBackgroundObj?.feature || '',
          savingThrows: classData?.savingThrows || [],
          languages: allLanguages,
          hitDice: {
            die: (selectedClass === 'Magicien' || selectedClass === 'Ensorceleur') ? 'd6'
               : (selectedClass === 'Barde' || selectedClass === 'Clerc' || selectedClass === 'Druide' || selectedClass === 'Moine' || selectedClass === 'Rôdeur' || selectedClass === 'Roublard' || selectedClass === 'Occultiste') ? 'd8'
               : (selectedClass === 'Guerrier' || selectedClass === 'Paladin') ? 'd10'
               : 'd12',
            total: 1,
            used: 0,
          },
          avatarImageUrl,
          selectedCantrips: finalCantrips, // ✅ Utiliser finalCantrips
          selectedLevel1Spells: finalLevel1Spells, // ✅ Utiliser finalLevel1Spells
          selectedAlignment: selectedAlignment || undefined,
          selectedLanguages: allLanguages,
          age: age.trim() || undefined,
          gender: gender.trim() || undefined,
          characterHistory: characterHistory.trim() || undefined,
        };

        console.log('[Wizard] 📦 PAYLOAD FINAL:', {
          spells: {
            cantrips: payload.selectedCantrips.length,
            cantripsDetails: payload.selectedCantrips.map(s => s.name),
            level1: payload.selectedLevel1Spells.length,
            level1Details: payload.selectedLevel1Spells.map(s => s.name),
          },
          equipment: {
            total: payload.equipment.length,
            items: payload.equipment,
            details: payload.equipmentDetails?.length || 0,
          },
          skills: payload.proficientSkills,
        });

        // ✅ Nettoyer le snapshot et marquer le contexte "game"
        appContextService.clearWizardSnapshot();
        appContextService.setContext('game');
        console.log('[Wizard] ✅ Snapshot nettoyé, contexte = game');

        onFinish(payload);
        return;
      }

      // FALLBACK AUTONOME
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = auth?.user;
      if (!user) {
        toast.error('Vous devez être connecté pour créer un personnage');
        return;
      }

      const featsData: any = {};
      if (backgroundFeat) {
        featsData.origins = [backgroundFeat];
        featsData.origin = backgroundFeat;
      }

      const initialGold = gold > 0 ? gold : 0;

      const characterData: any = {
        user_id: user.id,
        name: characterName.trim(),
        adventurer_name: characterName.trim(),
        level: 1,
        current_hp: hitPoints,
        max_hp: hitPoints,
        class: selectedClass || null,
        subclass: null,
        race: selectedRace || null,
        background: selectedBackground || null,
        alignment: selectedAlignment || null,
        languages: allLanguages,
        age: age.trim() || null,
        gender: gender.trim() || null,
        character_history: characterHistory.trim() || null,
        stats: {
          armor_class: armorClass,
          initiative: initiative,
          speed: feetToMeters(speedFeet),
          proficiency_bonus: 2,
          inspirations: 0,
          feats: featsData,
          coins: { gp: initialGold, sp: 0, cp: 0 },
          gold: initialGold,
          creator_meta: {
            class_skills: finalClassSkills,
            class_equipment_option: finalEquipmentOption || null,
            class_equipment_items: classEquipment,
            background_skillProficiencies: backgroundSkills,
            background_equipment_option: finalBackgroundEquipment || null,
            background_equipment_items: bgEquip,
            weapon_proficiencies: classData?.weaponProficiencies || [],
            armor_proficiencies: classData?.armorProficiencies || [],
            tool_proficiencies: classData?.toolProficiencies || [],
          },
        },
        abilities: null,
        gold: initialGold,
        silver: 0,
        copper: 0,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from('players')
        .insert([characterData])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating character:', error);
        toast.error('Erreur lors de la création du personnage');
        return;
      }

      // ✅ Save spells to Supabase - Utiliser finalCantrips et finalLevel1Spells
      if (inserted?.id && (finalCantrips.length > 0 || finalLevel1Spells.length > 0)) {
        try {
          const allSpells = [...finalCantrips, ...finalLevel1Spells];
          console.log(`[Wizard] 🔮 Sauvegarde de ${allSpells.length} sorts pour le personnage ${inserted.id}:`, 
            allSpells.map(s => s.name));

          const spellsToInsert = allSpells.map(spell => ({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            school: spell.school,
            casting_time: spell.casting_time,
            range: spell.range,
            components: spell.components,
            duration: spell.duration,
            description: spell.description,
            higher_levels: spell.higher_levels || null,
          }));

          await supabase.from('spells').upsert(spellsToInsert, {
            onConflict: 'id',
            ignoreDuplicates: true
          });

          const playerSpellsLinks = allSpells.map(spell => ({
            player_id: inserted.id,
            spell_id: spell.id,
            is_prepared: true,
          }));

          await supabase.from('player_spells').upsert(playerSpellsLinks, {
            onConflict: 'player_id,spell_id',
            ignoreDuplicates: true,
          });

          console.log(`[Wizard] ✅ ${allSpells.length} sorts sauvegardés avec succès`);
        } catch (spellErr) {
          console.error('[Wizard] ❌ Erreur lors de la sauvegarde des sorts:', spellErr);
        }
      } else {
        console.log('[Wizard] ℹ️ Aucun sort à sauvegarder');
      }

      // Upload avatar
      let finalPlayer = inserted;
      if (inserted?.id && avatarImageUrl) {
        try {
          const uploaded = await tryUploadAvatarFromUrl(inserted.id, avatarImageUrl);
          const finalUrl = uploaded ?? avatarImageUrl;

          const { data: updatedPlayer, error: avatarErr } = await supabase
            .from('players')
            .update({ avatar_url: finalUrl })
            .eq('id', inserted.id)
            .select('*')
            .single();

          if (!avatarErr && updatedPlayer) {
            finalPlayer = updatedPlayer;
          }
        } catch (e) {
          console.warn('Echec avatar:', e);
        }
      }

      if (inserted?.id) {
        notifyParentCreated(inserted.id, finalPlayer);
      }

      // ✅ Nettoyer le snapshot après création réussie
      appContextService.clearWizardSnapshot();
      appContextService.setContext('game');

      toast.success('Personnage créé avec succès !');

      if (typeof onCancel === 'function') {
        onCancel();
        return;
      }

      // Reset
      setCurrentStep(0);
      setCharacterName('');
      setSelectedRace('');
      setSelectedClass('');
      setSelectedBackground('');
      setBackgroundEquipmentOption('');
      setSelectedClassSkills([]);
      setSelectedEquipmentOption('');
      setSelectedCantrips([]);
      setSelectedLevel1Spells([]);
      setSelectedAlignment('');
      setSelectedLanguages([]);
      setAge('');
      setGender('');
      setCharacterHistory('');
      setAbilities({
        'Force': 8,
        'Dextérité': 8,
        'Constitution': 8,
        'Intelligence': 8,
        'Sagesse': 8,
        'Charisme': 8,
      });
      setEffectiveAbilities({
        'Force': 8,
        'Dextérité': 8,
        'Constitution': 8,
        'Intelligence': 8,
        'Sagesse': 8,
        'Charisme': 8,
      });
    } catch (err) {
      console.error('Error creating character:', err);
      toast.error('Erreur lors de la création du personnage');
    }
  };

  // Rendu des étapes
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <RaceSelection
            selectedRace={selectedRace}
            onRaceSelect={setSelectedRace}
            onNext={nextStep}
          />
        );

      case 1:
        return (
          <ClassSelection
            selectedClass={selectedClass}
            onClassSelect={setSelectedClass}
            selectedSkills={selectedClassSkills}
            onSelectedSkillsChange={setSelectedClassSkills}
            selectedEquipmentOption={selectedEquipmentOption}
            onSelectedEquipmentOptionChange={setSelectedEquipmentOption}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 2:
        return (
          <SpellSelection
            selectedClass={selectedClass}
            selectedCantrips={selectedCantrips}
            selectedLevel1Spells={selectedLevel1Spells}
            onCantripsChange={setSelectedCantrips}
            onLevel1SpellsChange={setSelectedLevel1Spells}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 3:
        return (
          <BackgroundSelection
            selectedBackground={selectedBackground}
            onBackgroundSelect={setSelectedBackground}
            selectedEquipmentOption={backgroundEquipmentOption}
            onEquipmentOptionChange={setBackgroundEquipmentOption}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 4:
        return (
          <ProfileSelection
            selectedLanguages={selectedLanguages}
            onLanguagesChange={setSelectedLanguages}
            selectedAlignment={selectedAlignment}
            onAlignmentChange={setSelectedAlignment}
            characterHistory={characterHistory}
            onCharacterHistoryChange={setCharacterHistory}
            age={age}
            onAgeChange={setAge}
            gender={gender}
            onGenderChange={setGender}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 5:
        return (
          <AbilityScores
            abilities={abilities}
            onAbilitiesChange={setAbilities}
            selectedBackground={selectedBackgroundObj}
            onEffectiveAbilitiesChange={setEffectiveAbilities}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 6:
        return (
          <CharacterSummary
            characterName={characterName}
            onCharacterNameChange={setCharacterName}
            selectedRace={selectedRace}
            selectedClass={selectedClass as DndClass}
            selectedBackground={selectedBackground}
            abilities={effectiveAbilities}
            selectedClassSkills={selectedClassSkills}
            selectedBackgroundEquipmentOption={backgroundEquipmentOption}
            selectedEquipmentOption={selectedEquipmentOption}
            selectedCantrips={selectedCantrips}
            selectedLevel1Spells={selectedLevel1Spells}
            selectedAlignment={selectedAlignment}
            selectedLanguages={selectedLanguages}
            age={age}
            gender={gender}
            onFinish={handleFinish}
            onPrevious={previousStep}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-fantasy relative">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-gray-800 text-white border border-gray-700',
          duration: 4000,
        }}
      />

      {/* ✅ Badge de sauvegarde automatique amélioré */}
      <div className="fixed bottom-4 left-4 z-50">
        {isSaving ? (
          <div className="text-xs text-blue-400 bg-gray-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-500/50 flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
            <span>💾 Sauvegarde...</span>
          </div>
        ) : lastSaved ? (
          <div className="text-xs text-green-400 bg-gray-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-green-500/50 flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>✓ Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        ) : (
          <div className="text-xs text-gray-400 bg-gray-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-700/50 flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span>Sauvegarde auto</span>
          </div>
        )}
      </div>

      {loadingEquipment && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
            <img 
              src="/icons/wmremove-transformed.png" 
              alt="Chargement..." 
              className="animate-spin h-12 w-12 mx-auto mb-4 object-contain"
              style={{ backgroundColor: 'transparent' }}
            />
            <p className="text-gray-200">Préparation de l'équipement...</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 pt-0 pb-8">
        <div className="max-w-6xl mx-auto">
          <ProgressBar
            currentStep={currentStep}
            totalSteps={steps.length - 1}
            steps={steps}
          />

          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 md:p-8">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}