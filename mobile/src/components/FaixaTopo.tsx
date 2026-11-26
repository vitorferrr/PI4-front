import { Image, StyleSheet } from "react-native";

export function FaixaTopo() {
  return (
    <Image
      source={require("../../assets/images/faixa-topo.png")}
      style={styles.faixa}
      resizeMode="cover"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  faixa: {
    width: "100%",
    height: undefined,
    aspectRatio: 780 / 88,
  },
});
