import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect, Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useVisitas } from "@/hooks/use-visitas";
import { sair, TOKEN_KEY } from "@/lib/api";
import { VisitaCard } from "@/components/VisitaCard";

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
        <Pressable style={styles.botao} onPress={() => refetch()}>
          <Text>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <VisitaCard visita={item} />}
      contentContainerStyle={styles.lista}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListEmptyComponent={
        <Text style={styles.vazio}>Nenhuma visita atribuída a você.</Text>
      }
    />
  );
}

export default function VisitasScreen() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => setAutenticado(Boolean(token)))
      .catch(() => setAutenticado(false));
  }, []);

  if (autenticado === null) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!autenticado) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Minhas visitas" }} />

      <ListaVisitas />

      {/* TEMPORÁRIO: só para testar o login enquanto não há tela de perfil */}
      <Pressable style={styles.botao} onPress={sair}>
        <Text>Sair (temporário)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  lista: { padding: 16, gap: 12 },
  vazio: { textAlign: "center", marginTop: 40 },
  botao: { padding: 16, alignItems: "center" },
});