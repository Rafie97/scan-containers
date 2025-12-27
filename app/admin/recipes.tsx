import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { itemsApi } from '@/services/api';
import { Item } from '@/models';

interface Recipe {
  id: string;
  name: string;
  feeds: number;
  ingredients: string[];
  imageLink?: string;
}

export default function RecipesManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const itemsData = await itemsApi.getAll();
      setItems(itemsData);
      // TODO: Load recipes from API
    } catch (err) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startNewRecipe = () => {
    setEditingRecipe({
      name: '',
      feeds: 4,
      ingredients: [],
      imageLink: '',
    });
  };

  const addIngredient = (itemId: string) => {
    if (!editingRecipe) return;
    if (editingRecipe.ingredients?.includes(itemId)) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: [...(editingRecipe.ingredients || []), itemId],
    });
  };

  const removeIngredient = (itemId: string) => {
    if (!editingRecipe) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: editingRecipe.ingredients?.filter(id => id !== itemId) || [],
    });
  };

  const getItemById = (id: string) => items.find(i => i.id === id);

  const calculateTotal = () => {
    if (!editingRecipe?.ingredients) return 0;
    return editingRecipe.ingredients.reduce((sum, id) => {
      const item = getItemById(id);
      return sum + Number(item?.price || 0);
    }, 0);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipe Builder</Text>
        <TouchableOpacity style={styles.addButton} onPress={startNewRecipe}>
          <Text style={styles.addButtonText}>+ New Recipe</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Recipe Editor */}
        {editingRecipe ? (
          <View style={styles.editor}>
            <Text style={styles.editorTitle}>Create Recipe</Text>

            <Text style={styles.label}>Recipe Name</Text>
            <TextInput
              style={styles.input}
              value={editingRecipe.name}
              onChangeText={v => setEditingRecipe({ ...editingRecipe, name: v })}
              placeholder="e.g., Chicken Stir Fry"
            />

            <Text style={styles.label}>Serves</Text>
            <TextInput
              style={styles.input}
              value={String(editingRecipe.feeds || 4)}
              onChangeText={v => setEditingRecipe({ ...editingRecipe, feeds: parseInt(v) || 1 })}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={editingRecipe.imageLink}
              onChangeText={v => setEditingRecipe({ ...editingRecipe, imageLink: v })}
              placeholder="https://..."
            />

            <Text style={styles.label}>Ingredients ({editingRecipe.ingredients?.length || 0})</Text>
            <View style={styles.ingredientsList}>
              {editingRecipe.ingredients?.map(id => {
                const item = getItemById(id);
                if (!item) return null;
                return (
                  <View key={id} style={styles.ingredientChip}>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                    <Text style={styles.ingredientPrice}>${Number(item.price || 0).toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => removeIngredient(id)}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Cost:</Text>
              <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
            </View>

            <View style={styles.editorActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingRecipe(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Recipe</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Select a recipe to edit or create a new one</Text>
          </View>
        )}

        {/* Item Picker */}
        <View style={styles.itemPicker}>
          <Text style={styles.pickerTitle}>Add Ingredients</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items..."
          />
          <ScrollView style={styles.itemList}>
            {filteredItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemRow,
                  editingRecipe?.ingredients?.includes(item.id) && styles.itemRowSelected,
                ]}
                onPress={() => editingRecipe && addIngredient(item.id)}
                disabled={!editingRecipe}
              >
                {item.imageLink ? (
                  <Image source={{ uri: item.imageLink }} style={styles.itemThumb} />
                ) : (
                  <View style={styles.noThumb} />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${Number(item.price || 0).toFixed(2)}</Text>
                </View>
                {editingRecipe?.ingredients?.includes(item.id) && (
                  <Text style={styles.addedLabel}>Added</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
  content: { flex: 1, flexDirection: 'row', gap: 20 },
  editor: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  editorTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1a1a2e' },
  label: { fontSize: 14, fontWeight: '500', color: '#666', marginBottom: 5, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 12 },
  ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  ingredientName: { fontWeight: '500' },
  ingredientPrice: { color: '#0073FE' },
  removeBtn: { color: '#e74c3c', fontWeight: 'bold', marginLeft: 5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#0073FE' },
  editorActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0073FE', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  placeholder: { flex: 1, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#999', fontSize: 16 },
  itemPicker: { width: 320, backgroundColor: '#fff', borderRadius: 12, padding: 15 },
  pickerTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#1a1a2e' },
  searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 15 },
  itemList: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 5 },
  itemRowSelected: { backgroundColor: '#e3f2fd' },
  itemThumb: { width: 40, height: 40, borderRadius: 6 },
  noThumb: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#eee' },
  itemInfo: { flex: 1, marginLeft: 10 },
  itemName: { fontWeight: '500' },
  itemPrice: { color: '#666', fontSize: 12 },
  addedLabel: { color: '#27ae60', fontWeight: '600', fontSize: 12 },
});
