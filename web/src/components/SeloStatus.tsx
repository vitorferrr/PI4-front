import { View, Text, StyleSheet } from "react-native";
import { STATUS_VISITA } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { StatusVisita } from "@/types/visita";

const CORES_STATUS: Record<StatusVisita, { fundo: string; texto: string }> = {
  agendada: { fundo: cores.atribuidaFundo, texto: cores.atribuida },
  em_andamento: { fundo: cores.infoFundo, texto: cores.info },
  concluida: { fundo: cores.sucessoFundo, texto: cores.sucesso },
  cancelada: { fundo: cores.neutroFundo, texto: cores.textoMedio },
};

export function SeloStatus({ status, grande = false }: { status: StatusVisita; grande?: boolean }) {
  const cor = CORES_STATUS[status] ?? CORES_STATUS.cancelada;

  return (
    <View style={[styles.selo, grande && styles.seloGrande, { backgroundColor: cor.fundo }]}>
      <Text style={[styles.texto, grande && styles.textoGrande, { color: cor.texto }]}>
        {STATUS_VISITA[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  seloGrande: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  texto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  textoGrande: {
    fontSize: 14,
  },
});
