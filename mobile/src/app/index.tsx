import { View, Text, SectionList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useVisitas } from "@/hooks/use-visitas";
import { sair } from "@/lib/api";
import { VisitaCard } from "@/components/VisitaCard";
import type { StatusVisita, VisitaDetalhe } from "@/types/visita";

const STATUS_FINALIZADOS: StatusVisita[] = ["concluida", "cancelada"];

// Separa as visitas pendentes das encerradas
function separarVisitas(visitas: VisitaDetalhe[]) {
  const aFazer = visitas.filter((v) => !STATUS_FINALIZADOS.includes(v.status));
  const finalizadas = visitas.filter((v) => STATUS_FINALIZADOS.includes(v.status));

  return [
    { titulo: "A fazer", data: aFazer },
    { titulo: "Finalizadas", data: finalizadas },
  ].filter((secao) => secao.data.length > 0);
}

function ListaVisitas() {
  const { data, isPending, isError, error, refetch, isRefetching } = useVisitas();

  if (isPending) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centro}>
        <Text>{error.message}</Text>
        <Pressable style={styles.botao} accessibilityRole="button" onPress={() => refetch()}>
          <Text>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SectionList
      sections={separarVisitas(data)}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <VisitaCard visita={item} />}
      renderSectionHeader={({ section }) => <Text style={styles.secao}>{section.titulo}</Text>}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.lista}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListEmptyComponent={<Text style={styles.vazio}>Nenhuma visita atribuída a você.</Text>}
    />
  );
}

export default function VisitasScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Minhas visitas" }} />

      <ListaVisitas />

      {/* só para testar o login enquanto não tem tela de perfil */}
      <Pressable
        style={styles.botao}
        accessibilityRole="button"
        onPress={() => sair().catch(() => {})}
      >
        <Text>Sair (temporário)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  lista: { padding: 16, gap: 12 },
  secao: { fontWeight: "600", marginTop: 8 },
  vazio: { textAlign: "center", marginTop: 40 },
  botao: { padding: 16, alignItems: "center" },
});
