import { Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import type { StatusVisita, VisitaDetalhe } from "@/types/visita";

const STATUS_LABEL: Record<StatusVisita, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function formatarData(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "data não informada" : data.toLocaleDateString("pt-BR");
}

export function VisitaCard({ visita }: { visita: VisitaDetalhe }) {
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/visita/${visita.id}`)}>
      <Text style={styles.titulo}>{visita.denunciado}</Text>
      <Text>{STATUS_LABEL[visita.status]}</Text>
      <Text>Agendada para {formatarData(visita.data_agendada)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, gap: 4 },
  titulo: { fontWeight: "600" },
});