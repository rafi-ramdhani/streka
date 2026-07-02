import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screen paddings derived from the device insets. The prototype's fixed
// 64pt header offset assumed one specific iPhone; these track the actual
// notch and home-indicator sizes.
export function useScreenPad() {
  const insets = useSafeAreaInsets();
  return {
    top: Math.max(insets.top + 8, 48),
    bottom: Math.max(insets.bottom + 16, 40),
  };
}
