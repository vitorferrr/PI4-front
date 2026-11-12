import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
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
    "Não foi possível carregar o questionário."
  );
  return [...perguntas].sort((a, b) => a.ordem - b.ordem);
}

export default function QuestionarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitaIdNumero = Number(id);

  const visitaIdStore = useVisitaEmAndamentoStore((state) => state.visitaId);
  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const iniciarVisitaStore = useVisitaEmAndamentoStore((state) => state.iniciarVisitaStore);
  const definirResposta = useVisitaEmAndamentoStore((state) => state.definirResposta);

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
        <Text style={styles.subtitulo}>{error.message}</Text>
        <Pressable style={styles.botao} onPress={() => refetch()}>
          <Text style={styles.botaoTexto}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }
  if (perguntasOrdenadas.length === 0) {
    return (
      <View style={styles.centralizado}>
        <Stack.Screen options={{ title: `Questionário - Visita #${id}` }} />
        <Text style={styles.subtitulo}>Nenhuma pergunta cadastrada no questionário.</Text>
        <Pressable style={styles.botao} onPress={() => refetch()}>
          <Text style={styles.botaoTexto}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const totalRespondidas = perguntasOrdenadas.filter(
    (p) => respostas[p.id] !== undefined && String(respostas[p.id]).trim() !== ""
  ).length;

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
        <ItemPerguntaQuestionario
          key={pergunta.id}
          pergunta={pergunta}
          valorAtual={respostas[pergunta.id] ?? ""}
          onResponder={(valor) => definirResposta(pergunta.id, valor)}
        />
      ))}

      <Pressable style={styles.botao} onPress={() => router.push(`/visita/${id}/documento`)}>
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
