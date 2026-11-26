import type { ReactNode } from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Card } from "react-native-paper";
import { cores } from "@/theme";

interface CartaoSecaoProps {
  titulo?: string;
  numero?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CartaoSecao({ titulo, numero, children, style }: CartaoSecaoProps) {
  return (
    <Card mode="outlined" style={[styles.cartao, style]} contentStyle={styles.conteudo}>
      {titulo && (
        <View style={styles.cabecalho}>
          {numero !== undefined && (
            <View style={styles.numero}>
              <Text style={styles.numeroTexto}>{numero}</Text>
            </View>
          )}
          <Text style={styles.titulo} accessibilityRole="header">
            {titulo}
          </Text>
        </View>
      )}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: 16,
    backgroundColor: cores.branco,
  },
  conteudo: {
    padding: 24,
    gap: 16,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  numero: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: cores.azul,
  },
  numeroTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.branco,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    color: cores.azulEscuro,
  },
});
