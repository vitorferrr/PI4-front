import { useRef, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Button, Icon } from "react-native-paper";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isCancel } from "axios";
import {
  Avatar,
  BotaoContorno,
  Cartao,
  ErroCarga,
  Mensagem,
  StatusBadge,
  TituloCartao,
} from "@/components/ui";
import { api } from "@/lib/api";
import { statusDoErro } from "@/lib/erros";
import { formatarDataVisita as formatarData, iniciais, nomeEstabelecimento } from "@/lib/visitas";
import { cores } from "@/theme";
import type { Documento, Pergunta, Resposta, UsuarioResumo, Visita } from "@/types";

// a partir desta largura a coluna de ações fica ao lado (o "lg" do Tailwind)
const LARGURA_DUAS_COLUNAS = 1024;

const ERROS_VISITA: Record<number, { titulo: string; mensagem: string }> = {
  403: {
    titulo: "Acesso não permitido",
    mensagem: "Você não tem permissão para visualizar esta visita.",
  },
  404: {
    titulo: "Visita não encontrada",
    mensagem: "Não foi encontrada uma visita com o ID informado.",
  },
};

const ERROS_CONCLUSAO: Record<number, string> = {
  400: "A visita não pôde ser concluída. Confira a mensagem do servidor e atualize os dados antes de tentar novamente.",
  403: "Você não tem permissão para concluir esta visita.",
  404: "A visita não foi encontrada ou não está disponível para seu usuário.",
  500: "O servidor não conseguiu confirmar a conclusão. Atualize os dados antes de tentar novamente.",
};

// Quem abre a visita pode informar para onde voltar (ex.: a lista do admin com os filtros).
// Antes vinha no "state" do react-router; agora vem nos parâmetros da rota.
// Só aceita caminhos internos; sem informação, volta para o início como antes.
function obterDestinoVoltar(voltarPara: unknown, rotuloVoltar: unknown) {
  if (
    typeof voltarPara !== "string" ||
    !voltarPara.startsWith("/") ||
    voltarPara.startsWith("//")
  ) {
    return { para: "/", rotulo: "Voltar ao início" };
  }
  return { para: voltarPara, rotulo: typeof rotuloVoltar === "string" ? rotuloVoltar : "Voltar" };
}

function textoOuAusente(valor: unknown) {
  return valor == null || String(valor).trim() === "" ? "Não informado" : String(valor);
}

