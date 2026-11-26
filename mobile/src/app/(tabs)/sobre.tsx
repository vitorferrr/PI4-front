import { View, Text, StyleSheet } from "react-native";
import { cores } from "@/theme";

export default function SobreScreen() {
  return (
    <View style={styles.tela}>
      <Text style={styles.texto}>Sobre</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: cores.fundo,
  },
  texto: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: cores.texto,
  },
});
