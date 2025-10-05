import type { Player, SpellSlots } from '../types/dnd';

export interface ArcaneRecoveryInfo {
  maxRecoverable: number;
  alreadyUsed: number;
  remaining: number;
  canRecover: boolean;
}

export function getArcaneRecoveryInfo(player: Player): ArcaneRecoveryInfo {
  const level = player.level || 1;
  const maxRecoverable = Math.floor(level / 2);
  const alreadyUsed = player.class_resources?.arcane_recovery_slots_used || 0;
  const remaining = Math.max(0, maxRecoverable - alreadyUsed);
  const hasUsedAbility = player.class_resources?.used_arcane_recovery || false;

  return {
    maxRecoverable,
    alreadyUsed,
    remaining,
    canRecover: !hasUsedAbility && remaining > 0,
  };
}

export function canRecoverSlot(
  player: Player,
  slotLevel: number,
  currentUsed: number
): { canRecover: boolean; reason?: string } {
  if (player.class !== 'Magicien') {
    return { canRecover: false, reason: 'Seuls les magiciens peuvent utiliser la Récupération Arcanique' };
  }

  const info = getArcaneRecoveryInfo(player);

  if (!info.canRecover) {
    if (player.class_resources?.used_arcane_recovery) {
      return { canRecover: false, reason: 'Récupération Arcanique déjà utilisée (repos court requis)' };
    }
    return { canRecover: false, reason: 'Limite de récupération atteinte' };
  }

  if (currentUsed <= 0) {
    return { canRecover: false, reason: 'Aucun emplacement utilisé à ce niveau' };
  }

  if (slotLevel > info.remaining) {
    return {
      canRecover: false,
      reason: `Niveau trop élevé (reste ${info.remaining} niveau${info.remaining > 1 ? 'x' : ''} récupérable${info.remaining > 1 ? 's' : ''})`
    };
  }

  return { canRecover: true };
}

export function calculateNewSlots(
  currentSlots: SpellSlots,
  slotLevel: number
): SpellSlots {
  const usedKey = `used${slotLevel}` as keyof SpellSlots;
  const currentUsed = (currentSlots[usedKey] as number) || 0;

  return {
    ...currentSlots,
    [usedKey]: Math.max(0, currentUsed - 1),
  };
}

export function updateArcaneRecoveryUsage(
  player: Player,
  slotLevel: number
): {
  class_resources: typeof player.class_resources;
  spell_slots: typeof player.spell_slots;
} {
  const currentUsed = player.class_resources?.arcane_recovery_slots_used || 0;
  const newUsed = currentUsed + slotLevel;
  const info = getArcaneRecoveryInfo(player);

  const shouldMarkAsUsed = (newUsed >= info.maxRecoverable);

  return {
    class_resources: {
      ...player.class_resources,
      arcane_recovery_slots_used: newUsed,
      used_arcane_recovery: shouldMarkAsUsed,
    },
    spell_slots: calculateNewSlots(player.spell_slots || {}, slotLevel),
  };
}
