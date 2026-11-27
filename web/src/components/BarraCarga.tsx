import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useCrescer } from "@/hooks/use-crescer";
import { corDaCarga, larguraDaCarga } from "@/lib/visitas";
import { cores } from "@/theme";

export function BarraCarga({ abertas, altura = 10 }: { abertas: number; altura?: number }) {
  const progresso = useCrescer(150);
  const porcentagem = parseFloat(larguraDaCarga(abertas));
  const estilo = useAnimatedStyle(
    () => ({ width: `${porcentagem * progresso.get()}%` }),
    [porcentagem]
  );

  return (
    <View style={[styles.trilha, { height: altura }]} accessibilityElementsHidden>
      <Animated.View style={[styles.barra, { backgroundColor: corDaCarga(abertas) }, estilo]} />
    </View>
  );
}

const styles = StyleSheet.create({
  trilha: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: cores.trilha,
  },
  barra: {
    height: "100%",
    borderRadius: 999,
  },
});
