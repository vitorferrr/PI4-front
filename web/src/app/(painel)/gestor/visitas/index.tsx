import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { TextInput } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import TabelaVisitas, { Filtro } from "@/components/TabelaVisitas";
import {
  BotaoPrimario,
  Cartao,
  ErroCarga,
  Mensagem,
  PageHeader,
  Selecao,
  type OpcaoSelecao,
} from "@/components/ui";
import { buscarVisitas } from "@/lib/consultas";
import { statusDoErro } from "@/lib/erros";
import { normalizarPesquisa, STATUS_VISITA } from "@/lib/visitas";
import { cores } from "@/theme";

const OPCOES_STATUS: OpcaoSelecao[] = [
  { valor: "", rotulo: "Todos os status" },
  ...Object.entries(STATUS_VISITA).map(([valor, rotulo]) => ({ valor, rotulo })),
];

export default function GestorVisitasScreen() {
  const [pesquisa, setPesquisa] = useState("");
  const [status, setStatus] = useState("");
  const visitasQuery = useQuery({
    queryKey: ["visitas"],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });
  const visitas = visitasQuery.data ?? [];
  const termo = normalizarPesquisa(pesquisa);
  const visitasFiltradas = visitas.filter(
    (visita) =>
      normalizarPesquisa(
        [visita.denunciado, visita.razao_social, visita.nome_fantasia, visita.cnpj_cpf]
          .filter(Boolean)
          .join(" ")
      ).includes(termo) &&
      (!status || visita.status === status)
  );

  return (
    <View>
      <PageHeader
        eyebrow="Acompanhamento"
        title="Visitas"
        actions={
          <BotaoPrimario icon="plus" onPress={() => router.push("/gestor/visitas/nova")}>
            Nova visita
          </BotaoPrimario>
        }
      />

      <Cartao style={styles.filtrosCartao}>
        <View style={styles.filtros} accessibilityRole="search" aria-label="Filtrar visitas">
          <Filtro rotulo="Pesquisar por estabelecimento">
            <TextInput
              mode="outlined"
              dense
              value={pesquisa}
              onChangeText={setPesquisa}
              placeholder="Nome, razão social ou CNPJ"
              accessibilityLabel="Pesquisar por estabelecimento"
              outlineColor={cores.bordaCampo}
              outlineStyle={styles.campoBorda}
              style={styles.campo}
              placeholderTextColor="#757575"
            />
          </Filtro>
          <Filtro rotulo="Status">
            <Selecao rotulo="Status" valor={status} opcoes={OPCOES_STATUS} onChange={setStatus} />
          </Filtro>
        </View>
      </Cartao>

      {visitasQuery.isPending ? (
        <Mensagem>
          {visitasQuery.fetchStatus === "paused"
            ? "Aguardando conexão para carregar as visitas…"
            : "Carregando visitas…"}
        </Mensagem>
      ) : visitasQuery.isError ? (
        <View style={styles.erro}>
          <ErroCarga
            mensagem={
              statusDoErro(visitasQuery.error) === 403
                ? "Você não tem permissão para consultar as visitas."
                : "Não foi possível carregar as visitas. Verifique sua conexão e tente novamente."
            }
            onTentar={() => visitasQuery.refetch()}
            tentando={visitasQuery.isFetching}
          />
        </View>
      ) : visitas.length === 0 ? (
        <Mensagem>Nenhuma visita disponível.</Mensagem>
      ) : (
        <>
          <Text style={styles.contagem} accessibilityRole="text">
            Exibindo {visitasFiltradas.length} de {visitas.length} visitas.
            {visitasQuery.isFetching ? " Atualizando visitas…" : ""}
          </Text>
          {visitasFiltradas.length === 0 ? (
            <Mensagem>Nenhuma visita corresponde aos filtros informados.</Mensagem>
          ) : (
            <TabelaVisitas
              visitas={visitasFiltradas}
              rotuloVoltar="Voltar para visitas"
              carregando={visitasQuery.isFetching}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filtrosCartao: {
    marginTop: 24,
    padding: 18,
  },
  filtros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  campo: {
    height: 44,
    backgroundColor: cores.branco,
    fontSize: 14,
  },
  campoBorda: {
    borderRadius: 12,
  },
  erro: {
    marginTop: 24,
  },
  contagem: {
    marginTop: 24,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
