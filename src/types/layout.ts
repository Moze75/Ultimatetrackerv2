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
    { i: 'combat', x: 0, y: 0, w: 4, h: 15, minW: 3, minH: 5 },
    { i: 'profile', x: 4, y: 0, w: 4, h: 15, minW: 2, minH: 4 },
    { i: 'equipment', x: 8, y: 0, w: 4, h: 15, minW: 3, minH: 5 },
    { i: 'abilities', x: 0, y: 15, w: 4, h: 14, minW: 3, minH: 5 },
    { i: 'stats', x: 4, y: 15, w: 4, h: 14, minW: 3, minH: 5 },
    { i: 'class', x: 8, y: 15, w: 4, h: 14, minW: 3, minH: 5 },
  ],
  md: [
    { i: 'profile', x: 0, y: 0, w: 6, h: 12, minW: 2, minH: 4 },
    { i: 'abilities', x: 0, y: 12, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'combat', x: 4, y: 12, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'class', x: 6, y: 18, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'stats', x: 4, y: 24, w: 4, h: 6, minW: 3, minH: 5 },
    { i: 'equipment', x: 6, y: 30, w: 4, h: 6, minW: 3, minH: 5 },
  ],
};