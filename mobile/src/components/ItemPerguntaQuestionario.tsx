import { View, Text, Pressable, StyleSheet } from "react-native";
import { TextInput } from "react-native-paper";
import { PerguntaQuestionario } from "@/types/visita";
import { cores } from "@/theme";

const OPCOES_SIM_NAO = ["Sim", "Não", "Não se aplica"];

interface ItemPerguntaProps {
  pergunta: PerguntaQuestionario;
  valorAtual: string;
  onResponder: (valor: string) => void;
  desabilitado?: boolean;
}

interface BotaoOpcaoProps {
  rotulo: string;
  selecionado: boolean;
  desabilitado: boolean;
  onPress: () => void;
}

function BotaoOpcao({ rotulo, selecionado, desabilitado, onPress }: BotaoOpcaoProps) {
  return (
    <Pressable
      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionado, disabled: desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
    >
      <View style={[styles.bolinha, selecionado && styles.bolinhaSelecionada]} />
      <Text style={[styles.opcaoTexto, selecionado && styles.opcaoTextoSelecionado]}>{rotulo}</Text>
    </Pressable>
  );
}

export function ItemPerguntaQuestionario({
  pergunta,
  valorAtual,
  onResponder,
  desabilitado = false,
}: ItemPerguntaProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.pergunta}>{pergunta.texto}</Text>

      {pergunta.tipo_resposta === "sim_nao" &&
        OPCOES_SIM_NAO.map((opcao) => (
          <BotaoOpcao
            key={opcao}
            rotulo={opcao}
            selecionado={valorAtual === opcao}
            desabilitado={desabilitado}
            onPress={() => onResponder(opcao)}
          />
        ))}

      {pergunta.tipo_resposta === "numero" && (
        <TextInput
          mode="outlined"
          placeholder="Digite um número"
          placeholderTextColor={cores.textoApagado}
          keyboardType="numeric"
          value={valorAtual}
          editable={!desabilitado}
          onChangeText={onResponder}
          accessibilityLabel={pergunta.texto}
          outlineColor={cores.borda}
          outlineStyle={styles.campoBorda}
          style={styles.input}
        />
      )}

      {pergunta.tipo_resposta === "data" && (
        <TextInput
          mode="outlined"
          placeholder="DD/MM/AAAA"
          placeholderTextColor={cores.textoApagado}
          keyboardType="numbers-and-punctuation"
          value={valorAtual}
          editable={!desabilitado}
          onChangeText={onResponder}
          accessibilityLabel={pergunta.texto}
          outlineColor={cores.borda}
          outlineStyle={styles.campoBorda}
          style={styles.input}
        />
      )}

      {pergunta.tipo_resposta === "texto" && (
        <TextInput
          mode="outlined"
          placeholder="Digite a resposta"
          placeholderTextColor={cores.textoApagado}
          multiline
          textAlignVertical="top"
          value={valorAtual}
          editable={!desabilitado}
          onChangeText={onResponder}
          accessibilityLabel={pergunta.texto}
          outlineColor={cores.borda}
          outlineStyle={styles.campoBorda}
          style={[styles.input, styles.inputMultilinha]}
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
    backgroundColor: cores.branco,
  },
  inputMultilinha: {
    minHeight: 120,
  },
  campoBorda: {
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
