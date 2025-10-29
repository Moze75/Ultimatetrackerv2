import React, { useState } from 'react';
import { Player } from '../types/dnd';
import { Heart, Shield, Sparkles, Plus, Minus } from 'lucide-react';

interface HPManagerProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

export function HPManager({ player, onUpdate }: HPManagerProps) {
  const [hpChange, setHpChange] = useState<string>('');
  const [tempHpChange, setTempHpChange] = useState<string>('');

  const currentHp = player.currentHitPoints || 0;
  const maxHp = player.hitPoints || 0;
  const tempHp = player.temporaryHitPoints || 0;

  const handleHpChange = (amount: number) => {
    const newHp = Math.max(0, Math.min(maxHp, currentHp + amount));
    onUpdate({ ...player, currentHitPoints: newHp });
    setHpChange('');
  };

  const handleTempHpChange = (amount: number) => {
    const newTempHp = Math.max(0, tempHp + amount);
    onUpdate({ ...player, temporaryHitPoints: newTempHp });
    setTempHpChange('');
  };

  const hpPercentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  const hpColor = hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      {/* Points de vie */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold">Points de vie</h3>
        </div>

        {/* Barre de PV */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-white">
              {currentHp} / {maxHp}
            </span>
            <span className="text-sm text-gray-400">{Math.round(hpPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className={`${hpColor} h-full transition-all duration-300 rounded-full`}
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* Contrôles rapides */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-2">
            <input
              type="number"
              value={hpChange}
              onChange={(e) => setHpChange(e.target.value)}
              placeholder="±PV"
              className="input-dark flex-1 text-center"
            />
            <button
              onClick={() => handleHpChange(Number(hpChange) || 0)}
              className="btn-primary px-3"
              disabled={!hpChange}
            >
              OK
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleHpChange(1)}
              className="btn-secondary flex-1 flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> 1
            </button>
            <button
              onClick={() => handleHpChange(-1)}
              className="btn-secondary flex-1 flex items-center justify-center gap-1"
            >
              <Minus className="w-4 h-4" /> 1
            </button>
          </div>
        </div>

        {/* Boutons de soins rapides */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => handleHpChange(5)}
            className="btn-secondary text-sm py-2"
          >
            +5
          </button>
          <button
            onClick={() => handleHpChange(10)}
            className="btn-secondary text-sm py-2"
          >
            +10
          </button>
          <button
            onClick={() => onUpdate({ ...player, currentHitPoints: maxHp })}
            className="btn-primary text-sm py-2"
          >
            Max
          </button>
        </div>
      </div>

      {/* PV temporaires */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">PV Temporaires</h3>
        </div>

        <div className="text-2xl font-bold text-blue-400 mb-3">
          {tempHp}
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            value={tempHpChange}
            onChange={(e) => setTempHpChange(e.target.value)}
            placeholder="Ajouter"
            className="input-dark flex-1"
          />
          <button
            onClick={() => handleTempHpChange(Number(tempHpChange) || 0)}
            className="btn-primary px-3"
            disabled={!tempHpChange}
          >
            OK
          </button>
          <button
            onClick={() => onUpdate({ ...player, temporaryHitPoints: 0 })}
            className="btn-secondary px-3"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Dés de vie */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Dés de vie</h3>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400 mb-2">
            {player.hitDice || '1d8'}
          </div>
          <button className="btn-primary w-full">
            Lancer dé de vie
          </button>
        </div>
      </div>
    </div>
  );
}