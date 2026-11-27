import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { ActivityIndicator, Button, DataTable } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn } from "react-native-reanimated";
import { usePerguntasQuestionario } from "@/hooks/use-perguntas-questionario";
import { api } from "@/lib/api";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { CartaoSecao } from "@/components/CartaoSecao";
import { Mensagem } from "@/components/Mensagem";
import { MensagemErro } from "@/components/MensagemErro";
import { Selecao } from "@/components/Selecao";
import { cores } from "@/theme";
import type { Pergunta, TipoResposta } from "@/types/visita";

const LARGURA_DUAS_COLUNAS = 1024;

const TIPOS: { valor: TipoResposta; rotulo: string }[] = [
  { valor: "sim_nao", rotulo: "Sim / Não" },
  { valor: "texto", rotulo: "Texto" },
  { valor: "numero", rotulo: "Número" },
  { valor: "data", rotulo: "Data" },
];

function rotuloDoTipo(tipo?: TipoResposta) {
  return TIPOS.find((opcao) => opcao.valor === tipo)?.rotulo ?? "Sem tipo";
}

interface DadosPergunta {
  texto: string;
  tipo_resposta: TipoResposta;
  ordem: number;
}

function salvarPergunta({ id, dados }: { id: number | null; dados: DadosPergunta }) {
  if (id) return api.put(`/questionario/${id}`, dados);
  return api.post("/questionario", dados);
}

interface FormularioPerguntaProps {
  pergunta: Pergunta | null;
  proximaOrdem: number;
  onFechar: () => void;
}

function FormularioPergunta({ pergunta, proximaOrdem, onFechar }: FormularioPerguntaProps) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState(pergunta?.texto ?? "");
  const [tipo, setTipo] = useState<TipoResposta>(pergunta?.tipo_resposta ?? "sim_nao");
  const [ordem, setOrdem] = useState(String(pergunta?.ordem ?? proximaOrdem));
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const ordemNumero = Number(ordem);
  const erros = {
    texto: texto.trim() ? null : "Escreva a pergunta.",
    ordem:
      Number.isInteger(ordemNumero) && ordemNumero >= 1 ? null : "Use um número a partir de 1.",
  };

  const salvarMutation = useMutation({
    mutationFn: () =>
      salvarPergunta({
        id: pergunta?.id ?? null,
        dados: { texto: texto.trim(), tipo_resposta: tipo, ordem: ordemNumero },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionario"] });
      onFechar();
    },
  });

  function salvar() {
    setTentouEnviar(true);
    if (!erros.texto && !erros.ordem && !salvarMutation.isPending) salvarMutation.mutate();
  }

  return (
    <CartaoSecao titulo={pergunta ? `Editar pergunta ${pergunta.ordem ?? ""}` : "Nova pergunta"}>
      {salvarMutation.isError && <MensagemErro erro={salvarMutation.error} />}
      <Campo
        rotulo="Texto da pergunta *"
        value={texto}
        onChangeText={setTexto}
        placeholder="ex.: Os preços estão visíveis em todos os produtos?"
        multiline
        erro={tentouEnviar ? erros.texto : null}
      />
      <Selecao
        rotulo="Tipo de resposta"
        valor={tipo}
        opcoes={TIPOS}
        onChange={(valor) => setTipo(valor as TipoResposta)}
      />
      <Campo
        rotulo="Ordem no app *"
        value={ordem}
        onChangeText={(valor) => setOrdem(valor.replace(/\D/g, ""))}
        keyboardType="number-pad"
        onSubmitEditing={salvar}
        erro={tentouEnviar ? erros.ordem : null}
        style={styles.campoOrdem}
      />
      <View style={styles.botoes}>
        <Button onPress={onFechar}>Cancelar</Button>
        <Button
          mode="contained"
          onPress={salvar}
          loading={salvarMutation.isPending}
          disabled={salvarMutation.isPending}
        >
          Salvar pergunta
        </Button>
      </View>
    </CartaoSecao>
  );
}

