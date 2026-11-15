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
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatarHora } from "@/lib/formatadores";
import { useVisita } from "@/hooks/use-visita";
import { usePerguntasQuestionario, estaRespondida } from "@/hooks/use-perguntas-questionario";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { CabecalhoVisita } from "@/components/CabecalhoVisita";
import { ItemPerguntaQuestionario } from "@/components/ItemPerguntaQuestionario";

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
  } = usePerguntasQuestionario();

  const tituloCabecalho = visita?.denunciado ?? `Visita #${id}`;

  if (isLoading || (visitaIdNumero && visitaIdStore !== visitaIdNumero)) {
    return (
      <View style={styles.tela}>
        <Stack.Screen options={{ headerShown: false }} />
        <CabecalhoVisita titulo={tituloCabecalho} subtitulo="Auto de Constatação" />
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
        <CabecalhoVisita titulo={tituloCabecalho} subtitulo="Auto de Constatação" />
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

  const indicesEmBranco = perguntasOrdenadas
    .map((p, i) => (estaRespondida(respostas[p.id]) ? -1 : i))
    .filter((i) => i !== -1);
  const totalRespondidas = totalPerguntas - indicesEmBranco.length;

  function irParaAnterior() {
    if (ehPrimeira) {
      router.back();
    } else {
      setIndiceAtual(indice - 1);
    }
  }

  function irParaDocumento() {
    router.push(`/visita/${id}/documento`);
  }

  function irParaProxima() {
    if (!ehUltima) {
      setIndiceAtual(indice + 1);
      return;
    }

    if (indicesEmBranco.length === 0) {
      irParaDocumento();
      return;
    }

    const numeros = indicesEmBranco.map((i) => i + 1).join(", ");
    const mensagem =
      indicesEmBranco.length === 1
        ? `A pergunta ${numeros} está sem resposta.`
        : `As perguntas ${numeros} estão sem resposta.`;

    Alert.alert("Perguntas sem resposta", `${mensagem} Quer revisar antes de assinar?`, [
      { text: "Continuar assim", style: "cancel", onPress: irParaDocumento },
      { text: "Revisar", onPress: () => setIndiceAtual(indicesEmBranco[0]) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />

      <CabecalhoVisita
        titulo={tituloCabecalho}
        subtitulo="Auto de Constatação"
        mostrarSelo
        horaCheckIn={formatarHora(visita?.data_realizacao)}
        progresso={{ atual: indice + 1, total: totalPerguntas, respondidas: totalRespondidas }}
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
