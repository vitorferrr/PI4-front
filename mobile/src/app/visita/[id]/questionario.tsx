import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { ItemPerguntaQuestionario } from "@/components/ItemPerguntaQuestionario";
import { PerguntaQuestionario } from "@/types/visita";

const PERGUNTAS_INICIAIS: PerguntaQuestionario[] = [
  {
    id: 1,
    ordem: 1,
    texto: "O estabelecimento possui exemplar do Código de Defesa do Consumidor visível?",
    tipo_resposta: "sim_nao",
  },
  {
    id: 2,
    ordem: 2,
    texto: "Os produtos expostos apresentam preços claros e visíveis ao consumidor?",
    tipo_resposta: "sim_nao",
  },
  {
    id: 3,
    ordem: 3,
    texto: "Quantidade de irregularidades constatadas no local:",
    tipo_resposta: "numero",
  },
  {
    id: 4,
    ordem: 4,
    texto: "Data limite informada para regularização (caso aplicável):",
    tipo_resposta: "data",
  },
  {
    id: 5,
    ordem: 5,
    texto: "Descrição detalhada da constatação fiscal:",
    tipo_resposta: "texto",
  },
];

const PERGUNTAS_INICIAIS_ORDENADAS: PerguntaQuestionario[] = [...PERGUNTAS_INICIAIS].sort(
  (a, b) => a.ordem - b.ordem
);
async function buscarPerguntasQuestionario(): Promise<PerguntaQuestionario[]> {
  try {
    const perguntas = await apiFetch<PerguntaQuestionario[]>("/perguntas", {
      method: "GET",
    });
    return [...perguntas].sort((a, b) => a.ordem - b.ordem);
  } catch {
    return PERGUNTAS_INICIAIS_ORDENADAS;
  }
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

  const { data: perguntasOrdenadas = PERGUNTAS_INICIAIS_ORDENADAS, isLoading } = useQuery({
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
