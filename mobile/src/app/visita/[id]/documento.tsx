import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import { formatarData } from "@/lib/formatadores";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import type { VisitaDetalhe } from "@/types/visita";

async function buscarVisitaPorId(id: string): Promise<VisitaDetalhe> {
  return apiFetch<VisitaDetalhe>(
    `/visitas/${id}`,
    { method: "GET" },
    "Não foi possível carregar os dados da visita."
  );
}

function Cabecalho({ subtitulo }: { subtitulo?: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
      <Pressable
        style={styles.botaoVoltar}
        accessibilityRole="button"
        accessibilityLabel="Voltar ao questionário"
        onPress={() => router.back()}
      >
        <Text style={styles.botaoVoltarTexto}>‹</Text>
      </Pressable>

      <View style={styles.cabecalhoTextos}>
        <Text style={styles.cabecalhoTitulo}>Revisar e assinar</Text>
        {subtitulo ? <Text style={styles.cabecalhoSubtitulo}>{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

export default function DocumentoVisitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const observacoesLivres = useVisitaEmAndamentoStore((state) => state.observacoesLivres);

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

  if (isLoading) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <Cabecalho />
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#1D3F94" />
        </View>
      </View>
    );
  }

  if (isError || !visita) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <Cabecalho />
        <View style={styles.centralizado}>
          <Text style={styles.erro}>
            {error instanceof Error ? error.message : "Erro ao carregar visita."}
          </Text>
          <Pressable style={styles.botaoSecundario} onPress={() => refetch()}>
            <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const totalRespostas = Object.values(respostas).filter((valor) => valor.trim() !== "").length;
  const nomesFiscais = visita.fiscalizadores?.map((f) => f.nome).join(", ") || "Não informado";

  return (
    <View style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />
      <Cabecalho subtitulo={visita.denunciado} />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.previa} accessibilityLabel="Prévia do documento">
          <View style={styles.previaTopo}>
            <View style={styles.previaIcone}>
              <Text style={styles.previaIconeTexto}>✓</Text>
            </View>
            <View>
              <Text style={styles.previaTitulo}>AUTO DE CONSTATAÇÃO</Text>
              <Text style={styles.previaSubtitulo}>Nº atribuído após o envio · Prévia</Text>
            </View>
          </View>

          <Text style={styles.previaTexto}>
            <Text style={styles.negrito}>Estabelecimento:</Text> {visita.denunciado}
          </Text>

          <Text style={styles.previaTexto}>
            <Text style={styles.negrito}>Data e hora:</Text> {formatarData(visita.data_realizacao)}
            {" · "}
            <Text style={styles.negrito}>Fiscal:</Text> {nomesFiscais}
          </Text>

          {observacoesLivres.trim() !== "" && (
            <Text style={styles.previaTexto}>
              <Text style={styles.negrito}>Constatação:</Text> {observacoesLivres}
            </Text>
          )}

          <Text style={[styles.previaTexto, styles.previaRodape]}>
            + {totalRespostas} {totalRespostas === 1 ? "resposta" : "respostas"}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.botaoEnviar, styles.botaoDesabilitado]} disabled>
          <Text style={styles.botaoEnviarTexto}>Encerrar e enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#F3F7FB",
  },
  centralizado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },

  cabecalho: {
    backgroundColor: "#1D3F94",
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  botaoVoltar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  botaoVoltarTexto: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 38,
  },
  cabecalhoTextos: {
    flex: 1,
  },
  cabecalhoTitulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    lineHeight: 25,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  cabecalhoSubtitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#D6E6F8",
  },

  conteudo: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
  },

  previa: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 10,
    shadowColor: "#0A3D7A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 4,
  },
  previaTopo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#1D3F94",
  },
  previaIcone: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#1D3F94",
    justifyContent: "center",
    alignItems: "center",
  },
  previaIconeTexto: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    fontSize: 14,
  },
  previaTitulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 14,
    color: "#172F6E",
  },
  previaSubtitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 10.5,
    color: "#33435A",
  },
  previaTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    lineHeight: 17,
    color: "#1E2B3D",
  },
  previaRodape: {
    color: "#33435A",
  },
  negrito: {
    fontFamily: "Inter_700Bold",
  },

  rodape: {
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DCE5EF",
    gap: 10,
  },
  botaoEnviar: {
    height: 60,
    borderRadius: 16,
    backgroundColor: "#17803F",
    justifyContent: "center",
    alignItems: "center",
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoEnviarTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
    color: "#FFFFFF",
  },

  erro: {
    fontFamily: "Inter_600SemiBold",
    color: "#A12A20",
    textAlign: "center",
    fontSize: 16,
  },
  botaoSecundario: {
    borderWidth: 1.5,
    borderColor: "#1D3F94",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoSecundarioTexto: {
    fontFamily: "Inter_700Bold",
    color: "#1D3F94",
  },
});
