import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Checkbox, TextInput } from "react-native-paper";
import { useMutation, useQuery } from "@tanstack/react-query";
import TabelaVisitas, { Filtro } from "@/components/TabelaVisitas";
import {
  BotaoContorno,
  Cartao,
  ErroCarga,
  Mensagem,
  PageHeader,
  Selecao,
  type OpcaoSelecao,
} from "@/components/ui";
import { buscarVisitas } from "@/lib/consultas";
import { statusDoErro } from "@/lib/erros";
import { baixarArquivo, exportarVisitas } from "@/lib/exportar";
import { estaAtrasada, normalizarPesquisa, STATUS_VISITA } from "@/lib/visitas";
import { cores } from "@/theme";
import type { UsuarioResumo, Visita } from "@/types";

type NomeFiltro = "pesquisa" | "status" | "gestor" | "fiscalizador" | "atrasadas";

// Gestores e fiscalizadores que aparecem nas visitas, sem repetição e em ordem alfabética.
function listarPessoas(
  visitas: Visita[],
  obterPessoas: (visita: Visita) => (UsuarioResumo | null | undefined)[]
) {
  const pessoas = new Map<string, string>();
  for (const visita of visitas) {
    for (const pessoa of obterPessoas(visita)) {
      if (pessoa?.id != null) pessoas.set(String(pessoa.id), pessoa.nome || `Usuário ${pessoa.id}`);
    }
  }
  return [...pessoas].sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"));
}

function textoDaVisita(visita: Visita) {
  return normalizarPesquisa(
    [visita.denunciado, visita.razao_social, visita.nome_fantasia, visita.cnpj_cpf]
      .filter(Boolean)
      .join(" ")
  );
}

const OPCOES_STATUS: OpcaoSelecao[] = [
  { valor: "", rotulo: "Todos os status" },
  ...Object.entries(STATUS_VISITA).map(([valor, rotulo]) => ({ valor, rotulo })),
];

