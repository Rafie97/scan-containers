import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import gs from '@/Styles/globalStyles';

export default function CartPage() {
  return (
    <View style={[gs.fullBackground, styles.container]}>
      <Text style={gs.header}>Cart</Text>
      <Text style={styles.placeholder}>Your cart items will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  placeholder: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
