import { Aisle } from './Aisle';
import { WallCoordinate } from './Coordinate';

export interface StoreMap {
  id: string;
  storeId: string;
  aisles: Aisle[];
  mapSize: MapSize;
  wallCoordinates: WallCoordinate[];
}

export interface MapSize {
  height: number;
  width: number;
}
