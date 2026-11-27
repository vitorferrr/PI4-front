import { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const PROPORCAO_IMAGEM = 1520 / 112;

export function FaixaTopo({ altura = 56 }: { altura?: number }) {
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

  const estiloRevelado = useAnimatedStyle(() => ({ width: `${revelado.get() * 100}%` }));

  return (
    <View
      style={[styles.faixa, { height: altura }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.revelado, estiloRevelado]}>
        <Image
          source={require("../../assets/images/faixa-login.png")}
          style={{ width: altura * PROPORCAO_IMAGEM, height: altura }}
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
