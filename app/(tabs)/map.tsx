import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import gs from '@/Styles/globalStyles';
import { mapApi } from '@/services/api';
import { StoreMap, Aisle } from '@/models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_PADDING = 20;
const MAX_MAP_WIDTH = SCREEN_WIDTH - (MAP_PADDING * 2);

export default function MapPage() {
  const [storeMap, setStoreMap] = useState<StoreMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAisle, setSelectedAisle] = useState<Aisle | null>(null);

  const loadMap = async () => {
    try {
      setError(null);
      const map = await mapApi.get('default');
      setStoreMap(map);
    } catch (err: any) {
      setError(err.message || 'Failed to load store map');
      console.error('Failed to load map:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMap();
    }, []),
  );

  // Memoize grid calculation
  const { grid, cellSize, gridWidth, gridHeight } = useMemo(() => {
    if (!storeMap) {return { grid: [], cellSize: 0, gridWidth: 0, gridHeight: 0 };}

    const gw = storeMap.mapSize.width;
    const gh = storeMap.mapSize.height;

    // Calculate cell size to fit screen width
    const cs = Math.floor(MAX_MAP_WIDTH / gw);

    // Build grid
    const g: (string | null)[][] = Array(gh).fill(null).map(() => Array(gw).fill(null));

    storeMap.wallCoordinates?.forEach(wall => {
      for (let x = wall.startX; x <= wall.endX; x++) {
        for (let y = wall.startY; y <= wall.endY; y++) {
          if (y < gh && x < gw) {g[y][x] = 'wall';}
        }
      }
    });

    storeMap.aisles?.forEach(aisle => {
      if (aisle.coordinate.y < gh && aisle.coordinate.x < gw) {
        g[aisle.coordinate.y][aisle.coordinate.x] = aisle.id;
      }
    });

    return { grid: g, cellSize: cs, gridWidth: gw, gridHeight: gh };
  }, [storeMap]);

  const handleAislePress = (aisle: Aisle) => {
    setSelectedAisle(aisle);
  };

  if (loading) {
    return (
      <View style={[gs.fullBackground, styles.container]}>
        <Text style={gs.header}>Store Map</Text>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (error || !storeMap) {
    return (
      <View style={[gs.fullBackground, styles.container]}>
        <Text style={gs.header}>Store Map</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'No map available'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadMap}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const mapTotalWidth = gridWidth * cellSize;
  const mapTotalHeight = gridHeight * cellSize;

  return (
    <View style={[gs.fullBackground, styles.container]}>
      <Text style={gs.header}>Store Map</Text>

      <View style={styles.mapContainer}>
        <View style={[styles.grid, { width: mapTotalWidth, height: mapTotalHeight }]}>
          {grid.map((row, y) => (
            <View key={y} style={[styles.row, { height: cellSize }]}>
              {row.map((cell, x) => {
                const aisle = cell && cell !== 'wall'
                  ? storeMap.aisles?.find(a => a.id === cell)
                  : null;

                return (
                  <TouchableOpacity
                    key={x}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize },
                      cell === 'wall' && styles.wall,
                      aisle && styles.aisle,
                      selectedAisle?.id === cell && styles.selectedAisle,
                    ]}
                    onPress={() => aisle && handleAislePress(aisle)}
                    disabled={!aisle}
                    activeOpacity={aisle ? 0.7 : 1}
                  >
                    {aisle && cellSize > 20 && (
                      <Text style={[styles.aisleLabel, { fontSize: Math.max(8, cellSize / 4) }]}>
                        {aisle.products?.length || 0}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.aisle]} />
          <Text style={styles.legendText}>Aisle</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.wall]} />
          <Text style={styles.legendText}>Wall</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }]} />
          <Text style={styles.legendText}>Floor</Text>
        </View>
      </View>

      {/* Selected aisle info */}
      {selectedAisle && (
        <View style={styles.aisleInfo}>
          <Text style={styles.aisleInfoTitle}>
            Aisle ({selectedAisle.coordinate.x}, {selectedAisle.coordinate.y})
          </Text>
          <Text style={styles.aisleInfoText}>
            {selectedAisle.products?.length || 0} products
          </Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSelectedAisle(null)}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MAP_PADDING,
  },
  grid: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wall: {
    backgroundColor: '#333',
    borderColor: '#222',
  },
  aisle: {
    backgroundColor: '#0073FE',
    borderColor: '#0066dd',
  },
  selectedAisle: {
    backgroundColor: '#27ae60',
    borderColor: '#1e8449',
  },
  aisleLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 15,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  legendText: {
    color: '#666',
    fontSize: 12,
  },
  aisleInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aisleInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  aisleInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#666',
    fontWeight: '500',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 40,
    padding: 20,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryBtn: {
    backgroundColor: '#0073FE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
