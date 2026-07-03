import { TextInput, View } from 'react-native';
import { colors } from '../theme';
import { Txt } from '../components/Txt';

// Free-text/numeric input styled for the dark log sheets. Used where a preset
// row is not enough and the user needs to type an exact value (custom run
// distance and time, swim metres, step count, class name).
export function SheetInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'numeric',
  suffix,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default' | 'number-pad' | 'decimal-pad';
  suffix?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark} style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.appBg,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,.1)',
          borderRadius: 14,
          paddingHorizontal: 14,
          height: 52,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedLight}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          selectionColor={colors.accent}
          style={{
            flex: 1,
            color: colors.white,
            fontSize: 20,
            fontFamily: 'Archivo_800ExtraBold',
            padding: 0,
          }}
        />
        {suffix ? (
          <Txt size={13} w={700} color={colors.mutedDark}>
            {suffix}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}
