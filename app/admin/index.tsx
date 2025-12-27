import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { itemsApi } from '@/services/api';
import { Item } from '@/models';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalItems: 0,
    promoItems: 0,
    lowStock: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const items = await itemsApi.getAll();
      setStats({
        totalItems: items.length,
        promoItems: items.filter(i => i.promo).length,
        lowStock: items.filter(i => (i.stock || 0) < 10).length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Welcome to the admin portal</Text>

      <View style={styles.statsRow}>
        <StatCard
          label="Total Items"
          value={stats.totalItems}
          color="#0073FE"
          onPress={() => router.push('/admin/inventory')}
        />
        <StatCard
          label="On Sale"
          value={stats.promoItems}
          color="#27ae60"
          onPress={() => router.push('/admin/promos')}
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStock}
          color="#e74c3c"
          onPress={() => router.push('/admin/inventory')}
        />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <ActionButton label="Add Item" onPress={() => router.push('/admin/inventory?action=add')} />
        <ActionButton label="Manage Promos" onPress={() => router.push('/admin/promos')} />
        <ActionButton label="Edit Map" onPress={() => router.push('/admin/map')} />
        <ActionButton label="Create Recipe" onPress={() => router.push('/admin/recipes')} />
      </View>
    </View>
  );
}

function StatCard({ label, value, color, onPress }: { label: string; value: number; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  actionButton: {
    backgroundColor: '#0073FE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
