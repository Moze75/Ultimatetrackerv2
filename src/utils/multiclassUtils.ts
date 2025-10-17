import type { DndClass, Player } from '../types/dnd';

export function getPrimaryAbilityForClass(dndClass: DndClass): string[] {
  switch (dndClass) {
    case 'Barbare':
      return ['Force'];
    case 'Barde':
      return ['Charisme'];
    case 'Clerc':
      return ['Sagesse'];
    case 'Druide':
      return ['Sagesse'];
    case 'Ensorceleur':
      return ['Charisme'];
    case 'Guerrier':
      return ['Force', 'Dextérité'];
    case 'Magicien':
      return ['Intelligence'];
    case 'Moine':
      return ['Dextérité', 'Sagesse'];
    case 'Paladin':
      return ['Force', 'Charisme'];
    case 'Rôdeur':
      return ['Dextérité', 'Sagesse'];
    case 'Roublard':
      return ['Dextérité'];
    case 'Occultiste':
      return ['Charisme'];
    default:
      return [];
  }
}

const getModifier = (score: number): number => Math.floor((score - 10) / 2);

function getAbilityScoreFromPlayer(player: Player, abilityName: string): number {
  const abilities: any = (player as any)?.abilities;

  if (Array.isArray(abilities)) {
    const found = abilities.find((a: any) =>
      a?.name?.toLowerCase() === abilityName.toLowerCase()
    );
    if (found) {
      if (typeof found.score === 'number') return found.score;
    }
  } else if (abilities && typeof abilities === 'object') {
    const direct = abilities[abilityName] ?? abilities[abilityName.toLowerCase()];
    if (typeof direct === 'number') return direct;
    if (direct && typeof direct === 'object' && typeof direct.score === 'number') {
      return direct.score;
    }
  }

  return 10;
}

export function validateMulticlassPrerequisites(
  player: Player,
  newClass: DndClass
): { valid: boolean; message: string } {
  if (!player.class) {
    return {
      valid: false,
      message: 'Le personnage doit avoir une classe principale avant de multiclasser.'
    };
  }

  const primaryClassAbilities = getPrimaryAbilityForClass(player.class);
  const newClassAbilities = getPrimaryAbilityForClass(newClass);

  const missingAbilities: string[] = [];

  for (const ability of primaryClassAbilities) {
    const score = getAbilityScoreFromPlayer(player, ability);
    if (score < 13) {
      missingAbilities.push(`${ability} ${score}/13 (classe actuelle)`);
    }
  }

  for (const ability of newClassAbilities) {
    const score = getAbilityScoreFromPlayer(player, ability);
    if (score < 13) {
      missingAbilities.push(`${ability} ${score}/13 (nouvelle classe)`);
    }
  }

  if (missingAbilities.length > 0) {
    return {
      valid: false,
      message: `⚠️ Prérequis non remplis: ${missingAbilities.join(', ')}. Vous pouvez continuer mais c'est contre les règles D&D 5e.`
    };
  }

  return {
    valid: true,
    message: 'Tous les prérequis sont remplis.'
  };
}

export function getTotalLevel(player: Player): number {
  const primaryLevel = player.level || 0;
  const secondaryLevel = player.secondary_level || 0;
  return primaryLevel + secondaryLevel;
}

export function getHitDieForClass(dndClass: DndClass): number {
  switch (dndClass) {
    case 'Barbare':
      return 12;
    case 'Guerrier':
    case 'Paladin':
    case 'Rôdeur':
      return 10;
    case 'Barde':
    case 'Clerc':
    case 'Druide':
    case 'Moine':
    case 'Roublard':
    case 'Occultiste':
      return 8;
    case 'Magicien':
    case 'Ensorceleur':
      return 6;
    default:
      return 8;
  }
}

export function formatHitDiceDisplay(
  hitDiceByType: Record<string, { total: number; used: number }>
): string {
  if (!hitDiceByType || Object.keys(hitDiceByType).length === 0) {
    return '0';
  }

  const parts: string[] = [];
  const sortedTypes = Object.keys(hitDiceByType).sort((a, b) => {
    const aNum = parseInt(a.replace('d', ''));
    const bNum = parseInt(b.replace('d', ''));
    return bNum - aNum;
  });

  for (const diceType of sortedTypes) {
    const { total, used } = hitDiceByType[diceType];
    const remaining = Math.max(0, total - used);
    parts.push(`${remaining}${diceType}`);
  }

  return parts.join(' + ');
}

export function getProficiencyBonusForPlayer(player: Player): number {
  const totalLevel = getTotalLevel(player);
  if (totalLevel >= 17) return 6;
  if (totalLevel >= 13) return 5;
  if (totalLevel >= 9) return 4;
  if (totalLevel >= 5) return 3;
  return 2;
}