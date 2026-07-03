import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { TrackerId } from '@streka/core';
import { useSettings } from '../../src/core';
import { SubHeader } from '../../src/components/SubHeader';
import { Txt } from '../../src/components/Txt';
import { useScreenPad } from '../../src/lib/screenPad';
import { useTileOrder } from '../../src/stores/tileOrder';
import { colors } from '../../src/theme';

const LABEL: Record<TrackerId, string> = {
  steps: 'Steps',
  workouts: 'Workout',
  meals: 'Meals',
  running: 'Run',
  weight: 'Weight',
  swimming: 'Swim',
  classes: 'Class',
  sleep: 'Sleep',
};

const ROW_H = 60;
const GAP = 8;

type Positions = Record<string, number>;

// Resting Y for a slot index. A worklet so it can run on the UI thread inside
// the gesture and animation callbacks.
function slotY(index: number): number {
  'worklet';
  return index * (ROW_H + GAP);
}

// Shift positions when the dragged row moves from -> to, sliding the rows in
// between. Runs on the UI thread.
function objectMove(positions: Positions, from: number, to: number): Positions {
  'worklet';
  const next: Positions = { ...positions };
  for (const id in positions) {
    if (positions[id] === from) next[id] = to;
    else if (from < to && positions[id]! > from && positions[id]! <= to) next[id] = positions[id]! - 1;
    else if (from > to && positions[id]! < from && positions[id]! >= to) next[id] = positions[id]! + 1;
  }
  return next;
}

function GripIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path
        d="M3 5.5h12 M3 9h12 M3 12.5h12"
        stroke={colors.mutedDark}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DragRow({
  id,
  picked,
  positions,
  activeId,
  count,
  onCommit,
}: {
  id: TrackerId;
  picked: boolean;
  positions: ReturnType<typeof useSharedValue<Positions>>;
  activeId: ReturnType<typeof useSharedValue<string | null>>;
  count: number;
  onCommit: () => void;
}) {
  const top = useSharedValue(slotY(positions.value[id] ?? 0));
  const isActive = useSharedValue(false);
  const startTop = useSharedValue(0);

  // Follow the shared positions unless this row is the one being dragged.
  useAnimatedReaction(
    () => positions.value[id] ?? 0,
    (pos) => {
      if (!isActive.value) top.value = withSpring(slotY(pos), { damping: 20 });
    },
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      isActive.value = true;
      activeId.value = id;
      startTop.value = top.value;
    })
    .onUpdate((e) => {
      top.value = startTop.value + e.translationY;
      const cur = positions.value[id] ?? 0;
      let next = Math.round(top.value / (ROW_H + GAP));
      if (next < 0) next = 0;
      if (next > count - 1) next = count - 1;
      if (next !== cur) positions.value = objectMove(positions.value, cur, next);
    })
    .onEnd(() => {
      top.value = withSpring(slotY(positions.value[id] ?? 0), { damping: 20 });
    })
    .onFinalize(() => {
      if (isActive.value) {
        isActive.value = false;
        activeId.value = null;
        runOnJS(onCommit)();
      }
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: top.value,
    height: ROW_H,
    zIndex: isActive.value ? 10 : 0,
    transform: [{ scale: withSpring(isActive.value ? 1.03 : 1) }],
    opacity: isActive.value ? 0.97 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <View
          style={{
            flex: 1,
            marginHorizontal: 0,
            backgroundColor: colors.tile,
            borderRadius: 16,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Txt size={15} w={800} color={picked ? colors.white : colors.mutedDark}>
              {LABEL[id]}
            </Txt>
            {!picked ? (
              <Txt size={10.5} w={700} ls={0.04} upper color={colors.mutedLight}>
                hidden
              </Txt>
            ) : null}
          </View>
          <GripIcon />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function Reorder() {
  const pad = useScreenPad();
  const order = useTileOrder((s) => s.order);
  const setOrder = useTileOrder((s) => s.setOrder);
  const picked = useSettings((s) => s.picked);
  // Snapshot the order once so the list is stable while dragging; commit to the
  // store on every drop.
  const [ids] = useState<TrackerId[]>(() => order);

  const positions = useSharedValue<Positions>(
    Object.fromEntries(ids.map((id, i) => [id, i])) as Positions,
  );
  const activeId = useSharedValue<string | null>(null);

  const commit = useCallback(() => {
    const p = positions.value;
    const next = [...ids].sort((a, b) => (p[a] ?? 0) - (p[b] ?? 0));
    setOrder(next);
  }, [ids, positions, setOrder]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg, paddingTop: pad.top }}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <SubHeader title="Reorder board" />
        <Txt size={12.5} w={600} color={colors.mutedDark} lineHeight={1.45}>
          Hold a tile, then drag to move it. Hidden tiles (turned off in My board) still
          keep their place for when you turn them back on.
        </Txt>
        <View style={{ height: ids.length * (ROW_H + GAP), marginTop: 4 }}>
          {ids.map((id) => (
            <DragRow
              key={id}
              id={id}
              picked={!!picked[id]}
              positions={positions}
              activeId={activeId}
              count={ids.length}
              onCommit={commit}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
