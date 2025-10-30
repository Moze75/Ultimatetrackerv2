import { supabase } from '../lib/supabase';
import { InventoryItem, Player } from '../types/dnd';

const META_PREFIX = '#meta:';

// 🆕 NOUVEAU
interface StatBonuses {
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
}

interface ItemMeta {
  type: 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool' | 'other';
  quantity?: number;
  equipped?: boolean;
  weapon?: {
    damageDice: string;
    damageType: 'Tranchant' | 'Perforant' | 'Contondant';
    properties: string;
    range: string;
  };
  armor?: {
    base: number;
    addDex: boolean;
    dexCap?: number | null;
    label: string;
  };
  shield?: {
    bonus: number;
  };
  // 🆕 NOUVEAU
  statBonuses?: StatBonuses;
}

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try {
    return JSON.parse(metaLine.slice(META_PREFIX.length));
  } catch {
    return null;
  }
}

function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}

function injectMetaIntoDescription(desc: string, meta: ItemMeta): string {
  const metaLine = `${META_PREFIX}${JSON.stringify(meta)}`;
  return desc ? `${desc}\n${metaLine}` : metaLine;
}

// Service pour gérer les requêtes liées à l'inventaire
export const inventoryService = {
  // Récupérer l'inventaire d'un joueur
  async getPlayerInventory(playerId: string): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('player_id', playerId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'inventaire:', error);
      return [];
    }
  },

  // Ajouter un objet à l'inventaire
  async addItem(item: Partial<InventoryItem>): Promise<InventoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'objet:', error);
      return null;
    }
  },

  // Supprimer un objet de l'inventaire
  async removeItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'objet:', error);
      return false;
    }
  },

  // Équiper un item (armure ou bouclier)
  async equipItem(
    playerId: string,
    item: InventoryItem,
    player: Player,
    type: 'armor' | 'shield'
  ): Promise<boolean> {
    try {
      console.log(`[inventoryService.equipItem] Tentative d'équipement de ${type}: ${item.name}`);
      console.log('[inventoryService.equipItem] Item description:', item.description);

      const meta = parseMeta(item.description);
      console.log('[inventoryService.equipItem] Meta parsé:', meta);

      if (!meta || meta.type !== type) {
        console.error(`[inventoryService.equipItem] ERREUR: Item ${item.name} n'est pas de type ${type}. Meta type trouvé:`, meta?.type);
        return false;
      }

      // 1. Déséquiper les autres items du même type
      const inventory = await this.getPlayerInventory(playerId);
      for (const invItem of inventory) {
        const invMeta = parseMeta(invItem.description);
        if (invItem.id !== item.id && invMeta?.type === type && invMeta.equipped) {
          const updatedMeta = { ...invMeta, equipped: false };
          const updatedDesc = injectMetaIntoDescription(visibleDescription(invItem.description), updatedMeta);
          await supabase
            .from('inventory_items')
            .update({ description: updatedDesc })
            .eq('id', invItem.id);
        }
      }

      // 2. Marquer l'item comme équipé dans inventory_items
      const updatedMeta = { ...meta, equipped: true };
      const updatedDesc = injectMetaIntoDescription(visibleDescription(item.description), updatedMeta);
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ description: updatedDesc })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // 3. Mettre à jour player.equipment
      const equipmentUpdate: any = { ...player.equipment };

      if (type === 'armor' && meta.armor) {
        equipmentUpdate.armor = {
          name: item.name,
          description: visibleDescription(item.description),
          inventory_item_id: item.id,
          armor_formula: {
            base: meta.armor.base,
            addDex: meta.armor.addDex,
            dexCap: meta.armor.dexCap ?? null,
            label: meta.armor.label
          },
          shield_bonus: null,
          weapon_meta: null,
        };
      } else if (type === 'shield' && meta.shield) {
        equipmentUpdate.shield = {
          name: item.name,
          description: visibleDescription(item.description),
          inventory_item_id: item.id,
          shield_bonus: meta.shield.bonus,
          armor_formula: null,
          weapon_meta: null,
        };
      }

      const { error: equipError } = await supabase
        .from('players')
        .update({ equipment: equipmentUpdate })
        .eq('id', playerId);

          if (equipError) throw equipError;

      console.log(`[inventoryService] ${type} ${item.name} équipé avec succès`);
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'équipement du ${type}:`, error);
      return false;
    }
  },

  // 🆕 NOUVEAU : Équiper un objet avec bonus de stats (jewelry/other)
  async equipStatItem(
    playerId: string,
    item: InventoryItem,
    player: Player
  ): Promise<boolean> {
    try {
      console.log(`[inventoryService.equipStatItem] Équipement de l'objet avec bonus: ${item.name}`);

      const meta = parseMeta(item.description);
      console.log('[inventoryService.equipStatItem] Meta parsé:', meta);

      if (!meta || !meta.statBonuses || Object.keys(meta.statBonuses).length === 0) {
        console.error(`[inventoryService.equipStatItem] ERREUR: Item ${item.name} n'a pas de bonus de stats`);
        return false;
      }

      // 1. Marquer l'item comme équipé dans inventory_items
      const updatedMeta = { ...meta, equipped: true };
      const updatedDesc = injectMetaIntoDescription(visibleDescription(item.description), updatedMeta);
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ description: updatedDesc })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // 2. Mettre à jour les caractéristiques du joueur
      const newAbilities = { ...player.abilities };
      
      if (meta.statBonuses.strength) {
        newAbilities.strength = (newAbilities.strength || 10) + meta.statBonuses.strength;
      }
      if (meta.statBonuses.dexterity) {
        newAbilities.dexterity = (newAbilities.dexterity || 10) + meta.statBonuses.dexterity;
      }
      if (meta.statBonuses.constitution) {
        newAbilities.constitution = (newAbilities.constitution || 10) + meta.statBonuses.constitution;
      }
      if (meta.statBonuses.intelligence) {
        newAbilities.intelligence = (newAbilities.intelligence || 10) + meta.statBonuses.intelligence;
      }
      if (meta.statBonuses.wisdom) {
        newAbilities.wisdom = (newAbilities.wisdom || 10) + meta.statBonuses.wisdom;
      }
      if (meta.statBonuses.charisma) {
        newAbilities.charisma = (newAbilities.charisma || 10) + meta.statBonuses.charisma;
      }

      const { error: playerError } = await supabase
        .from('players')
        .update({ abilities: newAbilities })
        .eq('id', playerId);

      if (playerError) throw playerError;

      console.log(`[inventoryService] Objet ${item.name} équipé avec bonus de stats appliqués`);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'équipement de l\'objet avec bonus:', error);
      return false;
    }
  },

  // 🆕 NOUVEAU : Déséquiper un objet avec bonus de stats
  async unequipStatItem(
    playerId: string,
    item: InventoryItem,
    player: Player
  ): Promise<boolean> {
    try {
      console.log(`[inventoryService.unequipStatItem] Déséquipement de l'objet: ${item.name}`);

      const meta = parseMeta(item.description);
      if (!meta || !meta.statBonuses) {
        return false;
      }

      // 1. Marquer l'item comme déséquipé
      const updatedMeta = { ...meta, equipped: false };
      const updatedDesc = injectMetaIntoDescription(visibleDescription(item.description), updatedMeta);
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ description: updatedDesc })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // 2. Retirer les bonus des caractéristiques
      const newAbilities = { ...player.abilities };
      
      if (meta.statBonuses.strength) {
        newAbilities.strength = (newAbilities.strength || 10) - meta.statBonuses.strength;
      }
      if (meta.statBonuses.dexterity) {
        newAbilities.dexterity = (newAbilities.dexterity || 10) - meta.statBonuses.dexterity;
      }
      if (meta.statBonuses.constitution) {
        newAbilities.constitution = (newAbilities.constitution || 10) - meta.statBonuses.constitution;
      }
      if (meta.statBonuses.intelligence) {
        newAbilities.intelligence = (newAbilities.intelligence || 10) - meta.statBonuses.intelligence;
      }
      if (meta.statBonuses.wisdom) {
        newAbilities.wisdom = (newAbilities.wisdom || 10) - meta.statBonuses.wisdom;
      }
      if (meta.statBonuses.charisma) {
        newAbilities.charisma = (newAbilities.charisma || 10) - meta.statBonuses.charisma;
      }

      const { error: playerError } = await supabase
        .from('players')
        .update({ abilities: newAbilities })
        .eq('id', playerId);

      if (playerError) throw playerError;

      console.log(`[inventoryService] Objet ${item.name} déséquipé et bonus retirés`);
      return true;
    } catch (error) {
      console.error('Erreur lors du déséquipement de l\'objet:', error);
      return false;
    }
  }
};