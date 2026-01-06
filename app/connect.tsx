import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import QRCode from 'qrcode';

export default function ConnectPage() {
  const [webQR, setWebQR] = useState<string | null>(null);
  const [webURL, setWebURL] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = window.location.origin;
      setWebURL(url);
      QRCode.toDataURL(url, { width: 200, margin: 2 })
        .then(setWebQR)
        .catch(console.error);
    }
  }, []);

  // Web-only page
  if (Platform.OS !== 'web') {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Scan App</Text>
        <Text style={styles.subtitle}>Self-hosted grocery shopping assistant</Text>

        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Scan to Open</Text>
          <Text style={styles.qrDescription}>Use your phone's camera to scan</Text>
          {webQR ? (
            <Image source={{ uri: webQR }} style={styles.qrImage} />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>Loading...</Text>
            </View>
          )}
          <Text style={styles.urlText}>{webURL}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  qrDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPlaceholderText: {
    color: '#888',
  },
  urlText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
});
