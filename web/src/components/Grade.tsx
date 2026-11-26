import { Children, useState, type ReactNode } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

const ESPACO = 14;

function colunasPorLargura(largura: number) {
  if (largura >= 1280) return 3;
  if (largura >= 768) return 2;
  return 1;
}

export function Grade({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const [larguraArea, setLarguraArea] = useState(0);
  const colunas = colunasPorLargura(width);
  const larguraItem = (larguraArea - ESPACO * (colunas - 1)) / colunas;

  return (
    <View
      style={styles.grade}
      onLayout={(evento) => setLarguraArea(evento.nativeEvent.layout.width)}
    >
      {larguraArea > 0 &&
        Children.map(children, (item) => <View style={{ width: larguraItem }}>{item}</View>)}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ESPACO,
  },
});
