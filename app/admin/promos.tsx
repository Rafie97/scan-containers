import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { itemsApi, adminApi } from '@/services/api';
import { Item } from '@/models';

export default function PromosManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'promo' | 'regular'>('all');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await itemsApi.getAll();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const togglePromo = async (item: Item) => {
    try {
      await adminApi.togglePromo(item.id, !item.promo);
      setItems(items.map(i => i.id === item.id ? { ...i, promo: !i.promo } : i));
    } catch (err) {
      console.error('Failed to toggle promo');
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'promo') return item.promo;
    if (filter === 'regular') return !item.promo;
    return true;
  });

  const promoCount = items.filter(i => i.promo).length;

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Promos & Sales</Text>
      <Text style={styles.subtitle}>{promoCount} items currently on sale</Text>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({items.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'promo' && styles.filterActive]}
          onPress={() => setFilter('promo')}
        >
          <Text style={[styles.filterText, filter === 'promo' && styles.filterTextActive]}>
            On Sale ({promoCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'regular' && styles.filterActive]}
          onPress={() => setFilter('regular')}
        >
          <Text style={[styles.filterText, filter === 'regular' && styles.filterTextActive]}>
            Regular ({items.length - promoCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.itemGrid}>
        <View style={styles.grid}>
          {filteredItems.map(item => (
            <View key={item.id} style={[styles.itemCard, item.promo && styles.itemCardPromo]}>
              {item.imageLink ? (
                <Image source={{ uri: item.imageLink }} style={styles.itemImage} />
              ) : (
                <View style={styles.noImage} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemPrice}>${Number(item.price || 0).toFixed(2)}</Text>
                <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
              </View>
              <View style={styles.promoToggle}>
                <Text style={styles.promoLabel}>{item.promo ? 'ON SALE' : 'Regular'}</Text>
                <Switch
                  value={item.promo}
                  onValueChange={() => togglePromo(item)}
                  trackColor={{ false: '#ddd', true: '#27ae60' }}
                  thumbColor={item.promo ? '#fff' : '#999'}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#f0f0f0' },
  filterActive: { backgroundColor: '#0073FE' },
  filterText: { color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  itemGrid: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  itemCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemCardPromo: { borderWidth: 2, borderColor: '#27ae60' },
  itemImage: { width: 60, height: 60, borderRadius: 8 },
  noImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  itemPrice: { fontSize: 14, color: '#0073FE', fontWeight: '500', marginTop: 4 },
  itemCategory: { fontSize: 12, color: '#999', marginTop: 2 },
  promoToggle: { alignItems: 'center' },
  promoLabel: { fontSize: 10, fontWeight: '600', color: '#666', marginBottom: 5 },
});
