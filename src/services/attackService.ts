import { supabase } from '../lib/supabase';
import { Attack } from '../types/dnd';

/**
 * Service pour gérer les requêtes liées aux attaques
 */
export const attackService = {
  async getPlayerAttacks(playerId: string): Promise<Attack[]> {
    try {
      const { data, error } = await supabase
        .from('attacks')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Attack[];
    } catch (error) {
      console.error('[attackService] Erreur lors de la récupération des attaques:', error);
      return [];
    }
  },

  async addAttack(attack: Partial<Attack>): Promise<Attack | null> {
    try {
      if (!attack.player_id || !attack.name) {
        console.error('[attackService] Données invalides: player_id et name sont requis');
        return null;
      }

      const attackData = {
        player_id: attack.player_id,
        name: attack.name,
        damage_dice: attack.damage_dice || '1d6',
        damage_type: attack.damage_type || 'Tranchant',
        range: attack.range || 'Corps à corps',
        properties: attack.properties || '',
        manual_attack_bonus: attack.manual_attack_bonus ?? null,
        manual_damage_bonus: attack.manual_damage_bonus ?? null,
        // ✅ AJOUT : persist weapon_bonus
        weapon_bonus: attack.weapon_bonus ?? null,
        expertise: attack.expertise ?? false,
        attack_type: attack.attack_type || 'physical',
        spell_level: attack.spell_level ?? null,
        ammo_count: attack.ammo_count ?? 0,
        ammo_type: attack.ammo_type ?? null,
        override_ability: attack.override_ability ?? null
      };

      const { data, error } = await supabase
        .from('attacks')
        .insert([attackData])
        .select()
        .single();

      if (error) {
        console.error('[attackService] Erreur Supabase lors de l\'ajout:', error);
        throw error;
      }

      console.log('[attackService] ✅ Attaque créée avec succès:', data?.name);
      return data as Attack;
    } catch (error) {
      console.error('[attackService] Erreur lors de l\'ajout de l\'attaque:', error);
      return null;
    }
  },

  async updateAttack(attack: Partial<Attack> & { id: string }): Promise<Attack | null> {
    try {
      if (!attack.id) {
        console.error('[attackService] ID manquant pour la mise à jour');
        return null;
      }

      const { id, ...updateData } = attack;

      // Inclure weapon_bonus s'il est fourni explicitement (préserver les autres champs)
      const finalUpdateData = {
        ...updateData,
        ...(attack.weapon_bonus !== undefined && { weapon_bonus: attack.weapon_bonus }),
        ...(attack.override_ability !== undefined && { override_ability: attack.override_ability })
      };

      const { data, error } = await supabase
        .from('attacks')
        .update(finalUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[attackService] Erreur Supabase lors de la mise à jour:', error);
        throw error;
      }

      console.log('[attackService] ✅ Attaque mise à jour avec succès:', data?.name);
      return data as Attack;
    } catch (error) {
      console.error('[attackService] Erreur lors de la mise à jour de l\'attaque:', error);
      return null;
    }
  },

  async removeAttack(attackId: string): Promise<boolean> {
    try {
      if (!attackId) {
        console.error('[attackService] ID manquant pour la suppression');
        return false;
      }

      const { error } = await supabase
        .from('attacks')
        .delete()
        .eq('id', attackId);

      if (error) {
        console.error('[attackService] Erreur Supabase lors de la suppression:', error);
        throw error;
      }

      console.log('[attackService] ✅ Attaque supprimée avec succès');
      return true;
    } catch (error) {
      console.error('[attackService] Erreur lors de la suppression de l\'attaque:', error);
      return false;
    }
  },

  async getAttackById(attackId: string): Promise<Attack | null> {
    try {
      const { data, error } = await supabase
        .from('attacks')
        .select('*')
        .eq('id', attackId)
        .single();

      if (error) throw error;
      return data as Attack;
    } catch (error) {
      console.error('[attackService] Erreur lors de la récupération de l\'attaque:', error);
      return null;
    }
  },

  async duplicateAttack(attackId: string, newName?: string): Promise<Attack | null> {
    try {
      const original = await this.getAttackById(attackId);
      if (!original) {
        console.error('[attackService] Attaque originale non trouvée');
        return null;
      }

      const duplicate: Partial<Attack> = {
        player_id: original.player_id,
        name: newName || `${original.name} (copie)`,
        damage_dice: original.damage_dice,
        damage_type: original.damage_type,
        range: original.range,
        properties: original.properties,
        manual_attack_bonus: original.manual_attack_bonus,
        manual_damage_bonus: original.manual_damage_bonus,
        // ✅ AJOUT : copier weapon_bonus
        weapon_bonus: original.weapon_bonus ?? null,
        expertise: original.expertise,
        attack_type: original.attack_type,
        spell_level: original.spell_level,
        ammo_count: 0,
        ammo_type: original.ammo_type,
        override_ability: original.override_ability
      };

      return await this.addAttack(duplicate);
    } catch (error) {
      console.error('[attackService] Erreur lors de la duplication de l\'attaque:', error);
      return null;
    }
  }
};