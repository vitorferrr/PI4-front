import type { ReactNode } from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { cores } from "@/theme";

interface ResumoVisitaProps {
  local: string;
  endereco: string;
  fiscal: string;
  data: string;
  aviso?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function Linha({ termo, valor }: { termo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.termo}>{termo}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

export function ResumoVisita({
  local,
  endereco,
  fiscal,
  data,
  aviso = "A visita aparece no app do fiscalizador assim que for criada.",
  children,
  style,
}: ResumoVisitaProps) {
  return (
    <View style={[styles.resumo, style]}>
      <Text style={styles.titulo}>Resumo</Text>
      <View style={styles.linhas}>
        <Linha termo="Local" valor={local} />
        <Linha termo="Endereço" valor={endereco} />
        <Linha termo="Fiscal" valor={fiscal} />
        <Linha termo="Data" valor={data} />
      </View>
      <Text style={styles.aviso}>{aviso}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  resumo: {
    gap: 16,
    padding: 24,
    borderRadius: 12,
    backgroundColor: cores.azulEscuro,
  },
  titulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
    color: cores.branco,
  },
  linhas: {
    gap: 10,
  },
  linha: {
    flexDirection: "row",
    gap: 12,
  },
  termo: {
    width: 78,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.azulMenuTexto,
  },
  valor: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.branco,
  },
  aviso: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: cores.azulMenuTexto,
  },
});
