import { View, Text, StyleSheet } from "react-native";
import { Avatar } from "react-native-paper";
import { iniciais } from "@/lib/formatadores";
import { CartaoSecao } from "@/components/CartaoSecao";
import { cores } from "@/theme";
import type { UsuarioResumo } from "@/types/usuario";
import type { Visita } from "@/types/visita";

function Pessoa({ papel, pessoa }: { papel: string; pessoa?: UsuarioResumo | null }) {
  return (
    <View style={styles.pessoa}>
      <Avatar.Text
        size={36}
        label={iniciais(pessoa?.nome)}
        style={styles.avatar}
        labelStyle={styles.avatarTexto}
        color={cores.atribuida}
      />
      <View style={styles.textos}>
        <Text style={styles.papel}>{papel}</Text>
        <Text style={styles.nome} numberOfLines={1}>
          {pessoa?.nome ?? "Não informado"}
        </Text>
        {pessoa?.email && (
          <Text style={styles.papel} numberOfLines={1}>
            {pessoa.email}
          </Text>
        )}
      </View>
    </View>
  );
}

export function EquipeVisita({ visita }: { visita: Visita }) {
  const fiscalizadores = visita.fiscalizadores ?? [];

  return (
    <CartaoSecao titulo="Equipe">
      <Pessoa papel="Gestor responsável" pessoa={visita.gestor} />
      {fiscalizadores.map((fiscal) => (
        <Pessoa key={fiscal.id} papel="Agente fiscalizador" pessoa={fiscal} />
      ))}
      {fiscalizadores.length === 0 && <Pessoa papel="Agente fiscalizador" />}
    </CartaoSecao>
  );
}

const styles = StyleSheet.create({
  pessoa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    backgroundColor: cores.atribuidaFundo,
  },
  avatarTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  textos: {
    flex: 1,
  },
  papel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  nome: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
});
