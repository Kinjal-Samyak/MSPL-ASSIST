import { useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/** Pinch-to-zoom + pan for a single image, built on `react-native-gesture-handler`'s composable
 * Gesture API (already an existing dependency - no Reanimated added just for this). Panning is
 * only meaningful once zoomed in; at the resting scale of 1 it has no visible effect. */
export function ZoomableImage({ uri, width, height }: ZoomableImageProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const baseScale = useRef(1);
  const baseTranslate = useRef({ x: 0, y: 0 });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = clamp(baseScale.current * event.scale, MIN_SCALE, MAX_SCALE);
      scale.setValue(nextScale);
    })
    .onEnd((event) => {
      baseScale.current = clamp(baseScale.current * event.scale, MIN_SCALE, MAX_SCALE);
      if (baseScale.current === MIN_SCALE) {
        baseTranslate.current = { x: 0, y: 0 };
        translateX.setValue(0);
        translateY.setValue(0);
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((event) => {
      if (baseScale.current <= MIN_SCALE) return;
      translateX.setValue(baseTranslate.current.x + event.translationX);
      translateY.setValue(baseTranslate.current.y + event.translationY);
    })
    .onEnd((event) => {
      if (baseScale.current <= MIN_SCALE) return;
      baseTranslate.current = {
        x: baseTranslate.current.x + event.translationX,
        y: baseTranslate.current.y + event.translationY,
      };
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, { width, height }]}>
        <Animated.Image
          source={{ uri }}
          resizeMode="contain"
          style={[styles.image, { transform: [{ translateX }, { translateY }, { scale }] }]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export const SCREEN_WIDTH = Dimensions.get('window').width;
