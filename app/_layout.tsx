import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { useAuth } from '@/src/hooks/useAuth';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoading, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inSetup = segments.some((s) => s === ('setup-profile' as any));

    if (!profile?.display_name && !inSetup) {
      router.replace('/setup-profile' as any);
    }
  }, [isLoading, profile, segments, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="household-setup" options={{ headerShown: true, title: 'Set Up Household', presentation: 'modal' }} />
        <Stack.Screen name="create-task" options={{ headerShown: true, title: 'New Task', presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="task/edit/[id]" options={{ headerShown: true, title: 'Edit Task', presentation: 'modal' }} />
        <Stack.Screen name="setup-profile" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
