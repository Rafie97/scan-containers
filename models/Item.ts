import { Review } from './Review';

export interface Item {
  id: string;
  barcode: string | null;
  category: string | null;
  imageLink: string;
  name: string;
  price: number;
  priceHistory: PriceHistoryEntry[] | null;
  promo: boolean;
  quantity: number | null;
  reviews: Review[];
  stock: number | null;
  locationId: string | null;
  isRecipe?: boolean;
}

export interface PriceHistoryEntry {
  timestamp: string;
  price: number;
}

export interface Recipe extends Item {
  feeds: number;
  ingredients: string[]; // Item IDs
}
