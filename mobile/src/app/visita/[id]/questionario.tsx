import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";

export interface PerguntaQuestionario {
  id: number;
  texto: string;
  tipo_resposta: "texto" | "sim_nao" | "numero" | "data";
  ordem: number;
}

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

interface ItemPerguntaProps {
  pergunta: PerguntaQuestionario;
  valorAtual: string;
  onResponder: (valor: string) => void;
}

export function ItemPerguntaQuestionario({
  pergunta,
  valorAtual,
  onResponder,
}: ItemPerguntaProps) {
  return (
    <View style={styles.cardPergunta}>
      <View style={styles.cabecalhoPergunta}>
        <View style={styles.badgeOrdem}>
          <Text style={styles.badgeOrdemTexto}>#{pergunta.ordem}</Text>
        </View>
        <Text style={styles.textoPergunta}>{pergunta.texto}</Text>
      </View>

      {pergunta.tipo_resposta === "sim_nao" && (
        <View style={styles.opcoesSimNao}>
          <Pressable
            style={[
              styles.botaoOpcao,
              valorAtual === "Sim" && styles.botaoOpcaoSelecionado,
            ]}
            onPress={() => onResponder("Sim")}
          >
            <Text
              style={[
                styles.botaoOpcaoTexto,
                valorAtual === "Sim" && styles.botaoOpcaoTextoSelecionado,
              ]}
            >
              Sim
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.botaoOpcao,
              valorAtual === "Não" && styles.botaoOpcaoSelecionado,
            ]}
            onPress={() => onResponder("Não")}
          >
            <Text
              style={[
                styles.botaoOpcaoTexto,
                valorAtual === "Não" && styles.botaoOpcaoTextoSelecionado,
              ]}
            >
              Não
            </Text>
          </Pressable>
        </View>
      )}

      {pergunta.tipo_resposta === "numero" && (
        <TextInput
          style={styles.input}
          placeholder="Digite um valor numérico"
          keyboardType="numeric"
          value={valorAtual}
          onChangeText={onResponder}
        />
      )}

      {pergunta.tipo_resposta === "data" && (
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={valorAtual}
          onChangeText={onResponder}
        />
      )}

      {pergunta.tipo_resposta === "texto" && (
        <TextInput
          style={[styles.input, styles.inputMultilinha]}
          placeholder="Digite a resposta"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={valorAtual}
          onChangeText={onResponder}
        />
      )}
    </View>
  );
}

export default function QuestionarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const respostas = useVisitaEmAndamentoStore((state) => state.respostas);
  const definirResposta = useVisitaEmAndamentoStore((state) => state.definirResposta);

  const perguntasOrdenadas = [...PERGUNTAS_INICIAIS].sort(
    (a, b) => a.ordem - b.ordem
  );

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

      <Pressable
        style={styles.botao}
        onPress={() => router.push(`/visita/${id}/documento`)}
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
  cardPergunta: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e4e8",
    gap: 12,
  },
  cabecalhoPergunta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  badgeOrdem: {
    backgroundColor: "#e8eef7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeOrdemTexto: {
    color: "#1F3864",
    fontWeight: "700",
    fontSize: 12,
  },
  textoPergunta: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
    lineHeight: 21,
  },
  opcoesSimNao: {
    flexDirection: "row",
    gap: 10,
  },
  botaoOpcao: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd3da",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  botaoOpcaoSelecionado: {
    backgroundColor: "#1F3864",
    borderColor: "#1F3864",
  },
  botaoOpcaoTexto: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F3864",
  },
  botaoOpcaoTextoSelecionado: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  inputMultilinha: {
    minHeight: 84,
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