import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import gs from '@/Styles/globalStyles';

export default function AccountPage() {
  return (
    <View style={[gs.fullBackground, styles.container]}>
      <Text style={gs.header}>Account</Text>
      <Text style={styles.placeholder}>Profile, wishlists, and receipts will appear here</Text>
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
