import { useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFiscalizadores } from "@/hooks/use-usuarios";
import { useVisitas } from "@/hooks/use-visitas";
import { api } from "@/lib/api";
import { formatarData, juntarDataHora, mascaraData, mascaraHora } from "@/lib/formatadores";
import { calcularCargas } from "@/lib/visitas";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { CartaoSecao } from "@/components/CartaoSecao";
import { Grade } from "@/components/Grade";
import { MensagemErro } from "@/components/MensagemErro";
import { OpcaoFiscal } from "@/components/OpcaoFiscal";
import { ResumoVisita } from "@/components/ResumoVisita";
import { cores } from "@/theme";
import type { Visita } from "@/types/visita";

const LARGURA_DUAS_COLUNAS = 1024;

const CAMPOS_ESTABELECIMENTO = [
  {
    chave: "razao_social",
    rotulo: "Razão social",
    exemplo: "Boa Praça Comércio de Alimentos Ltda",
  },
  { chave: "nome_fantasia", rotulo: "Nome fantasia", exemplo: "Mercadinho Boa Praça" },
  { chave: "cnpj_cpf", rotulo: "CNPJ/CPF", exemplo: "12.345.678/0001-90" },
  { chave: "atividade", rotulo: "Atividade", exemplo: "Supermercado" },
  { chave: "endereco", rotulo: "Endereço", exemplo: "Av. Bernardo Vieira de Melo, 1520" },
  { chave: "bairro", rotulo: "Bairro", exemplo: "Piedade" },
  { chave: "cep", rotulo: "CEP", exemplo: "54.410-010" },
  { chave: "telefone", rotulo: "Telefone", exemplo: "(81) 3333-4444" },
] as const;

type CampoEstabelecimento = (typeof CAMPOS_ESTABELECIMENTO)[number]["chave"];
type Estabelecimento = Partial<Record<CampoEstabelecimento, string>>;

function semCamposVazios(estabelecimento: Estabelecimento) {
  const preenchidos = Object.entries(estabelecimento).map(([chave, valor]) => [
    chave,
    valor?.trim(),
  ]);
  return Object.fromEntries(preenchidos.filter(([, valor]) => valor));
}

async function criarVisita(dados: Record<string, unknown>) {
  const response = await api.post<Visita>("/visitas", dados);
  return response.data;
}

