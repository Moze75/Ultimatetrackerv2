export interface LayoutPreferences {
  user_id: string;
  layouts: {
    lg: Array<{
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      minH?: number;
    }>;
  };
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_LAYOUT = {
  lg: [
    { i: 'profile', x: 0, y: 0, w: 4, h: 6, minW: 2, minH: 4 },  // ← AJOUTEZ cette ligne
    { i: 'combat', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'class', x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'abilities', x: 0, y: 6, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'stats', x: 4, y: 6, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'equipment', x: 8, y: 6, w: 4, h: 6, minW: 3, minH: 5 },
  ],
};