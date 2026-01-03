import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { setupApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminSetup() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const checkSetupStatus = async () => {
    try {
      const { needsSetup } = await setupApi.checkStatus();
      setNeedsSetup(needsSetup);
      if (!needsSetup) {
        router.replace('/admin/login');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setCheckingSetup(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      checkSetupStatus();
    }
  }, []);

  // Web-only
  if (Platform.OS !== 'web') {
    return <Redirect href="/" />;
  }

  const handleSubmit = async () => {
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { user, token } = await setupApi.initialize(username, password);
      await setSession(user, token);

      // Store setup info for the welcome modal
      await AsyncStorage.setItem('setup_complete', JSON.stringify({
        username,
        createdAt: new Date().toISOString(),
      }));

      router.replace('/admin');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.loadingText}>Connecting to server...</Text>
        </View>
      </View>
    );
  }

  if (!needsSetup) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>First Time Setup</Text>
        <Text style={styles.subtitle}>Create your admin account</Text>
        <Text style={styles.description}>
          This is the first time running the server. Create your administrator account to get started.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="admin"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoFocus
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </Text>
        </TouchableOpacity>
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
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginBottom: 30,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  error: {
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fdeaea',
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#0073FE',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
