import { View, Text, SectionList, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Avatar, Button } from "react-native-paper";
import { useVisitas } from "@/hooks/use-visitas";
import { iniciais } from "@/lib/formatadores";
import { useSessaoStore } from "@/store/sessaoStore";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { VisitaCard } from "@/components/VisitaCard";
import { FaixaTopo } from "@/components/FaixaTopo";
import { cores } from "@/theme";
import type { StatusVisita, VisitaDetalhe } from "@/types/visita";

const STATUS_FINALIZADOS: StatusVisita[] = ["concluida", "cancelada"];

function separarEmSecoes(visitas: VisitaDetalhe[]) {
  const secoes = [
    { titulo: "Em andamento", data: visitas.filter((v) => v.status === "em_andamento") },
    { titulo: "Próximas", data: visitas.filter((v) => v.status === "agendada") },
    {
      titulo: "Finalizadas",
      data: visitas.filter((v) => STATUS_FINALIZADOS.includes(v.status)),
    },
  ];
  return secoes.filter((secao) => secao.data.length > 0);
}

function dataDeHoje() {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function VisitasScreen() {
  const insets = useSafeAreaInsets();
  const usuario = useSessaoStore((state) => state.usuario);
  const visitaNoAparelho = useVisitaEmAndamentoStore((state) => state.visitaId);
  const { data, isPending, isError, error, refetch, isRefetching } = useVisitas();

  const secoes = separarEmSecoes(data ?? []);
  const primeiroNome = usuario?.nome?.trim().split(/\s+/)[0] ?? "";

  return (
    <View style={styles.tela}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <FaixaTopo />
        <Animated.View entering={FadeInDown.duration(500)} style={styles.saudacao}>
          <View style={styles.saudacaoTextos}>
            <Text style={styles.data}>{dataDeHoje()}</Text>
            <Text style={styles.ola} accessibilityRole="header">
              Olá{primeiroNome ? `, ${primeiroNome}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => router.navigate("/perfil")}
            accessibilityRole="button"
            accessibilityLabel="Abrir meu perfil"
            hitSlop={8}
          >
            <Avatar.Text
              size={48}
              label={iniciais(usuario?.nome)}
              style={styles.avatar}
              labelStyle={styles.avatarTexto}
              color={cores.azulEscuro}
            />
          </Pressable>
        </Animated.View>
      </View>

      {isPending ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centro}>
          <Text style={styles.mensagem}>{error.message}</Text>
          <Button mode="contained" onPress={() => refetch()}>
            Tentar novamente
          </Button>
        </View>
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(visita) => String(visita.id)}
          renderSectionHeader={({ section }) => (
            <Animated.Text entering={FadeIn.duration(400)} style={styles.secaoTitulo}>
              {section.titulo}
            </Animated.Text>
          )}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.delay(Math.min(index, 8) * 70).springify()}
              style={styles.item}
            >
              <VisitaCard visita={item} salvaNoAparelho={item.id === visitaNoAparelho} />
            </Animated.View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.lista}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Animated.Text entering={FadeIn.duration(400)} style={styles.mensagem}>
              Nenhuma visita atribuída a você.
            </Animated.Text>
          }
        />
      )}

      <View style={[styles.rodape, { paddingBottom: 24 + insets.bottom }]}>
        <Button
          mode="outlined"
          icon="refresh"
          onPress={() => refetch()}
          loading={isRefetching}
          disabled={isPending || isRefetching}
          style={styles.botaoAtualizar}
          contentStyle={styles.botaoAtualizarConteudo}
          labelStyle={styles.botaoAtualizarTexto}
        >
          Atualizar lista
        </Button>
      </View>
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
  saudacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  saudacaoTextos: {
    gap: 2,
    flex: 1,
  },
  data: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.azulClaro,
  },
  ola: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 34,
    lineHeight: 38,
    textTransform: "uppercase",
    color: cores.branco,
  },
  avatar: {
    backgroundColor: cores.amarelo,
  },
  avatarTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
  },
  secaoTitulo: {
    marginTop: 16,
    marginBottom: 10,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: cores.texto,
  },
  item: {
    marginBottom: 12,
  },
  lista: {
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 20,
  },
  mensagem: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    color: cores.textoSecundario,
    marginTop: 24,
  },
  rodape: {
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: cores.fundo,
    borderTopWidth: 1,
    borderTopColor: cores.bordaClara,
  },
  botaoAtualizar: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: cores.azul,
    backgroundColor: cores.branco,
  },
  botaoAtualizarConteudo: {
    height: 52,
  },
  botaoAtualizarTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
