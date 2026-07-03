import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Modal, Platform, Pressable, View } from 'react-native';
import { colors } from '../theme';
import { Txt } from './Txt';
import { formatDateLine } from '../lib/dates';

// Bottom sheet shell (Proto:628-636): scrim, 28-radius card, drag handle,
// title with today's date on the baseline.
export function LogSheet({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  // Lift the sheet above the keyboard so its inputs and Save button stay
  // visible when a text field is focused.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.55)' }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: kbHeight,
          backgroundColor: colors.tile,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: 44,
          gap: 14,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: -12 },
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) },
          ],
        }}
      >
        <View
          style={{
            width: 40,
            height: 5,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,.2)',
            alignSelf: 'center',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <Txt size={24} w={900} ls={-0.02}>
            {title}
          </Txt>
          <Txt size={12} w={700} color={colors.mutedDark}>
            {formatDateLine(new Date())}
          </Txt>
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}
