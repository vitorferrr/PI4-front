import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useCrescer } from "@/hooks/use-crescer";
import { cores } from "@/theme";

const ALTURA_MAXIMA = 171;

export interface ColunaGrafico {
  rotulo: string;
  total: number;
}

function Coluna({ altura, progresso }: { altura: number; progresso: SharedValue<number> }) {
  const estilo = useAnimatedStyle(() => ({ height: altura * progresso.get() }), [altura]);
  return <Animated.View style={[styles.barra, estilo]} />;
}

export function GraficoColunas({ colunas }: { colunas: ColunaGrafico[] }) {
  const maior = Math.max(1, ...colunas.map((coluna) => coluna.total));
  const progresso = useCrescer(200);

  return (
    <View>
      <View style={styles.colunas}>
        {colunas.map((coluna) => (
          <View key={coluna.rotulo} style={styles.coluna}>
            <Text style={styles.valor}>{coluna.total}</Text>
            <Coluna altura={(coluna.total / maior) * ALTURA_MAXIMA} progresso={progresso} />
          </View>
        ))}
      </View>
      <View style={styles.rotulos}>
        {colunas.map((coluna) => (
          <Text key={coluna.rotulo} style={styles.rotulo} numberOfLines={1}>
            {coluna.rotulo}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  colunas: {
    height: 229,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaClara,
  },
  coluna: {
    flex: 1,
    alignItems: "center",
  },
  valor: {
    marginBottom: 6,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: cores.texto,
  },
  barra: {
    width: "100%",
    maxWidth: 64,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: cores.graficoAzul,
  },
  rotulos: {
    marginTop: 12,
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 12,
  },
  rotulo: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: cores.textoSecundario,
  },
});
