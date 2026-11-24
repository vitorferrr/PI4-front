import { useCallback, useEffect, useRef, useState } from "react";
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
import { useLocalSearchParams, router, Stack, useFocusEffect, usePreventRemove } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError, SessaoExpiradaError } from "@/lib/api";
import { formatarHora } from "@/lib/formatadores";
import { useVisita } from "@/hooks/use-visita";
import {
  usePerguntasQuestionario,
  estaRespondida,
  erroFormatoResposta,
} from "@/hooks/use-perguntas-questionario";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { CabecalhoVisita } from "@/components/CabecalhoVisita";
import { ItemPerguntaQuestionario } from "@/components/ItemPerguntaQuestionario";

interface RespostaEnviada {
  pergunta_id: number;
  resposta: string;
}

async function enviarRespostas(visitaId: string, respostas: RespostaEnviada[]) {
  return apiFetch<unknown>(
    `/visitas/${visitaId}/respostas`,
    {
      method: "POST",
      body: JSON.stringify({ respostas }),
    },
    "Não foi possível enviar as respostas do questionário."
  );
}

export default function QuestionarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitaIdNumero = Number(id);
  const insets = useSafeAreaInsets();

  const [indiceAtual, setIndiceAtual] = useState(0);
  // trava síncrona: o isPending só muda no próximo render, então um toque duplo enviaria duas vezes
  // ou abriria o documento duas vezes. É liberada em erro ou quando o fiscal volta para esta tela.
  const concluindoRef = useRef(false);

  const visitaIdStore = useVisitaEmAndamentoStore((state) => state.visitaId);
  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const iniciarVisitaStore = useVisitaEmAndamentoStore((state) => state.iniciarVisitaStore);
  const definirResposta = useVisitaEmAndamentoStore((state) => state.definirResposta);
  const observacoesLivres = useVisitaEmAndamentoStore((state) => state.observacoesLivres);
  const definirObservacoesLivres = useVisitaEmAndamentoStore(
    (state) => state.definirObservacoesLivres
  );
  const respostasEnviadas = useVisitaEmAndamentoStore((state) => state.respostasEnviadas);
  const definirRespostasEnviadas = useVisitaEmAndamentoStore(
    (state) => state.definirRespostasEnviadas
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

  const enviarRespostasMutation = useMutation({
    mutationFn: (lista: RespostaEnviada[]) => enviarRespostas(id, lista),
    onSuccess: (_resultado, lista) => {
      definirRespostasEnviadas(JSON.stringify(lista));
      router.push(`/visita/${id}/documento`);
    },
    onError: (erro) => {
      concluindoRef.current = false;
      // o apiFetch já levou o fiscal para o login
      if (erro instanceof SessaoExpiradaError) return;
      const detalhes =
        erro instanceof ApiError && erro.erros.length > 0 ? `\n\n${erro.erros.join("\n")}` : "";
      Alert.alert("Erro ao enviar respostas", `${erro.message}${detalhes}`);
    },
  });

  const enviando = enviarRespostasMutation.isPending;
  // depois do POST /visitas/:id/documento o back não aceita mais alterar as respostas
  const documentoGerado = (visita?.documentos?.length ?? 0) > 0;
  const bloqueado = enviando || documentoGerado;

  // durante o envio, impede sair da tela (voltar do cabeçalho, botão do Android e gesto do iOS)
  usePreventRemove(enviando, () => {});

  useFocusEffect(
    useCallback(() => {
      concluindoRef.current = false;
    }, [])
  );

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

  function irParaDocumento() {
    router.push(`/visita/${id}/documento`);
  }

  function irParaAnterior() {
    if (enviando) return;
    if (ehPrimeira) {
      router.back();
    } else {
      setIndiceAtual(indice - 1);
    }
  }

  function concluirQuestionario() {
    if (concluindoRef.current) return;
    concluindoRef.current = true;

    // todas as perguntas já foram validadas como respondidas, então vão todas no envio
    const lista = perguntasOrdenadas.map((p) => ({
      pergunta_id: p.id,
      resposta: respostas[p.id].trim(),
    }));

    if (JSON.stringify(lista) === respostasEnviadas) {
      irParaDocumento();
      return;
    }

    enviarRespostasMutation.mutate(lista);
  }

  function irParaProxima() {
    if (!ehUltima) {
      setIndiceAtual(indice + 1);
      return;
    }

    if (documentoGerado) {
      irParaDocumento();
      return;
    }

    if (indicesEmBranco.length > 0) {
      const numeros = indicesEmBranco.map((i) => i + 1).join(", ");
      const mensagem =
        indicesEmBranco.length === 1
          ? `A pergunta ${numeros} está sem resposta.`
          : `As perguntas ${numeros} estão sem resposta.`;

      Alert.alert("Perguntas sem resposta", `${mensagem} Responda todas antes de concluir.`, [
        { text: "Revisar", onPress: () => setIndiceAtual(indicesEmBranco[0]) },
      ]);
      return;
    }

    const indiceInvalido = perguntasOrdenadas.findIndex(
      (p) => erroFormatoResposta(p, respostas[p.id]) !== null
    );
    if (indiceInvalido !== -1) {
      const perguntaInvalida = perguntasOrdenadas[indiceInvalido];
      Alert.alert(
        "Resposta inválida",
        `Pergunta ${indiceInvalido + 1}: ${erroFormatoResposta(perguntaInvalida, respostas[perguntaInvalida.id])}`,
        [{ text: "Revisar", onPress: () => setIndiceAtual(indiceInvalido) }]
      );
      return;
    }

    concluirQuestionario();
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
        {documentoGerado && (
          <Text style={styles.avisoSomenteLeitura}>
            O documento desta visita já foi gerado. As respostas não podem mais ser alteradas.
          </Text>
        )}

        <ItemPerguntaQuestionario
          key={pergunta.id}
          pergunta={pergunta}
          valorAtual={respostas[pergunta.id] ?? ""}
          onResponder={(valor) => definirResposta(pergunta.id, valor)}
          desabilitado={bloqueado}
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
              editable={!bloqueado}
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
          style={[styles.botaoRodape, styles.botaoAnterior, enviando && styles.botaoDesativado]}
          accessibilityRole="button"
          accessibilityState={{ disabled: enviando }}
          disabled={enviando}
          onPress={irParaAnterior}
        >
          <Text style={styles.botaoAnteriorTexto}>Anterior</Text>
        </Pressable>
        <Pressable
          style={[styles.botaoRodape, styles.botaoProxima, enviando && styles.botaoDesativado]}
          accessibilityRole="button"
          accessibilityState={{ disabled: enviando }}
          disabled={enviando}
          onPress={irParaProxima}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botaoProximaTexto}>
              {!ehUltima ? "Próxima" : documentoGerado ? "Ver documento" : "Concluir questionário"}
            </Text>
          )}
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
  avisoSomenteLeitura: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#7A5A00",
    backgroundColor: "#FFF4CC",
    borderRadius: 12,
    padding: 12,
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
  botaoDesativado: {
    opacity: 0.6,
  },
  botaoProximaTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
