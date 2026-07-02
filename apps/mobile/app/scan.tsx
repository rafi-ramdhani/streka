import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { scanRange } from '@streka/core';
import { colors } from '../src/theme';
import { Pressable98 } from '../src/components/Pressable98';
import { SlashMark } from '../src/components/SlashMark';
import { Txt } from '../src/components/Txt';
import { useFoodScan } from '../src/stores/foodScan';
import { goBack } from '../src/lib/nav';

// Fallback when there is no captured photo (no permission, no hardware, or
// a dev-seeded scan). The kcal numbers stay mocked until the LLM backend
// lands (TAD 5.2); the viewfinder and photos are real.
function PhotoPlaceholder({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        backgroundColor: colors.tile,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt size={8.5} w={600} color={colors.mutedDark} style={{ fontFamily: 'Menlo' }}>
        photo
      </Txt>
    </View>
  );
}

function ScanPhoto({ size }: { size: number }) {
  const uri = useFoodScan((s) => s.photoUri);
  if (!uri) return <PhotoPlaceholder size={size} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 16 }} />;
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = {
    position: 'absolute' as const,
    width: 34,
    height: 34,
    borderColor: colors.accentOnDark,
  };
  const styles = {
    tl: { top: 0, left: 0, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderTopLeftRadius: 10 },
    tr: { top: 0, right: 0, borderTopWidth: 3.5, borderRightWidth: 3.5, borderTopRightRadius: 10 },
    bl: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 3.5,
      borderLeftWidth: 3.5,
      borderBottomLeftRadius: 10,
    },
    br: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 3.5,
      borderRightWidth: 3.5,
      borderBottomRightRadius: 10,
    },
  } as const;
  return <View style={[base, styles[pos]]} />;
}

function Camera() {
  const scan = useFoodScan();
  const camRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const live = permission?.granted === true;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  // If the camera cannot deliver a shot (simulator, denied permission), the
  // scan still runs; the result just shows the placeholder thumbnail.
  const snap = async () => {
    let uri: string | undefined;
    try {
      const photo = await camRef.current?.takePictureAsync({ quality: 0.6 });
      uri = photo?.uri;
    } catch {
      uri = undefined;
    }
    await scan.takePhoto(uri);
  };

  const pickFromPhotos = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });
      if (!res.canceled && res.assets[0]) await scan.takePhoto(res.assets[0].uri);
    } catch {
      // Picker unavailable; stay on the camera.
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0d09' }}>
      {live ? (
        <CameraView
          ref={camRef}
          facing="back"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 20,
          zIndex: 2,
        }}
      >
        <Pressable98
          onPress={() => {
            scan.close();
            goBack();
          }}
          scaleTo={0.95}
          style={{
            backgroundColor: 'rgba(10,13,9,.7)',
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}
        >
          <Txt size={13} w={800}>
            Cancel
          </Txt>
        </Pressable98>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(10,13,9,.7)',
            borderRadius: 999,
            paddingVertical: 7,
            paddingHorizontal: 13,
          }}
        >
          <SlashMark size={11} color={colors.accentOnDark} />
          <Txt size={11} w={700} color={colors.accentOnDark}>
            Scan food
          </Txt>
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 260, height: 260, marginTop: -40 }}>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
          {live ? null : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: 'rgba(10,13,9,.75)',
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                }}
              >
                <Txt
                  size={11}
                  w={600}
                  color={colors.mutedDark}
                  ls={0.06}
                  style={{ fontFamily: 'Menlo' }}
                >
                  camera · your plate
                </Txt>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: 150, left: 0, right: 0 }}>
        <Txt size={12.5} w={700} center color="rgba(255,255,255,.75)">
          Get the whole plate in frame — sides too
        </Txt>
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 52,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 34,
        }}
      >
        <Pressable98
          onPress={() => void pickFromPhotos()}
          scaleTo={0.93}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={9.5} w={800} color="#c7cec6" center lineHeight={1.2}>
            FROM{'\n'}PHOTOS
          </Txt>
        </Pressable98>
        <Pressable98
          onPress={() => void snap()}
          scaleTo={0.93}
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            borderWidth: 5,
            borderColor: colors.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.accent }}
          />
        </Pressable98>
        <Pressable98
          onPress={() => {
            scan.close();
            goBack();
          }}
          scaleTo={0.93}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={9} w={800} color="#c7cec6" center lineHeight={1.2}>
            TYPE{'\n'}INSTEAD
          </Txt>
        </Pressable98>
      </View>
    </View>
  );
}

function Analyzing() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0a0d09',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <SlashMark size={54} color={colors.accentOnDark} />
      <Txt size={20} w={900}>
        Reading your plate…
      </Txt>
      <Txt size={12.5} w={600} color={colors.mutedDark}>
        Usually a couple of seconds
      </Txt>
    </View>
  );
}

