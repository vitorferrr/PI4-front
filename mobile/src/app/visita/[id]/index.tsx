import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { apiFetch } from "@/lib/api";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { VisitaDetalhe, Coordenadas } from "@/types/visita";
import { formatarData, formatarStatus } from "@/lib/formatadores";

async function buscarVisitaPorId(id: string): Promise<VisitaDetalhe> {
  return apiFetch<VisitaDetalhe>(
    `/visitas/${id}`,
    { method: "GET" },
    "Não foi possível carregar os detalhes da visita."
  );
}

async function iniciarVisitaRequest(id: string, coords: Coordenadas): Promise<VisitaDetalhe> {
  return apiFetch<VisitaDetalhe>(
    `/visitas/${id}/iniciar`,
    {
      method: "PATCH",
      body: JSON.stringify(coords),
    },
    "Erro ao iniciar a visita."
  );
}

export default function VisitaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [carregandoGps, setCarregandoGps] = useState(false);
  const iniciarVisitaStore = useVisitaEmAndamentoStore((state) => state.iniciarVisitaStore);

  const {
    data: visita,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["visita", id],
    queryFn: () => buscarVisitaPorId(id!),
    enabled: Boolean(id),
  });

  const iniciarMutation = useMutation({
    mutationFn: (coords: Coordenadas) => iniciarVisitaRequest(id!, coords),
    onSuccess: (visitaAtualizada, coords) => {
      iniciarVisitaStore(Number(id), coords);
      queryClient.setQueryData(["visita", id], visitaAtualizada);
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      router.push(`/visita/${id}/questionario`);
    },
    onError: (err) => {
      Alert.alert(
        "Erro ao iniciar visita",
        err instanceof Error ? err.message : "Não foi possível iniciar a visita."
      );
    },
  });

  const handleIniciarComGps = async () => {
    let coords: Coordenadas;

    try {
      setCarregandoGps(true);

      const servicoAtivo = await Location.hasServicesEnabledAsync();
      if (!servicoAtivo) {
        Alert.alert(
          "GPS Desativado",
          "Ative os serviços de localização do dispositivo para iniciar a visita."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão negada",
          "Precisamos da sua localização (GPS) para iniciar a visita de fiscalização."
        );
        return;
      }

      const posicaoPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_GPS")), 15000)
      );

      let localizacao: Location.LocationObject | null = null;
      try {
        localizacao = await Promise.race([posicaoPromise, timeoutPromise]);
      } catch {
        localizacao = await Location.getLastKnownPositionAsync();
      }

      if (!localizacao) {
        Alert.alert(
          "Erro de GPS",
          "Não foi possível obter a sua localização atual. Verifique se o GPS está ligado."
        );
        return;
      }

      coords = {
        latitude: localizacao.coords.latitude,
        longitude: localizacao.coords.longitude,
      };
    } catch {
      Alert.alert(
        "Erro de GPS",
        "Não foi possível obter a sua localização atual. Verifique se o GPS está ligado."
      );
      return;
    } finally {
      setCarregandoGps(false);
    }

    iniciarMutation.mutate(coords);
  };

  if (isLoading) {
    return (
      <View style={styles.centralizado}>
        <Stack.Screen options={{ title: "Detalhes da Visita" }} />
        <ActivityIndicator size="large" color="#1F3864" />
        <Text style={styles.textoAuxiliar}>Carregando detalhes da visita...</Text>
      </View>
    );
  }

  if (isError || !visita) {
    return (
      <View style={styles.centralizado}>
        <Stack.Screen options={{ title: "Detalhes da Visita" }} />
        <Text style={styles.erro}>
          {error instanceof Error ? error.message : "Erro ao carregar visita."}
        </Text>
        <Pressable style={styles.botaoSecundario} onPress={() => refetch()}>
          <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const podeIniciar = visita.status === "agendada";
  const emAndamento = visita.status === "em_andamento";
  const processandoInicio = carregandoGps || iniciarMutation.isPending;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: `Visita #${visita.id}` }} />

      <View style={styles.card}>
        <View style={styles.cabecalhoCard}>
          <Text style={styles.rotulo}>Denunciado / Estabelecimento</Text>
          <View style={styles.badgeStatus}>
            <Text style={styles.badgeStatusTexto}>{formatarStatus(visita.status)}</Text>
          </View>
        </View>
        <Text style={styles.titulo}>{visita.denunciado}</Text>

        <View style={styles.divisor} />

        <Text style={styles.rotulo}>Data Agendada</Text>
        <Text style={styles.valor}>{formatarData(visita.data_agendada)}</Text>

        {visita.data_realizacao && (
          <>
            <Text style={styles.rotulo}>Iniciada em</Text>
            <Text style={styles.valor}>{formatarData(visita.data_realizacao)}</Text>
          </>
        )}

        <Text style={styles.rotulo}>Gestor Responsável</Text>
        <Text style={styles.valor}>{visita.gestor?.nome || "Não informado"}</Text>

        <Text style={styles.rotulo}>Fiscalizadores Atribuídos</Text>
        <Text style={styles.valor}>
          {visita.fiscalizadores && visita.fiscalizadores.length > 0
            ? visita.fiscalizadores.map((f) => f.nome).join(", ")
            : "Nenhum fiscalizador listado"}
        </Text>

        {visita.observacoes_livres ? (
          <>
            <Text style={styles.rotulo}>Observações</Text>
            <Text style={styles.valor}>{visita.observacoes_livres}</Text>
          </>
        ) : null}
      </View>

      {iniciarMutation.isError && (
        <Text style={styles.erro}>
          {iniciarMutation.error instanceof Error
            ? iniciarMutation.error.message
            : "Erro ao iniciar visita."}
        </Text>
      )}

      {podeIniciar && (
        <Pressable
          style={styles.botao}
          onPress={handleIniciarComGps}
          disabled={processandoInicio}
        >
          {processandoInicio ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botaoTexto}>Iniciar visita</Text>
          )}
        </Pressable>
      )}

      {emAndamento && (
        <Pressable
          style={styles.botao}
          onPress={() => {
            iniciarVisitaStore(visita.id);
            router.push(`/visita/${visita.id}/questionario`);
          }}
        >
          <Text style={styles.botaoTexto}>Continuar para o questionário</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f6fa",
    gap: 16,
  },
  centralizado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#f5f6fa",
  },
  textoAuxiliar: {
    color: "#555",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e1e4e8",
    gap: 6,
  },
  cabecalhoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F3864",
    marginBottom: 4,
  },
  divisor: {
    height: 1,
    backgroundColor: "#e1e4e8",
    marginVertical: 8,
  },
  rotulo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6c757d",
    textTransform: "uppercase",
    marginTop: 6,
  },
  valor: {
    fontSize: 16,
    color: "#212529",
  },
  badgeStatus: {
    backgroundColor: "#e8eef7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeStatusTexto: {
    color: "#1F3864",
    fontSize: 12,
    fontWeight: "700",
  },
  botao: {
    backgroundColor: "#1F3864",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: "#1F3864",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoSecundarioTexto: {
    color: "#1F3864",
    fontWeight: "600",
  },
  erro: {
    color: "#c0392b",
    textAlign: "center",
    fontSize: 16,
  },
});