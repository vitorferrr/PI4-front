import { View, Text, ScrollView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Avatar, List } from "react-native-paper";
import { FaixaTopo } from "@/components/FaixaTopo";
import { cores } from "@/theme";

const DISCIPLINA = "Programação para Dispositivos Móveis - 2026.2";

const EQUIPE = [
  { nome: "Lucas Gabriel Maciel de Barros", ra: "00000858201" },
  { nome: "Rafael de Assis Dias Nunes", ra: "00000859118" },
  { nome: "Marconi Taibe de Andrade Filho", ra: "00000858175" },
  { nome: "Vitor dos Santos Ferreira", ra: "00000859882" },
  { nome: "Andressa Karine de Lima Amorim Miranda", ra: "00000859891" },
  { nome: "Beatriz Farias Silva", ra: "00000845759" },
];

export default function SobreScreen() {
  const insets = useSafeAreaInsets();
  const versao = Constants.expoConfig?.version ?? "—";

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <FaixaTopo />
        <View style={styles.titulos}>
          <Text style={styles.sobretitulo}>Constata · Procon Jaboatão</Text>
          <Text style={styles.titulo} accessibilityRole="header">
            Sobre
          </Text>
        </View>
      </View>

      {/* no iOS a barra de abas flutua por cima da tela; o insets.bottom inclui a altura dela */}
      <ScrollView contentContainerStyle={[styles.conteudo, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>O que é</Text>
          <Text style={styles.texto}>
            App de fiscalização do Procon Jaboatão. O fiscalizador recebe as visitas, registra a
            localização, responde o questionário, gera o documento e colhe as assinaturas. As
            visitas e os usuários são cadastrados no painel web.
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Versão</Text>
          <View style={styles.linha}>
            <Text style={styles.linhaRotulo}>Versão do app</Text>
            <Text style={styles.linhaValor}>{versao}</Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.linhaRotulo}>Disciplina</Text>
            <Text style={styles.linhaValor}>{DISCIPLINA}</Text>
          </View>
        </View>

        <View style={[styles.secao, styles.secaoEquipe]}>
          <Text style={[styles.secaoTitulo, styles.equipeTitulo]}>Equipe</Text>
          {EQUIPE.map((pessoa) => (
            <List.Item
              key={pessoa.ra}
              title={pessoa.nome}
              description={`RA ${pessoa.ra}`}
              titleStyle={styles.nome}
              titleNumberOfLines={2}
              descriptionStyle={styles.ra}
              style={styles.pessoa}
              left={() => (
                <Avatar.Text
                  size={36}
                  label={pessoa.nome.charAt(0)}
                  style={styles.avatar}
                  labelStyle={styles.avatarTexto}
                  color={cores.amarelo}
                />
              )}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    backgroundColor: cores.azul,
  },
  titulos: {
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 2,
  },
  sobretitulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.azulClaro,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 32,
    lineHeight: 36,
    textTransform: "uppercase",
    color: cores.branco,
  },
  conteudo: {
    padding: 20,
    gap: 14,
  },
  secao: {
    padding: 16,
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
  },
  secaoEquipe: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    gap: 0,
    overflow: "hidden",
  },
  secaoTitulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: cores.textoSecundario,
  },
  equipeTitulo: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  texto: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: cores.texto,
  },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  linhaRotulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: cores.texto,
  },
  linhaValor: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  pessoa: {
    minHeight: 56,
    paddingLeft: 16,
    borderTopWidth: 1,
    borderTopColor: cores.bordaClara,
  },
  avatar: {
    alignSelf: "center",
    backgroundColor: cores.azulEscuro,
  },
  avatarTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 14,
  },
  nome: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  ra: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
});
