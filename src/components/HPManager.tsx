import React, { useState } from 'react';
import { Heart, Shield, Sword } from 'lucide-react';
import { Player } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import './combat-tab.css';

interface HPManagerProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

export function HPManager({ player, onUpdate }: HPManagerProps) {
  const [damageValue, setDamageValue] = useState('');
  const [healValue, setHealValue] = useState('');
  const [tempHpValue, setTempHpValue] = useState('');

  const totalHP = player.current_hp + player.temporary_hp;
  const isCriticalHealth = totalHP <= Math.floor(player.max_hp * 0.20);

  const getWoundLevel = () => {
    const percentage = (totalHP / player.max_hp) * 100;
    if (totalHP <= 0) return 'Mort';
    if (percentage >= 1 && percentage <= 30) return 'Blessures critiques';
    if (percentage > 30 && percentage <= 60) return 'Blessures importantes';
    if (percentage > 60 && percentage <= 75) return 'Blessures';
    if (percentage > 75 && percentage <= 90) return 'Blessures légères';
    if (percentage > 90 && percentage <= 99) return 'Égratignures';
    return 'En pleine forme';
  };

  const getWoundColor = () => {
    const percentage = (totalHP / player.max_hp) * 100;
    if (totalHP <= 0) return 'text-black';
    if (percentage >= 1 && percentage <= 30) return 'text-red-600';
    if (percentage > 30 && percentage <= 60) return 'text-red-500';
    if (percentage > 60 && percentage <= 75) return 'text-orange-500';
    if (percentage > 75 && percentage <= 90) return 'text-yellow-500';
    if (percentage > 90 && percentage <= 99) return 'text-yellow-400';
    return 'text-green-500';
  };

  const getHPBarColor = () => {
    const percentage = (player.current_hp / player.max_hp) * 100;
    if (totalHP <= 0) return 'from-black to-gray-800';
    if (percentage >= 1 && percentage <= 30) return 'from-red-600 to-red-700';
    if (percentage > 30 && percentage <= 60) return 'from-red-500 to-red-600';
    if (percentage > 60 && percentage <= 75) return 'from-orange-500 to-red-500';
    if (percentage > 75 && percentage <= 90) return 'from-yellow-500 to-orange-500';
    if (percentage > 90 && percentage <= 99) return 'from-yellow-400 to-yellow-500';
    return 'from-green-500 to-green-600';
  };

  const updateHP = async (newCurrentHP: number, newTempHP?: number) => {
    const clampedHP = Math.max(0, Math.min(player.max_hp, newCurrentHP));
    const clampedTempHP = Math.max(0, newTempHP ?? player.temporary_hp);

    try {
      const updateData: any = { current_hp: clampedHP };
      if (newTempHP !== undefined) updateData.temporary_hp = clampedTempHP;

      const { error } = await supabase.from('players').update(updateData).eq('id', player.id);
      if (error) throw error;

      onUpdate({ ...player, current_hp: clampedHP, temporary_hp: clampedTempHP });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des PV:', error);
      toast.error('Erreur lors de la mise à jour des PV');
    }
  };

  const applyDamage = async () => {
    const damage = parseInt(damageValue) || 0;
    if (damage <= 0) return;

    let newCurrentHP = player.current_hp;
    let newTempHP = player.temporary_hp;

    if (newTempHP > 0) {
      if (damage >= newTempHP) {
        const remainingDamage = damage - newTempHP;
        newTempHP = 0;
        newCurrentHP = Math.max(0, newCurrentHP - remainingDamage);
      } else {
        newTempHP = newTempHP - damage;
      }
    } else {
      newCurrentHP = Math.max(0, newCurrentHP - damage);
    }

    await updateHP(newCurrentHP, newTempHP);
    setDamageValue('');

    const hpElement = document.querySelector('.hp-bar');
    if (hpElement) {
      hpElement.classList.add('damage-animation');
      setTimeout(() => hpElement.classList.remove('damage-animation'), 600);
    }

    toast.success(`${damage} dégâts appliqués`);
  };

  const applyHealing = async () => {
    const healing = parseInt(healValue) || 0;
    if (healing <= 0) return;

    const newCurrentHP = Math.min(player.max_hp, player.current_hp + healing);
    await updateHP(newCurrentHP);
    setHealValue('');

    const hpElement = document.querySelector('.hp-bar');
    if (hpElement) {
      hpElement.classList.add('heal-animation');
      setTimeout(() => hpElement.classList.remove('heal-animation'), 600);
    }

    toast.success(`${healing} PV récupérés`);
  };

  const applyTempHP = async () => {
    const tempHP = parseInt(tempHpValue) || 0;
    if (tempHP <= 0) return;

    const newTempHP = Math.max(player.temporary_hp, tempHP);
    await updateHP(player.current_hp, newTempHP);
    setTempHpValue('');

    toast.success(`${newTempHP} PV temporaires appliqués`);
  };

  return (
    <div className="stat-card">
      <div className="stat-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Points de vie</h3>
            <p className={`text-sm font-medium ${getWoundColor()}`}>{getWoundLevel()}</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none select-none">
              <span className="text-white font-bold text-sm drop-shadow-lg">
                {totalHP} / {player.max_hp}
              </span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden relative">
              <div
                className={`hp-bar hp-bar-main h-full transition-all duration-500 bg-gradient-to-r ${getHPBarColor()} ${
                  isCriticalHealth ? 'heartbeat-animation' : ''
                }`}
                style={{ width: `${Math.min(100, (player.current_hp / player.max_hp) * 100)}%` }}
              />
              {player.temporary_hp > 0 && (
                <div
                  className="hp-bar-temp absolute top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400"
                  style={{
                    left: `${Math.min(100, (player.current_hp / player.max_hp) * 100)}%`,
                    width: `${Math.min(
                      100 - (player.current_hp / player.max_hp) * 100,
                      (player.temporary_hp / player.max_hp) * 100
                    )}%`
                  }}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center">
                <input
                  type="number"
                  value={damageValue}
                  onChange={(e) => setDamageValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyDamage()}
                  className="input-dark w-16 px-2 py-2 rounded-l-md text-center text-sm"
                  placeholder="0"
                  min="0"
                />
                <button
                  onClick={applyDamage}
                  disabled={!damageValue || parseInt(damageValue) <= 0}
                  className="px-3 py-2 bg-transparent hover:bg-gray-600/30 disabled:bg-transparent disabled:cursor-not-allowed text-red-500 rounded-r-md text-sm font-medium transition-colors"
                >
                  OK
                </button>
              </div>
              <div className="flex items-center justify-center gap-1 text-sm text-red-500 mt-1">
                <Sword size={16} />
                <span>Dégâts</span>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center">
                <input
                  type="number"
                  value={healValue}
                  onChange={(e) => setHealValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyHealing()}
                  className="input-dark w-16 px-2 py-2 rounded-l-md text-center text-sm"
                  placeholder="0"
                  min="0"
                />
                <button
                  onClick={applyHealing}
                  disabled={!healValue || parseInt(healValue) <= 0}
                  className="px-3 py-2 bg-transparent hover:bg-gray-600/30 disabled:bg-transparent disabled:cursor-not-allowed text-green-400 rounded-r-md text-sm font-medium transition-colors"
                >
                  OK
                </button>
              </div>
              <div className="flex items-center justify-center gap-1 text-sm text-green-400 mt-1">
                <Heart size={16} />
                <span>Soins</span>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center">
                <input
                  type="number"
                  value={tempHpValue}
                  onChange={(e) => setTempHpValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyTempHP()}
                  className="input-dark w-16 px-2 py-2 rounded-l-md text-center text-sm"
                  placeholder="0"
                  min="0"
                />
                <button
                  onClick={applyTempHP}
                  disabled={!tempHpValue || parseInt(tempHpValue) <= 0}
                  className="px-3 py-2 bg-transparent hover:bg-gray-600/30 disabled:bg-transparent disabled:cursor-not-allowed text-blue-400 rounded-r-md text-sm font-medium transition-colors"
                >
                  OK
                </button>
              </div>
              <div className="flex items-center justify-center gap-1 text-sm text-blue-400 mt-1">
                <Shield size={16} />
                <span>PV Temp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}