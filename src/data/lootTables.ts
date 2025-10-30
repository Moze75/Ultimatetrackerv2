// Tables de probabilités de loot par niveau et difficulté
export const LOOT_TABLES = {
  '1-4': {
    facile: {
      '1': { copper: 55, silver: 30, gold: 10, equipment: 5 },
      '2-4': { copper: 60, silver: 28, gold: 8, equipment: 4 },
      '5-10': { copper: 65, silver: 25, gold: 7, equipment: 3 },
      '11+': { copper: 68, silver: 23, gold: 6, equipment: 3 }
    },
    modérée: {
      '1': { copper: 45, silver: 30, gold: 17, equipment: 8 },
      '2-4': { copper: 50, silver: 28, gold: 15, equipment: 7 },
      '5-10': { copper: 54, silver: 26, gold: 14, equipment: 6 },
      '11+': { copper: 58, silver: 24, gold: 12, equipment: 6 }
    },
    difficile: {
      '1': { copper: 35, silver: 30, gold: 23, equipment: 12 },
      '2-4': { copper: 40, silver: 28, gold: 22, equipment: 10 },
      '5-10': { copper: 44, silver: 26, gold: 20, equipment: 10 },
      '11+': { copper: 48, silver: 24, gold: 18, equipment: 10 }
    }
  },
  '5-10': {
    facile: {
      '1': { copper: 30, silver: 35, gold: 20, equipment: 15 },
      '2-4': { copper: 34, silver: 33, gold: 18, equipment: 15 },
      '5-10': { copper: 38, silver: 30, gold: 15, equipment: 17 },
      '11+': { copper: 40, silver: 28, gold: 13, equipment: 19 }
    },
    modérée: {
      '1': { copper: 22, silver: 30, gold: 28, equipment: 20 },
      '2-4': { copper: 26, silver: 28, gold: 26, equipment: 20 },
      '5-10': { copper: 30, silver: 25, gold: 24, equipment: 21 },
      '11+': { copper: 34, silver: 22, gold: 22, equipment: 22 }
    },
    difficile: {
      '1': { copper: 12, silver: 20, gold: 38, equipment: 30 },
      '2-4': { copper: 16, silver: 18, gold: 36, equipment: 30 },
      '5-10': { copper: 20, silver: 15, gold: 34, equipment: 31 },
      '11+': { copper: 24, silver: 12, gold: 32, equipment: 32 }
    }
  },
  '11-16': {
    facile: {
      '1': { copper: 15, silver: 30, gold: 25, equipment: 30 },
      '2-4': { copper: 18, silver: 28, gold: 24, equipment: 30 },
      '5-10': { copper: 22, silver: 26, gold: 20, equipment: 32 },
      '11+': { copper: 25, silver: 24, gold: 18, equipment: 33 }
    },
    modérée: {
      '1': { copper: 12, silver: 20, gold: 30, equipment: 38 },
      '2-4': { copper: 14, silver: 18, gold: 28, equipment: 40 },
      '5-10': { copper: 16, silver: 16, gold: 26, equipment: 42 },
      '11+': { copper: 18, silver: 14, gold: 24, equipment: 44 }
    },
    difficile: {
      '1': { copper: 8, silver: 12, gold: 35, equipment: 45 },
      '2-4': { copper: 10, silver: 10, gold: 33, equipment: 47 },
      '5-10': { copper: 12, silver: 8, gold: 30, equipment: 50 },
      '11+': { copper: 14, silver: 6, gold: 28, equipment: 52 }
    }
  },
  '17-20': {
    facile: {
      '1': { copper: 6, silver: 14, gold: 30, equipment: 50 },
      '2-4': { copper: 8, silver: 13, gold: 28, equipment: 51 },
      '5-10': { copper: 10, silver: 12, gold: 26, equipment: 52 },
      '11+': { copper: 12, silver: 10, gold: 24, equipment: 54 }
    },
    modérée: {
      '1': { copper: 5, silver: 10, gold: 30, equipment: 55 },
      '2-4': { copper: 6, silver: 9, gold: 28, equipment: 57 },
      '5-10': { copper: 8, silver: 8, gold: 26, equipment: 58 },
      '11+': { copper: 9, silver: 7, gold: 24, equipment: 60 }
    },
    difficile: {
      '1': { copper: 3, silver: 6, gold: 28, equipment: 63 },
      '2-4': { copper: 4, silver: 5, gold: 26, equipment: 65 },
      '5-10': { copper: 5, silver: 4, gold: 25, equipment: 66 },
      '11+': { copper: 6, silver: 3, gold: 24, equipment: 67 }
    }
  }
} as const;

export type LevelRange = '1-4' | '5-10' | '11-16' | '17-20';
export type Difficulty = 'facile' | 'modérée' | 'difficile';
export type EnemyCount = '1' | '2-4' | '5-10' | '11+';

// ✅ NOUVEAU : Montants spécifiques par type de monnaie et niveau
export const CURRENCY_AMOUNTS = {
  '1-4': {
    copper: { min: 1, max: 50 },      // Max 50 pc
    silver: { min: 1, max: 10 },      // 1-10 pa
    gold: { min: 1, max: 5 }          // 1-5 po
  },
  '5-10': {
    copper: { min: 1, max: 50 },      // Toujours max 50 pc
    silver: { min: 5, max: 30 },      // 5-30 pa
    gold: { min: 1, max: 15 }         // 1-15 po
  },
  '11-16': {
    copper: { min: 1, max: 50 },      // Toujours max 50 pc
    silver: { min: 10, max: 50 },     // 10-50 pa
    gold: { min: 5, max: 50 }         // 5-50 po
  },
  '17-20': {
    copper: { min: 1, max: 50 },      // Toujours max 50 pc
    silver: { min: 10, max: 50 },     // 10-50 pa
    gold: { min: 10, max: 100 }       // 10-100 po
  }
};