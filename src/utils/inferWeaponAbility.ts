// Inférence de caractéristique STR/DEX pour une attaque basée sur ses propriétés, sa portée et son type
// Règles FR:
// - Ranged => DEX
// - Melee + (Finesse | Légère | Lancer | Polyvalente) => meilleur de STR/DEX
// - Melee sinon => STR
// override_ability est gérée dans l'appelant (CombatTab)

export interface AbilityLike {
  name: string;        // 'Force' | 'Dextérité' | ...
  modifier: number;    // mod associé
}

// Signature souple pour ne pas coupler aux types locaux
export function inferWeaponAbilityMod(attack: any, playerAbilities: AbilityLike[]): number {
  const normalize = (s?: string | null) => (s || '').toLowerCase();

  const hasProp = (props: string | null | undefined, keyword: string) => {
    const p = normalize(props);
    return p.includes(keyword.toLowerCase());
  };

  const isMeleeRangeLabel = (range?: string | null) => {
    const r = normalize(range);
    // Mêlée: "corps à corps", "contact" et reach 1,5 m / 3 m
    return r.includes('corps à corps') || r.includes('contact') || r.includes('1,5') || r.includes('3 m');
  };

const strMod = typeof playerAbilities === 'object' && playerAbilities !== null && 'strength' in playerAbilities
  ? Math.floor(((playerAbilities.strength as number) - 10) / 2)
  : 0;
  
const dexMod = typeof playerAbilities === 'object' && playerAbilities !== null && 'dexterity' in playerAbilities
  ? Math.floor(((playerAbilities.dexterity as number) - 10) / 2)
  : 0;

  // 1) Drapeaux depuis propriétés/catégorie/nom
  const props = attack?.properties as string | undefined | null;
  const category = normalize((attack as any)?.category || '');
  const nameLower = normalize((attack as any)?.name || '');

  const thrown = hasProp(props, 'lancer') || hasProp(props, 'jet') || category.includes('lancer');
  const hasMunitions = hasProp(props, 'munitions') || category.includes('munitions');
  const hasChargement = hasProp(props, 'chargement') || category.includes('chargement');

  // 2) Détection ranged
  const ammoType = (attack as any)?.ammo_type as string | undefined;
  const rangedByProps = !!ammoType || hasMunitions || hasChargement || nameLower.includes('arc') || nameLower.includes('arbalète');
  // Si la portée n'est pas un libellé mêlée ET que ce n'est pas une arme "de lancer", on considère distance
  const rangedByLabel = !isMeleeRangeLabel(attack?.range) && !thrown;

  const isRanged = rangedByProps || rangedByLabel;

  if (isRanged) {
    return dexMod;
  }

  // 3) Mêlée: choisir la meilleure stat si propriétés suivantes
  const finesse = hasProp(props, 'finesse') || category.includes('finesse');
  const light = hasProp(props, 'légère') || category.includes('légère');
  const versatile = hasProp(props, 'polyvalente') || category.includes('polyvalente');

  if (finesse || light || thrown || versatile) {
    return Math.max(strMod, dexMod);
  }

  // 4) Par défaut en mêlée: STR
  return strMod;
}