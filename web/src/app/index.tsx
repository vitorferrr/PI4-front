import { View, Text, StyleSheet } from "react-native";
import { cores } from "@/theme";

// Provisória: só para conferir que a base Expo abre no navegador
export default function Inicio() {
  return (
    <View style={styles.tela}>
      <Text style={styles.titulo}>Constata · Painel</Text>
      <Text style={styles.texto}>Base em React Native funcionando.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: cores.fundo,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 40,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  texto: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: cores.textoSecundario,
  },
});
