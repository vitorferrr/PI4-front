import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Alert } from "react-native";
import { useLocalSearchParams, router, Stack, useFocusEffect, usePreventRemove } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { SlideInLeft, SlideInRight } from "react-native-reanimated";
import { ActivityIndicator, Button, TextInput } from "react-native-paper";
import { cores } from "@/theme";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError, SessaoExpiradaError } from "@/lib/api";
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
  const response = await api.post(`/visitas/${visitaId}/respostas`, { respostas });
  return response.data;
}

export default function QuestionarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitaIdNumero = Number(id);
  const insets = useSafeAreaInsets();

  const [indiceAtual, setIndiceAtual] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "tras">("frente");
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
      if (erro instanceof SessaoExpiradaError) return;
      const detalhes =
        erro instanceof ApiError && erro.erros.length > 0 ? `\n\n${erro.erros.join("\n")}` : "";
      Alert.alert("Erro ao enviar respostas", `${erro.message}${detalhes}`);
    },
  });

  const enviando = enviarRespostasMutation.isPending;
  const documentoGerado = (visita?.documentos?.length ?? 0) > 0;
  const bloqueado = enviando || documentoGerado;

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
          <ActivityIndicator size="large" />
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
          <Button
            mode="contained"
            onPress={() => refetch()}
            style={styles.botaoArredondado}
            labelStyle={styles.botaoTexto}
          >
            Tentar novamente
          </Button>
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
      setDirecao("tras");
      setIndiceAtual(indice - 1);
    }
  }

  function concluirQuestionario() {
    if (concluindoRef.current) return;
    concluindoRef.current = true;

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
      setDirecao("frente");
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
        progresso={{ atual: indice + 1, total: totalPerguntas, respondidas: totalRespondidas }}
      />

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {documentoGerado && (
          <Text style={styles.avisoSomenteLeitura}>
            O documento desta visita já foi gerado. As respostas não podem mais ser alteradas.
          </Text>
        )}

        <Animated.View
          key={pergunta.id}
          entering={(direcao === "frente" ? SlideInRight : SlideInLeft).duration(280)}
        >
          <ItemPerguntaQuestionario
            pergunta={pergunta}
            valorAtual={respostas[pergunta.id] ?? ""}
            onResponder={(valor) => definirResposta(pergunta.id, valor)}
            desabilitado={bloqueado}
          />
        </Animated.View>

        {ehUltima && (
          <View style={styles.campoObservacoes}>
            <Text style={styles.rotuloObservacoes}>
              Observações <Text style={styles.opcional}>(opcional)</Text>
            </Text>
            <TextInput
              mode="outlined"
              value={observacoesLivres}
              onChangeText={definirObservacoesLivres}
              editable={!bloqueado}
              placeholder="Descreva o que você viu"
              placeholderTextColor={cores.textoApagado}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Observações"
              outlineColor={cores.borda}
              outlineStyle={styles.campoBorda}
              style={styles.inputObservacoes}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          mode="outlined"
          disabled={enviando}
          onPress={irParaAnterior}
          textColor={cores.texto}
          style={[styles.botaoRodape, styles.botaoAnterior]}
          contentStyle={styles.botaoRodapeConteudo}
          labelStyle={styles.botaoTexto}
        >
          Anterior
        </Button>
        <Button
          mode="contained"
          disabled={enviando}
          loading={enviando}
          onPress={irParaProxima}
          style={styles.botaoRodape}
          contentStyle={styles.botaoRodapeConteudo}
          labelStyle={styles.botaoProximaTexto}
        >
          {!ehUltima ? "Próxima" : documentoGerado ? "Ver documento" : "Concluir questionário"}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
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
    color: cores.textoSecundario,
    textAlign: "center",
  },
  botaoArredondado: {
    borderRadius: 14,
  },
  botaoTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },

  conteudo: {
    padding: 20,
    gap: 18,
  },
  avisoSomenteLeitura: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.avisoForte,
    backgroundColor: cores.avisoFundo,
    borderRadius: 12,
    padding: 12,
  },
  campoObservacoes: {
    gap: 8,
  },
  rotuloObservacoes: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: cores.texto,
  },
  opcional: {
    fontFamily: "Inter_400Regular",
    color: cores.textoSecundario,
  },
  inputObservacoes: {
    minHeight: 96,
    backgroundColor: cores.branco,
  },
  campoBorda: {
    borderRadius: 14,
    borderWidth: 1.5,
  },

  rodape: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: cores.branco,
    borderTopWidth: 1,
    borderTopColor: cores.bordaClara,
  },
  botaoRodape: {
    flex: 1,
    borderRadius: 14,
  },
  botaoRodapeConteudo: {
    height: 56,
  },
  botaoAnterior: {
    borderWidth: 1.5,
    borderColor: cores.borda,
  },
  botaoProximaTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
  },
});
