import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ActivityIndicator, Button, Card } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import { useDadosGerais } from "@/hooks/use-dados-gerais";
import { useVisitas } from "@/hooks/use-visitas";
import { baixarArquivo, exportarVisitas } from "@/lib/exportar";
import { formatarNumero, PERFIS, plural, primeiroNome, STATUS_VISITA } from "@/lib/formatadores";
import { estaAtrasada, venceHoje } from "@/lib/visitas";
import { useSessaoStore } from "@/store/sessaoStore";
import { AvisoPainel } from "@/components/AvisoPainel";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { CartaoSecao } from "@/components/CartaoSecao";
import { GraficoBarras } from "@/components/GraficoBarras";
import { GraficoColunas } from "@/components/GraficoColunas";
import { MensagemErro } from "@/components/MensagemErro";
import { cores } from "@/theme";
import type { Role } from "@/types/usuario";
import type { DadosGerais, StatusVisita, Visita } from "@/types/visita";

const COR_STATUS: Record<StatusVisita, string> = {
  agendada: cores.graficoAzul,
  em_andamento: cores.graficoCeu,
  concluida: cores.graficoVerde,
  cancelada: cores.graficoCinza,
};

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function mesAtual() {
  const texto = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function montarIndicadores({ visitas, documentos, assinaturas }: DadosGerais) {
  return [
    {
      titulo: "Visitas cadastradas",
      valor: visitas.total,
      nota: plural(visitas.por_status.agendada, "agendada", "agendadas"),
    },
    {
      titulo: "Em andamento",
      valor: visitas.por_status.em_andamento,
      nota: "Fiscais em campo agora",
    },
    { titulo: "Concluídas", valor: visitas.por_status.concluida, nota: "Com documento assinado" },
    {
      titulo: "Documentos gerados",
      valor: documentos.total,
      nota: plural(assinaturas.total, "assinatura coletada", "assinaturas coletadas"),
    },
  ];
}

function visitasPorFiscal(visitas: Visita[]) {
  const totais = new Map<number, { rotulo: string; total: number }>();
  for (const visita of visitas) {
    for (const fiscal of visita.fiscalizadores ?? []) {
      const atual = totais.get(fiscal.id) ?? { rotulo: primeiroNome(fiscal.nome), total: 0 };
      totais.set(fiscal.id, { ...atual, total: atual.total + 1 });
    }
  }
  return [...totais.values()].sort((a, b) => b.total - a.total).slice(0, 8);
}

function abrirVisitas(status: StatusVisita) {
  router.push({ pathname: "/admin/visitas", params: { status } });
}

export default function PainelAdminScreen() {
  const usuario = useSessaoStore((state) => state.usuario);
  const { data: dados, isPending, isError, error, refetch, isFetching } = useDadosGerais();
  const { data: visitas = [] } = useVisitas();
  const exportarMutation = useMutation({
    mutationFn: () => exportarVisitas(),
    onSuccess: ({ arquivo }) => baixarArquivo(arquivo, "visitas.csv"),
  });

  const atrasadas = visitas.filter((visita) => estaAtrasada(visita)).length;
  const paraHoje = visitas.filter(
    (visita) => visita.status === "agendada" && venceHoje(visita)
  ).length;
  const emAndamento = visitas.filter((visita) => visita.status === "em_andamento").length;
  const porFiscal = visitasPorFiscal(visitas);

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina
        sobretitulo={mesAtual()}
        titulo={`${saudacao()}, ${primeiroNome(usuario?.nome)}`}
        acoes={
          <>
            <Button
              mode="outlined"
              onPress={() => exportarMutation.mutate()}
              loading={exportarMutation.isPending}
              disabled={exportarMutation.isPending}
              style={styles.botaoContorno}
            >
              Exportar CSV
            </Button>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => router.push("/gestor/visitas/nova")}
            >
              Nova visita
            </Button>
          </>
        }
      />

      {exportarMutation.isError && <MensagemErro erro={exportarMutation.error} />}

      <View style={styles.grade}>
        {(atrasadas > 0 || paraHoje > 0) && (
          <AvisoPainel
            icone="clock-alert-outline"
            cor={cores.erroForte}
            fundo={cores.erroFundo}
            titulo={plural(atrasadas, "visita atrasada", "visitas atrasadas")}
            descricao={`${plural(paraHoje, "agendada", "agendadas")} para hoje`}
            onPress={() => abrirVisitas("agendada")}
          />
        )}
        {emAndamento > 0 && (
          <AvisoPainel
            icone="progress-clock"
            cor={cores.aviso}
            fundo={cores.avisoFundo}
            titulo={plural(emAndamento, "visita em andamento", "visitas em andamento")}
            descricao="Aguardando assinaturas e conclusão"
            onPress={() => abrirVisitas("em_andamento")}
          />
        )}
      </View>

      {isPending ? (
        <ActivityIndicator size="large" style={styles.carregando} />
      ) : isError ? (
        <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
      ) : (
        <>
          <View style={styles.grade}>
            {montarIndicadores(dados).map((indicador) => (
              <Card
                key={indicador.titulo}
                mode="outlined"
                style={styles.indicador}
                contentStyle={styles.indicadorConteudo}
              >
                <Text style={styles.indicadorTitulo}>{indicador.titulo}</Text>
                <Text style={styles.indicadorValor}>{formatarNumero(indicador.valor)}</Text>
                <Text style={styles.indicadorNota}>{indicador.nota}</Text>
              </Card>
            ))}
          </View>

          <View style={styles.grade}>
            <CartaoSecao titulo="Visitas por status" style={styles.grafico}>
              <GraficoBarras
                itens={(Object.keys(STATUS_VISITA) as StatusVisita[]).map((status) => ({
                  rotulo: STATUS_VISITA[status],
                  total: dados.visitas.por_status[status],
                  cor: COR_STATUS[status],
                }))}
              />
            </CartaoSecao>

            <CartaoSecao titulo="Visitas por fiscalizador" style={styles.grafico}>
              {porFiscal.length > 0 ? (
                <GraficoColunas colunas={porFiscal} />
              ) : (
                <Text style={styles.textoApagado}>
                  Nenhuma visita atribuída a fiscalizadores ainda.
                </Text>
              )}
            </CartaoSecao>

            <CartaoSecao titulo="Usuários por perfil" style={styles.graficoLargo}>
              <GraficoBarras
                itens={(Object.keys(PERFIS) as Role[]).map((role) => ({
                  rotulo: PERFIS[role],
                  total: dados.usuarios.por_role[role],
                  cor: cores.graficoRoxo,
                }))}
              />
              <Text style={styles.textoApagado}>
                {plural(dados.usuarios.total, "usuário cadastrado", "usuários cadastrados")} no
                total.
              </Text>
            </CartaoSecao>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 28,
  },
  botaoContorno: {
    borderColor: cores.azul,
  },
  grade: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  carregando: {
    marginTop: 40,
  },
  indicador: {
    flexGrow: 1,
    flexBasis: 230,
    borderRadius: 12,
    backgroundColor: cores.branco,
  },
  indicadorConteudo: {
    padding: 20,
  },
  indicadorTitulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  indicadorValor: {
    marginTop: 8,
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 38,
    lineHeight: 40,
    fontVariant: ["tabular-nums"],
    color: cores.azulEscuro,
  },
  indicadorNota: {
    marginTop: 12,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.textoMedio,
  },
  grafico: {
    flexGrow: 1,
    flexBasis: 420,
  },
  graficoLargo: {
    flexBasis: "100%",
  },
  textoApagado: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
