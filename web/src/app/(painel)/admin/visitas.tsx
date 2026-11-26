import { View, Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Button, Card, Checkbox } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import { useVisitas } from "@/hooks/use-visitas";
import { baixarArquivo, exportarVisitas } from "@/lib/exportar";
import { normalizarPesquisa, STATUS_VISITA } from "@/lib/formatadores";
import { estaAtrasada, textoDaVisita } from "@/lib/visitas";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { MensagemErro } from "@/components/MensagemErro";
import { Selecao, type OpcaoSelecao } from "@/components/Selecao";
import { TabelaVisitas } from "@/components/TabelaVisitas";
import { cores } from "@/theme";
import type { UsuarioResumo } from "@/types/usuario";
import type { Visita } from "@/types/visita";

type Filtros = {
  pesquisa?: string;
  status?: string;
  gestor?: string;
  fiscalizador?: string;
  atrasadas?: string;
};

const OPCOES_STATUS: OpcaoSelecao[] = [
  { valor: "", rotulo: "Todos os status" },
  ...Object.entries(STATUS_VISITA).map(([valor, rotulo]) => ({ valor, rotulo })),
];

function opcoesDePessoas(pessoas: (UsuarioResumo | null | undefined)[], todos: string) {
  const unicas = new Map<string, string>();
  for (const pessoa of pessoas) {
    if (pessoa) unicas.set(String(pessoa.id), pessoa.nome);
  }
  const opcoes = [...unicas].map(([valor, rotulo]) => ({ valor, rotulo }));
  opcoes.sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  return [{ valor: "", rotulo: todos }, ...opcoes];
}

function filtrarVisitas(visitas: Visita[], filtros: Filtros) {
  const termo = normalizarPesquisa(filtros.pesquisa);
  return visitas.filter(
    (visita) =>
      normalizarPesquisa(textoDaVisita(visita)).includes(termo) &&
      (!filtros.status || visita.status === filtros.status) &&
      (!filtros.gestor || String(visita.gestor?.id) === filtros.gestor) &&
      (!filtros.fiscalizador ||
        (visita.fiscalizadores ?? []).some(
          (fiscal) => String(fiscal.id) === filtros.fiscalizador
        )) &&
      (!filtros.atrasadas || estaAtrasada(visita))
  );
}

export default function VisitasAdminScreen() {
  const filtros = useLocalSearchParams<Filtros>();
  const { data, isPending, isError, error, refetch, isFetching } = useVisitas();
  const exportarMutation = useMutation({
    mutationFn: exportarVisitas,
    onSuccess: ({ arquivo }) => baixarArquivo(arquivo, "visitas.csv"),
  });

  function mudarFiltro(nome: keyof Filtros, valor: string) {
    router.setParams({ [nome]: valor || undefined });
  }

  function exportar() {
    exportarMutation.mutate({
      status: filtros.status,
      gestor_id: filtros.gestor,
      fiscalizador_id: filtros.fiscalizador,
    });
  }

  const visitas = data ?? [];
  const filtradas = filtrarVisitas(visitas, filtros);

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina
        sobretitulo="Todas as equipes"
        titulo="Visitas"
        acoes={
          <Button
            mode="outlined"
            onPress={exportar}
            loading={exportarMutation.isPending}
            disabled={exportarMutation.isPending}
            style={styles.botaoContorno}
          >
            Exportar CSV
          </Button>
        }
      />

      {exportarMutation.isError && <MensagemErro erro={exportarMutation.error} />}
      {exportarMutation.data?.truncado && (
        <Text style={styles.avisoExportacao}>
          O arquivo não traz todas as {exportarMutation.data.total} visitas, porque o servidor
          limita o tamanho da exportação. Use os filtros para exportar menos visitas por vez.
        </Text>
      )}

      <Card mode="outlined" style={styles.filtrosCartao} contentStyle={styles.filtrosConteudo}>
        <View style={styles.filtros}>
          <Campo
            rotulo="Estabelecimento ou CNPJ"
            value={filtros.pesquisa ?? ""}
            onChangeText={(texto) => mudarFiltro("pesquisa", texto)}
            placeholder="Nome, razão social ou CNPJ"
            style={styles.filtro}
          />
          <Selecao
            rotulo="Status"
            valor={filtros.status ?? ""}
            opcoes={OPCOES_STATUS}
            onChange={(valor) => mudarFiltro("status", valor)}
            style={styles.filtro}
          />
          <Selecao
            rotulo="Gestor"
            valor={filtros.gestor ?? ""}
            opcoes={opcoesDePessoas(
              visitas.map((visita) => visita.gestor),
              "Todos os gestores"
            )}
            onChange={(valor) => mudarFiltro("gestor", valor)}
            style={styles.filtro}
          />
          <Selecao
            rotulo="Fiscalizador"
            valor={filtros.fiscalizador ?? ""}
            opcoes={opcoesDePessoas(
              visitas.flatMap((visita) => visita.fiscalizadores ?? []),
              "Todos os fiscalizadores"
            )}
            onChange={(valor) => mudarFiltro("fiscalizador", valor)}
            style={styles.filtro}
          />
        </View>
        <View style={styles.rodapeFiltros}>
          <Checkbox.Item
            label="Só atrasadas"
            status={filtros.atrasadas ? "checked" : "unchecked"}
            onPress={() => mudarFiltro("atrasadas", filtros.atrasadas ? "" : "1")}
            mode="android"
            position="leading"
            labelStyle={styles.textoApagado}
          />
          <Text style={styles.textoApagado}>
            A exportação em CSV usa os filtros de status, gestor e fiscalizador.
          </Text>
        </View>
      </Card>

      {isPending ? (
        <ActivityIndicator size="large" style={styles.carregando} />
      ) : isError ? (
        <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
      ) : (
        <>
          <Text style={styles.textoApagado}>
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
  botaoContorno: {
    borderColor: cores.azul,
  },
  avisoExportacao: {
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.info,
    backgroundColor: cores.infoFundo,
  },
  filtrosCartao: {
    borderRadius: 16,
    backgroundColor: cores.branco,
  },
  filtrosConteudo: {
    padding: 18,
  },
  filtros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  filtro: {
    flexGrow: 1,
    flexBasis: 220,
  },
  rodapeFiltros: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
  },
  carregando: {
    marginTop: 40,
  },
  textoApagado: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
