import { View, ScrollView, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import { MenuLateral } from "@/components/MenuLateral";
import { cores } from "@/theme";

export default function PainelLayout() {
  return (
    <View style={styles.tela}>
      <MenuLateral />
      <ScrollView style={styles.principal} contentContainerStyle={styles.conteudo}>
        <Slot />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: cores.fundo,
  },
  principal: {
    flex: 1,
  },
  conteudo: {
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 48,
  },
});
