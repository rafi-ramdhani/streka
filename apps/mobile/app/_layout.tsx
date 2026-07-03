import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
  Archivo_900Black_Italic,
  useFonts,
} from '@expo-google-fonts/archivo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { core, useLogs } from '../src/core';
import { installNudgeScheduler } from '../src/nudges';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync();

// Kick off the SQLite hydration as early as possible.
const hydration = core.hydrate().catch((err) => {
  console.warn('streka: hydration failed', err);
  useLogs.setState({ hydrated: true });
});
void hydration;

export default function RootLayout() {
  const [loaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    Archivo_900Black_Italic,
  });
  const hydrated = useLogs((s) => s.hydrated);

  useEffect(() => {
    if (loaded && hydrated) {
      SplashScreen.hideAsync();
      installNudgeScheduler();
    }
  }, [loaded, hydrated]);

  if (!loaded || !hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.appBg },
        }}
      >
        <Stack.Screen name="session" options={{ animation: 'fade' }} />
        <Stack.Screen name="run" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="scan" options={{ animation: 'fade' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
