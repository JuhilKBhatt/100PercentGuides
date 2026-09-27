export interface Developer {
  id: number;
  name: string;
  slug?: string;
  image_background?: string;
}

export interface Publisher {
  id: number;
  name: string;
  slug?: string;
}

export interface Genre {
  id: number;
  name: string;
  slug?: string;
}

export interface Game {
  id: number;
  name: string;
  background_image: string;
  released: string;
  rating?: number;
}

export interface GameDetails extends Game {
  description: string;
  playtime: number;
  developers?: Developer[];
  publishers?: Publisher[];
  genres?: Genre[];
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  image: string;
  percent?: string;
}
