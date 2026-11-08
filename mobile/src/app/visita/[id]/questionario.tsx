import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { ItemPerguntaQuestionario } from "@/components/ItemPerguntaQuestionario";
import { PerguntaQuestionario } from "@/types/visita";

async function buscarPerguntasQuestionario(): Promise<PerguntaQuestionario[]> {
  const perguntas = await apiFetch<PerguntaQuestionario[]>(
    "/questionario",
    { method: "GET" },
    "Não foi possível carregar as perguntas do questionário."
  );
  return [...perguntas].sort((a, b) => a.ordem - b.ordem);
}

// o back ainda não tem o campo obrigatoria, então toda pergunta é obrigatória por padrão
function ehObrigatoria(pergunta: PerguntaQuestionario) {
  return pergunta.obrigatoria !== false;
}

export default function QuestionarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitaIdNumero = Number(id);
  const [tentouAvancar, setTentouAvancar] = useState(false);

  const visitaIdStore = useVisitaEmAndamentoStore((state) => state.visitaId);
  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const iniciarVisitaStore = useVisitaEmAndamentoStore(
    (state) => state.iniciarVisitaStore
  );
  const definirResposta = useVisitaEmAndamentoStore(
    (state) => state.definirResposta
  );
  const observacoesLivres = useVisitaEmAndamentoStore(
    (state) => state.observacoesLivres
  );
  const definirObservacoesLivres = useVisitaEmAndamentoStore(
    (state) => state.definirObservacoesLivres
  );

  useEffect(() => {
    if (visitaIdNumero && visitaIdStore !== visitaIdNumero) {
      iniciarVisitaStore(visitaIdNumero);
    }
  }, [visitaIdNumero, visitaIdStore, iniciarVisitaStore]);

  const {
    data: perguntasOrdenadas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["perguntas-questionario"],
    queryFn: buscarPerguntasQuestionario,
  });

  if (isLoading || (visitaIdNumero && visitaIdStore !== visitaIdNumero)) {
    return (
      <View style={styles.centralizado}>
        <Stack.Screen options={{ title: `Questionário - Visita #${id}` }} />
        <ActivityIndicator size="large" color="#1F3864" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centralizado}>
        <Stack.Screen options={{ title: `Questionário - Visita #${id}` }} />
        <Text style={styles.mensagemErro}>{error.message}</Text>
        <Pressable style={styles.botaoTentarNovamente} onPress={() => refetch()}>
          <Text style={styles.botaoTexto}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const estaRespondida = (pergunta: PerguntaQuestionario) =>
    respostas[pergunta.id] !== undefined &&
    String(respostas[pergunta.id]).trim() !== "";

  const totalRespondidas = perguntasOrdenadas.filter(estaRespondida).length;

  const pendentes = perguntasOrdenadas.filter(
    (p) => ehObrigatoria(p) && !estaRespondida(p)
  );

  const handleAvancar = () => {
    if (pendentes.length > 0) {
      setTentouAvancar(true);
      Alert.alert(
        "Respostas obrigatórias",
        `Responda as ${pendentes.length} pergunta(s) obrigatória(s) antes de avançar.`
      );
      return;
    }
    router.push(`/visita/${id}/documento`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: `Questionário - Visita #${id}` }} />

      <View style={styles.resumoTopo}>
        <Text style={styles.titulo}>Questionário de Fiscalização</Text>
        <Text style={styles.subtitulo}>
          Progresso: {totalRespondidas} de {perguntasOrdenadas.length} perguntas respondidas
        </Text>
      </View>

      {perguntasOrdenadas.map((pergunta) => (
        <View key={pergunta.id} style={styles.itemPergunta}>
          <ItemPerguntaQuestionario
            pergunta={pergunta}
            valorAtual={respostas[pergunta.id] ?? ""}
            onResponder={(valor) => definirResposta(pergunta.id, valor)}
          />
          {tentouAvancar && pendentes.includes(pergunta) && (
            <Text style={styles.erroPergunta}>Resposta obrigatória</Text>
          )}
        </View>
      ))}

      <View style={styles.cardObservacoes}>
        <Text style={styles.tituloObservacoes}>Observações livres</Text>
        <TextInput
          style={styles.inputObservacoes}
          placeholder="Anote aqui qualquer observação sobre a visita"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={observacoesLivres}
          onChangeText={definirObservacoesLivres}
        />
      </View>

      <Pressable
        style={styles.botao}
        onPress={handleAvancar}
      >
        <Text style={styles.botaoTexto}>Avançar para o documento</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f6fa",
    gap: 14,
  },
  centralizado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
    padding: 20,
    gap: 16,
  },
  mensagemErro: {
    fontSize: 15,
    color: "#c0392b",
    textAlign: "center",
  },
  botaoTentarNovamente: {
    backgroundColor: "#1F3864",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resumoTopo: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e4e8",
    gap: 4,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F3864",
  },
  subtitulo: {
    fontSize: 14,
    color: "#6c757d",
  },
  itemPergunta: {
    gap: 6,
  },
  erroPergunta: {
    color: "#c0392b",
    fontSize: 13,
    marginLeft: 4,
  },
  cardObservacoes: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e4e8",
    gap: 12,
  },
  tituloObservacoes: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
  },
  inputObservacoes: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: "#fff",
    minHeight: 110,
  },
  botao: {
    backgroundColor: "#1F3864",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});