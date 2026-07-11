export type LearningItem = {
  id: string;
  title: string;
  content: string;
  subtitle?: string;
  tags?: string[];
 difficulty?: '入门' | '初级' | '中级' | '高级';
 frequency?: number; // 1-5
  /** 岗位标注：pilot=飞行员, cabin=乘务员, maintenance=机务 */
  role?: 'pilot' | 'cabin' | 'maintenance';
};

export type LearningSubcategory = {
  id: string;
  label: string;
  items: LearningItem[];
};

export type LearningCategory = {
  id: string;
  label: string;
  subcategories: LearningSubcategory[];
};

export type FavoriteRecord = {
  itemId: string;
  categoryLabel: string;
  subcategoryLabel: string;
  title: string;
  savedAt: string;
};

export type HistoryRecord = {
  itemId: string;
  categoryLabel: string;
  title: string;
  viewedAt: string;
};
