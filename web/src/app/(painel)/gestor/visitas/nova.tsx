import { useEffect, useState, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, RadioButton } from "react-native-paper";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Campo, Cartao, ListaErros, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { buscarUsuarios, buscarVisitas } from "@/lib/consultas";
import { mensagensDoErro } from "@/lib/erros";
import { calcularCargas, CARGA_VAZIA, corDaCarga, larguraDaCarga } from "@/lib/visitas";
import { useNovaVisitaStore } from "@/store/novaVisitaStore";
import { cores } from "@/theme";
import type { Visita } from "@/types";

const CAMPOS_ESTABELECIMENTO = [
  {
    chave: "razao_social",
    rotulo: "Razão social",
    placeholder: "ex.: Boa Praça Comércio de Alimentos Ltda",
  },
  { chave: "nome_fantasia", rotulo: "Nome fantasia", placeholder: "ex.: Mercadinho Boa Praça" },
  { chave: "cnpj_cpf", rotulo: "CNPJ/CPF", placeholder: "ex.: 12.345.678/0001-90" },
  { chave: "atividade", rotulo: "Atividade", placeholder: "ex.: Supermercado" },
  {
    chave: "endereco",
    rotulo: "Endereço",
    placeholder: "ex.: Av. Bernardo Vieira de Melo, 1520",
  },
  { chave: "bairro", rotulo: "Bairro", placeholder: "ex.: Piedade" },
  { chave: "cep", rotulo: "CEP", placeholder: "ex.: 54.410-010" },
  { chave: "telefone", rotulo: "Telefone", placeholder: "ex.: (81) 3333-4444" },
] as const;

type CampoEstabelecimento = (typeof CAMPOS_ESTABELECIMENTO)[number]["chave"];

// a partir desta largura o resumo fica ao lado do formulário (o "lg" do Tailwind)
const LARGURA_DUAS_COLUNAS = 1024;
const ESPACO_FISCAIS = 10;

async function criarVisita(dados: Record<string, unknown>) {
  const response = await api.post<Visita>("/visitas", dados);
  return response.data;
}

function validar({
  denunciado,
  dataAgendada,
  fiscalizadoresSelecionados,
}: {
  denunciado: string;
  dataAgendada: string;
  fiscalizadoresSelecionados: number[];
}) {
  const erros: Record<string, string> = {};
  if (!denunciado.trim()) {
    erros.denunciado = "Informe os dados do denunciado.";
  }
  if (!dataAgendada) {
    erros.dataAgendada = "Informe a data (dd/mm/aaaa) e a hora (hh:mm) agendadas.";
  }
  if (fiscalizadoresSelecionados.length !== 1) {
    erros.fiscalizador = "Selecione o fiscalizador da visita.";
  }
  return erros;
}

// O RN não tem <input type="datetime-local">: a data e a hora são digitadas com máscara
function mascaraData(texto: string) {
  const numeros = texto.replace(/\D/g, "").slice(0, 8);
  return [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4, 8)].filter(Boolean).join("/");
}

function mascaraHora(texto: string) {
  const numeros = texto.replace(/\D/g, "").slice(0, 4);
  return [numeros.slice(0, 2), numeros.slice(2, 4)].filter(Boolean).join(":");
}

// Junta "26/11/2026" e "14:30" em "2026-11-26T14:30" (o formato do datetime-local antigo).
// Devolve "" se a data ou a hora não existirem (ex.: 31/02 ou 25:00).
function juntarDataHora(data: string, hora: string) {
  const partesData = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const partesHora = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!partesData || !partesHora) return "";
  const [, dia, mes, ano] = partesData.map(Number);
  const [, horas, minutos] = partesHora.map(Number);
  const montada = new Date(ano, mes - 1, dia, horas, minutos);
  const existe =
    montada.getFullYear() === ano &&
    montada.getMonth() === mes - 1 &&
    montada.getDate() === dia &&
    montada.getHours() === horas &&
    montada.getMinutes() === minutos;
  return existe ? `${partesData[3]}-${partesData[2]}-${partesData[1]}T${hora}` : "";
}

function Secao({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <Cartao style={styles.secao}>
      <View style={styles.secaoTitulo}>
        <View style={styles.secaoNumero}>
          <Text style={styles.secaoNumeroTexto}>{numero}</Text>
        </View>
        <Text style={styles.secaoTituloTexto} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {children}
    </Cartao>
  );
}

