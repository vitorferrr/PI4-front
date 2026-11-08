import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { PerguntaQuestionario } from "@/types/visita";

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

const styles = StyleSheet.create({
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
});