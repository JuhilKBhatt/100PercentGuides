export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  totalRequired: number;
  totalInGame?: number;
  category: string;
  guideUrl?: string;
  missable?: boolean;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  description?: string;
  totalItems: number;
  items: ChecklistItem[];
}

export interface GameChecklist {
  gameId: string;
  gameName: string;
  totalRequirements: number;
  categories: ChecklistCategory[];
}

export interface UserChecklistProgress {
  [itemId: string]: number;
}