function ErroCampo({ mensagem }: { mensagem?: string }) {
  return mensagem ? (
    <Text style={styles.erroCampo} accessibilityRole="alert">
      {mensagem}
    </Text>
  ) : null;
}

function LinhaResumo({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <View style={styles.resumoLinha}>
      <Text style={styles.resumoTermo}>{termo}</Text>
      <Text style={styles.resumoValor}>{children}</Text>
    </View>
  );
}

const formatadorResumo = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default function GestorNovaVisitaScreen() {
  const params = useLocalSearchParams<{ fiscal?: string }>();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const duasColunas = width >= LARGURA_DUAS_COLUNAS;
  const colunasFiscais = width >= 1280 ? 3 : width >= 640 ? 2 : 1;
  const [larguraFiscais, setLarguraFiscais] = useState(0);
  const larguraFiscal = (larguraFiscais - ESPACO_FISCAIS * (colunasFiscais - 1)) / colunasFiscais;

  const [denunciado, setDenunciado] = useState("");
  const [estabelecimento, setEstabelecimento] = useState<Record<CampoEstabelecimento, string>>(
    () =>
      Object.fromEntries(CAMPOS_ESTABELECIMENTO.map(({ chave }) => [chave, ""])) as Record<
        CampoEstabelecimento,
        string
      >
  );
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const dataAgendada = juntarDataHora(data, hora);

  const fiscalizadoresSelecionados = useNovaVisitaStore(
    (state) => state.fiscalizadoresSelecionados
  );
  const toggleFiscalizador = useNovaVisitaStore((state) => state.toggleFiscalizador);
  const limparSelecao = useNovaVisitaStore((state) => state.limparSelecao);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: ({ signal }) => buscarUsuarios(signal),
  });
  const visitasQuery = useQuery({
    queryKey: ["visitas"],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });

  const fiscalizadores = (usuariosQuery.data ?? []).filter(
    (usuario) => usuario.role === "fiscalizador"
  );
  const cargas = calcularCargas(visitasQuery.data ?? []);
  // vem do "Atribuir a Fulano" da tela de fiscalizadores
  const fiscalDaUrl = Number(params.fiscal);

  useEffect(() => {
    if (
      Number.isSafeInteger(fiscalDaUrl) &&
      fiscalDaUrl > 0 &&
      fiscalizadores.some((fiscal) => fiscal.id === fiscalDaUrl) &&
      useNovaVisitaStore.getState().fiscalizadoresSelecionados.length === 0
    ) {
      toggleFiscalizador(fiscalDaUrl);
    }
  }, [fiscalDaUrl, fiscalizadores, toggleFiscalizador]);

  useEffect(() => {
    return () => limparSelecao();
  }, [limparSelecao]);

  const criarMutation = useMutation({
    mutationFn: () =>
      criarVisita({
        denunciado: denunciado.trim(),
        data_agendada: dataAgendada ? new Date(dataAgendada).toISOString() : undefined,
        fiscalizadores_ids: fiscalizadoresSelecionados,
        ...Object.fromEntries(
          Object.entries(estabelecimento)
            .map(([chave, valor]) => [chave, valor.trim()])
            .filter(([, valor]) => valor)
        ),
      }),
    onSuccess: (visitaCriada) => {
      void queryClient.invalidateQueries({ queryKey: ["visitas"] });
      limparSelecao();
      const id = visitaCriada?.id;
      if (Number.isSafeInteger(id) && id > 0) {
        router.replace({ pathname: "/gestor/visitas/[id]", params: { id: String(id) } });
      } else {
        router.replace("/");
      }
    },
  });

  // substitui o onSubmit do <form>
  function atribuir() {
    const novosErros = validar({ denunciado, dataAgendada, fiscalizadoresSelecionados });
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0 || criarMutation.isPending) {
      return;
    }
    criarMutation.mutate();
  }

  const fiscalEscolhido = fiscalizadores.find((fiscal) =>
    fiscalizadoresSelecionados.includes(fiscal.id)
  );
  const dataResumo = dataAgendada ? formatadorResumo.format(new Date(dataAgendada)) : "—";
  const local = estabelecimento.nome_fantasia.trim() || denunciado.trim() || "—";
  const endereco =
    [estabelecimento.endereco, estabelecimento.bairro]
      .map((valor) => valor.trim())
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    <View>
      <PageHeader eyebrow="Atribuição" title="Nova visita" />

      <View style={[styles.formulario, duasColunas && styles.formularioDuasColunas]}>
        <View style={styles.colunaPrincipal}>
          {criarMutation.isError ? (
            <ListaErros
              mensagens={mensagensDoErro(
                criarMutation.error,
                "Não foi possível criar a visita. Tente novamente."
              )}
            />
          ) : null}

          <Secao numero={1} titulo="Estabelecimento">
            <Campo
              rotulo="Dados do denunciado *"
              value={denunciado}
              onChangeText={setDenunciado}
              placeholder="Nome ou razão social do denunciado"
              erro={erros.denunciado}
            />

            <Text style={styles.dica}>
              Os dados abaixo saem no documento da visita. Preencha o que tiver.
            </Text>
            <View style={styles.camposGrade}>
              {CAMPOS_ESTABELECIMENTO.map((campo) => (
                <View key={campo.chave} style={styles.campoGrade}>
                  <Campo
                    rotulo={campo.rotulo}
                    value={estabelecimento[campo.chave]}
                    onChangeText={(texto) =>
                      setEstabelecimento((atual) => ({ ...atual, [campo.chave]: texto }))
                    }
                    placeholder={campo.placeholder}
                  />
                </View>
              ))}
            </View>
          </Secao>

          <Secao numero={2} titulo="Fiscalizador e data">
            <Text style={styles.rotulo}>
              Fiscalizador *{" "}
              <Text style={styles.rotuloDetalhe}>
                — a barra mostra as visitas abertas de cada um
              </Text>
            </Text>

            {usuariosQuery.isPending ? (
              <Text style={styles.textoInfo}>Carregando fiscalizadores...</Text>
            ) : usuariosQuery.isError ? (
              <Text style={styles.textoErro} accessibilityRole="alert">
                Erro ao carregar fiscalizadores.
              </Text>
            ) : fiscalizadores.length === 0 ? (
              <Text style={styles.textoInfo}>Nenhum fiscalizador cadastrado.</Text>
            ) : (
              <View
                style={styles.fiscais}
                accessibilityRole="radiogroup"
                aria-label="Fiscalizador"
                onLayout={(evento) => setLarguraFiscais(evento.nativeEvent.layout.width)}
              >
                {larguraFiscais > 0
                  ? fiscalizadores.map((fiscal) => {
                      const ativo = fiscalizadoresSelecionados.includes(fiscal.id);
                      const abertas = (cargas.get(fiscal.id) ?? CARGA_VAZIA).abertas;
                      return (
                        <Pressable
                          key={fiscal.id}
                          onPress={() => toggleFiscalizador(fiscal.id)}
                          accessibilityRole="radio"
                          accessibilityLabel={fiscal.nome}
                          accessibilityState={{ checked: ativo }}
                          style={[
                            styles.fiscal,
                            ativo && styles.fiscalAtivo,
                            { width: larguraFiscal },
                          ]}
                        >
                          <View style={styles.fiscalLinha}>
                            <RadioButton.Android
                              value={String(fiscal.id)}
                              status={ativo ? "checked" : "unchecked"}
                              color={cores.azul}
                              onPress={() => toggleFiscalizador(fiscal.id)}
                            />
                            <Text style={styles.fiscalNome}>{fiscal.nome}</Text>
                            <Text style={styles.fiscalAbertas}>
                              {abertas} {abertas === 1 ? "aberta" : "abertas"}
                            </Text>
                          </View>
                          <View style={styles.trilha}>
                            <View
                              style={[
                                styles.barra,
                                {
                                  backgroundColor: corDaCarga(abertas),
                                  width: larguraDaCarga(abertas) as DimensionValue,
                                },
                              ]}
                            />
                          </View>
                        </Pressable>
                      );
                    })
                  : null}
              </View>
            )}
            <ErroCampo mensagem={erros.fiscalizador} />

            <Text style={[styles.rotulo, styles.rotuloData]}>Data agendada *</Text>
            <View style={styles.dataHora}>
              <View style={styles.dataCampo}>
                <Campo
                  rotulo="Data"
                  value={data}
                  onChangeText={(texto) => setData(mascaraData(texto))}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.horaCampo}>
                <Campo
                  rotulo="Hora"
                  value={hora}
                  onChangeText={(texto) => setHora(mascaraHora(texto))}
                  placeholder="hh:mm"
                  keyboardType="number-pad"
                  onSubmitEditing={atribuir}
                />
              </View>
            </View>
            <ErroCampo mensagem={erros.dataAgendada} />
          </Secao>
        </View>

        <View
          style={[styles.resumo, duasColunas && styles.resumoLateral]}
          aria-label="Resumo da visita"
        >
          <Text style={styles.resumoTitulo}>Resumo</Text>
          <View style={styles.resumoLista}>
            <LinhaResumo termo="Local">{local}</LinhaResumo>
            <LinhaResumo termo="Endereço">{endereco}</LinhaResumo>
            <LinhaResumo termo="Fiscal">{fiscalEscolhido?.nome ?? "—"}</LinhaResumo>
            <LinhaResumo termo="Data">{dataResumo}</LinhaResumo>
          </View>
          <Text style={styles.resumoAviso}>
            A visita aparece no app do fiscalizador assim que for criada.
          </Text>
          <Button
            mode="contained"
            buttonColor={cores.sucesso}
            onPress={atribuir}
            loading={criarMutation.isPending}
            disabled={criarMutation.isPending}
            style={styles.atribuir}
            contentStyle={styles.atribuirConteudo}
            labelStyle={styles.atribuirTexto}
          >
            {criarMutation.isPending ? "Salvando..." : "Atribuir visita"}
          </Button>
          <Pressable
            onPress={() => router.navigate("/gestor/fiscalizadores")}
            accessibilityRole="link"
            style={styles.cancelar}
          >
            <Text style={styles.cancelarTexto}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: {
    marginTop: 24,
    gap: 20,
  },
  formularioDuasColunas: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  colunaPrincipal: {
    flex: 1,
    gap: 16,
  },
  secao: {
    padding: 25,
  },
  secaoTitulo: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  secaoNumero: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: cores.azul,
  },
  secaoNumeroTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.branco,
  },
  secaoTituloTexto: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    color: cores.azulEscuro,
  },
  dica: {
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  camposGrade: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  campoGrade: {
    flexGrow: 1,
    flexBasis: 240,
  },
  rotulo: {
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  rotuloDetalhe: {
    fontFamily: "Inter_400Regular",
    color: cores.textoSecundario,
  },
  rotuloData: {
    marginTop: 16,
    marginBottom: 0,
  },
  textoInfo: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  textoErro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.erroForte,
  },
  fiscais: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ESPACO_FISCAIS,
  },
  fiscal: {
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.branco,
  },
  fiscalAtivo: {
    padding: 10,
    borderWidth: 2,
    borderColor: cores.azul,
    backgroundColor: cores.selecionado,
  },
  fiscalLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fiscalNome: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: cores.texto,
  },
  fiscalAbertas: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoMedio,
  },
  trilha: {
    marginTop: 6,
    marginHorizontal: 4,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: cores.trilha,
  },
  barra: {
    height: 8,
    borderRadius: 999,
  },
  erroCampo: {
    marginTop: 8,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: cores.erroForte,
  },
  dataHora: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  dataCampo: {
    width: 180,
  },
  horaCampo: {
    width: 120,
  },
  resumo: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: cores.azulEscuro,
  },
  resumoLateral: {
    width: 300,
  },
  resumoTitulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    textTransform: "uppercase",
    color: cores.branco,
  },
  resumoLista: {
    marginTop: 16,
    gap: 10,
  },
  resumoLinha: {
    flexDirection: "row",
    gap: 12,
  },
  resumoTermo: {
    width: 78,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.azulMenuTexto,
  },
  resumoValor: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.branco,
  },
  resumoAviso: {
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: cores.azulMenuTexto,
  },
  atribuir: {
    marginTop: 20,
    borderRadius: 12,
  },
  atribuirConteudo: {
    height: 52,
  },
  atribuirTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  cancelar: {
    marginTop: 20,
    alignSelf: "center",
  },
  cancelarTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.branco,
    textDecorationLine: "underline",
  },
});
