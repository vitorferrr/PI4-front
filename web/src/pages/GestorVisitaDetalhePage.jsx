import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isCancel } from 'axios';
import SectionCard from '../components/SectionCard';
import StatusVisita from '../components/VisitaStatus';
import { api } from '../lib/api';
import { formatarDataVisita as formatarData } from '../lib/visitas';
import styles from './GestorVisitaDetalhePage.module.css';

const ERROS_VISITA = {
  403: {
    titulo: 'Acesso não permitido',
    mensagem: 'Você não tem permissão para visualizar esta visita.',
  },
  404: {
    titulo: 'Visita não encontrada',
    mensagem: 'Não foi encontrada uma visita com o ID informado.',
  },
};

const ERROS_CONCLUSAO = {
  400: 'A visita não pôde ser concluída. Confira a mensagem do servidor e atualize os dados antes de tentar novamente.',
  403: 'Você não tem permissão para concluir esta visita.',
  404: 'A visita não foi encontrada ou não está disponível para seu usuário.',
  500: 'O servidor não conseguiu confirmar a conclusão. Atualize os dados antes de tentar novamente.',
};

function textoOuAusente(valor) {
  return valor == null || String(valor).trim() === '' ? 'Não informado' : String(valor);
}

function obterUrlPdf(valor) {
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

async function buscarVisita(id, signal) {
  const { data } = await api.get(`/visitas/${id}`, { signal });
  return data ?? null;
}

async function concluirVisita(id) {
  const { data } = await api.patch(`/visitas/${id}/concluir`);
  if (data?.id !== Number(id) || data.status !== 'concluida') {
    throw new Error('A resposta da API não confirmou a conclusão da visita.');
  }
  return data;
}

async function buscarQuestionario(signal) {
  const { data } = await api.get('/questionario', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Não foi possível interpretar as perguntas do questionário.');
  }
  return data;
}

function Informacao({ rotulo, children }) {
  return (
    <div className={styles.informacao}>
      <dt>{rotulo}</dt>
      <dd>{children ?? 'Não informado'}</dd>
    </div>
  );
}

function PessoaResumo({ usuario }) {
  return (
    <div>
      <h3 className={styles.itemTitle}>{textoOuAusente(usuario.nome)}</h3>
      <dl className={styles.infoGrid}>
        <Informacao rotulo="ID">{usuario.id}</Informacao>
        <Informacao rotulo="Perfil">{textoOuAusente(usuario.role)}</Informacao>
        <Informacao rotulo="E-mail">{textoOuAusente(usuario.email)}</Informacao>
      </dl>
    </div>
  );
}

function TentarNovamente({ onClick, carregando }) {
  return (
    <button type="button" className={styles.button} onClick={onClick} disabled={carregando}>
      {carregando ? 'Tentando novamente…' : 'Tentar novamente'}
    </button>
  );
}

function ConclusaoVisita({ id, status }) {
  const queryClient = useQueryClient();
  // Trava síncrona: dois eventos podem chegar antes de isPending aparecer no render.
  const enviando = useRef(false);
  const concluirMutation = useMutation({
    mutationKey: ['concluirVisita', id],
    mutationFn: () => concluirVisita(id),
    retry: false,
    onMutate: () => queryClient.cancelQueries({ queryKey: ['visita', id], exact: true }),
    onSuccess: (visitaAtualizada) => {
      queryClient.setQueryData(['visita', id], visitaAtualizada);
      void queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
    onError: (erro) => {
      enviando.current = false;
      if (!isCancel(erro) && erro.response?.status !== 401) {
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

  const statusErro = concluirMutation.error?.response?.status;
  const detalhesErro = statusErro === 400 ? concluirMutation.error.response.data?.erros : null;

  return (
    <SectionCard title="Conclusão da visita">
      <div className={styles.conclusionActions}>
        {status === 'em_andamento' && (
          <button
            type="button"
            className={`${styles.button} ${styles.primaryButton}`}
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
          <p className={styles.success} role="status">Visita concluída com sucesso.</p>
        )}
        {temErro && (
          <div className={styles.error} role="alert">
            <p>{ERROS_CONCLUSAO[statusErro] ?? 'Não foi possível confirmar a conclusão. Verifique sua conexão e atualize os dados antes de tentar novamente.'}</p>
            {Array.isArray(detalhesErro) && (
              <ul className={styles.validationErrors}>
                {detalhesErro.filter((mensagem) => typeof mensagem === 'string').map((mensagem, indice) => (
                  <li key={indice}>{mensagem}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function QuestionarioVisita({ respostas }) {
  const perguntasQuery = useQuery({
    queryKey: ['questionario'],
    queryFn: ({ signal }) => buscarQuestionario(signal),
    enabled: respostas.length > 0,
  });

  if (respostas.length === 0) {
    return <p className={styles.muted}>Nenhuma resposta registrada para esta visita.</p>;
  }

  const perguntasOrdenadas = [...(perguntasQuery.data ?? [])].sort((a, b) => {
    const ordemA = Number.isFinite(a.ordem) ? a.ordem : Number.MAX_SAFE_INTEGER;
    const ordemB = Number.isFinite(b.ordem) ? b.ordem : Number.MAX_SAFE_INTEGER;
    return ordemA - ordemB || a.id - b.id;
  });
  const perguntasPorId = new Map(perguntasOrdenadas.map((pergunta) => [String(pergunta.id), pergunta]));
  const ordemPorId = new Map(perguntasOrdenadas.map((pergunta, indice) => [String(pergunta.id), indice]));
  const respostasOrdenadas = [...respostas].sort((a, b) => (
    (ordemPorId.get(String(a.pergunta_id)) ?? Number.MAX_SAFE_INTEGER)
    - (ordemPorId.get(String(b.pergunta_id)) ?? Number.MAX_SAFE_INTEGER)
  ));

  return (
    <>
      {perguntasQuery.isPending && (
        <p className={styles.feedback} role="status">
          {perguntasQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar as perguntas…' : 'Carregando perguntas…'}
        </p>
      )}
      {perguntasQuery.isError && (
        <div className={styles.error} role="alert">
          <p>
            Não foi possível carregar as perguntas do questionário.
            As respostas continuam disponíveis, identificadas pelo ID da pergunta.
          </p>
          <TentarNovamente onClick={() => perguntasQuery.refetch()} carregando={perguntasQuery.isFetching} />
        </div>
      )}
      <ol className={styles.list}>
        {respostasOrdenadas.map((resposta) => {
          const pergunta = perguntasPorId.get(String(resposta.pergunta_id));
          return (
            <li key={resposta.id} className={styles.listItem}>
              <h3 className={styles.itemTitle}>
                {pergunta?.texto || `Pergunta #${resposta.pergunta_id} — texto indisponível`}
              </h3>
              <p className={styles.preserveLines}>{textoOuAusente(resposta.resposta)}</p>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function DocumentosVisita({ documentos }) {
  if (documentos.length === 0) {
    return <p className={styles.muted}>Nenhum documento vinculado a esta visita.</p>;
  }

  return (
    <ul className={styles.list}>
      {documentos.map((documento) => {
        const urlPdf = obterUrlPdf(documento.url_arquivo_pdf);
        const envioEmail = documento.enviado_email === true
          ? 'Enviado'
          : documento.enviado_email === false ? 'Não enviado' : 'Não informado';
        return (
          <li key={documento.id} className={styles.listItem}>
            <div className={styles.itemHeader}>
              <h3 className={styles.itemTitle}>Documento #{documento.id}</h3>
              {urlPdf && (
                <a href={urlPdf} target="_blank" rel="noopener noreferrer" className={styles.textLink}
                  aria-label={`Abrir PDF do documento ${documento.id} em nova aba`}>
                  Abrir PDF ↗
                </a>
              )}
            </div>
            <dl className={styles.infoGrid}>
              <Informacao rotulo="Data de geração">{formatarData(documento.data_geracao)}</Informacao>
              <Informacao rotulo="Envio por e-mail">{envioEmail}</Informacao>
            </dl>
            {!urlPdf && <p className={styles.muted}>PDF indisponível.</p>}
          </li>
        );
      })}
    </ul>
  );
}

function DadosVisita({ visita }) {
  const fiscalizadores = Array.isArray(visita.fiscalizadores) ? visita.fiscalizadores : [];
  const respostas = Array.isArray(visita.respostas) ? visita.respostas : [];
  const documentos = Array.isArray(visita.documentos) ? visita.documentos : [];

  return (
    <div className={styles.sections}>
      <SectionCard title="Informações gerais" className={styles.fullWidth}>
        <dl className={styles.infoGrid}>
          <Informacao rotulo="Denunciado">{textoOuAusente(visita.denunciado)}</Informacao>
          <Informacao rotulo="Data agendada">{formatarData(visita.data_agendada)}</Informacao>
          <Informacao rotulo="Início da visita">{formatarData(visita.data_realizacao)}</Informacao>
          <Informacao rotulo="Latitude">{textoOuAusente(visita.latitude)}</Informacao>
          <Informacao rotulo="Longitude">{textoOuAusente(visita.longitude)}</Informacao>
          <Informacao rotulo="Criada em">{formatarData(visita.createdAt)}</Informacao>
          <Informacao rotulo="Atualizada em">{formatarData(visita.updatedAt)}</Informacao>
        </dl>
        <p className={styles.dateNote}>Datas e horários apresentados no fuso do navegador.</p>
      </SectionCard>

      <SectionCard title="Gestor responsável">
        {visita.gestor ? <PessoaResumo usuario={visita.gestor} /> : (
          <>
            <p className={styles.muted}>Os dados do gestor não estão disponíveis.</p>
            <dl className={styles.infoGrid}>
              <Informacao rotulo="ID do gestor">{visita.gestor_id}</Informacao>
            </dl>
          </>
        )}
      </SectionCard>

      <SectionCard title="Fiscalizadores vinculados">
        {fiscalizadores.length > 0 ? (
          <ul className={styles.list}>
            {fiscalizadores.map((usuario) => (
              <li key={usuario.id} className={styles.listItem}><PessoaResumo usuario={usuario} /></li>
            ))}
          </ul>
        ) : <p className={styles.muted}>Nenhum fiscalizador vinculado a esta visita.</p>}
      </SectionCard>

      <SectionCard title="Observações" className={styles.fullWidth}>
        {visita.observacoes_livres?.trim() ? (
          <p className={styles.preserveLines}>{visita.observacoes_livres}</p>
        ) : <p className={styles.muted}>Nenhuma observação registrada.</p>}
      </SectionCard>

      <SectionCard title="Questionário e respostas" className={styles.fullWidth}>
        <QuestionarioVisita respostas={respostas} />
      </SectionCard>

      <SectionCard title="Documentos vinculados" className={styles.fullWidth}>
        <DocumentosVisita documentos={documentos} />
      </SectionCard>
    </div>
  );
}

export default function GestorVisitaDetalhePage() {
  const { id } = useParams();
  const idValido = /^\d+$/.test(id ?? '') && Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const visitaQuery = useQuery({
    queryKey: ['visita', id],
    queryFn: ({ signal }) => buscarVisita(id, signal),
    enabled: idValido,
  });
  const visita = visitaQuery.data;
  const acessoIndisponivel = [403, 404].includes(visitaQuery.error?.response?.status);
  const erro = ERROS_VISITA[visitaQuery.error?.response?.status] ?? {
    titulo: 'Não foi possível carregar a visita',
    mensagem: 'Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.',
  };

  return (
    <article className={styles.page} aria-labelledby="visita-detalhe-titulo">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 id="visita-detalhe-titulo" className={styles.title}>Detalhes da visita</h1>
          <p className={styles.identifier}>Visita #{id}</p>
        </div>
        <div className={styles.headerActions}>
          {idValido && visita && !acessoIndisponivel && <StatusVisita status={visita.status} />}
          <Link to="/" className={styles.button}>Voltar ao início</Link>
        </div>
      </header>

      {!idValido ? (
        <SectionCard title="ID inválido">
          <p role="alert">O identificador da visita deve ser um número inteiro positivo válido.</p>
        </SectionCard>
      ) : visitaQuery.isPending ? (
        <SectionCard title="Informações da visita">
          <p className={styles.muted} role="status">
            {visitaQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar a visita…' : 'Carregando detalhes da visita…'}
          </p>
        </SectionCard>
      ) : visitaQuery.isError && (!visita || acessoIndisponivel) ? (
        <SectionCard title={erro.titulo}>
          <div className={styles.error} role="alert">
            <p>{erro.mensagem}</p>
            <div className={styles.actions}>
              <TentarNovamente onClick={() => visitaQuery.refetch()} carregando={visitaQuery.isFetching} />
            </div>
          </div>
        </SectionCard>
      ) : !visita ? (
        <SectionCard title="Dados indisponíveis">
          <div className={styles.feedback}>
            <p>Nenhum dado da visita foi retornado.</p>
            <TentarNovamente onClick={() => visitaQuery.refetch()} carregando={visitaQuery.isFetching} />
          </div>
        </SectionCard>
      ) : (
        <>
          {visitaQuery.isError && (
            <div className={styles.error} role="alert">
              <p>Não foi possível atualizar os dados da visita. As informações exibidas são da última consulta disponível.</p>
              <TentarNovamente onClick={() => visitaQuery.refetch()} carregando={visitaQuery.isFetching} />
            </div>
          )}
          <DadosVisita visita={visita} />
          <ConclusaoVisita key={id} id={id} status={visita.status} />
        </>
      )}
    </article>
  );
}
