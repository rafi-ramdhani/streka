import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { colors } from '../theme';
import { Txt } from './Txt';

// Real route map (react-native-maps) with the design's rounded frame. Until
// GPS fixes arrive the striped-style placeholder label shows instead, so the
// designed empty state survives for quick logs and fresh runs.
export function RouteMap({
  points,
  follow = false,
  minHeight,
  fallbackLabel,
}: {
  points: [number, number][];
  follow?: boolean;
  minHeight: number;
  fallbackLabel: string;
}) {
  const ref = useRef<MapView>(null);
  const coords = points.map(([latitude, longitude]) => ({ latitude, longitude }));
  const last = coords[coords.length - 1];

  useEffect(() => {
    if (!ref.current) return;
    if (follow && last) {
      ref.current.animateToRegion(
        { ...last, latitudeDelta: 0.004, longitudeDelta: 0.004 },
        300,
      );
    } else if (coords.length > 1) {
      ref.current.fitToCoordinates(coords, {
        edgePadding: { top: 30, right: 30, bottom: 30, left: 30 },
        animated: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.length, follow]);

  if (!last) {
    return (
      <View
        style={{
          flex: 1,
          minHeight,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: colors.tile,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(19,23,18,.85)',
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}
        >
          <Txt size={11} w={600} color={colors.mutedDark} ls={0.06} style={{ fontFamily: 'Menlo' }}>
            {fallbackLabel}
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight, borderRadius: 20, overflow: 'hidden' }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        initialRegion={{ ...last, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
        showsUserLocation={follow}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
      >
        <Polyline
          coordinates={coords}
          strokeColor={colors.accent}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
      </MapView>
    </View>
  );
}