export default function AdminVisitasScreen() {
  // Os filtros ficam na URL para continuarem aplicados ao voltar do detalhe da visita.
  const filtros = useLocalSearchParams<Partial<Record<NomeFiltro, string>>>();
  const pesquisa = filtros.pesquisa ?? "";
  const status = filtros.status ?? "";
  const gestor = filtros.gestor ?? "";
  const fiscalizador = filtros.fiscalizador ?? "";
  const soAtrasadas = filtros.atrasadas === "1";

  // setParams troca só esse filtro na URL; undefined tira ele do endereço
  function alterarFiltro(nome: NomeFiltro, valor: string) {
    router.setParams({ [nome]: valor || undefined });
  }

  const visitasQuery = useQuery({
    queryKey: ["visitas"],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });
  const exportarMutation = useMutation({
    mutationFn: exportarVisitas,
    onSuccess: ({ arquivo }) => baixarArquivo(arquivo, "visitas.csv"),
  });

  const visitas = visitasQuery.data ?? [];
  const gestores = listarPessoas(visitas, (visita) => [visita.gestor]);
  const fiscalizadores = listarPessoas(visitas, (visita) => visita.fiscalizadores ?? []);
  const termo = normalizarPesquisa(pesquisa);
  const visitasFiltradas = visitas.filter(
    (visita) =>
      textoDaVisita(visita).includes(termo) &&
      (!status || visita.status === status) &&
      (!gestor || String(visita.gestor?.id) === gestor) &&
      (!fiscalizador || (visita.fiscalizadores ?? []).some((f) => String(f.id) === fiscalizador)) &&
      (!soAtrasadas || estaAtrasada(visita))
  );

  const exportar = () => {
    exportarMutation.mutate({ status, gestor_id: gestor, fiscalizador_id: fiscalizador });
  };

  return (
    <View>
      <PageHeader
        eyebrow="Todas as equipes"
        title="Visitas"
        actions={
          <BotaoContorno
            onPress={exportar}
            disabled={exportarMutation.isPending}
            loading={exportarMutation.isPending}
          >
            {exportarMutation.isPending ? "Exportando…" : "Exportar CSV"}
          </BotaoContorno>
        }
      />

      {exportarMutation.isError ? (
        <View style={styles.aviso}>
          <ErroCarga
            mensagem={
              statusDoErro(exportarMutation.error) === 403
                ? "Você não tem permissão para exportar as visitas."
                : "Não foi possível exportar as visitas. Tente novamente."
            }
          />
        </View>
      ) : exportarMutation.isSuccess ? (
        <Text style={[styles.aviso, styles.avisoInfo]} accessibilityRole="text">
          {exportarMutation.data.truncado
            ? `O arquivo não traz todas as ${exportarMutation.data.total} visitas, porque o servidor limita o tamanho da exportação. Refine os filtros para exportar menos visitas por vez.`
            : "Arquivo visitas.csv gerado."}
        </Text>
      ) : null}

      <Cartao style={styles.filtrosCartao}>
        <View style={styles.filtros} accessibilityRole="search" aria-label="Filtrar visitas">
          <Filtro rotulo="Estabelecimento ou CNPJ">
            <TextInput
              mode="outlined"
              dense
              value={pesquisa}
              onChangeText={(texto) => alterarFiltro("pesquisa", texto)}
              placeholder="Nome, razão social ou CNPJ"
              accessibilityLabel="Estabelecimento ou CNPJ"
              outlineColor={cores.bordaCampo}
              outlineStyle={styles.campoBorda}
              style={styles.campo}
              placeholderTextColor="#757575"
            />
          </Filtro>
          <Filtro rotulo="Status">
            <Selecao
              rotulo="Status"
              valor={status}
              opcoes={OPCOES_STATUS}
              onChange={(valor) => alterarFiltro("status", valor)}
            />
          </Filtro>
          <Filtro rotulo="Gestor">
            <Selecao
              rotulo="Gestor"
              valor={gestor}
              opcoes={[
                { valor: "", rotulo: "Todos os gestores" },
                ...gestores.map(([id, nome]) => ({ valor: id, rotulo: nome })),
              ]}
              onChange={(valor) => alterarFiltro("gestor", valor)}
            />
          </Filtro>
          <Filtro rotulo="Fiscalizador">
            <Selecao
              rotulo="Fiscalizador"
              valor={fiscalizador}
              opcoes={[
                { valor: "", rotulo: "Todos os fiscalizadores" },
                ...fiscalizadores.map(([id, nome]) => ({ valor: id, rotulo: nome })),
              ]}
              onChange={(valor) => alterarFiltro("fiscalizador", valor)}
            />
          </Filtro>
        </View>

        <View style={styles.filtrosRodape}>
          <Pressable
            onPress={() => alterarFiltro("atrasadas", soAtrasadas ? "" : "1")}
            style={styles.checagem}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: soAtrasadas }}
          >
            <Checkbox.Android
              status={soAtrasadas ? "checked" : "unchecked"}
              color={cores.azul}
              onPress={() => alterarFiltro("atrasadas", soAtrasadas ? "" : "1")}
            />
            <Text style={styles.checagemTexto}>Só atrasadas</Text>
          </Pressable>
          <Text style={styles.dica}>
            A exportação em CSV usa os filtros de status, gestor e fiscalizador.
          </Text>
        </View>
      </Cartao>

      {visitasQuery.isPending ? (
        <Mensagem>
          {visitasQuery.fetchStatus === "paused"
            ? "Aguardando conexão para carregar as visitas…"
            : "Carregando visitas…"}
        </Mensagem>
      ) : visitasQuery.isError ? (
        <View style={styles.aviso}>
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
        <Mensagem>Nenhuma visita cadastrada.</Mensagem>
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
  aviso: {
    marginTop: 16,
  },
  avisoInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.info,
    backgroundColor: cores.infoFundo,
  },
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
  filtrosRodape: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  checagem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checagemTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  dica: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  contagem: {
    marginTop: 24,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
