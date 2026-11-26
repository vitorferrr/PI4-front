import { Image } from "react-native";

export function Logo({ tamanho = 36 }: { tamanho?: number }) {
  return (
    <Image
      source={require("../../assets/images/logo-constata.png")}
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 4 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