export default function NovaVisitaScreen() {
  const params = useLocalSearchParams<{ fiscal?: string }>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { fiscalizadores, isPending, isError, error } = useFiscalizadores();
  const { data: visitas } = useVisitas();

  const [denunciado, setDenunciado] = useState("");
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento>({});
  const [fiscalId, setFiscalId] = useState(Number(params.fiscal) || null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const cargas = calcularCargas(visitas ?? []);
  const fiscal = fiscalizadores.find((usuario) => usuario.id === fiscalId);
  const dataAgendada = juntarDataHora(data, hora);
  const erros = {
    denunciado: denunciado.trim() ? null : "Informe os dados do denunciado.",
    fiscal: fiscal ? null : "Selecione o fiscalizador da visita.",
    data: dataAgendada ? null : "Informe a data (dd/mm/aaaa) e a hora (hh:mm) agendadas.",
  };
  const valido = !erros.denunciado && !erros.fiscal && !erros.data;

  const criarMutation = useMutation({
    mutationFn: () =>
      criarVisita({
        ...semCamposVazios(estabelecimento),
        denunciado: denunciado.trim(),
        data_agendada: dataAgendada?.toISOString(),
        fiscalizadores_ids: [fiscalId],
      }),
    onSuccess: (visita) => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      router.replace({ pathname: "/gestor/visitas/[id]", params: { id: visita.id } });
    },
  });

  function atribuir() {
    setTentouEnviar(true);
    if (valido && !criarMutation.isPending) criarMutation.mutate();
  }

  function mudarCampo(chave: CampoEstabelecimento, valor: string) {
    setEstabelecimento((atual) => ({ ...atual, [chave]: valor }));
  }

  const endereco = [estabelecimento.endereco, estabelecimento.bairro].filter(Boolean).join(" · ");

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina sobretitulo="Atribuição" titulo="Nova visita" />

      <View style={[styles.colunas, width >= LARGURA_DUAS_COLUNAS && styles.colunasLado]}>
        <View style={styles.formulario}>
          {criarMutation.isError && <MensagemErro erro={criarMutation.error} />}

          <CartaoSecao numero={1} titulo="Estabelecimento">
            <Campo
              rotulo="Dados do denunciado *"
              value={denunciado}
              onChangeText={setDenunciado}
              placeholder="Nome ou razão social do denunciado"
              erro={tentouEnviar ? erros.denunciado : null}
            />
            <Text style={styles.dica}>
              Os dados abaixo saem no documento da visita. Preencha o que tiver.
            </Text>
            <View style={styles.camposGrade}>
              {CAMPOS_ESTABELECIMENTO.map((campo) => (
                <Campo
                  key={campo.chave}
                  rotulo={campo.rotulo}
                  value={estabelecimento[campo.chave] ?? ""}
                  onChangeText={(texto) => mudarCampo(campo.chave, texto)}
                  placeholder={`ex.: ${campo.exemplo}`}
                  style={styles.campoGrade}
                />
              ))}
            </View>
          </CartaoSecao>

          <CartaoSecao numero={2} titulo="Fiscalizador e data">
            <Text style={styles.rotulo}>
              Fiscalizador *{" "}
              <Text style={styles.dica}>— a barra mostra as visitas abertas de cada um</Text>
            </Text>
            {isPending && <Text style={styles.dica}>Carregando fiscalizadores...</Text>}
            {isError && <MensagemErro erro={error} />}
            <Grade>
              {fiscalizadores.map((opcao) => (
                <OpcaoFiscal
                  key={opcao.id}
                  fiscal={opcao}
                  abertas={cargas.get(opcao.id)?.abertas ?? 0}
                  selecionado={opcao.id === fiscalId}
                  onPress={() => setFiscalId(opcao.id)}
                />
              ))}
            </Grade>
            {tentouEnviar && erros.fiscal && <Text style={styles.erro}>{erros.fiscal}</Text>}

            <View style={styles.dataHora}>
              <Campo
                rotulo="Data agendada *"
                value={data}
                onChangeText={(texto) => setData(mascaraData(texto))}
                placeholder="dd/mm/aaaa"
                style={styles.campoData}
              />
              <Campo
                rotulo="Hora *"
                value={hora}
                onChangeText={(texto) => setHora(mascaraHora(texto))}
                placeholder="hh:mm"
                onSubmitEditing={atribuir}
                style={styles.campoHora}
              />
            </View>
            {tentouEnviar && erros.data && <Text style={styles.erro}>{erros.data}</Text>}
          </CartaoSecao>
        </View>

        <ResumoVisita
          local={estabelecimento.nome_fantasia?.trim() || denunciado.trim() || "—"}
          endereco={endereco || "—"}
          fiscal={fiscal?.nome ?? "—"}
          data={dataAgendada ? formatarData(dataAgendada.toISOString()) : "—"}
          style={width >= LARGURA_DUAS_COLUNAS && styles.resumoLateral}
        >
          <Button
            mode="contained"
            buttonColor={cores.sucesso}
            onPress={atribuir}
            loading={criarMutation.isPending}
            disabled={criarMutation.isPending}
            contentStyle={styles.atribuir}
          >
            Atribuir visita
          </Button>
          <Button
            textColor={cores.branco}
            onPress={() => router.navigate("/gestor/fiscalizadores")}
          >
            Cancelar
          </Button>
        </ResumoVisita>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  colunas: {
    gap: 20,
  },
  colunasLado: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  formulario: {
    flex: 1,
    gap: 16,
  },
  resumoLateral: {
    width: 300,
  },
  dica: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  camposGrade: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  campoGrade: {
    flexGrow: 1,
    flexBasis: 240,
  },
  rotulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  erro: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.erroForte,
  },
  dataHora: {
    flexDirection: "row",
    gap: 16,
  },
  campoData: {
    width: 180,
  },
  campoHora: {
    width: 120,
  },
  atribuir: {
    height: 50,
  },
});
