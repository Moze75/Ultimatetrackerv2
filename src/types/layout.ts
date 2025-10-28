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
    { i: 'profile', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'combat', x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'class', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'abilities', x: 0, y: 8, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'stats', x: 4, y: 8, w: 4, h: 8, minW: 3, minH: 6 },
    { i: 'equipment', x: 8, y: 8, w: 4, h: 8, minW: 3, minH: 6 },
  ],
};