import { View, StyleSheet } from "react-native";
import { corDaCarga, larguraDaCarga } from "@/lib/visitas";
import { cores } from "@/theme";

export function BarraCarga({ abertas, altura = 10 }: { abertas: number; altura?: number }) {
  return (
    <View style={[styles.trilha, { height: altura }]} accessibilityElementsHidden>
      <View
        style={[
          styles.barra,
          { width: larguraDaCarga(abertas), backgroundColor: corDaCarga(abertas) },
        ]}
      />
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
