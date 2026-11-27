import { useEffect } from "react";
import { View, Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const PROPORCAO_IMAGEM = 780 / 88;

export function FaixaTopo() {
  const { width } = useWindowDimensions();
  const altura = width / PROPORCAO_IMAGEM;
  const revelado = useSharedValue(0);

  useEffect(() => {
    revelado.set(
      withTiming(1, {
        duration: 1100,
        easing: Easing.out(Easing.exp),
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [revelado]);

  const estiloRevelado = useAnimatedStyle(() => ({ width: revelado.get() * width }), [width]);

  return (
    <View
      style={[styles.faixa, { height: altura }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.revelado, estiloRevelado]}>
        <Image
          source={require("../../assets/images/faixa-topo.png")}
          style={{ width, height: altura }}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    overflow: "hidden",
  },
  revelado: {
    height: "100%",
    overflow: "hidden",
  },
});
