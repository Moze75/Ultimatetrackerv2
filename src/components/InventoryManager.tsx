import React, { useState, useMemo } from 'react';
import { Backpack, Search, Trash2, X, Filter as FilterIcon } from 'lucide-react';
import { Player, InventoryItem } from '../types/dnd';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const META_PREFIX = '#meta:';

type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool' | 'other';

interface ItemMeta {
  type: MetaType;
  quantity?: number;
  equipped?: boolean;
  [key: string]: any;
}

const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();

const smartCapitalize = (name: string): string => {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const parseMeta = (description: string | null | undefined): ItemMeta | null => {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try {
    return JSON.parse(metaLine.slice(META_PREFIX.length));
  } catch {
    return null;
  }
};

const visibleDescription = (desc: string | null | undefined) => {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
};

interface InventoryManagerProps {
  player: Player;
  inventory: InventoryItem[];
  onInventoryUpdate: (inventory: InventoryItem[]) => void;
  onPlayerUpdate?: (player: Player) => void;
}

export function InventoryManager({ player, inventory, onInventoryUpdate }: InventoryManagerProps) {
  const [bagFilter, setBagFilter] = useState('');
  const [bagKinds, setBagKinds] = useState<Record<MetaType, boolean>>({
    armor: true,
    shield: true,
    weapon: true,
    equipment: true,
    potion: true,
    jewelry: true,
    tool: true,
    other: true
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Filtrer seulement equipment et other (= contenu du sac)
  const bagItems = useMemo(() => {
    return inventory.filter(item => {
      const meta = parseMeta(item.description);
      return meta?.type === 'equipment' || meta?.type === 'other';
    });
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const q = bagFilter.trim().toLowerCase();
    return bagItems.filter(i => {
      const meta = parseMeta(i.description);
      const kind: MetaType = (meta?.type || 'equipment') as MetaType;
      if (!bagKinds[kind]) return false;
      if (!q) return true;
      const name = stripPriceParentheses(i.name).toLowerCase();
      const desc = visibleDescription(i.description).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [bagItems, bagFilter, bagKinds]);

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      {/* En-tête avec compteur */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Backpack className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-100">
            Contenu du sac ({bagItems.length} {bagItems.length > 1 ? 'objets' : 'objet'})
          </h3>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFiltersOpen(true)}
          className="px-3 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2"
        >
          <FilterIcon size={16} /> Filtres
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={bagFilter}
            onChange={(e) => setBagFilter(e.target.value)}
            placeholder="Rechercher dans le sac..."
            className="input-dark px-3 py-2 rounded-md w-full"
          />
        </div>
      </div>

      {/* Liste des items */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Backpack className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>
              {bagItems.length === 0 
                ? 'Sac vide' 
                : 'Aucun objet ne correspond aux filtres'}
            </p>
          </div>
        ) : (
          filteredInventory.map(item => {
            const meta = parseMeta(item.description);
            const qty = meta?.quantity ?? 1;
            const isEquipment = meta?.type === 'equipment';

            return (
              <div key={item.id} className="bg-gray-800/40 border border-gray-700/40 rounded-md hover:bg-gray-800/60 transition-colors">
                <div className="flex items-start justify-between p-3">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="text-left text-gray-100 font-medium hover:underline break-words"
                      >
                        {smartCapitalize(item.name)}
                      </button>
                      {qty > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">
                          ×{qty}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isEquipment 
                          ? 'bg-gray-800/60 text-gray-300' 
                          : 'bg-slate-900/30 text-slate-300'
                      }`}>
                        {isEquipment ? 'Équipement' : 'Autre'}
                      </span>
                    </div>

                    {expanded[item.id] && (
                      <div className="mt-2 text-sm text-gray-300 whitespace-pre-wrap">
                        {visibleDescription(item.description) || 'Aucune description'}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (!window.confirm(`Supprimer "${smartCapitalize(item.name)}" du sac ?`)) return;
                      (async () => {
                        try {
                          const { error } = await supabase
                            .from('inventory_items')
                            .delete()
                            .eq('id', item.id);
                          if (error) throw error;
                          onInventoryUpdate(inventory.filter(i => i.id !== item.id));
                          toast.success('Objet supprimé du sac');
                        } catch (e) {
                          console.error(e);
                          toast.error('Erreur lors de la suppression');
                        }
                      })();
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
                    title="Supprimer du sac"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Filtres (simplifié pour equipment/other uniquement) */}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-[11000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFiltersOpen(false);
          }}
        >
          <div className="fixed inset-0 bg-black/60" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(22rem,92vw)] bg-gray-900/95 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-gray-100 font-semibold">Filtres du sac</h4>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"
                aria-label="Fermer"
              >
                <X />
              </button>
            </div>
            <div className="space-y-1">
              <label className="flex items-center justify-between text-sm text-gray-200 px-2 py-1 rounded hover:bg-gray-800/60 cursor-pointer">
                <span>Équipements</span>
                <input
                  type="checkbox"
                  className="accent-purple-500"
                  checked={bagKinds.equipment}
                  onChange={() => setBagKinds(prev => ({ ...prev, equipment: !prev.equipment }))}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-gray-200 px-2 py-1 rounded hover:bg-gray-800/60 cursor-pointer">
                <span>Autres</span>
                <input
                  type="checkbox"
                  className="accent-purple-500"
                  checked={bagKinds.other}
                  onChange={() => setBagKinds(prev => ({ ...prev, other: !prev.other }))}
                />
              </label>
            </div>
            <div className="mt-3 text-right">
              <button onClick={() => setFiltersOpen(false)} className="btn-primary px-3 py-2 rounded-lg">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}