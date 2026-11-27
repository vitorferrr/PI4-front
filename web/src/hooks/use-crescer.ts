import { useEffect } from "react";
import { Easing, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

export function useCrescer(atraso = 0) {
  const progresso = useSharedValue(0);

  useEffect(() => {
    progresso.set(
      withDelay(atraso, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }))
    );
  }, [progresso, atraso]);

  return progresso;
}
