import { View } from 'react-native';
import { showToast, useSettings, useSync } from '../core';
import { colors } from '../theme';
import { Pressable98 } from './Pressable98';
import { Txt } from './Txt';

// 3-state sync indicator (product rule 3/4). Tapping simulates offline in dev
// builds only, with the prototype's explanatory toasts; a production build
// shows the same status toast for account-less users but never flips state.
export function SyncPill() {
  const hasAccount = useSettings((s) => s.hasAccount);
  const online = useSync((s) => s.online);
  const setOnline = useSync((s) => s.setOnline);

  const dot = !hasAccount ? colors.mutedLight : online ? colors.accent : colors.mutedLight;
  const text = !hasAccount ? 'On this phone' : online ? 'Synced' : 'Offline';

  const onTap = () => {
    if (!hasAccount) {
      showToast(
        'No account yet',
        'Your data stays on this phone — add an account later in Settings',
      );
      return;
    }
    if (!__DEV__) return;
    const goingOnline = !online;
    setOnline(goingOnline);
    showToast(
      goingOnline ? 'Back online' : 'You’re offline',
      goingOnline
        ? 'All changes synced to your account'
        : 'Logging still works — everything saves on this phone',
    );
  };

  return (
    <Pressable98
      onPress={onTap}
      scaleTo={0.95}
      hitSlop={10}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,.06)',
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 10,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} />
      <Txt size={11} w={700} color={colors.mutedDark}>
        {text}
      </Txt>
    </Pressable98>
  );
}
