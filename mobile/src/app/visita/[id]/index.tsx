import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
  type AlertButton,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Button, Icon, IconButton } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SessaoExpiradaError } from "@/lib/api";
import { capturarLocalizacao, ErroLocalizacao } from "@/lib/localizacao";
import { useVisita } from "@/hooks/use-visita";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { VisitaDetalhe, Coordenadas } from "@/types/visita";
import { formatarData } from "@/lib/formatadores";
import { SeloStatus } from "@/components/SeloStatus";
import { cores } from "@/theme";

async function iniciarVisitaRequest(id: string, coords: Coordenadas): Promise<VisitaDetalhe> {
  const response = await api.patch<VisitaDetalhe>(`/visitas/${id}/iniciar`, coords);
  return response.data;
}

function abrirConfiguracoesLocalizacao() {
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

function MapaIlustrativo() {
  return (
    <View
      style={styles.mapa}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.rua, styles.ruaHorizontal]} />
      <View style={[styles.rua, styles.ruaInclinada]} />
      <View style={[styles.rua, styles.ruaVertical]} />
    </View>
  );
}

export default function VisitaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
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

  const botaoVoltar = (
    <IconButton
      icon="chevron-left"
      size={26}
      iconColor={cores.azulEscuro}
      containerColor={cores.branco}
      style={[styles.voltar, { top: insets.top + 8 }]}
      onPress={() => router.back()}
      accessibilityLabel="Voltar para a lista"
    />
  );

  if (isLoading) {
    return (
      <View style={styles.centralizado}>
        <Stack.Screen options={{ headerShown: false }} />
        {botaoVoltar}
        <ActivityIndicator size="large" />
        <Text style={styles.textoAuxiliar}>Carregando detalhes da visita...</Text>
      </View>
    );
  }

  if (isError || !visita) {
    return (
      <View style={styles.centralizado}>
        <Stack.Screen options={{ headerShown: false }} />
        {botaoVoltar}
        <Text style={styles.erro}>
          {error instanceof Error ? error.message : "Erro ao carregar visita."}
        </Text>
        <Button mode="outlined" onPress={() => refetch()}>
          Tentar novamente
        </Button>
      </View>
    );
  }

  const podeIniciar = visita.status === "agendada";
  const emAndamento = visita.status === "em_andamento";
  const processandoInicio = carregandoGps || iniciarMutation.isPending;
  const endereco = [visita.endereco, visita.bairro].filter(Boolean).join(" · ");
  const fiscais = visita.fiscalizadores?.map((fiscal) => fiscal.nome).join(", ");

  return (
    <View style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.rolagem} bounces={false} overScrollMode="never">
        <MapaIlustrativo />

        <View style={styles.conteudo}>
          <View style={styles.identificacao}>
            <SeloStatus status={visita.status} />
            <Text style={styles.titulo} accessibilityRole="header">
              {visita.denunciado}
            </Text>
            {endereco !== "" && <Text style={styles.endereco}>{endereco}</Text>}
            <Text style={styles.prazo}>Agendada para {formatarData(visita.data_agendada)}</Text>
            {visita.data_realizacao && (
              <Text style={styles.prazo}>Iniciada em {formatarData(visita.data_realizacao)}</Text>
            )}
          </View>

          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Responsáveis</Text>
            <View style={styles.linha}>
              <Text style={styles.linhaRotulo}>Gestor</Text>
              <Text style={styles.linhaValor}>{visita.gestor?.nome || "Não informado"}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.linhaRotulo}>Fiscal</Text>
              <Text style={styles.linhaValor}>{fiscais || "Não informado"}</Text>
            </View>
          </View>

          {visita.observacoes_livres ? (
            <View style={styles.secao}>
              <Text style={styles.secaoTitulo}>Observações</Text>
              <Text style={styles.texto}>{visita.observacoes_livres}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {botaoVoltar}

      {(podeIniciar || emAndamento) && (
        <View style={[styles.rodape, { paddingBottom: 24 + insets.bottom }]}>
          {podeIniciar && (
            <View style={styles.avisoGps}>
              <Icon source="map-marker-outline" size={18} color={cores.azul} />
              <Text style={styles.avisoGpsTexto}>
                {carregandoGps
                  ? "Obtendo sua localização..."
                  : "Sua localização é registrada só agora, no início da visita."}
              </Text>
            </View>
          )}

          {podeIniciar ? (
            <Button
              mode="contained"
              icon="crosshairs-gps"
              buttonColor={cores.sucesso}
              onPress={handleIniciarComGps}
              loading={processandoInicio}
              disabled={processandoInicio}
              style={styles.botaoPrincipal}
              contentStyle={styles.botaoPrincipalConteudo}
              labelStyle={styles.botaoPrincipalTexto}
            >
              Iniciar visita
            </Button>
          ) : (
            <Button
              mode="contained"
              icon="clipboard-text-outline"
              onPress={() => {
                iniciarVisitaStore(visita.id);
                router.push(`/visita/${visita.id}/questionario`);
              }}
              style={styles.botaoPrincipal}
              contentStyle={styles.botaoPrincipalConteudo}
              labelStyle={styles.botaoPrincipalTexto}
            >
              Continuar para o questionário
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  rolagem: {
    flexGrow: 1,
  },
  mapa: {
    height: 230,
    backgroundColor: "#D7E6F5",
    overflow: "hidden",
  },
  rua: {
    position: "absolute",
    backgroundColor: cores.branco,
  },
  ruaHorizontal: {
    left: -20,
    right: -20,
    top: 110,
    height: 16,
    transform: [{ rotate: "-8deg" }],
  },
  ruaInclinada: {
    top: -20,
    bottom: -20,
    left: "59%",
    width: 12,
    transform: [{ rotate: "10deg" }],
  },
  ruaVertical: {
    top: 0,
    bottom: 0,
    left: "20%",
    width: 8,
  },
  voltar: {
    position: "absolute",
    left: 8,
    margin: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#0A3D7A",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  conteudo: {
    flex: 1,
    marginTop: -24,
    backgroundColor: cores.fundo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  identificacao: {
    gap: 6,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 32,
    lineHeight: 34,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  endereco: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#33435A",
  },
  prazo: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#33435A",
  },
  secao: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  secaoTitulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: cores.textoSecundario,
  },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  linhaRotulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: cores.textoSecundario,
  },
  linhaValor: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  texto: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: cores.texto,
  },
  rodape: {
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: cores.branco,
    borderTopWidth: 1,
    borderTopColor: cores.bordaClara,
    gap: 10,
  },
  avisoGps: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  avisoGpsTexto: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#33435A",
  },
  botaoPrincipal: {
    borderRadius: 16,
  },
  botaoPrincipalConteudo: {
    height: 60,
  },
  botaoPrincipalTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
  },
  centralizado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
    backgroundColor: cores.fundo,
  },
  textoAuxiliar: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: cores.textoSecundario,
  },
  erro: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    textAlign: "center",
    color: cores.erro,
  },
});
