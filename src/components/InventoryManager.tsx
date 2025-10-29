import React from 'react';
import { Player } from '../types/dnd';
import { ShoppingBag, Plus, Trash2, Edit2 } from 'lucide-react';

interface InventoryManagerProps {
  player: Player;
  inventory: any[];
  onInventoryUpdate: (items: any[]) => void;
  onPlayerUpdate?: (player: Player) => void;
}

export function InventoryManager({ 
  player, 
  inventory, 
  onInventoryUpdate,
  onPlayerUpdate 
}: InventoryManagerProps) {
  // TODO: Extraire la logique de gestion d'inventaire depuis EquipmentTab
  // Pour l'instant, placeholder simple
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold">Inventaire</h3>
        </div>
        <button className="btn-primary px-3 py-1 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {inventory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucun objet dans le sac</p>
          </div>
        ) : (
          inventory.map((item, i) => (
            <div 
              key={i} 
              className="stat-card p-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
            >
              <div>
                <div className="font-medium text-white">{item.name || 'Objet'}</div>
                {item.description && (
                  <div className="text-sm text-gray-400">{item.description}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.quantity && (
                  <span className="text-sm text-gray-300">×{item.quantity}</span>
                )}
                <button className="text-gray-400 hover:text-blue-400 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}