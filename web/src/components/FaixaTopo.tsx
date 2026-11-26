import { View, Image, StyleSheet } from "react-native";

const PROPORCAO_IMAGEM = 1520 / 112;

export function FaixaTopo({ altura = 56 }: { altura?: number }) {
  return (
    <View
      style={[styles.faixa, { height: altura }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require("../../assets/images/faixa-login.png")}
        style={{ width: altura * PROPORCAO_IMAGEM, height: altura }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    overflow: "hidden",
  },
});
