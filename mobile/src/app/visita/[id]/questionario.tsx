import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import { formatarHora } from "@/lib/formatadores";
import { useVisita } from "@/hooks/use-visita";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { ItemPerguntaQuestionario } from "@/components/ItemPerguntaQuestionario";
import { PerguntaQuestionario } from "@/types/visita";

async function buscarPerguntasQuestionario(): Promise<PerguntaQuestionario[]> {
  const perguntas = await apiFetch<PerguntaQuestionario[]>(
    "/questionario",
    { method: "GET" },
    "Não foi possível carregar o questionário."
  );
  return [...perguntas].sort((a, b) => a.ordem - b.ordem);
}

interface CabecalhoProps {
  titulo: string;
  horaCheckIn?: string | null;
  progresso?: { atual: number; total: number };
}

function Cabecalho({ titulo, horaCheckIn, progresso }: CabecalhoProps) {
  const insets = useSafeAreaInsets();
  const porcentagem = progresso ? Math.round((progresso.atual / progresso.total) * 100) : 0;

  return (
    <View style={[styles.cabecalho, { paddingTop: insets.top + 8 }]}>
      <View style={styles.cabecalhoLinha}>
        <Pressable
          style={styles.botaoVoltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
        >
          <Text style={styles.botaoVoltarTexto}>‹</Text>
        </Pressable>

        <View style={styles.cabecalhoTextos}>
          <Text style={styles.cabecalhoTitulo} numberOfLines={2}>
            {titulo}
          </Text>
          <Text style={styles.cabecalhoSubtitulo}>Auto de Constatação</Text>
        </View>

        <View style={styles.badgeSalvo}>
          <Text style={styles.badgeSalvoIcone}>✓</Text>
          <Text style={styles.badgeSalvoTexto}>Salvo</Text>
        </View>
      </View>

      {horaCheckIn ? (
        <View style={styles.checkIn}>
          <Text style={styles.checkInTexto}>Check-in às {horaCheckIn}</Text>
        </View>
      ) : null}

      {progresso ? (
        <View style={styles.progresso}>
          <View style={styles.progressoLinha}>
            <Text style={styles.progressoTexto}>
              Pergunta {progresso.atual} de {progresso.total}
            </Text>
            <Text style={styles.progressoTexto}>{porcentagem}%</Text>
          </View>
          <View style={styles.barraFundo}>
            <View style={[styles.barraPreenchida, { width: `${porcentagem}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function QuestionarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitaIdNumero = Number(id);
  const insets = useSafeAreaInsets();

  const [indiceAtual, setIndiceAtual] = useState(0);

  const visitaIdStore = useVisitaEmAndamentoStore((state) => state.visitaId);
  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const iniciarVisitaStore = useVisitaEmAndamentoStore((state) => state.iniciarVisitaStore);
  const definirResposta = useVisitaEmAndamentoStore((state) => state.definirResposta);
  const observacoesLivres = useVisitaEmAndamentoStore((state) => state.observacoesLivres);
  const definirObservacoesLivres = useVisitaEmAndamentoStore(
    (state) => state.definirObservacoesLivres
  );

  useEffect(() => {
    if (visitaIdNumero && visitaIdStore !== visitaIdNumero) {
      iniciarVisitaStore(visitaIdNumero);
    }
  }, [visitaIdNumero, visitaIdStore, iniciarVisitaStore]);

  const { data: visita } = useVisita(id);

  const {
    data: perguntasOrdenadas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["perguntas-questionario"],
    queryFn: buscarPerguntasQuestionario,
    staleTime: Infinity,
  });

  const tituloCabecalho = visita?.denunciado ?? `Visita #${id}`;

  if (isLoading || (visitaIdNumero && visitaIdStore !== visitaIdNumero)) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <Cabecalho titulo={tituloCabecalho} />
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#1D3F94" />
        </View>
      </View>
    );
  }

  if (isError || perguntasOrdenadas.length === 0) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <Cabecalho titulo={tituloCabecalho} />
        <View style={styles.centralizado}>
          <Text style={styles.mensagem}>
            {isError ? error.message : "Nenhuma pergunta cadastrada no questionário."}
          </Text>
          <Pressable style={styles.botaoTentarNovamente} onPress={() => refetch()}>
            <Text style={styles.botaoTentarNovamenteTexto}>Tentar novamente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const totalPerguntas = perguntasOrdenadas.length;
  const indice = Math.min(indiceAtual, totalPerguntas - 1);
  const pergunta = perguntasOrdenadas[indice];
  const ehPrimeira = indice === 0;
  const ehUltima = indice === totalPerguntas - 1;

  function irParaAnterior() {
    if (ehPrimeira) {
      router.back();
    } else {
      setIndiceAtual(indice - 1);
    }
  }

  function irParaProxima() {
    if (ehUltima) {
      router.push(`/visita/${id}/documento`);
    } else {
      setIndiceAtual(indice + 1);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />

      <Cabecalho
        titulo={tituloCabecalho}
        horaCheckIn={formatarHora(visita?.data_realizacao)}
        progresso={{ atual: indice + 1, total: totalPerguntas }}
      />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <ItemPerguntaQuestionario
          key={pergunta.id}
          pergunta={pergunta}
          valorAtual={respostas[pergunta.id] ?? ""}
          onResponder={(valor) => definirResposta(pergunta.id, valor)}
        />

        {ehUltima && (
          <View style={styles.campoObservacoes}>
            <Text style={styles.rotuloObservacoes}>
              Observações <Text style={styles.opcional}>(opcional)</Text>
            </Text>
            <TextInput
              style={styles.inputObservacoes}
              value={observacoesLivres}
              onChangeText={definirObservacoesLivres}
              placeholder="Descreva o que você viu"
              placeholderTextColor="#8A9AB0"
              multiline
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.botaoRodape, styles.botaoAnterior]}
          accessibilityRole="button"
          onPress={irParaAnterior}
        >
          <Text style={styles.botaoAnteriorTexto}>Anterior</Text>
        </Pressable>
        <Pressable
          style={[styles.botaoRodape, styles.botaoProxima]}
          accessibilityRole="button"
          onPress={irParaProxima}
        >
          <Text style={styles.botaoProximaTexto}>Próxima</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  mensagem: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#4A5B73",
    textAlign: "center",
  },
  botaoTentarNovamente: {
    backgroundColor: "#1D3F94",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  botaoTentarNovamenteTexto: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    fontSize: 16,
  },

  cabecalho: {
    backgroundColor: "#1D3F94",
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
  },
  cabecalhoLinha: {
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
  badgeSalvo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#172F6E",
  },
  badgeSalvoIcone: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
    color: "#FFCC00",
  },
  badgeSalvoTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  checkIn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E2F5EA",
  },
  checkInTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#0E4F27",
  },
  progresso: {
    gap: 6,
  },
  progressoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressoTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  barraFundo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#172F6E",
    overflow: "hidden",
  },
  barraPreenchida: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFCC00",
  },

  conteudo: {
    padding: 20,
    gap: 18,
  },
  campoObservacoes: {
    gap: 8,
  },
  rotuloObservacoes: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#0F1E33",
  },
  opcional: {
    fontFamily: "Inter_400Regular",
    color: "#4A5B73",
  },
  inputObservacoes: {
    minHeight: 96,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#C5D3E3",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F1E33",
  },

  rodape: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DCE5EF",
  },
  botaoRodape: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  botaoAnterior: {
    borderWidth: 1.5,
    borderColor: "#C5D3E3",
  },
  botaoAnteriorTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#0F1E33",
  },
  botaoProxima: {
    backgroundColor: "#1D3F94",
  },
  botaoProximaTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
