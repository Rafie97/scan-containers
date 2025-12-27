import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import gs from '@/Styles/globalStyles';
import { itemsApi } from '@/services/api';
import { Item } from '@/models';
import { useDispatch } from '@/store';

export default function PromoPage() {
  const [promoItems, setPromoItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const loadPromos = async () => {
    try {
      setError(null);
      const items = await itemsApi.getPromos();
      setPromoItems(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load promotions');
      console.error('Failed to load promos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch every time tab is focused
  useFocusEffect(
    useCallback(() => {
      loadPromos();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPromos();
  };

  const handleAddToCart = (item: Item) => {
    dispatch({ type: 'ADD_TO_CART', payload: item });
  };

  if (loading) {
    return (
      <View style={[gs.fullBackground, styles.container]}>
        <Text style={gs.header}>Today's Best Deals</Text>
        <Text style={styles.loadingText}>Loading promotions...</Text>
      </View>
    );
  }

  return (
    <View style={[gs.fullBackground, styles.container]}>
      <Text style={gs.header}>Today's Best Deals</Text>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadPromos}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : promoItems.length === 0 ? (
        <Text style={styles.placeholder}>No promotions available right now</Text>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.grid}>
            {promoItems.map(item => (
              <View key={item.id} style={styles.card}>
                {item.imageLink ? (
                  <Image source={{ uri: item.imageLink }} style={styles.image} />
                ) : (
                  <View style={styles.noImage}>
                    <Text style={styles.noImageText}>No Image</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.category}>{item.category || 'Uncategorized'}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>${Number(item.price || 0).toFixed(2)}</Text>
                    <Text style={styles.saleBadge}>ON SALE</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Text style={styles.addBtnText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  noImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    fontSize: 12,
  },
  cardContent: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  saleBadge: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addBtn: {
    backgroundColor: '#0073FE',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  placeholder: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
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
