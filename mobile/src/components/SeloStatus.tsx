import { View, Text, StyleSheet } from "react-native";
import type { StatusVisita } from "@/types/visita";
import { formatarStatus } from "@/lib/formatadores";
import { cores } from "@/theme";

const CORES_STATUS: Record<StatusVisita, { fundo: string; texto: string }> = {
  agendada: { fundo: cores.agendadaFundo, texto: cores.agendadaTexto },
  em_andamento: { fundo: cores.emAndamentoFundo, texto: cores.emAndamentoTexto },
  concluida: { fundo: cores.sucessoFundo, texto: cores.sucesso },
  cancelada: { fundo: cores.canceladaFundo, texto: cores.textoSecundario },
};

export function SeloStatus({ status }: { status: StatusVisita }) {
  const cor = CORES_STATUS[status];

  return (
    <View style={[styles.selo, { backgroundColor: cor.fundo }]}>
      <Text style={[styles.texto, { color: cor.texto }]}>{formatarStatus(status)}</Text>
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
  texto: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
});
