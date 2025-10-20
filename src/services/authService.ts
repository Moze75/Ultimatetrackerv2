import { supabase } from '../lib/supabase';

export const authService = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  // ✅ Inscription avec confirmation d'email obligatoire
  async signUp(email: string, password: string) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://d-d-ultimate-tracker-7ni7.bolt.host',
        // L'utilisateur devra confirmer son email avant de pouvoir se connecter
      }
    });
  },

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Vérifier si l'email est confirmé
    if (!error && data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        data: null,
        error: {
          message: 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception et le dossier spam.',
          name: 'EmailNotConfirmed'
        }
      };
    }
    
    return { data, error };
  },

  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://d-d-ultimate-tracker-7ni7.bolt.host',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }
};