function obterUrlPdf(valor: unknown) {
  if (typeof valor !== "string" || !valor.trim()) return null;
  try {
    const url = new URL(valor.trim(), api.defaults.baseURL);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

async function buscarVisita(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Visita>(`/visitas/${id}`, { signal });
  return data ?? null;
}

async function concluirVisita(id: string) {
  const { data } = await api.patch<Visita>(`/visitas/${id}/concluir`);
  if (data?.id !== Number(id) || data.status !== "concluida") {
    throw new Error("A resposta da API não confirmou a conclusão da visita.");
  }
  return data;
}

async function buscarQuestionario(signal?: AbortSignal) {
  const { data } = await api.get<Pergunta[]>("/questionario", { signal });
  if (!Array.isArray(data)) {
    throw new Error("Não foi possível interpretar as perguntas do questionário.");
  }
  return data;
}

function Card({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Cartao style={styles.card}>
      <TituloCartao>{titulo}</TituloCartao>
      <View style={styles.cardConteudo}>{children}</View>
    </Cartao>
  );
}

function Dado({
  termo,
  children,
  largura,
}: {
  termo: string;
  children: ReactNode;
  largura: DimensionValue;
}) {
  return (
    <View style={[styles.dadoCaixa, { width: largura }]}>
      <View style={styles.dado}>
        <Text style={styles.dadoTermo}>{termo}</Text>
        <Text style={styles.dadoValor}>{children}</Text>
      </View>
    </View>
  );
}

function TentarNovamente({ onPress, carregando }: { onPress: () => void; carregando: boolean }) {
  return (
    <BotaoContorno onPress={onPress} disabled={carregando}>
      {carregando ? "Tentando novamente…" : "Tentar novamente"}
    </BotaoContorno>
  );
}

function LinkExterno({ url, children }: { url: string; children: ReactNode }) {
  // no navegador, o Linking.openURL do RN abre o endereço em outra aba
  return (
    <Pressable onPress={() => void Linking.openURL(url)} accessibilityRole="link">
      {children}
    </Pressable>
  );
}

type Etapa = {
  label: string;
  quando: string;
  estado: "feito" | "atual" | "pendente" | "cancelado";
};

function montarEtapas(visita: Visita): Etapa[] {
  const documento = visita.documentos?.[0];
  const ordem = ["agendada", "em_andamento", "documento", "concluida"];
  const atual =
    visita.status === "concluida"
      ? "concluida"
      : visita.status === "em_andamento" && documento
        ? "documento"
        : visita.status;
  const indiceAtual = ordem.indexOf(atual);
  const estado = (indice: number): Etapa["estado"] => {
    if (visita.status === "cancelada") return indice === 0 ? "feito" : "cancelado";
    if (visita.status === "concluida" || indice < indiceAtual) return "feito";
    return indice === indiceAtual ? "atual" : "pendente";
  };

  return [
    { label: "Agendada", quando: formatarData(visita.data_agendada), estado: estado(0) },
    {
      label: "Em andamento",
      quando: visita.data_realizacao ? formatarData(visita.data_realizacao) : "—",
      estado: estado(1),
    },
    {
      label: "Documento gerado",
      quando: documento?.data_geracao ? formatarData(documento.data_geracao) : "—",
      estado: estado(2),
    },
    {
      label: visita.status === "cancelada" ? "Cancelada" : "Concluída",
      quando: visita.status === "concluida" ? formatarData(visita.updatedAt) : "—",
      estado: visita.status === "cancelada" ? "atual" : estado(3),
    },
  ];
}

const COR_ETAPA: Record<Etapa["estado"], string> = {
  feito: "#2f9e5b",
  atual: "#f5c518",
  pendente: "#dfe6ef",
  cancelado: "#dfe6ef",
};

function Andamento({ visita, quatroColunas }: { visita: Visita; quatroColunas: boolean }) {
  const etapas = montarEtapas(visita);
  return (
    <Cartao style={styles.andamento}>
      <View style={styles.andamentoEtapas} aria-label="Andamento">
        {etapas.map((etapa, indice) => (
          <View key={etapa.label} style={[styles.etapa, { width: quatroColunas ? "25%" : "50%" }]}>
            <View style={styles.etapaLinha}>
              <View style={[styles.etapaBolinha, { backgroundColor: COR_ETAPA[etapa.estado] }]} />
              {indice < etapas.length - 1 ? (
                <View
                  style={[
                    styles.etapaTraco,
                    { backgroundColor: etapa.estado === "feito" ? "#2f9e5b" : "#dfe6ef" },
                  ]}
                />
              ) : null}
            </View>
            <Text
              style={[
                styles.etapaRotulo,
                etapa.estado === "atual" && styles.etapaRotuloAtual,
                (etapa.estado === "pendente" || etapa.estado === "cancelado") &&
                  styles.etapaRotuloPendente,
              ]}
            >
              {etapa.label}
            </Text>
            <Text style={styles.etapaQuando}>{etapa.quando}</Text>
          </View>
        ))}
      </View>
    </Cartao>
  );
}

function ConclusaoVisita({ id, status }: { id: string; status: string }) {
  const queryClient = useQueryClient();
  // Trava síncrona: dois eventos podem chegar antes de isPending aparecer no render.
  const enviando = useRef(false);
  const concluirMutation = useMutation({
    mutationKey: ["concluirVisita", id],
    mutationFn: () => concluirVisita(id),
    retry: false,
    onMutate: () => queryClient.cancelQueries({ queryKey: ["visita", id], exact: true }),
    onSuccess: (visitaAtualizada: Visita) => {
      queryClient.setQueryData(["visita", id], visitaAtualizada);
      void queryClient.invalidateQueries({ queryKey: ["visitas"] });
    },
    onError: (erro: unknown) => {
      enviando.current = false;
      if (!isCancel(erro) && statusDoErro(erro) !== 401) {
        void queryClient.invalidateQueries({ queryKey: ["visita", id], exact: true });
      }
    },
  });

  const handleConcluir = () => {
    if (status !== "em_andamento" || enviando.current || concluirMutation.isPending) return;
    // no navegador o window.confirm continua funcionando (o Alert do RN não faz nada na web)
    if (!window.confirm(`Deseja concluir a visita #${id}?`)) return;
    enviando.current = true;
    concluirMutation.mutate();
  };

  const temErro = concluirMutation.isError && !isCancel(concluirMutation.error);
  if (status !== "em_andamento" && !concluirMutation.isSuccess && !temErro) return null;

  const statusErro = statusDoErro(concluirMutation.error);
  const detalhesErro =
    statusErro === 400
      ? (concluirMutation.error as { response?: { data?: { erros?: unknown } } }).response?.data
          ?.erros
      : null;

  return (
    <View style={styles.conclusao} aria-label="Conclusão da visita">
      <Text style={styles.conclusaoTitulo}>Conclusão da visita</Text>
      <Text style={styles.conclusaoTexto}>
        A visita só é concluída depois que o documento final é gerado com todas as assinaturas.
      </Text>
      {status === "em_andamento" ? (
        <Button
          mode="contained"
          buttonColor={cores.sucesso}
          onPress={handleConcluir}
          disabled={concluirMutation.isPending}
          loading={concluirMutation.isPending}
          style={styles.concluir}
          contentStyle={styles.concluirConteudo}
          labelStyle={styles.concluirTexto}
        >
          {concluirMutation.isPending
            ? concluirMutation.isPaused
              ? "Aguardando conexão…"
              : "Concluindo visita…"
            : "Concluir visita"}
        </Button>
      ) : null}
      {concluirMutation.isSuccess ? (
        <Text style={styles.conclusaoSucesso} accessibilityRole="text">
          Visita concluída com sucesso.
        </Text>
      ) : null}
      {temErro ? (
        <View style={styles.conclusaoErro} accessibilityRole="alert">
          <Text style={styles.conclusaoErroTexto}>
            {(statusErro && ERROS_CONCLUSAO[statusErro]) ??
              "Não foi possível confirmar a conclusão. Verifique sua conexão e atualize os dados antes de tentar novamente."}
          </Text>
          {Array.isArray(detalhesErro)
            ? detalhesErro
                .filter((mensagem): mensagem is string => typeof mensagem === "string")
                .map((mensagem, indice) => (
                  <Text key={indice} style={styles.conclusaoErroTexto}>
                    • {mensagem}
                  </Text>
                ))
            : null}
        </View>
      ) : null}
    </View>
  );
}

function QuestionarioVisita({
  respostas,
  observacoes,
}: {
  respostas: Resposta[];
  observacoes?: string | null;
}) {
  const perguntasQuery = useQuery({
    queryKey: ["questionario"],
    queryFn: ({ signal }) => buscarQuestionario(signal),
    enabled: respostas.length > 0 && respostas.some((resposta) => !resposta.pergunta?.texto),
  });

  const perguntasOrdenadas = [...(perguntasQuery.data ?? [])].sort((a, b) => {
    const ordemA = Number.isFinite(a.ordem) ? a.ordem! : Number.MAX_SAFE_INTEGER;
    const ordemB = Number.isFinite(b.ordem) ? b.ordem! : Number.MAX_SAFE_INTEGER;
    return ordemA - ordemB || a.id - b.id;
  });
  const perguntasPorId = new Map(
    perguntasOrdenadas.map((pergunta) => [String(pergunta.id), pergunta])
  );
  const ordemPorId = new Map(
    perguntasOrdenadas.map((pergunta, indice) => [String(pergunta.id), indice])
  );
  const ordemDe = (resposta: Resposta) =>
    resposta.pergunta?.ordem ??
    ordemPorId.get(String(resposta.pergunta_id)) ??
    Number.MAX_SAFE_INTEGER;
  const respostasOrdenadas = [...respostas].sort((a, b) => ordemDe(a) - ordemDe(b));

  return (
    <>
      {respostas.length === 0 ? (
        <Text style={styles.textoInfo}>Nenhuma resposta registrada para esta visita.</Text>
      ) : (
        <>
          {perguntasQuery.isPending && perguntasQuery.fetchStatus !== "idle" ? (
            <Text style={[styles.textoInfo, styles.espacoAbaixo]}>
              {perguntasQuery.fetchStatus === "paused"
                ? "Aguardando conexão para carregar as perguntas…"
                : "Carregando perguntas…"}
            </Text>
          ) : null}
          {perguntasQuery.isError ? (
            <View style={[styles.erroPerguntas, styles.espacoAbaixo]} accessibilityRole="alert">
              <Text style={styles.erroPerguntasTexto}>
                Não foi possível carregar as perguntas do questionário. As respostas continuam
                disponíveis, identificadas pelo ID da pergunta.
              </Text>
              <TentarNovamente
                onPress={() => perguntasQuery.refetch()}
                carregando={perguntasQuery.isFetching}
              />
            </View>
          ) : null}
          <View>
            {respostasOrdenadas.map((resposta) => {
              const texto =
                resposta.pergunta?.texto || perguntasPorId.get(String(resposta.pergunta_id))?.texto;
              return (
                <View key={resposta.id} style={styles.resposta}>
                  <Text style={styles.respostaPergunta}>
                    {texto || `Pergunta #${resposta.pergunta_id} — texto indisponível`}
                  </Text>
                  <Text style={styles.respostaValor}>{textoOuAusente(resposta.resposta)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
      <View style={styles.observacoes}>
        <Text style={styles.observacoesTexto}>
          <Text style={styles.negrito}>Observações do fiscal: </Text>
          {observacoes?.trim() ? (
            observacoes
          ) : (
            <Text style={styles.textoSecundario}>Nenhuma observação registrada.</Text>
          )}
        </Text>
      </View>
    </>
  );
}

function DocumentosVisita({ documentos }: { documentos: Documento[] }) {
  if (documentos.length === 0) {
    return (
      <Cartao style={styles.documento}>
        <Icon source="file-document-outline" size={24} color={cores.textoSecundario} />
        <Text style={styles.textoInfo}>Nenhum documento vinculado a esta visita.</Text>
      </Cartao>
    );
  }

  return (
    <>
      {documentos.map((documento) => {
        const urlPdf = obterUrlPdf(documento.url_arquivo_pdf);
        const envioEmail =
          documento.enviado_email === true
            ? "enviado por e-mail"
            : documento.enviado_email === false
              ? "e-mail não enviado"
              : "envio não informado";
        const conteudo = (
          <Cartao style={styles.documento}>
            <Icon source="file-document-outline" size={24} color={cores.azul} />
            <View style={styles.documentoTextos}>
              <Text style={styles.documentoTitulo}>Documento #{documento.id}</Text>
              <Text style={styles.documentoDetalhe}>
                Gerado em {formatarData(documento.data_geracao)} ·{" "}
                {urlPdf ? envioEmail : "PDF indisponível"}
              </Text>
            </View>
            {urlPdf ? <Icon source="open-in-new" size={18} color={cores.azul} /> : null}
          </Cartao>
        );
        return urlPdf ? (
          <LinkExterno key={documento.id} url={urlPdf}>
            {conteudo}
          </LinkExterno>
        ) : (
          <View key={documento.id}>{conteudo}</View>
        );
      })}
    </>
  );
}

function Pessoa({
  papel,
  usuario,
  idAusente,
  primeira,
}: {
  papel: string;
  usuario?: UsuarioResumo | null;
  idAusente?: number;
  primeira?: boolean;
}) {
  return (
    <View style={[styles.pessoa, !primeira && styles.pessoaComLinha]}>
      <Avatar iniciais={iniciais(usuario?.nome)} />
      <View style={styles.pessoaTextos}>
        <Text style={styles.pessoaPapel}>{papel}</Text>
        <Text style={styles.pessoaNome} numberOfLines={1}>
          {usuario
            ? textoOuAusente(usuario.nome)
            : idAusente
              ? `Usuário #${idAusente}`
              : "Não informado"}
        </Text>
        {usuario?.email ? (
          <Text style={styles.pessoaEmail} numberOfLines={1}>
            {usuario.email}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Localizacao({ visita, largura }: { visita: Visita; largura: DimensionValue }) {
  const latitude = Number(visita.latitude);
  const longitude = Number(visita.longitude);
  const temCoordenadas =
    visita.latitude != null &&
    visita.longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <Card titulo="Início da visita">
      <View style={styles.dados}>
        <Dado termo="Data e hora" largura={largura}>
          {formatarData(visita.data_realizacao)}
        </Dado>
        <Dado termo="Latitude" largura={largura}>
          {textoOuAusente(visita.latitude)}
        </Dado>
        <Dado termo="Longitude" largura={largura}>
          {textoOuAusente(visita.longitude)}
        </Dado>
      </View>
      {temCoordenadas ? (
        <LinkExterno
          url={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`}
        >
          <View style={styles.mapa}>
            <Icon source="map-marker-outline" size={16} color={cores.azul} />
            <Text style={styles.mapaTexto}>Ver no mapa</Text>
          </View>
        </LinkExterno>
      ) : (
        <Text style={[styles.textoPequeno, styles.espacoAcima]}>
          A localização é registrada quando o fiscal inicia a visita no app.
        </Text>
      )}
    </Card>
  );
}

function DadosVisita({ id, visita }: { id: string; visita: Visita }) {
  const { width } = useWindowDimensions();
  const duasColunas = width >= LARGURA_DUAS_COLUNAS;
  const fiscalizadores = Array.isArray(visita.fiscalizadores) ? visita.fiscalizadores : [];
  const respostas = Array.isArray(visita.respostas) ? visita.respostas : [];
  const documentos = Array.isArray(visita.documentos) ? visita.documentos : [];
  // larguras dos quadradinhos de dados (o grid-cols do Tailwind)
  const larguraEstabelecimento: DimensionValue = width >= 640 ? "50%" : "100%";
  const larguraLocalizacao: DimensionValue = width >= 768 ? "33.333%" : "50%";

  return (
    <>
      <Andamento visita={visita} quatroColunas={width >= 640} />
      <View style={[styles.colunas, duasColunas && styles.colunasLado]}>
        <View style={styles.colunaPrincipal}>
          <Card titulo="Estabelecimento">
            <View style={styles.dados}>
              <Dado termo="Denunciado" largura={larguraEstabelecimento}>
                {textoOuAusente(visita.denunciado)}
              </Dado>
              <Dado termo="Razão social" largura={larguraEstabelecimento}>
                {textoOuAusente(visita.razao_social)}
              </Dado>
              <Dado termo="Nome fantasia" largura={larguraEstabelecimento}>
                {textoOuAusente(visita.nome_fantasia)}
              </Dado>
              <Dado termo="CNPJ/CPF" largura={larguraEstabelecimento}>
                {textoOuAusente(visita.cnpj_cpf)}
              </Dado>
              <Dado termo="Atividade" largura={larguraEstabelecimento}>
                {textoOuAusente(visita.atividade)}
              </Dado>
              <Dado termo="Telefone" largura={larguraEstabelecimento}>
                {textoOuAusente(visita.telefone)}
              </Dado>
              <Dado termo="Endereço" largura={larguraEstabelecimento}>
                {textoOuAusente(
                  [visita.endereco, visita.bairro].filter((valor) => valor?.trim()).join(" · ")
                )}
              </Dado>
              <Dado termo="CEP" largura={larguraEstabelecimento}>
                {textoOuAusente(visita.cep)}
              </Dado>
            </View>
            <Text style={[styles.textoPequeno, styles.espacoAcima]}>
              Datas e horários apresentados no fuso do navegador.
            </Text>
          </Card>

          <Localizacao visita={visita} largura={larguraLocalizacao} />

          <Card titulo="Respostas do questionário">
            <QuestionarioVisita respostas={respostas} observacoes={visita.observacoes_livres} />
          </Card>
        </View>

        <View
          style={[styles.lateral, duasColunas && styles.lateralFixa]}
          aria-label="Resumo e ações"
        >
          <ConclusaoVisita key={id} id={id} status={visita.status} />
          <DocumentosVisita documentos={documentos} />
          <Cartao style={styles.equipe}>
            <TituloCartao>Equipe</TituloCartao>
            <View style={styles.equipeLista}>
              <Pessoa
                papel="Gestor responsável"
                usuario={visita.gestor}
                idAusente={visita.gestor_id}
                primeira
              />
              {fiscalizadores.length > 0 ? (
                fiscalizadores.map((fiscal) => (
                  <Pessoa key={fiscal.id} papel="Agente fiscalizador" usuario={fiscal} />
                ))
              ) : (
                <Pessoa papel="Agente fiscalizador" />
              )}
            </View>
          </Cartao>
        </View>
      </View>
    </>
  );
}

export default function GestorVisitaDetalheScreen() {
  const params = useLocalSearchParams<{ id: string; voltarPara?: string; rotuloVoltar?: string }>();
  const id = params.id;
  const voltar = obterDestinoVoltar(params.voltarPara, params.rotuloVoltar);
  const idValido = /^\d+$/.test(id ?? "") && Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const visitaQuery = useQuery({
    queryKey: ["visita", id],
    queryFn: ({ signal }) => buscarVisita(id!, signal),
    enabled: idValido,
  });
  const visita = visitaQuery.data;
  const statusErro = statusDoErro(visitaQuery.error);
  const acessoIndisponivel = statusErro === 403 || statusErro === 404;
  const erro = (statusErro && ERROS_VISITA[statusErro]) || {
    titulo: "Não foi possível carregar a visita",
    mensagem: "Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.",
  };
  const mostrarDados = idValido && visita && !acessoIndisponivel;
  const recarregar = () => visitaQuery.refetch();
  const recarregando = visitaQuery.isFetching;
  const fiscal = visita?.fiscalizadores?.[0]?.nome;

  return (
    <View>
      <Pressable
        onPress={() => router.navigate(voltar.para as Href)}
        accessibilityRole="link"
        style={styles.voltar}
      >
        <Icon source="chevron-left" size={18} color={cores.azul} />
        <Text style={styles.voltarTexto}>{voltar.rotulo}</Text>
      </Pressable>
      <View style={styles.titulo}>
        <Text style={styles.tituloTexto} accessibilityRole="header">
          {mostrarDados ? nomeEstabelecimento(visita) : "Detalhes da visita"}
        </Text>
        {mostrarDados ? <StatusBadge status={visita.status} size="md" /> : null}
      </View>
      <Text style={styles.subtitulo}>
        Visita #{id}
        {mostrarDados
          ? ` · Agendada para ${formatarData(visita.data_agendada)}${fiscal ? ` · Fiscal: ${fiscal}` : ""}`
          : ""}
      </Text>

      {!idValido ? (
        <View style={styles.espacoGrande}>
          <ErroCarga mensagem="O identificador da visita deve ser um número inteiro positivo válido." />
        </View>
      ) : visitaQuery.isPending ? (
        <Mensagem>
          {visitaQuery.fetchStatus === "paused"
            ? "Aguardando conexão para carregar a visita…"
            : "Carregando detalhes da visita…"}
        </Mensagem>
      ) : visitaQuery.isError && (!visita || acessoIndisponivel) ? (
        <View style={styles.espacoGrande}>
          <Card titulo={erro.titulo}>
            <ErroCarga mensagem={erro.mensagem} onTentar={recarregar} tentando={recarregando} />
          </Card>
        </View>
      ) : !visita ? (
        <View style={styles.espacoGrande}>
          <Card titulo="Dados indisponíveis">
            <View style={styles.indisponivel}>
              <Text style={styles.textoInfo}>Nenhum dado da visita foi retornado.</Text>
              <TentarNovamente onPress={recarregar} carregando={recarregando} />
            </View>
          </Card>
        </View>
      ) : (
        <>
          {visitaQuery.isError ? (
            <View style={styles.espacoGrande}>
              <ErroCarga
                mensagem="Não foi possível atualizar os dados da visita. As informações exibidas são da última consulta disponível."
                onTentar={recarregar}
                tentando={recarregando}
              />
            </View>
          ) : null}
          <DadosVisita id={id!} visita={visita} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  voltar: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  voltarTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.azul,
  },
  titulo: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  tituloTexto: {
    flexShrink: 1,
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 42,
    lineHeight: 48,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  subtitulo: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  espacoGrande: {
    marginTop: 24,
  },
  espacoAcima: {
    marginTop: 12,
  },
  espacoAbaixo: {
    marginBottom: 12,
  },
  card: {
    padding: 25,
  },
  cardConteudo: {
    marginTop: 16,
  },
  dados: {
    flexDirection: "row",
    flexWrap: "wrap",
    margin: -6,
  },
  dadoCaixa: {
    padding: 6,
  },
  dado: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: cores.fundo,
  },
  dadoTermo: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  dadoValor: {
    marginTop: 4,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  andamento: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 19,
  },
  andamentoEtapas: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
  },
  etapa: {
    paddingRight: 8,
  },
  etapaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  etapaBolinha: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  etapaTraco: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  etapaRotulo: {
    marginTop: 6,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  etapaRotuloAtual: {
    color: cores.aviso,
  },
  etapaRotuloPendente: {
    color: cores.textoSecundario,
  },
  etapaQuando: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  colunas: {
    marginTop: 20,
    gap: 20,
  },
  colunasLado: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  colunaPrincipal: {
    flex: 1,
    gap: 16,
  },
  lateral: {
    gap: 16,
  },
  lateralFixa: {
    width: 320,
  },
  conclusao: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: cores.azul,
    backgroundColor: cores.branco,
  },
  conclusaoTitulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  conclusaoTexto: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  concluir: {
    marginTop: 16,
    borderRadius: 12,
  },
  concluirConteudo: {
    height: 52,
  },
  concluirTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  conclusaoSucesso: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.sucesso,
    backgroundColor: cores.sucessoFundo,
  },
  conclusaoErro: {
    marginTop: 16,
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: cores.erroFundo,
  },
  conclusaoErroTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.erroTexto,
  },
  textoInfo: {
    flexShrink: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  textoPequeno: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  textoSecundario: {
    color: cores.textoSecundario,
  },
  negrito: {
    fontFamily: "Inter_700Bold",
  },
  erroPerguntas: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: cores.erroFundo,
  },
  erroPerguntasTexto: {
    flex: 1,
    minWidth: 220,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.erroTexto,
  },
  resposta: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: cores.linhaTabela,
  },
  respostaPergunta: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  respostaValor: {
    maxWidth: "50%",
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.texto,
  },
  observacoes: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: cores.fundo,
  },
  observacoesTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 19,
    color: cores.texto,
  },
  documento: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
  },
  documentoTextos: {
    flex: 1,
    minWidth: 0,
  },
  documentoTitulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  documentoDetalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  mapa: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mapaTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.azul,
  },
  equipe: {
    padding: 18,
  },
  equipeLista: {
    marginTop: 12,
  },
  pessoa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
  },
  pessoaComLinha: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: cores.linhaTabela,
  },
  pessoaTextos: {
    flex: 1,
    minWidth: 0,
  },
  pessoaPapel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  pessoaNome: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  pessoaEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  indisponivel: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
});
