import { Coordinate } from './Coordinate';

export interface Aisle {
  id: string;
  coordinate: Coordinate;
  products: string[]; // Product IDs
}
