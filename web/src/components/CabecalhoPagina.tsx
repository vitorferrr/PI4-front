import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { cores } from "@/theme";

interface CabecalhoPaginaProps {
  titulo: string;
  sobretitulo?: string;
  descricao?: string;
  acoes?: ReactNode;
}

export function CabecalhoPagina({ titulo, sobretitulo, descricao, acoes }: CabecalhoPaginaProps) {
  return (
    <View style={styles.cabecalho}>
      <View style={styles.textos}>
        {sobretitulo && <Text style={styles.sobretitulo}>{sobretitulo}</Text>}
        <Text style={styles.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        {descricao && <Text style={styles.descricao}>{descricao}</Text>}
      </View>
      {acoes && <View style={styles.acoes}>{acoes}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  textos: {
    flexShrink: 1,
    gap: 2,
  },
  sobretitulo: {
    marginBottom: 2,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 44,
    lineHeight: 46,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  descricao: {
    marginTop: 8,
    maxWidth: 620,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: cores.textoSecundario,
  },
  acoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
});
