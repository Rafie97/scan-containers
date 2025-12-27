import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { mapApi, adminApi } from '@/services/api';

export default function MapEditor() {
  const [mapSize, setMapSize] = useState({ width: 10, height: 10 });
  const [selectedTool, setSelectedTool] = useState<'aisle' | 'wall' | 'select'>('select');
  const [aisles, setAisles] = useState<{ x: number; y: number; id: string }[]>([]);
  const [walls, setWalls] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cellSize = 40;

  // Load existing map on mount
  useEffect(() => {
    loadMap();
  }, []);

  const loadMap = async () => {
    try {
      const map = await mapApi.get('default');
      setMapSize({ width: map.mapSize.width, height: map.mapSize.height });
      setAisles(map.aisles?.map(a => ({
        x: a.coordinate.x,
        y: a.coordinate.y,
        id: a.id || `aisle-${a.coordinate.x}-${a.coordinate.y}`
      })) || []);
      setWalls(map.wallCoordinates || []);
    } catch (err) {
      console.error('Failed to load map:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.saveMap({
        storeId: 'default',
        mapSize,
        aisles: aisles.map(a => ({ coordinate: { x: a.x, y: a.y } })),
        wallCoordinates: walls,
      });
      setMessage({ type: 'success', text: 'Map saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save map' });
    } finally {
      setSaving(false);
    }
  };

  const handleCellClick = (x: number, y: number) => {
    if (selectedTool === 'aisle') {
      const existingIndex = aisles.findIndex(a => a.x === x && a.y === y);
      if (existingIndex >= 0) {
        setAisles(aisles.filter((_, i) => i !== existingIndex));
      } else {
        setAisles([...aisles, { x, y, id: `aisle-${Date.now()}` }]);
      }
    } else if (selectedTool === 'wall') {
      // For walls, toggle single cell as a 1x1 wall
      const existingIndex = walls.findIndex(w =>
        w.start.x === x && w.start.y === y && w.end.x === x && w.end.y === y
      );
      if (existingIndex >= 0) {
        setWalls(walls.filter((_, i) => i !== existingIndex));
      } else {
        setWalls([...walls, { start: { x, y }, end: { x, y } }]);
      }
    }
  };

  const isWall = (x: number, y: number) => {
    return walls.some(w =>
      x >= w.start.x && x <= w.end.x && y >= w.start.y && y <= w.end.y
    );
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < mapSize.height; y++) {
      for (let x = 0; x < mapSize.width; x++) {
        const isAisle = aisles.some(a => a.x === x && a.y === y);
        const isWallCell = isWall(x, y);
        cells.push(
          <TouchableOpacity
            key={`${x}-${y}`}
            style={[
              styles.cell,
              { width: cellSize, height: cellSize, left: x * cellSize, top: y * cellSize },
              isAisle && styles.cellAisle,
              isWallCell && styles.cellWall,
            ]}
            onPress={() => handleCellClick(x, y)}
          >
            {isAisle && <Text style={styles.cellLabel}>A</Text>}
            {isWallCell && <Text style={styles.cellLabelWall}>W</Text>}
          </TouchableOpacity>
        );
      }
    }
    return cells;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Store Map Editor</Text>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Store Map Editor</Text>
      <Text style={styles.subtitle}>Click cells to place aisles and walls</Text>

      {message && (
        <View style={[styles.message, message.type === 'error' ? styles.messageError : styles.messageSuccess]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      <View style={styles.toolbar}>
        <View style={styles.toolGroup}>
          <Text style={styles.toolLabel}>Tools:</Text>
          <TouchableOpacity
            style={[styles.toolBtn, selectedTool === 'select' && styles.toolBtnActive]}
            onPress={() => setSelectedTool('select')}
          >
            <Text style={[styles.toolBtnText, selectedTool === 'select' && styles.toolBtnTextActive]}>Select</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, selectedTool === 'aisle' && styles.toolBtnActive]}
            onPress={() => setSelectedTool('aisle')}
          >
            <Text style={[styles.toolBtnText, selectedTool === 'aisle' && styles.toolBtnTextActive]}>Aisle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, selectedTool === 'wall' && styles.toolBtnActive]}
            onPress={() => setSelectedTool('wall')}
          >
            <Text style={[styles.toolBtnText, selectedTool === 'wall' && styles.toolBtnTextActive]}>Wall</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolGroup}>
          <Text style={styles.toolLabel}>Grid Size:</Text>
          <TextInput
            style={styles.sizeInput}
            value={String(mapSize.width)}
            onChangeText={v => setMapSize({ ...mapSize, width: Math.max(1, Math.min(50, parseInt(v) || 1)) })}
            keyboardType="number-pad"
          />
          <Text style={styles.sizeX}>x</Text>
          <TextInput
            style={styles.sizeInput}
            value={String(mapSize.height)}
            onChangeText={v => setMapSize({ ...mapSize, height: Math.max(1, Math.min(50, parseInt(v) || 1)) })}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Map'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editorContainer}>
        <ScrollView style={styles.gridScroll} horizontal>
          <ScrollView>
            <View style={styles.gridContainer}>
              <View style={[styles.grid, { width: mapSize.width * cellSize, height: mapSize.height * cellSize }]}>
                {renderGrid()}
              </View>
            </View>
          </ScrollView>
        </ScrollView>

        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Legend</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.cellAisle]} />
            <Text style={styles.legendLabel}>Aisle</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.cellWall]} />
            <Text style={styles.legendLabel}>Wall</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }]} />
            <Text style={styles.legendLabel}>Floor</Text>
          </View>

          <Text style={[styles.sidebarTitle, { marginTop: 30 }]}>Stats</Text>
          <Text style={styles.statItem}>Aisles: {aisles.length}</Text>
          <Text style={styles.statItem}>Walls: {walls.length}</Text>
          <Text style={styles.statItem}>Grid: {mapSize.width}x{mapSize.height}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  loadingText: { fontSize: 16, color: '#666', marginTop: 40 },
  message: { padding: 12, borderRadius: 8, marginBottom: 15 },
  messageSuccess: { backgroundColor: '#d4edda' },
  messageError: { backgroundColor: '#f8d7da' },
  messageText: { fontSize: 14, fontWeight: '500' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  toolGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolLabel: { fontSize: 14, fontWeight: '500', color: '#666' },
  toolBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#f0f0f0' },
  toolBtnActive: { backgroundColor: '#0073FE' },
  toolBtnText: { fontWeight: '500', color: '#333' },
  toolBtnTextActive: { color: '#fff' },
  sizeInput: { width: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, textAlign: 'center' },
  sizeX: { color: '#666' },
  saveBtn: { backgroundColor: '#27ae60', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 'auto' },
  saveBtnDisabled: { backgroundColor: '#999' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  editorContainer: { flex: 1, flexDirection: 'row', gap: 20 },
  gridScroll: { flex: 1 },
  gridContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  grid: { position: 'relative', backgroundColor: '#f9f9f9', borderRadius: 4 },
  cell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cellAisle: { backgroundColor: '#0073FE' },
  cellWall: { backgroundColor: '#333' },
  cellLabel: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  cellLabelWall: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  sidebar: { width: 200, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  sidebarTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  legendBox: { width: 24, height: 24, borderRadius: 4 },
  legendLabel: { color: '#666' },
  statItem: { fontSize: 14, color: '#666', marginBottom: 5 },
});
