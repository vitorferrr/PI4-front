import { View, Text, StyleSheet } from "react-native";
import { usePerguntasQuestionario } from "@/hooks/use-perguntas-questionario";
import { textoOuAusente } from "@/lib/formatadores";
import { cores } from "@/theme";
import type { Resposta } from "@/types/visita";

interface RespostasVisitaProps {
  respostas: Resposta[];
  observacoes?: string | null;
}

export function RespostasVisita({ respostas, observacoes }: RespostasVisitaProps) {
  const faltaTexto = respostas.some((resposta) => !resposta.pergunta?.texto);
  const { data: perguntas = [] } = usePerguntasQuestionario(faltaTexto);

  function perguntaDa(resposta: Resposta) {
    return resposta.pergunta ?? perguntas.find((pergunta) => pergunta.id === resposta.pergunta_id);
  }

  const ordenadas = [...respostas].sort(
    (a, b) => (perguntaDa(a)?.ordem ?? Infinity) - (perguntaDa(b)?.ordem ?? Infinity)
  );

  return (
    <View>
      {respostas.length === 0 && (
        <Text style={styles.vazio}>Nenhuma resposta registrada para esta visita.</Text>
      )}
      {ordenadas.map((resposta) => (
        <View key={resposta.id} style={styles.resposta}>
          <Text style={styles.pergunta}>
            {perguntaDa(resposta)?.texto ?? `Pergunta #${resposta.pergunta_id}`}
          </Text>
          <Text style={styles.valor}>{textoOuAusente(resposta.resposta)}</Text>
        </View>
      ))}
      <Text style={styles.observacoes}>
        <Text style={styles.negrito}>Observações do fiscal: </Text>
        {observacoes?.trim() || "Nenhuma observação registrada."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  vazio: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  resposta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: cores.linhaTabela,
  },
  pergunta: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  valor: {
    maxWidth: "50%",
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.texto,
  },
  observacoes: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 19,
    color: cores.texto,
    backgroundColor: cores.fundo,
  },
  negrito: {
    fontFamily: "Inter_700Bold",
  },
});