export default function QuestionarioScreen() {
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch, isFetching } = usePerguntasQuestionario(true);
  const [editando, setEditando] = useState<Pergunta | "nova" | null>(null);

  const perguntas = [...(data ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const proximaOrdem = Math.max(0, ...perguntas.map((pergunta) => pergunta.ordem ?? 0)) + 1;

  const excluirMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/questionario/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["questionario"] }),
  });

  function excluir(pergunta: Pergunta) {
    if (window.confirm(`Excluir a pergunta "${pergunta.texto}"? Ela sai do app dos fiscais.`)) {
      if (editando !== "nova" && editando?.id === pergunta.id) setEditando(null);
      excluirMutation.mutate(pergunta.id);
    }
  }

  const formulario = editando && (
    <FormularioPergunta
      key={editando === "nova" ? "nova" : editando.id}
      pergunta={editando === "nova" ? null : editando}
      proximaOrdem={proximaOrdem}
      onFechar={() => setEditando(null)}
    />
  );

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina
        sobretitulo="Auto de constatação"
        titulo="Questionário"
        descricao="As perguntas que o fiscal responde em cada visita, na ordem em que aparecem no app."
        acoes={
          <Button mode="contained" icon="plus" onPress={() => setEditando("nova")}>
            Nova pergunta
          </Button>
        }
      />

      {excluirMutation.isError && <MensagemErro erro={excluirMutation.error} />}

      <View style={[styles.colunas, width >= LARGURA_DUAS_COLUNAS && styles.colunasLado]}>
        <View style={styles.principal}>
          {isPending ? (
            <ActivityIndicator size="large" style={styles.carregando} />
          ) : isError ? (
            <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
          ) : (
            <ScrollView horizontal contentContainerStyle={styles.rolagem}>
              <DataTable style={styles.tabela}>
                <DataTable.Header style={styles.cabecalhoTabela}>
                  <DataTable.Title style={styles.colunaOrdem}>Ordem</DataTable.Title>
                  <DataTable.Title style={styles.colunaTexto}>Pergunta</DataTable.Title>
                  <DataTable.Title>Tipo</DataTable.Title>
                  <DataTable.Title style={styles.colunaAcoes} numeric>
                    Ações
                  </DataTable.Title>
                </DataTable.Header>

                {perguntas.map((pergunta) => {
                  const selecionada = editando !== "nova" && editando?.id === pergunta.id;
                  return (
                    <DataTable.Row
                      key={pergunta.id}
                      style={[styles.linha, selecionada && styles.linhaSelecionada]}
                    >
                      <DataTable.Cell style={styles.colunaOrdem}>
                        <View style={styles.ordem}>
                          <Text style={styles.ordemTexto}>{pergunta.ordem ?? "?"}</Text>
                        </View>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.colunaTexto}>
                        <Text style={styles.texto}>{pergunta.texto}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text style={styles.tipo}>{rotuloDoTipo(pergunta.tipo_resposta)}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.colunaAcoes} numeric>
                        <View style={styles.acoes}>
                          <Button compact onPress={() => setEditando(pergunta)}>
                            Editar
                          </Button>
                          <Button
                            compact
                            textColor={cores.erroForte}
                            onPress={() => excluir(pergunta)}
                          >
                            Excluir
                          </Button>
                        </View>
                      </DataTable.Cell>
                    </DataTable.Row>
                  );
                })}

                {perguntas.length === 0 && <Mensagem>Nenhuma pergunta cadastrada.</Mensagem>}
              </DataTable>
            </ScrollView>
          )}
        </View>

        {formulario && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={width >= LARGURA_DUAS_COLUNAS && styles.lateral}
          >
            {formulario}
          </Animated.View>
        )}
      </View>

      <Text style={styles.rodape}>
        Pergunta que já foi respondida em alguma visita não pode ser excluída nem mudar de tipo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  carregando: {
    marginTop: 40,
  },
  colunas: {
    gap: 20,
  },
  colunasLado: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  principal: {
    flex: 1,
    minWidth: 0,
  },
  lateral: {
    width: 360,
  },
  rolagem: {
    flexGrow: 1,
  },
  tabela: {
    minWidth: 640,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    overflow: "hidden",
    backgroundColor: cores.branco,
  },
  cabecalhoTabela: {
    backgroundColor: cores.fundoTabela,
  },
  linha: {
    minHeight: 64,
    borderBottomColor: cores.linhaTabela,
  },
  linhaSelecionada: {
    backgroundColor: cores.selecionado,
  },
  colunaOrdem: {
    flex: 0.6,
  },
  colunaTexto: {
    flex: 4,
    paddingVertical: 10,
  },
  colunaAcoes: {
    flex: 1.6,
  },
  ordem: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: cores.azul,
  },
  ordemTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: cores.branco,
  },
  texto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  tipo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.atribuida,
  },
  acoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  campoOrdem: {
    width: 140,
  },
  botoes: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  rodape: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
