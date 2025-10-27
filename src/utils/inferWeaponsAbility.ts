// Inférence de mod de caractéristique STR/DEX depuis propriétés/portée.
// - Ranged => DEX
// - Melee + (Finesse | Légère | Lancer | Polyvalente) => max(STR, DEX)
// - Melee sinon => STR
export interface AbilityLike {
  name: string;     // 'Force' | 'Dextérité' | ...
  modifier: number; // mod associé
}

export function inferWeaponAbilityMod(attack: any, playerAbilities: AbilityLike[]): number {
  const normalize = (s?: string | null) => (s || '').toLowerCase();

  const hasProp = (props: string | null | undefined, keyword: string) => {
    const p = normalize(props);
    return p.includes(keyword.toLowerCase());
  };

  const isMeleeRangeLabel = (range?: string | null) => {
    const r = normalize(range);
    // "corps à corps", "contact" et "1,5 m" => considérés comme mêlée
    return r.includes('corps à corps') || r.includes('contact') || r.includes('1,5');
  };

  const strMod = playerAbilities?.find(a => a.name === 'Force')?.modifier || 0;
  const dexMod = playerAbilities?.find(a => a.name === 'Dextérité')?.modifier || 0;

  // Ranged si ammo_type présent OU si label de portée non mêlée
  const ammoType = (attack as any)?.ammo_type as string | undefined;
  const rangedByAmmo = !!ammoType;
  const meleeByLabel = isMeleeRangeLabel(attack?.range);
  const isRanged = rangedByAmmo || !meleeByLabel;

  if (isRanged) return dexMod;

  // Mêlée: activer DEX possible si certaines propriétés
  const props = attack?.properties as string | undefined | null;
  const category = normalize((attack as any)?.category || '');

  const finesse = hasProp(props, 'finesse') || category.includes('finesse');
  const light = hasProp(props, 'légère') || category.includes('légère');
  const thrown = hasProp(props, 'lancer') || hasProp(props, 'jet') || category.includes('lancer');
  const versatile = hasProp(props, 'polyvalente') || category.includes('polyvalente');

  if (finesse || light || thrown || versatile) {
    return Math.max(strMod, dexMod);
  }

  return strMod;
}