import { useState } from 'react';
import { logActivity } from '../core';
import { BigButton } from '../components/BigButton';
import { Txt } from '../components/Txt';
import { colors } from '../theme';
import { SheetInput } from './SheetInput';

// Manual step entry. Steps have no automatic source in this build, so the user
// types the day's total; the board shows the latest logged value.
export function StepsSheet({ onClose, initial }: { onClose: () => void; initial?: number }) {
  const [val, setVal] = useState(initial ? String(initial) : '');
  const n = Math.round(parseFloat(val));
  const ok = Number.isFinite(n) && n >= 0;

  return (
    <>
      <SheetInput
        label="Steps today"
        value={val}
        onChangeText={setVal}
        placeholder="8000"
        keyboardType="number-pad"
        suffix="steps"
        autoFocus
      />
      <Txt size={11} w={600} color={colors.mutedDark}>
        Enter your total for today; logging again updates it.
      </Txt>
      <BigButton
        label="LOG STEPS"
        pad={14}
        disabled={!ok}
        onPress={() => {
          if (!ok) return;
          onClose();
          logActivity({
            tracker: 'steps',
            source: 'manual',
            data: { kind: 'steps', count: n },
            title: `${n.toLocaleString('en-US')} steps logged`,
          });
        }}
      />
    </>
  );
}
