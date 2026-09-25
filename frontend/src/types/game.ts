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
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  image: string;
  percent?: string;
}
