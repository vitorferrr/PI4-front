import { View, Text, StyleSheet } from "react-native";
import { cores } from "@/theme";

export function InfoVisita({ termo, valor }: { termo: string; valor: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.termo}>{termo}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: {
    flexGrow: 1,
    flexBasis: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: cores.fundo,
  },
  termo: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  valor: {
    marginTop: 4,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
});
