import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors } from '../theme';
import { useScreenPad } from '../lib/screenPad';
import { ProgressSegments } from './ProgressSegments';
import { Txt } from './Txt';

// Shared frame for onboarding steps 2-5 (Proto:46-165): dark screen, 5-segment
// progress bar, 28/900 headline, muted sub, content, pinned footer.
export function ObFrame({
  step,
  headline,
  sub,
  children,
  footer,
}: {
  step: 2 | 3 | 4 | 5;
  headline: string;
  sub: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const pad = useScreenPad();
  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View style={{ flex: 1, paddingTop: pad.top, paddingHorizontal: 22, gap: 16 }}>
        <ProgressSegments total={5} filled={step} />
        <View>
          <Txt size={28} w={900} ls={-0.02} lineHeight={1.1}>
            {headline}
          </Txt>
          <Txt size={13} w={600} color={colors.mutedDark} style={{ marginTop: 8 }}>
            {sub}
          </Txt>
        </View>
        {children}
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 22, paddingBottom: pad.bottom, gap: 10 }}>
        {footer}
      </View>
    </View>
  );
}
