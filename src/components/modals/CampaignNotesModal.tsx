import React from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Player } from '../../types/dnd';
import toast from 'react-hot-toast';

type NotesPayload = {
  journal: string;
  npcs: string;
  quests: string;
  updated_at?: string;
};

export function CampaignNotesModal({
  open,
  onClose,
  player,
}: {
  open: boolean;
  onClose: () => void;
  player: Player;
}) {
  const [journal, setJournal] = React.useState('');
  const [npcs, setNpcs] = React.useState('');
  const [quests, setQuests] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const LS_KEY = React.useMemo(() => `campaign_notes_${player.id}`, [player.id]);

  const loadNotes = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('notes_json')
        .eq('id', player.id)
        .single();

      if (!error && data?.notes_json) {
        const { journal = '', npcs = '', quests = '' } = (data.notes_json as NotesPayload) || {};
        setJournal(journal);
        setNpcs(npcs);
        setQuests(quests);
        return;
      }
    } catch {
      // fallback local
    }

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as NotesPayload;
        setJournal(parsed.journal || '');
        setNpcs(parsed.npcs || '');
        setQuests(parsed.quests || '');
      } else {
        setJournal('');
        setNpcs('');
        setQuests('');
      }
    } catch {
      setJournal('');
      setNpcs('');
      setQuests('');
    }
  }, [LS_KEY, player.id]);

  React.useEffect(() => {
    if (open) loadNotes();
  }, [open, loadNotes]);

  const saveNotes = async () => {
    if (saving) return;
    setSaving(true);
    const payload: NotesPayload = {
      journal,
      npcs,
      quests,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('players')
        .update({ notes_json: payload })
        .eq('id', player.id);

      if (error) throw error;
      toast.success('Notes sauvegardées');
    } catch {
      // Fallback localStorage
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(payload));
        toast.success('Notes sauvegardées (localement)');
      } catch {
        toast.error('Impossible de sauvegarder les notes');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[13000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(42rem,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Prise de notes</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">Journal de campagne</label>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              rows={6}
              placeholder="Écrivez ici le résumé des sessions, éléments marquants, récaps..."
            />
          </div>

          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">PNJ rencontrés</label>
            <textarea
              value={npcs}
              onChange={(e) => setNpcs(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              rows={5}
              placeholder="Listez les PNJ, rôles, lieux, liens, indices..."
            />
          </div>

          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">Quêtes et objectifs</label>
            <textarea
              value={quests}
              onChange={(e) => setQuests(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              rows={5}
              placeholder="Quêtes en cours, objectifs du groupe, pistes à suivre..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary px-5 py-2 rounded-lg">Fermer</button>
          <button onClick={saveNotes} disabled={saving} className="btn-primary px-5 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Check size={16} />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampaignNotesModal;