import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";

export default function DocumentoVisitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Documento - Visita #${id}` }} />

      <View style={styles.card}>
        <Text style={styles.titulo}>Documento da Visita #{id}</Text>
        <Text style={styles.descricao}>
          A etapa de revisão do documento, observações livres e coleta de assinaturas será
          implementada nas próximas tasks.
        </Text>

        <Pressable style={styles.botao} onPress={() => router.back()}>
          <Text style={styles.botaoTexto}>Voltar para o questionário</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f6fa",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e1e4e8",
    gap: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F3864",
  },
  descricao: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
  botao: {
    backgroundColor: "#1F3864",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
