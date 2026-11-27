import { View, ScrollView, StyleSheet } from "react-native";
import { Slot, usePathname } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { MenuLateral } from "@/components/MenuLateral";
import { cores } from "@/theme";

export default function PainelLayout() {
  const caminho = usePathname();

  return (
    <View style={styles.tela}>
      <MenuLateral />
      <ScrollView style={styles.principal} contentContainerStyle={styles.conteudo}>
        <Animated.View key={caminho} entering={FadeIn.duration(220)}>
          <Slot />
        </Animated.View>
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
