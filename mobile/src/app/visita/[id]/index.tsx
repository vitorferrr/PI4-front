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
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { API_URL } from "@/lib/api";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";

interface UsuarioResumo {
  id: number;
  nome: string;
  email: string;
}

export interface VisitaDetalhe {
  id: number;
  denunciado: string;
  status: "agendada" | "em_andamento" | "concluida" | "cancelada";
  latitude: string | number | null;
  longitude: string | number | null;
  data_agendada: string;
  data_realizacao: string | null;
  observacoes_livres: string | null;
  gestor?: UsuarioResumo;
  fiscalizadores?: UsuarioResumo[];
}

async function buscarVisitaPorId(id: string): Promise<VisitaDetalhe> {
  const token = await SecureStore.getItemAsync("token");

  const response = await fetch(`${API_URL}/visitas/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => null);
    throw new Error(erro?.mensagem || "Não foi possível carregar os detalhes da visita.");
  }

  return response.json();
}

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "Não informada";
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return dataIso;
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarStatus(status: VisitaDetalhe["status"]) {
  const mapa: Record<VisitaDetalhe["status"], string> = {
    agendada: "Agendada",
    em_andamento: "Em andamento",
    concluida: "Concluída",
    cancelada: "Cancelada",
  };
  return mapa[status] || status;
}

export default function VisitaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const handleIniciarComGps = async () => {
    try {
      setCarregandoGps(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão negada",
          "Precisamos da sua localização (GPS) para iniciar a visita de fiscalização."
        );
        setCarregandoGps(false);
        return;
      }

      const localizacao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: localizacao.coords.latitude,
        longitude: localizacao.coords.longitude,
      };

      iniciarVisitaStore(Number(id), coords);
      Alert.alert("GPS Capturado!", `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`);
      
    } catch (err) {
      Alert.alert("Erro de GPS", "Não foi possível obter a sua localização atual. Verifique se o GPS está ligado.");
    } finally {
      setCarregandoGps(false);
    }
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

      {podeIniciar && (
        <Pressable
          style={styles.botao}
          onPress={handleIniciarComGps}
          disabled={carregandoGps}
        >
          {carregandoGps ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botaoTexto}>Iniciar visita (Capturar GPS)</Text>
          )}
        </Pressable>
      )}

      {emAndamento && (
        <Pressable
          style={styles.botao}
          onPress={() => router.push(`/visita/${visita.id}/questionario`)}
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