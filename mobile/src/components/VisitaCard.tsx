import { Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import type { VisitaDetalhe } from "@/types/visita";
import { formatarData, formatarStatus } from "@/lib/formatadores";

export function VisitaCard({ visita }: { visita: VisitaDetalhe }) {
  return (
    <Pressable
      style={styles.card}
      accessibilityRole="button"
      onPress={() => router.push(`/visita/${visita.id}`)}
    >
      <Text style={styles.titulo}>{visita.denunciado}</Text>
      <Text>{formatarStatus(visita.status)}</Text>
      <Text>Agendada para {formatarData(visita.data_agendada)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, gap: 4 },
  titulo: { fontWeight: "600" },
});
