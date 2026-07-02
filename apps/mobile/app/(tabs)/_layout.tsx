import { Redirect, Tabs, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../src/core';
import { colors, fonts } from '../../src/theme';

// Structural subset of the router's tab-bar props; expo-router vendors its
// own @react-navigation types, so we avoid importing them directly.
interface TabBarProps {
  state: { index: number };
  navigation: { navigate: (name: string) => void };
}

const TABS = [
  { name: 'index', label: 'Board', shape: 'square' },
  { name: 'trends', label: 'Trends', shape: 'square' },
  { name: 'goals', label: 'Goals', shape: 'circle' },
] as const;

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 10,
        paddingHorizontal: 40,
        paddingBottom: Math.max(insets.bottom, 12) + 6,
        backgroundColor: 'rgba(19,23,18,.94)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,.08)',
      }}
    >
      {TABS.map((tab, i) => {
        const active = state.index === i;
        return (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={({ pressed }) => ({
              alignItems: 'center',
              gap: 3,
              paddingVertical: 2,
              paddingHorizontal: 10,
              minWidth: 44,
              minHeight: 44,
              justifyContent: 'center',
              opacity: active ? 1 : 0.4,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: tab.shape === 'circle' ? 10 : 6,
                backgroundColor: active ? colors.accent : colors.white,
              }}
            />
            <Text style={{ fontSize: 10, fontFamily: fonts.bold, color: colors.white }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Android back inside the tabs: any non-Board tab returns to the Board
// first; from the Board the system default applies (exit the app).
function useBoardFirstBack() {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pathname === '/') return false;
      router.navigate('/');
      return true;
    });
    return () => sub.remove();
  }, [pathname]);
}

export default function TabsLayout() {
  const onboarded = useSettings((s) => s.onboarded);
  useBoardFirstBack();
  if (!onboarded) return <Redirect href="/onboarding/welcome" />;

  return (
    <Tabs
      tabBar={({ state, navigation }) => <TabBar state={state} navigation={navigation} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.appBg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="trends" />
      <Tabs.Screen name="goals" />
    </Tabs>
  );
}
