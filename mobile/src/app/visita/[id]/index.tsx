import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
  type AlertButton,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SessaoExpiradaError } from "@/lib/api";
import { capturarLocalizacao, ErroLocalizacao } from "@/lib/localizacao";
import { useVisita } from "@/hooks/use-visita";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { VisitaDetalhe, Coordenadas } from "@/types/visita";
import { formatarData, formatarStatus } from "@/lib/formatadores";

async function iniciarVisitaRequest(id: string, coords: Coordenadas): Promise<VisitaDetalhe> {
  const response = await api.patch<VisitaDetalhe>(`/visitas/${id}/iniciar`, coords);
  return response.data;
}

function abrirConfiguracoesLocalizacao() {
  // no Android dá para abrir direto a tela de localização; no iOS só as configurações do app
  if (Platform.OS === "android") {
    Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS").catch(() =>
      Linking.openSettings()
    );
  } else {
    Linking.openSettings();
  }
}

function avisarFalhaLocalizacao(erro: unknown, tentarNovamente: () => void) {
  const cancelar: AlertButton = { text: "Cancelar", style: "cancel" };
  const tentar: AlertButton = { text: "Tentar novamente", onPress: tentarNovamente };
  const motivo = erro instanceof ErroLocalizacao ? erro.motivo : null;

  switch (motivo) {
    case "permissao_negada":
      Alert.alert(
        "Permissão de localização necessária",
        "A localização é usada para registrar onde a visita de fiscalização começou. Permita o acesso para continuar.",
        [cancelar, tentar]
      );
      return;
    case "permissao_bloqueada":
      Alert.alert(
        "Localização bloqueada",
        "O acesso à localização foi negado para este app. Abra as configurações, permita o acesso à localização e volte para iniciar a visita.",
        [cancelar, { text: "Abrir configurações", onPress: () => Linking.openSettings() }]
      );
      return;
    case "servico_desativado":
      Alert.alert(
        "GPS desativado",
        "Ative a localização (GPS) do aparelho para iniciar a visita.",
        Platform.OS === "android"
          ? [cancelar, { text: "Abrir configurações", onPress: abrirConfiguracoesLocalizacao }]
          : [cancelar, tentar]
      );
      return;
    case "sem_sinal":
      Alert.alert(
        "Sem sinal de GPS",
        "Não foi possível obter sua localização. Vá para um local aberto ou perto de uma janela e tente novamente.",
        [cancelar, tentar]
      );
      return;
    default:
      Alert.alert(
        "Erro de GPS",
        "Não foi possível obter sua localização. Verifique se o GPS está ligado e tente novamente.",
        [cancelar, tentar]
      );
  }
}

export default function VisitaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [carregandoGps, setCarregandoGps] = useState(false);
  const iniciarVisitaStore = useVisitaEmAndamentoStore((state) => state.iniciarVisitaStore);

  const { data: visita, isLoading, isError, error, refetch } = useVisita(id);

  const iniciarMutation = useMutation({
    mutationFn: (coords: Coordenadas) => iniciarVisitaRequest(id!, coords),
    onSuccess: (visitaAtualizada, coords) => {
      iniciarVisitaStore(Number(id), coords);
      queryClient.setQueryData(["visita", id], visitaAtualizada);
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      router.push(`/visita/${id}/questionario`);
    },
    onError: (err) => {
      // o handler global do queryClient já avisa e leva para o login
      if (err instanceof SessaoExpiradaError) return;
      Alert.alert(
        "Erro ao iniciar visita",
        err instanceof Error ? err.message : "Não foi possível iniciar a visita."
      );
    },
  });

  const capturandoRef = useRef(false);
  const handleIniciarComGps = async () => {
    if (capturandoRef.current) return;
    capturandoRef.current = true;
    setCarregandoGps(true);

    let coords: Coordenadas;
    try {
      coords = await capturarLocalizacao();
    } catch (erro) {
      avisarFalhaLocalizacao(erro, handleIniciarComGps);
      return;
    } finally {
      capturandoRef.current = false;
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
        <Pressable style={styles.botao} onPress={handleIniciarComGps} disabled={processandoInicio}>
          {processandoInicio ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botaoTexto}>Iniciar visita</Text>
          )}
        </Pressable>
      )}

      {podeIniciar && carregandoGps && (
        <Text style={styles.textoAuxiliar}>Obtendo sua localização...</Text>
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
    textAlign: "center",
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
