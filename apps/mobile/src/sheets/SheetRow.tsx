import { colors } from '../theme';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';

// Dark option row used across sheets: label left, green meta right.
export function SheetRow({
  label,
  meta,
  onPress,
}: {
  label: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable98
      onPress={onPress}
      style={{
        backgroundColor: colors.appBg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,.08)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 44,
      }}
    >
      <Txt size={15} w={800}>
        {label}
      </Txt>
      <Txt size={13} w={800} color={colors.accentOnDark}>
        {meta}
      </Txt>
    </Pressable98>
  );
}
