import { View, Text, StyleSheet } from "react-native";
import { formatarNumero } from "@/lib/formatadores";
import { cores } from "@/theme";

export interface ItemGrafico {
  rotulo: string;
  total: number;
  cor: string;
}

export function GraficoBarras({ itens }: { itens: ItemGrafico[] }) {
  const maior = Math.max(1, ...itens.map((item) => item.total));

  return (
    <View style={styles.barras}>
      {itens.map((item) => (
        <View key={item.rotulo} style={styles.linha}>
          <Text style={styles.rotulo}>{item.rotulo}</Text>
          <View style={styles.trilha}>
            <View
              style={[
                styles.barra,
                { width: `${(item.total / maior) * 100}%`, backgroundColor: item.cor },
              ]}
            />
          </View>
          <Text style={styles.valor}>{formatarNumero(item.total)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  barras: {
    gap: 19,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  rotulo: {
    width: 118,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  trilha: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: cores.trilha,
  },
  barra: {
    height: "100%",
    borderRadius: 6,
  },
  valor: {
    width: 40,
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.texto,
  },
});
