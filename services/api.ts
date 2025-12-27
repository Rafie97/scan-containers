import { Item, Recipe, User, StoreMap, CartItem, Wishlist, Receipt } from '@/models';

// API base URL - will be configured based on environment
const getApiUrl = (): string => {
  // In development, use the server running in Docker
  // This should match your docker-compose setup
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081/api';
};

const API_URL = getApiUrl();

// Token storage (in-memory for now, could use AsyncStorage)
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Auth types
export interface AuthUser {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'manager';
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// Setup API
export const setupApi = {
  checkStatus: () => fetchJson<{ needsSetup: boolean }>('/setup/status'),

  initialize: (username: string, password: string) =>
    fetchJson<AuthResponse>('/setup/init', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    fetchJson<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    fetchJson<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => fetchJson<{ user: AuthUser }>('/auth/me'),
};

// Admin API
export const adminApi = {
  // Items CRUD
  createItem: (item: Partial<Item>) =>
    fetchJson<Item>('/admin/items', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  updateItem: (id: string, item: Partial<Item>) =>
    fetchJson<Item>(`/admin/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    }),

  deleteItem: (id: string) =>
    fetchJson<{ success: boolean }>(`/admin/items/${id}`, { method: 'DELETE' }),

  togglePromo: (id: string, promo: boolean) =>
    fetchJson<Item>(`/admin/items/${id}/promo`, {
      method: 'PATCH',
      body: JSON.stringify({ promo }),
    }),

  // Users
  getUsers: () => fetchJson<AuthUser[]>('/admin/users'),

  updateUserRole: (id: string, role: string) =>
    fetchJson<AuthUser>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Map
  saveMap: (mapData: {
    storeId?: string;
    mapSize: { width: number; height: number };
    aisles: Array<{ coordinate: { x: number; y: number } }>;
    wallCoordinates: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>;
  }) =>
    fetchJson<{ success: boolean; mapId: string }>('/admin/map', {
      method: 'PUT',
      body: JSON.stringify(mapData),
    }),
};

// Items API
export const itemsApi = {
  getAll: () => fetchJson<Item[]>('/items'),

  getById: (id: string) => fetchJson<Item>(`/items/${id}`),

  getByBarcode: (barcode: string) => fetchJson<Item>(`/items/barcode/${barcode}`),

  getPromos: () => fetchJson<Item[]>('/items/promos'),
};

// Recipes API
export const recipesApi = {
  getAll: () => fetchJson<Recipe[]>('/recipes'),

  getById: (id: string) => fetchJson<Recipe>(`/recipes/${id}`),
};

// User API
export const userApi = {
  get: (userId: string) => fetchJson<User>(`/users/${userId}`),

  update: (userId: string, data: Partial<User>) =>
    fetchJson<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Cart API
export const cartApi = {
  get: (userId: string) => fetchJson<CartItem[]>(`/users/${userId}/cart`),

  add: (userId: string, item: Item) =>
    fetchJson<CartItem[]>(`/users/${userId}/cart`, {
      method: 'POST',
      body: JSON.stringify({ itemId: item.id }),
    }),

  updateQuantity: (userId: string, itemId: string, quantity: number) =>
    fetchJson<CartItem[]>(`/users/${userId}/cart/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  remove: (userId: string, itemId: string) =>
    fetchJson<void>(`/users/${userId}/cart/${itemId}`, {
      method: 'DELETE',
    }),

  clear: (userId: string) =>
    fetchJson<void>(`/users/${userId}/cart`, {
      method: 'DELETE',
    }),
};

// Wishlists API
export const wishlistsApi = {
  getAll: (userId: string) => fetchJson<Wishlist[]>(`/users/${userId}/wishlists`),

  create: (userId: string, name: string) =>
    fetchJson<Wishlist>(`/users/${userId}/wishlists`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  addItem: (userId: string, wishlistId: string, itemId: string) =>
    fetchJson<Wishlist>(`/users/${userId}/wishlists/${wishlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),

  removeItem: (userId: string, wishlistId: string, itemId: string) =>
    fetchJson<void>(`/users/${userId}/wishlists/${wishlistId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  delete: (userId: string, wishlistId: string) =>
    fetchJson<void>(`/users/${userId}/wishlists/${wishlistId}`, {
      method: 'DELETE',
    }),
};

// Receipts API
export const receiptsApi = {
  getAll: (userId: string) => fetchJson<Receipt[]>(`/users/${userId}/receipts`),

  getById: (userId: string, receiptId: string) =>
    fetchJson<Receipt>(`/users/${userId}/receipts/${receiptId}`),
};

// Store Map API
export const mapApi = {
  get: (storeId: string = 'default') => fetchJson<StoreMap>(`/stores/${storeId}/map`),
};

// Convenience export
export const api = {
  items: itemsApi,
  recipes: recipesApi,
  user: userApi,
  cart: cartApi,
  wishlists: wishlistsApi,
  receipts: receiptsApi,
  map: mapApi,
};

export default api;
