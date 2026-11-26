import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ActivityIndicator, Button, Card } from "react-native-paper";
import { useVisitas } from "@/hooks/use-visitas";
import { OPCOES_STATUS } from "@/lib/formatadores";
import { filtrarVisitas } from "@/lib/visitas";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { MensagemErro } from "@/components/MensagemErro";
import { Selecao } from "@/components/Selecao";
import { TabelaVisitas } from "@/components/TabelaVisitas";
import { cores } from "@/theme";

export default function VisitasGestorScreen() {
  const [pesquisa, setPesquisa] = useState("");
  const [status, setStatus] = useState("");
  const { data, isPending, isError, error, refetch, isFetching } = useVisitas();

  const visitas = data ?? [];
  const filtradas = filtrarVisitas(visitas, { pesquisa, status });

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina
        sobretitulo="Acompanhamento"
        titulo="Visitas"
        acoes={
          <Button mode="contained" icon="plus" onPress={() => router.push("/gestor/visitas/nova")}>
            Nova visita
          </Button>
        }
      />

      <Card mode="outlined" style={styles.filtrosCartao} contentStyle={styles.filtros}>
        <Campo
          rotulo="Pesquisar por estabelecimento"
          value={pesquisa}
          onChangeText={setPesquisa}
          placeholder="Nome, razão social ou CNPJ"
          style={styles.filtro}
        />
        <Selecao
          rotulo="Status"
          valor={status}
          opcoes={OPCOES_STATUS}
          onChange={setStatus}
          style={styles.filtro}
        />
      </Card>

      {isPending ? (
        <ActivityIndicator size="large" style={styles.carregando} />
      ) : isError ? (
        <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
      ) : (
        <>
          <Text style={styles.contagem}>
            Exibindo {filtradas.length} de {visitas.length} visitas.
          </Text>
          <TabelaVisitas visitas={filtradas} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  filtrosCartao: {
    borderRadius: 16,
    backgroundColor: cores.branco,
  },
  filtros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    padding: 18,
  },
  filtro: {
    flexGrow: 1,
    flexBasis: 260,
  },
  carregando: {
    marginTop: 40,
  },
  contagem: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
