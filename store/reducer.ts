import { AppState, AppAction } from './types';
import { CartItem, Item } from '@/models';

export const initialState: AppState = {
  user: null,
  map: null,
  items: [],
  recipes: [],
  isLoading: false,
  error: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_WISHLISTS':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, wishlists: action.payload },
      };

    case 'SET_RECEIPTS':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, receipts: action.payload },
      };

    case 'SET_ITEMS':
      return { ...state, items: action.payload };

    case 'SET_RECIPES':
      return { ...state, recipes: action.payload };

    case 'SET_MAP':
      return { ...state, map: action.payload };

    case 'SET_CART':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, cart: action.payload },
      };

    case 'ADD_TO_CART': {
      if (!state.user) return state;
      const currentCart = state.user.cart || [];
      const existingIndex = currentCart.findIndex(
        (item) => item.id === action.payload.id
      );

      let newCart: CartItem[];
      if (existingIndex >= 0) {
        // Item exists, increment quantity
        newCart = currentCart.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      } else {
        // New item
        newCart = [...currentCart, { ...action.payload, quantity: 1 }];
      }

      return {
        ...state,
        user: { ...state.user, cart: newCart },
      };
    }

    case 'REMOVE_FROM_CART': {
      if (!state.user) return state;
      const filteredCart = (state.user.cart || []).filter(
        (item) => item.id !== action.payload
      );
      return {
        ...state,
        user: { ...state.user, cart: filteredCart },
      };
    }

    case 'UPDATE_CART_QUANTITY': {
      if (!state.user) return state;
      const { itemId, quantity } = action.payload;

      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const filteredCart = (state.user.cart || []).filter(
          (item) => item.id !== itemId
        );
        return {
          ...state,
          user: { ...state.user, cart: filteredCart },
        };
      }

      const updatedCart = (state.user.cart || []).map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      );
      return {
        ...state,
        user: { ...state.user, cart: updatedCart },
      };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

// Helper to calculate cart total
export function calculateCartTotal(cart: CartItem[] | undefined): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const TAX_RATE = 0.0825; // 8.25%
  const subtotal = (cart || []).reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return { subtotal, tax, total };
}