function Result() {
  const scan = useFoodScan();
  const total = scan.total();
  const ings = scan.ingredients();

  const portionBtn = (p: 's' | 'm' | 'l', label: string) => {
    const on = scan.portion === p;
    return (
      <Pressable98
        key={p}
        onPress={() => scan.setPortion(p)}
        style={{
          flex: 1,
          alignItems: 'center',
          paddingVertical: 9,
          borderRadius: 999,
          backgroundColor: on ? colors.accent : 'transparent',
        }}
      >
        <Txt size={12.5} w={800} color={on ? colors.ink : colors.mutedDark}>
          {label}
        </Txt>
      </Pressable98>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 20, gap: 13 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Txt size={16} w={900}>
            Scan result
          </Txt>
          <View
            style={{
              backgroundColor: 'rgba(23,194,95,.15)',
              borderRadius: 999,
              paddingVertical: 5,
              paddingHorizontal: 11,
            }}
          >
            <Txt size={10.5} w={800} color={colors.accentOnDark}>
              AI ESTIMATE · ±20%
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <ScanPhoto size={64} />
          <View>
            <Txt size={20} w={900} lineHeight={1.1}>
              {scan.result?.dish ?? ''}
            </Txt>
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 4 }}
            >
              <Txt size={26} w={900} color={colors.accentOnDark}>
                {scanRange(total)}
              </Txt>
              <Txt size={13} w={700} color={colors.mutedDark}>
                kcal
              </Txt>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.tile,
            borderRadius: 999,
            padding: 3,
          }}
        >
          {portionBtn('s', 'Small')}
          {portionBtn('m', 'Medium')}
          {portionBtn('l', 'Large')}
        </View>

        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
        >
          <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
            What the model sees
          </Txt>
          <Txt size={11} w={700} color={colors.mutedDark}>
            tap to remove
          </Txt>
        </View>

        <View style={{ gap: 8 }}>
          {ings.map((ing, i) => {
            const removed = scan.removed[i] ?? false;
            return (
              <Pressable98
                key={`${ing.name}-${i}`}
                onPress={() => scan.toggleIngredient(i)}
                style={{
                  backgroundColor: colors.tile,
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: removed ? 0.55 : 1,
                }}
              >
                <Txt
                  size={14}
                  w={800}
                  style={{ textDecorationLine: removed ? 'line-through' : 'none' }}
                >
                  {ing.name}
                </Txt>
                <Txt size={12.5} w={800} color={colors.mutedDark}>
                  {removed ? 'removed' : `~${ing.kcal} kcal`}
                </Txt>
              </Pressable98>
            );
          })}
          <Pressable98
            onPress={scan.addIngredient}
            style={{
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,.25)',
              borderRadius: 16,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Txt size={13} w={800} color={colors.mutedDark}>
              + Add ingredient
            </Txt>
          </Pressable98>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
      >
        <Pressable98
          onPress={scan.retake}
          scaleTo={0.97}
          style={{
            paddingVertical: 15,
            paddingHorizontal: 18,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,.08)',
          }}
        >
          <Txt size={14} w={800} color={colors.mutedDark}>
            Retake
          </Txt>
        </Pressable98>
        <Pressable98
          onPress={() => {
            scan.logResult();
            goBack();
          }}
          scaleTo={0.97}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 15,
            borderRadius: 16,
            backgroundColor: colors.accent,
          }}
        >
          <Txt size={14} w={900} ls={0.02} color={colors.ink}>
            LOG ~{total} KCAL
          </Txt>
        </Pressable98>
      </View>
    </View>
  );
}

function Unsure() {
  const scan = useFoodScan();
  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View style={{ flex: 1, paddingTop: 64, paddingHorizontal: 20, gap: 14 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Txt size={16} w={900}>
            Scan result
          </Txt>
          <View
            style={{
              backgroundColor: colors.amberBg,
              borderRadius: 999,
              paddingVertical: 5,
              paddingHorizontal: 11,
            }}
          >
            <Txt size={10.5} w={800} color={colors.amber}>
              NOT SURE
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <ScanPhoto size={64} />
          <Txt size={14.5} w={700} lineHeight={1.4} color="#c7cec6" style={{ flex: 1 }}>
            Hard to tell from this angle — pick the closest:
          </Txt>
        </View>

        <View style={{ gap: 8 }}>
          {(scan.result?.matches ?? []).map((m) => (
            <Pressable98
              key={m.name}
              onPress={() => {
                scan.logMatch(m.name, m.kcal);
                goBack();
              }}
              style={{
                backgroundColor: colors.tile,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,.08)',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Txt size={14.5} w={800}>
                  {m.name}
                </Txt>
                <Txt size={11} w={600} color={colors.mutedDark} style={{ marginTop: 1 }}>
                  {m.likely ? 'most likely' : 'possible'}
                </Txt>
              </View>
              <Txt size={12.5} w={800} color={m.likely ? colors.accentOnDark : colors.mutedDark}>
                ~{m.kcal} kcal
              </Txt>
            </Pressable98>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable98
            onPress={scan.retake}
            style={{
              flex: 1,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,.25)',
              borderRadius: 16,
              padding: 13,
              alignItems: 'center',
            }}
          >
            <Txt size={13} w={800}>
              Retake photo
            </Txt>
          </Pressable98>
          <Pressable98
            onPress={() => {
              scan.close();
              goBack();
            }}
            style={{
              flex: 1,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,.25)',
              borderRadius: 16,
              padding: 13,
              alignItems: 'center',
            }}
          >
            <Txt size={13} w={800}>
              Type it in
            </Txt>
          </Pressable98>
        </View>
      </View>
    </View>
  );
}

export default function Scan() {
  const mode = useFoodScan((s) => s.mode);
  const openCamera = useFoodScan((s) => s.openCamera);
  const devMode = useLocalSearchParams<{ dev?: string }>().dev;

  // Dev param drives the mock scan for screenshot verification: the mock
  // alternates high/low confidence, so one shot lands on result, two on unsure.
  useFocusEffect(
    useCallback(() => {
      const scan = useFoodScan.getState();
      if (__DEV__ && devMode) {
        scan.openCamera();
        if (devMode === 'result') void scan.takePhoto();
        if (devMode === 'unsure') void scan.takePhoto().then(() => scan.takePhoto());
        return;
      }
      if (scan.mode === null) openCamera();
    }, [openCamera, devMode]),
  );

  if (mode === 'analyzing') return <Analyzing />;
  if (mode === 'result') return <Result />;
  if (mode === 'unsure') return <Unsure />;
  return <Camera />;
}
