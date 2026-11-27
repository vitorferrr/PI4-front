import { View, Text, StyleSheet } from "react-native";
import { STATUS_VISITA } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { StatusVisita } from "@/types/visita";

const COR_STATUS: Record<StatusVisita, string> = {
  agendada: cores.azulFaixa,
  em_andamento: cores.amarelo,
  concluida: cores.verdeFaixa,
  cancelada: cores.graficoCinza,
};

export function SeloStatus({ status, grande = false }: { status: StatusVisita; grande?: boolean }) {
  const cor = COR_STATUS[status] ?? COR_STATUS.cancelada;

  return (
    <View style={styles.selo}>
      <View style={[styles.ponto, grande && styles.pontoGrande, { backgroundColor: cor }]} />
      <Text style={[styles.texto, grande && styles.textoGrande]}>
        {STATUS_VISITA[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pontoGrande: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  texto: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: cores.textoMedio,
  },
  textoGrande: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: cores.texto,
  },
});
