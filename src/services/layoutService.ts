import { supabase } from '../lib/supabase';
import { LayoutPreferences, DEFAULT_LAYOUT } from '../types/layout';

export const layoutService = {
  async getLayout(userId: string): Promise<LayoutPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_layout_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as LayoutPreferences;
    } catch (error) {
      console.error('Erreur lors de la récupération du layout:', error);
      return null;
    }
  },

async saveLayout(userId: string, layouts: any, isLocked: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_layout_preferences')
      .upsert({
        user_id: userId,
        layouts,
        is_locked: isLocked,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'  // ← AJOUT : spécifie la colonne de conflit
      });

    if (error) throw error;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du layout:', error);
    throw error;
  }
},

  async resetLayout(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_layout_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du layout:', error);
      throw error;
    }
  },
};