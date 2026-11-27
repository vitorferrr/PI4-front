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
    borderRadius: 12,
    backgroundColor: cores.branco,
    boxShadow: `0 1px 2px ${cores.sombra}`,
  },
  conteudo: {
    padding: 22,
    gap: 16,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaTabela,
  },
  numero: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: cores.amarelo,
  },
  numeroTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    color: cores.azulEscuro,
  },
  titulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
    color: cores.azulEscuro,
  },
});
