import React, { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

// Web-only admin layout
export default function AdminLayout() {
  const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showWelcome, setShowWelcome] = useState(false);
  const [setupInfo, setSetupInfo] = useState<{ username: string; createdAt: string } | null>(null);

  // Check for setup completion flag
  useEffect(() => {
    const checkSetupComplete = async () => {
      try {
        const data = await AsyncStorage.getItem('setup_complete');
        if (data) {
          setSetupInfo(JSON.parse(data));
          setShowWelcome(true);
        }
      } catch (e) {
        // ignore
      }
    };
    if (isAuthenticated && isAdmin) {
      checkSetupComplete();
    }
  }, [isAuthenticated, isAdmin]);

  const dismissWelcome = async () => {
    await AsyncStorage.removeItem('setup_complete');
    setShowWelcome(false);
  };

  const downloadCredentials = () => {
    const content = `# Scan App - Setup Credentials
# Created: ${setupInfo?.createdAt ? new Date(setupInfo.createdAt).toLocaleString() : 'Unknown'}

Admin Username: ${setupInfo?.username || 'Unknown'}
Server URL: ${window.location.origin}

## Database Credentials
Your database credentials were auto-generated and saved to the .env file on your server.
Location: /path/to/your/project/.env

IMPORTANT: Keep the .env file backed up securely for recovery purposes.

## Recovery
If you lose access to the .env file, see the project documentation for recovery options.
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shopapp-credentials.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Redirect non-web users
  if (Platform.OS !== 'web') {
    return <Redirect href="/" />;
  }

  // Show loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Redirect to login if not authenticated (except on login/setup pages)
  const isAuthPage = pathname.includes('/admin/login') || pathname.includes('/admin/setup');
  if (!isAuthenticated && !isAuthPage) {
    return <Redirect href="/admin/login" />;
  }

  // Redirect non-admins to main app
  if (isAuthenticated && !isAdmin && !isAuthPage) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      {isAuthenticated && (
        <View style={styles.sidebar}>
          <Text style={styles.logo}>Admin Portal</Text>
          <Text style={styles.userInfo}>{user?.name}</Text>
          <Text style={styles.roleInfo}>{user?.role}</Text>

          <View style={styles.nav}>
            <NavLink href="/admin" label="Dashboard" active={pathname === '/admin'} />
            <NavLink href="/admin/inventory" label="Inventory" active={pathname.includes('/admin/inventory')} />
            <NavLink href="/admin/promos" label="Promos & Sales" active={pathname.includes('/admin/promos')} />
            <NavLink href="/admin/map" label="Store Map" active={pathname.includes('/admin/map')} />
            <NavLink href="/admin/recipes" label="Recipes" active={pathname.includes('/admin/recipes')} />
            <NavLink href="/admin/users" label="Users" active={pathname.includes('/admin/users')} />
            <NavLink href="/admin/preview" label="Device Preview" active={pathname.includes('/admin/preview')} />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/')}>
            <Text style={styles.backText}>← Back to App</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.main}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="setup" />
          <Stack.Screen name="inventory" />
          <Stack.Screen name="promos" />
          <Stack.Screen name="map" />
          <Stack.Screen name="recipes" />
          <Stack.Screen name="users" />
          <Stack.Screen name="preview" />
        </Stack>
      </View>

      <Modal visible={showWelcome} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>✓</Text>
            <Text style={styles.modalTitle}>Setup Complete!</Text>
            <Text style={styles.modalSubtitle}>
              Your admin account has been created successfully.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Important: Save Your Credentials</Text>
              <Text style={styles.infoText}>
                Your database credentials were auto-generated and saved to the .env file on your server.
              </Text>
              <Text style={styles.infoText}>
                Download a backup of your setup information for your records.
              </Text>
            </View>

            <TouchableOpacity style={styles.downloadBtn} onPress={downloadCredentials}>
              <Text style={styles.downloadBtnText}>Download Credentials</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={dismissWelcome}>
              <Text style={styles.dismissBtnText}>Continue to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.navLink, active && styles.navLinkActive]}
      onPress={() => router.push(href as any)}
    >
      <Text style={[styles.navLinkText, active && styles.navLinkTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  userInfo: {
    color: '#ccc',
    fontSize: 14,
  },
  roleInfo: {
    color: '#888',
    fontSize: 12,
    marginBottom: 30,
    textTransform: 'uppercase',
  },
  nav: {
    flex: 1,
  },
  navLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  navLinkActive: {
    backgroundColor: '#0073FE',
  },
  navLinkText: {
    color: '#ccc',
    fontSize: 16,
  },
  navLinkTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#c0392b',
    marginBottom: 10,
  },
  logoutText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: 12,
  },
  backText: {
    color: '#888',
    textAlign: 'center',
  },
  main: {
    flex: 1,
    padding: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
  },
  modalIcon: {
    fontSize: 64,
    textAlign: 'center',
    color: '#27ae60',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#0073FE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
    lineHeight: 18,
  },
  downloadBtn: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  downloadBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissBtn: {
    backgroundColor: '#0073FE',
    padding: 16,
    borderRadius: 8,
  },
  dismissBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
