import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { adminApi, AuthUser } from '@/services/api';

export default function UsersManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin': return styles.badgeAdmin;
      case 'manager': return styles.badgeManager;
      default: return styles.badgeUser;
    }
  };

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      <Text style={styles.subtitle}>{users.length} registered users</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView style={styles.userList}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.cellName]}>Name</Text>
          <Text style={[styles.tableCell, styles.cellEmail]}>Email</Text>
          <Text style={[styles.tableCell, styles.cellRole]}>Role</Text>
          <Text style={[styles.tableCell, styles.cellActions]}>Actions</Text>
        </View>

        {users.map(user => (
          <View key={user.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.cellName]}>{user.name}</Text>
            <Text style={[styles.tableCell, styles.cellEmail]}>{user.email}</Text>
            <View style={[styles.tableCell, styles.cellRole]}>
              <View style={[styles.badge, getRoleBadgeStyle(user.role)]}>
                <Text style={styles.badgeText}>{user.role}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.cellActions]}>
              <TouchableOpacity
                style={[styles.roleBtn, user.role === 'user' && styles.roleBtnActive]}
                onPress={() => updateRole(user.id, 'user')}
              >
                <Text style={styles.roleBtnText}>User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, user.role === 'manager' && styles.roleBtnActive]}
                onPress={() => updateRole(user.id, 'manager')}
              >
                <Text style={styles.roleBtnText}>Manager</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, user.role === 'admin' && styles.roleBtnActive]}
                onPress={() => updateRole(user.id, 'admin')}
              >
                <Text style={styles.roleBtnText}>Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  error: { color: '#c0392b', backgroundColor: '#fdeaea', padding: 10, borderRadius: 8, marginBottom: 15 },
  userList: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 15,
    alignItems: 'center',
  },
  tableCell: { paddingHorizontal: 10 },
  cellName: { flex: 1, fontWeight: '500' },
  cellEmail: { flex: 2, color: '#666' },
  cellRole: { width: 100 },
  cellActions: { width: 250, flexDirection: 'row', gap: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  badgeAdmin: { backgroundColor: '#e74c3c' },
  badgeManager: { backgroundColor: '#f39c12' },
  badgeUser: { backgroundColor: '#3498db' },
  badgeText: { color: '#fff', fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },
  roleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  roleBtnActive: { backgroundColor: '#0073FE' },
  roleBtnText: { fontSize: 12, fontWeight: '500' },
});
