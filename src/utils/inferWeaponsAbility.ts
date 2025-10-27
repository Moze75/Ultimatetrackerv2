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
    // "corps à corps", "contact", "1,5 m" => considérés comme mêlée
    return r.includes('corps à corps') || r.includes('contact') || r.includes('1,5');
  };

  const strMod = playerAbilities?.find(a => a.name === 'Force')?.modifier || 0;
  const dexMod = playerAbilities?.find(a => a.name === 'Dextérité')?.modifier || 0;

  // 1) Ranged si munition (ammo_type) OU si libellé de portée non mêlée
  const ammoType = (attack as any)?.ammo_type as string | undefined;
  const rangedByAmmo = !!ammoType;
  const meleeByLabel = isMeleeRangeLabel(attack?.range);
  const isRanged = rangedByAmmo || !meleeByLabel;

  if (isRanged) return dexMod;

  // 2) Mêlée: flags depuis properties/category
  const props = attack?.properties as string | undefined | null;
  const category = normalize((attack as any)?.category); // si un jour présent

  const finesse = hasProp(props, 'finesse') || category.includes('finesse');
  const light = hasProp(props, 'légère') || category.includes('légère');
  const thrown = hasProp(props, 'lancer') || hasProp(props, 'jet') || category.includes('lancer');
  const versatile = hasProp(props, 'polyvalente') || category.includes('polyvalente');

  if (finesse || light || thrown || versatile) {
    return Math.max(strMod, dexMod);
  }

  // 3) Par défaut en mêlée: STR
  return strMod;
}