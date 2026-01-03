import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { itemsApi, adminApi } from '@/services/api';
import { Item } from '@/models';

export default function InventoryManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await itemsApi.getAll();
      setItems(data);
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSave = async () => {
    if (!editingItem?.name) {
      setError('Name is required');
      return;
    }

    try {
      if (isAddingNew) {
        await adminApi.createItem(editingItem);
      } else if (editingItem.id) {
        await adminApi.updateItem(editingItem.id, editingItem);
      }
      setEditingItem(null);
      setIsAddingNew(false);
      loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {return;}

    try {
      await adminApi.deleteItem(id);
      loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    }
  };

  const startEdit = (item: Item) => {
    setEditingItem({ ...item });
    setIsAddingNew(false);
  };

  const startAddNew = () => {
    setEditingItem({
      name: '',
      barcode: '',
      category: '',
      imageLink: '',
      price: 0,
      promo: false,
      stock: 0,
    });
    setIsAddingNew(true);
  };

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={startAddNew}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name, barcode, or category..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.content}>
        {/* Item List */}
        <ScrollView style={styles.itemList}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.cellImage]}>Image</Text>
            <Text style={[styles.tableCell, styles.cellName]}>Name</Text>
            <Text style={[styles.tableCell, styles.cellBarcode]}>Barcode</Text>
            <Text style={[styles.tableCell, styles.cellCategory]}>Category</Text>
            <Text style={[styles.tableCell, styles.cellPrice]}>Price</Text>
            <Text style={[styles.tableCell, styles.cellStock]}>Stock</Text>
            <Text style={[styles.tableCell, styles.cellPromo]}>Promo</Text>
            <Text style={[styles.tableCell, styles.cellActions]}>Actions</Text>
          </View>

          {filteredItems.map(item => (
            <View key={item.id} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.cellImage]}>
                {item.imageLink ? (
                  <Image source={{ uri: item.imageLink }} style={styles.thumbnail} />
                ) : (
                  <View style={styles.noImage} />
                )}
              </View>
              <Text style={[styles.tableCell, styles.cellName]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.cellBarcode]}>{item.barcode || '-'}</Text>
              <Text style={[styles.tableCell, styles.cellCategory]}>{item.category || '-'}</Text>
              <Text style={[styles.tableCell, styles.cellPrice]}>${Number(item.price || 0).toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.cellStock, (item.stock || 0) < 10 && styles.lowStock]}>
                {item.stock || 0}
              </Text>
              <Text style={[styles.tableCell, styles.cellPromo]}>
                {item.promo ? '✓' : '-'}
              </Text>
              <View style={[styles.tableCell, styles.cellActions]}>
                <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Edit Panel */}
        {editingItem && (
          <View style={styles.editPanel}>
            <Text style={styles.editTitle}>{isAddingNew ? 'Add New Item' : 'Edit Item'}</Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={editingItem.name || ''}
              onChangeText={v => setEditingItem({ ...editingItem, name: v })}
              placeholder="Item name"
            />

            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={styles.input}
              value={editingItem.barcode || ''}
              onChangeText={v => setEditingItem({ ...editingItem, barcode: v })}
              placeholder="012345678901"
            />

            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={editingItem.category || ''}
              onChangeText={v => setEditingItem({ ...editingItem, category: v })}
              placeholder="Produce, Dairy, etc."
            />

            <Text style={styles.label}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={editingItem.imageLink || ''}
              onChangeText={v => setEditingItem({ ...editingItem, imageLink: v })}
              placeholder="https://..."
            />

            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={String(editingItem.price || 0)}
              onChangeText={v => setEditingItem({ ...editingItem, price: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Stock</Text>
            <TextInput
              style={styles.input}
              value={String(editingItem.stock || 0)}
              onChangeText={v => setEditingItem({ ...editingItem, stock: parseInt(v) || 0 })}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.promoToggle, editingItem.promo && styles.promoActive]}
              onPress={() => setEditingItem({ ...editingItem, promo: !editingItem.promo })}
            >
              <Text style={styles.promoToggleText}>
                {editingItem.promo ? '✓ On Sale' : 'Not on Sale'}
              </Text>
            </TouchableOpacity>

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingItem(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
  addButton: { backgroundColor: '#27ae60', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c0392b', backgroundColor: '#fdeaea', padding: 10, borderRadius: 8, marginBottom: 15 },
  searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 20, backgroundColor: '#fff' },
  content: { flex: 1, flexDirection: 'row', gap: 20 },
  itemList: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 15 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 10, alignItems: 'center' },
  tableCell: { paddingHorizontal: 8 },
  cellImage: { width: 60 },
  cellName: { flex: 2, fontWeight: '500' },
  cellBarcode: { flex: 1, fontSize: 12, color: '#666' },
  cellCategory: { flex: 1 },
  cellPrice: { width: 70, textAlign: 'right' },
  cellStock: { width: 60, textAlign: 'center' },
  cellPromo: { width: 50, textAlign: 'center' },
  cellActions: { width: 120, flexDirection: 'row', gap: 5 },
  thumbnail: { width: 40, height: 40, borderRadius: 6 },
  noImage: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#eee' },
  lowStock: { color: '#e74c3c', fontWeight: 'bold' },
  editBtn: { backgroundColor: '#0073FE', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  editBtnText: { color: '#fff', fontSize: 12 },
  deleteBtn: { backgroundColor: '#e74c3c', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  deleteBtnText: { color: '#fff', fontSize: 12 },
  editPanel: { width: 350, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  editTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1a1a2e' },
  label: { fontSize: 14, fontWeight: '500', color: '#666', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 5 },
  promoToggle: { marginTop: 15, padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  promoActive: { backgroundColor: '#27ae60' },
  promoToggleText: { fontWeight: '600', color: '#333' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0073FE', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
