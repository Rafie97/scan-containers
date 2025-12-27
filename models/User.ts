import { Receipt } from './Receipt';
import { Item } from './Item';

export interface User {
  id: string;
  name?: string;
  family?: string[];
  wishlists?: Wishlist[];
  receipts?: Receipt[];
  cart?: CartItem[];
}

export interface Wishlist {
  id: string;
  name: string;
  items: string[]; // Item IDs
}

export interface CartItem extends Item {
  quantity: number;
}
