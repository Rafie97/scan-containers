import React from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

// Web-only admin layout
export default function AdminLayout() {
  const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
});
