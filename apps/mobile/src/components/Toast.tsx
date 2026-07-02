import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useToast } from '../core';
import { colors } from '../theme';
import { Check } from './Check';
import { Txt } from './Txt';

// Bottom toast (Proto:708-714): fixed above the tab bar, non-interactive.
export function Toast() {
  const toast = useToast((s) => s.toast);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
  }, [toast, anim]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: 110,
        backgroundColor: 'rgba(29,35,28,.97)',
        borderWidth: 1,
        borderColor: colors.dividerOnDark,
        borderRadius: 16,
        paddingVertical: 13,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 10 },
        zIndex: 5,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: 'rgba(255,255,255,.08)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={13} w={800}>
          {toast.title}
        </Txt>
        <Txt size={11} w={600} color={colors.mutedDark}>
          {toast.sub}
        </Txt>
      </View>
    </Animated.View>
  );
}
