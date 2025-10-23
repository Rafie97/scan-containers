import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { AntDesign as Ant, MaterialCommunityIcons as Material, Ionicons as Ion } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/Components/DefaultExpoComponents/useColorScheme';
import useAuth from '@/Auth_Components/AuthContext';
import loadItems from '@/Reducers/actions/loadItems';
import { useDispatch } from '@/Reducers/store';
import loadMap from '@/Reducers/actions/loadMap';
import { loadUser } from '@/Reducers/actions/loadUser';
import loadCart from '@/Reducers/actions/loadCart';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const user = useAuth()
  const dispatch = useDispatch();

  useEffect(() => {
    loadItems(dispatch);
    loadMap(dispatch);
  }, []);

  useEffect(() => {
    if (user && user.uid) {
      loadUser(dispatch, user.uid);
      loadCart(dispatch, user.uid);
    }
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
        tabBarShowLabel: false
      }}>
      <Tabs.Screen
        name="Account"
        options={{
          // title: 'Account',
          headerShown: false,
          tabBarIcon: ({ focused }) => <Material
            name={focused ? 'account' : 'account-outline'}
            size={35}
            color="black"
          />
        }}
      />

      <Tabs.Screen
        name="Map"
        options={{
          // title: 'Map',
          tabBarIcon: ({ focused }) => <Material
            name={focused ? 'map-search' : 'map-search-outline'}
            size={30}
            color="black"
          />,
        }}
      />
      <Tabs.Screen
        name="Promo"
        options={{
          title: 'Promo',
          tabBarIcon: ({ focused }) => <Ant name={focused ? 'tags' : 'tagso'} size={35} />,
        }}
      />
      <Tabs.Screen
        name="Scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) =>
            <>
              {focused && (<FontAwesome name="barcode" size={20} color="black" />)}
              <Ion
                name="scan-outline"
                size={35}
                style={{
                  position: 'absolute',
                }}
              />

            </>
        }}
      />
      <Tabs.Screen
        name="Cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => <Material
            name={focused ? 'cart' : 'cart-outline'}
            size={30}
            color="black"
          />,
        }}
      />
    </Tabs>
  );
}
