import { useEffect } from "react";
import { StyleSheet, type ColorValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface BolinhaPulsanteProps {
  cor: ColorValue;
}

export function BolinhaPulsante({ cor }: BolinhaPulsanteProps) {
  const progresso = useSharedValue(0);

  useEffect(() => {
    progresso.set(
      withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }), -1)
    );
  }, [progresso]);

  const estiloOnda = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - progresso.get()),
    transform: [{ scale: 1 + progresso.get() * 1.5 }],
  }));

  return (
    <Animated.View style={styles.caixa}>
      <Animated.View style={[styles.bolinha, styles.onda, { backgroundColor: cor }, estiloOnda]} />
      <Animated.View style={[styles.bolinha, { backgroundColor: cor }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    width: 8,
    height: 8,
  },
  bolinha: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onda: {
    position: "absolute",
  },
});
