import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { PerguntaQuestionario } from "@/types/visita";

const OPCOES_SIM_NAO = ["Sim", "Não", "Não se aplica"];

interface ItemPerguntaProps {
  pergunta: PerguntaQuestionario;
  valorAtual: string;
  onResponder: (valor: string) => void;
}

interface BotaoOpcaoProps {
  rotulo: string;
  selecionado: boolean;
  onPress: () => void;
}

function BotaoOpcao({ rotulo, selecionado, onPress }: BotaoOpcaoProps) {
  return (
    <Pressable
      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionado }}
      onPress={onPress}
    >
      <View style={[styles.bolinha, selecionado && styles.bolinhaSelecionada]} />
      <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado]}>{rotulo}</Text>
    </Pressable>
  );
}

export function ItemPerguntaQuestionario({ pergunta, valorAtual, onResponder }: ItemPerguntaProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.pergunta}>{pergunta.texto}</Text>

      {pergunta.tipo_resposta === "sim_nao" &&
        OPCOES_SIM_NAO.map((opcao) => (
          <BotaoOpcao
            key={opcao}
            rotulo={opcao}
            selecionado={valorAtual === opcao}
            onPress={() => onResponder(opcao)}
          />
        ))}

      {pergunta.tipo_resposta === "numero" && (
        <TextInput
          style={styles.input}
          placeholder="Digite um número"
          placeholderTextColor="#8A9AB0"
          keyboardType="numeric"
          value={valorAtual}
          onChangeText={onResponder}
        />
      )}

      {pergunta.tipo_resposta === "data" && (
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#8A9AB0"
          keyboardType="numbers-and-punctuation"
          value={valorAtual}
          onChangeText={onResponder}
        />
      )}

      {pergunta.tipo_resposta === "texto" && (
        <TextInput
          style={[styles.input, styles.inputMultilinha]}
          placeholder="Digite a resposta"
          placeholderTextColor="#8A9AB0"
          multiline
          textAlignVertical="top"
          value={valorAtual}
          onChangeText={onResponder}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  pergunta: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 27,
    lineHeight: 34,
    color: "#172F6E",
    marginBottom: 4,
  },

  opcao: {
    height: 58,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#C5D3E3",
    backgroundColor: "#FFFFFF",
  },
  opcaoSelecionada: {
    borderWidth: 2,
    borderColor: "#1D3F94",
    backgroundColor: "#1D3F94",
  },
  bolinha: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#8A9AB0",
  },
  bolinhaSelecionada: {
    borderWidth: 6,
    borderColor: "#FFCC00",
    backgroundColor: "#FFFFFF",
  },
  opcaoTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#0F1E33",
  },
  opcaoTextoSelecionado: {
    color: "#FFFFFF",
  },

  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: "#C5D3E3",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: "#0F1E33",
    backgroundColor: "#FFFFFF",
  },
  inputMultilinha: {
    height: undefined,
    minHeight: 120,
    paddingVertical: 12,
  },
});
