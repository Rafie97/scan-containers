import { Item, Recipe, CartItem, User, StoreMap } from '@/models';

export interface AppState {
  user: User | null;
  map: StoreMap | null;
  items: Item[];
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
}

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_WISHLISTS'; payload: User['wishlists'] }
  | { type: 'SET_RECEIPTS'; payload: User['receipts'] }
  | { type: 'SET_ITEMS'; payload: Item[] }
  | { type: 'SET_RECIPES'; payload: Recipe[] }
  | { type: 'SET_MAP'; payload: StoreMap | null }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_TO_CART'; payload: Item }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };
