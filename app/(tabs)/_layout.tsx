import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account' : 'account-outline'}
              size={35}
              color="black"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'map-search' : 'map-search-outline'}
              size={30}
              color="black"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="promo"
        options={{
          title: 'Promo',
          tabBarIcon: ({ focused }) => (
            <AntDesign
              name="tags"
              size={28}
              color={focused ? 'black' : '#888'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <>
              {focused && <FontAwesome name="barcode" size={20} color="black" />}
              <Ionicons
                name="scan-outline"
                size={35}
                style={{ position: 'absolute' }}
              />
            </>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cart' : 'cart-outline'}
              size={30}
              color="black"
            />
          ),
        }}
      />
    </Tabs>
  );
}
