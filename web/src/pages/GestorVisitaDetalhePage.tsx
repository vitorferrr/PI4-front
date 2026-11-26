import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ExternalLink, FileText, MapPin } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isCancel } from 'axios';
import { Avatar, ErroCarga, Mensagem, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { statusDoErro } from '../lib/erros';
import { formatarDataVisita as formatarData, iniciais, nomeEstabelecimento } from '../lib/visitas';
import type { Documento, Pergunta, Resposta, UsuarioResumo, Visita } from '../types';

const ERROS_VISITA: Record<number, { titulo: string; mensagem: string }> = {
  403: {
    titulo: 'Acesso não permitido',
    mensagem: 'Você não tem permissão para visualizar esta visita.',
  },
  404: {
    titulo: 'Visita não encontrada',
    mensagem: 'Não foi encontrada uma visita com o ID informado.',
  },
};

const ERROS_CONCLUSAO: Record<number, string> = {
  400: 'A visita não pôde ser concluída. Confira a mensagem do servidor e atualize os dados antes de tentar novamente.',
  403: 'Você não tem permissão para concluir esta visita.',
  404: 'A visita não foi encontrada ou não está disponível para seu usuário.',
  500: 'O servidor não conseguiu confirmar a conclusão. Atualize os dados antes de tentar novamente.',
};

// Quem abre a visita pode informar para onde voltar (ex.: a lista do admin com os filtros).
// Só aceita caminhos internos; sem informação, volta para o início como antes.
function obterDestinoVoltar(state: unknown) {
  const destino = (state as { voltarPara?: unknown } | null)?.voltarPara;
  if (typeof destino !== 'string' || !destino.startsWith('/') || destino.startsWith('//')) {
    return { para: '/', rotulo: 'Voltar ao início' };
  }
  const rotulo = (state as { rotuloVoltar?: unknown }).rotuloVoltar;
  return { para: destino, rotulo: typeof rotulo === 'string' ? rotulo : 'Voltar' };
}

function textoOuAusente(valor: unknown) {
  return valor == null || String(valor).trim() === '' ? 'Não informado' : String(valor);
}

function obterUrlPdf(valor: unknown) {
  if (typeof valor !== 'string' || !valor.trim()) return null;
  try {
    const url = new URL(valor.trim(), api.defaults.baseURL);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
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
  if (data?.id !== Number(id) || data.status !== 'concluida') {
    throw new Error('A resposta da API não confirmou a conclusão da visita.');
  }
  return data;
}

async function buscarQuestionario(signal?: AbortSignal) {
  const { data } = await api.get<Pergunta[]>('/questionario', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Não foi possível interpretar as perguntas do questionário.');
  }
  return data;
}

function Card({ titulo, children, className = '' }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-[25px] ${className}`}>
      <h2 className="titulo-card">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Dado({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-app px-3.5 py-3">
      <dt className="text-[13px] text-muted">{termo}</dt>
      <dd className="mt-1 break-words text-[15px] font-bold text-ink">{children}</dd>
    </div>
  );
}

function TentarNovamente({ onClick, carregando }: { onClick: () => void; carregando: boolean }) {
  return (
    <button type="button" className="btn-outline h-10" onClick={onClick} disabled={carregando}>
      {carregando ? 'Tentando novamente…' : 'Tentar novamente'}
    </button>
  );
}

type Etapa = { label: string; quando: string; estado: 'feito' | 'atual' | 'pendente' | 'cancelado' };

function montarEtapas(visita: Visita): Etapa[] {
  const documento = visita.documentos?.[0];
  const ordem = ['agendada', 'em_andamento', 'documento', 'concluida'];
  const atual = visita.status === 'concluida'
    ? 'concluida'
    : visita.status === 'em_andamento' && documento ? 'documento' : visita.status;
  const indiceAtual = ordem.indexOf(atual);
  const estado = (indice: number): Etapa['estado'] => {
    if (visita.status === 'cancelada') return indice === 0 ? 'feito' : 'cancelado';
    if (visita.status === 'concluida' || indice < indiceAtual) return 'feito';
    return indice === indiceAtual ? 'atual' : 'pendente';
  };

  return [
    { label: 'Agendada', quando: formatarData(visita.data_agendada), estado: estado(0) },
    { label: 'Em andamento', quando: visita.data_realizacao ? formatarData(visita.data_realizacao) : '—', estado: estado(1) },
    { label: 'Documento gerado', quando: documento?.data_geracao ? formatarData(documento.data_geracao) : '—', estado: estado(2) },
    { label: visita.status === 'cancelada' ? 'Cancelada' : 'Concluída', quando: visita.status === 'concluida' ? formatarData(visita.updatedAt) : '—', estado: visita.status === 'cancelada' ? 'atual' : estado(3) },
  ];
}

const COR_ETAPA: Record<Etapa['estado'], string> = {
  feito: 'bg-[#2f9e5b]',
  atual: 'bg-[#f5c518]',
  pendente: 'bg-[#dfe6ef]',
  cancelado: 'bg-[#dfe6ef]',
};

function Andamento({ visita }: { visita: Visita }) {
  const etapas = montarEtapas(visita);
  return (
    <ol className="card mt-6 grid grid-cols-2 gap-x-2 gap-y-4 px-5 py-[19px] sm:grid-cols-4" aria-label="Andamento">
      {etapas.map((etapa, indice) => (
        <li key={etapa.label}>
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className={`h-[22px] w-[22px] shrink-0 rounded-full ${COR_ETAPA[etapa.estado]}`} />
            {indice < etapas.length - 1 ? (
              <span className={`h-[3px] flex-1 rounded ${etapa.estado === 'feito' ? 'bg-[#2f9e5b]' : 'bg-[#dfe6ef]'}`} />
            ) : null}
          </div>
          <div className={`mt-1.5 text-sm font-semibold ${etapa.estado === 'atual' ? 'text-warn' : etapa.estado === 'feito' ? 'text-ink' : 'text-muted'}`}>
            {etapa.label}
          </div>
          <div className="text-[13px] text-muted">{etapa.quando}</div>
        </li>
      ))}
    </ol>
  );
}

function ConclusaoVisita({ id, status }: { id: string; status: string }) {
  const queryClient = useQueryClient();
  // Trava síncrona: dois eventos podem chegar antes de isPending aparecer no render.
  const enviando = useRef(false);
  const concluirMutation = useMutation({
    mutationKey: ['concluirVisita', id],
    mutationFn: () => concluirVisita(id),
    retry: false,
    onMutate: () => queryClient.cancelQueries({ queryKey: ['visita', id], exact: true }),
    onSuccess: (visitaAtualizada: Visita) => {
      queryClient.setQueryData(['visita', id], visitaAtualizada);
      void queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
    onError: (erro: unknown) => {
      enviando.current = false;
      if (!isCancel(erro) && statusDoErro(erro) !== 401) {
        void queryClient.invalidateQueries({ queryKey: ['visita', id], exact: true });
      }
    },
  });

  const handleConcluir = () => {
    if (status !== 'em_andamento' || enviando.current || concluirMutation.isPending) return;
    if (!window.confirm(`Deseja concluir a visita #${id}?`)) return;
    enviando.current = true;
    concluirMutation.mutate();
  };

  const temErro = concluirMutation.isError && !isCancel(concluirMutation.error);
  if (status !== 'em_andamento' && !concluirMutation.isSuccess && !temErro) return null;

  const statusErro = statusDoErro(concluirMutation.error);
  const detalhesErro = statusErro === 400
    ? (concluirMutation.error as { response?: { data?: { erros?: unknown } } }).response?.data?.erros
    : null;

  return (
    <section className="rounded-2xl border-2 border-primary bg-white p-[18px]" aria-label="Conclusão da visita">
      <h2 className="h-display text-[23px]">Conclusão da visita</h2>
      <p className="mt-2 text-sm text-muted">A visita só é concluída depois que o documento final é gerado com todas as assinaturas.</p>
      {status === 'em_andamento' && (
        <button
          type="button"
          className="mt-4 h-[52px] w-full rounded-xl bg-success text-base font-bold text-white hover:bg-success-2 disabled:opacity-60"
          onClick={handleConcluir}
          disabled={concluirMutation.isPending}
          aria-busy={concluirMutation.isPending}
        >
          {concluirMutation.isPending
            ? concluirMutation.isPaused ? 'Aguardando conexão…' : 'Concluindo visita…'
            : 'Concluir visita'}
        </button>
      )}
      {concluirMutation.isSuccess && (
        <p className="mt-4 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success" role="status">Visita concluída com sucesso.</p>
      )}
      {temErro && (
        <div className="mt-4 rounded-xl bg-danger-bg p-3 text-sm text-danger-text" role="alert">
          <p>{(statusErro && ERROS_CONCLUSAO[statusErro]) ?? 'Não foi possível confirmar a conclusão. Verifique sua conexão e atualize os dados antes de tentar novamente.'}</p>
          {Array.isArray(detalhesErro) && (
            <ul className="mt-1.5 list-disc pl-5">
              {detalhesErro.filter((mensagem): mensagem is string => typeof mensagem === 'string').map((mensagem, indice) => (
                <li key={indice}>{mensagem}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function QuestionarioVisita({ respostas, observacoes }: { respostas: Resposta[]; observacoes?: string | null }) {
  const perguntasQuery = useQuery({
    queryKey: ['questionario'],
    queryFn: ({ signal }) => buscarQuestionario(signal),
    enabled: respostas.length > 0 && respostas.some((resposta) => !resposta.pergunta?.texto),
  });

  const perguntasOrdenadas = [...(perguntasQuery.data ?? [])].sort((a, b) => {
    const ordemA = Number.isFinite(a.ordem) ? a.ordem! : Number.MAX_SAFE_INTEGER;
    const ordemB = Number.isFinite(b.ordem) ? b.ordem! : Number.MAX_SAFE_INTEGER;
    return ordemA - ordemB || a.id - b.id;
  });
  const perguntasPorId = new Map(perguntasOrdenadas.map((pergunta) => [String(pergunta.id), pergunta]));
  const ordemPorId = new Map(perguntasOrdenadas.map((pergunta, indice) => [String(pergunta.id), indice]));
  const ordemDe = (resposta: Resposta) => resposta.pergunta?.ordem ?? ordemPorId.get(String(resposta.pergunta_id)) ?? Number.MAX_SAFE_INTEGER;
  const respostasOrdenadas = [...respostas].sort((a, b) => ordemDe(a) - ordemDe(b));

  return (
    <>
      {respostas.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma resposta registrada para esta visita.</p>
      ) : (
        <>
          {perguntasQuery.isPending && perguntasQuery.fetchStatus !== 'idle' && (
            <p className="mb-3 text-sm text-muted" role="status">
              {perguntasQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar as perguntas…' : 'Carregando perguntas…'}
            </p>
          )}
          {perguntasQuery.isError && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger-text" role="alert">
              <p>
                Não foi possível carregar as perguntas do questionário.
                As respostas continuam disponíveis, identificadas pelo ID da pergunta.
              </p>
              <TentarNovamente onClick={() => perguntasQuery.refetch()} carregando={perguntasQuery.isFetching} />
            </div>
          )}
          <ol>
            {respostasOrdenadas.map((resposta) => {
              const texto = resposta.pergunta?.texto || perguntasPorId.get(String(resposta.pergunta_id))?.texto;
              return (
                <li key={resposta.id} className="flex items-start justify-between gap-4 border-t border-row-line py-3 text-sm">
                  <h3 className="font-normal text-muted-2">{texto || `Pergunta #${resposta.pergunta_id} — texto indisponível`}</h3>
                  <span className="whitespace-pre-line text-right font-bold text-ink">{textoOuAusente(resposta.resposta)}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <div className="mt-3 rounded-xl bg-app px-4 py-3.5 text-sm leading-[19px] text-ink">
        <b>Observações do fiscal:</b>{' '}
        {observacoes?.trim() ? <span className="whitespace-pre-line">{observacoes}</span> : <span className="text-muted">Nenhuma observação registrada.</span>}
      </div>
    </>
  );
}

function DocumentosVisita({ documentos }: { documentos: Documento[] }) {
  if (documentos.length === 0) {
    return (
      <div className="card flex items-center gap-3 p-[18px]">
        <FileText size={24} className="shrink-0 text-muted" aria-hidden="true" />
        <span className="text-sm text-muted">Nenhum documento vinculado a esta visita.</span>
      </div>
    );
  }

  return (
    <>
      {documentos.map((documento) => {
        const urlPdf = obterUrlPdf(documento.url_arquivo_pdf);
        const envioEmail = documento.enviado_email === true
          ? 'enviado por e-mail'
          : documento.enviado_email === false ? 'e-mail não enviado' : 'envio não informado';
        const conteudo = (
          <>
            <FileText size={24} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Documento #{documento.id}</span>
              <span className="block text-[13px] text-muted">
                Gerado em {formatarData(documento.data_geracao)} · {urlPdf ? envioEmail : 'PDF indisponível'}
              </span>
            </span>
            {urlPdf ? <ExternalLink size={18} className="shrink-0 text-primary" aria-hidden="true" /> : null}
          </>
        );
        return urlPdf ? (
          <a
            key={documento.id}
            href={urlPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="card flex items-center gap-3 p-[18px] hover:border-border-2"
            aria-label={`Abrir PDF do documento ${documento.id} em nova aba`}
          >
            {conteudo}
          </a>
        ) : (
          <div key={documento.id} className="card flex items-center gap-3 p-[18px]">{conteudo}</div>
        );
      })}
    </>
  );
}

function Pessoa({ papel, usuario, idAusente }: { papel: string; usuario?: UsuarioResumo | null; idAusente?: number }) {
  return (
    <div className="flex items-center gap-3 border-t border-row-line py-3 first:border-t-0 first:pt-0">
      <Avatar iniciais={iniciais(usuario?.nome)} />
      <div className="min-w-0">
        <div className="text-[13px] text-muted">{papel}</div>
        <div className="truncate text-sm font-semibold text-ink">
          {usuario ? textoOuAusente(usuario.nome) : idAusente ? `Usuário #${idAusente}` : 'Não informado'}
        </div>
        {usuario?.email ? <div className="truncate text-[13px] text-muted">{usuario.email}</div> : null}
      </div>
    </div>
  );
}

function Localizacao({ visita }: { visita: Visita }) {
  const latitude = Number(visita.latitude);
  const longitude = Number(visita.longitude);
  const temCoordenadas = visita.latitude != null && visita.longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <Card titulo="Início da visita">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Dado termo="Data e hora">{formatarData(visita.data_realizacao)}</Dado>
        <Dado termo="Latitude">{textoOuAusente(visita.latitude)}</Dado>
        <Dado termo="Longitude">{textoOuAusente(visita.longitude)}</Dado>
      </dl>
      {temCoordenadas ? (
        <a
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin size={16} aria-hidden="true" /> Ver no mapa
        </a>
      ) : (
        <p className="mt-3 text-[13px] text-muted">A localização é registrada quando o fiscal inicia a visita no app.</p>
      )}
    </Card>
  );
}

function DadosVisita({ id, visita }: { id: string; visita: Visita }) {
  const fiscalizadores = Array.isArray(visita.fiscalizadores) ? visita.fiscalizadores : [];
  const respostas = Array.isArray(visita.respostas) ? visita.respostas : [];
  const documentos = Array.isArray(visita.documentos) ? visita.documentos : [];

  return (
    <>
      <Andamento visita={visita} />
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card titulo="Estabelecimento">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Dado termo="Denunciado">{textoOuAusente(visita.denunciado)}</Dado>
              <Dado termo="Razão social">{textoOuAusente(visita.razao_social)}</Dado>
              <Dado termo="Nome fantasia">{textoOuAusente(visita.nome_fantasia)}</Dado>
              <Dado termo="CNPJ/CPF">{textoOuAusente(visita.cnpj_cpf)}</Dado>
              <Dado termo="Atividade">{textoOuAusente(visita.atividade)}</Dado>
              <Dado termo="Telefone">{textoOuAusente(visita.telefone)}</Dado>
              <Dado termo="Endereço">{textoOuAusente([visita.endereco, visita.bairro].filter((valor) => valor?.trim()).join(' · '))}</Dado>
              <Dado termo="CEP">{textoOuAusente(visita.cep)}</Dado>
            </dl>
            <p className="mt-3 text-[13px] text-muted">Datas e horários apresentados no fuso do navegador.</p>
          </Card>

          <Localizacao visita={visita} />

          <Card titulo="Respostas do questionário">
            <QuestionarioVisita respostas={respostas} observacoes={visita.observacoes_livres} />
          </Card>
        </div>

        <aside className="space-y-4" aria-label="Resumo e ações">
          <ConclusaoVisita key={id} id={id} status={visita.status} />
          <DocumentosVisita documentos={documentos} />
          <section className="card p-[18px]">
            <h2 className="titulo-card">Equipe</h2>
            <div className="mt-3">
              <Pessoa papel="Gestor responsável" usuario={visita.gestor} idAusente={visita.gestor_id} />
              {fiscalizadores.length > 0
                ? fiscalizadores.map((fiscal) => <Pessoa key={fiscal.id} papel="Agente fiscalizador" usuario={fiscal} />)
                : <Pessoa papel="Agente fiscalizador" />}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

export default function GestorVisitaDetalhePage() {
  const { id } = useParams();
  const voltar = obterDestinoVoltar(useLocation().state);
  const idValido = /^\d+$/.test(id ?? '') && Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const visitaQuery = useQuery({
    queryKey: ['visita', id],
    queryFn: ({ signal }) => buscarVisita(id!, signal),
    enabled: idValido,
  });
  const visita = visitaQuery.data;
  const statusErro = statusDoErro(visitaQuery.error);
  const acessoIndisponivel = statusErro === 403 || statusErro === 404;
  const erro = (statusErro && ERROS_VISITA[statusErro]) || {
    titulo: 'Não foi possível carregar a visita',
    mensagem: 'Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.',
  };
  const mostrarDados = idValido && visita && !acessoIndisponivel;
  const recarregar = () => visitaQuery.refetch();
  const recarregando = visitaQuery.isFetching;
  const fiscal = visita?.fiscalizadores?.[0]?.nome;

  return (
    <article className="max-w-[1112px]" aria-labelledby="visita-detalhe-titulo">
      <Link to={voltar.para} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        <ChevronLeft size={16} aria-hidden="true" /> {voltar.rotulo}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 id="visita-detalhe-titulo" className="h-display break-words text-[42px] leading-[1.15]">
          {mostrarDados ? nomeEstabelecimento(visita) : 'Detalhes da visita'}
        </h1>
        {mostrarDados ? <StatusBadge status={visita.status} size="md" /> : null}
      </div>
      <p className="mt-1 text-sm text-muted-2">
        Visita #{id}
        {mostrarDados ? ` · Agendada para ${formatarData(visita.data_agendada)}${fiscal ? ` · Fiscal: ${fiscal}` : ''}` : ''}
      </p>

      {!idValido ? (
        <div className="mt-6">
          <ErroCarga mensagem="O identificador da visita deve ser um número inteiro positivo válido." />
        </div>
      ) : visitaQuery.isPending ? (
        <Mensagem carregando>
          {visitaQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar a visita…' : 'Carregando detalhes da visita…'}
        </Mensagem>
      ) : visitaQuery.isError && (!visita || acessoIndisponivel) ? (
        <section className="card mt-6 p-[25px]" aria-label={erro.titulo}>
          <h2 className="titulo-card">{erro.titulo}</h2>
          <div className="mt-4">
            <ErroCarga mensagem={erro.mensagem} onTentar={recarregar} tentando={recarregando} />
          </div>
        </section>
      ) : !visita ? (
        <section className="card mt-6 p-[25px]">
          <h2 className="titulo-card">Dados indisponíveis</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">Nenhum dado da visita foi retornado.</p>
            <TentarNovamente onClick={recarregar} carregando={recarregando} />
          </div>
        </section>
      ) : (
        <>
          {visitaQuery.isError && (
            <div className="mt-6">
              <ErroCarga
                mensagem="Não foi possível atualizar os dados da visita. As informações exibidas são da última consulta disponível."
                onTentar={recarregar}
                tentando={recarregando}
              />
            </div>
          )}
          <DadosVisita id={id!} visita={visita} />
        </>
      )}
    </article>
  );
}
