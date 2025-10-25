import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as cell from 'expo-cellular';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSignedIn, setIsSignedIn] = useState<boolean | undefined>(false);

  useEffect(() => {
    const fetchNetworkCode = async () => {
      await cell.getMobileNetworkCodeAsync().then((res) => {
        if (res && res.length) return setIsSignedIn(true);
      }).catch((e) => console.error("Error in getMobileNetworkCodeAsync", e));
    };

    fetchNetworkCode();
  }, []);

  useEffect(() => {
    if (isSignedIn === undefined) return console.error('isSignedIn is undefined');
  }, [isSignedIn])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
