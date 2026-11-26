import { Text, StyleSheet } from "react-native";
import { cores } from "@/theme";

export function Mensagem({ children }: { children: string }) {
  return <Text style={styles.mensagem}>{children}</Text>;
}

const styles = StyleSheet.create({
  mensagem: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
