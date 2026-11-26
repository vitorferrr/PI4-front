import { useState } from "react";
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Avatar, Button, Chip } from "react-native-paper";
import { useVisitas } from "@/hooks/use-visitas";
import { sair } from "@/lib/api";
import { useSessaoStore } from "@/store/sessaoStore";
import { useVisitaEmAndamentoStore } from "@/store/visitaEmAndamentoStore";
import { VisitaCard } from "@/components/VisitaCard";
import { FaixaTopo } from "@/components/FaixaTopo";
import { cores } from "@/theme";
import type { StatusVisita, VisitaDetalhe } from "@/types/visita";

type Filtro = "pendentes" | "finalizadas";

const STATUS_FINALIZADOS: StatusVisita[] = ["concluida", "cancelada"];

function filtrarVisitas(visitas: VisitaDetalhe[], filtro: Filtro) {
  return visitas.filter((visita) => {
    const finalizada = STATUS_FINALIZADOS.includes(visita.status);
    return filtro === "finalizadas" ? finalizada : !finalizada;
  });
}

function dataDeHoje() {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// o usuário salvo no aparelho só tem o id validado, então o nome pode faltar
function iniciais(nome?: string) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : "";
  return (primeira + ultima).toUpperCase() || "?";
}

function confirmarSaida(temVisitaNoAparelho: boolean) {
  const sairAgora = () => sair().catch(() => {});

  if (temVisitaNoAparelho) {
    Alert.alert(
      "Visita em andamento",
      "Você tem uma visita em andamento salva neste aparelho. Se sair agora, as respostas e assinaturas que ainda não foram enviadas serão apagadas.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair e apagar", style: "destructive", onPress: sairAgora },
      ]
    );
    return;
  }

  Alert.alert("Sair da conta", "Deseja sair do aplicativo?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Sair", style: "destructive", onPress: sairAgora },
  ]);
}

export default function VisitasScreen() {
  const insets = useSafeAreaInsets();
  const usuario = useSessaoStore((state) => state.usuario);
  const visitaNoAparelho = useVisitaEmAndamentoStore((state) => state.visitaId);
  const { data, isPending, isError, error, refetch, isRefetching } = useVisitas();
  const [filtro, setFiltro] = useState<Filtro>("pendentes");

  const visitas = data ?? [];
  const pendentes = filtrarVisitas(visitas, "pendentes");
  const finalizadas = filtrarVisitas(visitas, "finalizadas");
  const visiveis = filtro === "pendentes" ? pendentes : finalizadas;
  const primeiroNome = usuario?.nome?.trim().split(/\s+/)[0] ?? "";

  return (
    <View style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <FaixaTopo />
        <View style={styles.saudacao}>
          <View style={styles.saudacaoTextos}>
            <Text style={styles.data}>{dataDeHoje()}</Text>
            <Text style={styles.ola} accessibilityRole="header">
              Olá{primeiroNome ? `, ${primeiroNome}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => confirmarSaida(visitaNoAparelho !== null)}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
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
        </View>
      </View>

      <View style={styles.filtros} accessibilityRole="tablist">
        <Chip
          selected={filtro === "pendentes"}
          showSelectedCheck={false}
          onPress={() => setFiltro("pendentes")}
          style={[styles.filtro, filtro === "pendentes" && styles.filtroAtivo]}
          textStyle={[styles.filtroTexto, filtro === "pendentes" && styles.filtroTextoAtivo]}
          accessibilityRole="tab"
          accessibilityState={{ selected: filtro === "pendentes" }}
        >
          {`Pendentes · ${pendentes.length}`}
        </Chip>
        <Chip
          selected={filtro === "finalizadas"}
          showSelectedCheck={false}
          onPress={() => setFiltro("finalizadas")}
          style={[styles.filtro, filtro === "finalizadas" && styles.filtroAtivo]}
          textStyle={[styles.filtroTexto, filtro === "finalizadas" && styles.filtroTextoAtivo]}
          accessibilityRole="tab"
          accessibilityState={{ selected: filtro === "finalizadas" }}
        >
          {`Finalizadas · ${finalizadas.length}`}
        </Chip>
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
        <FlatList
          data={visiveis}
          keyExtractor={(visita) => String(visita.id)}
          renderItem={({ item }) => (
            <VisitaCard visita={item} salvaNoAparelho={item.id === visitaNoAparelho} />
          )}
          contentContainerStyle={styles.lista}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <Text style={styles.mensagem}>
              {filtro === "pendentes"
                ? "Nenhuma visita pendente atribuída a você."
                : "Nenhuma visita finalizada ainda."}
            </Text>
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
  filtros: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  filtro: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.branco,
  },
  filtroAtivo: {
    borderColor: cores.azulEscuro,
    backgroundColor: cores.azulEscuro,
  },
  filtroTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.textoMedio,
  },
  filtroTextoAtivo: {
    fontFamily: "Inter_700Bold",
    color: cores.branco,
  },
  lista: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
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
